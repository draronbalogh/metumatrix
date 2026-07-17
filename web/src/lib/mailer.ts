// src/lib/mailer.ts
//
// Küldő réteg a metumatrix apphoz. Egy dedikált szakos Gmail-fiókról küld,
// app-jelszóval (2FA + Google App Password). Ez kimenő értesítés, amit maga az
// app generál a saját adataiból.
//
// A legfontosabb rész a BCC-batch. Egy sima @gmail.com fióknál a napi keret
// kb. 500 címzett, Workspace-nél kb. 2000, és BCC-nél MINDEN címzett külön
// számít. Egy nagy körlevelet ezért nem egy üzenetben küldünk ki, hanem
// kötegekre bontva, hogy egy „mindenkinek" kör is átmenjen és követhető legyen.

import nodemailer, { type Transporter } from 'nodemailer';

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const NOTIFY_FROM = process.env.NOTIFY_FROM || SMTP_USER || '';

// A megjelenített feladó név. Ez lesz látható a címzettnek a név helyén, pl.
// „Balogh Áron, Média Design szakvezető". A tényleges küldő cím a NOTIFY_FROM
// (a dedikált szakos Gmail) marad, semmit nem álcázunk: a név csak név, a cím
// egy valós, működő cím. Ha üres, csak a cím látszik.
const NOTIFY_FROM_NAME = process.env.NOTIFY_FROM_NAME || '';

// Ide érkezzenek a válaszok (pl. az intézményi metropolitan.hu címed). Ha egy
// hívás nem ad át saját replyTo-t, ezt használjuk alapból.
const NOTIFY_REPLY_TO = process.env.NOTIFY_REPLY_TO || '';

// Hány címzett kerülhet egyetlen üzenet BCC-jébe. Óvatos alapérték, hogy
// Gmail ne dobja el a kötegelt küldést. .env.local-ból felülírható.
const BCC_BATCH_SIZE = Math.max(1, Number(process.env.BCC_BATCH_SIZE || 90));

// Kötegek között ennyi ms szünet, hogy ne fussunk bele Gmail
// sebességkorlátozásába nagy köröknél.
const BATCH_DELAY_MS = Math.max(0, Number(process.env.BCC_BATCH_DELAY_MS || 1200));

// Brevo (transactional email, HTTPS API) - 2FA nélkül működik, és a 443-as porton
// megy, így a munkahelyi SMTP-tiltást is megkerüli. Ha a kulcs be van állítva,
// ez az elsődleges küldő; a Gmail SMTP csak tartalék.
const BREVO_API_KEY = process.env.BREVO_API_KEY;

let transporter: Transporter | null = null;

/**
 * True, ha a küldéshez szükséges kredenciálok megvannak (Brevo API-kulcs VAGY
 * Gmail SMTP app-jelszó). A route-ok ezt használják, hogy konfigurálatlan
 * állapotban értelmes hibát adjanak.
 */
export function isConfigured(): boolean {
  return Boolean((BREVO_API_KEY && NOTIFY_FROM) || (SMTP_USER && SMTP_PASS && NOTIFY_FROM));
}

