'use client';

import { ReactNode, useState } from 'react';
import { getEditKey } from '@/lib/editkey';
import PageHead from './PageHead';

// 📚 Segédletek: belső útmutatók saját főmenü-fülként. CSAK a LEGFRISSEBB
// változatok érhetők el (a 2024/25-ös segédletek lekerültek). Minden
// dokumentumhoz lépésenkénti, kattintható KIVONAT tartozik (a PDF/pptx
// tartalmából kiolvasva, élő linkekkel), az eredeti fájl pedig továbbra is
// megnyitható/letölthető. CSAK szerkesztő módban (a /api/docs kulcsot ellenőriz).

const ZOOM_FOGLALO = 'https://bkfhu-my.sharepoint.com/:x:/g/personal/pgulyas_metropolitan_hu/ESUkLjMEXw1NsLp3a3aov9wBJ9eoKJP5_AKh5oGpXIXDtw?rtime=9OHCOXOP2kg&CID=16E1F61A-7C9E-458A-B71D-917F42BD699B&wdLOR=cFA5A1416-ABC4-4FEE-8975-D97432BAE78B';

const L = ({ href, children }: { href: string; children: ReactNode }) => (
  <a className="doc-link" href={href} target="_blank" rel="noreferrer">{children}</a>
);
// személy: NEM mailto - a Névjegyzéket nyitja ÚJ LAPON, a névre szűrve
// (a ?ts= kulcs átöröklődik, így az új fül is szerkesztő módban nyílik)
const personJump = (name: string) => {
  const p = new URLSearchParams();
  const k = getEditKey();
  if (k) p.set('ts', k);
  p.set('view', 'people');
  p.set('q', name);
  window.open(`${window.location.pathname}?${p.toString()}`, '_blank', 'noopener');
};
const P = ({ name }: { name: string }) => (
  <button type="button" className="doc-link doc-person" title={`${name} elérhetősége a Névjegyzékben (új lapon nyílik)`}
    onClick={() => personJump(name)}>☎ {name}</button>
);

interface Doc { f: string; icon: string; title: string; desc: string; kivonat: ReactNode; }
interface DocGroup { cim: string; docs: Doc[]; }

// 🔗 Gyakori linkek - a jobb oldali sáv tartalma: a leggyakrabban használt
// rendszerek, a szakos felületek és a foglalási kontaktok EGY helyen
interface QuickLink { ic: string; t: string; d?: string; href: string; }
interface QuickLinkGroup { cim: string; links: QuickLink[]; }
const QUICK_LINKS: QuickLinkGroup[] = [
  {
    cim: 'Rendszerek',
    links: [
      // a leggyakoribbak legelöl: mail, Neptun, CooSpace, tematika
      { ic: '📧', t: 'Outlook - levelezés', d: 'abalogh@metropolitan.hu', href: 'https://outlook.cloud.microsoft/mail/' },
      { ic: '🧾', t: 'Neptun - oktatói web', href: 'https://neptunweb1.metropolitan.hu/' },
      { ic: '🎓', t: 'CooSpace', d: 'belépés Neptun-azonosítóval', href: 'https://coospace.metropolitan.hu/' },
      { ic: '📄', t: 'Tematikák kitöltése', d: 'Neptun tematika-felület', href: 'https://neptun.metropolitan.hu/tematika/' },
      { ic: '🛠', t: 'TopDesk - IT- és teremhiba', href: 'https://metu.topdesk.net/' },
      { ic: '📖', t: 'MTMT', d: 'tudományos művek tára', href: 'https://www.mtmt.hu/' },
    ],
  },
  {
    cim: 'Zoom',
    links: [
      { ic: '📹', t: 'Zoom belépés', href: 'https://zoom.us' },
      { ic: '🔑', t: 'Egyszer használatos kód', d: 'zoomokt.metropolitan.hu', href: 'https://zoomokt.metropolitan.hu/' },
      { ic: '⬇', t: 'Zoom kliens letöltése', href: 'https://zoom.us/download' },
      { ic: '📅', t: 'Fiókfoglaló táblázat', d: 'SharePoint', href: ZOOM_FOGLALO },
    ],
  },
  {
    cim: 'Szak és social',
    links: [
      { ic: '🌐', t: 'metumediadesign.hu', d: 'szakos honlap', href: 'https://metumediadesign.hu/' },
      { ic: '💬', t: 'Discord - szakos szerver', href: 'https://discord.gg/KrmxpDS5T' },
      { ic: '👥', t: 'Facebook-csoport', href: 'https://www.facebook.com/groups/metumediadesign' },
      { ic: '📘', t: 'Facebook-oldal', href: 'https://www.facebook.com/metumediadesign' },
      { ic: '📷', t: 'Instagram', href: 'https://www.instagram.com/metumediadesign' },
      { ic: '🎵', t: 'TikTok', href: 'https://www.tiktok.com/@metumediadesign' },
    ],
  },
  {
    cim: 'Könyvtár',
    links: [
      { ic: '🕑', t: 'Nyitvatartás', href: 'https://www.metropolitan.hu/hu/konyvtar#nyitvatartas' },
      { ic: '🗄', t: 'Adatbázisok', href: 'https://www.metropolitan.hu/hu/adatbazisok' },
      { ic: '🧑‍🏫', t: 'Foglalj könyvtárost', href: 'https://www.metropolitan.hu/foglalj-konyvtarost/' },
      { ic: '🔎', t: 'Corvina katalógus', href: 'https://corvina.metropolitan.hu/WebPac/CorvinaWeb' },
    ],
  },
  {
    cim: 'Foglalás, kontakt',
    links: [
      { ic: '🎙', t: 'Hangstúdió foglalás', d: 'hapongor@gmail.com', href: 'mailto:hapongor@gmail.com' },
      { ic: '🎬', t: 'TV stúdió foglalás', d: 'infop.tvstudio@metropolitan.hu', href: 'mailto:infop.tvstudio@metropolitan.hu' },
      { ic: '🏫', t: 'Teremügyek', d: 'terem@metropolitan.hu', href: 'mailto:terem@metropolitan.hu' },
    ],
  },
  {
    cim: 'Segítség, jólét',
    links: [
      { ic: '💚', t: 'Életviteli tanácsadás', d: 'zaklatás, teher, krízis', href: 'https://www.metropolitan.hu/hu/eletviteli-tanacsadas' },
      { ic: '🧑‍⚕️', t: 'Életviteli Központ', d: 'Szabó Gábor · gszabo@metropolitan.hu', href: 'mailto:gszabo@metropolitan.hu' },
    ],
  },
];

