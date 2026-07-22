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
            <p className="doc-note"><strong>Fontos elérhetőség.</strong> Zaklatás, megfélemlítés, pszichológiai teher: Életviteli Tanácsadó Központ, <P name="Szabó Gábor" /> pszichológus, <L href="mailto:gszabo@metropolitan.hu">gszabo@metropolitan.hu</L>. Segítségkérés / életviteli tanácsadás: <L href="https://www.metropolitan.hu/hu/eletviteli-tanacsadas">metropolitan.hu/hu/eletviteli-tanacsadas</L>. Etikai eljárást a főtitkár rendel el; bejelentés a rektorhoz / főtitkárhoz / szervezeti egység vezetőjéhez / az Életviteli Központ vezetőjéhez tehető, a tudomásszerzéstől 30 napon (legfeljebb az esettől 90 napon) belül. Névtelen bejelentésre nem indul eljárás.</p>

            <p className="doc-sec">1 · A SZAKVEZETŐNEK (a legfontosabbak)</p>
            <ol>
              <li><strong>Konzultáció csak hivatalos helyen.</strong> Hallgatóval személyes megbeszélés/konzultáció kizárólag az egyetem kijelölt helyszínén; ettől eltérni csak rendkívül indokolt esetben, a tanszék-/intézetvezető ELŐZETES ÍRÁSBELI hozzájárulásával lehet (22/m, 25 pont).</li>
              <li><strong>Összeférhetetlenség jelzése.</strong> Rokon/barát/konfliktusban álló, vagy oktató-hallgató párkapcsolat esetén nem szabad vizsgáztatni/értékelni: jelezni kell a közvetlen vezetőnek, aki más vizsgáztatót jelöl ki. A vezetőt szigorú titoktartás köti (23, 25).</li>
              <li><strong>Számonkérés tisztasága.</strong> A vizsgakövetelményt a félév elején közzé kell tenni; csak a meghirdetett tananyag kérhető számon (súlyos vétség másképp). Szóbelin a vizsgázón kívül másnak is jelen kell lennie. Elfogult oktató nem vizsgáztathat. Az érdemjegy név szerint nem lehet nyilvános (34).</li>
              <li><strong>Kötelezővé tett saját mű / anyagi haszon.</strong> Etikai vétség saját művet szakmai indok nélkül kötelezővé tenni, vagy a számonkérést anyagi haszonszerzéssel összekötni (34/c-d).</li>
              <li><strong>Vezetői magatartás.</strong> Ne használd ki az alá-fölérendeltséget magáncélra; biztosítsd az esélyegyenlőséget és a nyilvánosságot; a problémák belső megoldását segítsd elő; ne tüntesd fel rossz színben a beosztottakat (6-9).</li>
              <li><strong>Panasz továbbítása.</strong> Ha hozzád fordulnak, a hatáskörödbe nem tartozó ügyben mondd meg, ki jár el; zaklatási bejelentést az Életviteli Központ felé irányíts, és őrizd meg a bizonyítékokat (18, 68-70).</li>
            </ol>

            <p className="doc-sec">2 · A FIATAL / KEZDŐ OKTATÓKNAK, LEKTOROKNAK</p>
            <ol>
              <li><strong>Tanár, nem haver.</strong> A hallgatókkal a felelősségteljes szereped szerint alakítsd a kapcsolatot; a magánéletet különítsd el az oktatói tevékenységtől; a hallgató magánéletét tartsd tiszteletben (22/h-k).</li>
              <li><strong>Nincs közös bulizás mint tanár-diák viszony.</strong> A tanulmányokon kívüli élethelyzetben (szórakozás) is tilos a zaklatás, megfélemlítés, a nyugalom megzavarása; a viccnek szánt, személyre menő megjegyzés is zaklatás lehet (55, 67, 74).</li>
              <li><strong>Csak hivatalos helyen konzultálj</strong> hallgatóval (lásd fent) - kávézó, lakás, közösségi tér NEM az, vezetői írásos engedély nélkül.</li>
              <li><strong>Pontosság, felkészülés.</strong> Az órát magad tartsd meg, időben kezdd/fejezd be, az alkalomhoz illő öltözetben, felkészülten; a meghirdetett tananyagot add le, a változásról tájékoztass (32).</li>
              <li><strong>Kommunikáció.</strong> Érthető, választékos, példamutató; a hallgató emberi méltóságát és jogait tartsd tiszteletben, vedd figyelembe egyéni képességét (32/f-g).</li>
              <li><strong>Semmilyen előny.</strong> Jó jegyért/pozícióért ne kérj, ne fogadj el anyagi, szexuális vagy más szolgáltatást; hallgatót magáncélra ne dolgoztass (5/g, 22/l).</li>
            </ol>

            <p className="doc-sec">3 · A HALLGATÓK ETIKAI KÓDEXE (röviden)</p>
            <ol>
              <li><strong>Tisztességes teljesítés.</strong> Önálló munka, meg nem engedett segédeszköz és külső segítség nélkül; vizsgán tilos a tankönyv, jegyzet, mobil, a feladatsor lefotózása (52-53).</li>
              <li><strong>Hivatkozás, plágium tilalma.</strong> Más gondolatát hivatkozással; a megjelölés nélküli átemelés (netről, más dolgozatából) plágium (50).</li>
              <li><strong>Egymás segítése, nem akadályozása.</strong> Tilos más munkáját megrongálni, visszatartani, adatait törölni; tilos a becsületes társakat hátráltatni (54).</li>
              <li><strong>Képmás- és személyiségi jog.</strong> Kép- vagy hangfelvétel készítése és megosztása csak az érintett hozzájárulásával (51).</li>
              <li><strong>Tisztelet mindenhol.</strong> Órán és tanulmányon kívül (buli, sport) is tilos a zaklatás, megfélemlítés, rendbontás; a véleménynyilvánítás (pl. oktatóértékelés) legyen tisztességes, elfogulatlan (55-56).</li>
              <li><strong>Megjelenés, alkalmazkodás.</strong> Felkészülten, az alkalomhoz illő ruhában; a külföldi hallgatók alkalmazkodnak a hazai normákhoz (48, 57).</li>
            </ol>

            <p className="doc-sec">4 · SZITUÁCIÓK - mit tegyél szakvezetőként</p>
            <p className="doc-note">A kódex szerint az elsődleges út mindig a <strong>belső, békés megoldás</strong> (5/j, 8). Formális etikai eljárás csak akkor, ha a probléma etikai vétség, és a beszélgetés nem oldja meg. A szakmai-tartalmi kifogás (nem tetszik az óra/tantárgy) NEM etikai ügy - azt tartalmi és képzési úton kezeld.</p>
            <ul className="doc-situ">
              <li><strong>„Beszól, problémázik, akadékoskodik az órán."</strong> → Higgadtan, méltóságát tiszteletben tartva reagálj; négyszemközti beszélgetésre hívd (hivatalos helyen). A kódex tőled is, tőle is kölcsönös tiszteletet vár (4, 62). A rendbontás, mások nyugalmának megzavarása a hallgató oldalán etikai vétség lehet (55).</li>
              <li><strong>„Fizetős egyetem vagyunk, a fizető jogán követelőzik."</strong> → A fizetés a képzésre jogosít, nem az etikai/tanulmányi szabályok felrúgására. Az Egyetem és a hallgató viszonyát szerződés szabályozza, amit MINDKÉT félnek tisztelnie kell (Alapelvek 6). Térítsd vissza a kérdést a konkrét, kezelhető problémára.</li>
              <li><strong>„Nem elégedett az órával, többet várt tőle."</strong> → Ez tartalmi visszajelzés, nem etikai ügy. Kérd konkrétan, mi hiányzott; hivatalos csatorna az oktatói munka hallgatói véleményezése (56). Ha jogos, tartalmi korrekció; ha elvárás-eltérés, tisztázd a tantárgy kereteit.</li>
              <li><strong>„Nem tetszik neki az oktató."</strong> → Különítsd el: személyes ellenszenv vagy konkrét sérelem? Ha nincs normasértés, tartalmi/kommunikációs egyeztetés. Ha az oktató részéről bántó, megalázó bánásmód történt, az etikai ügy (lásd lent).</li>
              <li><strong>„Nem megfelelő neki a tantárgy / a képzés struktúrája."</strong> → Képzésfejlesztési, nem etikai kérdés. Vedd fel a visszajelzést, tereld a megfelelő fórumra (tantárgyfelelős, szakvezetés); a kódex a döntések megalapozottságát és a képviseltek megkérdezését várja el (11-13).</li>
              <li><strong>„Az oktató leordította / leszidta / megbántotta az órán."</strong> → Ez potenciálisan etikai vétség: az oktató nem értékelheti bántóan a hallgatót, tiszteletlen magatartás tilos (22/a-b, 62). Hallgasd meg mindkét felet négyszemközt, dokumentálj; ha megalapozott, első lépés a beszélgetés és elvárás-tisztázás az oktatóval, súlyosabb esetben etikai bejelentés a főtitkár felé.</li>
              <li><strong>„Az oktató külön hívta, kellemetlen/szexuális színezetű volt a helyzet."</strong> → Ez a zaklatás gyanúja, kiemelt ügy. NE bagatellizáld: irányítsd az Életviteli Tanácsadó Központhoz (<P name="Szabó Gábor" />, <L href="mailto:gszabo@metropolitan.hu">gszabo@metropolitan.hu</L>), őrizzétek meg a bizonyítékokat (dátum, hely, tanúk, üzenetek). Az Egyetem a jóhiszemű bejelentőt védi (66-72). A konzultáció-hivatalos-helyen szabály megsértése önmagában is jelzés (22/m).</li>
              <li><strong>„Feszültséget, túlterheltséget érez a hallgató."</strong> → Emberséggel: kérdezd meg, mi nyomja; a kódex az egészséges környezetet és a méltóság védelmét célozza (Alapelvek 8). Ajánld fel az Életviteli Tanácsadó Központot (<L href="https://www.metropolitan.hu/hu/eletviteli-tanacsadas">életviteli tanácsadás</L>). A tananyag terjedelménél a kreditértéket és a párhuzamos terhelést figyelembe kell venni (34/b) - ha rendszerszintű a túlterhelés, az képzésfejlesztési teendő.</li>
              <li><strong>„A hallgató panaszt akar tenni egy oktatóra."</strong> → Mondd el a rendes utat: bejelentés a rektorhoz / főtitkárhoz / szervezeti egység vezetőjéhez / Életviteli Központhoz, a tudomásszerzéstől 30 (max. 90) napon belül, konkrétan (név, hely, idő, körülmény, bizonyíték); névtelen bejelentésre nem indul eljárás; a bejelentő adatait bizalmasan kezelik (97-100).</li>
              <li><strong>„Diszkriminációt érez (nem, származás, vallás, fogyatékosság, életkor stb.)."</strong> → Súlyos etikai vétség a közvetlen és közvetett hátrányos megkülönböztetés is (63-65). Ugyanaz a bejelentési út, a bizonyítékok megőrzésével.</li>
            </ul>
            <p className="doc-note"><strong>Aranyszabály (Alapelvek 2, 9-10):</strong> úgy bánj mindenkivel, ahogy elvárnád, hogy veled bánjanak; mindenki panasszal élhet, ha jogsérelmet érez; és pártatlan eljárás nélkül senkit nem szabad elítélni - a másik oktató jogait is tartsd tiszteletben, amíg a tények tisztázódnak. A teljes szabályzat a fenti PDF-ben.</p>
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
