# Esemény-Feladat-Posta összhang (0-7 pont) - design spec

Dátum: 2026-07-20 · Ág: `feature/levelek-titkarno-meet` · Jóváhagyva: Áron, chatben (0-7 pont)

## Cél

A feladatok, események és a Posta közötti hiányzó átjárások pótlása: kézi ⭐ kiemelés,
online (Meet) helyszín az esemény-űrlapon, kapcsolt feladat/esemény létrehozás mindkét
irányban (új, még nem mentett kártyáról is), a függő Meet-időpontok láthatósága a
naptárban, és a kapcsolt esemény jól látható megjelenítése a feladatoknál.

## Jelenlegi állapot (feltérképezve 2026-07-20, 5 párhuzamos olvasó)

- Helyszínválasztó (`PlaceQuickPick`): csak METU (épület+terem) és Külső mód; online opció nincs.
- `EventModal`: nincs Meet-vezérlő; Meet-link csak mentés utáni auto-push vagy a drawer gombjai révén.
- Új (isNew) eseménynél a Feladatok fül „+ Új feladat" gombja és a ✉ Levél gomb el van rejtve
  (`CurriculumApp.tsx:1815-1817`: onAddTask/onNotify undefined).
- ⭐ Legfontosabbak sáv: teljesen számított (`urgencyRank`, `AgendaView.tsx:64-72`), nincs tárolt
  mező, kézzel nem kapcsolható ki/be; a sáv max 8 elem.
- Feladatból nem hozható létre új esemény; csak meglévőhöz kapcsolás (drawer). Fordítva
  (eseményből feladat: `addTaskForEvent`, `CurriculumApp.tsx:854`) létezik.
- A javasolt Meet-időpontok (`MeetSlots` + `lib/meet.ts createMeet`) csak a levélszövegben és a
  Google-esemény leírásában élnek, strukturáltan nem tárolódnak; a naptár nem mutatja őket.
- Kapcsolt esemény a feladatkártyán: apró, nem kattintható `▤ cím` span (`AgendaView.tsx:244,264`),
  a ⭐ sáv kártyáin semmi; a drawerben a kapcsolás a blokk közepén.
