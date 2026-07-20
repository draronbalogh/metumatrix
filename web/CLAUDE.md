# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`metumatrix/web` is the **METU Média Design "tanulmányi mátrix"** — a single-page Next.js app that renders the Média Design curriculum (BA + MA, multiple year-versions) as an **interactive, editable, savable node-matrix** (ReactFlow) plus a card **catalog** view. It is meant to be presented to and edited by faculty. UI and domain language are **Hungarian**.

The parent folder `C:\node\metumatrix` is the git repo; it also holds the raw source data (`metu_md_map015.xml` draw.io map, `excel/`, `pdf/`) and a separate, older data-only `CLAUDE.md`. **All application code lives under `web/`.**

**Stack**: Next.js 15.3.5 (App Router), React 19, TypeScript 5 (strict), ReactFlow 11, plain CSS (no Tailwind). `dagre` is a dependency but currently unused.

## Commands

```bash
npm run dev      # next dev on http://localhost:3939  (note the non-default port)
npm run build    # production build
npm run start    # serve a production build
npx tsc --noEmit # typecheck — the ONLY automated check; run before trusting a build
```

There is **no test suite and no ESLint config** (no `lint` script). Verify changes with `npx tsc --noEmit`. `@/*` maps to `./src/*`.

## Architecture

**Render path**: `src/app/page.tsx` dynamically imports `CurriculumApp` with **`ssr: false`** — required, ReactFlow touches `window`. Keep it dynamic.

- **`src/components/CurriculumApp.tsx`** — the orchestrator. Owns all state: `view` (map/catalog), `theme`, `preset`, `ver` (version), `prog` (BA/MA), filters (`q`, `spec`, `ctype`, `instr`), `editor`/`details`. **Every data mutation flows through `commit(next)`**, which sets state, mirrors to `localStorage`, and pushes onto the undo history (autosave to the file happens in a separate effect, see Persistence). Undo/redo via `histRef`/`futRef` and a window keydown handler (**Ctrl+Z** / **Ctrl+Shift+Z** / Ctrl+Y; ignored while typing in inputs). Renders masthead, toolbar, details drawer, and dispatches to `MapView` or `CatalogView`. The toolbar's instructor `<select>` (`allInstructors`) filters **both** views; the **⧉ Elrendezés innen…** `<select>` (`copyLayout`, map view only) reuses a layout from another version.

- **`src/data/curriculum.ts`** (~6700 lines) — **GENERATED data + the domain model.** Exports `DEFAULT_DATA: Curriculum`, the types (`Course`, `Cohort`, `Program`, `Institute`, `UserEdge`, `Curriculum`), and pure helpers used everywhere: `courseGroup`/`courseRank`/`groupClass`/`GROUP_LABEL`, `specClass`/`specShort`, `cohortTotals`, `semLabel`, `emptyCourse`, `VERSION_ORDER`, `PROGRAM_COLOR`. **Do not hand-edit the `DEFAULT_DATA` array for bulk changes — it is regenerated (see Data pipeline).** Editing the helper functions/types by hand is fine.

- **`src/lib/buildGraph.ts`** — pure `buildGraph(data, filter, handlers, view) → { nodes, edges }` for ReactFlow.
  - Semesters are **horizontal rows** (one Y per semester, stacked top→bottom). Courses within a row are ordered by `courseGroup` (0 közös → 1 Multimédia → 2 Játéktervezés → 3 külső elméleti/ELM) then `courseRank` (projekthét/MyBrand last inside the közös block).
  - **Node IDs are STABLE and index-based**: `c-${ci}-${xi}` (cohort index in the *full* data, course index), `sem-${ci}`, `prog-${prog}`. Saved `positions` and `userEdges` are keyed by these, so they survive version/program switches. Do not make IDs depend on filtered/sorted order.
  - **Build-on edges**: same base-name chains (`baseAndNum` strips *all* digits for the base and takes the *trailing* number, so `"3D labor … 1."` keys on the trailing `1`, not the `3`), sorted **by semester**, connecting consecutive numbers, `source` = earlier semester → `target` = later (always points downward). `instrList()` splits the comma-joined instructor string.
  - **Filter dimming**: when any filter is active, non-matching course nodes get `data.dim`; a build-on edge whose two endpoints aren't *both* matches gets the `edge-dim` class (faded). So when you filter by instructor, both the cards and the arrows dim wherever that instructor doesn't teach. (User edges are dimmed symmetrically in `MapView`.)
  - Exports layout constants (`COURSE_X0`, `STEP_X`, `GRID`) consumed by the align tool.

