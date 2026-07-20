# Esemény-Feladat-Posta összhang (0-7 pont) - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A spec (docs/superpowers/specs/2026-07-20-esemeny-feladat-posta-osszhang-design.md) 0-7 pontjának megvalósítása: kézi ⭐, Online helyszín + Meet az esemény-űrlapon, isNew-feloldás, feladatból esemény, függő Meet-slotok a naptárban, kapcsolt esemény láthatósága, mobil FAB.

**Architecture:** Minden a meglévő mintákra épül: agenda.ts adatmodell-bővítés (star/starAt, meetSlots), a számított urgencyRank köré kézi felülbírálat, a CurriculumApp handler-hub új callbackjei, a /api/agenda bot-védőrács bővítése. Nincs új route, nincs új külső függőség.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, sima CSS (globals.css).

## Global Constraints

- Repo: `C:\node\metumatrix` (git ág: `feature/levelek-titkarno-meet`), app: `web/` alkönyvtár.
- NINCS teszt-keretrendszer. Ellenőrzés minden tasknál: `cd C:\node\metumatrix\web && npx tsc --noEmit` és `npm run lint` zölden + futásidejű kattintás-teszt a http://localhost:3939 dev szerveren (Turbopack hot reload, a working copy fut).
- TILOS az `any` típus (unknown + szűkítés). TILOS a hosszú gondolatjel (—) minden szövegben (UI, komment, commit) - kötőjel/vessző.
- UI-szöveg magyarul. Piros (--hot) CSAK aktív/kiemelt elemre, szürke (--brand) a struktúrának.
- Minden fájl UTF-8.
- Commit taskonként, CSAK a task fájljait staged-elve (a repo working copyjában a user saját, nem kapcsolódó módosításai állnak: scripts/gcal-auth.mjs, api/agenda-sync, api/agenda, api/rephrase*, DocsView - ezeket NEM szabad commitolni, kivéve ahol a task explicit módosítja őket).
- Commit-üzenet végén: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` + `Claude-Session: https://claude.ai/code/session_01PjCUkS54hw3dp8HE4i6eYb`.
- A `grid/media-design-agenda.json` ÉLŐ adat - kézzel nem szerkesztjük; futásidejű teszt csak additív (új teszt-kártya felvehető és törölhető a UI-ból).

---

### Task 1: Adatmodell - star/starAt + meetSlots + rang-helperek (agenda.ts)

**Files:**
- Modify: `web/src/data/agenda.ts`

**Interfaces (Produces):**
- `type TaskStar = 'on' | 'off'`
- `AgendaTask.star?: TaskStar | null`, `AgendaTask.starAt?: string | null`
- `interface AgendaMeetSlot { day: string; start?: string | null; end?: string | null }`
- `AgendaEvent.meetSlots?: AgendaMeetSlot[] | null`
- `starOverride(t: AgendaTask): TaskStar | null`
- `dueMsOf(t: AgendaTask): number | null`
- `baseUrgencyRank(t: AgendaTask, soon: number): number`
- `urgencyRank(t: AgendaTask, soon: number): number`
- `nextStarFor(t: AgendaTask, soon: number): TaskStar | null`

- [ ] **Step 1: Típusok bővítése**

`AgendaTask` interfészbe (a `meetLink` sor után, agenda.ts:130 körül):

```ts
  star?: TaskStar | null;   // kézi ⭐ felülbírálat: 'on' = mindig a Legfontosabbak sávban, 'off' = soha; null/hiányzik = automatikus
  starAt?: string | null;   // a kézi állítás időbélyege (ISO) - az 'off' ez alapján jár le új bejövőnél
```

`AgendaEvent` interfészbe (az `extId` sor után):

```ts
  meetSlots?: AgendaMeetSlot[] | null; // függő Meet-időpontjavaslatok (csak mstatus:'tentative' mellett) - a naptár halványan mutatja őket
```

A fájl elejére (a TaskPriority blokk után):

```ts
// Kézi ⭐ felülbírálat a Legfontosabbak sávhoz
export type TaskStar = 'on' | 'off';
// Egy javasolt Meet-időpont (a lib/letters MeetSlot-tal mező-kompatibilis, de itt
// definiálva, hogy az adatmodell ne függjön a levél-libtől)
export interface AgendaMeetSlot { day: string; start?: string | null; end?: string | null }
```

- [ ] **Step 2: Rang-helperek** - az `isAwaiting` definíció (agenda.ts:289-290) UTÁN illeszd be:

```ts
// ---- Legfontosabbak sáv: számított rang + kézi ⭐ felülbírálat ----
// A kézi 'off' LEJÁR, ha a levétel óta új bejövő érkezett a szálban
// (lastInboundAt > starAt) - ilyenkor a számított kiemelés él újra.
export const starOverride = (t: AgendaTask): TaskStar | null => {
  if (!t.star) return null;
  if (t.star === 'off' && t.starAt && t.source?.lastInboundAt && t.source.lastInboundAt > t.starAt) return null;
  return t.star;
};
// pontos határidő ms-ben (ÉÉÉÉ-HH-NN), enélkül null
export const dueMsOf = (t: AgendaTask): number | null => {
  const d = t.dueDate;
  if (!d || d.length < 10) return null;
  const ms = new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10))).getTime();
  return Number.isNaN(ms) ? null : ms;
};
// a sáv KÉZI FELÜLBÍRÁLAT NÉLKÜLI rangja: kisebb = előrébb; 99 = nincs bent.
// Levél-ügyek elöl (új válasz kell / válaszra vár / kész válasz), majd közeli határidő, majd magas prioritás.
export const baseUrgencyRank = (t: AgendaTask, soon: number): number => {
  if (t.source?.returned) return 0;
  if (isAwaiting(t.source)) return 1;
  if (t.source?.status === 'drafted') return 2;
  const dm = dueMsOf(t);
  if (dm !== null && dm <= soon) return 3;
  if (t.priority === 'high') return 4;
  return 99;
};
// a hatályos rang: kézi 'on' → 0 (mindig bent, elöl), hatályos 'off' → 99 (soha), különben számított
export const urgencyRank = (t: AgendaTask, soon: number): number => {
  const s = starOverride(t);
  if (s === 'on') return 0;
  if (s === 'off') return 99;
  return baseUrgencyRank(t, soon);
};
// a ⭐ gomb következő tárolt értéke: ha az új kívánt állapot megegyezik a számítottal,
// null tárolódik (nincs felesleges felülbírálat, az automatika él tovább)
export const nextStarFor = (t: AgendaTask, soon: number): TaskStar | null => {
  const inBand = urgencyRank(t, soon) < 99;
  const baseIn = baseUrgencyRank(t, soon) < 99;
  if (inBand) return baseIn ? 'off' : null;
  return baseIn ? null : 'on';
};
```

