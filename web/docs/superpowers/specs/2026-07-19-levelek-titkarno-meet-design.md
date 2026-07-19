# Levelek titkárnő + küldés + Google Meet (design)

Dátum: 2026-07-19
Állapot: jóváhagyott design, implementáció következik
App: `C:/node/metumatrix/web` (Next.js, dev port 3939)

## 1. Cél

A Levelek nézetben (belső név: `topics`) elérhető legyen ugyanaz a titkárnő-élmény, mint a Postában, csak itt a felhasználó KEZDEMÉNYEZI a levelet, sablonból indulva. A titkárnő diktált kulcsszavakból megérti a szándékot, sablont választ, a felhasználó stílusában végleges levelet ír, ránéz a feladatokra és eseményekre, majd a levél a Posta „küldés előtti" (kimenő) állapotába kerül, és onnan úgy küldhető, mint bármely Posta-levél. Időpont-szervezéskor a titkárnő strukturáltan bekéri az adatokat, előzetes naptári eseményt hoz létre Google Meet-linkkel, és a linket mindenhova beteszi.

## 2. Jóváhagyott döntések

1. Hatókör: az általános diktálás->levél folyam ÉS a strukturált időpont-szervező is egy tervben.
2. Horgony: kártya csak valódi folyamatnál (esemény vagy szervező feladat). Egyszerű körlevélnél önálló levél keletkezik, kártya nélkül, de a levél mindig ráolvas a feladatokra/eseményekre, és új dátum a naptárba kerül.
3. Címzettek: a titkárnő javasol személyre szabott (egyenként) vagy közös BCC küldést a címzettszám/típus alapján, a felhasználó felülírhatja. Bemenet: diktált nevek vagy csoport-preset.
4. Időpont-szervezés: előzetes „egyeztetés alatt" esemény jön létre azonnal (az első javaslat idejére), a Meet-link stabil, véglegesítés a válaszok után.
5. Google Meet: direkt Google Calendar API, egyszeri OAuth. A fiók és a naptár konfigurálható (env). Alapértelmezés: `balogh.aron@gmail.com`, a „METU ESEMÉNYEK" naptár. A `draronbalogh@gmail.com` később második konfigurált fiókként hozzáadható.

## 3. Architektúra: vékony kimenő réteg a Posta-motorra

A Posta titkárnő-motorja (rephrase-végpont, stílusfájl, példabank, drafted-állapot, Outlook COM küldő-script) újrahasznosul. Csak a kimenő (kezdeményezett) levélhez új rész épül: sablon-találat, címzett-feloldás, időpont-szervező al-folyam, Meet-integráció, és a küldés friss tárggyal / több címzettnek.

Elvi szabály: a levél SZÖVEGÉT a helyi claude írja; az ADATOT (naptári esemény, feladat, Meet-link) az app hozza létre determinisztikusan a bekért strukturált mezőkből. Így marad meg a rev-védelem és a mezők tulajdonjoga (field-ownership). Az LLM nem mutál adatot.

