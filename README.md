# metumatrix

METU Média Design tanszéki app: tantervi mátrix (BA/MA), feladatok, események + naptár,
levél-készítő központ és névjegyzék. Az élő adatok a `C:\node\metu_tanterv\grid\` JSON-fájljaiban
élnek, az app a `web/` mappában fut (`npm run dev`, port **3939**).

## Adatmentés és visszaállítás

- **⤓ Mentés** (eszköztár): mindent ment egyben — tanterv + elrendezés, feladatok, események,
  mentett levelek, teljes névjegyzék (tanár/hallgató/intézményi/alumni/piaci). Három dolog történik:
  1. azonnali fájlba írás a `grid/` élő fájljaiba,
  2. **időbélyeges pillanatkép** a `grid/backups/` mappába (`metumatrix-ÉÉÉÉ-HH-NN_ÓÓ-PP-MM.json`),
  3. biztonsági másolat letöltése a böngészőbe.
- **⤒ Betöltés**: a szerveren tárolt pillanatképeket listázza, legfrissebb elöl.
  A **„Legutóbbi visszaállítása"** gomb mindig a perc szerint legutolsó mentést tölti vissza;
  bármelyik régebbi is választható a listából, vagy fájl tölthető be a gépről.
- Minden módosítás emellett **automatikusan is mentődik** (~1 mp késleltetéssel) az élő fájlokba.

## Szerkesztési kulcs és bemutató mód

A `web/.env.local`-ban az `EDIT_KEY` védi az összes írást (mentés, szerkesztés, levélküldés).

- **Belépés szerkesztő módba** (eszközönként és címenként egyszer kell):
  Hozzáférés-kezelés NINCS: a védelem maga a Tailscale-hálózat (csak a saját, tailnetbe
  a címsorból azonnal eltűnik (kivetítőn sem látszik). Utána a sima URL is szerkesztő módú.
  bejelentkezett eszközeid érik el az appot), és ott mindig teljes szerkesztő mód jár.
- Ha valaha nyilvános (Funnel) kitettség lesz: a web/.env.local-ban az EDIT_KEY visszakapcsolható.
- **Bemutató mód** (kulcs nélkül): minden szerkesztő gomb rejtve, jobb alul „👁 Bemutató mód"
  jelvény, és a szerver minden írási kérést 403-mal elutasít — a nézelődés szabad.
- **Kulcscsere (pánikgomb)**: új érték az `.env.local`-ba → dev szerver újraindítása →
  minden eszközön újra be kell lépni az új kulccsal.

## Publikus bemutatás meetingen (Tailscale Funnel)

1. Meeting előtt, a szerver-gépen: `tailscale funnel 3939`
   (ELŐTÉRBEN futtasd — amíg a terminál nyitva, él a link; bezárod/Ctrl+C = azonnal zárva.
   Első alkalommal a Tailscale admin felületén engedélyezni kell a HTTPS-t és a Funnelt.)
2. A kapott `https://<gépnév>.<tailnet>.ts.net` linket kivetíted — bárki nézheti,
   bemutató módban, szerkeszteni senki nem tud.
3. Ha te szerkesztenél közben: a saját eszközödön egyszer nyisd meg a linket
   kulcs nélkül — a tailneten belül minden eszközön azonnal szerkesztő mód van.
4. Meeting után: Ctrl+C a terminálban (vagy `tailscale funnel reset`) — a link megszűnik.
   Kerüld a `--bg` kapcsolót: az újraindítás után is nyitva maradna!

## Hasznos útvonalak

- `GET/POST /api/curriculum | /api/agenda | /api/people` — élő adatok (írás csak kulccsal)
- `GET /api/snapshots` (lista), `GET /api/snapshots?name=…` (tartalom), `POST` (új pillanatkép)
- `GET /api/auth` — a tárolt kulcs érvényességének ellenőrzése

## Billentyűk, tippek

- Mátrix: egy kattintás = kijelölés, dupla = részletek/szerkesztő; **F** = fókusz a kijelölt
  kártyára/területre; ⬚ Terület = húzásos többes kijelölés (asztali gépen alapértelmezés).
- A scheduled email-feldolgozó a feladatokra `source` (feladó) és `createdAt` mezőt ír;
  a levél-készítő „↩ A feladónak (válasz)" gombja ebből dolgozik.