- [ ] **Step 3: Ellenőrzés**

Run: `cd C:\node\metumatrix\web && npx tsc --noEmit`
Expected: 0 hiba.

- [ ] **Step 4: Commit**

```bash
cd C:\node\metumatrix && git add web/src/data/agenda.ts && git commit -m "feat(agenda): star/starAt + meetSlots mezok es rang-helperek (spec 1,5)"
```

---

### Task 2: Bot-védőrács a star mezőkre (api/agenda) + bot-prompt sor

**Files:**
- Modify: `web/src/app/api/agenda/route.ts`
- Modify (NEM commitolva): `C:\node\metu_tanterv\automation\outlook-agenda-prompt.md`

**Interfaces:**
- Consumes: Task 1 mezőnevek (`star`, `starAt`).
- Produces: bot-írásnál a feladatok `star`/`starAt` mezője mindig a lemezi érték.

- [ ] **Step 1: guardBotWrite bővítése** - a `guardBotWrite` függvényben (route.ts:57-76) a `guardList` alá vedd fel:

```ts
  // a kézi ⭐ (star/starAt) USER-tulajdon: bot-írásnál mindig a lemezi érték él tovább
  const guardStar = <T extends { id: string; star?: unknown; starAt?: unknown }>(incList: T[], diskList: T[]): T[] => {
    const diskById = new Map(diskList.map((x) => [x.id, x]));
    return incList.map((it) => {
      const dd = diskById.get(it.id);
      if (!dd) return it;
      const out = { ...it };
      if (dd.star !== undefined) out.star = dd.star; else delete out.star;
      if (dd.starAt !== undefined) out.starAt = dd.starAt; else delete out.starAt;
      return out;
    });
  };
```

és a return-ben a tasks sor legyen:

```ts
    tasks: guardStar(guardList(inc.tasks ?? [], disk.tasks ?? []), disk.tasks ?? []),
```

- [ ] **Step 2: bot-prompt** - `C:\node\metu_tanterv\automation\outlook-agenda-prompt.md`: keresd meg a mező-tulajdon szekciót (Grep: `scheduledFor`), és a felsoroláshoz fűzd hozzá ezt a sort (a fájlt NE commitold - a user saját, nem commitolt módosításai állnak benne):

```
- A feladat `star` és `starAt` mezője USER-tulajdon (kézi ⭐ a Legfontosabbak sávhoz): SOHA ne írd és ne töröld - az API védőrácsa úgyis visszaállítja.
```

- [ ] **Step 3: Ellenőrzés**

Run: `cd C:\node\metumatrix\web && npx tsc --noEmit && npm run lint`
Expected: 0 hiba.

Futásidejű guard-teszt (élő fájl, backup először!):

```bash
cp C:/node/metu_tanterv/grid/media-design-agenda.json C:/node/metu_tanterv/grid/media-design-agenda.backup-star-guard-test.json
```

Majd (EDIT_KEY a web/.env.local-ból): GET `http://localhost:3939/api/agenda` (x-edit-key fejléccel) → jegyezd fel a rev-et és az első feladat id-jét; POST ugyanaz a teljes dokumentum + az első feladaton `"star":"on"` + `x-writer: bot` fejléc; új GET: a feladaton NEM lehet `star` (a lemezen nem volt). Expected: a star eltűnt, csak a rev nőtt.

- [ ] **Step 4: Commit**

```bash
cd C:\node\metumatrix && git add web/src/app/api/agenda/route.ts && git commit -m "feat(api/agenda): bot-vedorac a star/starAt user-mezokre (spec 1)"
```

FIGYELEM: a route.ts-ben lehetnek a user korábbi, nem commitolt módosításai - `git diff web/src/app/api/agenda/route.ts`-sel ellenőrizd, hogy CSAK a guardStar-változás megy be; ha más is van benne, azt hagyd a working copyban (interaktív staging helyett: commitold az egész fájlt CSAK ha a diff kizárólag a tiéd; különben szólj a usernek).

---

### Task 3: ⭐ kapcsoló - kártya, sáv, drawer, TaskModal

**Files:**
- Modify: `web/src/components/AgendaView.tsx`
- Modify: `web/src/components/AgendaDrawer.tsx`
- Modify: `web/src/components/AgendaModals.tsx` (TaskModal)
- Modify: `web/src/components/CurriculumApp.tsx`
- Modify: `web/src/app/globals.css`

**Interfaces:**
- Consumes: Task 1 helperek.
- Produces: `setTaskStar(id: string, star: TaskStar | null)` handler a CurriculumApp-ban; `onSetStar` prop az AgendaView-n és AgendaDrawer-en.

- [ ] **Step 1: AgendaView** - a lokális `dueMsOf`/`urgencyRank` definíciókat (54-72. sor) TÖRÖLD, helyette import az agendából (a meglévő import-lista bővítése):

```ts
import {
  Agenda, AgendaTask, STATUS_LABEL, PRIORITY_LABEL, PRIORITY_ORDER, TASK_CATEGORIES,
  TaskPriority, TaskStar, taskHasPerson, eventHasPerson, taskSteps, stepsDone, fmtDueHu, fmtDayHu, isAwaiting,
  urgencyRank, nextStarFor,
} from '@/data/agenda';
```

A `DAY_MS` konstans MARAD (a `soon` számításhoz). Props bővítése:

```ts
  onSetStar: (id: string, star: TaskStar | null) => void; // kézi ⭐ a Legfontosabbak sávhoz
  onOpenEvent: (id: string) => void;                      // kapcsolt esemény részletezője (Task 7 is használja)
```

(propok destrukturálása a komponens-fejben is.)

A ⭐ sáv sorába (a `ag-toprow` div-ben, az `ag-check` gomb UTÁN):

