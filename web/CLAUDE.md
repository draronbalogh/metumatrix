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

## Persistence & editing

- **The JSON file is the source of truth**, not `localStorage`. `src/app/api/curriculum/route.ts` (GET/POST, `force-dynamic`) reads/writes `process.env.CURRICULUM_FILE || 'C:/node/metu_tanterv/grid/media-design-mintatanterv.json'` — a browser can't touch a fixed disk path, so this server route is the bridge. (Note the file lives in the *sibling* `metu_tanterv` repo, outside this app's git tree.)
  - **Load order** (`CurriculumApp` mount effect): (1) `GET /api/curriculum` → the file; (2) fallback `localStorage`; (3) built-in `DEFAULT_DATA`.
  - **Autosave**: any `data` change (debounced 1 s) POSTs the whole `Curriculum` back to the file. A `skipFileSave` ref suppresses the *first* write so an initial load doesn't immediately re-save. POST validates `Array.isArray(body.cohorts)` before writing.
- **Agenda API (`/api/agenda`) has extra protection** — the Outlook bot and open clients write the same file: the file carries a top-level `rev` counter; GET returns it, POST must echo it and 409s on mismatch (the client then item-level three-way-merges via `mergeAgendaDocs` and retries once; rev-less POSTs — restore paths, old scripts — are still accepted). A POST with `x-writer: bot` additionally passes a server guard: the bot cannot delete tasks/events, cannot touch `letters`/`topicLinks`, and cannot change the user-owned source state fields (`status/replied(At)/snoozeUntil/followUpAt/returned`) except two whitelisted transitions (any → `pending` reopen; `pending` → `replied`). GET serves the file through `normalizeAgenda`, so migrations + snooze/follow-up wake transitions run at every read boundary, server included.
- **Posta state machine** lives on `AgendaSource.status` (`pending/snoozed/waiting/replied/noreply`); `isAwaiting()` in `data/agenda.ts` is the ONLY listing/count predicate (the legacy `replied` field migrated to `repliedAt`). Linked task+event pairs sharing the same sender are deduped in `normalizeAgenda`: the event copy becomes `source.shadow = true` (provenance only, no state, no Posta row) — the task is the single writer. Deadline math uses `dueTs()`/`duePrecise()` (slice-based, no `new Date(string)` — Safari).
- **`localStorage` (`LS_KEY = 'mediadesign-2026-27-v9'`)** is now only a fallback/draft mirror. **Bump the `-vN` suffix whenever the `Course`/data shape changes** so a stale copy doesn't clobber new fields.
- **⧉ Elrendezés innen…** (`copyLayout`, map view) copies node positions + user edges from another version into the current one, matched by `program | semester | normalized-name` — for reusing a hand-tuned layout across year-versions. Undoable.
- "Mentés"/"Betöltés" export/import the whole `Curriculum` as JSON (export also POSTs to the file). "Alaphelyzet" clears `localStorage` → `DEFAULT_DATA` and is undoable.

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
