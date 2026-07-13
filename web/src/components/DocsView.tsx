'use client';

import { ReactNode } from 'react';
import { getEditKey } from '@/lib/editkey';

// 📚 Segédletek: belső útmutatók saját főmenü-fülként. CSAK a LEGFRISSEBB
// változatok érhetők el (a 2024/25-ös segédletek lekerültek). Minden
// dokumentumhoz lépésenkénti, kattintható KIVONAT tartozik (a PDF/pptx
// tartalmából kiolvasva, élő linkekkel), az eredeti fájl pedig továbbra is
// megnyitható/letölthető. CSAK szerkesztő módban (a /api/docs kulcsot ellenőriz).

const ZOOM_FOGLALO = 'https://bkfhu-my.sharepoint.com/:x:/g/personal/pgulyas_metropolitan_hu/ESUkLjMEXw1NsLp3a3aov9wBJ9eoKJP5_AKh5oGpXIXDtw?rtime=9OHCOXOP2kg&CID=16E1F61A-7C9E-458A-B71D-917F42BD699B&wdLOR=cFA5A1416-ABC4-4FEE-8975-D97432BAE78B';

const L = ({ href, children }: { href: string; children: ReactNode }) => (
  <a className="doc-link" href={href} target="_blank" rel="noreferrer">{children}</a>
);
// személy: NEM mailto — a saját Névjegyzékünkre ugrik és ott mutatja az elérhetőségét
let personJump: (name: string) => void = () => { /* a DocsView állítja be */ };
const P = ({ name }: { name: string }) => (
  <button type="button" className="doc-link doc-person" title={`${name} elérhetősége a Névjegyzékben`}
    onClick={() => personJump(name)}>☎ {name}</button>
);

interface Doc { f: string; icon: string; title: string; desc: string; kivonat: ReactNode; }
interface DocGroup { cim: string; docs: Doc[]; }

