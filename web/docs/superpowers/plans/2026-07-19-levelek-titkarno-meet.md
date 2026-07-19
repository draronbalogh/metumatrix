# Levelek titkárnő + küldés + Google Meet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Levelek nézetben egy titkárnő diktált szándékból sablon-alapú, Áron stílusú végleges levelet ír, feladat/esemény-szinkronban, Google Meet-linkkel, és a levél a Posta küldés-előtti listáján át kiküldhető.

**Architecture:** Vékony kimenő réteg a meglévő Posta-motorra. A levél szövegét a helyi claude CLI írja (a `/api/rephrase` mintájára új `/api/compose`), az adatot (naptári esemény, feladat, Meet-link) az app hozza létre determinisztikusan. A Google Calendar REST API-t sima `fetch` hívja (nincs új függőség). A kimenő levelek a `letters[]` tömbben élnek `dir:'out'` + `status:'outbox'` jelöléssel, és a bővített `create-outlook-drafts.ps1` küldi őket.

**Tech Stack:** Next.js 15.3.5 (App Router, nodejs runtime), React 19, TypeScript 5 (strict), Google Calendar REST API v3 fetch-en, helyi claude CLI, Windows PowerShell + Outlook COM.

## Global Constraints

- Nyelv: minden felhasználónak látható szöveg (UI, levél, commit) magyar; a kód-azonosítók angolul is lehetnek.
- TILOS a hosszú gondolatjel (—) MINDEN szövegben (UI, levél, commit, kód-komment); helyette kötőjel, vessző, új mondat.
- TypeScript: SOHA `any`; `unknown` + szűkítés.
- Minden fájlírás/olvasás UTF-8, ékezethelyesen.
- Nincs teszt-keretrendszer a metumatrix/web-ben. Verifikáció: `cd C:/node/metumatrix/web && npx tsc --noEmit` (typecheck), szükség szerint `npm run build`, és a futó appban (dev port 3939) kézi végigjátszás. Tiszta-logika modulokhoz egyszeri `node` ellenőrző szkript is használható, tesztkeret HOZZÁADÁSA nélkül.
- Egy forrás elve: tanár/hallgató nevek csak a Névjegyzékből (`people.json`); más szak oktatói kizárva.
- Google fiók/naptár konfigurálható env-ből; alap: `balogh.aron@gmail.com`, METU ESEMÉNYEK naptár.
- Az agenda írása a meglévő rev-védelmet és field-ownershipet tartja; a kimenő levelek APP-tulajdon (nem a bot writer-guard).
- Commit üzenet vége mindig:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01PjCUkS54hw3dp8HE4i6eYb`

---

## Task 0 (Prerequisite): Google OAuth beállítás

Ez FELHASZNÁLÓI közreműködést igényel, és blokkolja a Meet-részeket (de a többi taskot NEM). A Google-mentes taskok (1, 4, 5, 6, 7-12 nagy része, 15, 16) párhuzamosan haladhatnak; a Meet stubbal (üres link) fejleszthető, majd a token megléte után élesíthető.

**Files:**
- Create: `C:/node/metumatrix/web/scripts/gcal-auth.mjs` (egyszeri loopback OAuth a refresh token megszerzéséhez)
- Modify: `C:/node/metumatrix/web/.env.local` (env-kulcsok; gitignore-olt)

**Lépések:**

- [ ] **Step 1:** A felhasználó a Google Cloud Console-ban létrehoz egy OAuth 2.0 kliens azonosítót (Desktop app típus), engedélyezi a Google Calendar API-t, és megadja a `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` értékeket. (Manuális, dokumentálandó a fejlesztő által, nem kódolható.)

- [ ] **Step 2:** `scripts/gcal-auth.mjs` létrehozása: loopback szerver a `http://127.0.0.1:53682` címen, megnyitja a consent URL-t (`scope=https://www.googleapis.com/auth/calendar.events`, `access_type=offline`, `prompt=consent`), a visszakapott code-ot beváltja tokenre a `https://oauth2.googleapis.com/token` végponton, és kiírja a `refresh_token`-t.

