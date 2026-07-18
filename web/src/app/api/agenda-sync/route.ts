import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import { canWrite, writeDenied } from '@/lib/editauth';

// A Posta „Mai levelek beolvasása" gombja: a helyi Outlook->agenda szinkront indítja EL
// (headless `claude -p` + Playwright), de CSAK a mai napra szűkítve. Fire-and-forget: azonnal
// visszatér („elindítva"), a futás a háttérben megy (pár perc), az agenda magától frissül.
// Zárolás (lock-fájl) védi a párhuzamos indítást (a Playwright-profil egyszerre egy futást enged).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROOT = process.env.AGENDA_ROOT || 'C:/node/metu_tanterv';
const CLAUDE = process.env.CLAUDE_BIN || 'C:/Users/User/.local/bin/claude.exe';
const PROMPT = `${ROOT}/automation/outlook-agenda-prompt.md`;
const LOCK = `${ROOT}/automation/agenda-sync.lock`;
const TMP = `${ROOT}/automation/_today-prompt.md`;
const LOG = `${ROOT}/automation/logs/runs.log`;
const STATE = `${ROOT}/automation/outlook-agenda-state.json`;
const WRAPPER = `${ROOT}/automation/_agenda-sync-run.cmd`;
const ALLOWED = 'mcp__plugin_playwright_playwright,Read,Glob,Grep,Write,Edit,Bash(python:*),Bash(py:*),Bash(curl:*)';
const LOCK_TTL = 15 * 60 * 1000; // 15 perc: ennél régebbi lock elavult (elakadt futás)

const ymdLocal = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ÁLLAPOT: fut-e még a beolvasás (lock-fájl él-e), mennyi ideje, és a legutóbbi futás
// eredménye (vízjel lastRun + processed). A UI ezt pollozza a folyamatjelzőhöz.
export async function GET(req: Request) {
  if (!canWrite(req)) return writeDenied();
  let running = false, elapsedSec = 0;
  try { const st = await fs.stat(LOCK); const age = Date.now() - st.mtimeMs; running = age < LOCK_TTL; elapsedSec = Math.round(age / 1000); } catch { /* nincs lock */ }
  let lastRunMs = 0, processed: number | null = null;
  try {
    const s = JSON.parse(await fs.readFile(STATE, 'utf8')) as { lastRun?: string; processed?: number };
    if (s.lastRun) lastRunMs = new Date(s.lastRun).getTime();
    if (typeof s.processed === 'number') processed = s.processed;
  } catch { /* nincs state */ }
  return NextResponse.json({ running, elapsedSec, lastRunMs, processed });
}

export async function POST(req: Request) {
  if (!canWrite(req)) return writeDenied();

  // zárolás: ha < 15 perce fut egy beolvasás, ne indítsunk másikat (profil-zár)
  try {
    const st = await fs.stat(LOCK);
    if (Date.now() - st.mtimeMs < LOCK_TTL) {
      return NextResponse.json({ ok: false, running: true, msg: 'Már fut egy beolvasás, várd meg (pár perc).' });
    }
  } catch { /* nincs lock: mehet */ }

  const today = ymdLocal(new Date());
  // a bot-spec + MAI szűkítés (a megosztott promptot NEM módosítjuk, ide fűzzük a szűkítést)
  let combined: string;
  try {
    const base = await fs.readFile(PROMPT, 'utf8');
    combined = `${base}\n\n## MAI-SZŰKÍTÉS (a Posta „Mai levelek beolvasása" gombjáról indítva)\nCSAK a MAI napon (${today}) beérkezett ÉS elküldött leveleket nézd meg és dolgozd be; a korábbi napokat teljesen hagyd figyelmen kívül. Minden más szabály (dedup, egy folyamat = egy kártya, mezőtulajdon, backup, biztonság) változatlan.\n`;
    await fs.writeFile(TMP, combined, 'utf8');
    await fs.mkdir(LOG.replace(/[\\/][^\\/]+$/, ''), { recursive: true });
    await fs.writeFile(LOCK, new Date().toISOString(), 'utf8');
  } catch (e) {
    return NextResponse.json({ ok: false, error: `előkészítés sikertelen: ${(e as Error).message}` }, { status: 500 });
  }

  // detached háttérfutás. FONTOS: NEM inline `cmd /c "..."` (a több idézőjeles útvonalat a
  // cmd elrontja, a takarító `del` nem futott le -> beragadt lock). Helyette WRAPPER .cmd
  // fájlba írjuk a parancsot (mint a működő run-outlook-agenda.cmd), és azt futtatjuk.
  const win = (p: string) => p.replace(/\//g, '\\');
  const wrapper = [
    '@echo off',
    `cd /d "${win(ROOT)}"`,
    `echo. >> "${win(LOG)}"`,
    `echo ================ GOMBOS MAI FUTAS: %date% %time% ================ >> "${win(LOG)}"`,
    `"${win(CLAUDE)}" -p --allowedTools "${ALLOWED}" --max-turns 150 < "${win(TMP)}" >> "${win(LOG)}" 2>&1`,
    `echo ---- CLAUDE UTAN, kilepesi kod: %errorlevel% (%date% %time%) ---- >> "${win(LOG)}"`,
    `del "${win(LOCK)}" 2>nul`,
    `del "${win(TMP)}" 2>nul`,
    '',
  ].join('\r\n');
  try {
    await fs.writeFile(WRAPPER, wrapper, 'utf8');
    // a headless claude a felhasználói profilból tölti a configot/auth-ot; a dev-szerver
    // env-je hiányos lehet (pl. nincs HOME) -> claude exit 1 kimenet nélkül. Explicit env.
    const env = { ...process.env, HOME: process.env.USERPROFILE || process.env.HOME || '' };
    const child = spawn('cmd.exe', ['/c', win(WRAPPER)], { cwd: win(ROOT), detached: true, stdio: 'ignore', windowsHide: true, env });
    child.unref();
  } catch (e) {
    try { await fs.unlink(LOCK); } catch { /* ignore */ }
    try { await fs.unlink(TMP); } catch { /* ignore */ }
    return NextResponse.json({ ok: false, error: `indítás sikertelen: ${(e as Error).message}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true, started: true, today, startedAtMs: Date.now() });
}