const GROUPS: DocGroup[] = [
  {
    cim: '📹 Zoom — online órák és meetingek',
    docs: [
      {
        f: 'zoom-utmutato-2026-27.pdf', icon: '📹', title: 'Zoom használati útmutató (2026/27. ősz)',
        desc: 'Fiókfoglalás, belépés, óraindítás, hibakezelés — a hivatalos, aktuális útmutató.',
        kivonat: (
          <ol>
            <li>Fiók foglalása: <L href={ZOOM_FOGLALO}>Zoom foglalási táblázat (SharePoint)</L> — oktatásra a ZOOM01–ZOOM18 és a ZOOM20 fiókok foglalhatók (a ZOOM19 a távoktatásé).</li>
            <li>Belépés: <L href="https://zoom.us">zoom.us</L> → Sign In · email: a foglalt fiók neve, pl. zoom07@metropolitan.hu · jelszó: Stream2020.</li>
            <li>Az órát a foglalótáblában lévő linkről indítsd — a link CSAK belépés után él. New meetingnél legyen bepipálva a „Use My Personal Meeting ID".</li>
            <li>Ha belépéskor egyszer használatos kódot kér: <L href="https://zoomokt.metropolitan.hu/">zoomokt.metropolitan.hu</L> — itt a 6 számjegyű kód (10 percig érvényes).</li>
            <li>A kód-kérés elkerülhető a telepített klienssel: <L href="https://zoom.us/download">zoom.us/download</L>.</li>
            <li>Óra után: kijelentkezés, az átállított beállítások visszaállítása; a fiókot ne nevezd át, képet ne tölts fel rá.</li>
            <li>Szabályok: minden órát az órarendi időpontban, élőben kell megtartani; az óra linkjét legalább 24 órával előre közzé kell tenni a CooSpace-en; 300 fő feletti előadáshoz központi speciális account jár.</li>
          </ol>
        ),
      },
      {
        f: 'zoom-resztvevok.pptx', icon: '🧾', title: 'Zoom-résztvevők mentése utólag (jelenlét)',
        desc: 'Hogyan mented ki csv-be, kik és mennyi ideig voltak bent az órán.',
        kivonat: (
          <ol>
            <li>Lépj be a <L href="https://zoom.us">zoom.us</L> oldalon → Reports → Usage.</li>
            <li>Dátum alapján keresd meg a kurzust; a Participants oszlop száma kattintható — felugró ablakban a résztvevők.</li>
            <li>Pipáld be a „Show unique users" opciót: egy-egy belépő idejét összesíti. Export gombbal csv-be menthető.</li>
            <li>A csv-t NE ikonról nyisd: Excel → Megnyitás → Tallózás → Szövegfájlok, tagolt elrendezés, határoló jel: vessző.</li>
          </ol>
        ),
      },
    ],
  },
  {
    cim: '📘 Oktatói segédletek — 2026/27. őszi félév',
    docs: [
      {
        f: 'fooallasu-oktatoi-segedlet-2026-27.pdf', icon: '📘', title: 'Főállású oktatói segédlet (2026/27/1 · MKK)',
        desc: 'Adminisztráció, rendszerek, határidők — főállású oktatóknak, aktuális kiadás.',
        kivonat: (
          <ul>
            <li>Kapcsolat: AMD tanszéki referens <P name="Bejczi Zsolt" /> · órarend és teremfoglalás (MKK) <P name="Kálny Rita" /> · oktatásszervezési vezető <P name="Nagy Tünde" /> · többletórák <P name="Gulyás Péter" />.</li>
            <li>Rendszerek: <L href="https://neptunweb1.metropolitan.hu/">Neptun</L> (jelenlét, jegyek, szakdolgozati konzultáció rögzítése) · <L href="https://coospace.metropolitan.hu/">CooSpace</L> (segédanyagok; a Neptun-belépés érvényes) · IT- és teremhiba: <L href="https://metu.topdesk.net/">metu.topdesk.net</L>.</li>
            <li>Jelenlét rögzítése a Neptunban: <L href="https://coospace.metropolitan.hu/CooSpace/Scene-99680/Folder-751518">útmutató a CooSpace-en</L> · videós segédletek (CooSpace-eszközök, tesztek, Zoom): <L href="https://coospace.metropolitan.hu/CooSpace/Scene-60977">CooSpace színtér</L>.</li>
            <li>Wi-fi: „Metropolitan" hálózat, kód: 12348765. Fénymásolás: 100 oldalig a saját zsetonnal.</li>
            <li>Óraelmaradás: lehetőleg 1 nappal előbb emailben a referensnek; a hallgatókat CooSpace-üzenetben tájékoztasd, a pótlásról metus címről a referenst, tanszékvezetőt és szakvezetőt is értesíteni kell.</li>
            <li>Módszertani konzultáció új oktatóknak (CLT): <P name="Lukácsi Éva" />.</li>
            <li>Könyvtár: <L href="https://www.metropolitan.hu/hu/konyvtar#nyitvatartas">nyitvatartás</L> · <L href="https://www.metropolitan.hu/hu/adatbazisok">adatbázisok</L> · <L href="https://www.metropolitan.hu/foglalj-konyvtarost/">Foglalj könyvtárost</L> · <L href="https://corvina.metropolitan.hu/WebPac/CorvinaWeb">Corvina katalógus</L> · <P name="METU Könyvtár" />. Az Infoparkban Könyvtár Pont működik (szerdánként személyesen, kérésre könyvátküldés).</li>
            <li>Fontos: munkatársi email-címet nem adunk ki hallgatónak; tanulmányi és pénzügyi kérdéssel a hallgató a Hallgatói Információs Központhoz fordul.</li>
          </ul>
        ),
      },
      {
        f: 'oraado-oktatoi-segedlet-2026-27.pdf', icon: '📗', title: 'Óraadó oktatói segédlet (2026/27/1 · MKK)',
        desc: 'A legfontosabb tudnivalók óraadóknak — aktuális kiadás.',
        kivonat: (
          <ul>
            <li>Kapcsolat: AMD tanszéki referens <P name="Bejczi Zsolt" /> · órarend és teremfoglalás (MKK) <P name="Kálny Rita" /> · oktatásszervezési vezető <P name="Nagy Tünde" />.</li>
            <li>Rendszerek: <L href="https://neptunweb1.metropolitan.hu/">Neptun</L> (jelenlét, jegyek) · <L href="https://coospace.metropolitan.hu/">CooSpace</L> (segédanyagok, a Neptun-belépéssel) · jelenlét-rögzítés: <L href="https://coospace.metropolitan.hu/CooSpace/Scene-99680/Folder-751518">útmutató</L>.</li>
            <li>Zoom óratartáshoz: <L href={ZOOM_FOGLALO}>foglalási táblázat</L> · ha kódot kér: <L href="https://zoomokt.metropolitan.hu/">zoomokt.metropolitan.hu</L>.</li>
            <li>Nyomtatás/fénymásolás a referensen keresztül; a számonkérések anyagát legkésőbb 5 munkanappal előbb küldd el neki.</li>
            <li>Óraelmaradás: lehetőleg gondoskodj helyettesítésről, és 1 nappal előbb jelezd emailben a referensnek; a pótlásról a referenst, tanszékvezetőt és szakvezetőt is értesíteni kell.</li>
            <li>Könyvtár: <L href="https://www.metropolitan.hu/hu/konyvtar#nyitvatartas">nyitvatartás</L> · <L href="https://www.metropolitan.hu/hu/adatbazisok">adatbázisok</L> · <L href="https://www.metropolitan.hu/foglalj-konyvtarost/">Foglalj könyvtárost</L> · <P name="METU Könyvtár" />.</li>
          </ul>
        ),
      },
      {
        f: 'rendszerhasznalati-trening.pptx', icon: '🖥', title: 'Rendszerhasználati tréning',
        desc: 'Bemutató az egyetemi rendszerek használatáról (letölthető pptx).',
        kivonat: (
          <ul>
            <li>10 diás oktatói tájékoztató: Neptun, CooSpace, Zoom, videórögzítés és videotár — a képernyőmegosztás beállításaival és a tipikus Zoom-hibákkal.</li>
            <li>Gyors linkek: <L href="https://neptunweb1.metropolitan.hu/">Neptun</L> · <L href="https://coospace.metropolitan.hu/">CooSpace</L> · <L href="https://zoom.us">zoom.us</L>.</li>
          </ul>
        ),
      },
    ],
  },
  {
    cim: '🗓 Órarend és termek',
    docs: [
      {
        f: 'orarend-letoltes-2026-27.pdf', icon: '🗓', title: 'Órarend letöltése Neptunból (2026/27/1)',
        desc: 'Saját órarend megtekintése, exportja és frissülő naptár-feliratkozás.',
        kivonat: (
          <ol>
            <li>Lépj be: <L href="https://neptunweb1.metropolitan.hu/">Neptun</L> → Oktatás → Órarend.</li>
            <li>Megjelenítés: Órák + féléves listázás + a kívánt félév a legördülőből.</li>
            <li>Export: lista-nyomtatás VAGY naptár-export (Excel / .ics) — de ez az export változáskor NEM frissül.</li>
            <li>Frissülő naptárhoz az oldal felső soraiban lévő frissítési linket használd: Outlooknál kattints rá, más naptárnál másold ki a linket és importáld a kalendáriumodba.</li>
          </ol>
        ),
      },
      {
        f: 'teremhasznalat-mkk.pdf', icon: '🏫', title: 'MKK teremhasználati tájékoztató',
        desc: 'Ki, mikor és hogyan használhatja a termeket, stúdiókat, műhelyeket.',
        kivonat: (
          <ol>
            <li>Órarenden kívüli önálló teremhasználathoz a hallgatónak kötelező a tűz- és munkavédelmi oktatás: Neptun → Tanulmányok → Elektronikus tananyagok (a recepció a kulcs kiadása előtt webes felületen ellenőrzi; átfutás 1 munkanap).</li>
            <li>Speciális termek (TV stúdió, hangstúdió, műhelyek) CooSpace-en foglalhatók a kapcsolódó színtéren, technikussal — hangstúdió: <L href="mailto:hapongor@gmail.com">hapongor@gmail.com</L> · TV stúdió: <L href="mailto:infop.tvstudio@metropolitan.hu">infop.tvstudio@metropolitan.hu</L>.</li>
            <li>Infopark: a D épületi hangstúdió csak külön technikai vizsgával, az I épületi TV stúdió CSAK technikusi/oktatói felügyelettel használható.</li>
            <li>Tanulásra, online óra meghallgatására a tanulószobák valók: <L href="https://coospace.metropolitan.hu/CooSpace/Scene-75179/Folder-572245">CooSpace — Campusok, teremjelölések és tanulószobák</L>.</li>
            <li>Általános teremügyek: <L href="mailto:terem@metropolitan.hu">terem@metropolitan.hu</L>; gépterembe saját eszköz csatlakoztatható, de használat után az eredeti kábelezést vissza kell állítani.</li>
          </ol>
        ),
      },
    ],
  },
  {
    cim: '🎓 MTMT — tudományos és művészeti alkotások',
    docs: [
      {
        f: 'mtmt-tutorial-2026.pptx', icon: '🎓', title: 'MTMT: alkotások bevitele (2026, Művész Kar)',
        desc: 'Lépésről lépésre: hogyan rögzítsd műveidet az MTMT adatbázisban.',
        kivonat: (
          <ol>
            <li>Belépés: <L href="https://www.mtmt.hu/">mtmt.hu</L> → „Belépés az adatbázisba".</li>
            <li>Új → Saját közlemény; alkotásnál a mű/kiállítás CÍMÉT írd be (duplum-ellenőrzéshez), ha van webes link, az URL is megadható.</li>
            <li>Típus: Alkotás · Besorolás: a művészi terület (Tárgy / Kép / Tér stb.) · Jelleg: általában Művészi.</li>
            <li>Szerző: „Szerzők hozzáadása" → saját név beírása → a találatnál még egyszer beírva megjelenik az „Én vagyok" — e hozzárendelés NÉLKÜL az alkotás nem jelenik meg a saját felületeden.</li>
            <li>Kötelező mezők: Cím + Megjelenés éve (kiállításnál pontos dátum is lehet); ajánlott: műfaj/technika, helyszín, ország.</li>
            <li>Végén: „Mentés és nyilvánossá tesz" — csak így lesz látható a nyilvános felületen.</li>
            <li>Segítenek az MTMT referens könyvtárosok: <P name="Vargáné Nánási Mária" /> · <P name="Kissné Aftin Katalin" />; további segédletek az MTMT honlap Dokumentumok menüjében.</li>
          </ol>
        ),
      },
    ],
  },
];

