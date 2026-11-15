import type { IncomingMessage, ServerResponse } from 'http';

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

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  if (req.method !== 'GET') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  const provider = detectConfiguredProvider();
  sendJson(res, 200, {
    whatsappApiConfigured: Boolean(provider),
    provider: provider || 'DIRECT_LINK',
    defaultOwnerPhone: normalizePhone(process.env.OWNER_WHATSAPP),
  });
}
