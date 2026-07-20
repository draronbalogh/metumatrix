// Google Meet idopont-szervezes kozos segedei: slot-cimke + a /api/meet hivas.
// Mindket levelkeszito (postazo: NotifyModal, Titkarno: LevelWizard) ezen at hozza
// letre az EGY kozos Meet-linket (egy elozetes, tentativ Google-esemenyhez) tobb
// javasolt idohoz. A link a levelbe/kartyara teteje a hivo dolga.
import { MeetSlot } from './letters';

const HU_MONTHS = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];

// olvashato cimke egy slothoz: "2026. július 22. 14:00-15:00"
export const slotLabel = (s: MeetSlot): string => {
  if (!s?.day) return '';
  const [y, mo, d] = s.day.split('-');
  const month = HU_MONTHS[parseInt(mo, 10) - 1] ?? mo;
  const t = s.start ? ` ${s.start}${s.end && s.end !== s.start ? `-${s.end}` : ''}` : '';
  return `${y}. ${month} ${parseInt(d, 10)}.${t}`;
};

export interface CreatedMeet { link: string; googleEventId: string; unconfigured: boolean; error?: string }

// Egy kozos Meet-link tobb javasolt idohoz: az ELSO kitoltott slot lesz a Google-esemeny
// ideje (tentative), a tobbi a leirasban javaslatkent. Token/OAuth nelkul unconfigured:true.
export async function createMeet(opts: {
  title: string;
  slots: MeetSlot[];
  place?: string | null;
  attendees: string[];
  sendInvite?: boolean;
  headers?: Record<string, string>;
}): Promise<CreatedMeet> {
  const filled = opts.slots.filter((s) => s.day && s.start);
  if (!filled.length) return { link: '', googleEventId: '', unconfigured: false, error: 'nincs kitöltött időpont (nap + kezdés)' };
  const first = filled[0];
  const startIso = `${first.day}T${first.start}:00`;
  const endIso = `${first.day}T${first.end || first.start}:00`;
  try {
    const res = await fetch('/api/meet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
      body: JSON.stringify({
        action: 'create', summary: opts.title, startIso, endIso,
        location: opts.place || undefined, attendees: opts.attendees,
        sendInvite: !!opts.sendInvite, tentative: true,
        description: `METU Media Design egyeztetés. Javasolt időpontok:\n${filled.map(slotLabel).join('\n')}`,
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