const GROUPS: DocGroup[] = [
  {
    cim: '📹 Zoom - online órák és meetingek',
    docs: [
      {
        f: 'zoom-utmutato-2026-27.pdf', icon: '📹', title: 'Zoom használati útmutató (2026/27. ősz)',
        desc: 'Fiókfoglalás, belépés, óraindítás, hibakezelés - a hivatalos, aktuális útmutató.',
        kivonat: (
          <ol>
            <li>Fiók foglalása: <L href={ZOOM_FOGLALO}>Zoom foglalási táblázat (SharePoint)</L> - oktatásra a ZOOM01–ZOOM18 és a ZOOM20 fiókok foglalhatók (a ZOOM19 a távoktatásé).</li>
            <li>Belépés: <L href="https://zoom.us">zoom.us</L> → Sign In · email: a foglalt fiók neve, pl. zoom07@metropolitan.hu · jelszó: Stream2020.</li>
            <li>Az órát a foglalótáblában lévő linkről indítsd - a link CSAK belépés után él. New meetingnél legyen bepipálva a „Use My Personal Meeting ID".</li>
            <li>Ha belépéskor egyszer használatos kódot kér: <L href="https://zoomokt.metropolitan.hu/">zoomokt.metropolitan.hu</L> - itt a 6 számjegyű kód (10 percig érvényes).</li>
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
            <li>Dátum alapján keresd meg a kurzust; a Participants oszlop száma kattintható - felugró ablakban a résztvevők.</li>
            <li>Pipáld be a „Show unique users" opciót: egy-egy belépő idejét összesíti. Export gombbal csv-be menthető.</li>
            <li>A csv-t NE ikonról nyisd: Excel → Megnyitás → Tallózás → Szövegfájlok, tagolt elrendezés, határoló jel: vessző.</li>
          </ol>
        ),
      },
    ],
  },
  {
    cim: '📘 Oktatói segédletek - 2026/27. őszi félév',
    docs: [
      {
        f: 'fooallasu-oktatoi-segedlet-2026-27.pdf', icon: '📘', title: 'Főállású oktatói segédlet (2026/27/1 · MKK)',
        desc: 'Adminisztráció, rendszerek, határidők - főállású oktatóknak, aktuális kiadás.',
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
        desc: 'A legfontosabb tudnivalók óraadóknak - aktuális kiadás.',
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
            <li>10 diás oktatói tájékoztató: Neptun, CooSpace, Zoom, videórögzítés és videotár - a képernyőmegosztás beállításaival és a tipikus Zoom-hibákkal.</li>
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
            <li>Export: lista-nyomtatás VAGY naptár-export (Excel / .ics) - de ez az export változáskor NEM frissül.</li>
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
            <li>Speciális termek (TV stúdió, hangstúdió, műhelyek) CooSpace-en foglalhatók a kapcsolódó színtéren, technikussal - hangstúdió: <L href="mailto:hapongor@gmail.com">hapongor@gmail.com</L> · TV stúdió: <L href="mailto:infop.tvstudio@metropolitan.hu">infop.tvstudio@metropolitan.hu</L>.</li>
            <li>Infopark: a D épületi hangstúdió csak külön technikai vizsgával, az I épületi TV stúdió CSAK technikusi/oktatói felügyelettel használható.</li>
            <li>Tanulásra, online óra meghallgatására a tanulószobák valók: <L href="https://coospace.metropolitan.hu/CooSpace/Scene-75179/Folder-572245">CooSpace - Campusok, teremjelölések és tanulószobák</L>.</li>
            <li>Általános teremügyek: <L href="mailto:terem@metropolitan.hu">terem@metropolitan.hu</L>; gépterembe saját eszköz csatlakoztatható, de használat után az eredeti kábelezést vissza kell állítani.</li>
          </ol>
        ),
      },
    ],
  },
  {
    cim: '🎓 MTMT - tudományos és művészeti alkotások',
    docs: [
      {
        f: 'mtmt-tutorial-2026.pptx', icon: '🎓', title: 'MTMT: alkotások bevitele (2026, Művész Kar)',
        desc: 'Lépésről lépésre: hogyan rögzítsd műveidet az MTMT adatbázisban.',
        kivonat: (
          <ol>
            <li>Belépés: <L href="https://www.mtmt.hu/">mtmt.hu</L> → „Belépés az adatbázisba".</li>
            <li>Új → Saját közlemény; alkotásnál a mű/kiállítás CÍMÉT írd be (duplum-ellenőrzéshez), ha van webes link, az URL is megadható.</li>
            <li>Típus: Alkotás · Besorolás: a művészi terület (Tárgy / Kép / Tér stb.) · Jelleg: általában Művészi.</li>
            <li>Szerző: „Szerzők hozzáadása" → saját név beírása → a találatnál még egyszer beírva megjelenik az „Én vagyok" - e hozzárendelés NÉLKÜL az alkotás nem jelenik meg a saját felületeden.</li>
            <li>Kötelező mezők: Cím + Megjelenés éve (kiállításnál pontos dátum is lehet); ajánlott: műfaj/technika, helyszín, ország.</li>
            <li>Végén: „Mentés és nyilvánossá tesz" - csak így lesz látható a nyilvános felületen.</li>
            <li>Segítenek az MTMT referens könyvtárosok: <P name="Vargáné Nánási Mária" /> · <P name="Kissné Aftin Katalin" />; további segédletek az MTMT honlap Dokumentumok menüjében.</li>
          </ol>
        ),
      },
    ],
  },
  {
    cim: '⚖️ Jog és etika',
    docs: [
      {
        f: 'etikai-kodex-metu-2021.pdf', icon: '⚖️', title: 'METU Etikai Kódex (hatályos 2021. 09. 01-től)',
        desc: 'Az egyetem etikai szabályzata + gyakorlati kivonat: mit kell tudnia a szakvezetőnek, a fiatal oktatóknak, a hallgatóknak, és mit tegyél a tipikus hallgatói helyzetekben.',
        kivonat: (
          <>
            <p className="doc-note"><strong>Fontos elérhetőség.</strong> Zaklatás, megfélemlítés, pszichológiai teher, krízis: Életviteli Tanácsadó Központ, <P name="Szabó Gábor" /> pszichológus, <L href="mailto:gszabo@metropolitan.hu">gszabo@metropolitan.hu</L>. Segítségkérés / életviteli tanácsadás: <L href="https://www.metropolitan.hu/hu/eletviteli-tanacsadas">metropolitan.hu/hu/eletviteli-tanacsadas</L>. Etikai eljárást a főtitkár rendel el; bejelentés a rektorhoz / főtitkárhoz / szervezeti egység vezetőjéhez / az Életviteli Központ vezetőjéhez tehető, a tudomásszerzéstől 30 napon (legfeljebb az esettől 90 napon) belül. Névtelen bejelentésre nem indul eljárás; a rosszhiszemű, valótlan bejelentő maga is vétséget követ el (100). A számok a kódex pontjaira utalnak.</p>

            <p className="doc-note"><strong>Két vezérelv.</strong> (1) Az elsődleges út mindig a <strong>belső, békés megoldás</strong> (5/j, 8): négyszemközti beszélgetés, elvárás-tisztázás; formális eljárás csak valódi vétségnél, ha ez nem elég. (2) Válaszd el a <strong>szakmai-tartalmi kifogást</strong> (nem tetszik az óra, a módszer, szigorú a tanár) az <strong>etikai vétségtől</strong> (méltóságsértés, favoritizmus, zaklatás, csalás). A szakmait óralátogatással, oktatóértékeléssel, képzésfejlesztéssel kezeld, nem etikai eljárással.</p>

            <p className="doc-sec">1 · A SZAKVEZETŐNEK (a legfontosabbak)</p>
            <ol>
              <li><strong>Konzultáció csak hivatalos helyen.</strong> Hallgatóval személyes megbeszélés kizárólag az egyetem kijelölt helyszínén; eltérni csak rendkívül indokolt esetben, a tanszék-/intézetvezető ELŐZETES ÍRÁSBELI hozzájárulásával lehet - ezt te adod, kérd írásban (22/m).</li>
              <li><strong>Összeférhetetlenség.</strong> Rokon/barát/konfliktusban álló, vagy oktató-hallgató párkapcsolat esetén nem szabad vizsgáztatni: az oktató jelezze feléd, te más vizsgáztatót jelölsz; az információt szigorú titoktartással kezeld (23, 25). Saját rokonod/barátod ügyében te is vond ki magad a döntésből (7).</li>
              <li><strong>Számonkérés tisztasága.</strong> A vizsgakövetelmény a félév elején nyilvános; csak a meghirdetett tananyag kérhető számon (különben súlyos vétség); szóbelin harmadik személy jelen; elfogult oktató (pozitív VAGY negatív) nem vizsgáztathat; a jegy név szerint nem nyilvános (33-34).</li>
              <li><strong>Nincs anyagi/magán haszon.</strong> Saját mű szakmai indok nélküli megvétetése, a jegy anyagi haszonhoz kötése, ajándék jó jegyért, a hallgató magáncélú dolgoztatása mind vétség (5/g, 22/l, 34/c-d, 80).</li>
              <li><strong>Vezetői magatartás.</strong> Ne élj vissza az alá-fölérendeltséggel; biztosíts esélyegyenlőséget és nyilvánosságot (kurzusok, lehetőségek elosztása egységes szempontból); a problémák belső megoldását segítsd; ne tüntesd fel rossz színben a beosztottakat, és lépj fel a sértő megnyilvánulások ellen, a passzivitás is mulasztás (5/d, 6-9).</li>
              <li><strong>Panasz kezelése.</strong> Gyors, pontos tájékoztatás; ha nem a te hatásköröd, mondd meg, ki jár el; zaklatást az Életviteli Központhoz irányíts, a bizonyítékokat őrizzétek meg (18, 68-70). A jóhiszemű bejelentőt védd, a megvádolt jogait is tartsd tiszteletben (71).</li>
            </ol>

            <p className="doc-sec">2 · A FIATAL / KEZDŐ OKTATÓKNAK, LEKTOROKNAK</p>
            <ol>
              <li><strong>Tanár, nem haver.</strong> A hallgatókkal a felelős tanári szerep szerint; a magánélet elkülönítve, a hallgató magánélete tiszteletben (22/h-k).</li>
              <li><strong>Nincs tanár-diák bulizás mint viszony.</strong> Tanulmányon kívül (szórakozás, sport) is tilos a zaklatás, megfélemlítés, nyugalom megzavarása; a viccnek szánt, személyre menő megjegyzés is zaklatás (55, 67, 74).</li>
              <li><strong>Felnőttként, a nevén szólítsd.</strong> Becézés, gügyögés, gúnynév a méltóságot sérti (67); a kommunikáció legyen választékos, igényességben példamutató (32/g).</li>
              <li><strong>Csak hivatalos helyen konzultálj</strong> - kávézó, lakás, közösségi tér NEM az, vezetői írásos engedély nélkül (22/m).</li>
              <li><strong>Pontosság.</strong> Az órát magad tartsd meg, időben, felkészülten, az alkalomhoz illő öltözetben; a meghirdetett tananyagot add le, a változásról tájékoztass; helyettesítés csak igazolt esetben, pl. betegség (32).</li>
              <li><strong>Semmilyen előny.</strong> Jó jegyért/pozícióért ne kérj/fogadj el anyagi, szexuális vagy más szolgáltatást; hallgatót magáncélra ne dolgoztass; a hallgató munkáját ne tüntesd fel sajátodként (5/g, 22/l, 38).</li>
            </ol>

            <p className="doc-sec">3 · A HALLGATÓK ETIKAI KÓDEXE (röviden)</p>
            <ol>
              <li><strong>Tisztességes teljesítés.</strong> Önálló munka, meg nem engedett segédeszköz és külső segítség nélkül; vizsgán tilos a tankönyv, jegyzet, mobil, a feladatsor fotózása (52-53).</li>
              <li><strong>Plágium tilalma.</strong> Más gondolatát hivatkozással; a megjelölés nélküli átemelés (netről, más dolgozatából) plágium (50).</li>
              <li><strong>Egymás segítése.</strong> Tilos más munkáját megrongálni, visszatartani, adatait törölni, információhoz jutását akadályozni (54).</li>
              <li><strong>Képmás- és személyiségi jog.</strong> Kép-/hangfelvétel készítése és megosztása csak az érintett hozzájárulásával (51).</li>
              <li><strong>Tisztelet mindenhol.</strong> Órán és azon kívül is tilos a zaklatás, megfélemlítés, rendbontás; a véleményezés legyen tisztességes, elfogulatlan; valótlan rossz hír keltése (megtévesztés) vétség (55-56, 75-76).</li>
              <li><strong>Megjelenés, alkalmazkodás.</strong> Felkészülten, az alkalomhoz illő ruhában; a külföldi hallgatók a hazai normákhoz alkalmazkodnak (48, 57).</li>
            </ol>

            <p className="doc-sec">4 · MIT TEHET, MIT NEM TEHET</p>
            <p className="doc-note"><strong>Az OKTATÓ TEHETI:</strong> meghatározza a tananyagot és a módszert, világnézete szerint tanít a hallgató kényszerítése nélkül (31); előre közli a számonkérés szintjét (33); kötelezettséget csak tanulmányi ügyben ír elő (22/d); külső munkát vállal, ha az Egyetemet nem sérti (22/e); elvárhatja a tisztességes munka feltételeit és a továbbképzést (27/b-c) és a saját méltósága tiszteletét (4).</p>
            <p className="doc-note"><strong>Az OKTATÓ NEM TEHETI:</strong> nem alázza/gúnyolja/becézgeti le a hallgatót, nem értékeli bántóan a személyét (22/a-b, 67); konzultáció csak hivatalos helyen (22/m); nem dolgoztat magáncélra (22/l); nincs előny/ajándék jó jegyért (5/g, 80); saját művet nem tesz kötelezővé, a jegyet nem köti haszonhoz (34/c-d); elfogultan nem vizsgáztat, akár pozitív akár negatív (34/f); nem kér számon nem meghirdetett anyagot (34/a); párkapcsolatnál nem dönt a hallgatóról (25); nem plagizál/hamisít (38); a jegyet nem teszi név szerint nyilvánossá (34/j).</p>
            <p className="doc-note"><strong>A HALLGATÓ TEHETI:</strong> becsületesen felkészül és teljesít (41); kérheti az értékelés indoklását és a kijavított dolgozat megtekintését (34/i); tisztességesen véleményt nyilvánít, pl. oktatóértékelés (56); jogsérelemnél panasszal él (Alapelvek 9), a döntés ellen jogorvoslatot kér (110); a róla készült felvétel az ő hozzájárulásához kötött (51).</p>
            <p className="doc-note"><strong>A HALLGATÓ NEM TEHETI:</strong> nincs meg nem engedett segédeszköz, puskázás, vizsgafotózás (52-53); nincs plágium (50); nem rongálja/tartja vissza más munkáját, nem törli adatait (54); nincs engedély nélküli kép-/hangfelvétel (51); nincs zaklatás, megfélemlítés, rendbontás órán és azon kívül (55); nincs megtévesztés/valótlan hivatkozás (76) és az Egyetem/oktató valótlan rossz hírének keltése (75).</p>

            <p className="doc-sec">5/A · ELÉGEDETLENSÉG, ELVÁRÁS, TÚLTERHELÉS</p>
            <ul className="doc-situ">
              <li><strong>„Beszól, problémázik, akadékoskodik az órán."</strong> Higgadtan, a méltóságát tiszteletben tartva; hívd négyszemközti beszélgetésre (hivatalos helyen). Kölcsönös tisztelet elvárás tőled is, tőle is (4, 62); a rendbontás az ő oldalán vétség lehet (55).</li>
              <li><strong>„Fizető vagyok, jár nekem / követelőzik."</strong> A fizetés a képzésre jogosít, nem a szabályok felrúgására; a viszonyt szerződés köti, amit mindkét fél tisztel (Alapelvek 6). Tereld vissza a konkrét, kezelhető problémára.</li>
              <li><strong>„Unalmas / túl szigorú / rossz a módszere, nem így kéne tanítani."</strong> Szakmai, nem etikai ügy: az oktatót megilleti a tananyag és a módszer megválasztása, a szigorúság önmagában nem vétség (31). Irányítsd az oktatóértékelés (OMHV) csatornájába (56); kezeld óralátogatással, nem eljárással.</li>
              <li><strong>„Aránytalanul sok a munka a kredithez képest, két tárgy egy hétre kér leadást."</strong> A követelménynél kerülni kell a szélsőségeket, figyelembe kell venni a kreditértéket és a párhuzamos tárgyakat (34/b); a cél a hatékony elsajátítás, nem a rostálás (30). Egyeztess az oktatóval, a torlódást szak szintjén hangold össze (8). Rendszerszintűnél képzésfejlesztési teendő.</li>
              <li><strong>„A vizsgán olyan volt, ami sosem hangzott el / a tematikában sem szerepelt."</strong> Súlyos vétség, ha bizonyítható: nem a meghirdetett tananyagot kérte számon (34/a). Kérd be a félév eleji tematikát és a vizsgaanyagot, vesd össze; ha eltér, jegykorrekció/pótlás, ismétlődésnél etikai bejelentés (97).</li>
              <li><strong>„Félév közben átírta, mi kell az ötöshöz / sosem tudtuk, mi lesz a vizsgán."</strong> A követelményt a félév elején közzé kell tenni, utólag nem meredekíthető, egységes szempontból kell értékelni (33, 34/a, 34/h). Kérd a kiírt, stabil követelményt és értékelési rendet.</li>
              <li><strong>„A célom, hogy a gyengék kihulljanak" (szándékos túlszigor)."</strong> A követelménynél tilos a szélsőség (34/b), az oktató a hatékony elsajátítást segítse (30), és vegye figyelembe az egyéni képességet (32/f). A magas mérce önmagában nem vétség, a szándékos, aránytalan szigor igen.</li>
              <li><strong>„Nem mutatja meg a dolgozatom, nem indokolja a jegyet."</strong> A hallgató kérésére az értékelést indokolni kell, a kijavított munkát megmutatni, a helyes választ közölni (34/i); az értékelés egységes, elfogulatlan (34/h). Itt a hallgató jogos igényét gyakorolja, a megtagadás az oktató oldalán kifogásolható.</li>
              <li><strong>„Kettesben, tanú nélkül vizsgáztatott."</strong> Szóbelin a vizsgázón kívül másnak is jelen kell lennie (34/e); ez a hallgatót és az oktatót is védi (favoritizmus- és zaklatásgyanú megelőzése). Kérd az oktatóktól a betartását.</li>
            </ul>

            <p className="doc-sec">5/B · MÉLTÓSÁG: BECÉZÉS, GÚNY, MEGALÁZÁS</p>
            <ul className="doc-situ">
              <li><strong>„Az oktató lekicsinylő beceneveken szólítja a felnőtt hallgatókat (»Ingyom Binyomkám«, »Darás Kám«), gyerekként kezeli őket."</strong> Ez az egyéni tulajdonság kifigurázása és lealacsonyító megszólítás, amit a 67 akkor is tilt, ha kedveskedésnek szánták. Beszélj négyszemközt az oktatóval, nevezd meg a viselkedést, kérd a rendes, felnőttként való megszólítást; dokumentáld, ismétlődésnél formális út (67, 22/b, 4).</li>
              <li><strong>„Gügyögő, óvodás hangnem: »na, ügyes kislány«, »csináltuk szépen a kis feladatot«."</strong> A kommunikáció legyen választékos, igényességben példamutató (32/g); a gügyögés a felnőtt hallgató méltóságát csorbítja, tiszteletlen (62). Belső, békés korrekció, ha egyszeri és javítható.</li>
              <li><strong>„»Kedvességből« csinálom, a hallgatók se bánják, jó a hangulat" (védekezés)."</strong> A 67 egyértelmű: a lealacsonyítás akkor is méltóságsértő, ha szeretetnek szánták, és a vélt beleegyezés sem menti; egyetlen zavart hallgató is elég ok a leállításra (4). A cél a viselkedés megszüntetése, nem a szándék bizonyítása.</li>
              <li><strong>„Az oktató a MUNKÁT keményen bírálja: »ez a terv így nem működik, dolgozd át«."</strong> Ez az oktató JOGA, nem etikai ügy, amíg a munkára irányul (31). A 22/b csak a SZEMÉLY bántó minősítését tiltja; ha valóban a projektről szólt, magyarázd el a hallgatónak a különbséget.</li>
              <li><strong>„A SZEMÉLYT minősíti: »belőled sosem lesz designer«, »reménytelen eset vagy«."</strong> Ez már a személy bántó értékelése (22/b), sérti a méltóságot (32/f), nem szakmai visszajelzés. Kérd, hogy a kritika a munkára, konkrét, fejleszthető formában irányuljon; a hallgató panaszt tehet, kísérd végig.</li>
              <li><strong>„Nyilvánosan, gúnyos kommentárral olvassa fel és nevetteti ki a gyengébb munkákat."</strong> A nyilvános kifigurázás méltóságsértés (67), az értékelés egységes és elfogulatlan kell legyen (34/h), a jegy név szerint nem nyilvános (34/j). Kérd a tárgyilagos, nem megszégyenítő visszajelzést.</li>
              <li><strong>„A gúnynevet a csoport is átveszi, a hallgató kirekesztve érzi magát."</strong> A megszégyenítő, ellenséges környezet zaklatás (66-67), szakvezetőként az 5/d kötelez a fellépésre. Állítsd le az oktatónál és a csoportban is, dokumentáld; ha nem szűnik, formális út.</li>
              <li><strong>„A gúny védett tulajdonságra utal: »a mi kis dundink«, »a süket«, az akcentusára."</strong> Ha a sértés védett tulajdonsághoz kötődik (64), az már súlyos vétség és zaklatás (63, 66), amit a „vicc" nem enyhít (67). A belső korrekció mellett tájékoztasd a hallgatót a bejelentési útról (Életviteli Központ, 68); a hallgatásod mulasztás.</li>
              <li><strong>„Az oktató a kollégáit / a tanszéket becsmérli a hallgatók előtt."</strong> Nem tehet munkatársra/az Egyetemre lekicsinylő, bántó megjegyzést (22/a), és vissza kell utasítania mások erre való törekvését (5/m). Négyszemközt jelezd a kollegialitás követelményét; ismétlődő becsmérlés vétség.</li>
            </ul>

            <p className="doc-sec">5/C · FAVORITIZMUS, EGYENLŐ BÁNÁSMÓD</p>
            <ul className="doc-situ">
              <li><strong>„Felfelé húzza a »tehetséges« kedvenc jegyét, pedig a beadott munka nem indokolja."</strong> A POZITÍV elfogultság ugyanúgy tilos, mint a negatív, az elfogult oktató nem vizsgáztathat (34/f); a jegy a benyújtott teljesítményt tükrözze, egységes szempontból (34/h). Kollegiális beszélgetés, ismétlődésnél etikai ügy.</li>
              <li><strong>„A kedvenceit dicséri, a többieket lenézi: »a ti munkátok ránézésre is amatőr«."</strong> A jó munka dicsérete legitim, DE a többiek bántó minősítése tilos (22/b), és sérti a kölcsönös tiszteletet (62). Kérd, hogy a visszajelzés mindenkire terjedjen ki, és a munkára irányuljon.</li>
              <li><strong>„Egy fogyatékos / sajátos igényű hallgató több időt, segítséget kap - a többiek »kivételezést« kiáltanak."</strong> Ez NEM favoritizmus, hanem a 32/f által KÖTELEZŐEN előírt legitim differenciálás (egyéni képesség, fogyatékosság figyelembevétele). Magyarázd el, hogy jogszerű és kötelező; az értékelés szempontrendszere ettől mindenkire egységes marad (34/h).</li>
              <li><strong>„Mindig ugyanazokat válogatja be versenyre, kiállításra, megbízásra, a többiek nem is hallanak a lehetőségről."</strong> A lehetőségek elosztása legyen átlátható, egységes szempontú; a tartós szimpátia-alapú válogatás sérti az 5/a-t és az 5/e-t. Kérd a kritériumok és a lehetőségek nyilvánossá tételét, hogy mindenki azonos eséllyel jelentkezhessen.</li>
              <li><strong>„Egy csoportot (nemzetiség, nem) rendszeresen hátrébb sorol, rosszabbul értékel."</strong> Ez már védett tulajdonság szerinti hátrányos megkülönböztetés, SÚLYOS vétség (63-64), az 5/a is tiltja. Rögzítsd a konkrét eseteket; a súlyosság miatt a belső egyeztetés mellett indokolt a formális bejelentés a főtitkárhoz (97).</li>
              <li><strong>„Ismerős / volt kolléga gyereke van a csoportban, és feltűnően kedvezőbb elbírálást kap."</strong> Az 5/a tiltja az ismeretségen alapuló előnyös elbírálást; rokoni/baráti kapcsolatnál ez összeférhetetlenség (23). Az oktató jelezze, te más vizsgáztatót jelölsz az érintett hallgató értékelésénél.</li>
              <li><strong>„Ajándékot / szívességet ajánlanak jó jegyért, vagy az oktató céloz rá."</strong> Vissza kell utasítani minden döntésbefolyásoló előnyt, jegyért szolgáltatás nem adható/kérhető, a számonkérés haszonhoz kötése vétség (5/g, 80, 34/d). Dokumentáld; ha az oktató kezdeményezte, súlyos, formális bejelentést indokol.</li>
              <li><strong>„Szakvezetőként észreveszem: magam is a kedvenc oktatómnak adom a legjobb kurzusokat/órarendet."</strong> Kötelező a beosztottak teljes esélyegyenlősége és a nyilvánosság (7/a); tilos a döntéshozói pozícióval való visszaélés a kedvezmények elosztásánál (7). Alakíts ki átlátható, egységes szempontokat, hogy ne szimpátia döntsön (5/a). Ez vezetői önvizsgálat.</li>
            </ul>

            <p className="doc-sec">5/D · BETEGSÉG, FOGYATÉKOSSÁG, MÉLTÁNYOSSÁG, KRÍZIS</p>
            <p className="doc-note">A méltányosság az ALAPÉRTELMEZETT: a fogyatékosság és egészségi állapot védett tulajdonság (64), figyelembevételük kötelező (32/f). A konkrét igazolási / halasztási / mentesítési ELJÁRÁST nem a kódex, hanem a TVSZ rendezi - oda (Tanulmányi Osztály) irányíts. A határ a valótlan hivatkozásnál van (megtévesztés, 76), de azt pártatlan eljárás állapítja meg, nem a te egyszemélyi ítéleted (Alapelvek 10).</p>
            <ul className="doc-situ">
              <li><strong>„Belázasodtam, hadd tegyem le később a vizsgát."</strong> A támogató fogadtatás és az egyéni helyzet figyelembevétele kötelező (22/c, 32/f). Az igazolás és a halasztás feltételeit a TVSZ rendezi - irányítsd az orvosi igazolás leadására és a Tanulmányi Osztályhoz.</li>
              <li><strong>„Diszlexiám / mozgáskorlátozottságom van, sajátos vizsgakörülményt kérek."</strong> A fogyatékosság figyelembevétele kötelező (32/f), védett tulajdonság (64), a mérlegelés megtagadása közvetett diszkrimináció lehet (65). Segítsd a hivatalos igény benyújtását, egyeztess az oktatóval a kivitelezésről; gyakorlati feladatnál keress szakmailag egyenértékű alternatívát (30).</li>
              <li><strong>„Az oktató: »nálam mindenki egyformán vizsgázik, nincs kivétel«."</strong> Az egyenlő bánásmód nem azonos a formális egyformasággal; a fogyatékosság figyelembevétele kötelesség (32/f), a megtagadása közvetett diszkrimináció (63-65). Belső párbeszéddel ismertesd a kötelezettséget; ha nem enged, jelezd az illetékesnek, és biztosítsd, hogy a hallgató ne károsodjon.</li>
              <li><strong>„Nem bírom tovább, pánikrohamaim vannak / önveszélyre utaló jelzés."</strong> Vedd komolyan, ne hagyd magára; a lelki egészség védelme alapelv (Alapelvek 3, 8). A pszichológiai segítés nem a te feladatod: sürgősen irányítsd az Életviteli Központhoz (Szabó Gábor, gszabo@metropolitan.hu, 68, 71). A tanulmányi következményt párhuzamosan intézd a Tanulmányi Osztállyal; az információt bizalmasan kezeld (5/i).</li>
              <li><strong>„Várandós vagyok, a szülés a vizsgaidőszakra esik."</strong> A terhesség, anyaság, apaság védett tulajdonság, emiatt hátrány diszkrimináció (64). Fogadd támogatóan (22/c), biztosítsd az egyéni helyzet figyelembevételét (32/f); a halasztás/egyéni tanrend eljárása a TVSZ szerint megy.</li>
              <li><strong>„Az oktató nyilvánosan indokol egészségi adattal: »X azért kap haladékot, mert beteg«."</strong> Az egészségi állapot bizalmas, fokozott védelem alatt (5/i), a magánéletet tiszteletben kell tartani (22/i), a jegy sem lehet név szerint nyilvános (34/j). Kérd, hogy a méltányosságot soha ne indokolja mások előtt egészségügyi adattal; a diagnózist ne is kérdezze, elég a kedvezmény ténye.</li>
              <li><strong>„Már harmadszor kér halasztást betegségre, igazolás nélkül" (gyanú a visszaélésre)."</strong> A méltányosság alapértelmezett, de a rendszeres, alá nem támasztott hivatkozás megtévesztés lehet (76). Kérd a TVSZ szerinti hivatalos igazolást, dönts tárgyilagosan, indokolatlan előny/hátrány nélkül (5/a); ne bélyegezd meg gyanú alapján (Alapelvek 10), de a becsületesek se járjanak rosszabbul (34/g).</li>
              <li><strong>„Az oktató betegen is bemenne levezetni a vizsgát."</strong> Az oktató csak akkor dolgozzon, ha testi-lelki egészsége engedi (22/j); a betegség igazolt eset, amikor a helyettesítés rendben van (32/a). Gondoskodj helyettes vizsgáztatóról vagy új időpontról.</li>
            </ul>

            <p className="doc-sec">5/E · CSALÁS, PLÁGIUM, VIZSGAREND</p>
            <ul className="doc-situ">
              <li><strong>„Hivatkozás nélküli szövegátemelés a beadandóban: »az internetről vettem, mindenki így csinálja«."</strong> A hivatkozás nélküli átemelés plágium, akár tudatos, akár nem (50), sérti a becsületes munkát (41, 49). Elsőként pedagógiai úton: ismertesd a szabályt, adj lehetőséget a javításra; szándékos, ismételt vagy nagy terjedelmű plágiumnál etikai bejelentés.</li>
              <li><strong>„A zárthelyin telefont használ / lefotózza a feladatsort: »csak az órát néztem«."</strong> Vizsgán tilos a mobil és a feladatsor fotózása (53), a meg nem engedett segédeszköz vétség (52). Az oktató dokumentálja; ügyelj, hogy a becsületesek ne károsodjanak (34/g). Ismételt/súlyos csalásnál etikai bejelentés.</li>
              <li><strong>„Hamis igazolással / valótlan indokkal próbál halasztást szerezni."</strong> Aki valótlanságot valóságként tüntet fel, megtévesztést követ el (76); a hallgatótól becsületes eljárás várható (41). Szembesítsd a tényekkel, adj lehetőséget a tisztázásra; szándékos, dokumentált hamisításnál etikai bejelentés.</li>
              <li><strong>„Egy hallgató szándékosan letörli / elrejti a társa munkáját, hogy ártson."</strong> Más munkájának megváltoztatása, megsemmisítése, adatai törlése etikai vétség (54), akárcsak a tulajdon megkárosítása (74). Dokumentáld a kárt; ez valódi vétség, a helyreállítás mellett etikai bejelentés indokolt.</li>
            </ul>

            <p className="doc-sec">5/F · OKTATÓI KÖTELESSÉGSZEGÉS, VISSZAÉLÉS</p>
            <ul className="doc-situ">
              <li><strong>„Az óraadó rendszeresen késik, asszisztenst küld maga helyett, vagy elmarad az óra."</strong> Az oktató köteles az óráját maga, késés nélkül, hiánytalanul megtartani, helyettesítés csak igazolt esetben (32/a-c). Négyszemközt beszéld meg, kérd a pótlást; ha rendszeres és nem javul, jelezd feljebb.</li>
              <li><strong>„Szakmai indok nélkül megvéteti a saját könyvét: »különben nem ír alá«."</strong> A saját mű szakmai indok nélküli megvétetése vétség (34/c), a számonkérés haszonhoz kötése tilos (34/d). Kérdezz rá a szakmai indokra és az ingyenes/könyvtári alternatívára; ha a vásárlás a jegy feltétele, egyértelmű vétség, tegyél bejelentést.</li>
              <li><strong>„A hallgatóival a saját magáncége projektjén dolgoztat ingyen, »gyakorlat« címén."</strong> Magáncélú munkavégzésre nem késztetheti őket (22/l), külső munkát csak az Egyetem érdekét nem sértve vállalhat (22/e), helyzetét személyes előnyre nem használhatja (22/f). Tisztázd, valódi kreditált tananyag-e; ha magánmegbízás, állítsd le.</li>
              <li><strong>„Párkapcsolatban van egy általa tanított és vizsgáztatott hallgatóval."</strong> Az összeférhetetlenség akkor áll fenn, ha a kapcsolat révén torzul egy döntés; az oktató köteles jelezni feléd, te gondoskodsz róla, hogy ne dönthessen a partneréről (25, 23). A vétség nem a kapcsolat léte, hanem az eltitkolása. Az információt szigorú titoktartással kezeld.</li>
              <li><strong>„A hallgató tervét a saját nevén, a hallgató feltüntetése nélkül publikálja / állítja ki."</strong> Más munkáját sajátjaként feltüntetni súlyos vétség (38), a közreműködőnek legalább köszönet jár (36), és a helyzetét személyes előnyre nem használhatja (22/f). Tisztázd a szerzőséget, kérd a nevesítést vagy a mű visszavonását.</li>
              <li><strong>„Politikai / világnézeti nézeteit sulykolja, és a jeggyel nyomást gyakorol."</strong> A maga világnézete szerint taníthat, de a hallgatót annak elfogadására nem kényszerítheti (31), a véleményét mások jogát nem sértve gyakorolja (5/f). A jegy politikai egyetértéstől függővé tétele tiltott megkülönböztetés (5/a); ha a jeggyel való nyomás igazolódik, valódi etikai ügy.</li>
            </ul>

            <p className="doc-sec">5/G · ZAKLATÁS, KIKÖZÖSÍTÉS, ADATVÉDELEM, HÍRNÉV</p>
            <ul className="doc-situ">
              <li><strong>„Az oktató külön hívta, kellemetlen / szexuális színezetű volt a helyzet."</strong> Ez a zaklatás gyanúja, kiemelt ügy. NE bagatellizáld: irányítsd az Életviteli Központhoz (Szabó Gábor, gszabo@metropolitan.hu), őrizzétek meg a bizonyítékokat (dátum, hely, tanúk, üzenetek). Az Egyetem a jóhiszemű bejelentőt védi (66-72). A hivatalos-hely szabály megsértése önmagában is jelzés (22/m).</li>
              <li><strong>„A csoporttársak kiközösítenek, egy tulajdonsága miatt csúfolnak, akár online: »csak vicc volt«."</strong> Órán és azon kívül is tilos a zaklatás, megfélemlítés (55, 74); a méltóságot sértő, tulajdonságot kifiguráző megjegyzés akkor is zaklatás, ha viccnek szánták (66-67). Állítsd le, tájékoztasd a bejelentési útról (68); súlyos/tartós esetben valódi vétség.</li>
              <li><strong>„Egy hallgatóról / óráról készült felvétel engedély nélkül kerül közösségi médiába."</strong> Kép-/hangfelvétel csak az érintett hozzájárulásával készíthető és osztható meg (51); a személyiségi jogot fokozott védelem illeti (5/i). Kérd az eltávolítást és a hozzájárulás tisztázását; szándékos, engedély nélküli közzététel vétség.</li>
              <li><strong>„Az oktató név szerint, nyilvánosan bemondja a jegyeket / a bukást."</strong> A név és a jegy összekapcsolva, hozzájárulás nélkül nem lehet nyilvános (34/j); a személyes adatot fokozott védelem illeti (5/i). Kérd a jegyek zárt, nevek nélküli közlését.</li>
              <li><strong>„Egy hallgató a neten bizonyíték nélkül azt állítja, hogy egy oktató korrupt."</strong> A bizonyíték nélküli, valótlan, gyanúsító híresztelés súlyos vétség (75), és a kódex a hírnevet érintő, Egyetemen kívüli magatartásra is kiterjed (2). Válaszd el a jogos kritikát (56) a valótlan híreszteléstől, kérd a helyreigazítást; megalapozott panaszra a hivatalos csatorna, súlyos rágalomnál etikai bejelentés.</li>
              <li><strong>„Diszkriminációt érez (nem, származás, vallás, fogyatékosság, életkor)."</strong> Súlyos vétség a közvetlen és a közvetett hátrányos megkülönböztetés is (63-65). Bejelentési út a szokásos, a bizonyítékok megőrzésével.</li>
            </ul>

            <p className="doc-sec">5/H · HOGYAN JÁR EL A SZAKVEZETŐ</p>
            <ul className="doc-situ">
              <li><strong>Panasz / bejelentés útja.</strong> A bejelentés a rektorhoz / főtitkárhoz / szervezeti egység vezetőjéhez / az Életviteli Központhoz tehető; az eljárást a főtitkár rendeli el (91, 97). Szervezeti egység vezetőjeként te is fogadhatsz bejelentést és továbbíthatod. Konkrét legyen: név, hely, idő, körülmény, bizonyíték (99).</li>
              <li><strong>Határidő.</strong> A tudomásszerzéstől 30 napon belül, de legfeljebb az esettől 90 napon belül; névtelen bejelentésre nem indul eljárás; a bejelentő adatait bizalmasan kezelik (98, 100).</li>
              <li><strong>Zaklatási bejelentés.</strong> Az Életviteli Központ vezetője (Szabó Gábor, gszabo@metropolitan.hu) fogadja; rögzítsd a dátumot, helyet, tanúkat, őrizzétek a bizonyítékokat (68-69). Kísérd a hallgatót ehhez a csatornához, garantáld a bizalmas kezelést és a megtorlás-mentességet (71).</li>
              <li><strong>Rosszhiszemű vád.</strong> Aki valótlan, rosszhiszemű bejelentéssel indít eljárást más ellen, maga is vétséget követ el (100). Vedd komolyan a panaszt, de a megvádolt jogait is tartsd tiszteletben, ne ítélj pártatlan eljárás előtt (10, 71); csak konkrét, alátámasztott bejelentést továbbíts.</li>
              <li><strong>Jogorvoslat.</strong> A döntés ellen a hallgató a Hallgatói Jogorvoslati Bizottsághoz, az oktató a munkáltatói jogkör gyakorlójához fordulhat, a kézhezvételtől 15 napon belül, írásban; a kérelemnek halasztó hatálya van (110-112). Tájékoztasd az érintettet erről.</li>
            </ul>
            <p className="doc-note"><strong>Aranyszabály (Alapelvek 2, 9-10):</strong> úgy bánj mindenkivel, ahogy elvárnád, hogy veled bánjanak; mindenki panasszal élhet, ha jogsérelmet érez; és pártatlan eljárás nélkül senkit nem szabad elítélni, a bepanaszolt oktató jogait is tartsd tiszteletben, amíg a tények tisztázódnak. A teljes szabályzat a fenti PDF-ben.</p>
          </>
        ),
      },
    ],
  },
];