```js
// scripts/gcal-auth.mjs  (node scripts/gcal-auth.mjs futtatás)
import http from 'http';
import { exec } from 'child_process';
const CID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const SEC = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const REDIRECT = 'http://127.0.0.1:53682';
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
if (!CID || !SEC) { console.error('Elobb allitsd be a GOOGLE_OAUTH_CLIENT_ID / _SECRET env-et.'); process.exit(1); }
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(CID)}&redirect_uri=${encodeURIComponent(REDIRECT)}&response_type=code&scope=${encodeURIComponent(SCOPE)}&access_type=offline&prompt=consent`;
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, REDIRECT);
  const code = u.searchParams.get('code');
  if (!code) { res.end('nincs code'); return; }
  const body = new URLSearchParams({ code, client_id: CID, client_secret: SEC, redirect_uri: REDIRECT, grant_type: 'authorization_code' });
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await r.json();
  console.log('\nREFRESH_TOKEN:\n', j.refresh_token || j);
  res.end('Kesz, a refresh token a konzolon. Bezarhatod.');
  server.close();
});
server.listen(53682, () => { console.log('Nyisd meg:', authUrl); exec(`start "" "${authUrl}"`); });
```

- [ ] **Step 3:** A felhasználó lefuttatja: `cd C:/node/metumatrix/web && node scripts/gcal-auth.mjs`, belép `balogh.aron@gmail.com`-mal, engedélyez, a konzolról kimásolja a refresh tokent.

- [ ] **Step 4:** A `.env.local`-ba bekerül (a naptár id a `list_calendars`-ból: a METU ESEMÉNYEK id-je):

```
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REFRESH_TOKEN=...
GOOGLE_CALENDAR_ID=92f62b0c6f9a78717d237793e28a527cb7fb7ab63c1dde4a93cbf3e660eb93c6@group.calendar.google.com
```

- [ ] **Step 5 (verify):** Task 2 `refreshAccessToken()` lefut hibátlanul (access_token jön). Ha nincs token, a Meet-részek stubbal mennek tovább.

---

## Task 1: Adatmodell bővítése (agenda.ts)

**Files:**
- Modify: `C:/node/metumatrix/web/src/data/agenda.ts` (Letter, AgendaEvent, AgendaSource, AgendaTask interfészek)

**Interfaces:**
- Produces: bővített `Letter` (`dir`, `recipients`, `sendMode`, `sendGoogleInvite`, `status` +`'outbox'`, `scheduledFor`, `templateId`, `meetLink`), `AgendaEvent` (`googleEventId`, `meetLink`, `mstatus`), `AgendaTask`/`AgendaSource` (`meetLink`). Új típus: `LetterRecipient`.

- [ ] **Step 1:** `LetterRecipient` típus + `Letter` bővítés az agenda.ts-ben (a meglévő `Letter` interfész után/helyett):

```ts
export interface LetterRecipient { name: string; email: string; kind: string }

export interface Letter {
  id: string;
  createdAt: string;
  targetType: 'event' | 'task' | null;
  targetId: string | null;
  subject: string;
  body: string;
  names: string[];
  status?: 'draft' | 'sent' | 'outbox';   // outbox = kimenő, küldésre kész
  dir?: 'out';                             // Levelek-kezdeményezett kimenő levél
  recipients?: LetterRecipient[];          // feloldott címzettek
  sendMode?: 'personal' | 'bcc';           // személyre szabott / közös BCC
  sendGoogleInvite?: boolean;              // a Google is küldjön .ics meghívót
  scheduledFor?: string | null;            // hajnali ütemezett küldés (ISO helyi)
  templateId?: string;                     // a scaffold sablon id-je
  meetLink?: string;                       // a levélbe kerülő Meet-link
}
```

- [ ] **Step 2:** `AgendaEvent` bővítés (a meglévő mezők után): `googleEventId?: string | null;`, `meetLink?: string | null;`, `mstatus?: 'tentative' | 'confirmed' | null;` (a `status` nevet nem használjuk, hogy ne ütközzön a jövőben; `mstatus` = meeting-status).

- [ ] **Step 3:** `AgendaTask` és `AgendaSource` bővítés: `meetLink?: string | null;` mindkettőn.

- [ ] **Step 4:** Ellenőrizd, hogy a `normalizeAgenda` átviszi az új mezőket: a `letters: a.letters ?? []` a Letter-eket változatlanul adja (új mezők megmaradnak), az events `...e` spreaddel megy (megmarad), a source `migrateSource`-ban `...raw` spreaddel (megmarad). Nincs kódmódosítás, csak igazold olvasással. Ha bármelyik ág mezőt ejtene, told bele a spreadet.

- [ ] **Step 5 (verify):** `cd C:/node/metumatrix/web && npx tsc --noEmit` - nincs ÚJ hiba az agenda.ts-ben.

- [ ] **Step 6: Commit**

```bash
cd /c/node/metumatrix && git add web/src/data/agenda.ts && git commit -m "$(printf 'feat: kimeno level + Meet mezok az agenda adatmodellben\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01PjCUkS54hw3dp8HE4i6eYb')"
```

---

## Task 2: Google Calendar kliens (lib/gcal.ts)

**Files:**
- Create: `C:/node/metumatrix/web/src/lib/gcal.ts`

**Interfaces:**
- Consumes: env `GOOGLE_OAUTH_CLIENT_ID/_SECRET/_REFRESH_TOKEN`, `GOOGLE_CALENDAR_ID`.
- Produces:
  - `gcalConfigured(): boolean`
  - `createMeetEvent(o: { summary: string; startIso: string; endIso: string; timeZone?: string; description?: string; location?: string; attendees?: string[]; sendInvite?: boolean; tentative?: boolean }): Promise<{ googleEventId: string; meetLink: string; htmlLink: string }>`
  - `updateMeetEvent(googleEventId: string, patch: { startIso?: string; endIso?: string; summary?: string; description?: string; tentative?: boolean }): Promise<{ googleEventId: string; meetLink: string }>`

- [ ] **Step 1:** Token-frissítés + config helper. `refreshAccessToken()` POST `https://oauth2.googleapis.com/token` (`grant_type=refresh_token`), 5 perces memória-cache. `gcalConfigured()` = mind a 4 env megvan.

