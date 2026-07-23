// Google Meet idopont-szervezes kozos segedei: slot-cimke + a /api/meet hivas.
// Mindket levelkeszito (postazo: NotifyModal, Titkarno: LevelWizard) ezen at hozza
// letre az EGY kozos Meet-linket (egy elozetes, tentativ Google-esemenyhez) tobb
// javasolt idohoz. A link a levelbe/kartyara teteje a hivo dolga.
import { MeetSlot, MeetingMode } from './letters';

const HU_MONTHS = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];

// olvashato cimke egy slothoz: "2026. július 22. 14:00-15:00"
export const slotLabel = (s: MeetSlot): string => {
  if (!s?.day) return '';
  const [y, mo, d] = s.day.split('-');
  const month = HU_MONTHS[parseInt(mo, 10) - 1] ?? mo;
  const t = s.start ? ` ${s.start}${s.end && s.end !== s.start ? `-${s.end}` : ''}` : '';
  return `${y}. ${month} ${parseInt(d, 10)}.${t}`;
};

// A levelbe/valaszba beszurhato meeting-szoveg (determinisztikus, a Posta valasz-szerkesztojehez).
// A postazo/wizard a letters.ts meetingBlock-ot hasznalja (valtozatos hangnem); itt egyszeru, stabil szoveg kell.
// fixed: BEJEGYZETT (fix) idopont - meghivo-hangnem, nincs "melyik felel meg" kerdes.
export const meetingText = (mode: MeetingMode, slots: MeetSlot[], link?: string, fixed?: boolean): string => {
  const times = slots.map(slotLabel).filter(Boolean);
  if (fixed) {
    const what = mode === 'szemelyes'
      ? 'Személyes találkozót'
      : mode === 'hibrid'
        ? 'Hibrid (személyes és online) találkozót'
        : 'Online (Google Meet) találkozót';
    const lines = [`${what} jegyeztem be: ${times[0] ?? ''}.`];
    if (mode !== 'szemelyes') lines.push(link ? `Link: ${link}` : 'A belépési linket külön küldöm.');
    lines.push('Kérlek, csatlakozz a megadott időpontban.');
    return lines.join('\n');
  }
  const lead = mode === 'szemelyes'
    ? 'Személyes egyeztetést javaslok'
    : mode === 'hibrid'
      ? 'Hibrid egyeztetést javaslok, személyesen és online is lehet csatlakozni'
      : 'Online egyeztetést javaslok';
  const lines = [times.length === 1 ? `${lead}: ${times[0]}.` : `${lead}.`];
  if (times.length > 1) {
    lines.push('Javasolt időpontok, kérlek jelezd, melyik felel meg:');
    times.forEach((t) => lines.push(`- ${t}`));
  }
  if (mode !== 'szemelyes' && link) lines.push(`Link: ${link}`);
  return lines.join('\n');
};

export interface CreatedMeet { link: string; googleEventId: string; unconfigured: boolean; error?: string }

// ora:perc + 1 ora (23-nal plafon) - ures zaro idonel ne szulessen 0 perces Google-esemeny
const plusHour = (hm: string): string => {
  const [h, m] = hm.split(':').map((x) => parseInt(x, 10));
  const hh = Math.min(23, (Number.isNaN(h) ? 9 : h) + 1);
  return `${String(hh).padStart(2, '0')}:${String(Number.isNaN(m) ? 0 : m).padStart(2, '0')}`;
};

// Egy kozos Meet-link: az ELSO kitoltott slot lesz a Google-esemeny ideje.
// fixed=false (javaslat-kor): tentative esemeny; fixed=true (foglalas): confirmed.
// Token/OAuth nelkul unconfigured:true.
export async function createMeet(opts: {
  title: string;
  slots: MeetSlot[];
  place?: string | null;
  attendees: string[];
  sendInvite?: boolean;
  fixed?: boolean;
  noMeet?: boolean; // sima naptarbejegyzes Meet-link nelkul (szemelyes fix foglalas meghivoval)
  headers?: Record<string, string>;
}): Promise<CreatedMeet> {
  const filled = opts.slots.filter((s) => s.day && s.start);
  if (!filled.length) return { link: '', googleEventId: '', unconfigured: false, error: 'nincs kitöltött időpont (nap + kezdés)' };
  const first = filled[0];
  const startIso = `${first.day}T${first.start}:00`;
  const endIso = `${first.day}T${(first.end && first.end !== first.start ? first.end : plusHour(first.start ?? ''))}:00`;
  try {
    const res = await fetch('/api/meet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
      body: JSON.stringify({
        action: 'create', summary: opts.title, startIso, endIso,
        // RÉSZTVEVŐT csak KIFEJEZETT meghívó-kérésnél adunk a Google-eseményhez:
        // enélkül a Google a Gmail-es címzetteknél akkor is megjelenítheti/jelezheti az
        // eseményt, ha sendInvite false (2026-07-22 tanulság - kéretlen értesítés ment ki).
        // A meghívást a LEVÉL viszi; a Google-esemény a saját naptárad bejegyzése.
        location: opts.place || undefined, attendees: opts.sendInvite ? opts.attendees : [],
        sendInvite: !!opts.sendInvite, tentative: !opts.fixed, noMeet: !!opts.noMeet,
        // a Google-esemeny leirasa MINDIG ures: a slot-lista/belso jegyzet nem kerulhet
        // kulso feluletre (2026-07-22 privacy-szabaly)
        description: '',
      }),
    });
    const j = await res.json() as { ok?: boolean; unconfigured?: boolean; meetLink?: string; googleEventId?: string; error?: string };
    if (j.unconfigured) return { link: '', googleEventId: '', unconfigured: true };
    if (!j.ok) return { link: '', googleEventId: '', unconfigured: false, error: j.error ?? 'ismeretlen hiba' };
    return { link: j.meetLink ?? '', googleEventId: j.googleEventId ?? '', unconfigured: false };
  } catch (e) {
    return { link: '', googleEventId: '', unconfigured: false, error: e instanceof Error ? e.message : 'hálózati hiba' };
  }
}