```tsx
                  <button type="button" className="ag-star is-on" title="Kivétel a Legfontosabbak közül"
                    onClick={() => onSetStar(t.id, nextStarFor(t, soon))}>⭐</button>
```

A nyitott feladat-kártya meta-sorába (`agc-meta`, a 📅 span ELÉ):

```tsx
                  <button type="button" className={`ag-star m${urgencyRank(t, soon) < 99 ? ' is-on' : ''}`}
                    title={urgencyRank(t, soon) < 99 ? 'Kivétel a Legfontosabbak közül' : 'Kiemelés a Legfontosabbak közé'}
                    onClick={(e) => { e.stopPropagation(); onSetStar(t.id, nextStarFor(t, soon)); }}>{urgencyRank(t, soon) < 99 ? '⭐' : '☆'}</button>
```

- [ ] **Step 2: CurriculumApp** - a `cyclePriority` (623-627) után új handler:

```ts
  // kézi ⭐: 'on' = mindig a Legfontosabbak sávban, 'off' = soha, null = automatikus
  const setTaskStar = useCallback((id: string, star: TaskStar | null) => {
    if (!canEditRef.current) return;
    const cur = agendaRef.current;
    commitAgenda({ ...cur, tasks: cur.tasks.map((x) => (x.id === id ? { ...x, star, starAt: star ? new Date().toISOString() : null } : x)) });
  }, [commitAgenda]);
```

Import-bővítés a 16. sorban: `TaskStar` (és Task 6-hoz később `fmtEventWhen`, Task 9-hez `AgendaMeetSlot`). Az AgendaView renderhez (1528-1537): `onSetStar={setTaskStar}` és `onOpenEvent={(id) => setAgendaDetails({ kind: 'event', id })}`.

- [ ] **Step 3: AgendaDrawer** - Props + destrukturálás:

```ts
  onSetStar?: (id: string, star: TaskStar | null) => void; // kézi ⭐ a részletezőből
```

Import: `TaskStar, nextStarFor, urgencyRank` a '@/data/agenda'-ból. A `dr-actrow`-ban a „✎ Szerkesztés" gomb ELÉ (csak feladatnál, nem-kész feladatra):

```tsx
            {canEdit && task && task.status !== 'done' && onSetStar && (() => {
              const soon = Date.now() + 7 * 86400000;
              const inBand = urgencyRank(task, soon) < 99;
              return (
                <button className="btn" title={inBand ? 'Kivétel a Legfontosabbak sávból' : 'Kiemelés a Legfontosabbak sávba'}
                  onClick={() => onSetStar(task.id, nextStarFor(task, soon))}>{inBand ? '⭐ Legfontosabb' : '☆ Kiemelés'}</button>
              );
            })()}
```

CurriculumApp AgendaDrawer render (1730-1766): `onSetStar={setTaskStar}`.

- [ ] **Step 4: TaskModal** (AgendaModals.tsx) - a `d` state-be: `star: (task.star ?? '') as string,`. Az Alap fül Prioritás mezője UTÁN:

```tsx
            <div className="field full">
              <label>⭐ Legfontosabbak sáv - kézi felülbírálat</label>
              <ChipRadio value={d.star} onChange={(v) => set('star', v)}
                options={[{ v: '', label: 'Automatikus', cls: 'c-grey' }, { v: 'on', label: '⭐ Mindig bent' }, { v: 'off', label: 'Soha', cls: 'c-grey' }]} />
            </div>
```

A `save()`-ben az onSave hívás objektumába:

```ts
      star: (d.star || null) as TaskStar | null,
      starAt: (d.star || null) === (task.star ?? null) ? task.starAt ?? null : (d.star ? new Date().toISOString() : null),
```

Import-bővítés a 4. sorban: `TaskStar`.

- [ ] **Step 5: CSS** (globals.css) - a Feladatok szekcióba (659. sor környéke):

```css
/* kézi ⭐ kapcsoló a kártyán és a Legfontosabbak sávban */
.ag-star { border: 0; background: transparent; cursor: pointer; font-size: .95rem; line-height: 1; padding: 2px 4px; opacity: .5; }
.ag-star.is-on { opacity: 1; }
.ag-star:hover { opacity: 1; transform: scale(1.15); }
```

és a viewer-rejtő listába (1037. sor): `.viewer .ag-star,` felvétele.

- [ ] **Step 6: Ellenőrzés**

Run: `npx tsc --noEmit && npm run lint` - 0 hiba.
Böngésző (localhost:3939/?net=ts123, Feladatok): egy sávbeli kártyán ⭐ → kikerül; egy nem kiemelt kártyán ☆ → bekerül; drawerben a gomb vált; TaskModal-ban a háromállású chip menti az értéket (mentés után a sáv követi).

- [ ] **Step 7: Commit**

```bash
cd C:\node\metumatrix && git add web/src/components/AgendaView.tsx web/src/components/AgendaDrawer.tsx web/src/components/AgendaModals.tsx web/src/components/CurriculumApp.tsx web/src/app/globals.css && git commit -m "feat(feladatok): kezi csillag - kartyan, savban, drawerben, szerkesztoben (spec 1)"
```

---

### Task 4: Online (Meet) helyszín-mód + Meet-blokk az EventModal-ban

**Files:**
- Modify: `web/src/components/PlaceQuickPick.tsx`
- Modify: `web/src/components/AgendaModals.tsx` (EventModal)

**Interfaces:**
- Produces: `PLACE_ONLINE = 'Online (Google Meet)'` export; EventModal menti a `meetSlots`-ot és tentative-ra állít, ha van kitöltött javaslat.

- [ ] **Step 1: PlaceQuickPick** - mód-bővítés. A 22. sor mode-inicializálása és a gombsor cseréje:

```ts
  const [mode, setMode] = useState<'metu' | 'online' | 'kulso'>(() =>
    value?.startsWith('Online') ? 'online' : (!value || value.startsWith('METU') ? 'metu' : 'kulso'));
```

A fájl tetejére export:

```ts
export const PLACE_ONLINE = 'Online (Google Meet)';
```

A gombsor (43-45. sor) legyen:

