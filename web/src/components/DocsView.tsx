'use client';

import { ReactNode } from 'react';
import { getEditKey } from '@/lib/editkey';

// 📚 Segédletek: belső útmutatók saját főmenü-fülként. Minden dokumentumhoz
// rövid, kattintható KIVONAT tartozik (a PDF-ekből kiolvasva, élő linkekkel),
// az eredeti fájl pedig továbbra is megnyitható/letölthető.
// CSAK szerkesztő módban érhető el (a /api/docs a kulcsot is ellenőrzi).

const ZOOM_FOGLALO = 'https://bkfhu-my.sharepoint.com/:x:/g/personal/pgulyas_metropolitan_hu/ESUkLjMEXw1NsLp3a3aov9wBJ9eoKJP5_AKh5oGpXIXDtw?rtime=9OHCOXOP2kg&CID=16E1F61A-7C9E-458A-B71D-917F42BD699B&wdLOR=cFA5A1416-ABC4-4FEE-8975-D97432BAE78B';

const L = ({ href, children }: { href: string; children: ReactNode }) => (
  <a className="doc-link" href={href} target="_blank" rel="noreferrer">{children}</a>
);
const M = ({ to, name }: { to: string; name: string }) => (
  <a className="doc-link" href={`mailto:${to}`}>{name}</a>
);

interface Doc { f: string; icon: string; title: string; desc: string; kivonat: ReactNode; }
interface DocGroup { cim: string; docs: Doc[]; }

const zoomKivonat = (
  <ol>
    <li>Fiók foglalása: <L href={ZOOM_FOGLALO}>Zoom foglalási táblázat (SharePoint)</L> — oktatásra a ZOOM01–ZOOM20 fiókok foglalhatók.</li>
    <li>Belépés: <L href="https://zoom.us">zoom.us</L> → Sign In · email: a foglalt fiók neve, pl. zoom07@metropolitan.hu · jelszó: Stream2020.</li>
    <li>Az órát a foglalótáblában lévő linkről indítsd, de CSAK belépés után él a link. New meetingnél legyen bepipálva a „Use My Personal Meeting ID".</li>
    <li>Ha belépéskor egyszer használatos kódot kér: <L href="https://zoomokt.metropolitan.hu/">zoomokt.metropolitan.hu</L> — itt jelenik meg a 6 számjegyű kód (10 percig érvényes).</li>
    <li>A kód-kérés elkerülhető a telepített klienssel: <L href="https://zoom.us/download">zoom.us/download</L>.</li>
    <li>Óra után: kijelentkezés a fiókból, az átállított beállítások visszaállítása; a fiókot ne nevezd át.</li>
  </ol>
);

