import type { IncomingMessage, ServerResponse } from 'http';

interface VercelRequest extends IncomingMessage {
  body?: unknown;
}

interface VercelResponse extends ServerResponse {
  status?: (code: number) => VercelResponse;
  json?: (data: unknown) => void;
}

function normalizePhone(rawPhone?: string): string {
  const digits = (rawPhone || process.env.OWNER_WHATSAPP || '5521979474405').replace(/\D/g, '');
  if (!digits) return '5521979474405';
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

function detectConfiguredProvider(): string | null {
  if (process.env.WHATSAPP_CLOUD_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    return 'META_CLOUD_API';
  }
  if (
    process.env.EVOLUTION_API_URL &&
    process.env.EVOLUTION_API_KEY &&
    process.env.EVOLUTION_INSTANCE
  ) {
    return 'EVOLUTION_API';
  }
  if (process.env.ZAPI_INSTANCE_ID && process.env.ZAPI_TOKEN) {
    return 'ZAPI';
  }
  if (process.env.CALLMEBOT_API_KEY) {
    return 'CALLMEBOT';
  }
  return null;
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function readRequestBody(req: VercelRequest): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string') {
    return JSON.parse(req.body) as Record<string, unknown>;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
}

export default async function handler(req: VercelRequest, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const body = await readRequestBody(req);
    const toPhone = typeof body.toPhone === 'string' ? body.toPhone : undefined;
    const message = typeof body.message === 'string' ? body.message : '';
    const pdfBase64 = typeof body.pdfBase64 === 'string' ? body.pdfBase64 : undefined;
    const fileName = typeof body.fileName === 'string' ? body.fileName : undefined;

    if (!message.trim()) {
      sendJson(res, 400, { ok: false, error: 'Mensagem do relatório é obrigatória.' });
      return;
    }

    const targetPhone = normalizePhone(toPhone);
    const provider = detectConfiguredProvider();

    if (!provider) {
      const fallbackUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(
        message
      )}`;
      sendJson(res, 200, {
        ok: true,
        sentViaApi: false,
        needsConfig: true,
        provider: 'DIRECT_LINK',
        targetPhone,
        fallbackUrl,
        info: 'Nenhuma credencial de API WhatsApp configurada no servidor. Use os botões diretos ou o envio via Gmail.',
      });
      return;
    }

    if (provider === 'META_CLOUD_API') {
      const token = process.env.WHATSAPP_CLOUD_TOKEN!;
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;

      const textResp = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: targetPhone,
            type: 'text',
            text: { body: message },
          }),
        }
      );

      if (!textResp.ok) {
        const errText = await textResp.text();
        sendJson(res, 502, {
          ok: false,
          sentViaApi: false,
          error: `Erro Meta Cloud API: ${errText}`,
        });
        return;
      }

      if (pdfBase64) {
        const pdfBuffer = Buffer.from(pdfBase64, 'base64');
        const formData = new FormData();
        formData.append('messaging_product', 'whatsapp');
        formData.append(
          'file',
          new Blob([pdfBuffer], { type: 'application/pdf' }),
          fileName || 'Fechamento_Caixa.pdf'
        );

        const uploadResp = await fetch(
          `https://graph.facebook.com/v21.0/${phoneNumberId}/media`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          }
        );

        if (uploadResp.ok) {
          const mediaJson = (await uploadResp.json()) as { id?: string };
          if (mediaJson.id) {
            await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: targetPhone,
                type: 'document',
                document: {
                  id: mediaJson.id,
                  filename: fileName || 'Fechamento_Caixa.pdf',
                  caption: 'Relatório Completo de Fechamento de Caixa (PDF)',
                },
              }),
            });
          }
        }
      }

      sendJson(res, 200, { ok: true, sentViaApi: true, provider, targetPhone });
      return;
    }

    if (provider === 'EVOLUTION_API') {
      const baseUrl = process.env.EVOLUTION_API_URL!.replace(/\/$/, '');
      const apiKey = process.env.EVOLUTION_API_KEY!;
      const instance = process.env.EVOLUTION_INSTANCE!;

      const textResp = await fetch(`${baseUrl}/message/sendText/${instance}`, {
        method: 'POST',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: targetPhone,
          text: message,
        }),
      });

      if (!textResp.ok) {
        const errText = await textResp.text();
        sendJson(res, 502, {
          ok: false,
          sentViaApi: false,
          error: `Erro Evolution API: ${errText}`,
        });
        return;
      }

      if (pdfBase64) {
        await fetch(`${baseUrl}/message/sendMedia/${instance}`, {
          method: 'POST',
          headers: {
            apikey: apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            number: targetPhone,
            mediatype: 'document',
            mimetype: 'application/pdf',
            caption: 'Relatório Completo de Fechamento de Caixa (PDF)',
            media: pdfBase64,
            fileName: fileName || 'Fechamento_Caixa.pdf',
          }),
        });
      }

      sendJson(res, 200, { ok: true, sentViaApi: true, provider, targetPhone });
      return;
    }

    if (provider === 'ZAPI') {
      const instanceId = process.env.ZAPI_INSTANCE_ID!;
      const token = process.env.ZAPI_TOKEN!;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (process.env.ZAPI_CLIENT_TOKEN) {
        headers['Client-Token'] = process.env.ZAPI_CLIENT_TOKEN;
      }

      const textResp = await fetch(
        `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            phone: targetPhone,
            message,
          }),
        }
      );

      if (!textResp.ok) {
        const errText = await textResp.text();
        sendJson(res, 502, {
          ok: false,
          sentViaApi: false,
          error: `Erro Z-API: ${errText}`,
        });
        return;
      }

      if (pdfBase64) {
        await fetch(
          `https://api.z-api.io/instances/${instanceId}/token/${token}/send-document/pdf`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              phone: targetPhone,
              document: `data:application/pdf;base64,${pdfBase64}`,
              fileName: fileName || 'Fechamento_Caixa.pdf',
            }),
          }
        );
      }

      sendJson(res, 200, { ok: true, sentViaApi: true, provider, targetPhone });
      return;
    }

    if (provider === 'CALLMEBOT') {
      const apiKey = process.env.CALLMEBOT_API_KEY!;
      const url = `https://api.callmebot.com/whatsapp.php?phone=${targetPhone}&text=${encodeURIComponent(
        message
      )}&apikey=${encodeURIComponent(apiKey)}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        const errText = await resp.text();
        sendJson(res, 502, {
          ok: false,
          sentViaApi: false,
          error: `Erro CallMeBot: ${errText}`,
        });
        return;
      }
      sendJson(res, 200, { ok: true, sentViaApi: true, provider, targetPhone });
      return;
    }
  } catch (err) {
    sendJson(res, 500, {
      ok: false,
      sentViaApi: false,
      error: err instanceof Error ? err.message : 'Erro interno ao enviar WhatsApp.',
    });
  }
}