```tsx
      <button type="button" className={`chip${mode === 'metu' ? ' is-on' : ''}`} onClick={() => setMode('metu')}>METU</button>
      <button type="button" className={`chip${mode === 'online' ? ' is-on' : ''}`}
        onClick={() => { setMode('online'); onPick(PLACE_ONLINE); }}>Online (Meet)</button>
      <button type="button" className={`chip${mode === 'kulso' ? ' is-on' : ''}`}
        onClick={() => { setMode('kulso'); if (value && (value.startsWith('METU') || value.startsWith('Online'))) onPick(''); }}>Külső helyszín</button>
```

- [ ] **Step 2: EventModal Meet-blokk + slotok.** Importok az AgendaModals.tsx tetején:

```ts
import MeetSlots from './MeetSlots';
import { MeetSlot } from '@/lib/letters';
```

(agenda-importba: `AgendaMeetSlot`.) Az EventModal state-jei közé:

```ts
  const [meetSlots, setMeetSlotsRaw] = useState<MeetSlot[]>(() =>
    (event.meetSlots ?? []).map((s) => ({ day: s.day, start: s.start ?? '', end: s.end ?? '' })));
  const [slotsOpen, setSlotsOpen] = useState(() => (event.meetSlots?.length ?? 0) > 0);
  const setMeetSlots = (s: MeetSlot[]) => { dirty.current = true; setMeetSlotsRaw(s); };
```

A `save()` átalakítása - a kitöltött slotok, és ha nincs kézi nap, az első slot napja horgonyoz:

```ts
  const save = () => {
    if (!d.title.trim()) return;
    dirty.current = false;
    const cleanSlots: AgendaMeetSlot[] = meetSlots.filter((s) => s.day).map((s) => ({ day: s.day, start: s.start || null, end: s.end || null }));
    const slotDay = cleanSlots.length ? cleanSlots[0].day : null;
    const outDay = effDay || slotDay || null;
    const outWhen = mode !== 'none' || !slotDay
      ? whenOut
      : `${fmtEventWhen(slotDay, null, slotDay.slice(0, 7), cleanSlots[0].start ?? null)} (egyeztetés alatt)`;
    onSave({
      ...event,
      title: d.title.trim(),
      when: outWhen,
      sort: outDay ? outDay.slice(0, 7) : (effMonth || null),
      day: outDay,
      dayEnd: effEnd,
      featured,
      note: d.note.trim() || null,
      place: d.place.trim() || null,
      owner: d.owner.trim() || null,
      people,
      meetSlots: cleanSlots.length ? cleanSlots : null,
      mstatus: cleanSlots.length ? 'tentative' : event.mstatus ?? null,
    });
  };
```

Az Alap fülön a PlaceQuickPick UTÁN két új mező:

```tsx
            <div className="field full">
              <label>Google Meet</label>
              {event.meetLink ? (
                <p className="ev-meetrow">
                  <a href={event.meetLink} target="_blank" rel="noopener noreferrer">📹 Belépés a meetre</a>
                  <button type="button" className="btn" onClick={() => { void navigator.clipboard?.writeText(event.meetLink as string); }}>⧉ Link másolása</button>
                  {event.mstatus === 'tentative' && <span> · egyeztetés alatt</span>}
                </p>
              ) : (
                <div className="se-empty">Mentéskor automatikusan készül Google-naptár-pár Meet-linkkel (napra tett eseménynél) - a link mentés után itt és a részletezőben látszik.</div>
              )}
            </div>
            <div className="field full">
              <button type="button" className="btn" onClick={() => setSlotsOpen((o) => !o)}>📹 Javasolt időpontok - több opció {slotsOpen ? '▴' : '▾'}</button>
              {slotsOpen && (<>
                <MeetSlots slots={meetSlots.length ? meetSlots : [{ day: '', start: '', end: '' }]} onSlots={setMeetSlots} />
                <div className="due-preview">A kitöltött javaslatok a naptárban halvány, „függő" csíkként jelennek meg. Véglegesítéskor (részletező vagy Posta) a választott lesz az esemény időpontja.</div>
              </>)}
            </div>
```

- [ ] **Step 3: Ellenőrzés**

`npx tsc --noEmit && npm run lint` - 0 hiba. Böngésző: Események → + Új esemény → helyszínnél „Online (Meet)" chip a szöveget beírja; a Javasolt időpontok blokk nyílik, 2 slot kitöltése után Mentés → a kártya „egyeztetés alatt", day = első slot napja.

- [ ] **Step 4: Commit**

```bash
cd C:\node\metumatrix && git add web/src/components/PlaceQuickPick.tsx web/src/components/AgendaModals.tsx && git commit -m "feat(esemeny): Online (Meet) helyszin-mod + Meet-blokk es idopontjavaslatok az urlapon (spec 2)"
```

---

### Task 5: isNew-feloldás - új kártyáról is kapcsolt feladat + levél

**Files:**
- Modify: `web/src/components/CurriculumApp.tsx:1797-1820`

**Interfaces:**
- Consumes: `commitAgenda` szinkron frissíti `agendaRef.current`-et (CurriculumApp.tsx:487), ezért a modálok „save(); onX()" mintája új kártyánál is működik.

- [ ] **Step 1:** A TaskModal rendernél (1797-1800) az isNew-ternary-k törlése:

```tsx
          onNotify={() => notifyTask(taskEdit.t.id)}
          onOpenLetter={openSavedLetter}
          onLetterStatus={setLetterStatus}
          onNotifyTopic={(tid) => notifyTask(taskEdit.t.id, tid)}
```

Az EventModal rendernél (1815-1820) ugyanígy:

```tsx
          onNotify={() => notifyEvent(eventEdit.e.id)}
          onOpenTask={(id) => { const t = agendaRef.current.tasks.find((x) => x.id === id); if (t) setTaskEdit({ t, isNew: false }); }}
          onAddTask={() => addTaskForEvent(eventEdit.e.id)}
          onOpenLetter={openSavedLetter}
          onLetterStatus={setLetterStatus}
          onNotifyTopic={(tid) => notifyEvent(eventEdit.e.id, tid)}
```

- [ ] **Step 2: Ellenőrzés**

`npx tsc --noEmit` - 0 hiba. Böngésző: + Új esemény → cím beírása → Feladatok fül: a „+ Új feladat ehhez az eseményhez" gomb LÁTSZIK; kattintásra az esemény mentődik és előtöltött feladat nyílik (eventId-vel). A ✉ Levél gomb új eseménynél is él. Ugyanez új feladatnál a ✉ Levél.

- [ ] **Step 3: Commit**