const GROUPS: DocGroup[] = [
  {
    cim: '📹 Zoom — online órák és meetingek',
    docs: [
      {
        f: 'zoom-hasznalat.pdf', icon: '📹', title: 'Zoom: központi fiókok és foglalás',
        desc: 'ZOOM01–ZOOM20 fiókok foglalási rendje, belépés, személyes meeting-link indítása.',
        kivonat: zoomKivonat,
      },
      {
        f: 'zoom-utmutato.pdf', icon: '📹', title: 'Zoom használati útmutató (2024/25/2)',
        desc: 'Részletes lépések: kliens telepítése, óratartás, hibakezelés.',
        kivonat: (
          <ul>
            <li>Ugyanaz a folyamat képernyőképekkel, lépésről lépésre — hibakezeléssel együtt.</li>
            <li>Gyors linkek: <L href={ZOOM_FOGLALO}>foglalási táblázat</L> · <L href="https://zoom.us">zoom.us belépés</L> · <L href="https://zoomokt.metropolitan.hu/">egyszer használatos kód</L> · <L href="https://zoom.us/download">kliens letöltése</L>.</li>
          </ul>
        ),
      },
    ],
  },
  {
    cim: '📘 Oktatói segédletek és rendszerek',
    docs: [
      {
        f: 'fooallasu-oktatoi-segedlet.pdf', icon: '📘', title: 'Főállású oktatói segédlet (2024/25/2 · MKK)',
        desc: 'Adminisztráció, rendszerek, határidők — főállású oktatóknak.',
        kivonat: (
          <ul>
            <li>Kapcsolat: AMD tanszéki referens <M to="zsbejczi@metropolitan.hu" name="Bejczi Zsolt" /> · órarend és teremfoglalás (MKK) <M to="rkkalny@metropolitan.hu" name="Kálny Rita" /> · oktatásszervezési vezető <M to="tnagy@metropolitan.hu" name="Nagy Tünde" /> · többletórák <M to="pgulyas@metropolitan.hu" name="Gulyás Péter" />.</li>
            <li>Rendszerek: <L href="https://neptunweb1.metropolitan.hu/">Neptun</L> (jelenlét, jegyek, szakdolgozati konzultáció rögzítése) · <L href="https://coospace.metropolitan.hu/">CooSpace</L> (segédanyagok; a Neptun-belépés érvényes) · IT- és teremhiba-bejelentés: <L href="https://metu.topdesk.net/">metu.topdesk.net</L>.</li>
            <li>Wi-fi: „Metropolitan" hálózat, kód: 12348765.</li>
            <li>Óraelmaradás: lehetőleg 1 nappal előbb emailben a referensnek; a hallgatókat kizárólag Neptun-üzenetben lehet értesíteni, a pótlásról a referenst, tanszékvezetőt és szakvezetőt metus címről kell tájékoztatni.</li>
            <li>Módszertani konzultáció új oktatóknak (CLT): <M to="elukacsi@metropolitan.hu" name="Lukácsi Éva" />.</li>
            <li>Könyvtár: <L href="https://www.metropolitan.hu/hu/konyvtar#nyitvatartas">nyitvatartás</L> · <L href="https://www.metropolitan.hu/hu/adatbazisok">adatbázisok</L> · <L href="https://www.metropolitan.hu/foglalj-konyvtarost/">Foglalj könyvtárost</L> · <L href="https://corvina.metropolitan.hu/WebPac/CorvinaWeb">Corvina katalógus</L> · <M to="lib@metropolitan.hu" name="lib@metropolitan.hu" />.</li>
            <li>Fontos: munkatársi email-címet nem adunk ki hallgatónak; tanulmányi és pénzügyi kérdéssel a hallgató a Hallgatói Információs Központhoz fordul.</li>
          </ul>
        ),
      },
      {
        f: 'oraado-oktatoi-segedlet.pdf', icon: '📗', title: 'Óraadó oktatói segédlet (2024/25/2 · MKK)',
        desc: 'A legfontosabb tudnivalók óraadóknak: belépések, Neptun, teendők.',
        kivonat: (
          <ul>
            <li>Kapcsolat: AMD tanszéki referens <M to="zsbejczi@metropolitan.hu" name="Bejczi Zsolt" /> · órarend és teremfoglalás (MKK) <M to="rkkalny@metropolitan.hu" name="Kálny Rita" /> · oktatásszervezési vezető <M to="tnagy@metropolitan.hu" name="Nagy Tünde" />.</li>
            <li>Rendszerek: <L href="https://neptunweb1.metropolitan.hu/">Neptun</L> (jelenlét, jegyek rögzítése) · <L href="https://coospace.metropolitan.hu/">CooSpace</L> (segédanyagok, a Neptun-belépéssel).</li>
            <li>Zoom óratartáshoz: <L href={ZOOM_FOGLALO}>foglalási táblázat</L> · ha kódot kér: <L href="https://zoomokt.metropolitan.hu/">zoomokt.metropolitan.hu</L>.</li>
            <li>Óraelmaradás: előre jelezni emailben a referensnek; a hallgatókat kizárólag Neptun-üzenetben lehet értesíteni.</li>
            <li>Könyvtár: <L href="https://www.metropolitan.hu/hu/konyvtar#nyitvatartas">nyitvatartás</L> · <L href="https://www.metropolitan.hu/hu/adatbazisok">adatbázisok</L> · <L href="https://www.metropolitan.hu/foglalj-konyvtarost/">Foglalj könyvtárost</L> · <M to="lib@metropolitan.hu" name="lib@metropolitan.hu" />.</li>
          </ul>
        ),
      },
      {
        f: 'rendszerhasznalati-trening.pptx', icon: '🖥', title: 'Rendszerhasználati tréning (2024/25)',
        desc: 'Bemutató az egyetemi rendszerek használatáról (letölthető pptx).',
        kivonat: (
          <ul>
            <li>10 diás oktatói tájékoztató: Neptun, CooSpace, Zoom, videórögzítés és videotár — a képernyőmegosztás beállításaival és a tipikus Zoom-hibákkal („ne tegyük").</li>
            <li>Gyors linkek: <L href="https://neptunweb1.metropolitan.hu/">Neptun</L> · <L href="https://coospace.metropolitan.hu/">CooSpace</L> · <L href="https://zoom.us">zoom.us</L>.</li>
          </ul>
        ),
      },
    ],
  },
];

const norm = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function DocsView({ q }: { q: string }) {
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
        <span className="tp-headhint">{total} dokumentum · csak szerkesztő módban látszik, a publikus linken nem</span>
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
      <p className="tp-pv-hint">A kivonatok a PDF-ek tartalmából készültek; a teljes, hivatalos szöveghez az eredeti fájlt nyisd meg. A PDF-ek új lapon nyílnak, a pptx letöltődik.</p>
    </section>
  );
}
