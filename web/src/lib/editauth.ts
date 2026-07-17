import { NextResponse } from 'next/server';

// Hozzáférés - KÉT szerkesztői út, egy megtekintői:
// 1) A saját tailnet-eszközökről érkező kérésre a Tailscale proxy ráteszi a
//    Tailscale-User-Login fejlécet (hamisítás ellen védve) → automatikus szerkesztő mód.
// 2) IDEGEN gépen (pl. egyetemi asztali gép) a szerkesztői link használható:
//    ?net=<EDIT_KEY> az URL-ben → a kliens x-edit-key fejlécben küldi. Nincs tárolás.
// 3) Minden más (a csupasz publikus link) → megtekintő mód.
export function editorLogin(req: Request): string | null {
  return req.headers.get('tailscale-user-login');
}

export function canWrite(req: Request): boolean {
  if (process.env.OPEN_EDIT === '1') return true; // vészkijárat tailscale nélküli futtatáshoz
  if (editorLogin(req)) return true;
  const key = process.env.EDIT_KEY;
  return !!key && req.headers.get('x-edit-key') === key;
}

export const writeDenied = () =>
  NextResponse.json({ ok: false, error: 'Megtekintő mód: a szerkesztéshez a szerkesztői linket használd.' }, { status: 403 });

// Olvasási kapu (adat-GET-ek) - a csupasz publikus link SEMMIT nem ad ki:
// - tailnet-eszköz vagy szerkesztői kulcs: canWrite -> szabad
// - megtekintői link: ?net=<VIEW_KEY> (a kliens x-edit-key fejlécben küldi tovább)
// - minden más (kulcs nélküli kérés) -> 403, az app üres zár-oldalt mutat.
// FIGYELEM: helyi kivétel SZÁNDÉKOSAN nincs (az X-Forwarded-For alapú felismerés
// hamisítható) - a bot és a karbantartó szkriptek a GET-jeikhez is x-edit-key
// fejlécet küldenek, a kulcsot úgyis ismerik az íráshoz.
export function canRead(req: Request): boolean {
  if (canWrite(req)) return true;
  const supplied = req.headers.get('x-edit-key') ?? new URL(req.url).searchParams.get('net');
  if (!supplied) return false;
  const ek = process.env.EDIT_KEY;
  const vk = process.env.VIEW_KEY;
  return (!!vk && supplied === vk) || (!!ek && supplied === ek);
}

export const readDenied = () =>
  NextResponse.json({ ok: false, locked: true, error: 'A megtekintéshez kulcsos link kell.' }, { status: 403 });