- [ ] **Step 2:** `createMeetEvent`: POST `https://www.googleapis.com/calendar/v3/calendars/{calId}/events?conferenceDataVersion=1&sendUpdates={all|none}` törzs:

```ts
{
  summary, location, description,
  start: { dateTime: startIso, timeZone: timeZone ?? 'Europe/Budapest' },
  end:   { dateTime: endIso,   timeZone: timeZone ?? 'Europe/Budapest' },
  status: tentative ? 'tentative' : 'confirmed',
  attendees: (attendees ?? []).map((email) => ({ email })),
  conferenceData: { createRequest: { requestId: `metu-${startIso}`, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
}
```
A `sendUpdates` = `sendInvite ? 'all' : 'none'`. A válaszból: `id` → googleEventId, `hangoutLink` (vagy `conferenceData.entryPoints[].uri`) → meetLink, `htmlLink`.

- [ ] **Step 3:** `updateMeetEvent`: PATCH `.../events/{id}?conferenceDataVersion=1` a megadott mezőkkel (a `conferenceData`-t NEM írjuk felül, így a Meet-link marad).

- [ ] **Step 4 (verify):** Ha van token: egyszeri `node --experimental-strip-types` vagy egy ideiglenes `/api/meet` GET-hívás létrehoz egy teszteseményt a METU ESEMÉNYEK naptárban, a válaszban van `meetLink`; töröld kézzel a naptárból. Ha nincs token: `gcalConfigured()` false, a hívók stubot adnak. `npx tsc --noEmit` tiszta.

- [ ] **Step 5: Commit** (`feat: Google Calendar Meet kliens (fetch, fuggoseg nelkul)`)

---

## Task 3: Meet végpont (/api/meet)

**Files:**
- Create: `C:/node/metumatrix/web/src/app/api/meet/route.ts`

**Interfaces:**
- Consumes: `gcal.ts` (Task 2), `canWrite/writeDenied` a `@/lib/editauth`-ból.
- Produces: `POST /api/meet` body `{ action:'create'|'update', ... }` → `{ ok, googleEventId, meetLink }` vagy `{ ok:false, unconfigured:true }` ha nincs token.

- [ ] **Step 1:** `route.ts` (runtime nodejs, force-dynamic). `canWrite(req)` guard. `create` ág: kötelező `summary/startIso/endIso`, opcionális `attendees/description/location/sendInvite/tentative` → `createMeetEvent`. `update` ág: `googleEventId` + patch → `updateMeetEvent`. Ha `!gcalConfigured()`: 200 `{ ok:false, unconfigured:true }` (a kliens kezeli, nem hiba).

- [ ] **Step 2 (verify):** `curl` (a canWrite auth-fejléccel, lásd más route-ok mintáját) létrehoz egy eseményt, a válaszban `meetLink`. `npx tsc --noEmit` tiszta.

- [ ] **Step 3: Commit** (`feat: /api/meet vegpont Meet-esemeny letrehozashoz`)

---

## Task 4: Címzett-feloldás (lib/recipients.ts)

**Files:**
- Create: `C:/node/metumatrix/web/src/lib/recipients.ts`
- Kontextus: `people.json` szerkezete `{ teachers: Person[]; students: Person[] }`, Person `{ name, email, phone, title, field, status, cohort }`.

