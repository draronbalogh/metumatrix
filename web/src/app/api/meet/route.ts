import { NextResponse } from 'next/server';
import { canWrite, writeDenied } from '@/lib/editauth';
import { gcalConfigured, createMeetEvent, updateMeetEvent, deleteMeetEvent } from '@/lib/gcal';

// Meet-esemeny letrehozas/frissites a Google Calendaron (METU ESEMENYEK naptar).
// Token nelkul { ok:false, unconfigured:true } - a kliens ezt kezeli (nem hiba).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreateBody {
  action: 'create';
  summary: string;
  startIso: string;
  endIso: string;
  timeZone?: string;
  description?: string;
  location?: string;
  attendees?: string[];
  sendInvite?: boolean;
  tentative?: boolean;
  noMeet?: boolean; // sima bejegyzes Meet-link nelkul (tomeges Gmail-publikalas)
}
interface UpdateBody {
  action: 'update';
  googleEventId: string;
  startIso?: string;
  endIso?: string;
  summary?: string;
  description?: string;
  timeZone?: string;
  tentative?: boolean;
  clearAttendees?: boolean; // résztvevők eltávolítása (szivárgás-takarítás)
}
interface DeleteBody {
  action: 'delete';
  googleEventId: string;
}
type MeetBody = CreateBody | UpdateBody | DeleteBody;

export async function POST(req: Request) {
  if (!canWrite(req)) return writeDenied();
  let b: MeetBody;
  try {
    b = (await req.json()) as MeetBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 });
  }
  if (!gcalConfigured()) return NextResponse.json({ ok: false, unconfigured: true });
  try {
    if (b.action === 'create') {
      if (!b.summary || !b.startIso || !b.endIso) {
        return NextResponse.json({ ok: false, error: 'hianyzo mezo (summary/startIso/endIso)' }, { status: 400 });
      }
      const r = await createMeetEvent(b);
      return NextResponse.json({ ok: true, ...r });
    }
    if (b.action === 'update') {
      if (!b.googleEventId) {
        return NextResponse.json({ ok: false, error: 'hianyzo googleEventId' }, { status: 400 });
      }
      const r = await updateMeetEvent(b.googleEventId, b);
      return NextResponse.json({ ok: true, ...r });
    }
    if (b.action === 'delete') {
      if (!b.googleEventId) {
        return NextResponse.json({ ok: false, error: 'hianyzo googleEventId' }, { status: 400 });
      }
      await deleteMeetEvent(b.googleEventId);
      return NextResponse.json({ ok: true, deleted: true });
    }
    return NextResponse.json({ ok: false, error: 'ismeretlen action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: `Meet hiba: ${String(e).slice(0, 250)}` }, { status: 502 });
  }
}