- Posta-átadás kártyáról: működik (✉ Levél → NotifyModal → „Küldésre a Postába" → Kimenő).
- Google: OAuth kész, app→Google push teljes (create/patch/delete + Meet-link), Google→app nincs.

## 0. Feladat-gomb láthatóság (mobil FAB)

- `AgendaView` és `EventsView`: fix pozíciójú, kerek „+" gomb (`.ag-fab`), jobb alsó sarok.
- CSS: csak ≤720px-en látszik (`display:none` felette); `.viewer .ag-fab { display:none }`.
- Ugyanazt az `onAdd`-ot hívja, mint a fejléc-gomb. A fejléc-gomb marad.
- Ne ütközzön a viewer-badge-dzsel és a drawerrel (z-index a modálok alatt).

## 1. Kézi ⭐ a feladatokon

**Adatmodell** (`agenda.ts`, `AgendaTask`):
- `star?: 'on' | 'off' | null` - kézi felülbírálat; hiányzik/null = automatikus.
- `starAt?: string` - a kézi állítás ISO időbélyege.

**Sáv-logika** (`urgencyRank` kiegészítése, a függvény kapja a teljes taskot):
- `star === 'on'` → rank 0 (mindig bent, elöl).
- `star === 'off'` ÉS NEM (`source.lastInboundAt > starAt`) → rank 99 (soha nincs bent).
- `star === 'off'` ÉS `source.lastInboundAt > starAt` → az override LEJÁRT (új fejlemény a
  szálban), a számított rank él újra. Ez adja a jóváhagyott ütközés-szabályt: a levétel
  érvényben marad, de új levélnél a bot-féle (számított) kiemelés visszatérhet.
- egyébként a mai számított logika változatlanul.
- A sáv továbbra is max 8 elem; a kézi `on` rank 0-val mindig belefér elsőként.

**UI (3 hely):**
- Feladatkártya (lista + ⭐ sáv): csillag ikon-gomb; ha a kártya a sávban van → kitöltött ⭐,
  kattintásra `star:'off'`; ha nincs a sávban → üres ☆, kattintásra `star:'on'`. Ha az új
  kívánt állapot megegyezik a számítottal, `star:null` tárolódik (nincs felesleges override).
  `starAt` minden állításnál frissül. stopPropagation (ne nyissa a drawert).
- Drawer műveletsor: ugyanez a toggle gomb szöveggel („⭐ Legfontosabb" / „☆ Kiemelés le").
- `TaskModal` Alap fül: háromállású ChipRadio „⭐ Kiemelés: Automatikus / Mindig / Soha"
  (null / 'on' / 'off').

**Bot-védelem** (`api/agenda/route.ts`, `guardBotWrite`): bot-írásnál a feladatok `star` és
`starAt` mezője MINDIG a lemezi értékről él tovább (a bot nem írhatja). A bot-prompt
mező-tulajdon szekciójába egy sor: „star/starAt: user-owned, ne írd."

## 2. Online (Meet) helyszín + Meet az esemény-űrlapon

- `PlaceQuickPick`: harmadik mód-chip „Online (Meet)" → a helyszín szövege
  „Online (Google Meet)". A chipek (épület/terem) ilyenkor rejtve.
- `EventModal` Alap fül, a helyszín alatt Meet-blokk:
  - ha van `meetLink`: mutatja (kattintható + másolás gomb);
  - ha nincs, és a helyszín Online: rövid jelzés, hogy mentéskor automatikusan készül
    Google-esemény + Meet-link (napra tett eseménynél); unconfigured esetben a kézi út említése;
  - „📹 Javasolt időpontok" lenyitható blokk: `MeetSlots` szerkesztő, mentéskor az esemény
    `meetSlots` mezőjébe ír (lásd 5. pont), és az esemény `mstatus:'tentative'`-ra áll,
    amíg több javaslat él.

## 3. Új (isNew) kártyáról kapcsolt feladat + levél

- `CurriculumApp` az `EventModal`-nak isNew esetén IS átadja az `onAddTask`/`onNotify`/
  `onOpenTask` callbackeket; a modál gombjai már most is „ments előbb, aztán folytasd"
  logikájúak, ez isNew-ra is működjön (a mentés a friss objektummal hívódik, az id megvan).
- Ugyanez a `TaskModal` ✉ Levél gombjára isNew-nál.

## 4. Feladatból esemény („+ Esemény ehhez a feladathoz")

- Új handler: `addEventForTask(t)` a `CurriculumApp`-ban (az `addTaskForEvent` tükörképe):
  előbb menti a feladatot, majd `EventModal` nyílik előtöltve: title = a feladat címe,
  owner, people átvéve, `day` = a feladat `dueDate`-je, ha teljes dátum (ÉÉÉÉ-HH-NN),
  `sort` ebből származtatva. Az esemény MENTÉSEKOR a feladat `eventId`-je automatikusan
  az új esemény id-jére áll (a kapcsolat egyirányú marad: task.eventId).
- Gomb két helyen: `TaskModal` Alap fül (a meglévő esemény-kapcsoló mellett) és a feladat-drawer
  esemény-szekciójában.
- Online helyszínnel (2. pont) így feladatból is születik Meet-es esemény.

## 5. Függő Meet-időpontok a naptárban

**Adatmodell** (`agenda.ts`, `AgendaEvent`):
- `meetSlots?: { day: string; start?: string; end?: string }[]` - a még el nem döntött
  időpontjavaslatok. Csak `mstatus:'tentative'` esemény hordozza.

**Írás:** minden út, ami ma `createMeet`-et hív több slottal (ReplyMeet, NotifyModal,
LevelWizard, EventModal új blokkja), a létrejövő/tükör tentative eseményre a slotokat
strukturáltan is ráírja.

**Naptár** (`EventsCalendar`): tentative + `meetSlots` esemény MINDEN javasolt napján
halvány/szaggatott csík jelenik meg (idősávval, „függő" jelzéssel); kattintásra az esemény
drawere nyílik. A stílus: szürke alap (--brand), NEM piros.

**Véglegesítés (közös komponens, `SlotConfirm`):** a drawer „✔ Időpont véglegesítése" gombja
több slot esetén slot-választót mutat; a választott slot → `day`/`dayEnd`/`when` beállítás,
`mstatus:'confirmed'`, `meetSlots` törlés, Google-patch a meglévő update úton. Ugyanez a
választó a Posta válasz-szerkesztőjéből is elérhető, ha a kártyához tentative + slotos
esemény kapcsolódik.

**Feladat-oldal:** ha a feladat kapcsolt eseménye tentative + slotos, a drawerben a slotok
chipekként látszanak.

## 6. Posta

- Az átadás változatlanul a meglévő úton (✉ Levél → „Küldésre a Postába" → Kimenő lista,
  ott szerkesztés/Outlook-piszkozat/Küldés most/hajnali ütemezés).
- A 3. pont megszünteti az isNew-lyukat; az 5. pont a Postából elérhető véglegesítést adja.

## 7. Kapcsolt esemény láthatósága a feladatoknál

- Feladatkártya: a `▤ cím` span kattintható chip lesz (dátum-rövidítéssel), kattintásra az
  esemény drawere nyílik (stopPropagation). A ⭐ sáv kártyáin is megjelenik.
- Feladat-drawer: „Kapcsolt esemény" kiemelt blokk felülre: cím, nap, helyszín, 📹 Meet,
  „Megnyitás" (esemény-drawerre vált), és itt marad a csere/leválasztás/javaslat.
- Esemény-oldal nem változik (készültség-jelző + Feladatok fül már jó).

## Nem célok (out of scope)

- Google→app visszaolvasás (kétirányú szinkron).
- `event.taskId` visszamutató mező (a szűrés task.eventId-re olcsó és elég).
- Outlook-tükör (extSource:'outlook') események bármilyen új viselkedése.
- A kimenő (outbox) levelek „rájuk várok" követése.

## Ellenőrzés

- `npx tsc --noEmit` és `npm run lint` a `web` alatt zölden.
- Futásidejű ellenőrzés a 3939-es dev szerveren (böngésző): mind a 8 pont végigkattintva,
  a bot-védelem (star) API-szinten curl-lel.
- Az agenda-írások előtt backup készül (meglévő minta); a metumatrix kliens 60 mp-enként
  frissül, ütközésnél 409 + merge.