**Interfaces:**
- Produces:
  - `type Person = { name: string; email: string; title?: string; status?: string; cohort?: string; field?: string }`
  - `type People = { teachers: Person[]; students: Person[] }`
  - `PRESETS: { id: string; label: string; pick: (p: People) => Person[] }[]`
  - `resolveNames(people: People, names: string[]): { resolved: LetterRecipient[]; unresolved: string[] }`
  - `resolvePreset(people: People, presetId: string): LetterRecipient[]`
  - `suggestSendMode(recipients: LetterRecipient[]): 'personal' | 'bcc'` (<= 6 és nem „hallgato" tömeg → personal; egyébként bcc)

- [ ] **Step 1:** NFC-normalizált, ékezet- és kis/nagybetű-érzéketlen név-egyezés. `resolveNames`: minden diktált névre a legjobb `teachers`+`students` találat (teljes vagy vezeteknev+keresztnev), email-lel; találat nélkül `unresolved`-be. `kind`: 'oktato'/'hallgato' a forrás tömb szerint.

- [ ] **Step 2:** `PRESETS` a névjegyzék-szűrőkre: „osszes-foallasu-oktato" (`teachers.filter(status==='főállású')`), „oktatok-mind", „oraadok" (`status==='óraadó'`), „ma1-hallgatok" (`students.filter(cohort tartalmaz 'MA' + evfolyam)`), „kepviselok"/„demonstratorok" (`title/status` alapján). A pontos szűrők a `people.json` valós mezőértékeiből igazolva.

- [ ] **Step 3 (verify):** ideiglenes `node` szkript beolvassa a `people.json`-t, meghív `resolveNames(['Kovács Ajda'])` és `resolvePreset('oraadok')` → a várt emailek jönnek, ismeretlen név `unresolved`-be kerül. `npx tsc --noEmit` tiszta.

- [ ] **Step 4: Commit** (`feat: cimzett-feloldas nevekbol es csoport-presetekbol`)

---

## Task 5: Sablon-illesztés (lib/topics.ts bővítés)

**Files:**
- Modify: `C:/node/metumatrix/web/src/lib/topics.ts`

**Interfaces:**
- Produces: `matchTemplates(query: string, n?: number): { id: string; label: string; group: string; sampleSubject: string; sampleBody: string }[]` - kulcsszó-egyezés a `label`+`group`-ra, a `subject/body` függvényeket egy semleges `TopicCtx`-szel hívva mintaszöveghez.

- [ ] **Step 1:** `matchTemplates`: pontozás a query szavaira (label, group, és a mintaszöveg tartalmazza-e), csökkenő sorrend, top `n` (alap 3). Semleges ctx: `{ title:'', when:'', place:'', due:'' }`.

- [ ] **Step 2 (verify):** `node` szkript: `matchTemplates('meghívó időpont', 3)` a meghívó/időpont sablonokat hozza elöl. `npx tsc --noEmit` tiszta.

- [ ] **Step 3: Commit** (`feat: sablon-illesztes kulcsszo alapjan a titkarnohoz`)

---

## Task 6: Compose végpont (/api/compose)

**Files:**
- Create: `C:/node/metumatrix/web/src/app/api/compose/route.ts` (a `rephrase/route.ts` mintájára; a `loadExamples`/`runClaude`/`isQuota` helpereket vagy közös `lib/composeShared.ts`-be emeld, vagy másold - a rephrase önállósága maradjon)

**Interfaces:**
- Consumes: helyi claude CLI, `STYLE_FILE`, `PELDABANK_FILE`.
- Produces: `POST /api/compose` body:

```ts
interface ComposeReq {
  instruction: string;                 // diktált szándék
  templates: { id: string; label: string; group: string; sampleSubject: string; sampleBody: string }[];
  recipients: { name: string; email: string; kind: string }[];
  sendMode: 'personal' | 'bcc';
  cardContext?: { title: string; lines: string[] }[]; // releváns feladatok/események rövidlistája
  meeting?: { slots: string[]; place: string | null; meetLink: string | null } | null;
  askAllowed?: boolean; question?: string | null; questionAnswer?: string | null;
}
```
válasz: `{ ok:true, subject, body, chosenTemplateId? }` vagy `{ ok:true, question }` (tisztázó kör) vagy `{ ok:false, quota|error }`.

- [ ] **Step 1:** Prompt-építés a rephrase mintájára, de KIMENŐ nézőpontból: „Áron KEZDEMÉNYEZ egy levelet". Szekciók: szándék (instruction, csak irány), címzettek + kind (a megszólítás ehhez igazodjon; bcc → semleges „Kedves Kollégák!"), az illeszkedő sablonok (`templates`, felépítés-minta), a kártya-kontextus (helyes határidők/helyszínek), a meeting (ha van: a 3 időpont és a Meet-link SZÓ SZERINT kerüljön a levélbe), a stílusfájl + példabank. Ugyanaz a NYELV/ZÁRÁS/nincs-emdash/ne-találj-ki-tényt szabályblokk. A `sendMode==='personal'` esetén a törzs `{keresztnev}` helyőrzőt hagyjon a megszólításban (a küldő-script tölti); `bcc` esetén fix közös megszólítás.

- [ ] **Step 2:** Kétfázisú tisztázó kérdés (mint a rephrase: `askAllowed && !question` → a modell egy `{"question":...}`-t adhat). Válasz-JSON: `{"subject","body","chosenTemplateId"}`. Az emdash-tisztítás (`replace(/\s*—\s*/g, ...)`) a rephrase-ből átveendő.