const norm = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// „Napi indítás": a rendszeresen használt felületek EGY kattintással. Az OUTLOOK kerül
// előtérbe (utoljára nyílik + fókusz), a többi csak új háttér-lapon nyílik meg.
const DAILY_OUTLOOK = 'https://outlook.cloud.microsoft/mail/';
const DAILY_OTHERS = [
  'https://neptunweb1.metropolitan.hu/',   // Neptun
  'https://coospace.metropolitan.hu/',     // CooSpace
  'https://discord.gg/KrmxpDS5T',          // Discord - szakos szerver
  'https://metumediadesign.hu/',           // szak weboldala
];
export default function DocsView({ q }: { q: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [linkNote, setLinkNote] = useState<string | null>(null);
  // Foglalás/kontakt tétel: kattintásra az email-cím a VÁGÓLAPRA (a mailto helyett)
  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(email);
      window.setTimeout(() => setCopied((c) => (c === email ? null : c)), 1600);
    } catch { if (typeof window !== 'undefined') window.location.href = `mailto:${email}`; } // régi böngésző: marad a levélíró
  };
  // 🚀 Napi indítás: előbb a többi felület (Neptun, CooSpace, Discord, szak weboldal), és az
  // OUTLOOK UTOLJÁRA + fókusz -> ez lesz az aktív, elöl látszó lap. Ha a böngésző blokkolja a
  // többszörös lapnyitást, jelezzük (egyszer engedélyezni kell a felugró ablakokat).
  const openDaily = () => {
    if (typeof window === 'undefined') return;
    let blocked = 0;
    DAILY_OTHERS.forEach((u) => {
      const w = window.open(u, '_blank');
      if (w) { try { w.opener = null; } catch { /* ignore */ } } else blocked++;
    });
    const ol = window.open(DAILY_OUTLOOK, '_blank'); // UTOLJÁRA -> aktív lap
    if (ol) { try { ol.opener = null; ol.focus(); } catch { /* ignore */ } } else blocked++;
    setLinkNote(blocked > 0
      ? 'A böngésző letiltotta a többszörös lapnyitást. Engedélyezd a felugró ablakokat ennek az oldalnak (a címsor jobb szélén a blokkolt-ablak ikon → „Mindig engedélyezze"), majd kattints újra a 🚀-ra.'
      : null);
  };
  const k = getEditKey();
  const docHref = (f: string) => `/api/docs?f=${f}${k ? `&k=${encodeURIComponent(k)}` : ''}`;
  const nq = norm(q);
  const groups = GROUPS
    .map((g) => ({ ...g, docs: g.docs.filter((d) => !nq || norm(`${d.title} ${d.desc}`).includes(nq)) }))
    .filter((g) => g.docs.length > 0);
  const total = GROUPS.reduce((n, g) => n + g.docs.length, 0);

  return (
    <section className="wrap orv orv--fixhead docsv">
      <PageHead title="Segédletek" sub={`${total} dokumentum - mindig csak a LEGFRISSEBB kiadás · csak szerkesztő módban látszik`} />
      {/* a cím a görgetőn KÍVÜL: görgetéskor semmi nem úszik a cím mögé/fölé */}
      <div className="orv-scroll">
      <div className="docs-cols">
      {/* jobb oldali sáv: a leggyakrabban használt linkek - mobilon a tartalom ELŐTT, kompakt pill-ekként */}
      <aside className="doc-links">
        <div className="dl-title">Gyakori linkek</div>
        {linkNote && <div className="dl-note">{linkNote}</div>}
        {QUICK_LINKS.map((g) => (
          <div key={g.cim} className="dl-group">
            <div className="dl-h">{g.cim}{g.cim === 'Rendszerek' && <button type="button" className="dl-openall" title="Napi indítás: az Outlook előtérbe kerül, a Neptun, CooSpace, Discord és a szak weboldala pedig új lapokon nyílik meg" onClick={openDaily}>🚀</button>}</div>
            <div className="dl-list">
              {g.links.map((l) => {
                // Foglalás/kontakt (mailto): kattintásra az email-cím a vágólapra, nem levélíró nyílik
                if (l.href.startsWith('mailto:')) {
                  const email = l.href.slice(7);
                  return (
                    <button key={l.href} type="button" className="dl-link dl-link--copy"
                      title={`Kattints az email-cím másolásához: ${email}`} onClick={() => copyEmail(email)}>
                      <span className="dl-ic">{l.ic}</span>
                      <span className="dl-body">
                        <span className="dl-t">{l.t}{copied === email && <em className="dl-copied"> ✓ másolva</em>}</span>
                        {l.d && <span className="dl-d">{l.d}</span>}
                      </span>
                      <span className="dl-open">{copied === email ? '✓' : '⧉'}</span>
                    </button>
                  );
                }
                return (
                  <a key={l.href} className="dl-link" href={l.href} target="_blank" rel="noreferrer"
                    title={l.d ? `${l.t} - ${l.d}` : l.t}>
                    <span className="dl-ic">{l.ic}</span>
                    <span className="dl-body">
                      <span className="dl-t">{l.t}</span>
                      {l.d && <span className="dl-d">{l.d}</span>}
                    </span>
                    <span className="dl-open">↗</span>
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </aside>
      <div className="docs-main">
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
      <p className="tp-pv-hint">A kivonatok a dokumentumok tartalmából készültek; a teljes, hivatalos szöveghez az eredeti fájlt nyisd meg. A PDF-ek új lapon nyílnak, a pptx-ek letöltődnek. Régebbi kiadású segédletet nem tartunk kint - mindig az aktuális félévé érhető el.</p>
      </div>
      </div>
      </div>
    </section>
  );
}
