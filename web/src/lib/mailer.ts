// Szerveroldali email-küldő (nodemailer + Gmail SMTP). CSAK szerveren fut (API route / cron).
// A hitelesítő adatok a .env.local-ból jönnek; ha nincs kitöltve, a küldés érthető hibát ad.
import nodemailer, { Transporter } from 'nodemailer';

let cached: Transporter | null = null;

export function mailerConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransport(): Transporter {
  if (cached) return cached;
  cached = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return cached;
}

export interface MailInput {
  subject: string;
  html?: string;
  text?: string;
  to?: string[];   // közvetlen címzettek
  bcc?: string[];  // rejtett címzettek (csoportlevélnél ez az alap)
}

// Elküld egy levelet. A NOTIFY_FROM a feladó; ha nincs to/bcc, a feladó saját magának megy (teszt).
export async function sendMail(input: MailInput): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  if (!mailerConfigured()) {
    return { ok: false, error: 'Az email-küldés nincs beállítva (.env.local: SMTP_USER / SMTP_PASS).' };
  }
  const from = process.env.NOTIFY_FROM || process.env.SMTP_USER || '';
  const recips = (input.to && input.to.length) ? input.to : undefined;
  const bcc = (input.bcc && input.bcc.length) ? input.bcc : undefined;
  if (!recips && !bcc) return { ok: false, error: 'Nincs címzett.' };
  try {
    const info = await getTransport().sendMail({
      from,
      to: recips || from,   // ha csak bcc van, a látható címzett maga a feladó
      bcc,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