const norm = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function DocsView({ q, onPerson }: { q: string; onPerson: (name: string) => void }) {
  personJump = onPerson; // a statikus kivonat-JSX-ben élő ☎ név-gombok ide futnak be
  const k = getEditKey();
  const docHref = (f: string) => `/api/docs?f=${f}${k ? `&k=${encodeURIComponent(k)}` : ''}`;
  const nq = norm(q);
  const groups = GROUPS
    .map((g) => ({ ...g, docs: g.docs.filter((d) => !nq || norm(`${d.title} ${d.desc}`).includes(nq)) }))
    .filter((g) => g.docs.length > 0);
  const total = GROUPS.reduce((n, g) => n + g.docs.length, 0);

  return (
    <section className="wrap orv docsv">
      <div className="tp-headrow">
        <h2 className="tp-title">📚 Segédletek és útmutatók</h2>
        <span className="tp-headhint">{total} dokumentum — mindig csak a LEGFRISSEBB kiadás · csak szerkesztő módban látszik</span>
      </div>
      {groups.map((g) => (
        <div key={g.cim}>
          <h3 className="tp-gh">{g.cim} <span className="tp-gcount">{g.docs.length}</span></h3>
          <div className="it-docs">
            {g.docs.map((d) => (
              <div key={d.f} className="cc-card it-docwrap">
                <a className="it-doc" href={docHref(d.f)} target="_blank" rel="noreferrer">
                  <span className="it-doc-icon">{d.icon}</span>
                  <span className="it-doc-body">
                    <span className="it-doc-title">{d.title}</span>
                    <span className="it-doc-desc">{d.desc}</span>
                  </span>
                  <span className="it-doc-open">{d.f.endsWith('.pdf') ? 'megnyitás ↗' : 'letöltés ⤓'}</span>
                </a>
                <details className="it-doc-sum">
                  <summary>⚡ Rövid kivonat, kattintható linkekkel</summary>
                  {d.kivonat}
                </details>
              </div>
            ))}
          </div>
        </div>
      ))}
      {groups.length === 0 && <p className="tp-empty">Nincs a keresésnek megfelelő segédlet.</p>}
      <p className="tp-pv-hint">A kivonatok a dokumentumok tartalmából készültek; a teljes, hivatalos szöveghez az eredeti fájlt nyisd meg. A PDF-ek új lapon nyílnak, a pptx-ek letöltődnek. Régebbi kiadású segédletet nem tartunk kint — mindig az aktuális félévé érhető el.</p>
    </section>
  );
}