function getTransporter(): Transporter {
  if (!isConfigured()) {
    throw new Error(
      'A mailer nincs konfigurálva: hiányzik az SMTP_USER, SMTP_PASS vagy NOTIFY_FROM a web/.env.local fájlból.'
    );
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

/**
 * Ellenőrzi, hogy a Gmail SMTP-kapcsolat és a hitelesítés működik-e.
 * Érdemes appindításkor vagy egy /api/health végponton meghívni, hogy
 * lejárt/rossz app-jelszó esetén korán kiderüljön.
 */
export async function verifyTransport(): Promise<void> {
  if (BREVO_API_KEY && NOTIFY_FROM) {
    const res = await fetch('https://api.brevo.com/v3/account', { headers: { 'api-key': BREVO_API_KEY, accept: 'application/json' } });
    if (!res.ok) throw new Error(`Brevo API-kulcs hibás vagy lejárt (HTTP ${res.status})`);
    return;
  }
  await getTransporter().verify();
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface SendBccInput {
  subject: string;
  /** Sima szöveges törzs. Legalább ez vagy a html kötelező. */
  text?: string;
  /** HTML törzs. */
  html?: string;
  /** A tényleges címzettek. BCC-be kerülnek, egymást nem látják. */
  recipients: string[];
  /**
   * Ide érkeznek a válaszok. Érdemes a tanszéki vagy saját címedre állítani,
   * különben a hallgatói válaszok a küldő szakos Gmailbe futnak.
   */
  replyTo?: string;
}

export interface BatchResult {
  index: number;
  size: number;
  ok: boolean;
  messageId?: string;
  error?: string;
}

export interface SendBccResult {
  attempted: number;
  sent: number;
  failed: number;
  batches: BatchResult[];
}

/**
 * BCC-körlevél küldése kötegelve. A „To" maga a küldő cím, a valódi
 * címzettek a BCC-ben vannak elrejtve. Kötegenként küld, és részletes
 * eredményt ad vissza, hogy naplózni lehessen mi ment át és mi nem.
 *
 * Nem dob kivételt egyetlen köteg hibája miatt: végigmegy az összesen, és a
 * hívó döntheti el, mit kezd a részleges sikerrel (pl. notifylog.json).
 */
// Egy köteg elküldése a Brevo HTTPS API-n át (api.brevo.com, 443-as port).
async function sendBatchBrevo(batch: string[], subject: string, text?: string, html?: string, replyTo?: string): Promise<{ messageId?: string }> {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY as string, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: NOTIFY_FROM_NAME ? { name: NOTIFY_FROM_NAME, email: NOTIFY_FROM } : { email: NOTIFY_FROM },
      to: [{ email: NOTIFY_FROM }],               // érvényes To; a valódi címzettek BCC-ben
      bcc: batch.map((email) => ({ email })),
      subject,
      textContent: text,
      htmlContent: html,
      replyTo: (replyTo || NOTIFY_REPLY_TO) ? { email: replyTo || NOTIFY_REPLY_TO } : undefined,
    }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${j.message || j.code || 'ismeretlen hiba'}`);
  return { messageId: j.messageId };
}

export async function sendBcc(input: SendBccInput): Promise<SendBccResult> {
  const { subject, text, html, recipients, replyTo } = input;

  if (!text && !html) {
    throw new Error('sendBcc: a text és a html közül legalább az egyik kötelező.');
  }

  // Védelmi dedup: ha véletlenül ismétlődő cím érkezik, ne számítson többször
  // a napi keretbe, és ne kapja meg duplán ugyanaz az ember.
  const unique = Array.from(
    new Set(
      recipients
        .map((r) => r.trim().toLowerCase())
        .filter((r) => r.length > 0)
    )
  );

  const result: SendBccResult = {
    attempted: unique.length,
    sent: 0,
    failed: 0,
    batches: [],
  };

  if (unique.length === 0) {
    return result;
  }

  const useBrevo = Boolean(BREVO_API_KEY && NOTIFY_FROM);
  const tx = useBrevo ? null : getTransporter();
  const batches = chunk(unique, BCC_BATCH_SIZE);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      if (useBrevo) {
        const info = await sendBatchBrevo(batch, subject, text, html, replyTo);
        result.sent += batch.length;
        result.batches.push({ index: i, size: batch.length, ok: true, messageId: info.messageId });
        if (i < batches.length - 1 && BATCH_DELAY_MS > 0) await sleep(BATCH_DELAY_MS);
        continue;
      }
      const info = await (tx as Transporter).sendMail({
        // A cím mindig a valós küldő (NOTIFY_FROM); a név csak megjelenítési
        // név. Így a feladó egyértelműen te vagy, álcázás nélkül.
        from: NOTIFY_FROM_NAME
          ? { name: NOTIFY_FROM_NAME, address: NOTIFY_FROM }
          : NOTIFY_FROM,
        to: NOTIFY_FROM, // érvényes To-fejléc; a valódi címzettek BCC-ben
        bcc: batch,
        subject,
        text,
        html,
        // Ha a hívó nem ad át replyTo-t, az env-beli alapot használjuk.
        replyTo: replyTo || NOTIFY_REPLY_TO || undefined,
      });
      result.sent += batch.length;
      result.batches.push({
        index: i,
        size: batch.length,
        ok: true,
        messageId: info.messageId,
      });
    } catch (err) {
      result.failed += batch.length;
      result.batches.push({
        index: i,
        size: batch.length,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Szünet a kötegek között, kivéve az utolsó után.
    if (i < batches.length - 1 && BATCH_DELAY_MS > 0) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return result;
}