```bash
cd C:\node\metumatrix && git add web/src/components/CurriculumApp.tsx && git commit -m "feat(kartyak): uj (meg nem mentett) esemeny/feladat is nyithat kapcsolt feladatot es levelet (spec 3)"
```

---

### Task 6: Feladatból esemény - addEventForTask

**Files:**
- Modify: `web/src/components/CurriculumApp.tsx`
- Modify: `web/src/components/AgendaModals.tsx` (TaskModal)
- Modify: `web/src/components/AgendaDrawer.tsx`

**Interfaces:**
- Produces: `addEventForTask(taskId: string)` handler; `onAddEvent?: () => void` prop (TaskModal); `onAddEventFor?: (taskId: string) => void` prop (AgendaDrawer). Mentéskor a feladat `eventId`-je automatikusan az új eseményre áll (pendingTaskLink ref).

- [ ] **Step 1: CurriculumApp** - import-bővítés (16. sor): `fmtEventWhen`. Az `addTaskForEvent` (854-868) UTÁN:

```ts
  // Új esemény egy feladatból (a addTaskForEvent tükörképe): örökli a feladat adatait,
  // és az esemény MENTÉSEKOR a feladat eventId-je automatikusan rááll (pendingTaskLink).
  const pendingTaskLink = useRef<{ taskId: string; eventId: string } | null>(null);
  const addEventForTask = useCallback((taskId: string) => {
    if (!canEditRef.current) return;
    const t = agendaRef.current.tasks.find((x) => x.id === taskId);
    if (!t) return;
    const day = t.dueDate && t.dueDate.length >= 10 ? t.dueDate.slice(0, 10) : null;
    const e: AgendaEvent = {
      ...emptyEvent(),
      title: t.title,
      owner: t.owner ?? DEFAULT_OWNER,
      people: [...t.people],
      day,
      sort: t.dueDate ? t.dueDate.slice(0, 7) : null,
      when: fmtEventWhen(day, null, t.dueDate ? t.dueDate.slice(0, 7) : null, null),
    };
    pendingTaskLink.current = { taskId, eventId: e.id };
    setEventEdit({ e, isNew: true });
  }, []);
```

(`DEFAULT_OWNER`-t importáld a '@/data/agenda'-ból, ha még nincs a 16. sorban.)

A `saveEvent`-ben (706-717) a commitAgenda ELŐTT a tasks számítás bővítése - a meglévő tengely-szinkron sor után:

```ts
    let tasks = oldKey && newKey && oldKey !== newKey
      ? cur.tasks.map((t) => (t.eventId === e.id && t.dueDate === oldKey ? { ...t, dueDate: newKey } : t))
      : cur.tasks;
    // feladatból indított új esemény: mentéskor a kezdeményező feladat rákapcsolódik
    const pend = pendingTaskLink.current;
    if (pend && pend.eventId === e.id) {
      tasks = tasks.map((t) => (t.id === pend.taskId ? { ...t, eventId: e.id, dueDate: t.dueDate ?? e.day ?? e.sort ?? null } : t));
      pendingTaskLink.current = null;
    }
```

(a régi `const tasks = ...` sort cseréli.) Az EventModal `onClose`-ában (1821) a ref ürítése:

```tsx
          onClose={() => { setEventEdit(null); pendingTaskLink.current = null; }}
```

- [ ] **Step 2: TaskModal** - Props: `onAddEvent?: () => void;` (destrukturálásba is). Az Alap fül „Kapcsolódó esemény" mezőjébe, a select/javaslat UTÁN:

```tsx
              {!d.eventId && onAddEvent && (
                <button type="button" className="btn" title="Menti a feladatot, és új eseményt nyit a feladat adataival - az esemény mentésekor össze lesznek kapcsolva"
                  onClick={() => { if (!d.title.trim()) return; save(); onAddEvent(); }}>+ Új esemény ehhez a feladathoz</button>
              )}
```

CurriculumApp TaskModal render: `onAddEvent={() => addEventForTask(taskEdit.t.id)}`.

- [ ] **Step 3: AgendaDrawer** - Props: `onAddEventFor?: (taskId: string) => void;`. A „Kapcsolt esemény" mező canEdit-ágában (`dr-evpick` div-ben, a select UTÁN):

```tsx
                    {onAddEventFor && (
                      <button className="btn dr-addtask" onClick={() => onAddEventFor(task.id)}>+ Új esemény ehhez a feladathoz</button>
                    )}
```

CurriculumApp AgendaDrawer render: `onAddEventFor={(tid) => { setAgendaDetails(null); addEventForTask(tid); }}`.

- [ ] **Step 4: Ellenőrzés**

`npx tsc --noEmit && npm run lint` - 0 hiba. Böngésző: feladat szerkesztő → „+ Új esemény ehhez a feladathoz" → EventModal előtöltve (cím, nap = határidő) → Mentés → a feladat kártyáján megjelenik a ▤ esemény; Mégsem-mel zárva NEM jön létre kapcsolat.

- [ ] **Step 5: Commit**

```bash
cd C:\node\metumatrix && git add web/src/components/CurriculumApp.tsx web/src/components/AgendaModals.tsx web/src/components/AgendaDrawer.tsx && git commit -m "feat(feladat): + Uj esemeny ehhez a feladathoz - szimmetrikus kapcsolt letrehozas (spec 4)"
```

---

### Task 7: Kapcsolt esemény láthatósága a feladatoknál

**Files:**
- Modify: `web/src/components/AgendaView.tsx`
- Modify: `web/src/components/AgendaDrawer.tsx`
- Modify: `web/src/app/globals.css`

**Interfaces:**
- Consumes: `onOpenEvent` prop (Task 3-ban már bekötve a CurriculumApp-ból).

- [ ] **Step 1: AgendaView** - az `eventTitle` helper cseréje:

```ts
  const eventOf = (id: string | null) => (id ? agenda.events.find((e) => e.id === id) ?? null : null);
```

A nyitott kártya meta-sorában a 244. sori span cseréje:

```tsx
                  {(() => { const ev = eventOf(t.eventId); return ev ? (
                    <button type="button" className="m ev evbtn" title={`Kapcsolt esemény megnyitása: ${ev.title}`}
                      onClick={(e) => { e.stopPropagation(); onOpenEvent(ev.id); }}>▤ {ev.title}{ev.day ? ` · ${fmtDayHu(ev.day)}` : ''}</button>
                  ) : null; })()}
```