- [ ] **Step 3 (verify):** `curl` egy diktált szándékkal + 2 sablonnal + 1 címzettel → kész magyar levél JSON jön, benne a címzett keresztneve (personal) vagy közös megszólítás (bcc); meeting-adatnál a 3 időpont és a link a törzsben. `npx tsc --noEmit` tiszta.

- [ ] **Step 4: Commit** (`feat: /api/compose kimeno titkarno-megfogalmazo`)

---

## Task 7: Titkárnő wizard váz + belépés (LevelWizard)

**Files:**
- Create: `C:/node/metumatrix/web/src/components/LevelWizard.tsx`
- Modify: `C:/node/metumatrix/web/src/components/TopicsView.tsx` (🗣 Titkárnő gomb a fejlécbe, a wizard megnyitása)
- Opcionális: `C:/node/metumatrix/web/src/lib/useSpeech.ts` (a PostaView TTS-logikájának kiemelt, közös hookja; ha a kiemelés kockázatos, minimál duplikátum a LevelWizard-ban)

**Interfaces:**
- Consumes: `editHeaders()` (`@/lib/editkey`), a szülő `CurriculumApp` handlerei (Task 12-ben véglegesítve): `onCommitAgenda`, a `people`, `agenda`.
- Produces: `LevelWizard` komponens propokkal: `{ open, onClose, people, agenda, onCreateOutbound, onCreateEventWithMeet }`. Belső step-állapot: `'intent' | 'assemble' | 'final'`.

- [ ] **Step 1:** LevelWizard váz: mód-választó (🔊 Hang / ✍ Írás, localStorage-emlékezés a PostaView mintájára), step-state, TTS-hook. `intent` lépés: textarea a diktált szándéknak (Hang módban rövid hangos prompt).

- [ ] **Step 2:** TopicsView fejléc: `🗣 Titkárnő` gomb, ami megnyitja a LevelWizard-ot (a Sablontár/Mentett levelek fülek mellett; a meglévő szerkesztő-folyam érintetlen marad).

- [ ] **Step 3 (verify):** dev appban (3939) a Levelek nézetben a gomb megnyitja a wizardot, a mód-választó és az 1. lépés megjelenik, a szándék beírható/diktálható. `npx tsc --noEmit` tiszta.

- [ ] **Step 4: Commit** (`feat: Levelek titkarno wizard vaz + belepes`)

---

## Task 8: Címzett-panel + küldésmód (assemble lépés, 1. rész)

**Files:**
- Modify: `C:/node/metumatrix/web/src/components/LevelWizard.tsx`

**Interfaces:**
- Consumes: `resolveNames`, `resolvePreset`, `PRESETS`, `suggestSendMode` (Task 4), `people` prop.

