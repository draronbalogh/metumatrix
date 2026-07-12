import { NextResponse } from 'next/server';

// Hozzáférés: NINCS kulcs és NINCS query-paraméter. A Tailscale proxy a saját
// tailnetből érkező kérésekre ráteszi a Tailscale-User-Login fejlécet (a kívülről,
// Funnelen át jövőkre nem, és a kliens által küldött hamisítványt eltávolítja).
// Így ugyanaz a link: a tulaj eszközein szerkesztői, mindenki másnál megtekintő.
export function editorLogin(req: Request): string | null {
  return req.headers.get('tailscale-user-login');
}

export function canWrite(req: Request): boolean {
  if (process.env.OPEN_EDIT === '1') return true; // vészkijárat tailscale nélküli futtatáshoz
  return !!editorLogin(req);
}

export const writeDenied = () =>
  NextResponse.json({ ok: false, error: 'Megtekintő mód: szerkeszteni csak a saját (Tailscale) eszközökről lehet.' }, { status: 403 });
