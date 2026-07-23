// Meeting-levél közös útja: meghívó (invite) vagy visszaigazoló (confirm) levél egy
// eseményhez - a Titkárnő (/api/compose) fogalmazza, hibánál determinisztikus tartalék,
// a kimenet kész Letter a Posta Kimenőbe (status:'outbox'). Újrahasználók: IdopontModal
// (fix foglalás + javaslat-kör), esemény-drawer "Meghívó-levél", slot-visszaigazolás.
import { Letter, LetterRecipient } from '@/data/agenda';
import { MeetSlot, MeetingMode } from './letters';
import { meetingText, slotLabel } from './meet';
import { editHeaders } from './editkey';

export interface MeetingLetterOpts {
  kind: 'invite' | 'confirm'; // meghívó (bejegyzett/javasolt időpontról) / időpont-visszaigazolás
  topic: string;              // a levél és az esemény témája
  description?: string | null; // 1 mondatos leírás - a LEVÉLBE megy (Google-ba SOHA)
  mode: MeetingMode;          // online / szemelyes / hibrid
  slots: MeetSlot[];          // fix/confirm: 1 elem; javaslatnál vagy fix-többalkalomnál több
  fixed: boolean;             // fix (bejegyzett) időpont(ok) vagy egyeztetés
  place?: string | null;
  meetLink?: string | null;
  slotLinks?: (string | null)[]; // fix-többalkalmas: alkalmankénti Meet-link (a slots-szal párhuzamos)
  extraAsk?: string | null;   // szabad kérés/megjegyzés a levélbe (pl. "ha egyik sem jó, kérj alternatív időpontot")
  recipients: LetterRecipient[];
  targetId: string | null;    // a kapcsolt esemény id-je
  names?: string[];           // kijelzett nevek (alap: a recipients nevei)
}

const MODE_TXT: Record<MeetingMode, string> = {
  online: 'online (Google Meet)', szemelyes: 'személyes', hibrid: 'hibrid (személyes és online is)',
};

export async function composeMeetingLetter(o: MeetingLetterOpts): Promise<Letter> {
  const sendMode: 'personal' | 'bcc' = o.recipients.length === 1 ? 'personal' : 'bcc';
  const filled = o.slots.filter((s) => s.day);
  const times = filled.map(slotLabel).filter(Boolean);
  // fix-többalkalmas meghívó: minden alkalom él, a sorába kerül a saját Meet-linkje
  const multiFixed = o.kind === 'invite' && o.fixed && filled.length > 1;
  const labeled = filled.map((s, i) => {
    const l = slotLabel(s);
    const lk = o.slotLinks?.[i];
    return lk ? `${l} · Meet-link: ${lk}` : l;
  });
  const isFixedTone = o.fixed || o.kind === 'confirm';
  let subject = o.kind === 'confirm'
    ? `Időpont visszaigazolása: ${o.topic}`
    : o.fixed ? `Meghívó: ${o.topic}` : `Időpont-egyeztetés: ${o.topic}`;
  let body = '';
  const extra = o.extraAsk?.trim() ? ` További kérés, amit a levélnek természetesen megfogalmazva tartalmaznia kell: ${o.extraAsk.trim()}` : '';
  const instruction = (o.kind === 'confirm'
    ? `Rövid visszaigazoló levelet írj: a(z) "${o.topic}" egyeztetés időpontját rögzítettem (${times.join(' ; ')}). Köszönd meg a visszajelzést, erősítsd meg az időpontot${o.meetLink ? ', és add meg a belépési linket' : ''}.${o.description ? ` A téma egy mondatban: ${o.description}` : ''}`
    : o.fixed
      ? multiFixed
        ? `Meghívó levelet írj: a(z) "${o.topic}" témában ${filled.length} ${MODE_TXT[o.mode]} alkalmat jegyeztem be (${times.join(' ; ')}) - MINDEGYIK él. Közöld, hogy az alkalmak be vannak jegyezve a naptárba, és kérd, hogy mindenki azon vegyen részt, amelyik belefér neki.${o.description ? ` A találkozó célja egy mondatban: ${o.description}` : ''}`
        : `Meghívó levelet írj: a(z) "${o.topic}" témában BEJEGYEZTEM egy ${MODE_TXT[o.mode]} találkozót (${times.join(' ; ')}). Közöld, hogy az időpont be van jegyezve a naptárba, és hívd a címzette(ke)t, hogy csatlakozzanak.${o.description ? ` A találkozó célja egy mondatban: ${o.description}` : ''}`
      : `Rövid, barátságos időpont-egyeztető levelet írj: ${o.topic}. A találkozó ${MODE_TXT[o.mode]}. Kérd, hogy jelezzék, melyik időpont felel meg.${o.description ? ` A téma egy mondatban: ${o.description}` : ''}`) + extra;
  try {
    const res = await fetch('/api/compose', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
      body: JSON.stringify({
        instruction,
        templates: [], recipients: o.recipients, sendMode, cardContext: [],
        meeting: {
          slots: multiFixed ? labeled : times, place: o.place ?? null,
          meetLink: multiFixed ? null : (o.meetLink || null), fixed: isFixedTone, online: o.mode !== 'szemelyes',
        },
        askAllowed: false, question: null, questionAnswer: null,
      }),
    });
    const j = await res.json() as { ok: boolean; subject?: string; body?: string };
    if (j.ok && j.body) { body = j.body; if (j.subject) subject = j.subject; }
  } catch { /* determinisztikus tartalék lentebb */ }
  if (!body) {
    // kis körnél (2-4 fő) a megszólítás "Kedves Mind," (user-döntés 2026-07-22)
    const greet = sendMode === 'personal' ? 'Kedves {keresztnev}!' : o.recipients.length <= 4 ? 'Kedves Mind,' : 'Kedves Mindenki!';
    const lead = o.kind === 'confirm'
      ? `Köszönöm a visszajelzést, a(z) ${o.topic} egyeztetés időpontját rögzítettem.`
      : o.description?.trim() || `${o.topic} ügyében szeretnék veled egyeztetni.`;
    const meetPart = multiFixed
      ? `Bejegyzett alkalmak (kérlek, azon vegyél részt, amelyik belefér):\n${labeled.map((l) => `- ${l}`).join('\n')}`
      : meetingText(o.mode, o.slots, o.meetLink ?? undefined, isFixedTone);
    const extraPart = o.extraAsk?.trim() ? `\n\n${o.extraAsk.trim()}` : '';
    body = `${greet}\n\n${lead}\n\n${meetPart}${extraPart}\n\nÜdvözlettel:\nBalogh Áron`;
  }
  return {
    id: `l-${Date.now().toString(36)}`, createdAt: new Date().toISOString(),
    targetType: 'event', targetId: o.targetId,
    subject, body, names: o.names ?? o.recipients.map((r) => r.name), recipients: o.recipients,
    status: 'outbox', dir: 'out', sendMode,
    scheduledFor: null, meetLink: o.meetLink || undefined,
  };
}