A ⭐ sáv sorában (`ag-toprow`, az open-gomb UTÁN, testvérként):

```tsx
                  {(() => { const ev = eventOf(t.eventId); return ev ? (
                    <button type="button" className="m ev evbtn" title={`Kapcsolt esemény: ${ev.title}`}
                      onClick={() => onOpenEvent(ev.id)}>▤ {ev.day ? fmtDayHu(ev.day) : ev.title}</button>
                  ) : null; })()}
```

A kész-lista 264. sori spanje maradhat (`eventOf(t.eventId)?.title` behelyettesítéssel).

- [ ] **Step 2: AgendaDrawer** - a feladat-ág „Kapcsolt esemény" `dr-field`-je kerüljön a Határidő ELÉ (első mező), és a kapcsolt ágban a tartalma legyen:

```tsx
              <div className="dr-field">
                <h4>Kapcsolt esemény</h4>
                {task.eventId && evLinked ? (
                  <div className="dr-evcard">
                    <button className="dr-evcard-main" onClick={() => onOpenEvent(task.eventId as string)} title="Az esemény részletezőjének megnyitása">
                      <span className="t">▤ {evLinked.title}</span>
                      <span className="m">🕑 {evLinked.day ? fmtDayHu(evLinked.day) : evLinked.when}{evLinked.place ? ` · 📍 ${evLinked.place}` : ''}{evLinked.mstatus === 'tentative' ? ' · egyeztetés alatt' : ''}</span>
                    </button>
                    {evLinked.meetLink && <a className="btn" href={evLinked.meetLink} target="_blank" rel="noopener noreferrer">📹 Meet</a>}
                    <button className="btn" onClick={() => onOpenEvent(task.eventId as string)}>Megnyitás</button>
                    {canEdit && <button className="dr-unlink" title="Kapcsolat bontása" onClick={() => onLinkEvent(task.id, null)}>✕</button>}
                  </div>
                ) : canEdit ? (
                  ...a meglévő dr-evpick blokk változatlanul (javaslat + select + Task 6 gombja)...
                ) : <p className="none">nincs</p>}
              </div>
```

- [ ] **Step 3: CSS** (globals.css, a drawer-szekcióba):

```css
/* kapcsolt esemény kiemelt blokk a feladat-részletezőben + kattintható esemény-chip a kártyán */
.dr-evcard { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; border: 1px solid var(--line); border-left: 3px solid var(--brand); border-radius: 8px; padding: 8px 10px; background: color-mix(in srgb, var(--brand) 5%, transparent); }
.dr-evcard-main { flex: 1 1 200px; min-width: 0; display: grid; gap: 2px; text-align: left; border: 0; background: transparent; cursor: pointer; font: inherit; color: var(--ink); }
.dr-evcard-main .t { font-weight: 700; }
.dr-evcard-main .m { font-size: .8rem; color: var(--muted); }
.agc-meta .evbtn { border: 1px solid var(--line); border-radius: 999px; padding: 1px 8px; background: transparent; cursor: pointer; font: inherit; font-size: .78rem; }
.agc-meta .evbtn:hover, .ag-toprow .evbtn:hover { border-color: var(--brand); color: var(--brand-text); }
.ag-toprow .evbtn { border: 1px solid var(--line); border-radius: 999px; padding: 1px 8px; background: transparent; cursor: pointer; font: inherit; font-size: .74rem; color: var(--muted); flex: none; }
```

- [ ] **Step 4: Ellenőrzés** - `npx tsc --noEmit && npm run lint`; böngésző: kártya ▤ chip kattintható → esemény-drawer; a ⭐ sávban is látszik; a feladat-drawer tetején a kapcsolt esemény blokk nappal/hellyel/Meettel.

- [ ] **Step 5: Commit**

```bash
cd C:\node\metumatrix && git add web/src/components/AgendaView.tsx web/src/components/AgendaDrawer.tsx web/src/app/globals.css && git commit -m "feat(feladatok): kapcsolt esemeny lathato es kattinthato - kartya, sav, drawer-blokk (spec 7)"
```

---

### Task 8: meetSlots írása minden Meet-készítő útról

**Files:**
- Modify: `web/src/components/ReplyMeet.tsx`
- Modify: `web/src/components/PostaView.tsx` (két onCreated: ~1186, ~1273)
- Modify: `web/src/components/NotifyModal.tsx` (createMeetPosta, ~428-455)
- Modify: `web/src/components/LevelWizard.tsx` (createTentative, ~130-155)

**Interfaces:**
- Produces: ReplyMeet `onCreated` info bővül: `slots: { day: string; start?: string | null; end?: string | null }[]` (minden kitöltött slot).
- Szabály: `meetSlots` CSAK 2+ kitöltött slotnál íródik (1 slot = sima tentative esemény, nincs függő-jelölés).

- [ ] **Step 1: ReplyMeet** - a Props onCreated típusa:

```ts
  onCreated?: (info: { link: string; googleEventId: string; day: string; start: string; end: string; slots: { day: string; start?: string | null; end?: string | null }[] }) => void;
```

A `make()`-ben a first-hívás cseréje:

```ts
      const filled = slots.filter((s) => s.day && s.start);
      const first = filled[0];
      if (first) onCreated?.({
        link: r.link, googleEventId: r.googleEventId, day: first.day, start: first.start ?? '', end: first.end ?? '',
        slots: filled.map((s) => ({ day: s.day, start: s.start || null, end: s.end || null })),
      });
```

- [ ] **Step 2: PostaView** - mindkét `onCreated` handlerben a létrehozott esemény-objektumba (a `mstatus: 'tentative'` mellé):

```ts
                                meetSlots: info.slots.length > 1 ? info.slots : null,
```

A válasz-szerkesztő `e:`-ágában (meglévő eseményre kötés, ~1191):

```ts
                              if (ev) onSaveEvent({ ...ev, googleEventId: ev.googleEventId ?? (info.googleEventId || null), meetLink: ev.meetLink ?? (info.link || null), mstatus: ev.mstatus ?? 'tentative', meetSlots: ev.meetSlots ?? (info.slots.length > 1 ? info.slots : null) });
```

- [ ] **Step 3: NotifyModal createMeetPosta** - a tükör-esemény objektumába:

```ts
        const filledAll = meetSlots.filter((s) => s.day && s.start);
        ...
          meetSlots: filledAll.length > 1 ? filledAll.map((s) => ({ day: s.day, start: s.start || null, end: s.end || null })) : null,
```

- [ ] **Step 4: LevelWizard createTentative** - az `ev` objektumba:

```ts
      meetSlots: filled.length > 1 ? filled.map((s) => ({ day: s.day, start: s.start || null, end: s.end || null })) : null,
```

- [ ] **Step 5: Ellenőrzés** - `npx tsc --noEmit && npm run lint` - 0 hiba. (Futásidejű ellenőrzés a Task 9 után együtt.)

- [ ] **Step 6: Commit**

```bash
cd C:\node\metumatrix && git add web/src/components/ReplyMeet.tsx web/src/components/PostaView.tsx web/src/components/NotifyModal.tsx web/src/components/LevelWizard.tsx && git commit -m "feat(meet): a javasolt idopontok strukturaltan a tentative esemenyre kerulnek (spec 5)"
```

---

### Task 9: Naptár halvány függő slotok + SlotConfirm véglegesítés

**Files:**
- Create: `web/src/components/SlotConfirm.tsx`
- Modify: `web/src/components/EventsCalendar.tsx`
- Modify: `web/src/components/AgendaDrawer.tsx`
- Modify: `web/src/components/PostaView.tsx`
- Modify: `web/src/components/CurriculumApp.tsx`
- Modify: `web/src/app/globals.css`

**Interfaces:**
- Produces: `SlotConfirm({ event, onConfirm })` komponens; `confirmMeetSlot(eventId: string, slot: AgendaMeetSlot)` handler; `onConfirmMeetSlot?: (eventId: string, slot: AgendaMeetSlot) => void` prop (AgendaDrawer, PostaView).

- [ ] **Step 1: SlotConfirm.tsx** (új fájl, teljes tartalom):

```tsx
'use client';
// Függő Meet-időpontok véglegesítője: a javasolt slotok chipekként, a választott lesz
// az esemény időpontja, a többi javaslat eltűnik (meetSlots törlődik, mstatus confirmed).
// Két hoszt: a részletező (AgendaDrawer) és a Posta válasz-szerkesztője.
import { AgendaEvent, AgendaMeetSlot, fmtDayHu } from '@/data/agenda';

export default function SlotConfirm({ event, onConfirm }: { event: AgendaEvent; onConfirm: (slot: AgendaMeetSlot) => void }) {
  const slots = event.meetSlots ?? [];
  if (event.mstatus !== 'tentative' || !slots.length) return null;
  return (
    <div className="slotconfirm">
      <span className="sc-h">✔ Időpont véglegesítése - melyik legyen?</span>
      {slots.map((s, i) => (
        <button key={i} type="button" className="chip" title="Ez lesz az esemény végleges időpontja"
          onClick={() => onConfirm(s)}>{fmtDayHu(s.day)}{s.start ? ` ${s.start}` : ''}{s.end && s.end !== s.start ? `-${s.end}` : ''}</button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: CurriculumApp** - import: `AgendaMeetSlot` a '@/data/agenda'-ból. A `confirmMeet` (812-815) UTÁN:

```ts
  // több javaslatból egy KIVÁLASZTOTT slot véglegesítése: az esemény arra áll át,
  // a többi javaslat eltűnik; a Google-pár a saveEvent meglévő patch-útján frissül
  const confirmMeetSlot = useCallback((eventId: string, slot: AgendaMeetSlot) => {
    const e = agendaRef.current.events.find((x) => x.id === eventId);
    if (!e) return;
    saveEvent({
      ...e, day: slot.day, dayEnd: null, sort: slot.day.slice(0, 7),
      when: fmtEventWhen(slot.day, null, slot.day.slice(0, 7), slot.start || null),
      mstatus: 'confirmed', meetSlots: null,
    });
  }, [saveEvent]);
```

Bekötés: AgendaDrawer render + PostaView render: `onConfirmMeetSlot={confirmMeetSlot}`.

- [ ] **Step 3: EventsCalendar** - `DayHit`-be `pending?: boolean;`. A dated.forEach-ben a push-hoz:

```ts
      if (!isLong) ((dayHits[k] ||= {})[day] ||= []).push({ id: e.id, color: colorOf[e.id], featured: e.featured, pending: e.mstatus === 'tentative' && (e.meetSlots?.length ?? 0) > 0, tip: `${e.title} · ${e.when}${e.place ? ` · ${e.place}` : ''}` });
```

A dated.forEach UTÁN új blokk:

```ts
  // FÜGGŐ Meet-időpontjavaslatok: a tentative esemény minden TOVÁBBI javasolt napja
  // halvány csíkot kap - kattintásra ugyanúgy az esemény nyílik
  events.filter((e) => e.mstatus === 'tentative' && (e.meetSlots?.length ?? 0) > 0).forEach((e) => {
    (e.meetSlots ?? []).forEach((s) => {
      if (!s.day || s.day === e.day) return;
      const k = s.day.slice(0, 7);
      const dayN = Number(s.day.slice(8, 10));
      if (!dayN) return;
      ((dayHits[k] ||= {})[dayN] ||= []).push({ id: e.id, color: colorOf[e.id] ?? '#9aa1ab', pending: true, tip: `⏳ függő időpont-javaslat: ${e.title}${s.start ? ` · ${s.start}${s.end && s.end !== s.start ? `-${s.end}` : ''}` : ''}` });
    });
  });
```

A csík-gomb className-je: `` `cal-bar${x.featured ? ' ft' : ''}${x.pending ? ' pending' : ''}` ``.

- [ ] **Step 4: AgendaDrawer** - Props: `onConfirmMeetSlot?: (eventId: string, slot: AgendaMeetSlot) => void;` + import `AgendaMeetSlot` és `SlotConfirm`. Az esemény-ág Meet-gombsorában a meglévő „✔ Időpont véglegesítése" gomb feltétele bővül: csak ha NINCS slot-lista; alá:

```tsx
                  {event.mstatus === 'tentative' && (event.meetSlots?.length ?? 0) > 0 && onConfirmMeetSlot && (
                    <SlotConfirm event={event} onConfirm={(s) => onConfirmMeetSlot(event.id, s)} />
                  )}
                  {event.mstatus === 'tentative' && !(event.meetSlots?.length) && onConfirmMeet && (
                    ...a meglévő ✔ gomb változatlanul...
                  )}
