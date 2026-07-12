import { NextResponse } from 'next/server';

// Hozzáférés — KÉT szerkesztői út, egy megtekintői:
// 1) A saját tailnet-eszközökről érkező kérésre a Tailscale proxy ráteszi a
//    Tailscale-User-Login fejlécet (hamisítás ellen védve) → automatikus szerkesztő mód.
// 2) IDEGEN gépen (pl. egyetemi asztali gép) a szerkesztői link használható:
//    ?ts=<EDIT_KEY> az URL-ben → a kliens x-edit-key fejlécben küldi. Nincs tárolás.
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
