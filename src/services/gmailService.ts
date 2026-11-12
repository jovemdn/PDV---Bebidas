import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({ prompt: 'select_account' });

let isSigningIn = false;
// Token mantido exclusivamente em memoria (nunca salvo em localStorage/sessionStorage)
let cachedAccessToken: string | null = null;

export const initGmailAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess?.(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        onAuthFailure?.();
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure?.();
    }
  });
};

export const signInWithGoogleForGmail = async (): Promise<{
  user: User;
  accessToken: string;
}> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter a autorização de envio do Gmail.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
};

export const getGmailAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const clearCachedGmailToken = (): void => {
  cachedAccessToken = null;
};

export const logoutGmail = async (): Promise<void> => {
  await auth.signOut();
  cachedAccessToken = null;
};

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return uint8ArrayToBase64(bytes);
}

function toBase64Url(bytes: Uint8Array): string {
  return uint8ArrayToBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function wrapBase64Lines(base64: string, lineLength = 76): string {
  const clean = base64.replace(/\s+/g, '');
  const lines: string[] = [];
  for (let i = 0; i < clean.length; i += lineLength) {
    lines.push(clean.slice(i, i + lineLength));
  }
  return lines.join('\r\n');
}

export interface SendGmailReportParams {
  toEmail: string;
  subject: string;
  textBody: string;
  pdfBase64?: string;
  pdfFileName?: string;
  accessToken: string;
}

export const sendEmailViaGmailApi = async (
  params: SendGmailReportParams
): Promise<{ messageId: string }> => {
  const { toEmail, subject, textBody, pdfBase64, pdfFileName, accessToken } = params;
  const cleanTo = toEmail.trim();
  if (!cleanTo) {
    throw new Error('Informe o e-mail de destino do dono.');
  }

  const encodedSubject = `=?UTF-8?B?${utf8ToBase64(subject)}?=`;
  const boundary = `----=_DepotClosing_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const mimeParts: string[] = [
    `To: ${cleanTo}`,
    `Subject: ${encodedSubject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    wrapBase64Lines(utf8ToBase64(textBody)),
  ];

  if (pdfBase64) {
    const safeFileName = (pdfFileName || 'Fechamento_Caixa.pdf').replace(/"/g, '');
    mimeParts.push(
      `--${boundary}`,
      `Content-Type: application/pdf; name="${safeFileName}"`,
      `Content-Disposition: attachment; filename="${safeFileName}"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      wrapBase64Lines(pdfBase64)
    );
  }

  mimeParts.push(`--${boundary}--`, ``);

  const rawMime = mimeParts.join('\r\n');
  const rawEncoded = toBase64Url(new TextEncoder().encode(rawMime));

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: rawEncoded }),
  });

  if (response.status === 401) {
    clearCachedGmailToken();
    throw new Error('Sessão do Google expirada. Clique em "Conectar Gmail" novamente para renovar.');
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro ao enviar pelo Gmail (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as { id?: string };
  return { messageId: data.id || 'sent' };
};
