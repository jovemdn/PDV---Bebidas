import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function normalizePhone(rawPhone?: string): string {
  const digits = (rawPhone || process.env.OWNER_WHATSAPP || '5521960185101').replace(/\D/g, '');
  if (!digits) return '5521960185101';
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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Status da integração de API WhatsApp no servidor
  app.get('/api/reports/status', (_req: Request, res: Response) => {
    const provider = detectConfiguredProvider();
    res.json({
      whatsappApiConfigured: Boolean(provider),
      provider: provider || 'DIRECT_LINK',
      defaultOwnerPhone: normalizePhone(process.env.OWNER_WHATSAPP),
    });
  });

  // Endpoint real de envio automático do fechamento (Texto + PDF) via API WhatsApp
  app.post('/api/reports/whatsapp', async (req: Request, res: Response) => {
    try {
      const { toPhone, message, pdfBase64, fileName } = req.body as {
        toPhone?: string;
        message?: string;
        pdfBase64?: string;
        fileName?: string;
      };

      if (!message || !message.trim()) {
        res.status(400).json({ ok: false, error: 'Mensagem do relatório é obrigatória.' });
        return;
      }

      const targetPhone = normalizePhone(toPhone);
      const provider = detectConfiguredProvider();

      if (!provider) {
        const fallbackUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(
          message
        )}`;
        res.json({
          ok: true,
          sentViaApi: false,
          needsConfig: true,
          provider: 'DIRECT_LINK',
          targetPhone,
          fallbackUrl,
          info: 'Nenhuma credencial de API WhatsApp configurada no servidor. Use o botão de envio direto pelo WhatsApp Web/App.',
        });
        return;
      }

      // 1. Meta WhatsApp Cloud API (Oficial)
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
          res.status(502).json({
            ok: false,
            sentViaApi: false,
            error: `Erro Meta Cloud API: ${errText}`,
          });
          return;
        }

        // Envia também o arquivo PDF se fornecido
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

        res.json({ ok: true, sentViaApi: true, provider, targetPhone });
        return;
      }

      // 2. Evolution API
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
          res.status(502).json({
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

        res.json({ ok: true, sentViaApi: true, provider, targetPhone });
        return;
      }

      // 3. Z-API
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
          res.status(502).json({
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

        res.json({ ok: true, sentViaApi: true, provider, targetPhone });
        return;
      }

      // 4. CallMeBot
      if (provider === 'CALLMEBOT') {
        const apiKey = process.env.CALLMEBOT_API_KEY!;
        const url = `https://api.callmebot.com/whatsapp.php?phone=${targetPhone}&text=${encodeURIComponent(
          message
        )}&apikey=${encodeURIComponent(apiKey)}`;
        const resp = await fetch(url);
        if (!resp.ok) {
          const errText = await resp.text();
          res.status(502).json({
            ok: false,
            sentViaApi: false,
            error: `Erro CallMeBot: ${errText}`,
          });
          return;
        }
        res.json({ ok: true, sentViaApi: true, provider, targetPhone });
        return;
      }
    } catch (err) {
      res.status(500).json({
        ok: false,
        sentViaApi: false,
        error: err instanceof Error ? err.message : 'Erro interno ao enviar WhatsApp.',
      });
    }
  });

  // Vite middlewares em desenvolvimento / arquivos estáticos em produção
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