```

A FELADAT-ág `dr-evcard` blokkja (Task 7) alá, ha a kapcsolt esemény tentative+slotos:

```tsx
                {canEdit && evLinked && evLinked.mstatus === 'tentative' && (evLinked.meetSlots?.length ?? 0) > 0 && onConfirmMeetSlot && (
                  <SlotConfirm event={evLinked} onConfirm={(s) => onConfirmMeetSlot(evLinked.id, s)} />
                )}
```

- [ ] **Step 5: PostaView** - Props: `onConfirmMeetSlot?: (eventId: string, slot: AgendaMeetSlot) => void;` + importok (`AgendaMeetSlot`, `SlotConfirm`). A válasz-szerkesztő (editing ág) ReplyMeet komponense UTÁN:

```tsx
                        {(() => {
                          const ev = r.sel.startsWith('e:')
                            ? agenda.events.find((x) => x.id === r.sel.slice(2))
                            : (() => { const t = agenda.tasks.find((x) => x.id === r.sel.slice(2)); return t?.eventId ? agenda.events.find((x) => x.id === t.eventId) : undefined; })();
                          return ev && onConfirmMeetSlot ? <SlotConfirm event={ev} onConfirm={(s) => onConfirmMeetSlot(ev.id, s)} /> : null;
                        })()}
```

- [ ] **Step 6: CSS** (globals.css, a naptár-szekcióba):

```css
/* függő (még nem véglegesített) Meet-időpontjavaslat a naptárban: halvány, csíkozott */
.cal-bar.pending { opacity: .45; background-image: repeating-linear-gradient(45deg, transparent 0 3px, rgba(255, 255, 255, .55) 3px 6px); }
/* slot-véglegesítő chipsor */
.slotconfirm { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
.slotconfirm .sc-h { font-size: .8rem; font-weight: 700; color: var(--ink-2); }
```

- [ ] **Step 7: Ellenőrzés** - `npx tsc --noEmit && npm run lint`. Böngésző: esemény-szerkesztőben 3 javasolt időpont (Task 4) → naptárban az első nap normál, a másik kettő halvány csík; drawer: slot-chipek → egyet választva az esemény átáll, confirmed, a halvány csíkok eltűnnek; Posta: egy tentative+slotos kártya válasz-szerkesztőjében a chipsor megjelenik.

- [ ] **Step 8: Commit**

```bash
cd C:\node\metumatrix && git add web/src/components/SlotConfirm.tsx web/src/components/EventsCalendar.tsx web/src/components/AgendaDrawer.tsx web/src/components/PostaView.tsx web/src/components/CurriculumApp.tsx web/src/app/globals.css && git commit -m "feat(naptar): fuggo Meet-idopontok halvanyan + SlotConfirm veglegesites (spec 5,6)"
```

---

### Task 10: Mobil FAB a Feladatok + Események nézetben

**Files:**
- Modify: `web/src/components/AgendaView.tsx`
- Modify: `web/src/components/EventsView.tsx`
- Modify: `web/src/app/globals.css`

- [ ] **Step 1:** Mindkét nézet `</main>` záró tagje ELÉ:

AgendaView: `<button type="button" className="ag-fab" title="Új feladat" onClick={onAdd}>+</button>`
EventsView: `<button type="button" className="ag-fab" title="Új esemény" onClick={onAdd}>+</button>`

- [ ] **Step 2: CSS** - ELŐBB nézd meg a `.savedock` pozícióját (Grep `savedock {` a globals.css-ben), és úgy állítsd a `bottom` értéket, hogy a két lebegő gomb NE fedje egymást (a savedock-fab fölé):

```css
/* mobil lebegő + gomb (Feladatok/Események): a fejléc-gomb kicsi és lecsúszhat - ez mindig kéznél van */
.ag-fab { display: none; }
@media (max-width: 720px) {
  .ag-fab { display: flex; align-items: center; justify-content: center; position: fixed; right: 14px; bottom: 84px; width: 52px; height: 52px; border-radius: 50%; border: 0; background: var(--ink); color: var(--paper, #fff); font-size: 1.8rem; font-weight: 700; z-index: 55; box-shadow: 0 6px 18px rgba(0, 0, 0, .3); cursor: pointer; }
}
.viewer .ag-fab { display: none !important; }
```

- [ ] **Step 3: Ellenőrzés** - böngésző DevTools mobil nézet (390px): a + gomb a jobb alsó sarokban, nem fedi a mentés-dokkot, kattintásra az üres szerkesztő nyílik; desktopon nem látszik; view-kulcs (?net=vendeg-md26) alatt nem látszik.

- [ ] **Step 4: Commit**

```bash
cd C:\node\metumatrix && git add web/src/components/AgendaView.tsx web/src/components/EventsView.tsx web/src/app/globals.css && git commit -m "feat(mobil): lebego + gomb a Feladatok es Esemenyek nezetben (spec 0)"
```

---

### Task 11: Dokumentáció + teljes ellenőrzés

**Files:**
- Modify: `web/CLAUDE.md`

- [ ] **Step 1: web/CLAUDE.md** - a 92. sor környéki elavult „the OAuth setup ... is a pending user step" szöveg cseréje arra, hogy az OAuth KÉSZ (a .env.local-ban él a refresh token; új gépen a scripts/gcal-auth.mjs futtatandó újra). Rövid új bekezdés a 0-7 pontról: kézi ⭐ (star/starAt, bot-guard), Online helyszín-mód, isNew-feloldás, addEventForTask + pendingTaskLink, meetSlots + SlotConfirm + naptár pending-csíkok, ag-fab.

- [ ] **Step 2: Teljes ellenőrzés**

```bash
cd C:\node\metumatrix\web && npx tsc --noEmit && npm run lint
```

Expected: mindkettő zöld. Böngészőben végigkattintani a spec „Ellenőrzés" szakaszát (8 pont).

- [ ] **Step 3: Commit**

```bash
cd C:\node\metumatrix && git add web/CLAUDE.md && git commit -m "docs: CLAUDE.md - OAuth kesz + esemeny-feladat-posta osszhang funkciok"
```