- **`src/components/MapView.tsx`** — ReactFlow wrapper (`ReactFlowProvider` + `Inner`). `nodeTypes = { program, semester, course }`. Key behaviors:
  - `onConnect` adds a `userEdge` styled identically to build-on edges (magenta, animated).
  - `onNodeDragStop` / `onSelectionDragStop` persist positions via `persist.savePositions`.
  - **⌗ Igazítás** snaps every course node to the nearest lattice column and its semester row **without touching the viewport** (no `fitView`).
  - **Shift** multi-select: `selectionKeyCode`/`multiSelectionKeyCode="Shift"` (Shift+drag = box, Shift+click = add); selected nodes move together.
  - `snapToGrid`, a single faint `Lines` `Background`, `MiniMap`, `Controls`, and a **collapsible legend** (ⓘ toggle) with the category color key. User edges also get `edge-dim` when a filter is active.
  - `Persist` interface (implemented in `CurriculumApp`): `addEdge` / `deleteEdge` / `moveNode` / `savePositions` / **`applyConnection`** / `resetPositions`. `applyConnection` commits a new edge **and** its snapped endpoint positions in a **single** `commit()` — doing them as two writes races on stale state and drops the edge.

- **`src/components/MapNodes.tsx`** — `ProgramNode`, `SemesterNode` (renders the per-semester instructor chips → `onInstructor` filter), `CourseNode` (card color via `groupClass`, four in/out `Handle`s, keywords/software/`tematika` PDF link). Interactive elements on nodes (edit button, PDF link) carry the ReactFlow **`nodrag`** class so clicking them doesn't drag the node.

- **`src/components/CatalogView.tsx`** + **`CourseCardStd.tsx`** — the card grid. Courses grouped by `courseGroup` under colored sub-headers (`GROUP_LABEL`), with per-semester instructor chips. Ordering and colors are kept **consistent with the map**.

- **`src/components/EditModal.tsx`** — course editor. `Draft = Record<keyof Course, string>`; `software`/`keywords` are comma-separated lists; includes a **"Besorolás / szín"** (`group`) manual color override.

- **`src/app/globals.css`** — the full design system: `:root` tokens, **4 font presets** (`html[data-preset=...]`: muszerfal/neue/tordeles/muterem), **dark theme** (`html[data-theme='dark']`), and the **category colors g0 green (közös) / g1 blue (Multimédia) / g2 purple (Játéktervezés) / g3 grey `#9096a0` (külső elméleti intézet, ELM)**. `.cn-card.dim` / `.react-flow__edge.edge-dim` fade non-matching graph elements under an active filter.

- **`src/app/layout.tsx`** — loads 5 `next/font/google` families exposed as CSS variables (`--font-…`), all with `subsets: ['latin','latin-ext']` for Hungarian accents. `<html lang="hu" data-preset="muszerfal">`.

## Data model

`Curriculum { title, cohorts[], positions?, userEdges? }`. `Cohort { version, program: 'BA'|'MA', semester, label, courses[] }`. `Course` fields include `type`, `name`, `specialization`, `courseType` (gyakorlat/előadás), `hours`, `credits`, `active`, `groups`, `instructors` (comma-joined), `institute` ('AMD'|'ELM'), `description`, `felelos`, `prerequisite`, `requirement`, `software[]`, `keywords[]`, `cel`, `pdfUrl`, and **`group`** (manual 0–3 color override). When `group == null`, `courseGroup` derives it: `institute === 'ELM'` → **3** (grey, external theory); else `specialization` → **1** Multimédia / **2** Játéktervezés; else **0** közös. `courseRank` sends MyBrand/Projekthét to the end of the közös block.