- [ ] **Step 1:** `assemble` lépés címzett-blokk: diktált nevek mezője (vesszővel/soronként) + preset-gombok (`PRESETS`). Feloldás `resolveNames`/`resolvePreset`-tel; a feloldott lista chip-ekként, az `unresolved` nevek pirossal jelezve („nincs a névjegyzékben, kihagyva").

- [ ] **Step 2:** Küldésmód: `suggestSendMode` javaslata előre kiválasztva, két kapcsoló (Személyre szabott / Közös BCC), felülírható. Nagy körnél (>6) figyelmeztetés személyre szabottnál.

- [ ] **Step 3 (verify):** nevek/preset feloldódnak chip-ekre, ismeretlen név jelzett, a küldésmód váltható. `npx tsc --noEmit` tiszta.

- [ ] **Step 4: Commit** (`feat: cimzett-panel es kuldesmod a wizardban`)

---

## Task 9: Sablon-jelöltek (assemble lépés, 2. rész)

**Files:**
- Modify: `C:/node/metumatrix/web/src/components/LevelWizard.tsx`

**Interfaces:**
- Consumes: `matchTemplates` (Task 5).

- [ ] **Step 1:** A diktált szándékból `matchTemplates(intent, 3)` → 2-3 jelölt, a legjobb kiválasztva, a másik kettő váltható. A kiválasztott sablon id-je és mintaszövege a compose-hoz továbbadva.

- [ ] **Step 2 (verify):** a szándék beírása után megjelenik 2-3 releváns sablon, váltható. `npx tsc --noEmit` tiszta.

- [ ] **Step 3: Commit** (`feat: sablon-jeloltek a wizardban`)

---

## Task 10: Időpont-szervező al-folyam + előzetes esemény + Meet

**Files:**
- Modify: `C:/node/metumatrix/web/src/components/LevelWizard.tsx`
- Consumes: `POST /api/meet` (Task 3), a szülő `onCreateEventWithMeet` handler (Task 12).

**Interfaces:**
- Produces (a szülő felé): `onCreateEventWithMeet(o: { title: string; slots: { day: string; time: string; endTime: string }[]; place: string | null; attendees: string[]; sendInvite: boolean }): Promise<{ eventId: string; meetLink: string | null }>`

- [ ] **Step 1:** „Időpontot szervezek" kapcsoló az assemble lépésen. Bekapcsolva strukturált űrlap: hány javaslat (1-3), mindegyikhez nap (ÉÉÉÉ-HH-NN) + kezdő/záró óra, közös helyszín. Google-meghívó kapcsoló (`sendGoogleInvite`, alap ki).

- [ ] **Step 2:** „Előzetes esemény létrehozása" gomb → `onCreateEventWithMeet` (az ELSŐ javaslat idejére, `tentative`, a feloldott címzettek `attendees`-ként). A visszakapott `meetLink` a wizard state-be, és a compose `meeting`-jébe (a 3 slot + a link + a hely).

- [ ] **Step 3:** Ha `!gcalConfigured` (a /api/meet `unconfigured:true`-t ad): a wizard jelzi („Meet-link a Google-beállítás után lesz"), a folyamat link nélkül megy tovább, az esemény akkor is létrejön az app agendájában.

- [ ] **Step 4 (verify):** kitöltött 3 slot + hely → az esemény létrejön a METU ESEMÉNYEK naptárban (ha token van) és az app naptárában, a Meet-link megjelenik a wizardban. `npx tsc --noEmit` tiszta.

- [ ] **Step 5: Commit** (`feat: idopont-szervezo al-folyam elozetes esemennyel es Meet-linkkel`)

---

## Task 11: Végleges levél (final lépés) + szerkesztés + szinkron-kijelzés

**Files:**
- Modify: `C:/node/metumatrix/web/src/components/LevelWizard.tsx`
- Consumes: `POST /api/compose` (Task 6).

- [ ] **Step 1:** A `final` lépésben `POST /api/compose` a szándékkal, a kiválasztott sablonnal, címzettekkel, sendMode-dal, cardContext-tel (Task 17 adja; addig üres tömb), meeting-gel. Tisztázó kérdés kezelése (mint a PostaView: kérdés megjelenítése/felolvasása, válasz, majd 2. kör). Kvóta/hiba kezelése (a rephrase mintájára: tartalék üzenet).

- [ ] **Step 2:** A kész levél szerkeszthető textarea-ban (tárgy + törzs). Mellette szinkron-összegzés: „Létrejött: <esemény> <időpont>, Meet-link", vagy „Nincs kártya (körlevél)".

- [ ] **Step 3 (verify):** a szándékból kész, szerkeszthető magyar levél jön, a meeting-adatok (időpontok, link) benne vannak. `npx tsc --noEmit` tiszta.

- [ ] **Step 4: Commit** (`feat: vegleges level a wizardban compose-zal es szerkesztessel`)

---

## Task 12: Kész -> Posta (kimenő Letter + kártya-kötés + commit)

**Files:**
- Modify: `C:/node/metumatrix/web/src/components/CurriculumApp.tsx` (handlerek: `onCreateOutbound`, `onCreateEventWithMeet`, letters upsert, esemény/feladat commit)
- Modify: `C:/node/metumatrix/web/src/components/LevelWizard.tsx` („Kész, Postába" gomb)

**Interfaces:**
- Produces: `onCreateOutbound(letter: Letter): void` (a `letters[]`-be upsert `dir:'out'`, `status:'outbox'` + `recipients/sendMode/meetLink/templateId/sendGoogleInvite`); `onCreateEventWithMeet` (Task 10) az `events[]`-be tesz egy `AgendaEvent`-et (`day/sort/when/place/people/googleEventId/meetLink/mstatus:'tentative'`), és ha van szervező feladat, `dueDate`-tel köti.

- [ ] **Step 1:** `CurriculumApp`-ban `onCreateOutbound` és `onCreateEventWithMeet` bekötése a meglévő `commitAgenda` úton (rev-védelemmel). A kimenő Letter `targetType/targetId` = az esemény (ha időpont-szervezés) vagy `null` (körlevél).

- [ ] **Step 2:** LevelWizard „✅ Kész, Postába" gomb: összeállítja a `Letter`-t (subject/body/recipients/sendMode/meetLink/templateId) és hívja `onCreateOutbound`-ot, majd bezárul. Toast: „A levél a Posta küldés-előtti listájába került."

- [ ] **Step 3 (verify):** a wizard lezárása után a `media-design-agenda.json` `letters[]`-ében megjelenik a `dir:'out'`, `status:'outbox'` levél; időpont-szervezésnél az `events[]`-ben a tentative esemény a Meet-linkkel. `npx tsc --noEmit` tiszta.

- [ ] **Step 4: Commit** (`feat: kimeno level es elozetes esemeny commitolasa az agendaba`)

---

## Task 13: Posta „Kimenő" alszekció

**Files:**
- Modify: `C:/node/metumatrix/web/src/components/PostaView.tsx`

**Interfaces:**
- Consumes: `agenda.letters` (a `dir:'out'` + `status:'outbox'` levelek).

- [ ] **Step 1:** A „küldés előtti" (drafted) rész alá egy 📤 Kimenő alszekció, ami a `letters.filter(l => l.dir==='out' && l.status==='outbox')` sorokat rendereli: tárgy, címzett-összegzés („5 oktató, BCC" / „Kovács Ajda"), Meet-link (ha van), és az akció-gombok: ⧉ Másolás, ✉ Outlookba (piszkozat), ✉ Küldés most, ⏰ Ütemezve, ✓ Elküldtem (→ `status:'sent'`).

- [ ] **Step 2:** A gombok a meglévő `/api/outlook-drafts` hívásokat használják a Task 16 kimenő-paraméterével (levél-id). „Elküldtem" → a levél `status:'sent'`.

- [ ] **Step 3 (verify):** a Task 12-ben létrehozott kimenő levél megjelenik a Posta Kimenő alszekciójában a helyes címzett-összegzéssel és a Meet-linkkel. `npx tsc --noEmit` tiszta.

- [ ] **Step 4: Commit** (`feat: Posta Kimeno alszekcio a kimeno levelekhez`)

---

## Task 14: 📹 Meet gomb + Meet-link megjelenítés mindenhol

**Files:**
- Modify: `PostaView.tsx`, és az esemény/feladat kártyát renderelő komponens(ek) (a CurriculumApp / a naptár- és feladat-nézet; a pontos fájl a rendereléskor azonosítandó).

**Interfaces:**
- Consumes: `POST /api/meet` (create), a Task 12 esemény/feladat-commit útja a `meetLink` visszaírásához.

- [ ] **Step 1:** `📹 Meet` gomb bármely eseményen/feladaton/Posta-kártyán, amin nincs még `meetLink`: bekéri az időpontot (ha esemény, a meglévő `day`/időből), hív `/api/meet`-et, a visszakapott linket a tétel `meetLink` mezőjébe írja (commit).

- [ ] **Step 2:** Ahol van `meetLink`, ott „📹 Belépés" link + „⧉ Link" másoló gomb (esemény-kártya, feladat-kártya, Posta-kártya).

- [ ] **Step 3 (verify):** egy meglévő eseményen a 📹 Meet gomb linket készít, ami megjelenik és másolható; a link a naptárban is látszik. `npx tsc --noEmit` tiszta.

- [ ] **Step 4: Commit** (`feat: on-demand Meet gomb es link-megjelenites eseményen/feladaton/postan`)

---

## Task 15: Küldő-script kimenő ág (create-outlook-drafts.ps1)

**Files:**
- Modify: `C:/node/metu_tanterv/automation/create-outlook-drafts.ps1`

**Interfaces:**
- Consumes: az agenda `letters[]` `dir:'out'` + `status:'outbox'` bejegyzései (recipients, sendMode, subject, body, scheduledFor).
- Produces: `-OutboundId <letterId>` és `-OutboundAll` kapcsolók; kimenő piszkozat/küldés.

- [ ] **Step 1:** Új plan-builder a kimenő levelekhez: az agendából (`Invoke-RestMethod "$api/agenda"`) a `letters` közül `dir=='out' && status=='outbox'`; soronként `id, subject, body, recipients[], sendMode, scheduledFor`.

- [ ] **Step 2:** `Build-OutItem`: NINCS Beérkezett-keresés, NINCS `Re:` előtag. `$ol.CreateItem(0)` új MailItem. `personal` módban címzettenként külön MailItem (`To=recipient.email`), a `{keresztnev}` a recipient nevéből behelyettesítve a törzsbe és a megszólításba; `bcc` módban egy MailItem, `To` a saját cím, `BCC` = az összes recipient. Aláírás a meglévő `Body-Html` logikával (magyar auto-aláírás / EN beszúrás).

- [ ] **Step 3:** Piszkozat (`.Save()`) az `-OutboundAll`/alap ágon; `-OutboundId <id>` = adott levél; küldés (`.Send()`) az `-SendId`/`-SendAll` meglévő logikába illesztve a kimenő tervre is; `-Staggered` a kimenő `scheduledFor`-ra is fut (a mai napra szűrve, mint eddig).

- [ ] **Step 4 (verify):** `-DryRun`-szerű próbafuttatás egy teszt kimenő levélre: personal módban N piszkozat keletkezik a helyes címzettekkel és keresztnevekkel, bcc módban 1 piszkozat BCC-vel, friss (nem Re:) tárggyal. A COM csak nem-emelt dev-szerverből.

- [ ] **Step 5: Commit** (a metu_tanterv repóban) (`automation: kimeno level kuldo-ag (friss targy, personal/bcc szethbontas)`)

---

## Task 16: /api/outlook-drafts kimenő paraméter

**Files:**
- Modify: `C:/node/metumatrix/web/src/app/api/outlook-drafts/route.ts`

**Interfaces:**
- Produces: a POST body elfogad `outboundId?: string` és `outboundAll?: true` kapcsolót; whitelist-regex (`^[A-Za-z0-9_-]{1,40}$`) a letter-id-re; a scriptet `-OutboundId`/`-OutboundAll`-lal hívja.

- [ ] **Step 1:** A meglévő `sendId/sendAll/draftId` mintájára `outboundId`/`outboundAll` ág, ugyanazzal a `runPs` úttal és id-védelemmel. A stdout-parse `DRAFTS_MADE/SENT/SENT_ID` sorai maradnak.

- [ ] **Step 2 (verify):** a Posta Kimenő „Outlookba" gombja (Task 13) piszkozatot készít a helyes címzetteknek; a route JSON-t ad vissza. `npx tsc --noEmit` tiszta.

- [ ] **Step 3: Commit** (`feat: /api/outlook-drafts kimeno level celzo parameter`)

---

## Task 17: Kontextus-rövidlista a compose-hoz

**Files:**
- Modify: `C:/node/metumatrix/web/src/components/LevelWizard.tsx` (kliens-oldali szűrés) vagy `CurriculumApp.tsx`

**Interfaces:**
- Produces: `relevantContext(agenda, intent, recipients): { title: string; lines: string[] }[]` - kulcsszó + résztvevő-egyezés + frissesség alapján a legfeljebb 3 leginkább releváns feladat/esemény, a compose `cardContext`-jébe.

- [ ] **Step 1:** Egyszerű pontozó: a szándék szavaira egyezés a feladat/esemény `title/summary/note`-ban, +súly ha a címzett szerepel a `people`-ben, +frissesség. Top 3, a `lines` a helyes határidőt/helyszínt/időpontot tartalmazza (a strukturált mezőkből: `dueDate`, `day`, `place`).

- [ ] **Step 2 (verify):** egy „raktárszoftver" szándéknál a t1 kártya a rövidlistán van a helyes adatokkal; a compose ezekből meríti a határidőt. `npx tsc --noEmit` tiszta.

- [ ] **Step 3: Commit** (`feat: relevans feladat/esemeny rovidlista a compose kontextushoz`)

---

## Task 18: Időpont-véglegesítés + Meet/dátum propagáció

**Files:**
- Modify: `PostaView.tsx` (a beérkező válaszból véglegesítés), `CurriculumApp.tsx` (esemény-frissítés), `/api/meet` (update)

**Interfaces:**
- Consumes: `updateMeetEvent` (Task 2/3), a tentative esemény `googleEventId`-je.

- [ ] **Step 1:** Ha egy időpont-szervező eseményhez válasz érkezik (a Posta-kártyán), egy „✔ Időpont véglegesítése" akció a 3 javaslatból választ: az `AgendaEvent` `day`/`sort`/`when` a választott slotra, `mstatus:'confirmed'`, és `POST /api/meet` `update` a Google-eseményt is átállítja (a Meet-link marad).

- [ ] **Step 2:** A `meetLink` propagáció: a véglegesített esemény linkje a kötött szervező feladatra és a hozzá tartozó `Letter`-re is átíródik, ha még nincs.

- [ ] **Step 3 (verify):** egy tentative eseményen a véglegesítés átállítja a naptári időpontot (app + Google), a Meet-link változatlan; a feladat `dueDate`-je a végleges időpontra frissül. `npx tsc --noEmit` tiszta.

- [ ] **Step 4: Commit** (`feat: idopont-veglegesites es Meet/datum propagacio`)

---

## Self-Review (spec-lefedettség)

- Titkárnő diktálás->levél: Task 6, 7, 9, 11. Hang/Írás mód: Task 7.
- Sablon-találat: Task 5, 9. Áron stílusa: Task 6 (stílusfájl+példabank).
- Címzettek (nevek + preset, egy forrás, personal/bcc): Task 4, 8.
- Google Meet (direkt API, METU ESEMÉNYEK, link mindenhol, on-demand): Task 0, 2, 3, 10, 14, 18.
- Előzetes esemény + véglegesítés: Task 10, 18.
- Kártya csak valódi folyamatnál / körlevél önálló: Task 12 (targetType null vagy esemény).
- Posta-integráció (Kimenő) + küldés (friss tárgy, personal/bcc): Task 13, 15, 16.
- Szinkron (kontextus be, dátum ki, Meet ki): Task 17, 18, 12, 14.

Nyitott függőség: Task 0 (Google OAuth) manuális felhasználói lépést igényel; a Meet-függő taskok (10, 14, 18 Google-ága) addig stubbal futnak.
