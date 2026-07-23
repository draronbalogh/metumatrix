// Google Calendar (Meet) kliens - sima fetch, kulon fuggoseg (googleapis) nelkul.
// A METU titkarno idopont-szervezesehez hoz letre esemenyt Meet-linkkel.
// A fiok/naptar env-bol konfiguralhato; token nelkul gcalConfigured() false, a hivok stubot adnak.

import { randomUUID } from 'crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_BASE = 'https://www.googleapis.com/calendar/v3';

const cfg = () => ({
  clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
  refreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '',
  calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
});

export const gcalConfigured = (): boolean => {
  const c = cfg();
  return !!(c.clientId && c.clientSecret && c.refreshToken);
};

// access token cache: a Google access token ~1 orat el, 5 percen belul ujrahasznaljuk
let tokenCache: { token: string; exp: number } | null = null;

const refreshAccessToken = async (): Promise<string> => {
  const now = Date.now();
  if (tokenCache && tokenCache.exp > now + 30000) return tokenCache.token;
  const c = cfg();
  const body = new URLSearchParams({
    client_id: c.clientId,
    client_secret: c.clientSecret,
    refresh_token: c.refreshToken,
    grant_type: 'refresh_token',
  });
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!r.ok) throw new Error(`token refresh ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = (await r.json()) as { access_token?: string; expires_in?: number };
  if (!j.access_token) throw new Error('nincs access_token a valaszban');
  tokenCache = { token: j.access_token, exp: now + (j.expires_in ?? 3600) * 1000 };
  return j.access_token;
};

interface EventResp {
  id: string;
  hangoutLink?: string;
  htmlLink?: string;
  conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
}

// a Meet video-belepesi link: eloszor a hangoutLink, tartalek az entryPoints video-uri-ja
const extractMeet = (e: EventResp): string =>
  e.hangoutLink
  || e.conferenceData?.entryPoints?.find((p) => p.entryPointType === 'video')?.uri
  || '';

export interface CreateMeetOpts {
  summary: string;
  startIso: string;
  endIso: string;
  timeZone?: string;
  description?: string;
  location?: string;
  attendees?: string[];
  sendInvite?: boolean;   // true: a Google is kikuld .ics meghivot (sendUpdates=all)
  tentative?: boolean;    // egyeztetes alatt (status=tentative)
  noMeet?: boolean;       // sima naptarbejegyzes Meet-link NELKUL (pl. tomeges publikalas, Outlook-tukrok)
}

export const createMeetEvent = async (
  o: CreateMeetOpts,
): Promise<{ googleEventId: string; meetLink: string; htmlLink: string }> => {
  const token = await refreshAccessToken();
  const c = cfg();
  const tz = o.timeZone ?? 'Europe/Budapest';
  const body: Record<string, unknown> = {
    summary: o.summary,
    location: o.location,
    description: o.description,
    start: { dateTime: o.startIso, timeZone: tz },
    end: { dateTime: o.endIso, timeZone: tz },
    status: o.tentative ? 'tentative' : 'confirmed',
    attendees: (o.attendees ?? []).map((email) => ({ email })),
  };
  if (!o.noMeet) {
    body.conferenceData = {
      createRequest: { requestId: randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } },
    };
  }
  const sendUpdates = o.sendInvite ? 'all' : 'none';
  const url = `${API_BASE}/calendars/${encodeURIComponent(c.calendarId)}/events?conferenceDataVersion=1&sendUpdates=${sendUpdates}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`event insert ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const e = (await r.json()) as EventResp;
  return { googleEventId: e.id, meetLink: extractMeet(e), htmlLink: e.htmlLink ?? '' };
};

export interface UpdateMeetPatch {
  startIso?: string;
  endIso?: string;
  summary?: string;
  description?: string;
  location?: string;
  timeZone?: string;
  tentative?: boolean;
  clearAttendees?: boolean; // a resztvevok ELTAVOLITASA a Google-esemenyrol (szivargas-takaritas)
  attendees?: string[];     // resztvevok BEALLITASA - csak kifejezett meghivo-kuldesnel (fix foglalas)
  sendInvite?: boolean;     // true: a Google .ics meghivot/frissitest kuld a resztvevoknek (sendUpdates=all)
}

// atutemezes/veglegesites: a conferenceData-t NEM irjuk felul, igy a Meet-link marad
export const updateMeetEvent = async (
  googleEventId: string,
  patch: UpdateMeetPatch,
): Promise<{ googleEventId: string; meetLink: string }> => {
  const token = await refreshAccessToken();
  const c = cfg();
  const tz = patch.timeZone ?? 'Europe/Budapest';
  const body: Record<string, unknown> = {};
  if (patch.summary !== undefined) body.summary = patch.summary;
  if (patch.description !== undefined) body.description = patch.description;
  if (patch.location !== undefined) body.location = patch.location;
  if (patch.startIso) body.start = { dateTime: patch.startIso, timeZone: tz };
  if (patch.endIso) body.end = { dateTime: patch.endIso, timeZone: tz };
  if (patch.tentative !== undefined) body.status = patch.tentative ? 'tentative' : 'confirmed';
  if (patch.clearAttendees) body.attendees = [];
  // resztvevoket CSAK kifejezett meghivo-kuldessel egyutt allitunk be (privacy-szabaly)
  if (patch.attendees && patch.sendInvite) body.attendees = patch.attendees.map((email) => ({ email }));
  const sendUpdates = patch.sendInvite ? 'all' : 'none';
  const url = `${API_BASE}/calendars/${encodeURIComponent(c.calendarId)}/events/${encodeURIComponent(googleEventId)}?conferenceDataVersion=1&sendUpdates=${sendUpdates}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`event patch ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const e = (await r.json()) as EventResp;
  return { googleEventId: e.id, meetLink: extractMeet(e) };
};

// torles: az app-esemeny torlesenek propagalasa a Google-naptarba.
// 404/410 = a Google-oldalon mar nincs meg - az is siker.
export const deleteMeetEvent = async (googleEventId: string): Promise<void> => {
  const token = await refreshAccessToken();
  const c = cfg();
  const url = `${API_BASE}/calendars/${encodeURIComponent(c.calendarId)}/events/${encodeURIComponent(googleEventId)}`;
  const r = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok && r.status !== 404 && r.status !== 410) throw new Error(`event delete ${r.status}: ${(await r.text()).slice(0, 200)}`);
};