Versions (`VERSION_ORDER`): `'2026/2027'`, `'2025/2026'`, `'2024/2025'`, `'régi (korábbi)'`.

## Access control (read gate, 2026-07-17)

Two keys in `.env.local`: `EDIT_KEY` (editor) and `VIEW_KEY` (read-only guest). `lib/editauth.ts`:
- `canWrite` (POSTs): Tailscale header (`tailscale-user-login`, set by the serve proxy for tailnet devices) OR `x-edit-key` == `EDIT_KEY` OR `OPEN_EDIT=1`.
- `canRead` (ALL data GETs: curriculum/agenda/people/orarend/it/style/replylog): `canWrite` OR key == `VIEW_KEY`/`EDIT_KEY` (from `x-edit-key` header or `?net=` query - the param was renamed from `?ts=` on 2026-07-17 after the old editor link may have been seen at a meeting; the old param/key is dead). **There is deliberately NO localhost exception** (X-Forwarded-For is spoofable; Next sets it even for direct connections) - the Outlook bot and any maintenance script MUST send `x-edit-key` on GETs too, else 403 `{locked:true}`. `snapshots` GET and `docs` GET require editor. `auth`/`notify` GETs stay open (booleans only).
- Client: a bare public (Funnel) visit gets 403 on the first curriculum GET → `CurriculumApp` renders only an empty `.lockpane` (🔒, neutral tab title), no menus/names/data. The `?net=` param is forwarded on every fetch via `editHeaders()`.
- Tailscale: the ts.net hostname is Funnel-exposed (public) but data is key-gated; the user's own tailnet devices need no param at all.

## Persistence & editing

- **The JSON file is the source of truth**, not `localStorage`. `src/app/api/curriculum/route.ts` (GET/POST, `force-dynamic`) reads/writes `process.env.CURRICULUM_FILE || 'C:/node/metu_tanterv/grid/media-design-mintatanterv.json'` — a browser can't touch a fixed disk path, so this server route is the bridge. (Note the file lives in the *sibling* `metu_tanterv` repo, outside this app's git tree.)
  - **Load order** (`CurriculumApp` mount effect): (1) `GET /api/curriculum` → the file; (2) fallback `localStorage`; (3) built-in `DEFAULT_DATA`.
  - **Autosave**: any `data` change (debounced 1 s) POSTs the whole `Curriculum` back to the file. A `skipFileSave` ref suppresses the *first* write so an initial load doesn't immediately re-save. POST validates `Array.isArray(body.cohorts)` before writing.
