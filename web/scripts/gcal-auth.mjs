// Egyszeri Google OAuth a Calendar refresh tokenert (loopback flow, Desktop app kliens).
// Futtatas a web mappabol:  node scripts/gcal-auth.mjs
// Elotte a .env.local-ba kell:  GOOGLE_OAUTH_CLIENT_ID=...  GOOGLE_OAUTH_CLIENT_SECRET=...
import http from 'http';
import { exec } from 'child_process';
import { readFileSync } from 'fs';

const fromEnvLocal = (key) => {
  try {
    const txt = readFileSync('.env.local', 'utf8');
    const m = txt.match(new RegExp('^' + key + '=(.*)$', 'm'));
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
  } catch { return ''; }
};

const CID = process.env.GOOGLE_OAUTH_CLIENT_ID || fromEnvLocal('GOOGLE_OAUTH_CLIENT_ID');
const SEC = process.env.GOOGLE_OAUTH_CLIENT_SECRET || fromEnvLocal('GOOGLE_OAUTH_CLIENT_SECRET');
const PORT = 53682;
const REDIRECT = `http://127.0.0.1:${PORT}`;
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';

if (!CID || !SEC) {
  console.error('Hianyzik a GOOGLE_OAUTH_CLIENT_ID / _SECRET. Tedd a .env.local-ba, vagy add env-kent.');
  process.exit(1);
}

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(CID)}`
  + `&redirect_uri=${encodeURIComponent(REDIRECT)}&response_type=code`
  + `&scope=${encodeURIComponent(SCOPE)}&access_type=offline&prompt=consent`;

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, REDIRECT);
  const err = u.searchParams.get('error');
  if (err) { res.end('Hiba: ' + err); console.error('OAuth hiba:', err); server.close(); return; }
  const code = u.searchParams.get('code');
  if (!code) { res.end('nincs code'); return; }
  try {
    const body = new URLSearchParams({ code, client_id: CID, client_secret: SEC, redirect_uri: REDIRECT, grant_type: 'authorization_code' });
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
    });
    const j = await r.json();
    if (j.refresh_token) {
      console.log('\n=== SIKER - masold ezt a sort a .env.local-ba: ===\nGOOGLE_OAUTH_REFRESH_TOKEN=' + j.refresh_token + '\n');
      res.end('Kesz. A refresh token a konzolon. Bezarhatod ezt a lapot.');
    } else {
      console.error('\nNincs refresh_token a valaszban:\n', JSON.stringify(j, null, 2));
      res.end('Nem jott refresh token, lasd a konzolt.');
    }
  } catch (e) {
    console.error('token csere hiba:', e);
    res.end('token csere hiba, lasd a konzolt.');
  }
  server.close();
});

server.listen(PORT, () => {
  console.log('1) Ha nem nyilik meg magatol, nyisd meg ezt a bongeszoben (a draronbalogh@gmail.com fiokkal):\n', authUrl, '\n');
  exec(`start "" "${authUrl}"`, () => {});
});
