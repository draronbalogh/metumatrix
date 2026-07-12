// Témasablonok: a 2025-ös elküldött levelek elemzéséből desztillált, visszatérő
// levéltípusok (10 tömb). A szögletes [mezők] kézzel töltendők; amit a kártya ad
// (cím, időpont, helyszín, határidő), azt előre beírjuk. A hosszú gondolatjel TILOS.
// A törzs a hivatalos aláírás NÉLKÜL végződik, azt a levél-készítő fűzi a végére.

export interface TopicCtx {
  title: string;
  when?: string | null;
  place?: string | null;
  due?: string | null;
}

export interface TopicTemplate {
  id: string;
  group: string;
  label: string;
  subject: (c: TopicCtx) => string;
  body: (c: TopicCtx) => string;
}

const nd = (s: string | null | undefined): string => (s || '').replace(/\s*—\s*/g, ', ');
const or = (v: string | null | undefined, ph: string): string => (nd(v).trim() || ph);

// Ismert adatok automatikus kitöltése a mai dátumból: a [tanév], [félév], [hónap]
// típusú mezőket nem kell kézzel kitölteni, a levél-készítő és az előnézet is
// a kiszámolt értékkel mutatja a sablont.
const HONAPOK = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];
export interface SemInfo { tanev: string; felevNev: 'őszi' | 'tavaszi'; felev: string; kovTanev: string; honap: string; }
export const semesterInfo = (d: Date = new Date()): SemInfo => {
  const y = d.getFullYear();
  const m = d.getMonth(); // 0 = január
  const startYear = m >= 6 ? y : y - 1; // júliustól már az induló tanév számít
  const tanev = `${startYear}/${String(startYear + 1).slice(-2)}`;
  const felevNev: 'őszi' | 'tavaszi' = m >= 6 || m === 0 ? 'őszi' : 'tavaszi';
  const kovStart = m === 6 || m === 7 ? startYear : startYear + 1; // nyáron a most induló tanév a "következő"
  return {
    tanev, felevNev, felev: `${tanev} ${felevNev} félév`,
    kovTanev: `${kovStart}/${String(kovStart + 1).slice(-2)}`,
    honap: HONAPOK[m],
  };
};
// ISO dátum (2026-09-02) → olvasható magyar forma a levelekhez
export const fmtDay = (iso?: string | null): string | null => {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[1]}. ${HONAPOK[Number(m[2]) - 1]} ${Number(m[3])}.`;
};

export const autoFill = (s: string, d: Date = new Date()): string => {
  const i = semesterInfo(d);
  const cap = (x: string): string => x.charAt(0).toUpperCase() + x.slice(1);
  return s
    .replace(/\[[fF]élév\]-ben/g, `${i.felev}ben`)
    .replace(/\[[fF]élév\]/g, i.felev)
    .replace(/\[[tT]anév\]/g, i.tanev)
    .replace(/\[[kK]övetkező tanév\]/g, i.kovTanev)
    .replace(/\[szemeszter\]/g, `${i.tanev} ${i.felevNev}`)
    .replace(/\[[hH]ónap\]/g, (m0) => (m0 === '[Hónap]' ? cap(i.honap) : i.honap));
};

export const TOPIC_TEMPLATES: TopicTemplate[] = [
  // 1. tömb: tematikák és órarend
  {
    id: 'tematika', group: '1 · Tematikák és órarend', label: 'Tematika-leadási emlékeztető (körlevél)',
    subject: (c) => `Tantárgy tematika kitöltés, határidő: ${or(c.due, '[dátum]')}`,
    body: (c) => `Kedves Kollégák!\n\nEmlékeztetlek Benneteket, hogy az őszi tantárgyi tematikákat a Neptun tematika rendszerében ${or(c.due, '[dátum]')}-ig kell kitölteni. Ahol lehetett, a tavalyi tematika tartalmát bemásoltam, így nincs más dolgotok, mint átnézni és visszaküldeni.\n\nKérlek, tartsátok a határidőt. Köszönöm az együttműködést!`,
  },
  {
    id: 'orarend', group: '1 · Tematikák és órarend', label: 'Órarend kiküldése',
    subject: () => 'Elkészült órarend [tanév], Média Design',
    body: () => `Kedves [Név]!\n\nElkészült a [tanév] őszi félévi órarend, az alábbi linken éritek el: [hivatkozás].\n\nKérlek, jelezd, ha ütközést vagy pontatlanságot látsz. Köszönöm!`,
  },
  // 2. tömb: oktatói kapcsolattartás
  {
    id: 'elerhetoseg', group: '2 · Oktatói kapcsolattartás', label: 'Elérhetőségek és kezdés egyeztetése',
    subject: () => 'MD oktatók elérhetőségei és a kezdés egyeztetése',
    body: () => `Szia [Név]!\n\nA szakvezetés előkészítése miatt kereslek. Szeretném elkérni az MD oktatók elérhetőségeit (email, telefon), illetve azt, hogy ki melyik tantárgyat tanítja a következő félévben. Emellett jó lenne egy rövid személyes egyeztetés, nekem [nap] délelőtt felelne meg. Neked mikor lenne alkalmas?\n\nKöszönöm!`,
  },
  {
    id: 'felevindito', group: '2 · Oktatói kapcsolattartás', label: 'Félévindító értekezlet meghívó (körlevél)',
    subject: (c) => `${or(c.when, '[időpont]')}, Média Design szakos félévindító értekezlet`,
    body: (c) => `Kedves Kollégák!\n\n${or(c.when, '[dátum] [időpont]')}-kor tartjuk a félévindító értekezletünket${c.place ? ` (${nd(c.place)})` : ' [helyszín / Zoom-link]'}, amelyre mindenkit szeretettel várok. Szeretném, ha közösen átbeszélnénk az induló félév legfontosabb tudnivalóit, a projekthetek és a záróvizsgák időpontjait, valamint a féléves célokat. Kérlek, jelezzétek ${or(c.due, '[dátum]')}-ig, ha nem tudtok részt venni, hogy tudjak róla.\n\nA tervezett napirendet [csatolom / a levél alján megtaláljátok].`,
  },
  {
    id: 'oktatoknapja', group: '2 · Oktatói kapcsolattartás', label: 'Oktatók Napja program',
    subject: () => 'Oktatók Napja, részletes program',
    body: (c) => `Kedves Kollégák!\n\nMegküldöm az Oktatók Napja részletes programját (${or(c.when, '[dátum]')}). Kérlek, jelezzetek vissza ${or(c.due, '[határidő]')}-ig.\n\nKöszönöm!`,
  },
  // 3. tömb: pótfelvételi
  {
    id: 'potfelv-bizottsag', group: '3 · Pótfelvételi', label: 'Bizottsági felkérés',
    subject: () => 'Pótfelvételi Bizottság, felkérés',
    body: (c) => `Kedves [Név]!\n\nSzeretnélek felkérni a pótfelvételi bizottsági munkájában való részvételre. Az eljárás időpontja: ${or(c.when, '[dátum]')}.\n\nKérlek, jelezd, ha tudsz részt venni. Köszönöm!`,
  },
  {
    id: 'potfelv-letszam', group: '3 · Pótfelvételi', label: 'Létszámok / jelentkezések egyeztetése',
    subject: () => 'Pótfelvételi létszámok',
    body: (c) => `Kedves Kollégák!\n\nÖsszegzem a beérkezett pótfelvételi jelentkezéseket és a keretszámokat: [összegzés / csatolmány].\n\nKérlek, nézzétek át és jelezzétek az észrevételeiteket ${or(c.due, '[határidő]')}-ig. Köszönöm!`,
  },
  {
    id: 'potfelv-ertesito', group: '3 · Pótfelvételi', label: 'Felvételi értesítő',
    subject: () => 'Pótfelvételi értesítő',
    body: () => `Kedves [Név]!\n\nTájékoztatlak a felvételi eljárás eredményéről és a további teendőkről: [részletek].\n\nKérdés esetén állok rendelkezésre.`,
  },
  // 4. tömb: Projekthét
  {
    id: 'projekthet-terv', group: '4 · Projekthét', label: 'Programterv / táblázat kiküldése (körlevél)',
    subject: (c) => `Projekthét: ${or(c.title, '[téma]')}, programterv`,
    body: (c) => `Kedves Kollégák!\n\nA(z) ${or(c.when, '[dátum]')} heti Projekthét témája ${or(c.title, '[téma]')}, e köré szervezzük a hallgatói csapatmunkát. Küldöm a programtervet és a beosztást: [link / csatolmány]. Kérlek, nézzétek át a rátok osztott sávokat és termeket, és ${or(c.due, '[dátum]')}-ig jelezzétek, ha bárhol ütközést vagy hibát láttok. Fontos, hogy a hallgatók egységes tájékoztatást kapjanak, ezért örülök, ha a saját csoportotokkal is időben egyeztettek.\n\nHa bármi kérdés van, keressetek nyugodtan. Köszönöm!`,
  },
  {
    id: 'projekthet-komm', group: '4 · Projekthét', label: 'Kommunikáció / beosztás egyeztetése',
    subject: () => 'MD | Projekthét, kommunikáció',
    body: (c) => `Szia [Név]!\n\nA Projekthét kommunikációjához kérem a segítségedet: [konkrét kérés]. Határidő: ${or(c.due, '[dátum]')}.\n\nKöszönöm!`,
  },
  {
    id: 'projekthet-latogatas', group: '4 · Projekthét', label: 'Külső helyszíni látogatás egyeztetése',
    subject: (c) => `Projekthét, ${or(c.place, '[helyszín]')} látogatás`,
    body: (c) => `Kedves [Név]!\n\nA Projekthét keretében szeretnénk ellátogatni Hozzátok (${or(c.place, '[helyszín]')}) ${or(c.when, '[dátum]')}-kor, körülbelül [létszám] fővel.\n\nKérlek, erősítsd meg az időpont elérhetőségét és a belépés feltételeit. Köszönöm!`,
  },
  // 5. tömb: diploma és záróvizsga
  {
    id: 'diploma-atado', group: '5 · Diploma és záróvizsga', label: 'Diplomaátadó meghívó / szervezés',
    subject: (c) => `Diplomaátadó, ${or(c.when, '[dátum]')}`,
    body: (c) => `Kedves Kollégák!\n\nA diplomaátadó ünnepség ${or(c.when, '[dátum]')}-kor lesz${c.place ? ` (${nd(c.place)})` : ' [helyszín]'}, amelyre szeretettel várjuk az oktatókat is. Kérlek, jelezzétek ${or(c.due, '[határidő]')}-ig, ki tud részt venni, hogy méltó módon köszönthessük együtt a végzős hallgatóinkat. Ez fontos, ünnepi alkalom a szak életében, és sokat jelent a hallgatóknak a jelenlétetek.\n\nA pontos menetrendet [csatolom / hamarosan küldöm]. Köszönöm!`,
  },
  {
    id: 'diploma-konzulens', group: '5 · Diploma és záróvizsga', label: 'Konzulensi egyeztetés',
    subject: () => 'Diploma konzulens, kérdés',
    body: () => `Szia [Név]!\n\nA(z) [hallgató] diplomamunkájának konzulensi kérdésében kereslek: [konkrét kérdés].\n\nKöszönöm a visszajelzést!`,
  },
  // 6. tömb: külső kapcsolatok
  {
    id: 'kulso-esemeny', group: '6 · Külső kapcsolatok', label: 'Esemény-részvétel egyeztetése',
    subject: (c) => `Meghívó: ${or(c.title, '[esemény]')}`,
    body: (c) => `Kedves [Név]!\n\nSzeretném a Média Design szak részvételét egyeztetni a(z) ${or(c.title, '[esemény]')} rendezvényen (${or(c.when, '[dátum]')}, ${or(c.place, '[helyszín]')}). [Konkrét cél / kérés.]\n\nÖrülnék, ha egyeztethetnénk a részletekről.`,
  },
  {
    id: 'egyuttmukodes', group: '6 · Külső kapcsolatok', label: 'Együttműködési megkeresés',
    subject: (c) => `${or(c.title, '[téma]')}: együttműködés`,
    body: (c) => `Kedves [Név]!\n\nA Budapesti Metropolitan Egyetem Média Design szaka nevében keresem a(z) ${or(c.title, '[projekt/téma]')} kapcsán. Szívesen kialakítanánk egy közös együttműködést, amely lehet [közös projekt / vendégelőadás / szakmai gyakorlat / verseny], a kölcsönös érdekek mentén. Nagyon értékes lenne a hallgatóink számára, ha kapcsolódhatnának egy valós szakmai környezethez.\n\nKérlek, jelezd, ha érdekel a lehetőség, és egyeztetünk a részletekről. Köszönöm!`,
  },
  // 7. tömb: Erasmus
  {
    id: 'erasmus', group: '7 · Erasmus / nemzetközi', label: 'Erasmus egyeztetés',
    subject: (c) => `Rövid egyeztetés kérése: ${or(c.title, 'Erasmus [program]')}`,
    body: (c) => `Kedves [Név]!\n\nA(z) ${or(c.title, '[Erasmus program/projekt]')} kapcsán szeretnék egy rövid egyeztetést kérni: [téma]. Mikor lenne alkalmas Neked [időszak]-ban?\n\nKöszönöm!`,
  },
  // 8. tömb: hallgatói ügyek
  {
    id: 'egyeni-tanrend', group: '8 · Hallgatói ügyek', label: 'Egyéni tanrend visszajelzés',
    subject: () => 'Egyéni tanrend, [hallgató]',
    body: () => `Kedves [Név]!\n\nAz egyéni tanrend kérelmedet megkaptam. [Döntés / feltétel / következő lépés.]\n\nKérdés esetén keress bizalommal.`,
  },
  {
    id: 'igazolt-hianyzas', group: '8 · Hallgatói ügyek', label: 'Igazolt hiányzás',
    subject: () => 'Igazolt hallgatói hiányzás, [hallgató]',
    body: () => `Kedves [Név]!\n\n[Hallgató] hiányzását igazoltnak tekintem az alábbiak alapján: [indok / időszak]. Kérlek, ennek megfelelően vezesd.\n\nKöszönöm!`,
  },
  // 9. tömb: kommunikáció / arculat
  {
    id: 'web-anyag', group: '9 · Kommunikáció / arculat', label: 'Weboldali anyag megküldése',
    subject: () => 'Média Design | webes szöveg',
    body: () => `Szia [Név]!\n\nKüldöm a weboldalra szánt anyagot (magyar és angol változat is csatolva): [mi ez].\n\nKöszönöm a segítséget!`,
  },
  // 10. tömb: belső / technikai
  {
    id: 'hozzaferes', group: '10 · Belső / technikai', label: 'Hozzáférés / technikai kérés',
    subject: () => '[Rendszer] hozzáférés',
    body: () => `Szia [Név]!\n\nSzeretnék hozzáférést kérni a(z) [meghajtó/rendszer]-hez, mert [indok]. Segítenél ebben, vagy jelezd, kihez forduljak?\n\nKöszönöm!`,
  },
  {
    id: 'zoom-idopont', group: '10 · Belső / technikai', label: 'Időpont-foglalás / online egyeztetés',
    subject: (c) => `Időpont-egyeztetés: ${or(c.title, '[téma]')}`,
    body: (c) => `Szia [Név]!\n\nFoglaljunk egy időpontot a(z) ${or(c.title, '[téma]')} megbeszélésére. Nekem ${or(c.when, '[időpontok]')} felelne meg. Csatlakozási link: [Zoom-link].\n\nJelezd, melyik jó!`,
  },
  // 11. tömb: óratervezés és óralátogatás
  {
    id: 'oratervezes', group: '11 · Óratervezés / óralátogatás', label: 'Óratervezés egyeztetése (körlevél)',
    subject: () => 'Óratervezés [félév], Média Design',
    body: (c) => `Kedves Kollégák!\n\nElindult a [félév] óratervezése. Kérlek, ${or(c.due, '[határidő]')}-ig küldjétek meg a tervezett óráitokat és az esetleges ütközéseket: [mit / hova].\n\nKöszönöm az együttműködést!`,
  },
  {
    id: 'oralatogatas', group: '11 · Óratervezés / óralátogatás', label: 'Páros óralátogatások ütemezése (körlevél)',
    subject: () => 'Páros óralátogatások, ütemezés',
    body: (c) => `Kedves Kollégák!\n\nIndul a féléves páros óralátogatások ütemezése. A beosztást itt éritek el: [link]. Kérlek, ${or(c.due, '[határidő]')}-ig jelezzétek, ha valamelyik időpont nem megfelelő.\n\nKöszönöm!`,
  },
  // 12. tömb: nyílt nap és Educatio
  {
    id: 'nyiltnap', group: '12 · Nyílt nap / Educatio', label: 'Nyílt nap tájékoztató (körlevél)',
    subject: (c) => `Nyílt nap, ${or(c.when, '[dátum]')}`,
    body: (c) => `Kedves Kollégák!\n\nA(z) ${or(c.when, '[dátum]')}-i nyílt napon szeretnénk minél jobban bemutatni a Média Design szakot, és ehhez kérném a segítségeteket${c.place ? ` (${nd(c.place)})` : ''}. Szükségem lenne néhány kollégára a(z) [feladat: pl. bemutató / standolás / hallgatói munkák prezentálása]-hoz. Kérlek, jelezzétek ${or(c.due, '[dátum]')}-ig, ki tud részt venni, hogy össze tudjam állítani a beosztást.\n\nNagyon sokat jelent a szak megítélésében, ha erős csapattal jelenünk meg. Köszönöm!`,
  },
  {
    id: 'educatio', group: '12 · Nyílt nap / Educatio', label: 'Educatio kiállítás emlékeztető (körlevél)',
    subject: (c) => `Educatio Kiállítás, ${or(c.when, '[dátum]')}`,
    body: (c) => `Kedves Kollégák!\n\nKözeledik az Educatio Kiállítás (${or(c.when, '[dátum]')}, ${or(c.place, '[helyszín]')}). A szak standjához a beosztás: [link / részletek].\n\nKérlek, nézzétek át, és jelezzétek az észrevételeiteket. Köszönöm!`,
  },
  // 13. tömb: záróvizsga és opponencia
  {
    id: 'zarovizsga', group: '13 · Záróvizsga / opponencia', label: 'Záróvizsga előkészítés (körlevél)',
    subject: () => 'Média Design záróvizsga, előkészítés',
    body: (c) => `Kedves Kollégák!\n\nA záróvizsgák időszaka ${or(c.when, '[dátum]-tól [dátum]-ig')} tart, ezért küldöm a tervezett bizottsági beosztást: [link / csatolmány]. Kérlek, nézzétek át a rátok osztott napokat és bizottságokat, és jelezzétek ${or(c.due, '[határidő]')}-ig, ha valahol ütközés vagy akadály van. Fontos, hogy időben véglegesítsük a beosztást, mert a hallgatók és a külső tagok is erre terveznek.\n\nHa bármi kérdés van a menetrenddel kapcsolatban, keressetek nyugodtan. Köszönöm!`,
  },
  {
    id: 'opponencia-felkeres', group: '13 · Záróvizsga / opponencia', label: 'Opponencia felkérés',
    subject: () => 'Opponensi felkérés, METU Média Design',
    body: (c) => `Kedves [Név]!\n\nSzeretnélek felkérni a Média Design szak [hallgató] mestermunkájának / szakdolgozatának bírálatára, amelynek témája [téma]. A dolgozatot itt éred el: [link], a bírálat leadási határideje pedig ${or(c.due, '[határidő]')}, hogy a záróvizsgáig minden készen legyen. Kérlek, jelezd, hogy el tudod-e vállalni, illetve ha bármilyen kérdésed van a dolgozattal kapcsolatban.\n\nKöszönöm, hogy segítesz, a hallgató szempontjából nagyon fontos a szakszerű értékelés!`,
  },
  {
    id: 'diplomafeltoltes', group: '13 · Záróvizsga / opponencia', label: 'Diplomafeltöltés határidő (körlevél, hallgatók)',
    subject: (c) => `Diplomafeltöltés határidő: ${or(c.due, '[dátum]')}`,
    body: (c) => `Kedves Hallgatók!\n\nEmlékeztetlek Benneteket, hogy a diplomamunka feltöltésének határideje ${or(c.due, '[dátum]')}. A feltöltés menete: [rendszer / link].\n\nKérlek, ne hagyjátok az utolsó pillanatra. Kérdés esetén keressetek!`,
  },
  {
    id: 'bestof', group: '13 · Záróvizsga / opponencia', label: 'Best of Diploma kiállítás szervezése',
    subject: () => 'Best of Diploma kiállítás, szervezés',
    body: (c) => `Kedves [Név/Kollégák]!\n\nSzervezzük a Best of Diploma kiállítást (${or(c.when, '[időpont]')}, ${or(c.place, '[helyszín]')}). A kiválasztott munkák és a teendők: [lista / link].\n\nKérlek, jelezzétek az észrevételeiteket ${or(c.due, '[határidő]')}-ig. Köszönöm!`,
  },
  // kiegészítő gerinc-sablonok
  {
    id: 'szakkonzultacio', group: '8 · Hallgatói ügyek', label: 'Központi szakkonzultáció időpont (körlevél)',
    subject: (c) => `Központi szakkonzultáció, ${or(c.when, '[időpont]')}`,
    body: (c) => `Kedves Hallgatók!\n\nA központi szakkonzultáció időpontja: ${or(c.when, '[dátum, időpont]')}${c.place ? `, helyszín: ${nd(c.place)}` : ''}. [Menete / jelentkezés.]\n\nKérdés esetén keressetek!`,
  },
  {
    id: 'felevkezdes-info', group: '2 · Oktatói kapcsolattartás', label: 'Félévkezdési információk (körlevél)',
    subject: () => 'Félévkezdési információk, Média Design',
    body: () => `Kedves Kollégák!\n\nÖsszegyűjtöttem a félévkezdés legfontosabb tudnivalóit:\n1. [órarend / termek]\n2. [adminisztráció, határidők]\n3. [események, dátumok]\n\nKérlek, nézzétek át, és jelezzétek, ha valami hiányzik. Köszönöm!`,
  },
  // az elküldött levelek 1-2. részéből átvett további sablonok
  {
    id: 'tematika-egyeni', group: '1 · Tematikák és órarend', label: 'Tematika kitöltés, egyéni felhívás',
    subject: (c) => `Tantárgytematika kitöltése, határidő: ${or(c.due, '[dátum]')}`,
    body: (c) => `Szia [Név]!\n\nKérlek, töltsd ki, illetve frissítsd a(z) [tantárgy] tematikáját a Neptun felületén a következő félévre. Fontos, hogy a tanulási eredmények, a heti bontás és az értékelés módja is naprakész legyen, mert ezek alapján tájékozódnak a hallgatók. A leadási határidő ${or(c.due, '[dátum]')}, így van még idő átnézni és pontosítani.\n\nHa bármiben elakadsz, vagy segítség kell a felülethez, szólj nyugodtan, és megoldjuk. Köszönöm!`,
  },
  {
    id: 'szillabusz', group: '1 · Tematikák és órarend', label: 'Szillabusz leadási emlékeztető',
    subject: () => 'Szillabusz leadás, emlékeztető',
    body: (c) => `Szia [Név]!\n\nSzeretnélek emlékeztetni, hogy a(z) [tantárgy] szillabuszát ${or(c.due, '[dátum]')}-ig várom, hogy időben véglegesíteni tudjuk a féléves anyagokat. A sablont itt éred el: [link], így csak a tartalmat kell hozzáigazítanod. Kérlek, figyelj rá, hogy a követelmények és a pontozás egyértelmű legyen, mert erre a hallgatók gyakran visszakérdeznek.\n\nHa bármi kérdésed van, szólj, és segítek. Köszönöm!`,
  },
  {
    id: 'targykiosztas', group: '1 · Tematikák és órarend', label: 'Tárgykiosztás egyeztetése',
    subject: () => 'MD tárgykiosztás, [tanév] ősz',
    body: () => `Szia [Név]!\n\nKöszönöm a tárgykiosztást. Átnéztem, egy kérdésem/észrevételem van: [pont]. A többivel egyetértek. Egyeztessünk, ha kell, egy rövid hívásban.\n\nKöszönöm!`,
  },
  {
    id: 'orarend-egyeztetes', group: '1 · Tematikák és órarend', label: 'Órarendi sáv egyeztetése (egyéni)',
    subject: () => 'Órarend [félév], egyeztetés',
    body: (c) => `Szia [Név]!\n\nKészül a [félév] órarendje, ezért szeretném leegyeztetni Veled a sávjaidat. A jelenlegi terv szerint a(z) [tantárgy] [nap]-on [időpont]-kor lenne, [terem/online]. Kérlek, jelezz vissza ${or(c.due, '[dátum]')}-ig, hogy ez megfelel-e, vagy van-e olyan nap/idő, ami ütközik nálad.\n\nIgyekszem mindenkinek a lehető legjobb beosztást összehozni, ezért hálás vagyok, ha minél előbb visszajelzel. Köszönöm!`,
  },
  {
    id: 'orarend-utkozes', group: '1 · Tematikák és órarend', label: 'Órarendi ütközés, válasz',
    subject: () => 'Re: Órarendi ütközés',
    body: () => `Szia [Név]!\n\nKöszönöm, hogy jelezted az ütközést, igazad van, ezt rendezzük. A(z) [tantárgy]-t áthelyeztük [új nap]-ra [új időpont]-ra, így már nem ütközik a másik kurzusoddal. Kérlek, erősítsd meg, hogy az új időpont megfelel-e, és ha igen, frissítjük az órarendben.\n\nKöszönöm a türelmet és a rugalmasságot!`,
  },
  {
    id: 'uj-oktato', group: '2 · Oktatói kapcsolattartás', label: 'Új oktató bemutatása (körlevél)',
    subject: () => 'Új kolléga: [Név] bemutatása',
    body: () => `Kedves Kollégák!\n\nNagy örömmel mutatom be [Név]-t, aki [félév]-től csatlakozik a Média Design szakhoz, és a(z) [tantárgy]-t viszi majd. [Név] [rövid szakmai háttér], így sokat tud hozzátenni a szak munkájához.\n\nKérlek, fogadjátok szeretettel, és segítsétek a beilleszkedését az első időszakban. Bízom benne, hogy hamar megismeritek egymást a közös munkában.`,
  },
  {
    id: 'elerhetoseg-potlas', group: '2 · Oktatói kapcsolattartás', label: 'Elérhetőségek bekérése (körlevél)',
    subject: () => 'MD oktatók elérhetőségei, kérlek pótoljátok',
    body: (c) => `Kedves Kollégák!\n\nFrissítem a szak oktatói elérhetőségi listáját, hogy a félév során gyorsan és pontosan tudjunk kommunikálni. Kérlek, küldjétek el a preferált email-címeteket és telefonszámotokat, illetve jelezzétek, ha valamelyik adat megváltozott. Ez különösen a szeptemberi kezdésnél lesz fontos, amikor sok gyors egyeztetés lesz.\n\nKöszönöm, hogy ${or(c.due, '[dátum]')}-ig visszajeleztek!`,
  },
  {
    id: 'konzultacios-idosav', group: '2 · Oktatói kapcsolattartás', label: 'Konzultációs idősávok bekérése',
    subject: () => 'Konzultációs idősávok, [félév]',
    body: () => `Szia [Név]!\n\nA félév indulásához szeretném összegyűjteni az oktatói konzultációs idősávokat, hogy meghirdethessük a hallgatóknak. Kérlek, add meg, hogy hetente melyik nap és időpont felel meg neked a fogadóórára. Fontos, hogy ez stabil legyen a félév során, mert a hallgatók erre terveznek.\n\nHa később változtatni kell rajta, természetesen rugalmasak vagyunk. Köszönöm!`,
  },
  {
    id: 'havi-hataridok', group: '2 · Oktatói kapcsolattartás', label: 'Havi határidő-összefoglaló (körlevél)',
    subject: () => '[Hónap] határidők, összefoglaló',
    body: () => `Kedves Kollégák!\n\nRöviden összefoglalom a hónap fő teendőit, hogy mindenki időben tudjon haladni:\n1. [teendő]\n2. [teendő]\n3. [teendő]\n\nA hozzájuk tartozó határidők: [dátumok]. Kérlek, jelezzetek, ha bárhol csúszás várható, hogy időben tudjunk reagálni. Köszönöm!`,
  },
  {
    id: 'felveteli-levelek', group: '3 · Pótfelvételi', label: 'Felvételi levelek (MED) kiküldése',
    subject: () => 'Média Design, felvételi levelek',
    body: (c) => `Kedves [Név]!\n\nKüldöm a MED szak normál és pótfelvételi leveleinek szövegét/listáját. Kérlek, [teendő] ${or(c.due, '[határidő]')}-ig.\n\nKöszönöm!`,
  },
  {
    id: 'projekthet-felkeres', group: '4 · Projekthét', label: 'Projekthét oktatói felkérés (egyéni)',
    subject: (c) => `Projekthét, ${or(c.when, '[dátum]')}, felkérés`,
    body: (c) => `Szia [Név]!\n\nA(z) ${or(c.when, '[dátum]')} heti projekthéten szeretnélek felkérni, hogy [szerep/feladat] szerepben vegyél részt a(z) ${or(c.title, '[téma]')} témában. A projekthét célja, hogy a hallgatók intenzív, gyakorlati formában dolgozzanak együtt, és ehhez nagyon fontos a Te tapasztalatod. A tervezett beosztást és a részleteket hamarosan küldöm.\n\nKérlek, jelezz vissza ${or(c.due, '[dátum]')}-ig, hogy belefér-e az időbeosztásodba. Köszönöm!`,
  },
  {
    id: 'szemeszterkezdes', group: '8 · Hallgatói ügyek', label: 'Szemeszterkezdő tájékoztató (körlevél, hallgatók)',
    subject: () => 'Szemeszterkezdés, fontos tudnivalók',
    body: (c) => `Kedves Hallgatók!\n\nKözeledik a(z) [félév] kezdete, ezért összeszedtem a legfontosabb tudnivalókat. Az órák ${or(c.when, '[dátum]')}-án indulnak a közzétett órarend szerint, amelyet itt értek el: [link]. Kérlek, figyeljetek a regisztrációs és tárgyfelvételi határidőkre, mert ezek [dátum]-kor lejárnak.\n\nHa bármi kérdésetek van a kezdéssel kapcsolatban, írjatok nyugodtan, és igyekszem gyorsan segíteni.`,
  },
  {
    id: 'szakdolgozati-temak', group: '13 · Záróvizsga / opponencia', label: 'Szakdolgozati témák bekérése (körlevél)',
    subject: (c) => `Szakdolgozati témák, leadás ${or(c.due, '[dátum]')}-ig`,
    body: (c) => `Kedves Kollégák!\n\nElindul a szakdolgozati folyamat, ezért kérlek, gyűjtsétek össze a témavezetett hallgatóitok dolgozati témáit. A címeket és a rövid leírásokat ${or(c.due, '[dátum]')}-ig várom felétek, hogy jóváhagyhassuk és rögzíthessük őket a rendszerben. Fontos, hogy a hallgatók időben elinduljanak, ezért örülök, ha ösztönzitek őket a témaválasztásra.\n\nHa valakinél gond van a témával, jelezzétek, és közösen megoldjuk. Köszönöm!`,
  },
  {
    id: 'web-bio-bekeres', group: '9 · Kommunikáció / arculat', label: 'Web-bio bekérése (angol szöveg + fotó)',
    subject: () => 'Web-bio, angol szöveg kérése',
    body: (c) => `Szia [Név]!\n\nA nemzetközi hallgatók miatt a honlapra kérnék tőled egy rövid angol nyelvű bemutatkozó szöveget is, kb. [terjedelem] terjedelemben. Elég egy tömör, szakmai leírás rólad és az oktatott területeidről, hogy egységes legyen a felület. Ha megvan a magyar változat, abból is kiindulhatunk, csak jelezd.\n\nKérlek, ${or(c.due, '[dátum]')}-ig küldd el, hogy időben feltölthessük. Köszönöm!`,
  },
  {
    id: 'teremigeny', group: '10 · Belső / technikai', label: 'Teremigény egyeztetése',
    subject: () => 'Teremigény: [tantárgy], [időpont]',
    body: () => `Szia [Név]!\n\nA(z) [tantárgy / esemény]-hez [teremtípus]-ra lenne szükségem [nap]-on [időpont]-kor, [létszám] főre. A gyakorlati jelleg miatt fontos lenne a(z) [technikai igény: projektor / gépterem / stúdió].\n\nKérlek, jelezd, hogy megoldható-e, vagy van-e helyette alternatíva. Köszönöm, hogy segítesz megtalálni a legjobb megoldást!`,
  },
  {
    id: 'szakvezetoi-anyagok', group: '10 · Belső / technikai', label: 'Szakvezetői anyagok kérése (HR)',
    subject: () => 'Média Design, szakvezetői anyagok',
    body: () => `Kedves [Név]!\n\nA szakvezetői teendőkhöz kérem a következő anyagokat/információkat: [felsorolás].\n\nKöszönöm a segítséget!`,
  },
  {
    id: 'kurzusinditas', group: '11 · Óratervezés / óralátogatás', label: 'Kurzusindítás / létszám-visszaigazolás',
    subject: () => '[Tantárgy] indítása, létszám',
    body: () => `Szia [Név]!\n\nA(z) [tantárgy]-ra a jelentkezési adatok szerint [létszám] fő vette fel a kurzust. Ez alapján a tárgy [elindul a tervezett rendben / a minimumlétszám alatt van, ezért egyeztetnünk kell]. Kérlek, jelezd, hogy a létszám és a terembeosztás megfelel-e a gyakorlati munkához.\n\nHa bármi módosítás kell, időben szólj, és megoldjuk. Köszönöm!`,
  },
  {
    id: 'gamespec', group: '11 · Óratervezés / óralátogatás', label: '3D labor / Játéktervezés egyeztetés',
    subject: () => '3D labor (Játéktervezés), egyeztetés',
    body: () => `Szia [Név]!\n\nA 3D labor / Játéktervezés kurzus kapcsán egyeztetnék: [pont]. Mikor tudnánk beszélni róla?\n\nKöszönöm!`,
  },
  // a 3-5. rész (október-január) új sablonjai
  {
    id: 'felevkozi-statusz', group: '14 · Félévközben és záráskor', label: 'Félévközi státusz bekérése',
    subject: () => 'Félévközi státusz: [tantárgy]',
    body: () => `Szia [Név]!\n\nA félév közepéhez érve szeretném felmérni, hogyan halad a(z) [tantárgy], ezért kérnék tőled egy rövid visszajelzést. Érdekel, hogy van-e lemaradó vagy sokat hiányzó hallgató, illetve rendben mennek-e a leadások és a jelenlét. Ha bárhol beavatkozásra van szükség, időben jelezd, hogy közösen tudjunk segíteni.\n\nKöszönöm, hogy ránézel, és megosztod a tapasztalataidat!`,
  },
  {
    id: 'hianyzas-jelzes', group: '14 · Félévközben és záráskor', label: 'Hallgatói hiányzás jelzése',
    subject: () => '[Hallgató neve], hiányzások',
    body: () => `Szia [Név]!\n\nAzt látom a jelzések alapján, hogy [hallgató] a(z) [tantárgy]-ból sokat hiányzott, illetve jelentős lemaradása van. Kérlek, ha van rá mód, egyeztess vele, hogy megértsük a hátteret és időben tudjunk segíteni. Ha úgy látod, hogy szakvezetői szinten is be kell avatkoznom, jelezd, és megkeresem a hallgatót.\n\nKöszönöm, hogy figyelsz erre, sokat számít a hallgató szempontjából!`,
  },
  {
    id: 'ertekelesi-szempontok', group: '14 · Félévközben és záráskor', label: 'Értékelési szempontok egyeztetése',
    subject: () => 'Értékelési szempontok: [tantárgy]',
    body: () => `Szia [Név]!\n\nKözeledik a félév vége, ezért szeretném összehangolni az értékelési szempontokat a hallgatói kommunikáció miatt. Kérlek, oszd meg röviden, hogy a(z) [tantárgy]-nál mi alapján alakul a jegy (pl. beadandó, vizsga, jelenlét arányok). Így egységesen tudunk tájékoztatni, és elkerüljük a félreértéseket a hallgatóknál.\n\nHa bármiben módosítanál a korábbihoz képest, jelezd nyugodtan. Köszönöm!`,
  },
  {
    id: 'vizsgaidoszak', group: '14 · Félévközben és záráskor', label: 'Vizsgaidőszak tudnivalók (körlevél)',
    subject: () => 'Vizsgaidőszak, tudnivalók',
    body: (c) => `Kedves Kollégák!\n\nKözeledik a vizsgaidőszak, amely [dátum]-tól [dátum]-ig tart, ezért néhány fontos teendőt szeretnék jelezni. Kérlek, hirdessétek meg a vizsgaidőpontjaitokat a Neptunban ${or(c.due, '[határidő]')}-ig, hogy a hallgatók időben tudjanak jelentkezni. Figyeljetek rá, hogy elegendő létszámhely és alkalom legyen, különösen a nagyobb kurzusoknál.\n\nHa bármi kérdés van a vizsgáztatás rendjével kapcsolatban, keressetek nyugodtan. Köszönöm!`,
  },
  {
    id: 'jegybeiras', group: '14 · Félévközben és záráskor', label: 'Jegybeírási emlékeztető',
    subject: (c) => `Jegybeírás, határidő: ${or(c.due, '[dátum]')}`,
    body: (c) => `Szia [Név]!\n\nSzeretnélek emlékeztetni, hogy a(z) [tantárgy] jegyeit kérlek, vezesd be a Neptunban ${or(c.due, '[dátum]')}-ig. Fontos, hogy időben lezárjuk a félévet, mert a hallgatók ettől függő ügyeket (pl. ösztöndíj, továbbhaladás) intéznek. Ha valamelyik hallgatónál nyitott kérdés van, jelezd, és megbeszéljük.\n\nKöszönöm, hogy soron kívül rendezed!`,
  },
  {
    id: 'felevzaro-admin', group: '14 · Félévközben és záráskor', label: 'Félévzáró adminisztráció (körlevél)',
    subject: () => 'Félévzáró adminisztráció, emlékeztető',
    body: (c) => `Kedves Kollégák!\n\nA félév lezárásához néhány adminisztratív teendőt szeretnék összefoglalni. Kérlek, ${or(c.due, '[dátum]')}-ig rendezzétek:\n1. jegyek beírása\n2. jelenléti adatok\n3. [leadott dokumentumok]\n\nEzek időben történő lezárása sokat segít abban, hogy zökkenőmentesen zárjuk a szemesztert. Ha valahol csúszás várható, jelezzétek előre. Köszönöm!`,
  },
  {
    id: 'potvizsga', group: '14 · Félévközben és záráskor', label: 'Pótvizsga egyeztetése',
    subject: () => 'Pótvizsga: [tantárgy]',
    body: (c) => `Szia [Név]!\n\n[Hallgató] pótvizsgát / javítóvizsgát szeretne a(z) [tantárgy]-ból, ezért kérlek, segíts egy időpont megtalálásában. A vizsgaidőszakon belül a(z) ${or(c.when, '[dátum]')} körüli időszak lenne ideális, de rugalmas vagyok, ahogy neked jobb. Kérlek, jelezz egy konkrét időpontot, hogy tudjam tájékoztatni a hallgatót.\n\nKöszönöm, hogy segítesz rendezni!`,
  },
  {
    id: 'felevi-beszamolo', group: '14 · Félévközben és záráskor', label: 'Féléves tapasztalat-összefoglaló bekérése',
    subject: () => '[Félév], rövid beszámoló',
    body: () => `Szia [Név]!\n\nMielőtt teljesen belemerülünk a következő félévbe, kérnék tőled egy rövid visszajelzést a(z) [tantárgy] elmúlt félévéről. Érdekel, hogy mi ment jól, min változtatnál, és volt-e olyan tapasztalat, amiből a szak egésze tanulhat. Nem kell hosszú anyag, néhány mondat is sokat segít a fejlesztésben.\n\nKöszönöm, hogy megosztod a meglátásaidat!`,
  },
  {
    id: 'vendegeloadas', group: '6 · Külső kapcsolatok', label: 'Vendégelőadó felkérése',
    subject: (c) => `Vendégelőadás felkérés, ${or(c.when, '[dátum]')}`,
    body: (c) => `Kedves [Név]!\n\nA Média Design szak nevében szeretnélek felkérni egy [időtartam]-es vendégelőadásra [téma] témában, ${or(c.when, '[dátum]')} körül. Nagyon értékes lenne a hallgatóink számára, ha a Te szakmai tapasztalatodból is kaphatnának egy betekintést. A pontos időpontot és a technikai részleteket rugalmasan tudjuk egyeztetni, ahogy Neked kényelmes.\n\nKérlek, jelezd, hogy érdekel-e, nagyon örülnék, ha összejönne. Köszönöm!`,
  },
  {
    id: 'tanszeki-ertekezlet', group: '2 · Oktatói kapcsolattartás', label: 'Tanszéki értekezlet emlékeztető (körlevél)',
    subject: (c) => `Tanszéki értekezlet, ${or(c.when, '[dátum, időpont]')}`,
    body: (c) => `Kedves Kollégák!\n\n${or(c.when, '[dátum] [időpont]')}-kor tanszéki értekezletet tartunk${c.place ? ` (${nd(c.place)})` : ' [helyszín / Zoom-link]'}, amelyre mindenkit szeretettel várok. A tervezett napirenden szerepel: [1.], [2.], [3.], de ha van olyan téma, amit fel szeretnétek vetni, jelezzétek előre. Kérlek, ${or(c.due, '[dátum]')}-ig adjatok visszajelzést, ha nem tudtok jönni.\n\nKöszönöm, hogy időt szántok rá, fontos, hogy közösen haladjunk!`,
  },
  {
    id: 'unnepi-koszonto', group: '2 · Oktatói kapcsolattartás', label: 'Évzáró / ünnepi köszöntő (körlevél)',
    subject: () => 'Békés ünnepeket!',
    body: () => `Kedves Kollégák!\n\nAz év végéhez érve szeretném megköszönni mindannyiótoknak az idei félév közös munkáját. Sokat tettetek azért, hogy a Média Design szak jól működjön, és ezt őszintén nagyra értékelem. Kívánok Nektek és a szeretteiteknek békés, pihentető ünnepeket és feltöltődést a szünetre.\n\nA tavaszi félév részleteivel januárban jelentkezem, addig is jó pihenést!`,
  },
  {
    id: 'tantargyfelosztas', group: '1 · Tematikák és órarend', label: 'Tantárgyfelosztás egyeztetése (következő félév)',
    subject: () => '[Félév], tantárgyfelosztás egyeztetés',
    body: (c) => `Szia [Név]!\n\nElkezdtem a következő félév tervezését, és szeretném leegyeztetni Veled a rád tervezett tárgyakat. A jelenlegi elképzelés szerint a(z) [tantárgy/tantárgyak]-at vinnéd, a szokásos rendben. Kérlek, jelezz vissza ${or(c.due, '[dátum]')}-ig, hogy ez megfelel-e, vagy szeretnél-e valamin változtatni.\n\nIgyekszem mindenkinek olyan felosztást összeállítani, amely a szakmai profiljához és a kapacitásához illik. Köszönöm!`,
  },
  {
    id: 'orarend-veglegesites', group: '1 · Tematikák és órarend', label: 'Órarend véglegesítése (körlevél)',
    subject: () => '[Félév] órarend, véglegesítés',
    body: (c) => `Kedves Kollégák!\n\nCsatolom a(z) [félév] órarendjének aktuális változatát: [link / csatolmány]. Kérlek, nézzétek át a saját sávjaitokat, és ha bárhol ütközést vagy hibát találtok, jelezzétek ${or(c.due, '[dátum]')}-ig, hogy még idejében tudjuk javítani. Fontos, hogy a hallgatók stabil órarendet lássanak a kezdésre, ezért igyekszünk ezt gyorsan lezárni.\n\nKöszönöm a türelmeteket és az együttműködést!`,
  },
  {
    id: 'szakdolgozat-utemterv', group: '13 · Záróvizsga / opponencia', label: 'Szakdolgozati konzultációk ütemezése (körlevél)',
    subject: () => 'Szakdolgozati konzultációk, ütemezés',
    body: (c) => `Kedves Kollégák!\n\nA félévben folytatódnak a szakdolgozati konzultációk, ezért kérlek, egyeztessetek a témavezetett hallgatóitokkal az ütemtervről. A tervezett konzultációs alkalmakat és a fontosabb mérföldköveket ${or(c.due, '[dátum]')}-ig várom felétek. Fontos, hogy a hallgatók végig lássák a haladásukat és a határidőket, ezért hálás vagyok az időben történő tervezésért.\n\nHa valamelyik hallgatónál elakadás van, jelezzétek. Köszönöm!`,
  },
  {
    id: 'valaszthato-kurzus', group: '8 · Hallgatói ügyek', label: 'Új választható kurzus meghirdetése (körlevél, hallgatók)',
    subject: () => 'Új választható kurzus: [cím]',
    body: (c) => `Kedves Hallgatók!\n\n[Félév]-ben új választható kurzus indul [cím] címmel, amelyet szeretnék a figyelmetekbe ajánlani. A kurzus röviden: [1-2 mondatos leírás], és elsősorban azoknak szól, akik [célcsoport/téma] iránt érdeklődnek. A jelentkezés módja [mód], a határidő pedig ${or(c.due, '[dátum]')}.\n\nHa kérdésetek van a tartalommal vagy a felvétellel kapcsolatban, írjatok nyugodtan. Érdemes időben jelentkezni, a helyek száma korlátozott!`,
  },
  // a 6-7. rész (február-április) és a kibővített augusztusi rész új sablonjai
  {
    id: 'szakvezetes-atvetel', group: '2 · Oktatói kapcsolattartás', label: 'Szakvezetés átvétele, bejelentés (körlevél)',
    subject: () => 'Változás: Média Design szakvezetés',
    body: () => `Kedves Kollégák!\n\nNagyon köszönöm a bizalmat és a rám bízott feladatot! [Dátum]-tól én veszem át a Média Design alap- és mesterszak vezetését, és őszintén örülök, hogy együtt építhetjük tovább a szakot. Köszönöm [Név] eddigi értékteremtő munkáját, amelyre a jövőben is támaszkodni szeretnék.\n\nSzámítok Rátok a közös fejlesztésekben, és bízom benne, hogy a következő tanévben még erősebbé tesszük a Média Designt.`,
  },
  {
    id: 'bemutatkozas', group: '2 · Oktatói kapcsolattartás', label: 'Bemutatkozás az oktatói karnak (körlevél)',
    subject: () => 'Bemutatkozás, Média Design szak',
    body: () => `Kedves Kollégák!\n\n[Dátum]-tól szakvezetőként dolgozom a Média Design szakon, és szeretnék röviden bemutatkozni azoknak, akikkel eddig még nem volt alkalmunk együtt dolgozni. Több éve oktatok a tanszéken, elsősorban [terület] területén, és nagy örömmel veszem át ezt a feladatot.\n\nAz a célom, hogy nyitott, jól szervezett és támogató környezetben dolgozzunk együtt, ezért bármilyen kérdéssel, ötlettel vagy jelzéssel nyugodtan kereshettek. A közeljövőben egyeztetünk az induló félév részleteiről is.`,
  },
  {
    id: 'felev-elokeszites', group: '2 · Oktatói kapcsolattartás', label: 'Félév-előkészítés indítása (körlevél)',
    subject: () => 'Őszi félév előkészítése, első teendők',
    body: () => `Kedves Kollégák!\n\nLassan indul a tanév, ezért szeretném időben elindítani a félév előkészítését. A legfontosabb közelgő feladatok: a tantárgytematikák frissítése, az órarendi igények egyeztetése és a szillabuszok leadása. Kérlek, nézzétek át a hozzátok tartozó tárgyakat, és jelezzétek, ha bármiben változást terveztek.\n\nA pontos határidőket a következő levélben küldöm, de aki előre szeretne haladni, nyugodtan kezdjen bele. Köszönöm!`,
  },
  {
    id: 'web-bio-magyar', group: '9 · Kommunikáció / arculat', label: 'Web-bio bekérése (magyar szöveg + fotó)',
    subject: () => 'Honlap: bemutatkozó szöveg és fotó kérése',
    body: (c) => `Szia [Név]!\n\nA szak honlapjára frissítjük az oktatói bemutatkozásokat, és ehhez kérnék tőled egy rövid, kb. [terjedelem] hosszú szöveget magadról és a szakmai hátteredről. Emellett jó lenne egy jó minőségű portréfotó is, amit használhatunk a profilodhoz.\n\nKérlek, ${or(c.due, '[dátum]')}-ig küldd el mindkettőt, hogy egyszerre tudjuk feltölteni az anyagokat. Ha szeretnéd, szívesen átnézem a szöveget, mielőtt felkerül. Köszönöm!`,
  },
  {
    id: 'gyors-visszaigazolas', group: '15 · Általános', label: 'Gyors visszaigazolás / rövid válasz',
    subject: () => 'Re: [eredeti tárgy]',
    body: () => `Szia [Név]!\n\nKöszönöm, hogy írtál, megkaptam a(z) [anyag/kérdés]-t. [Rendben, így jó / átnéztem, és: megjegyzés.] A következő lépés: [teendő / dátum].\n\nHa addig bármi kell, szólj nyugodtan. Köszönöm a gyors reakciót!`,
  },
  {
    id: 'orakezdes', group: '8 · Hallgatói ügyek', label: 'Órakezdés-emlékeztető (körlevél, hallgatók)',
    subject: () => 'Órák indulása, emlékeztető',
    body: (c) => `Kedves Hallgatók!\n\nSzeretnélek emlékeztetni Titeket, hogy a félév órái ${or(c.when, '[dátum]')}-án indulnak a közzétett órarend szerint. Az órarendet itt éritek el: [link], kérlek, nézzétek át időben a saját tárgyaitokat. Figyeljetek a tárgyfelvételi és regisztrációs határidőkre is, amelyek ${or(c.due, '[dátum]')}-kor zárulnak. Az első héten minden órán részvételt várunk, ott hangzanak el a féléves követelmények.\n\nHa bármi kérdésetek van a kezdéssel kapcsolatban, írjatok bátran. Jó félévet mindenkinek!`,
  },
  {
    id: 'szakmai-gyakorlat', group: '8 · Hallgatói ügyek', label: 'Szakmai gyakorlat egyeztetése',
    subject: () => 'Szakmai gyakorlat: [hallgató / cég]',
    body: () => `Szia [Név]!\n\n[Hallgató] szakmai gyakorlatáról szeretnék veled egyeztetni, amelyet a(z) [cég]-nél tervez [időszak] között. Kérlek, nézd át, hogy a gyakorlat tartalma megfelel-e a szak követelményeinek, illetve hogy a témavezetés és az értékelés rendben lesz-e. Ha bármilyen dokumentum vagy jóváhagyás szükséges a részemről, jelezd, és intézem.\n\nKöszönöm, hogy segítesz, hogy a hallgató időben elindulhasson!`,
  },
  {
    id: 'szakdolgozat-leadas', group: '13 · Záróvizsga / opponencia', label: 'Szakdolgozat-leadási emlékeztető (körlevél)',
    subject: (c) => `Szakdolgozat leadás, határidő: ${or(c.due, '[dátum]')}`,
    body: (c) => `Kedves Kollégák!\n\nKözeledik a szakdolgozatok leadási határideje, amely ${or(c.due, '[dátum]')}, ezért kérlek, sürgessétek a témavezetett hallgatóitokat. Fontos, hogy a formai és tartalmi követelmények is rendben legyenek, mert a késői javítás sok gondot okoz a hallgatóknak. Kérlek, jelezzétek, ha valamelyik hallgatónál csúszás várható, hogy időben tudjunk reagálni.\n\nKöszönöm, hogy figyeltek a leadási folyamatra!`,
  },
  {
    id: 'konzultacio-statusz', group: '13 · Záróvizsga / opponencia', label: 'Konzultációs státusz bekérése',
    subject: () => 'Szakdolgozati konzultáció, státusz',
    body: (c) => `Szia [Név]!\n\nKérlek, oszd meg röviden, hogy állnak a témavezetett hallgatóid a szakdolgozattal a leadás előtt. Érdekel, hogy van-e olyan hallgató, akinél komolyabb lemaradás van, vagy ahol beavatkozásra lehet szükség ${or(c.due, '[dátum]')} előtt. Ha úgy látod, hogy szakvezetői egyeztetés kell valamelyik esethez, jelezd, és megkeresem a hallgatót.\n\nKöszönöm, hogy figyelemmel kíséred a haladásukat!`,
  },
  {
    id: 'workshop-felkeres', group: '6 · Külső kapcsolatok', label: 'Workshop felkérés',
    subject: (c) => `Workshop felkérés: ${or(c.title, '[téma]')}, ${or(c.when, '[dátum]')}`,
    body: (c) => `Kedves [Név]!\n\nA Média Design szakon szeretnélek felkérni egy [időtartam]-es workshopra ${or(c.title, '[téma]')} témában, ${or(c.when, '[dátum]')} körül. Nagyon értékes lenne a hallgatóink számára, ha a Te gyakorlati tapasztalatodból is kaphatnának egy intenzív, kézzelfogható betekintést. Az időpontot és a technikai részleteket rugalmasan tudjuk egyeztetni, ahogy Neked kényelmes.\n\nKérlek, jelezd, hogy belefér-e, nagyon örülnék, ha összejönne. Köszönöm!`,
  },
  {
    id: 'hallgatoi-bemutato', group: '6 · Külső kapcsolatok', label: 'Hallgatói bemutató / kiállítás előkészítése (körlevél)',
    subject: (c) => `Hallgatói bemutató: ${or(c.title, '[esemény]')}, ${or(c.when, '[dátum]')}`,
    body: (c) => `Kedves Kollégák!\n\nA(z) ${or(c.title, '[esemény]')} ${or(c.when, '[dátum]')}-án lesz${c.place ? ` (${nd(c.place)})` : ''}, amely nagyszerű alkalom a hallgatói munkák bemutatására. Kérlek, készítsétek elő a csoportjaitokkal a kiállításra / bemutatóra szánt anyagokat, és jelezzétek a technikai igényeket (vetítés, hang, installáció) ${or(c.due, '[határidő]')}-ig. Fontos, hogy a szak erős, összeszedett képet mutasson, ezért örülök minden segítségnek a szervezésben.\n\nHa kérdés van a formátummal vagy a helyszínnel kapcsolatban, keressetek nyugodtan. Köszönöm!`,
  },
  {
    id: 'diplomabemutato', group: '13 · Záróvizsga / opponencia', label: 'Diplomabemutató szervezése (körlevél)',
    subject: (c) => `Diplomabemutató, ${or(c.when, '[dátum]')}`,
    body: (c) => `Kedves Kollégák!\n\nA diplomamunkák bemutatója ${or(c.when, '[dátum]')}-án lesz${c.place ? ` (${nd(c.place)})` : ' [helyszín]'}, amely a végzős hallgatók munkájának kiemelt eseménye. Kérlek, készítsétek fel a hallgatókat a prezentációra, és jelezzétek a technikai igényeket ${or(c.due, '[határidő]')}-ig. Fontos, hogy a bemutató méltó legyen a féléves munkához, ezért örülök minden segítségnek a szervezésben.\n\nHa kérdés van a menetrenddel vagy a formátummal kapcsolatban, keressetek nyugodtan. Köszönöm!`,
  },
  // a kibővített 2-5. rész (szeptember-január) új sablonjai
  {
    id: 'tematika-hiany', group: '1 · Tematikák és órarend', label: 'Hiányzó tematika sürgetése',
    subject: () => 'Hiányzó tematika: [tantárgy]',
    body: (c) => `Szia [Név]!\n\nA féléves anyagok átnézésekor azt láttam, hogy a(z) [tantárgy] tematikája még hiányzik vagy nincs frissítve a rendszerben. Kérlek, pótold ${or(c.due, '[dátum]')}-ig, hogy a hallgatók pontos tájékoztatást kapjanak, és le tudjuk zárni a féléves adminisztrációt. Ha technikai gond van a feltöltéssel, szólj, és segítek.\n\nKöszönöm, hogy soron kívül ránézel!`,
  },
  {
    id: 'regisztracio-emlekezteto', group: '8 · Hallgatói ügyek', label: 'Regisztrációs határidők (körlevél, hallgatók)',
    subject: () => 'Regisztrációs határidők, emlékeztető',
    body: (c) => `Kedves Hallgatók!\n\nSzeretnélek emlékeztetni Titeket, hogy a tárgyfelvétel és a regisztráció határideje ${or(c.due, '[dátum]')}. Kérlek, ellenőrizzétek a felvett tárgyaitokat és a státuszotokat a Neptunban, hogy ne maradjon le semmi. A késői rendezés adminisztratív problémákat okozhat, ezért érdemes időben átnézni.\n\nHa valakinek elakadása van, írjon nyugodtan, és segítek megoldani.`,
  },
  {
    id: 'hallgatoi-valasz', group: '8 · Hallgatói ügyek', label: 'Hallgatói kérdés megválaszolása',
    subject: () => 'Re: [hallgatói kérdés tárgya]',
    body: () => `Kedves [Név]!\n\nKöszönöm a kérdésed, igyekszem segíteni. [Válasz / tájékoztatás a konkrét ügyben, pl. tárgyfelvétel, hiányzás, konzultáció.] Ha ez alapján még maradt kérdésed, írj bátran, vagy keress a fogadóórámban.\n\nSok sikert a félévhez!`,
  },
  {
    id: 'adat-bekeres', group: '10 · Belső / technikai', label: 'Adminisztratív adat / lista bekérése (körlevél)',
    subject: (c) => `[Adat/lista] bekérése, ${or(c.due, '[dátum]')}-ig`,
    body: (c) => `Kedves Kollégák!\n\nA féléves adminisztrációhoz szükségem lenne tőletek a(z) [adat/lista: pl. kurzusadatok, értékelési szempontok, terembeosztás]-ra. Kérlek, küldjétek el ${or(c.due, '[dátum]')}-ig, hogy egységesen tudjuk rögzíteni és továbbítani a megfelelő helyre. Igyekszem minél kevesebbszer terhelni Titeket ilyen kérésekkel, ezért hálás vagyok, ha időben megkapom.\n\nHa kérdés van a formátummal kapcsolatban, szóljatok. Köszönöm!`,
  },
  {
    id: 'workshop-reszletek', group: '6 · Külső kapcsolatok', label: 'Workshop / előadás részletegyeztetés',
    subject: (c) => `Workshop / előadás részletei: ${or(c.title, '[téma]')}`,
    body: (c) => `Kedves [Név]!\n\nKöszönöm, hogy vállaltad a(z) ${or(c.title, '[téma]')} témájú workshopot / előadást, nagyon örülünk neki! A tervezett időpont ${or(c.when, '[dátum, időpont]')}, a helyszín ${or(c.place, '[helyszín / online link]')}, a résztvevő hallgatók száma kb. [létszám]. Kérlek, jelezd, ha valamilyen technikai igényed van (pl. projektor, gépterem, eszközök), hogy időben elő tudjuk készíteni.\n\nHa bármit egyeztetnél előtte, keress nyugodtan. Köszönöm!`,
  },
  {
    id: 'projekthet-reszletek', group: '4 · Projekthét', label: 'Végleges beosztás és tudnivalók (körlevél)',
    subject: () => 'Projekthét, végleges beosztás és tudnivalók',
    body: (c) => `Kedves Kollégák!\n\nKözeledik a(z) ${or(c.when, '[dátum]')} heti projekthét, ezért küldöm a végleges beosztást és a legfontosabb tudnivalókat: [link / csatolmány]. Kérlek, nézzétek át a rátok osztott sávokat, termeket és a hallgatói csoportokat, és jelezzétek, ha bárhol pontosítás kell. Fontos, hogy a hét gördülékeny legyen, ezért örülök, ha a technikai igényeket is előre jelzitek.\n\nBármi kérdés van, keressetek nyugodtan a hét folyamán is. Köszönöm!`,
  },
  {
    id: 'tavaszi-indulas', group: '2 · Oktatói kapcsolattartás', label: 'Tavaszi szemeszter indító tájékoztató (körlevél)',
    subject: () => 'Tavaszi szemeszter, indulás és tudnivalók',
    body: (c) => `Kedves Kollégák!\n\nKellemes ünnepek után szeretettel köszöntelek Titeket a tavaszi félév előtt, amely ${or(c.when, '[dátum]')}-án indul. A legfontosabb induló feladatok: a tematikák frissítése, a konzultációs idősávok megadása és a félévindító értekezlet. A részleteket a következő napokban küldöm, de aki előre szeretne haladni, nyugodtan kezdjen bele.\n\nJó, energikus félévet kívánok mindannyiunknak!`,
  },
  {
    id: 'rovid-egyeztetes', group: '15 · Általános', label: 'Rövid egyeztetés kérése',
    subject: (c) => `Rövid egyeztetés: ${or(c.title, '[téma]')}`,
    body: (c) => `Szia [Név]!\n\nSzeretnék veled leülni egy rövid egyeztetésre a(z) ${or(c.title, '[téma]')} kapcsán, hogy minden gördülékenyen menjen. Több időpont is szóba jöhet nálam: ${or(c.when, '[időpont 1] vagy [időpont 2]')}, de rugalmas vagyok, ha neked más felel meg jobban. Elég lenne kb. [időtartam], akár személyesen, akár online.\n\nKérlek, jelezd, melyik alkalom jó, és rögzítem. Köszönöm!`,
  },
  // a 9-11. rész (május-június + kiegészítő tételek, 73-120) új sablonjai
  {
    id: 'zv-menetrend', group: '13 · Záróvizsga / opponencia', label: 'Záróvizsga menetrend és tudnivalók (körlevél)',
    subject: () => 'Záróvizsga, menetrend és tudnivalók',
    body: (c) => `Kedves Kollégák!\n\nKüldöm a záróvizsgák részletes menetrendjét, amely ${or(c.when, '[dátum]-tól [dátum]-ig')} tart, a napi beosztással együtt: [link / csatolmány]. Kérlek, nézzétek át a saját napjaitokat és bizottságaitokat, és érkezzetek időben, hogy zökkenőmentes legyen a lebonyolítás. A bírálatokat és az értékeléshez szükséges anyagokat ${or(c.due, '[dátum]')}-ig kérem, hogy minden készen álljon.\n\nHa bármi kérdés van, keressetek nyugodtan a vizsgaidőszak alatt is. Köszönöm!`,
  },
  {
    id: 'zv-bizottsag', group: '13 · Záróvizsga / opponencia', label: 'Záróvizsga-bizottsági felkérés / megerősítés',
    subject: (c) => `Záróvizsga-bizottság, ${or(c.when, '[dátum]')}, megerősítés`,
    body: (c) => `Szia [Név]!\n\nA(z) ${or(c.when, '[dátum]')}-i záróvizsga-bizottságba szeretnélek felkérni [szerep: elnök / tag] minőségben. A vizsga [időpont]-kor kezdődik${c.place ? ` (${nd(c.place)})` : ' [helyszín]'}, és várhatóan [időtartam]-ig tart, [létszám] hallgatóval. Kérlek, erősítsd meg, hogy ez az időpont megfelel-e, hogy véglegesíthessem a beosztást.\n\nKöszönöm, hogy vállalod, sokat számít a szakszerű és gördülékeny vizsgáztatás!`,
  },
  {
    id: 'potzarovizsga', group: '13 · Záróvizsga / opponencia', label: 'Pótzáróvizsga / halasztott vizsga egyeztetése',
    subject: () => 'Pótzáróvizsga: [hallgató], egyeztetés',
    body: (c) => `Szia [Név]!\n\n[Hallgató] pótzáróvizsgát / halasztott záróvizsgát kér, ezért kérlek, segíts egy megfelelő időpont és bizottság megtalálásában. A tervezett időszak a(z) ${or(c.when, '[dátum]')} körüli lenne, de rugalmas vagyok, ahogy a bizottságnak jobb. Kérlek, jelezd, hogy el tudod-e vállalni, és melyik időpont felel meg.\n\nKöszönöm, hogy segítesz rendezni a hallgató ügyét!`,
  },
  {
    id: 'vedes-idopont', group: '13 · Záróvizsga / opponencia', label: 'Védés-időpont egyeztetése hallgatóval',
    subject: (c) => `Szakdolgozat-védés, időpont: ${or(c.when, '[dátum]')}`,
    body: (c) => `Kedves [Név]!\n\nA szakdolgozat-védésed / záróvizsgád tervezett időpontja ${or(c.when, '[dátum, időpont]')}${c.place ? `, a helyszín pedig ${nd(c.place)}` : ', a helyszín pedig [helyszín]'}. Kérlek, erősítsd meg, hogy ez az időpont megfelel-e neked, illetve jelezd, ha bármilyen akadály van. Fontos, hogy a bemutatódat és a szükséges anyagokat időben elkészítsd, a részletes tudnivalókat [csatolom / megküldöm].\n\nHa bármi kérdésed van a védéssel kapcsolatban, írj nyugodtan.`,
  },
  {
    id: 'jegybeiras-korlevel', group: '14 · Félévközben és záráskor', label: 'Jegybeírás és félévzárás (körlevél)',
    subject: (c) => `Jegybeírás és félévzárás, határidő: ${or(c.due, '[dátum]')}`,
    body: (c) => `Kedves Kollégák!\n\nA félév vége közeledik, ezért kérlek, a jegyeket és az értékeléseket vezessétek be a Neptunban ${or(c.due, '[dátum]')}-ig. Fontos, hogy időben lezárjuk a szemesztert, mert a hallgatók ettől függő ügyeket intéznek (pl. továbbhaladás, ösztöndíj, diploma). Ha valamelyik hallgatónál nyitott kérdés van, jelezzétek, és megbeszéljük.\n\nKöszönöm, hogy figyeltek a határidőre!`,
  },
  {
    id: 'jegybeiras-vegso', group: '14 · Félévközben és záráskor', label: 'Jegybeírás, végső határidő (sürgető körlevél)',
    subject: (c) => `Jegybeírás, végső határidő: ${or(c.due, '[dátum]')}`,
    body: (c) => `Kedves Kollégák!\n\nSzeretnélek emlékeztetni Titeket, hogy a jegybeírás végső határideje ${or(c.due, '[dátum]')}, amely után a rendszer lezár. Kérlek, ellenőrizzétek, hogy minden hallgatónál rögzítve van-e az értékelés, mert a hiányzó jegyek sok adminisztratív gondot okoznak a hallgatóknak. Ha valamelyik esetben nyitott kérdés van, jelezzétek soron kívül, hogy megoldjuk.\n\nKöszönöm, hogy időben rendezitek!`,
  },
  {
    id: 'utovizsga', group: '14 · Félévközben és záráskor', label: 'Utóvizsga-időszak tudnivalók (körlevél)',
    subject: () => 'Utóvizsga-időszak, tudnivalók',
    body: (c) => `Kedves Kollégák!\n\nA rendes vizsgaidőszakot követően néhány hallgatónak utóvizsgára / halasztott vizsgára van szüksége, ezért kérlek, jelezzétek a lehetséges időpontjaitokat. A cél, hogy ${or(c.due, '[dátum]')}-ig lezárjuk ezeket az eseteket, hogy a hallgatók továbbhaladása ne csússzon. Kérlek, a vizsgaidőpontokat hirdessétek meg a Neptunban, vagy egyeztessétek egyénileg a hallgatóval.\n\nKöszönöm, hogy segítetek rendezni a nyitott vizsgákat!`,
  },
  {
    id: 'nyari-teendok', group: '14 · Félévközben és záráskor', label: 'Nyári teendők, szünet előtti összefoglaló (körlevél)',
    subject: () => 'Nyári időszak, teendők és tudnivalók',
    body: (c) => `Kedves Kollégák!\n\nAhogy közeledünk a nyári szünethez, szeretném összefoglalni a legfontosabb teendőket, amiket még érdemes lezárni. A fő pontok: [1. jegyek], [2. dokumentumok], [3. következő tanév előkészítése]. Kérlek, ezeket ${or(c.due, '[dátum]')}-ig rendezzétek, hogy nyugodtan mehessünk pihenni.\n\nKöszönöm mindenkinek az egész éves munkát!`,
  },
  {
    id: 'eves-beszamolo', group: '14 · Félévközben és záráskor', label: 'Éves szakmai beszámoló bekérése (körlevél)',
    subject: () => 'Éves szakmai beszámoló, kérés',
    body: (c) => `Kedves Kollégák!\n\nElkészítem a szak éves szakmai beszámolóját, és ehhez szeretném összegyűjteni a tanév legfontosabb eredményeit. Kérlek, küldjétek el röviden a(z) [tantárgy/terület] kapcsán a kiemelt eseményeket, hallgatói sikereket és szakmai eredményeket. Néhány mondat is elég, csak fontos, hogy semmi lényeges ne maradjon ki.\n\nKöszönöm, hogy ${or(c.due, '[dátum]')}-ig segítetek összeállítani!`,
  },
  {
    id: 'felevzaro-koszonet', group: '2 · Oktatói kapcsolattartás', label: 'Félévzáró köszönet az oktatóknak (körlevél)',
    subject: () => 'Köszönet a félévért!',
    body: () => `Kedves Kollégák!\n\nA félév lezárultával szeretném megköszönni mindannyiótoknak a kitartó és értékteremtő munkát. Sok szép hallgatói eredmény és jól sikerült esemény fűződik ehhez a félévhez, és ez a Ti érdemetek is. Kívánok mindenkinek pihentető, feltöltődős nyarat a szeretteivel.\n\nAz őszi félév előkészítéséről a nyár folyamán jelentkezem.`,
  },
  {
    id: 'tanev-elokeszites', group: '2 · Oktatói kapcsolattartás', label: 'Következő tanév előkészítése, első teendők (körlevél)',
    subject: () => '[Következő tanév], előkészítés indul',
    body: (c) => `Kedves Kollégák!\n\nBár közeleg a nyári szünet, szeretnék néhány dolgot időben elindítani a következő tanév előkészítéséhez. A fő pontok most: a tantárgyfelosztás véglegesítése, az órarendi igények és az esetleges új kurzusötletek. Kérlek, akinek van javaslata vagy jelzése, azt ${or(c.due, '[dátum]')}-ig küldje el felém.\n\nÍgy nyugodtabban tudunk indulni ősszel, és kevesebb lesz az utolsó pillanatos egyeztetés. Köszönöm!`,
  },
  {
    id: 'nyari-elerhetoseg', group: '2 · Oktatói kapcsolattartás', label: 'Nyári elérhetőség egyeztetése (körlevél)',
    subject: () => 'Nyári elérhetőség, kérlek, jelezzétek',
    body: () => `Kedves Kollégák!\n\nA nyári időszakra szeretném összegyűjteni, ki mikor lesz elérhető, hogy a felmerülő ügyeket zökkenőmentesen tudjuk kezelni. Kérlek, jelezzétek, hozzávetőleg mely időszakokban vagytok szabadságon, illetve mikor tudtok szükség esetén reagálni. Igyekszünk a nyári terhelést minimálisra szorítani, de néhány ügy (pl. felvételi, utóvizsga) folyamatos lehet.\n\nKöszönöm, hogy segítetek a tervezésben!`,
  },
  {
    id: 'oraado-felkeres', group: '2 · Oktatói kapcsolattartás', label: 'Új oktató / óraadó felkérése',
    subject: () => 'Felkérés: [tantárgy] oktatása, [következő tanév]',
    body: () => `Kedves [Név]!\n\nA következő tanévben szeretnélek felkérni a(z) [tantárgy] oktatására a Média Design szakon. Úgy gondolom, hogy a szakmai hátteredből és tapasztalatodból sokat profitálnának a hallgatóink, ezért nagyon örülnék, ha csatlakoznál. A tárgy heti [óraszám], a tervezett időszak [félév], a részleteket pedig rugalmasan egyeztethetjük.\n\nKérlek, jelezd, hogy érdekel-e, és egy rövid beszélgetésben átvesszük a tudnivalókat. Köszönöm!`,
  },
  {
    id: 'evzaro-ertekezlet', group: '2 · Oktatói kapcsolattartás', label: 'Tanév végi értekezlet meghívó (körlevél)',
    subject: (c) => `Tanév végi értekezlet, ${or(c.when, '[dátum, időpont]')}`,
    body: (c) => `Kedves Kollégák!\n\n${or(c.when, '[dátum] [időpont]')}-kor tanév végi értekezletet tartunk${c.place ? ` (${nd(c.place)})` : ' [helyszín / Zoom-link]'}, amelyre mindenkit szeretettel várok. Áttekintjük az idei tanév tapasztalatait, a fontosabb eredményeket és a következő évre vonatkozó terveket. Kérlek, ${or(c.due, '[dátum]')}-ig jelezzétek, ha nem tudtok részt venni.\n\nJó alkalom lesz közösen lezárni az évet és felkészülni a következőre.`,
  },
  {
    id: 'orarendi-igenyek', group: '1 · Tematikák és órarend', label: 'Órarendi igények bekérése (következő tanév)',
    subject: () => '[Következő tanév], órarendi igények',
    body: (c) => `Szia [Név]!\n\nA következő tanév órarendjének tervezéséhez szeretném összegyűjteni az igényeket. Kérlek, jelezd, hogy vannak-e olyan napok vagy idősávok, amelyek jobban vagy kevésbé felelnek meg neked, illetve ha valamilyen kötöttséged van. Igyekszem ezeket a lehetőségekhez mérten figyelembe venni a beosztásnál.\n\nKöszönöm, hogy ${or(c.due, '[dátum]')}-ig visszajelzel, sokat segít a tervezésben!`,
  },
  {
    id: 'tematika-kovetkezo-tanev', group: '1 · Tematikák és órarend', label: 'Következő tanévi tematikák bekérése (körlevél)',
    subject: () => '[Következő tanév], tematikák és szillabuszok',
    body: (c) => `Kedves Kollégák!\n\nA következő tanévhez szeretném időben elindítani a tematikák és szillabuszok frissítését, hogy ne a kezdés előtti hajrában kelljen mindent rendezni. Kérlek, nézzétek át a rátok osztott tárgyakat, és jelezzétek, ha változást terveztek a tartalomban vagy a követelményekben. A leadási határidő ${or(c.due, '[dátum]')}, de aki előre halad, annak nagyon hálás vagyok.\n\nHa kérdés van a felülettel kapcsolatban, szóljatok, és segítek. Köszönöm!`,
  },
  {
    id: 'felveteli-kozremukodes', group: '3 · Pótfelvételi', label: 'Felvételi közreműködés kérése (körlevél)',
    subject: (c) => `Felvételi közreműködés, ${or(c.when, '[időpont]')}`,
    body: (c) => `Kedves Kollégák!\n\nA nyári felvételi / pótfelvételi időszakhoz kapcsolódóan szükségem lenne néhány kolléga közreműködésére a(z) [feladat: pl. felvételi beszélgetések / portfólió-értékelés]-ben. Kérlek, jelezzétek ${or(c.due, '[dátum]')}-ig, ki tud részt venni, hogy össze tudjam állítani a beosztást. A jelentkezők száma és a pontos időpontok alapján egyeztetjük a részleteket.\n\nKöszönöm, hogy segítetek a szak utánpótlásának biztosításában!`,
  },
  {
    id: 'portfolio-ertekeles', group: '3 · Pótfelvételi', label: 'Portfólió-értékelés / felvételi bírálat felkérése',
    subject: (c) => `Portfólió-értékelés, ${or(c.when, '[időpont]')}`,
    body: (c) => `Szia [Név]!\n\nA felvételi folyamathoz szeretnélek felkérni portfólió-értékelésre / felvételi beszélgetésre a(z) ${or(c.when, '[időpont]')} körüli időszakban. Kb. [létszám] jelentkező anyagát kellene átnézni a szak szempontjai szerint, amelyeket [csatolok / megküldök]. Kérlek, jelezd, hogy be tudod-e vállalni, és melyik időpont felel meg neked.\n\nKöszönöm, hogy segítesz kiválasztani a legígéretesebb jelentkezőket!`,
  },
  {
    id: 'projekthet-tervezes', group: '4 · Projekthét', label: 'Projekthetek / események tervezése (körlevél)',
    subject: () => '[Következő tanév], projekthetek és események tervezése',
    body: (c) => `Kedves Kollégák!\n\nElkezdem a következő tanév projekthéteinek és kiemelt eseményeinek a tervezését, és szeretném a ti ötleteiteket is beépíteni. Kérlek, jelezzétek, ha van olyan téma, vendégelőadó vagy esemény, amit szívesen látnátok a jövő évi programban. A javaslatokat ${or(c.due, '[dátum]')}-ig várom, hogy időben be tudjuk illeszteni a naptárba.\n\nKöszönöm, hogy hozzájárultok a szak programjának alakításához!`,
  },
  {
    id: 'vegzos-gratulacio', group: '8 · Hallgatói ügyek', label: 'Végzősök köszöntése / gratuláció (körlevél)',
    subject: () => 'Gratuláció a végzős hallgatóknak!',
    body: () => `Kedves Végzős Hallgatók!\n\nA záróvizsgák és a diplomamunkák lezárultával szeretnék szívből gratulálni Nektek az elért eredményhez! Nagyszerű volt látni, ahogy a féléveitek során fejlődtetek, és büszkék vagyunk arra, amit alkottatok. Kívánom, hogy a Média Designban szerzett tudást bátran és sikerrel használjátok a pályátokon.\n\nBármikor szeretettel visszavárunk, és sok sikert kívánok a következő lépéseitekhez!`,
  },
  {
    id: 'hallgatoi-koszonet', group: '8 · Hallgatói ügyek', label: 'Tanév végi köszönet a hallgatóknak (körlevél)',
    subject: () => 'Köszönet és szép nyarat!',
    body: () => `Kedves Hallgatók!\n\nA tanév végéhez érve szeretném megköszönni a közös munkát és a lelkesedést, amivel a féléveitekhez hozzáálltatok. Sok szép alkotás és fejlődés fűződik ehhez az évhez, és büszkék vagyunk rátok. Kívánok mindenkinek pihentető, feltöltődős nyári szünetet.\n\nŐsszel új energiával, sok érdekes projekttel várunk vissza benneteket!`,
  },
  {
    id: 'nyari-lehetosegek', group: '8 · Hallgatói ügyek', label: 'Nyári projektek / lehetőségek (körlevél, hallgatók)',
    subject: () => 'Nyári lehetőségek: projektek és gyakorlat',
    body: () => `Kedves Hallgatók!\n\nA nyári szünet jó alkalom arra, hogy szakmailag is fejlődjetek, ezért szeretnék néhány lehetőséget a figyelmetekbe ajánlani. Érdemes megfontolni [szakmai gyakorlat / önálló projekt / verseny / pályázat]-ot, amelyekben szívesen segítünk. Ha valamelyik érdekel, vagy témában tanácsot kérnétek, írjatok nyugodtan a nyár folyamán.\n\nJó pihenést és inspiráló nyarat kívánok!`,
  },
  {
    id: 'meltanyossagi', group: '8 · Hallgatói ügyek', label: 'Hallgatói kérelem / méltányossági ügy',
    subject: () => '[Hallgató], kérelem: [ügy]',
    body: () => `Szia [Név]!\n\n[Hallgató] egy [méltányossági / halasztási / felmentési] kérelemmel fordult hozzám a(z) [ügy] kapcsán. Kérlek, segíts megítélni, hogy a szak szempontjából támogatható-e, illetve milyen feltételekkel. Ha szükséges, egyeztetek a hallgatóval és a megfelelő adminisztratív egységgel is.\n\nKöszönöm, hogy segítesz körüljárni az ügyet, hogy korrekt döntést tudjunk hozni!`,
  },
  {
    id: 'publikacios-adatok', group: '10 · Belső / technikai', label: 'Kutatási / publikációs adatok bekérése (körlevél)',
    subject: () => 'Kutatási / publikációs adatok, [időszak]',
    body: (c) => `Kedves Kollégák!\n\nA féléves / éves kutatási és publikációs adatszolgáltatáshoz kérnék tőletek néhány információt. Kérlek, küldjétek el a(z) [időszak]-ban megjelent publikációitokat, konferencia-részvételeiteket és egyéb szakmai eredményeiteket. Ezekre az intézményi beszámolóhoz és a szak láthatóságához is szükség van.\n\nKöszönöm, hogy ${or(c.due, '[dátum]')}-ig összeszeditek és elkülditek!`,
  },
  {
    id: 'eszkozigeny-tanev', group: '10 · Belső / technikai', label: 'Terem- és eszközigény (következő tanév)',
    subject: () => '[Következő tanév], terem- és eszközigény',
    body: () => `Szia [Név]!\n\nA következő tanév tervezéséhez szeretném összegyűjteni a szak terem- és eszközigényeit. A Média Design gyakorlati jellege miatt szükségünk lesz [teremtípusok / eszközök]-re, különösen a(z) [tantárgyak]-nál. Kérlek, jelezd, hogy ezek biztosíthatók-e, illetve ha valamit előre foglalni kell.\n\nKöszönöm, hogy segítesz, hogy zökkenőmentesen indulhasson az ősz!`,
  },
  {
    id: 'hir-tovabbitas', group: '10 · Belső / technikai', label: 'Intézményi hír / METU HÍREK továbbítása (körlevél)',
    subject: () => 'Tovább: [intézményi hír / METU HÍREK]',
    body: () => `Kedves Kollégák!\n\nMegkaptam a(z) [intézményi közlemény / METU HÍREK]-t, amely a szakunkat is érinti, ezért továbbítom nektek. A lényeg röviden: [1-2 mondatos összefoglaló], a hozzá tartozó teendő és határidő: [teendő / dátum]. Kérlek, nézzétek át, és jelezzétek, ha valakit közvetlenül érint.\n\nHa kérdés van, én is szívesen egyeztetek az illetékesekkel.`,
  },
  {
    id: 'oracsere', group: '11 · Óratervezés / óralátogatás', label: 'Óracsere / helyettesítés egyeztetése',
    subject: (c) => `Óracsere / helyettesítés: [tantárgy], ${or(c.when, '[dátum]')}`,
    body: (c) => `Szia [Név]!\n\nA(z) ${or(c.when, '[dátum]')}-i [tantárgy] órámat [ok miatt] nem tudom megtartani, ezért óracserét / helyettesítést szeretnék egyeztetni. Meg tudnád oldani, hogy [áthelyezzük új időpontra / helyettesítenéd az adott alkalmat]? Természetesen én is szívesen viszonzom, ha neked adódik hasonló.\n\nKérlek, jelezz vissza, hogy mi a legjobb megoldás, és a hallgatókat időben értesítem. Köszönöm!`,
  },
  {
    id: 'megkereses-valasz', group: '6 · Külső kapcsolatok', label: 'Külső megkeresésre válasz',
    subject: () => 'Re: [megkeresés tárgya]',
    body: () => `Kedves [Név]!\n\nKöszönöm a megkeresést és az együttműködési ajánlatot, örömmel olvastam. A(z) [téma / projekt] a szakunk profiljába jól illeszkedik, ezért szívesen egyeztetnénk a lehetőségekről. Kérlek, jelezd, mikor tudnánk egy rövid beszélgetést egyeztetni, akár személyesen, akár online.\n\nAddig is, ha van bővebb anyag a tervezett együttműködésről, szívesen áttekintem.`,
  },
  {
    id: 'palyazat-ertesites', group: '16 · Pályázatok / kutatás', label: 'Pályázati értesítés kezelése (belső jelzés)',
    subject: () => 'Kutatási pályázat: [pályázat neve], [teendő]',
    body: () => `Szia [Név]!\n\nMegérkezett a(z) [pályázat neve] pályázattal kapcsolatos értesítés, amelyben [rövid összefoglaló: pl. beadási / hiánypótlási / eredmény]. Kérlek, nézzük át együtt, hogy milyen teendő és határidő tartozik hozzá a szak részéről. Fontos, hogy időben reagáljunk, mert a határidő szoros lehet.\n\nHa egyeztetnél róla, jelezz egy időpontot, és átvesszük a részleteket. Köszönöm!`,
  },
  {
    id: 'palyazat-konzorcium', group: '16 · Pályázatok / kutatás', label: 'Pályázati részvétel / konzorcium (körlevél)',
    subject: () => '[Pályázat], közös részvétel egyeztetése',
    body: (c) => `Kedves Kollégák!\n\nLehetőség nyílt a(z) [pályázat] pályázaton való részvételre, amely jól illeszkedik a szak kutatási irányaihoz. Szeretném felmérni, kit érdekelne a bekapcsolódás, akár témavezetőként, akár közreműködőként. Kérlek, ${or(c.due, '[dátum]')}-ig jelezzétek az érdeklődéseteket és az esetleges témajavaslatokat.\n\nHa elég érdeklődő lesz, összehívok egy rövid egyeztetést a részletekről. Köszönöm!`,
  },
  {
    id: 'idopont-visszaigazolas', group: '15 · Általános', label: 'Megbeszélés-kérésre válasz / időpont-visszaigazolás',
    subject: () => 'Re: [megbeszélés tárgya]',
    body: (c) => `Szia [Név]!\n\nKöszönöm a megkeresést, szívesen leülök veled a(z) ${or(c.title, '[téma]')} megbeszélésére. A javasolt időpontok közül a(z) [időpont] megfelel nekem, vagy ha az mégsem jó, akkor [alternatív időpont] is szóba jöhet. Kérlek, erősítsd meg, melyik a jó, és jelezd, hogy személyesen vagy online egyeztetnénk.\n\nAddig is, ha van olyan anyag, amit érdemes átnéznem előtte, küldd el nyugodtan.`,
  },
  {
    id: 'megbeszeles-osszehivas', group: '15 · Általános', label: 'Megbeszélés összehívása (kisebb kör)',
    subject: (c) => `Rövid egyeztetés: ${or(c.title, '[téma]')}, ${or(c.when, '[időpont]')}`,
    body: (c) => `Kedves [Nevek]!\n\nSzeretnék veletek egy rövid egyeztetést a(z) ${or(c.title, '[téma]')} kapcsán, hogy közösen továbblépjünk. A javasolt időpont ${or(c.when, '[dátum, időpont]')}${c.place ? ` (${nd(c.place)})` : ' [helyszín / online link]'}, és kb. [időtartam]-ot venne igénybe. Kérlek, jelezzétek, hogy megfelel-e, vagy ha valakinek ütközik, javasoljon alternatívát.\n\nA megbeszélni kívánt pontokat [felsorolom / csatolom], hogy hatékonyak legyünk. Köszönöm!`,
  },
  {
    id: 'holnap-emlekezteto', group: '15 · Általános', label: 'Gyors emlékeztető holnapi eseményre',
    subject: (c) => `Holnap: ${or(c.title, '[esemény]')}, ${or(c.when, '[időpont]')}`,
    body: (c) => `Szia [Név]!\n\nCsak egy gyors emlékeztető, hogy holnap ${or(c.when, '[időpont]')}-kor lesz a(z) ${or(c.title, '[esemény / megbeszélés]')}${c.place ? ` (${nd(c.place)})` : ' [helyszín / online link]'}. Ha bármi közbejönne, jelezz nyugodtan, és átütemezzük. Ha van valami, amit érdemes előtte átnéznem, küldd el ma, és felkészülök.\n\nKöszönöm, holnap találkozunk!`,
  },
  {
    id: 'nyugtazo-valasz', group: '15 · Általános', label: 'Gyors köszönöm / nyugtázó válasz',
    subject: () => 'Re: [eredeti tárgy]',
    body: () => `Szia [Név]!\n\nKöszönöm, megkaptam, minden rendben, így tökéletes. Ha lesz még valami ezzel kapcsolatban, jelzem, de a részemről ezt lezártnak tekintem.\n\nKöszönöm a gyors intézést, sokat segítettél!`,
  },
  {
    id: 'esemeny-meghivo', group: '15 · Általános', label: 'Rendezvény / esemény meghívó (körlevél)',
    subject: (c) => `Meghívó: ${or(c.title, '[esemény]')}, ${or(c.when, '[dátum]')}`,
    body: (c) => `Kedves [Kollégák / Hallgatók / Partnerek]!\n\nSzeretettel meghívlak Titeket a(z) ${or(c.title, '[esemény]')}-re, amely ${or(c.when, '[dátum] [időpont]')}-kor lesz${c.place ? ` (${nd(c.place)})` : ' [helyszín]'}. A program során [rövid leírás: pl. hallgatói munkák bemutatása / előadás / kerekasztal] várható, és jó alkalom a szakmai találkozásra. Kérlek, jelezzétek ${or(c.due, '[dátum]')}-ig, ha részt tudtok venni, hogy a létszámot tervezni tudjuk.\n\nBízom benne, hogy sokan eljöttök, örülnénk a jelenléteteknek!`,
  },
  {
    id: 'hatarido-emlekezteto', group: '15 · Általános', label: 'Emlékeztető lejáró határidőre',
    subject: (c) => `Emlékeztető: ${or(c.title, '[feladat]')}, határidő: ${or(c.due, '[dátum]')}`,
    body: (c) => `Szia [Név]!\n\nCsak egy baráti emlékeztető, hogy a(z) ${or(c.title, '[feladat]')} határideje ${or(c.due, '[dátum]')}, amely már közeledik. Ha esetleg csúszásban vagy, jelezd nyugodtan, és megnézzük, hogyan tudunk rugalmasan megoldást találni. Fontos, hogy időben lezárjuk, mert [ok / következő lépés].\n\nKöszönöm, hogy ránézel, előre is köszönöm az intézést!`,
  },
  {
    id: 'dokumentum-kuldes', group: '15 · Általános', label: 'Dokumentum megküldése kísérőszöveggel',
    subject: () => '[Dokumentum neve], megküldés',
    body: (c) => `Szia [Név]!\n\nKüldöm a(z) [dokumentum]-ot, ahogy megbeszéltük. A lényeg röviden: [1-2 mondatos összefoglaló arról, mit tartalmaz és mire kell figyelni]. Kérlek, nézd át, és ha bármit módosítanál vagy kiegészítenél, jelezd ${or(c.due, '[dátum]')}-ig.\n\nHa így rendben van, a következő lépés: [teendő]. Köszönöm!`,
  },
  {
    id: 'csuszas-jelzes', group: '15 · Általános', label: 'Csúszás jelzése / bocsánatkérés',
    subject: () => 'Re: [eredeti tárgy]',
    body: (c) => `Szia [Név]!\n\nElnézést kérek, hogy a(z) [ügy] kapcsán csúszásba kerültem, [rövid ok]. Igyekszem ${or(c.due, '[dátum]')}-ig pótolni, illetve ha addig is kell valami részlet, azt hamarabb küldöm. Köszönöm a türelmedet és a megértésedet.\n\nHa ez így megfelel, jelezd, és tartom a határidőt.`,
  },
  {
    id: 'altalanos-korlevel', group: '15 · Általános', label: 'Általános körlevél (bármely közlésre)',
    subject: (c) => `${or(c.title, '[téma]')}, ${or(c.due, '[dátum / határidő]')}`,
    body: (c) => `Kedves Kollégák!\n\nSzeretném a figyelmetekbe ajánlani a(z) ${or(c.title, '[téma]')}-t, amely a szakunk munkáját érinti. Röviden a lényeg: [1-2 mondatos leírás], a hozzá tartozó teendő pedig [teendő], határideje ${or(c.due, '[dátum]')}. Kérlek, jelezzétek, ha kérdésetek van, vagy ha valakit közvetlenül érint az ügy.\n\nKöszönöm az együttműködést!`,
  },
  // a 121-140. tételek új sablonjai (tartalmi egyeztetés, átadás-átvétel, események)
  {
    id: 'tartalmi-egyeztetes', group: '2 · Oktatói kapcsolattartás', label: 'Átfogó tartalmi egyeztetés meghívó (körlevél)',
    subject: (c) => `Meghívó: MD tartalmi átbeszélés, ${or(c.when, '[dátum]')}`,
    body: (c) => `Kedves Kollégák!\n\nSzeretnék veletek közösen leülni egy átfogó egyeztetésre a következő szemeszter és tanév tartalmáról, hogy összehangoljuk a tananyagokat és megismerjük egymás elképzeléseit. A találkozó ${or(c.when, '[dátum] [időpont]')} között lesz${c.place ? ` (${nd(c.place)})` : ' [helyszín]'}. Aki nem tud egész nap ott lenni, egy-két órára is bekapcsolódhat, akár a kezdéskor, akár ebéd után.\n\nKérlek, ${or(c.due, '[dátum]')}-ig jelezzétek, hogy ott tudtok-e lenni. Köszönöm!`,
  },
  {
    id: 'eloretervezes', group: '2 · Oktatói kapcsolattartás', label: 'Előretervezés: korábbi egyeztetés a jövőben (körlevél)',
    subject: () => 'Tervezés: korábbi egyeztetés a jövőben',
    body: () => `Kedves Kollégák!\n\nTöbb jelzést kaptam, hogy a fontosabb meetingeket és brainstormingokat érdemes lenne korábban egyeztetni, és ezt jogosnak tartom. A jövőben a kiemelt alkalmakat igyekszem jóval előre kiírni, hogy könnyebb legyen a részvételt összehangolni. Kérlek, ti is jelezzétek időben a fix elfoglaltságaitokat, hogy ezekhez tudjunk igazodni.\n\nKöszönöm a visszajelzéseket!`,
  },
  {
    id: 'oraharmonizacio', group: '11 · Óratervezés / óralátogatás', label: 'Óra- és tananyag-harmonizáció (egyéni)',
    subject: () => 'Óraharmonizáció: [tantárgy]',
    body: () => `Szia [Név]!\n\nSzeretnék veled leülni egy egyéni egyeztetésre a(z) [tantárgy] tananyagáról, hogy jobban illeszkedjen a szak képzési mátrixához. Fontosnak tartom, hogy a tárgyaink szervesen kapcsolódjanak egymáshoz és a hallgatói igényekhez. Ahol közösen vagy egymáshoz közel oktatunk (pl. [terület]), ott az óraszintű összehangolás is sokat segít.\n\nJelezd, ha megfelel, és keresünk rá egy időpontot. Köszönöm!`,
  },
  {
    id: 'zv-kovetelmenyek', group: '13 · Záróvizsga / opponencia', label: 'ZV-követelmények / showreel megosztása (körlevél)',
    subject: () => 'Záróvizsga követelmények és showreel, [tanév]',
    body: () => `Kedves Kollégák!\n\nMegosztom az aktuális záróvizsga-követelményeket és a showreel elvárásait, hogy egységesen tudjuk tájékoztatni a hallgatókat. A dokumentumot itt éritek el: [link / csatolmány]. Kérlek, nézzétek át, és a témavezetett hallgatóitokkal is osszátok meg időben, hogy a formai és tartalmi elvárások leadás előtt mindenkinek egyértelműek legyenek.\n\nHa kérdés van bármelyik ponthoz, jelezzétek. Köszönöm!`,
  },
  {
    id: 'zv-elnok-helyettesites', group: '13 · Záróvizsga / opponencia', label: 'ZV-elnöki felkérés (helyettesítés)',
    subject: (c) => `Záróvizsga-elnöki felkérés, ${or(c.when, '[dátum]')}`,
    body: (c) => `Szia [Név]!\n\n${or(c.when, '[dátum] [időpont]')} között szeretnélek felkérni magam helyett a Záróvizsga Bizottság elnöki feladatára, mert [ok] miatt nem tudok jelen lenni. Bízom benne, hogy az elnöki-vezetői rutinoddal gördülékenyen koordinálod majd az adott napot. Jelezd, hogy el tudod-e vállalni, és amit igényelsz hozzá, azt előre megküldöm.\n\nElőre is köszönöm!`,
  },
  {
    id: 'ertekelesi-dontes', group: '14 · Félévközben és záráskor', label: 'Értékelési döntés / bukás egyeztetése',
    subject: () => 'Értékelési döntés: [hallgató], [tantárgy]',
    body: () => `Szia [Név]!\n\nÁtnéztem a(z) [hallgató neve / Neptun-kód] ügyét, amit a hiányzások és a le nem adott feladatok miatt jeleztél. A körülmények alapján [támogatom a döntésedet / egyeztessünk még róla], mert [rövid indok]. Ha kell, utánajárok a hiányzó információknak, vagy egyeztetek a hallgatóval és az adminisztrációval.\n\nJelezz, ha bármi továbbit lépjek. Köszönöm!`,
  },
  {
    id: 'esemeny-felhivas', group: '6 · Külső kapcsolatok', label: 'Esemény-felhívás: munkák beküldése (körlevél)',
    subject: (c) => `${or(c.title, '[esemény]')}, felhívás: munkák beküldése`,
    body: (c) => `Kedves Kollégák!\n\nA szak idén is tervez részt venni a(z) ${or(c.title, '[esemény]')}-en (${or(c.when, '[dátum]')}), ahol oktatói és hallgatói munkákat egyaránt várnak. Kérlek, gondoljátok át, mely projektek, diplomamunkák vagy saját alkotások illeszkednének a(z) [idei téma] tematikájához, és jelezzétek felém. A beküldési határidő ${or(c.due, '[dátum]')}.\n\nHa kérdés van a formátumról vagy a feltételekről, keressetek. Köszönöm!`,
  },
  {
    id: 'munka-javaslat', group: '6 · Külső kapcsolatok', label: 'Konkrét munka javaslata eseményre',
    subject: (c) => `${or(c.title, '[esemény]')}, javasolt munka: [cím]`,
    body: (c) => `Szia [Név]!\n\nA(z) ${or(c.title, '[esemény]')}-re javasolnám [alkotó] "[munka címe]" című [munka típusa] munkáját, mert jól illeszkedik a kiállítás tematikájához ([rövid indok]). Jelezd, ha egyetértesz, vagy ha van más jelöltünk, amit érdemes mérlegelni.\n\nA beküldés előkészítésében szívesen segítek. Köszönöm!`,
  },
  {
    id: 'kozossegi-feluletek', group: '9 · Kommunikáció / arculat', label: 'Szakos közösségi felületek megosztása (körlevél)',
    subject: () => 'Média Design: Facebook-csoport és weboldal',
    body: () => `Kedves Kollégák!\n\nAjánlom a figyelmetekbe a szak közösségi felületeit, ahol a jövőben is egyeztethetünk és megoszthatjuk a híreket. Facebook-csoport: [link], a formálódó weboldalunk: [link]. Kérlek, nézzetek rá a weboldalra, és küldjétek a javaslataitokat, hogy jobbá tegyük.\n\nKöszönöm!`,
  },
  {
    id: 'atadas-koszonet', group: '10 · Belső / technikai', label: 'Átadott anyagok nyugtázása (átadás-átvétel)',
    subject: () => 'Re: [dokumentum / standard neve]',
    body: () => `Szia [Név]!\n\nKöszönöm a(z) [dokumentum / standard]-ot, sokat segít a szak folyamatainak átlátásában. Átnézem, és ha valahol pontosítás kell, jelzek. Jó tudni, hogy a korábbi szakvezetői tapasztalatodra támaszkodhatom az átállásnál.\n\nHa van olyan pont, amit érdemes közösen átbeszélni, kereslek egy időponttal.`,
  },
  {
    id: 'standard-atvetel', group: '10 · Belső / technikai', label: 'Standard / szabályzat átvételének visszaigazolása',
    subject: () => '[Standard / szabályzat], átvéve',
    body: () => `Szia [Név]!\n\nMegkaptam és átnéztem a(z) [standard / követelmény / szabályzat]-ot. Beépítem a szak folyamataiba, és a következő tájékoztatóban a kollégák felé is kommunikálom. Ha időközben frissül, jelezd, hogy mindig a legaktuálisabb változattal dolgozzunk.\n\nKöszönöm!`,
  },
  {
    id: 'korabbi-anyagok', group: '10 · Belső / technikai', label: 'Korábbi levelezés / anyagok kikérése',
    subject: () => 'Korábbi anyagok: [téma]',
    body: () => `Szia [Név]!\n\nKérnék tőled néhány korábbi levelet, illetve anyagot a(z) [téma] kapcsán, hogy egységes legyen a folytatás. Szeretném látni, korábban milyen formában és tartalommal ment ez a hallgatók / kollégák felé, hogy a bevált gyakorlatot vigyem tovább. Ha van összegyűjtött változat, az különösen sokat segít.\n\nKöszönöm!`,
  },
  {
    id: 'esemeny-lemondas', group: '15 · Általános', label: 'Értekezlet / esemény lemondása (körlevél)',
    subject: (c) => `Elmarad: ${or(c.title, '[esemény]')}, ${or(c.when, '[dátum]')}`,
    body: (c) => `Kedves Kollégák!\n\nA(z) ${or(c.when, '[dátum]')}-ra tervezett ${or(c.title, '[egyeztetés]')} sajnos elmarad. Az új időponttal hamarosan jelentkezem, igyekszem olyat találni, amely a legtöbbeteknek megfelel. Ha addig van sürgős téma, írjatok nyugodtan, és e-mailben megbeszéljük.\n\nKöszönöm a megértést!`,
  },
  {
    id: 'pontositas', group: '15 · Általános', label: 'Dátumelírás / pontosítás korábbi levélhez (körlevél)',
    subject: () => 'Pontosítás, helyes időpont: [helyes dátum]',
    body: () => `Kedves Kollégák!\n\nAz előző levelemben tévesen [téves dátum] szerepelt, helyesen [helyes dátum]. Minden más változatlanul érvényes. Kérlek, e szerint tervezzetek, és jelezzétek, ha emiatt bármi módosulna nálatok.\n\nKöszönöm!`,
  },
  {
    id: 'felkeres-nyugtazas', group: '15 · Általános', label: 'Felkérés elfogadásának nyugtázása',
    subject: () => 'Re: [felkérés tárgya]',
    body: () => `Szia [Név]!\n\nKöszönöm, hogy elvállalod! Ahogy közeledik az időpont, megküldöm a szükséges részleteket és anyagokat. Ha addig bármi kérdésed van, keress nyugodtan.\n\nMég egyszer köszönöm!`,
  },
  {
    id: 'esemeny-emlekezteto', group: '15 · Általános', label: 'Emlékeztető közelgő eseményre (körlevél)',
    subject: (c) => `Emlékeztető: ${or(c.title, '[esemény]')}, ${or(c.when, '[dátum, időpont]')}`,
    body: (c) => `Kedves Kollégák!\n\nRövid emlékeztető a közelgő ${or(c.title, '[esemény]')}-ről: ${or(c.when, '[dátum] [időpont]')}-kor${c.place ? ` (${nd(c.place)})` : ', [helyszín / online link]'}. Aki még nem jelezte a részvételét, kérlek, tegye meg ${or(c.due, '[dátum]')}-ig, hogy tudjuk tervezni a létszámot. Ha időközben változott valakinél a helyzet, jelezze nyugodtan.\n\nKöszönöm!`,
  },
  {
    id: 'online-atteres', group: '15 · Általános', label: 'Egyeztetés online alternatívája (válasz)',
    subject: () => 'Re: Egyeztetés, online opció',
    body: (c) => `Szia [Név]!\n\nRendben, megoldjuk online is. A(z) ${or(c.when, '[dátum / idősáv]')} megfelel, vagy ha más időpont jobb, írd meg, és igazodom. Amint fixáltuk, küldök egy [Zoom / Meet] linket.\n\nKöszönöm!`,
  },
  {
    id: 'lemondas-elfogadasa', group: '15 · Általános', label: 'Részvétel-lemondás elfogadása (válasz)',
    subject: (c) => `Re: ${or(c.title, '[esemény]')}, lemondás`,
    body: () => `Szia [Név]!\n\nKöszönöm a jelzést, megértem, és természetesen elfogadjuk a lemondást. Egy következő alkalommal szívesen dolgozunk együtt. Kérlek, keress velem egy időpontot egy rövid személyes vagy online egyeztetésre, hogy a fontosabb pontokat azért átvegyük.\n\nJó munkát a projektjeidhez!`,
  },
  // a 141-150. tételek: HiFeszt, szakest, Educatio, Kutatók Éjszakája, hallgatói kiállítás
  {
    id: 'hifeszt-felkeres', group: '12 · Nyílt nap / Educatio', label: 'HiFeszt: hallgatói nagyköveti felkérés',
    subject: (c) => `HiFeszt nagyköveti felkérés, ${or(c.when, '[dátum]')}, gyors visszajelzés`,
    body: (c) => `Kedves Nagykövet-jelöltünk!\n\nIdén is lehetőségünk van megjelenni a HiFeszt Pályaválasztási Fesztiválon: ${or(c.when, '[dátum]')}-án [időtartam] között lesz jelen a METU Média Design${c.place ? ` (${nd(c.place)})` : ' a [helyszín]-en'}. Több oktatóddal egyeztettem, és a javasolt nagykövetek listájára kerültél, mert hitelesen és magabiztosan képviseled a szakunk gondolkodásmódját. Kérlek, röviden jelezd, vállalod-e a részvételt: elég egy "alkalmas" vagy "nem alkalmas", illetve ha csak részidőben tudsz jönni, írd meg a vállalt idősávot. A visszajelzési határidő: ${or(c.due, '[dátum, óra]')}, a végleges beosztást ezután küldöm.\n\nKöszönöm az együttműködésed, és gratulálok, amiért az oktatóid ilyen mértékben számítanak Rád!`,
  },
  {
    id: 'hifeszt-beosztas', group: '12 · Nyílt nap / Educatio', label: 'HiFeszt: beosztás és tudnivalók',
    subject: (c) => `HiFeszt ${or(c.when, '[dátum]')}, beosztás és tudnivalók`,
    body: (c) => `Kedves [Név]!\n\nKöszönöm a visszajelzésed, örülök, hogy ott leszel a HiFeszten! A helyszín ${or(c.place, '[helyszín]')}, gyülekező [idő]-kor a [találkozási pont]-nál; a standnál [kapcsolattartó] segít az eligazodásban. Kérlek, [öltözet / eszköz tudnivaló], és lehetőség szerint maradj a teljes idősávban, mert minél többen vagyunk, annál erősebb a szakmai jelenlét.\n\nHa bármi közbejön vagy kérdésed van, hívj vagy írj nyugodtan. Számítok Rád, jó lesz együtt képviselni a szakot!`,
  },
  {
    id: 'educatio-beosztas', group: '12 · Nyílt nap / Educatio', label: 'Educatio: beosztás és tudnivalók (körlevél)',
    subject: () => 'Educatio kiállítás [év], beosztás és tudnivalók',
    body: (c) => `Kedves Kollégák és Hallgatók!\n\nKöszönöm, hogy részt vesztek az idei Educatio kiállításon és segítitek a szakunk népszerűsítését, a jelenlétetek kulcsfontosságú. A helyszín ${or(c.place, '[helyszín]')}, időpont ${or(c.when, '[dátumok]')}, nyitvatartás [idősáv]; az alábbi beosztás szerint leszünk kint a standnál: [név, idősáv listája]. Kérem a hallgatókat, hogy lehetőség szerint maradjatok kint a vállalt sávban, és ha megérkeztetek, keressétek [kapcsolattartó neve, telefonszáma]-t, aki segít az eligazodásban. Öltözet: [pl. kényelmes, fekete felső], étkezésről: [info].\n\nHa bárkinek kérdése van, engem is hívhattok bármikor. Találkozunk a helyszínen, számítok Rátok!`,
  },
  {
    id: 'szakest-szervezes', group: '17 · Rendezvények / hallgatói élet', label: 'Szakest: szervezőcsapat összehívása (körlevél)',
    subject: (c) => `Szervezői egyeztetés: ${or(c.title, '[esemény]')}`,
    body: (c) => `Sziasztok, Szervezők!\n\nIdeje elindítani a következő szakest / szakkör szervezését: ${or(c.title, '[esemény típusa]')} a tervek szerint ${or(c.when, '[időpont]')}-kor${c.place ? ` (${nd(c.place)})` : ', [helyszín]-en'}. Szeretnék egy közös egyeztetést [javasolt dátum]-kor, ahol átbeszéljük a koncepciót, a helyszínfoglalást, a technikát és a promóciót; kérlek, jelezzétek, kinek mikor jó. Első körben [Név] és [Név] vállalná a [feladat] kidolgozását, [Név] pedig a [feladat]-t; ha máshogy osztanátok fel, írjátok meg bátran. Fontos, hogy a promót időben indítsuk, mert tavaly is a korai szórólapozás és a Discord-üzenetek hozták a közönséget.\n\nVárom az ötleteiteket!`,
  },
  {
    id: 'szakest-emlekezteto', group: '17 · Rendezvények / hallgatói élet', label: 'Szakest: emlékeztető a hallgatóknak (körlevél)',
    subject: (c) => `${or(c.title, '[esemény]')}: holnap, ${or(c.place, '[helyszín]')}!`,
    body: (c) => `Sziasztok!\n\nEmlékeztető: holnap, ${or(c.when, '[dátum]')}-án tartjuk a(z) ${or(c.title, '[esemény]')}-t${c.place ? ` (${nd(c.place)})` : ' a [helyszín]-en'}, kapunyitás [idő]-kor. [Rövid programleírás: koncert / bajnokság / verseny, fő időpontok.] A szervezők [idő]-kor kezdik a helyszín előkészítését; aki tud segíteni a setupban, jöjjön nyugodtan korábban.\n\nOsszátok meg az eseményt a csoporttársaitokkal is, minél többen vagyunk, annál jobb a hangulat! Találkozunk ott.`,
  },
  {
    id: 'kutatok-ejszakaja', group: '17 · Rendezvények / hallgatói élet', label: 'Kutatók Éjszakája: részvétel egyeztetése (körlevél)',
    subject: (c) => `Kutatók Éjszakája ${or(c.when, '[dátum]')}, részvétel egyeztetése`,
    body: (c) => `Sziasztok!\n\nA Kutatók Éjszakája idén ${or(c.when, '[dátum]')}-kor lesz, és szeretném, ha a Média Design egy interaktív modullal jelenne meg, például [ötlet], amely élményalapú, ugyanakkor megmutatja a szak tudományos, interdiszciplináris arcát. Kérlek, jelezzétek, kinek van kapacitása bekapcsolódni a felkészülésbe, és milyen hallgatói munkákat tudnánk bemutatni. A jelentkezési határidő ${or(c.due, '[dátum]')}, úgyhogy hamar döntenünk kell, részt veszünk-e idén, vagy inkább a felkészülésre szánjuk az időt és jövőre pályázunk.\n\nÍrjátok meg a véleményeteket, és utána véglegesítjük a koncepciót.`,
  },
  {
    id: 'kutatok-ejszakaja-hallgato', group: '17 · Rendezvények / hallgatói élet', label: 'Kutatók Éjszakája: hallgatói közreműködő felkérése',
    subject: (c) => `Kutatók Éjszakája ${or(c.when, '[dátum]')}, közreműködés`,
    body: (c) => `Kedves [Név]!\n\nIdén részt veszünk a Kutatók Éjszakáján ${or(c.when, '[dátum]')}-kor${c.place ? ` (${nd(c.place)})` : ' a [helyszín]-en'}, és szeretnélek felkérni, hogy közreműködj a szak installációjánál / bemutatójánál. A feladat [rövid leírás: az interaktív modul kezelése, látogatók fogadása], a vállalt idősáv [idősáv]. Az oktatóiddal egyeztetve úgy látom, hogy Te hitelesen tudod bemutatni a munkáinkat és a szak szemléletét, ezért számítok Rád.\n\nKérlek, jelezd ${or(c.due, '[határidő]')}-ig, hogy tudsz-e jönni és melyik idősávban; a részletes beosztást ezután küldöm.`,
  },
  {
    id: 'kiallitas-tarsteruletek', group: '17 · Rendezvények / hallgatói élet', label: 'Hallgatói kiállítás: társterületek felkérése',
    subject: () => 'Média Design [évfolyam] kiállítás, helyszín és egyeztetés',
    body: (c) => `Kedves Kollégák!\n\nA Média Design [évfolyam] hallgatói kiállítást szerveznének${c.place ? ` (${nd(c.place)})` : ' a [helyszín]-ben'}. Tervezett időpontok: építés / installálás [dátum], megnyitó [dátum, óra], látogathatóság [dátumok], bontás [dátum]. A részleteket a csatolt dokumentumban foglaltuk össze; kérem, jelezzétek, üzemeltetési vagy protokolláris oldalról van-e akadálya, illetve milyen technikai (hang-fény) igényt tudtok támogatni. Fontos egyeztetnünk a záróvizsga-időpontokkal is, hogy a bontás ne ütközzön velük.\n\nKöszönöm a mérlegelést, várom a visszajelzéseteket!`,
  },
  {
    id: 'kiallitas-evfolyam', group: '17 · Rendezvények / hallgatói élet', label: 'Hallgatói kiállítás: tájékoztató az évfolyamnak',
    subject: () => '[Évfolyam] kiállítás, tudnivalók és teendők',
    body: (c) => `Kedves [Évfolyam] Hallgatók!\n\nÖrömmel jelzem, hogy a kiállításotok helyszíne és időpontja megvan: ${or(c.place, '[helyszín]')}, ${or(c.when, '[dátumok]')}, megnyitó [dátum, óra]. Kérlek, [évfolyam-referens neve] fogja össze az évfolyam részéről a teendőket, és egyeztessen a kiállítás oktatói felelősével, [oktató neve]-val. A telepítést [dátum]-kor kezdjük, a bontásra [dátum]-án kerül sor; kérlek, ehhez igazítsátok a munkátokat, hogy ne ütközzön a záróvizsgákkal. Ha technikai igényetek van (hang, fény, berendezés), azt strukturáltan, minél hamarabb küldjétek el nekem.\n\nKöszönöm a munkátokat, izgatottan várom a kiállítást!`,
  },
  {
    id: 'kiallitas-meghivo', group: '17 · Rendezvények / hallgatói élet', label: 'Hallgatói kiállítás: megnyitó-meghívó (körlevél)',
    subject: (c) => `Meghívó: ${or(c.title, '[kiállítás címe]')} megnyitója`,
    body: (c) => `Kedves Kollégák!\n\nSzeretettel meghívlak Benneteket a Média Design [évfolyam] hallgatóinak ${or(c.title, '[kiállítás címe]')} című kiállítására, amelynek megnyitója ${or(c.when, '[dátum, óra]')}-kor lesz${c.place ? ` (${nd(c.place)})` : ' a [helyszín]-en'}. A hallgatók egy féléves közös munka eredményét mutatják be: [rövid tematikai leírás]; a kiállítás [dátumokig] látogatható. Nagy örömünkre szolgálna, ha személyes jelenlétetekkel támogatnátok a hallgatóinkat ezen az estén.\n\nKérlek, aki tud, jelezze, hogy számíthatunk-e Rá. Találkozzunk a megnyitón!`,
  },
  // a 151-154. tételek: demonstrátorok és óradíj
  {
    id: 'demonstrator-jeloltek', group: '8 · Hallgatói ügyek', label: 'Demonstrátor-jelöltek bekérése (körlevél)',
    subject: (c) => `Demonstrátor-jelöltek: ${or(c.title, '[esemény]')}, ${or(c.due, '[határidő]')}-ig`,
    body: (c) => `Sziasztok!\n\nA(z) ${or(c.title, '[esemény, pl. tavaszi felvételi]')} közeledtével keressük a hallgatói demonstrátorokat, ezért kérlek, jelezzétek ${or(c.due, '[határidő]')}-ig, ha van olyan hallgatótok, aki szívesen vállalna demonstrátori munkát. Jó lehetőség nekik az extra kereset (idei óradíj: [összeg] Ft/óra) és a szakmai tapasztalat is. Kérlek, a jelöltnél írjátok meg a nevet, a szakot/évfolyamot és az elérhetőséget, hogy fel tudjuk venni a listára. A beérkezett neveket összesítem, és továbbítom [koordinátor neve]-nek, aki a toborzó táblázatot kiküldi.\n\nKöszönöm a gyors visszajelzést!`,
  },
  {
    id: 'demonstrator-felkeres', group: '8 · Hallgatói ügyek', label: 'Demonstrátori felkérés hallgatónak',
    subject: (c) => `Demonstrátori felkérés: ${or(c.title, '[esemény]')}, ${or(c.when, '[dátum]')}`,
    body: (c) => `Kedves [Név]!\n\nÖrömmel értesítelek, hogy az oktatóid javaslata alapján felkérünk a(z) ${or(c.title, '[esemény, pl. felvételi]')} demonstrátori feladataira ${or(c.when, '[dátum]')}-án. A feladat röviden: [leírás: a jelentkezők fogadása, a folyamat segítése, gyakorlati asszisztencia], a helyszín ${or(c.place, '[helyszín]')}, az időpont [idősáv]; az óradíj [összeg] Ft/óra. Kérlek, jelezd ${or(c.due, '[határidő]')}-ig, hogy vállalod-e, és melyik idősávban tudsz jönni; a pontos beosztást és a szerződéssel kapcsolatos teendőket ezután küldöm.\n\nSzámítok Rád, jó tapasztalat lesz, és a munkádat is megbecsüljük!`,
  },
  {
    id: 'demonstrator-beosztas', group: '8 · Hallgatói ügyek', label: 'Demonstrátori beosztás és tudnivalók',
    subject: (c) => `Demonstrátori beosztás: ${or(c.title, '[esemény]')}, ${or(c.when, '[dátum]')}`,
    body: (c) => `Kedves [Név]!\n\nKöszönöm, hogy vállaltad a demonstrátori feladatot! A beosztásod: ${or(c.when, '[dátum]')}, [idősáv]${c.place ? `, helyszín: ${nd(c.place)}` : ', helyszín: [helyszín]'}; érkezz [x] perccel korábban, és [kapcsolattartó neve, telefonszáma] fogad a helyszínen. Kérlek, hozd magaddal a [szükséges dokumentum/eszköz]-t; az óradíj-elszámoláshoz a jelenléti ív aláírásáról a helyszínen gondoskodunk. Ha bármi közbejön, jelezd időben, hogy tudjunk pótlásról gondoskodni.\n\nKöszönöm az együttműködésed, számítok Rád!`,
  },
  {
    id: 'oradij-elszamolas', group: '8 · Hallgatói ügyek', label: 'Óradíj-elszámolás / jelenléti igazolás',
    subject: (c) => `Óradíj-elszámolás: ${or(c.title, '[esemény]')}, [név / hónap]`,
    body: (c) => `Kedves [Koordinátor neve]!\n\nA(z) ${or(c.title, '[esemény]')} demonstrátori munkájának elszámolásához küldöm a szükséges adatokat: [hallgató neve], [Neptun-kód], teljesített [óraszám] óra, [dátumok]-on, óradíj [összeg] Ft/óra. Az aláírt jelenléti ívet [csatolva küldöm / a helyszínen leadtuk], kérlek, jelezd, ha bármilyen további dokumentum vagy aláírás szükséges a kifizetéshez. A hallgató elérhetősége: [e-mail], ha közvetlenül egyeztetnél vele.\n\nKöszönöm, hogy segítesz a gördülékeny elszámolásban!`,
  },
  // a 155-162. tételek: kiállítás-szervezés (protokoll, üzemeltetés, marketing)
  {
    id: 'kiallitas-helyszinfoglalas', group: '17 · Rendezvények / hallgatói élet', label: 'Kiállítás: helyszín / galéria foglalása (protokoll)',
    subject: () => 'Média Design [évfolyam] kiállítás, helyszínfoglalás',
    body: (c) => `Kedves [Kollégák / Detti]!\n\nA Média Design [évfolyam] hallgatói kiállítást szeretnének tartani, tervezett időpont: építés [dátum], megnyitó ${or(c.when, '[dátum, óra]')}, látogathatóság [dátumok], bontás [dátum]; a kért helyszín a(z) ${or(c.place, '[helyszín, pl. Infopark I. Galéria]')}. Kérlek, jelezzétek, hogy a galéria a megadott napokra foglalható-e a részünkre, és van-e ütközés más rendezvénnyel vagy záróvizsgával, amihez a bontást igazítanunk kell. A részleteket a csatolt dokumentumban foglaltam össze, a hallgatói oldalról [referens neve] tartja a kapcsolatot.\n\nKöszönöm a segítségeteket, várom a visszaigazolást!`,
  },
  {
    id: 'kiallitas-technika', group: '17 · Rendezvények / hallgatói élet', label: 'Kiállítás: technikai igény az üzemeltetésnek',
    subject: (c) => `${or(c.title, '[kiállítás]')}: technikai igény (hang-fény-berendezés)`,
    body: (c) => `Kedves [Kollégák / Urbán István]!\n\nA(z) ${or(c.title, '[kiállítás neve]')} kapcsán, amely ${or(c.when, '[dátumok]')} között lesz${c.place ? ` (${nd(c.place)})` : ' a [helyszín]-en'}, szeretném strukturáltan leadni a technikai igényeinket. Szükségünk lenne az alábbiakra: [pl. X db projektor, hangrendszer, kiegészítő világítás, elosztók, asztalok]. Kérlek, jelezzétek, hogy ezeket tudjátok-e biztosítani, illetve ha a kérést a TOPdesk-felületen kell rögzítenem, akkor megteszem. A telepítés [dátum]-kor kezdődne, ehhez [időpont]-tól kérnénk hozzáférést a térhez.\n\nKöszönöm a támogatásotokat!`,
  },
  {
    id: 'kiallitas-marketing-anyagok', group: '17 · Rendezvények / hallgatói élet', label: 'Kiállítás: kommunikációs anyagok a marketingnek',
    subject: (c) => `${or(c.title, '[kiállítás]')}: kommunikációs anyagok a publikáláshoz`,
    body: (c) => `Kedves Krisztina és Nóra!\n\nKüldöm a(z) ${or(c.title, '[kiállítás neve]')} kommunikációjához szükséges anyagokat, hogy időben, a hivatalos METU-felületeken tudjátok publikálni az eseményt. Mellékelem: [1-3 db jogtiszta, fekvő kép], az esemény szöveges adatai (cím: [cím], alcím: [alcím], időpont: ${or(c.when, '[mettől meddig]')}, helyszín: ${or(c.place, '[helyszín]')}, rövid leírás: [leírás], szak: Média Design), valamint a hallgatók és a témavezető oktatók névsora. Kérlek, jelezzétek, hogy a grafikát ti készítitek az arculati rendszerben, vagy a mi alapjainkat használjátok; mindkét megoldás jó nekünk.\n\nHa bármi hiányzik, szóljatok, pótlom. Köszönöm a közreműködést!`,
  },
  {
    id: 'kiallitas-jovahagyas', group: '17 · Rendezvények / hallgatói élet', label: 'Kiállítás: webhír / FB-event jóváhagyása',
    subject: (c) => `${or(c.title, '[kiállítás]')}: webhír és FB-event jóváhagyás`,
    body: () => `Kedves Krisztina!\n\nKöszönöm a webhír, a sajtószöveg és az FB-event terveit; átnéztem, és a szakmai tartalom rendben van. [Egy módosítást kérnék: a kiállítás címe, a hallgatók nevei és a helyszín kiemelten jelenjen meg. / Részemről jóváhagyva, mehet a hírelés.] Kérlek, a galériát / társszervezőt tüntessétek fel co-host szerepben, és a tanszéki honlap ([link]) is legyen jól látható. Mivel a megnyitóig kevés idő van, örülnék, ha mielőbb elindulhatna a kommunikáció.\n\nKöszönöm a gyors és igényes munkát!`,
  },
  {
    id: 'kiallitas-hivatalos-meghivo', group: '17 · Rendezvények / hallgatói élet', label: 'Kiállítás: hivatalos megnyitó-meghívó',
    subject: (c) => `Meghívó: ${or(c.title, '[kiállítás címe]')} megnyitója, ${or(c.when, '[dátum]')}`,
    body: (c) => `Kedves [Kollégák / Meghívottak]!\n\nSzeretettel meghívunk a METU Média Design szak [évfolyam / diplomázó] hallgatóinak ${or(c.title, '[kiállítás címe]')} című kiállítására. Megnyitó: ${or(c.when, '[dátum, óra]')}, helyszín: ${or(c.place, '[helyszín, cím]')}; a kiállítás [dátumokig] látogatható. A hallgatók egy féléves közös munka eredményét mutatják be: [rövid tematikai összefoglaló].\n\nMegtisztelő lenne, ha jelenléteddel támogatnád a hallgatóinkat ezen az estén; kérlek, jelezd, ha számíthatunk Rád. Találkozzunk a megnyitón!`,
  },
  {
    id: 'kiallitas-bontas', group: '17 · Rendezvények / hallgatói élet', label: 'Kiállítás: bontás időzítése (ütközés-egyeztetés)',
    subject: (c) => `${or(c.title, '[kiállítás]')}: bontás időzítése`,
    body: (c) => `Kedves [Kollégák / Hallgatók]!\n\nEgyeztetnünk kell a bontás pontos időzítését, mert a(z) ${or(c.place, '[helyszín]')} melletti teremben [dátum]-án záróvizsgák lesznek, illetve [dátum]-tól a [következő rendezvény] foglalja a teret. Ezért a bontást [dátum, időpont, pl. késő délután]-ra kell időzítenünk, hogy se a vizsgákat, se a következő rendezvényt ne zavarja. Kérlek, [referens neve] és a hallgatók igazítsátok ehhez a leszerelést és az installációk elszállítását.\n\nKöszönöm, hogy rugalmasak vagytok, így mindenki zökkenőmentesen tud dolgozni!`,
  },
  {
    id: 'kiallitas-koszonet', group: '17 · Rendezvények / hallgatói élet', label: 'Kiállítás: köszönőlevél a közreműködőknek',
    subject: (c) => `Köszönet: ${or(c.title, '[kiállítás neve]')}`,
    body: (c) => `Kedves Mind!\n\nKöszönöm szépen mindenkinek a segítségét és a támogatását, amivel a(z) ${or(c.title, '[kiállítás neve]')} létrejöhetett: a marketingnek, a protokollnak, az üzemeltetésnek és természetesen a hallgatóknak és a témavezető oktatóknak. Nagyszerű volt látni, hogy a közös munka milyen színvonalas eredményt hozott, és milyen jó visszhangot kapott. A tapasztalatokat összegyűjtöm, hogy a következő kiállítást még gördülékenyebben tudjuk megszervezni.\n\nMég egyszer köszönöm mindenki munkáját!`,
  },
  {
    id: 'kiallitas-elojelzes', group: '17 · Rendezvények / hallgatói élet', label: 'Kiállítás: korai előjelzés a marketingnek',
    subject: (c) => `Előzetes jelzés: ${or(c.title, '[kiállítás]')}, ${or(c.when, '[dátum]')}`,
    body: (c) => `Kedves Krisztina és Nóra!\n\nIdőben szeretnék szólni egy közelgő eseményről: a Média Design [évfolyam] [kiállítás típusa] kiállítása ${or(c.when, '[dátum]')}-kor lesz${c.place ? ` (${nd(c.place)})` : ' a [helyszín]-en'}. Egyelőre a végleges anyagok készülnek, de szerettem volna minél előbb jelezni, hogy legyen időtök felkészülni és rendesen beharangozni. A részletes tartalmakat (képek, szövegek, névsor) ${or(c.due, '[dátum]')}-ig küldöm; addig is jelezzétek, ha valamire már most szükségetek van.\n\nKöszönöm, hogy segítitek a szakunk láthatóságát!`,
  },
  // a 163-170. tételek: kiállítás-folyamatok (kurátori brief, üzemeltetés, kellékek, LED-fal)
  {
    id: 'kuratori-briefing', group: '17 · Rendezvények / hallgatói élet', label: 'Kurátori briefing: engedélyeztetési dokumentum',
    subject: (c) => `${or(c.title, '[kiállítás]')}: az engedélyeztetéshez szükséges dokumentum`,
    body: () => `Szia [Név]!\n\nÖrülök a kezdeményezésnek, és támogatom, hogy a kurátori feladatokat kézbe veszed! Ahhoz, hogy az engedélyeztetést el tudjam indítani az üzemeltetésnél, egy pontosan szerkesztett dokumentumra van szükségem, amely kitér az alábbiakra: rövid eseményleírás (cél, koncepció, és miért éri meg befogadni), a helyszín pontosítása (konkrét terem / aularész), a felelősök és a kurátor neve-elérhetősége, a felügyelő oktatók, a várható kiállítói és látogatói létszám, a zaj- és fényterhelés (irodai környezetben a hangos installáció csak fülhallgatóval), a térhasználat / alaprajz, a kábelezés és botlásvédelem, az eszközigény (áramvételi pontok, asztalok, paravánok; hosszabbítót nektek kell hozni), néhány kép a munkákról, valamint az építés / látogathatóság / bontás pontos idősávjai és az akadálymentesítés.\n\nKérlek, ezt állítsd össze Word-ben, és küldd vissza; csak ennek birtokában tudok a foglalásról egyeztetni. Köszönöm, várom a dokumentációt!`,
  },
  {
    id: 'kiallitas-eloterjesztes', group: '17 · Rendezvények / hallgatói élet', label: 'Kiállítás előterjesztése az üzemeltetésnek',
    subject: (c) => `[Évfolyam] kiállítás, helyszínkérés: ${or(c.place, '[helyszín]')}`,
    body: (c) => `Kedves [István / Üzemeltetés]!\n\nDr. Balogh Áron vagyok, a Média Design szak vezetője. A szak [évfolyam] hallgatói egy kiállítást szeretnének megvalósítani a(z) ${or(c.place, '[pontos helyszín]')}-en, tervezett időszak: ${or(c.when, '[dátumok]')}. A csatolt dokumentumban összefoglaltuk a koncepciót, a helyszínt, a felelősöket, a terhelési (zaj-fény) és technikai (kábelezés, áram) kereteket, valamint az idősávokat. Kérlek, jelezd, hogy a helyszín a megadott napokra jóváhagyható-e, illetve kivel kell még egyeztetnem a programütközés elkerülése érdekében.\n\nKöszönettel várom a döntésedet!`,
  },
  {
    id: 'kiallitas-kellekek', group: '17 · Rendezvények / hallgatói élet', label: 'Kellék- és technikaigény a rendezvényszervezésnek',
    subject: (c) => `${or(c.title, '[kiállítás]')}: kellék- és technikaigény`,
    body: (c) => `Kedves [Patrícia / Rendezvényszervezés]!\n\nA(z) ${or(c.title, '[kiállítás neve]')} kapcsán (${or(c.when, '[dátum]')}${c.place ? `, ${nd(c.place)}` : ', [helyszín]'}) szeretnénk leadni a kellék- és technikaigényünket: [pl. X db könyöklő + huzat, Y db posztamens, Z szék, puffok, papírpohár, 2 db hosszabbító], valamint a LED-fal használata. Kérlek, jelezd, hogy ezeket tudjátok-e biztosítani, és hova / mikorra kell leadnom a ticketet. A LED-fal tartalmát a technikussal egyeztetjük külön. Az építést [dátum] reggel [idő]-tól kezdenénk; ha ez hangzavarral jár, jelezd, kivel egyeztessek.\n\nKöszönöm a segítséget!`,
  },
  {
    id: 'ledfal-tartalom', group: '17 · Rendezvények / hallgatói élet', label: 'LED-fal / vetítés tartalmának egyeztetése',
    subject: (c) => `${or(c.title, '[kiállítás]')}: LED-fal tartalom`,
    body: (c) => `Kedves [Gábor]!\n\nA(z) ${or(c.title, '[kiállítás neve]')} (${or(c.when, '[dátum]')}${c.place ? `, ${nd(c.place)}` : ', [helyszín]'}) kapcsán szeretnénk igénybe venni a LED-falat. A vetítendő tartalom [rövid leírás: a kiállítás infói + saját anyagok, az installációkat bemutató vagy a hangulathoz illő absztrakt animációk] lenne. Kérlek, jelezd, milyen formátumban és felbontásban készítsük az anyagot, és mikor tudjuk feltölteni / tesztelni a helyszínen. A rendezvényszervezés a ticketet leadja az igényre.\n\nKöszönöm, hogy segítesz a beállításban!`,
  },
  {
    id: 'kulso-galeria', group: '17 · Rendezvények / hallgatói élet', label: 'Külső galéria / társszervező egyeztetése',
    subject: (c) => `${or(c.title, '[kiállítás címe]')}: megjelenés és társszervezés`,
    body: (c) => `Kedves [Galéria kontakt / Konzulens]!\n\nKöszönöm, hogy a(z) ${or(c.title, '[kiállítás címe]')} diplomakiállítás a [galéria neve]-ben valósul meg, a szak részéről nagyra értékeljük a munkátokat. A kommunikációt az egyetem hivatalos felületein a marketingünk indítja, ezért kérlek, egyeztessünk arról, hogy az esemény a METU eseményeként jelenjen meg, a galéria pedig társszervező (co-host) szerepben. Az anyagokhoz kérünk [jogtiszta képek, plakát, sajtószöveg], és jelezzétek, ha a plakáton a METU logó elhelyezésével kapcsolatban van kérésetek. A megnyitó ${or(c.when, '[dátum, óra]')}, a kiállítás [dátumokig] látogatható.\n\nKöszönöm az együttműködést, jó közös munkát!`,
  },
  {
    id: 'kiallitas-meghivo-oktatoknak', group: '17 · Rendezvények / hallgatói élet', label: 'Hallgatói meghívó továbbítása az oktatóknak (körlevél)',
    subject: (c) => `Meghívó: ${or(c.title, '[kiállítás címe]')} megnyitója, ${or(c.when, '[dátum]')}`,
    body: (c) => `Kedves Kollégák!\n\nTovábbítom a hallgatóink meghívóját: szeretettel várnak Benneteket a(z) ${or(c.title, '[kiállítás címe]')} megnyitójára. A kiállítás a Média Design [évfolyam] hallgatóinak közös projektje, amely [rövid koncepció] a [kurzus neve] keretében. Megnyitó: ${or(c.when, '[dátum, óra]')}, helyszín: ${or(c.place, '[helyszín, cím]')}; a kiállítást megnyitja [nevek]. Látogatható: [dátumok]; további infó: [FB-esemény / webhír linkek].\n\nMegtisztelő lenne, ha jelenléteddel támogatnád a hallgatóinkat. Találkozzunk a megnyitón!`,
  },
  {
    id: 'kiallitas-idozites', group: '17 · Rendezvények / hallgatói élet', label: 'Kiállítás-időpont rugalmas kezelése (hallgatónak)',
    subject: (c) => `${or(c.title, '[kiállítás]')}: időzítés`,
    body: (c) => `Szia [Név]!\n\nÁttekintettem a lehetőségeket: a helyszín és az engedélyeztetés még egyeztetés alatt van, ezért lehet, hogy az eredeti ${or(c.when, '[dátum]')} időpontot érdemes rugalmasan kezelnünk. Ha csúszik is pár nappal, az nem baj; így nem kell kapkodnunk, és rendesen, időben meg tudjuk hirdetni a kiállítást. Amint megkapom az üzemeltetés és a társterületek jóváhagyását, azonnal jelzem Nektek a végleges dátumot.\n\nAddig is köszönöm a türelmet és a kurátori munkát, jó úton haladunk!`,
  },
  {
    id: 'installacios-adatok', group: '17 · Rendezvények / hallgatói élet', label: 'Installációs adattábla bekérése (körlevél, hallgatók)',
    subject: (c) => `${or(c.title, '[kiállítás]')}: installációs adatok bekérése`,
    body: (c) => `Kedves [Évfolyam] Hallgatók!\n\nA kiállítás előkészítéséhez kérlek, mindenki töltse ki a közös táblázatban a saját munkájának alapadatait: cím, típus, méret, technikai igény (áram, hang, fény), rövid leírás. Erre azért van szükség, hogy pontosan meg tudjuk tervezni a térfelosztást, az áramvételi pontokat és a technikai hátteret. Kérlek, ${or(c.due, '[határidő]')}-ig töltsétek ki, mert ez alapján adjuk le az igényeket az üzemeltetésnek. Ha bármi kérdés van a saját installációtok technikai feltételeivel kapcsolatban, jelezzétek.\n\nKöszönöm a pontos munkát!`,
  },
  // a tanévindító nagy összefoglaló (az éves indítás gerince)
  {
    id: 'tanevindito-osszefoglalo', group: '2 · Oktatói kapcsolattartás', label: 'Tanévindító összefoglaló: a teljes őszi menetrend (körlevél)',
    subject: () => 'Média Design: tanévindító tájékoztató és az őszi félév menetrendje ([tanév])',
    body: () => `Kedves Kollégák!\n\nKözeleg az új tanév, ezért egy helyre összegyűjtöttem mindent, ami az őszi félévben ránk vár: az órarendtől a fontosabb határidőkön át a szakos eseményekig. Kérlek, fussátok át, és a rátok vonatkozó időpontokat már most vezessétek be a naptáratokba.\n\n1. Indulás és értekezletek\nA tanév hivatalos nyitása [dátum]. A főállású kollégákkal [dátum, időpont, terem] tartunk félévindító szakos értekezletet, az óraadó kollégákkal pedig [dátum] délután online egyeztetünk (animáció és média design külön). Kérlek, jelezzétek, ha ütközést láttok.\n\n2. Órarend és tematikák\nAz őszi órarendet külön csatolmányban küldöm; a táblázatban az oktatói névre tudtok szűrni. A tantárgyi tematikákat a Neptun tematika-felületén [dátum]-ig kell leadni; ahol lehetett, a tavalyi tartalmat előkészítettem, így elég átnézni és véglegesíteni. Észrevételt legkésőbb [dátum]-ig kérek.\n\n3. Szorgalmi időszak és projekthét\nA projekthét [dátumok], ez a szorgalmi időszak első hete. Az oktatási időszak [dátum]-tól [dátum]-ig tart. Az alkotói hét [dátumok], a vizsga- és gyakorlati kiértékelési időszak [dátum]-tól [dátum]-ig zajlik.\n\n4. Szakos és intézményi események\nIdén is sűrű a naptár, kiemelten: [Vienna Design Week, dátumok, téma], [MKK éves konferencia, dátumok], [Kutatók Éjszakája, dátum], [Ars Electronica], valamint [Futuroszkóp / épületvetítés] a szemeszter elején. Aki bármelyikbe be szeretne kapcsolódni, jelezze felém.\n\n5. Hallgatói adminisztráció\nSzakdolgozati témaválasztás [időszak], specializáció-fórumok [időszak], specializáció- és szakirányválasztás [időszak]. Kérlek, a témavezetéssel kapcsolatos igényeiteket időben jelezzétek.\n\n6. Szünetek és határidők\nŐszi szünet [dátumok], Tudomány ünnepe [dátumok], [Annales tanulmány-leadási határidő, dátum, kontakt], téli szünet [dátumok], utóvizsga hét [dátumok]. A félév végén az Educatio ([helyszín, hónap]) és a nyílt napok ([időszak]) zárják a sort.\n\nHa bármelyik ponthoz észrevételetek vagy igényetek van, jelezzétek, így még a félév előtt tudunk igazítani. Köszönöm az együttműködést, és eredményes, jó tanévet kívánok mindannyiunknak!`,
  },
];

export const TOPIC_GROUPS: string[] = [...new Set(TOPIC_TEMPLATES.map((t) => t.group))];
