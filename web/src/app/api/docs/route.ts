import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { canWrite } from '@/lib/editauth';

// Oktatói segédletek (PDF/PPTX) kiszolgálása a grid/docs mappából.
// CSAK szerkesztőknek: az útmutatók belső információkat (pl. Zoom-belépés) tartalmaznak,
// a publikus megtekintő linken nem érhetők el. A böngészős <a> linkek nem tudnak
// fejlécet küldeni, ezért a ?k=<kulcs> query param is elfogadott (= az EDIT_KEY).
const DIR = process.env.DOCS_DIR || 'C:/node/metu_tanterv/grid/docs';

const FILES: Record<string, string> = {
  'zoom-hasznalat.pdf': 'application/pdf',
  'zoom-utmutato.pdf': 'application/pdf',
  'fooallasu-oktatoi-segedlet.pdf': 'application/pdf',
  'oraado-oktatoi-segedlet.pdf': 'application/pdf',
  'rendszerhasznalati-trening.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const f = url.searchParams.get('f') ?? '';
  const key = process.env.EDIT_KEY;
  const keyOk = !!key && url.searchParams.get('k') === key;
  if (!canWrite(req) && !keyOk) {
    return NextResponse.json({ ok: false, error: 'A segédletek csak szerkesztő módban érhetők el.' }, { status: 403 });
  }
  const mime = FILES[f];
  if (!mime) return NextResponse.json({ ok: false, error: 'Ismeretlen dokumentum.' }, { status: 404 });
  try {
    const buf = await fs.readFile(path.join(DIR, f));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': mime,
        // PDF a böngészőben nyílik; a pptx letöltődik
        'Content-Disposition': `${mime === 'application/pdf' ? 'inline' : 'attachment'}; filename="${f}"`,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'A fájl nem található a szerveren.' }, { status: 404 });
  }
}