Elvetett alternatívák: külön önálló kimenő-küldő rendszer (két párhuzamos küldő-utat kellene karbantartani, és sértené az „ugyanúgy küldhető, mint a Postán" célt); minden kimenőt kártyává tenni (feleslegesen terhelné a feladatlistát a körlevelekkel).

## 4. A titkárnő-folyam a Levelekben

Belépés: `🗣 Titkárnő` gomb a Levelek fejlécében, a Posta mintájára. Hang mód / Írás mód választó, ugyanaz az ingyenes böngésző-TTS (`speechSynthesis`, hu-HU).

Lépések (kimenő változat):
1. Diktálás: a felhasználó kulcsszavakban elmondja, mit szeretne. Ez az indulás (a Posta 2/3 lépésének megfelelője, de itt kezdő lépés).
2. A titkárnő megérti, visszakérdez, összeállít:
   - Kiválaszt 2-3 illő sablont a sablontárból (`TOPIC_TEMPLATES`), a legjobbat előtérbe teszi, a másik kettő egy koppintással váltható.
   - Feloldja a címzetteket (lásd 5.).
   - Ha időpont-szervezés: a strukturált al-folyam (lásd 6.).
   - Javasolja a küldésmódot (személyre szabott / közös BCC), felülírható.
   - Egy tisztázó kérdést feltehet (kétfázisú, mint a `/api/rephrase`), hang módban felolvassa.
3. Végleges levél: a helyi claude megírja a felhasználó stílusában (stílusfájl + példabank + a kiválasztott sablon váza + a releváns feladat/esemény-kontextus + a konkrét időpontok + a Meet-link). Helyben szerkeszthető. Mellette látszik a szinkron: milyen esemény/feladat keletkezett vagy frissült.
4. Kész -> Posta: a levél a Posta „küldés előtti" (kimenő) listájába kerül `outbox` állapotban, és onnan úgy küldhető, mint bármely Posta-levél: Outlookba (piszkozat), Küldés most, vagy Ütemezve hajnalra.

## 5. Címzettek

- Bemenet kétféle: diktált nevek (a Névjegyzékből, `people.json`, feloldva emailre, NFC-normalizált fuzzy egyezés a `name` kanonikus mezőre), vagy csoport-preset a névjegyzék-szűrőkre építve (pl. „összes főállású oktató", „óraadók", „MA1 aktív hallgatók", „képviselők", „demonstrátorok").
- Egy forrás elve: tanárnevek CSAK a tantervből (aktuális verzió) + Névjegyzék; más szak (Animáció) oktatói kizárva. Ha egy diktált név nincs a listában vagy más szakos, a titkárnő jelzi és kihagyja.
- Küldésmód-javaslat: kevés/személyes ügy -> személyre szabott egyenként `{keresztnév}` behelyettesítéssel; nagy kör -> közös BCC semleges megszólítással („Kedves Kollégák!"). A felhasználó felülírhatja.
- Reprezentáció: egy mester-`Letter` készül `recipients[]` + `sendMode` mezőkkel; a küldéskor bomlik szét címzettenként (personal módban N piszkozat/küldés, bcc módban egy levél). Az agenda tiszta marad.
- A címzett-feloldás determinisztikus app-kód, nem LLM.

## 6. Google Meet / naptár integráció

- Direkt Google Calendar API, OAuth2 refresh token a `web/.env.local`-ban. Konfigurálható env: a Google-fiók és a `GOOGLE_CALENDAR_ID` (alap: a METU ESEMÉNYEK naptár id-je). Egy szerver-oldali modul (pl. `src/lib/gcal.ts` + `src/app/api/meet/route.ts`) kezeli a token-frissítést és a `events.insert` hívást `conferenceDataVersion=1` + `addGoogleMeetUrl`-lel.
- Időpont-szervezéskor a titkárnő strukturáltan bekéri: hány javaslat, melyik nap/óra, meddig tart, hol. Az app létrehozza az előzetes „egyeztetés alatt" (`status:'tentative'`) eseményt Meet-linkkel az első javaslat idejére, a résztvevőket vendégként (`attendees`) felteszi.
- A Meet-link stabil átütemezéskor is, ezért a 3-javaslatos eset működik: a linket kiküldöd, a válaszok után csak az időpont véglegesül (`day`/`sort`/`when` + esemény `status:'confirmed'`, `update_event`), a link marad.
- A link mindenhová bekerül: esemény-kártya, (szervező) feladat-kártya, a levél szövege, Posta-kártya. Ráadásul on-demand is: bármely meglévő eseményen/feladaton/Posta-kártyán egy `📹 Meet` gomb utólag is generál linket.
- Meghívó-küldés alapértéke: a Google NEM küld külön naptár-meghívót (`notificationLevel: NONE`), a link a felhasználó Outlook-levelével megy (nincs dupla email). Kapcsolóval (`sendGoogleInvite`) bekapcsolható, hogy a Google is küldjön valódi `.ics` meghívót.
- Belépés: sima (nem Workspace) Gmail-fiók, ezért a metropolitan.hu (M365) címzettek külsősként lépnek be, és a host engedi be őket. A link mindenkinek elérhető; a súrlódásmentes „kopogás nélküli" belépés csak Workspace-fiókkal lenne garantált. Ez elfogadott kompromisszum.

## 7. Adatmodell változások (`src/data/agenda.ts`)

- `Letter` kimenő mezők: `dir?: 'out'`, `recipients?: { name: string; email: string; kind: string }[]`, `sendMode?: 'personal' | 'bcc'`, `sendGoogleInvite?: boolean`, `status` bővül `'outbox'`-szal (a meglévő `'draft' | 'sent'` mellé), `scheduledFor?: string | null`, `templateId?: string`, `meetLink?: string`.
- `AgendaEvent`: `googleEventId?: string`, `meetLink?: string`, `status?: 'tentative' | 'confirmed'`.
- `AgendaTask` és `AgendaSource`: `meetLink?: string` (megjelenítéshez, a pervazív követelmény miatt).
- Migráció: a `migrateSource`/`normalizeAgenda` visszafelé kompatibilis marad (az új mezők opcionálisak).

## 8. Posta-integráció + küldés

- A Posta „küldés előtti" listája egy 📤 Kimenő alszekcióval bővül, ami a `dir:'out'` + `status:'outbox'` leveleket mutatja (nem kell hozzá bejövő kártya). A meglévő reply-drafted sorok maradnak. A PostaView a `letters[]`-ből is épít sorokat a kimenő levelekhez, nem csak a kártyák `source`-ából.
- Küldő-script kiterjesztés (`automation/create-outlook-drafts.ps1`): kimenő ág. Nincs Beérkezett-keresés, nincs `Re:` előtag (friss tárgy). `personal` módban címzettenként egy piszkozat/küldés `{keresztnév}` behelyettesítéssel; `bcc` módban egy levél, címzettek BCC-ben, To a saját cím vagy üres. Aláírás a meglévő logikával. Piszkozat (`.Save()`) vagy Küldés most (`.Send()`) vagy Ütemezve hajnalra (`-Staggered`), mint eddig.
- Az `/api/outlook-drafts` route új paramétert kap a kimenő levél célzására (levél-id alapján, ugyanazzal a whitelist-regex védelemmel).

## 9. Szinkron szabályok

- Kontextus be: a levél megírásakor a titkárnő ránéz a releváns feladatokra/eseményekre (az app kulcsszó + frissesség alapján rövidlistát ad a compose-végpontnak), és a helyes határidőket/helyszíneket onnan veszi, nem talál ki.
- Dátum ki: ha új időpont keletkezik, az bekerül a naptárba (esemény `day`/`sort`/`when`, `dayEnd` ha többnapos; szervező feladat `dueDate`), nem csak a szövegbe.
- Meet ki: a létrejött Meet-link propagál eseményre, feladatra, levélbe és Posta-kártyára.
- Írás az agendába: a rev-védelem (optimista `rev` egyeztetés, 409 + háromutas merge) és a field-ownership tiszteletben marad. Az app-kliens írja (nem a bot writer-guard), így az esemény/feladat/letters mezők szabadon frissülnek.

## 10. Érintett fájlok

Új:
- `src/lib/gcal.ts` (Google Calendar token + esemény/Meet létrehozás, konfigurálható fiók/naptár)
- `src/app/api/meet/route.ts` (Meet-esemény létrehozás/frissítés végpont)
- `src/app/api/compose/route.ts` (kimenő titkárnő: sablon-találat + végleges levél; a `/api/rephrase` mintájára)
- `src/lib/recipients.ts` (név/csoport feloldás people.json-ból, preset-szűrők)
- új wizard komponens vagy a `PostaView` wizard kiemelt, közös változata

Módosítandó:
- `src/data/agenda.ts` (típusbővítések, migráció)
- `src/components/TopicsView.tsx` (🗣 Titkárnő gomb + wizard belépés)
- `src/components/NotifyModal.tsx` (Meet-link mező/megjelenítés, kimenő mentés)
- `src/components/PostaView.tsx` (📤 Kimenő alszekció, 📹 Meet gomb, Meet-link megjelenítés)
- `src/components/CurriculumApp.tsx` (state + handlerek bekötése, letters upsert, esemény/feladat commit)
- `src/app/api/agenda/route.ts` (ha kell, az új mezők field-ownership listája)
- `src/app/api/outlook-drafts/route.ts` (kimenő levél célzó paraméter)
- `automation/create-outlook-drafts.ps1` (kimenő küldő-ág)
- `lib/topics.ts` (a sablonok id/label/group elérhetővé tétele a compose-hoz, ha kell egy listázó)

## 11. Biztonság / megfontolások

- Google OAuth: a refresh token a `.env.local`-ban (gitignore-olt), soha nem kerül kliensre. A Meet-hívás csak szerver-oldali route-ból, `canWrite(req)` auth-fejléc mögött.
- Az Outlook COM küldés továbbra is csak nem-emelt dev-szerverből, a meglévő korlátokkal.
- A címzett-emailek a people.json-ból oldódnak fel, nem szabad szöveges bevitelből (kivéve, ha a felhasználó explicit beír egy külső címet).
- Minden fájlírás/olvasás UTF-8, ékezethelyesen.
- A szövegben (levél, UI, commit) tilos a hosszú gondolatjel; kötőjel/vessző/új mondat.

## 12. Hatókörön kívül (YAGNI)

- Nincs teljes kétirányú Google<->app naptár-szinkronizáció; csak a titkárnő által létrehozott/frissített események mennek a Google-be, és a Meet-link jön vissza.
- Nincs Workspace-migráció a súrlódásmentes belépéshez (elfogadott host-beengedés).
- Nincs Teams-integráció (a felhasználó Google Meet-et kért).
- Nincs több-fiókos párhuzamos küldés v1-ben; a második Google-fiók csak konfigurációs lehetőség.

## 13. Nyitott pontok / kockázat

- Google OAuth egyszeri beállítása (consent screen, scope: `calendar.events`) manuális lépést igényel a felhasználótól; a token megszerzése után az app önállóan frissít.
- A personal-mód szétbontása sok címzettnél sok Outlook-piszkozatot hoz létre; a titkárnő figyelmeztet nagy körnél, és BCC-t javasol.
- A compose-végpont token-költsége: a kontextust az app szűken adja át (rövidlista), a stílusfájl egyszer megy fel.