- **Agenda API (`/api/agenda`) has extra protection** — the Outlook bot and open clients write the same file: the file carries a top-level `rev` counter; GET returns it, POST must echo it and 409s on mismatch (the client then item-level three-way-merges via `mergeAgendaDocs` and retries once; rev-less POSTs — restore paths, old scripts — are still accepted). A POST with `x-writer: bot` additionally passes a server guard: the bot cannot delete tasks/events, cannot touch `letters`/`topicLinks`, and cannot change the user-owned source state fields (`status/replied(At)/snoozeUntil/followUpAt/returned`) except two whitelisted transitions (any → `pending` reopen; `pending` → `replied`). GET serves the file through `normalizeAgenda`, so migrations + snooze/follow-up wake transitions run at every read boundary, server included.
- **Posta state machine** lives on `AgendaSource.status` (`pending/snoozed/waiting/drafted/replied/noreply`; `drafted` = a Titkárnő-written reply saved but NOT sent - it lives in a highlighted "📋 Másolható válaszok" fold at the bottom, from which the user copies it into Outlook and then closes it via ✓ Elküldtem. The bot never sets `drafted`; a new inbound reopens it to `pending` like any status); `isAwaiting()` in `data/agenda.ts` is the ONLY listing/count predicate (the legacy `replied` field migrated to `repliedAt`). Linked task+event pairs sharing the same sender are deduped in `normalizeAgenda`: the event copy becomes `source.shadow = true` (provenance only, no state, no Posta row) — the task is the single writer. Deadline math uses `dueTs()`/`duePrecise()` (slice-based, no `new Date(string)` — Safari).
- **Titkárnő mode (Posta)**: a SEPARATE-SCREEN wizard, one letter at a time. On entry a mode picker (🔊 Hang / ✍ Írás, last choice highlighted via `md-titkar-mode` localStorage; switchable mid-flow in the header). Steps per letter: **1/3 the letter** (sender/subject/gist/thread + free browser TTS `speechSynthesis` hu-HU; in voice mode reading auto-starts and its `onend` auto-advances - a `speakSeq` ref filters stale onend events fired by `cancel()`), **2/3 the raw decision** (plain textarea, auto-focused - the user dictates via system-wide Wispr Flow; no in-app mic), **3/3 the final letter**. "✍ Fogalmazd meg" POSTs `/api/rephrase` (local claude CLI, `CLAUDE_BIN`, stdin prompt, cwd=tmpdir, strict JSON, quota detection → 503 Hungarian message). The API is TWO-PHASE: with `askAllowed` the model may return `{question}` instead of a letter (one clarifying round, shown in a yellow `.po-wiz-q` band, read aloud in voice mode; skippable → letter written without it). The final letter is AUTO-SAVED as a draft `Letter` on the linked card (via `onSaveLetter`/`onDeleteLetter` props from CurriculumApp; regenerate replaces the previous saved copy) and lane rows show a "📝 kész válasz" badge. Every footer offers ✕ Nem kell válasz (hide/close), ↷ Kihagyás, 💤 snooze; 3/3 adds ✓ Kész, következő and ✓⏳ Válasz + követés - any decision advances to the next letter (voice mode starts reading it automatically). Draft boxes are indented with intent-colored left borders (`.po-draft--0/1/2`), the generated one is `.po-draft--gen` (red).
- **Posta extras**: `source.thread` is an append-only in/out timeline (app appends `out` entries on reply via `withOutEntry`; the server unions thread arrays on bot writes so entries can't be lost); `draftsStale()` drives the "elavult" badge (`lastInboundAt > repliesFor`); `draftMode: 'ping'` marks follow-up (not reply) drafts. The view has three working modes: lanes (default, one card = one lane, precedence Visszatért > Határidős > Válaszra vár > Rájuk várok), **Döntés-sor** (one-item-at-a-time forced triage) and **Sorban** (all drafts expanded). First-time senders get a one-tap **feladó-szabály** chooser stored in `PeopleDB.senderRules` (email → reply/fyi/ignore; the bot reads it; seeded 2026-07-17 with 9 automata/HR addresses). Draft copy/send choices are logged to `/api/replylog` for the bot's rule-distillation loop.
- **Urgent-card notifications**: `public/sw.js` (minimal service worker — Android needs `registration.showNotification`) + a bell toggle in the fixed header-button stack (`.notifbtn--head`, edit mode only). When enabled (`md-notif-v1` + granted browser permission), every agenda change/refresh diffs `priority === 'high' && status !== 'done'` tasks against the `md-notif-seen-v1` localStorage baseline and shows a browser notification for new ones only (baseline snapshot on enable — no notification storm). Requires a secure context (localhost or the Tailscale HTTPS link).
- **`localStorage` (`LS_KEY = 'mediadesign-2026-27-v9'`)** is now only a fallback/draft mirror. **Bump the `-vN` suffix whenever the `Course`/data shape changes** so a stale copy doesn't clobber new fields.
- **⧉ Elrendezés innen…** (`copyLayout`, map view) copies node positions + user edges from another version into the current one, matched by `program | semester | normalized-name` — for reusing a hand-tuned layout across year-versions. Undoable.
- "Mentés"/"Betöltés" export/import the whole `Curriculum` as JSON (export also POSTs to the file). "Alaphelyzet" clears `localStorage` → `DEFAULT_DATA` and is undoable.

## Letters, recipients & the outbound send pipeline (Levelek + Titkárnő-kimenő, 2026-07-19)

Two ways to write a letter; both land in one **outbound queue** and one COM sender.

- **Levelek view** (`view === 'topics'`, menu label "Levelek") = `TopicsView.tsx`: template library (`lib/topics.ts` `TOPIC_TEMPLATES`) + saved `letters[]`, hosting the embedded composer **`NotifyModal.tsx`** (the "postázó" — recipient picker, letter/topic-template generators from `lib/letters.ts`, reroll/paraphrase, copy buttons). Its **"✉ Küldésre a Postába"** button turns the composed letter into an outbound `Letter`.
- **Titkárnő-kimenő** = **`LevelWizard.tsx`** (🗣 Titkárnő button in the Levelek header): dictate intent → `matchTemplates` candidates → resolve recipients → optional Google Meet → **`/api/compose`** (local claude CLI, sibling of `/api/rephrase` but Áron *initiates* rather than replies) writes the final letter → "Kész, a Postába".
- **Recipients are name-based** (like tasks/events). **`RecipientPicker.tsx`** is the shared, postázó-style selector (quick group presets + custom `db.groups` + T/H/I/A/O/P kind/status rows + ad-hoc email). Teacher **names** come from the curriculum (`teacherNames`), contacts/emails from `people.json` via **`lib/people.ts`** (`PeopleDB`, `buildRoster`, `emailOf`, `teacherStatusNames`…); `lib/recipients.ts` resolves names → `{name,email,kind}`. Roster reconciled 2026-07-19 to the OSZTÓ TT 2026/27 (4 főállású + 13 óraadó); `rosterGroups.T` "Aktív (most tanít)" = főállású ∪ óraadó (status-based, NOT the raw curriculum list). `AgendaModals.tsx` `PeoplePicker` (participant selection on tasks/events) shares the "Senki" clear-all pattern.
- **Outbound `Letter`** (`data/agenda.ts`): `dir:'out'`, `status:'outbox'`, `recipients: LetterRecipient[]`, `sendMode:'personal'|'bcc'`, optional `meetLink`. Shows in **Posta → 📤 Kimenő** (`PostaView`), sendable like a reply draft: ✉ Outlookba (draft), ✉ Küldés most (send), ⏰ Ütemezve (dawn). A Meet creates a tentative `AgendaEvent` (`googleEventId`/`meetLink`/`mstatus:'tentative'`) via **`/api/meet`** (`lib/gcal.ts`, fetch-based Google Calendar v3 with `addGoogleMeetUrl`, no `googleapis` dep; env `GOOGLE_OAUTH_CLIENT_ID/_SECRET/_REFRESH_TOKEN` + `GOOGLE_CALENDAR_ID`; returns `{unconfigured:true}` gracefully without a token — the OAuth **is DONE** (2026-07-20): all 4 `GOOGLE_*` keys live in `.env.local`; on a new machine re-run `scripts/gcal-auth.mjs`).
- **Multi-slot Meet proposals** (2026-07-20): both letter composers propose **several** meeting times (a "+ Időpont" adds more, no fixed cap) sharing **one** Meet room (one link; the recipient picks a time, the link stays). Shared UI: **`MeetSlots.tsx`** (the repetitive nap+kezdés+vég slot rows + "+"/✕). Shared network: **`lib/meet.ts`** `createMeet()` — one `/api/meet` call (first filled slot = the tentative event's time, all slots listed in its description) + `slotLabel`. `lib/letters.ts` `MeetingPlan` carries `slots: MeetSlot[]` (not a single `date/time`); `meetingBlock` renders 1 slot inline, N slots as a "Javasolt időpontok:" bullet list. The **postázó** creates only the Google event (no local card — `NotifyModal` has no `onSaveEvent`); the **wizard** also saves the tentative `AgendaEvent`. `/api/compose` receives the meeting as `{slots: string[], place, meetLink}` (label strings), unchanged.
- **The COM sender** is `automation/create-outlook-drafts.ps1` **in the sibling `metu_tanterv` repo**, invoked by **`/api/outlook-drafts`** (POST `{sendId|draftId|sendAll|outboundId|outboundSendId|outboundAll}` → whitelisted id → `-…` switch → classic Outlook COM; reads the agenda via the API). Reply drafts use `ReplyAll()` (Outlook's own signature); outbound uses `Build-OutItem`. After a dawn **`-Staggered`** run it POSTs **`/api/mark-sent`** to set status immediately (reply→`replied`, outbound→`sent`) rather than waiting for the 07:00 bot sync.
- **HARD-WON Outlook-COM encoding fix — do NOT re-derive (verified on the actually-received Gmail):** a raw `<html><body>…$sig` outbound mail garbles Hungarian accents at the recipient. The signature's **base64 logos are blocked** by Gmail/Outlook in received mail, and **CID image attachments make Outlook mis-encode the multipart HTML part → mojibake (one `�` per accent).** `charset` meta, `PR_INTERNET_CPID=65001`, and HTML numeric entities ALL failed. **The working path (magyar):** insert Outlook's **own** signature via `$m.GetInspector` (native CID logos *and* correct encoding, exactly like a reply), put the body at the top of `<body>`, and **`$insp.Close(0)` the inspector before `.Send()`** (else Send throws "az érték a várt tartományon kívül esik"). English letters (no Hungarian accents) use the manual CID path. The whole outbound branch + this fix live uncommitted in `metu_tanterv`'s working copy alongside the user's own edits.

## Esemény-Feladat-Posta összhang (2026-07-20, spec: docs/superpowers/specs/2026-07-20-esemeny-feladat-posta-osszhang-design.md)

- **Kézi ⭐** a Legfontosabbak sávhoz: `AgendaTask.star ('on'|'off'|null) + starAt`; a rang-logika a `data/agenda.ts`-ben (`urgencyRank`, `baseUrgencyRank`, `nextStarFor`, `starOverride`). Az 'off' LEJÁR, ha `source.lastInboundAt > starAt` (új fejlemény). Kapcsoló: kártya-meta ⭐/☆, sáv-sor, drawer-gomb, TaskModal háromállású chip. Bot-írásnál a `star/starAt` mindig a lemezi érték (`guardStar` a `/api/agenda`-ban).
- **Online (Meet) helyszín-mód** a `PlaceQuickPick`-ben (`PLACE_ONLINE`); az EventModal-ban Meet-blokk (link + másolás) és „Javasolt időpontok" (`MeetSlots`) - mentéskor `AgendaEvent.meetSlots` + `mstatus:'tentative'`, kézi nap híján az első slot napja horgonyoz.
- **isNew-feloldás**: új (még nem mentett) feladat/esemény modáljából is él a ✉ Levél / + kapcsolt feladat út (a `commitAgenda` szinkron frissíti az `agendaRef`-et, a „ments, majd folytasd" minta újaknál is működik).
- **Feladatból esemény**: `addEventForTask` + `pendingTaskLink` ref - az esemény MENTÉSEKOR áll be a `task.eventId`; gomb a TaskModal-ban és a feladat-drawerben.
- **Függő slotok**: a naptár (`EventsCalendar`) a tentative+`meetSlots` esemény minden javasolt napját halvány `cal-bar.pending` csíkkal mutatja; a `SlotConfirm` (drawer + Posta válasz-szerkesztő) chip-választása a `confirmMeetSlot`-on át a választott napra állít, `mstatus:'confirmed'`, `meetSlots:null`, Google-patch.
- **⇪ Gmail-naptárba** (Események fejléc): `publishAllToGoogle` - MINDEN napra tett esemény (Outlook-tükrök is) egyirányú publikálása create (`noMeet:true`, sima bejegyzés) vagy update úton, id-visszaírással. Google→app olvasás továbbra SINCS. A tükör-frissítés megőrzi a `googleEventId`-t (spread `prev`), a tükör törlése/eltűnése a Gmail-példányt is törli.
- **Ikon-szabály**: online meeting jelzése SOHA nem 📍 (pin/„nyalóka") - `placeIcon()` a `data/agenda.ts`-ben: Online-ra 📹, fizikai helyre 📍.
- **Mobil FAB**: `.ag-fab` (+ gomb) a Feladatok/Események nézetben ≤720px-en; katalógus-keresésnél az üres félév-blokkok egészében rejtve.

## Data pipeline (external — important gotcha)

`src/data/curriculum.ts` is **generated by Python scripts that are NOT committed** (they live in the dev session scratchpad). For non-trivial content changes, regenerate rather than editing the giant `DEFAULT_DATA` literal. Sources and rules:

- **OSZTÓ TT xlsx** (`C:\node\metu_tanterv\oszto-tt\`) are the authoritative offering data for 2025/26 & 2026/27 (real instructors, létszám, csoport, the specialization column, and an `ELM` theory marker). They are organized by academic year × cohort-year block; semester = `2*(fileYear − cohortYear) + (ősz ? 1 : 2)` — **odd semesters come from the ősz file, even from the tavasz file**. There is no 2026/27 spring file, so 2026/27 even semesters are projected from the 2025/26 spring OSZTÓ.
- **Syllabus PDFs** (parsed with `pdftotext`) enrich each course by name match with `cel`, `software`, `keywords`, `description`, and are copied to `public/tematikak/<neptun-id>.pdf` (123 files) and linked via `Course.pdfUrl`.
- **`metu_md_map015.xml`** (draw.io) supplies the `'régi (korábbi)'` version.

## Domain notes

- **Institutes drive the grey group.** `AMD` = Animáció és Média Design Tanszék — **our own** department (studio courses *and* our own theory courses, which keep their track color). `ELM` = an **external** theory institute (art history, philosophy, aesthetics). **Only `institute === 'ELM'` → group 3 (grey).** Five of our own theory courses (*Média design szakelmélet, Új technológia pszichológiai vonatkozásai, A játéktervezés elmélete, Új média kritikai stúdiumok, Játékpszichológia*) are deliberately marked `AMD` so they are **not** greyed — if a regen re-flags them `ELM`, re-apply that override.
- **Specializations** exist from 2025/26 onward and start at semester 3: **Multimédia** (blue) and **Játéktervezés** (purple). Common non-theory courses are green; the Projekthét/MyBrand capstone closes the green block.

## Known gotchas

- Keep the `next/dynamic` `ssr: false` import of `MapView`/`CurriculumApp` — ReactFlow crashes under SSR.
- No lint/tests — `npx tsc --noEmit` is the gate before `npm run build`.
- Node IDs must stay stable and index-based; saved positions/edges depend on them.
- When enlarging ReactFlow handles with `transform: scale()`, **keep ReactFlow's centering `translate(-50%)`** (per side) or the handle shifts off its edge.
- Any clickable element rendered inside a node needs the `nodrag` class, otherwise the click starts a node drag.
- **Autosave overwrites the shared JSON file ~1 s after every edit.** The file is the live artifact faculty see; there is no confirm-before-save. Undo (Ctrl+Z) restores prior state, which then re-saves. Point `CURRICULUM_FILE` elsewhere if you need a scratch copy.
