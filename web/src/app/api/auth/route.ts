import { NextResponse } from 'next/server';
import { canWrite, editorLogin } from '@/lib/editauth';

// A kliens ezzel dönti el a módot: a tailnetből jövő kérés szerkesztő, a többi megtekintő.
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return NextResponse.json({ ok: canWrite(req), user: editorLogin(req) });
}
