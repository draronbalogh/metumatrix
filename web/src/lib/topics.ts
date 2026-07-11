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
    body: (c) => `Kedves Kollégák!\n\nA Média Design félévindító szakos értekezletet ${or(c.when, '[dátum] [időpont]')}-kor tartjuk${c.place ? ` (${nd(c.place)})` : ''}. Csatlakozni ezen a linken tudtok: [Zoom-link].\n\nTalálkozunk! Köszönöm.`,
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
    subject: () => 'Őszi Projekthét, programterv',
    body: (c) => `Kedves Kollégák!\n\nKüldöm a(z) ${or(c.when, '[dátum]')} heti Projekthét programtervét és beosztását: [link / csatolmány]. Kérlek, nézzétek át a rátok osztott sávokat és termeket, és ${or(c.due, '[dátum]')}-ig jelezzétek, ha bárhol ütközést vagy hibát láttok. Fontos, hogy a hallgatók egységes tájékoztatást kapjanak, ezért örülök, ha a saját csoportotokkal is időben egyeztettek.\n\nHa bármi kérdés van, keressetek nyugodtan. Köszönöm!`,
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
    body: (c) => `Kedves Kollégák!\n\nA diplomaátadó ${or(c.when, '[dátum]')}-kor lesz${c.place ? ` (${nd(c.place)})` : ''}. Kérlek, erősítsétek meg a részvételeteket ${or(c.due, '[határidő]')}-ig.\n\nKöszönöm!`,
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
    body: (c) => `Kedves [Név]!\n\nA Média Design szak nevében keresem egy lehetséges együttműködés ügyében: ${or(c.title, '[rövid leírás]')}.\n\nHa érdekesnek találod, javaslok egy rövid egyeztetést. Köszönöm!`,
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
    body: (c) => `Kedves Kollégák!\n\nA következő nyílt nap ${or(c.when, '[dátum]')}-kor lesz${c.place ? ` (${nd(c.place)})` : ''}. A Média Design bemutatkozásához a következőkre lesz szükség: [beosztás / teendők].\n\nKérlek, jelezzétek, ki tud részt venni. Köszönöm!`,
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
    body: (c) => `Kedves Kollégák!\n\nKözeledik a záróvizsga-időszak (${or(c.when, '[időszak]')}). A beosztás és a tudnivalók: [link / részletek]. Kérlek, ${or(c.due, '[határidő]')}-ig jelezzétek, ha valamelyik időpont nem megfelelő.\n\nKöszönöm!`,
  },
  {
    id: 'opponencia-felkeres', group: '13 · Záróvizsga / opponencia', label: 'Opponencia felkérés',
    subject: () => 'Opponensi felkérés, METU Média Design',
    body: (c) => `Kedves [Név]!\n\nSzeretnélek felkérni a Média Design szak [hallgató] mestermunkájának / szakdolgozatának opponensi bírálatára. A bírálat leadási határideje: ${or(c.due, '[határidő]')}. Az anyagot itt éred el: [link].\n\nKérlek, jelezd, hogy el tudod-e vállalni. Köszönöm!`,
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
    body: () => `Szia [Név]!\n\nKöszönöm a jelzést. Áthelyeztük a(z) [tantárgy]-t [új időpont]-ra. Így már nincs ütközés, ugye?\n\nKöszönöm!`,
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
    body: () => `Szia [Név]!\n\nKérlek, add meg a heti konzultációs idősávodat, hogy meghirdethessük a hallgatóknak.\n\nKöszönöm!`,
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
    body: (c) => `Kedves Kollégák!\n\nKérlek, gyűjtsétek be a témavezetett hallgatóitok szakdolgozati témáit ${or(c.due, '[dátum]')}-ig, és küldjétek felém.\n\nKöszönöm!`,
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
    body: () => `Szia [Név]!\n\nA(z) [tantárgy]-ra [létszám] fő jelentkezett. [Indul / minimumlétszám alatt van.] Kérlek, [teendő].\n\nKöszönöm!`,
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
    body: () => `Szia [Név]!\n\nKérlek, jelezd röviden, hogy áll a(z) [tantárgy]: van-e lemaradó hallgató, gond a jelenléttel vagy a leadásokkal? Ha valahol beavatkozás kell, együtt megoldjuk.\n\nKöszönöm!`,
  },
  {
    id: 'hianyzas-jelzes', group: '14 · Félévközben és záráskor', label: 'Hallgatói hiányzás jelzése',
    subject: () => '[Hallgató neve], hiányzások',
    body: () => `Szia [Név]!\n\n[Hallgató] a(z) [tantárgy]-ból sokat hiányzott. Kérlek, egyeztess vele, illetve jelezd, ha beavatkozás kell. Fontos, hogy időben elérjük, amíg behozható a lemaradás.\n\nKöszönöm!`,
  },
  {
    id: 'ertekelesi-szempontok', group: '14 · Félévközben és záráskor', label: 'Értékelési szempontok egyeztetése',
    subject: () => 'Értékelési szempontok: [tantárgy]',
    body: () => `Szia [Név]!\n\nA félév vége közeledik. Kérlek, oszd meg a(z) [tantárgy] értékelési szempontjait, hogy egységes legyen a hallgatói tájékoztatás.\n\nKöszönöm!`,
  },
  {
    id: 'vizsgaidoszak', group: '14 · Félévközben és záráskor', label: 'Vizsgaidőszak tudnivalók (körlevél)',
    subject: () => 'Vizsgaidőszak, tudnivalók',
    body: (c) => `Kedves Kollégák!\n\nA vizsgaidőszak [dátum]-tól [dátum]-ig tart. Kérlek, hirdessétek meg a vizsgaidőpontjaitokat a Neptunban ${or(c.due, '[határidő]')}-ig, hogy a hallgatók időben tervezhessenek.\n\nKöszönöm!`,
  },
  {
    id: 'jegybeiras', group: '14 · Félévközben és záráskor', label: 'Jegybeírási emlékeztető',
    subject: (c) => `Jegybeírás, határidő: ${or(c.due, '[dátum]')}`,
    body: (c) => `Szia [Név]!\n\nKérlek, a(z) [tantárgy] jegyeit vezesd be a Neptunban ${or(c.due, '[dátum]')}-ig. Köszönöm, hogy időben megteszed!`,
  },
  {
    id: 'felevzaro-admin', group: '14 · Félévközben és záráskor', label: 'Félévzáró adminisztráció (körlevél)',
    subject: () => 'Félévzáró adminisztráció, emlékeztető',
    body: (c) => `Kedves Kollégák!\n\nA félév zárásához a következőket kérem ${or(c.due, '[dátum]')}-ig:\n1. jegyek beírása\n2. jelenléti adminisztráció\n3. [dokumentumok]\n\nKöszönöm az együttműködést!`,
  },
  {
    id: 'potvizsga', group: '14 · Félévközben és záráskor', label: 'Pótvizsga egyeztetése',
    subject: () => 'Pótvizsga: [tantárgy]',
    body: () => `Szia [Név]!\n\n[Hallgató] pótvizsgát kér a(z) [tantárgy]-ból. Meg tudjátok oldani [dátum] körül? Kérlek, jelezz egy időpontot, és én szólok a hallgatónak.\n\nKöszönöm!`,
  },
  {
    id: 'felevi-beszamolo', group: '14 · Félévközben és záráskor', label: 'Féléves tapasztalat-összefoglaló bekérése',
    subject: () => '[Félév], rövid beszámoló',
    body: () => `Szia [Név]!\n\nKérlek, küldj egy rövid összefoglalót a(z) [tantárgy] félévi tapasztalatairól: mi ment jól, min változtatnál. Pár mondat is elég, a tavaszi tervezéshez használom.\n\nKöszönöm!`,
  },
  {
    id: 'vendegeloadas', group: '6 · Külső kapcsolatok', label: 'Vendégelőadó felkérése',
    subject: (c) => `Vendégelőadás felkérés, ${or(c.when, '[dátum]')}`,
    body: (c) => `Kedves [Név]!\n\nA METU Média Design szakán szeretnélek felkérni egy [időtartam]-es előadásra [téma] témában, ${or(c.when, '[dátum]')} körül. A hallgatóknak sokat adna a gyakorlati nézőpontod.\n\nÉrdekelne? A részleteket egyeztethetjük. Köszönöm!`,
  },
  {
    id: 'tanszeki-ertekezlet', group: '2 · Oktatói kapcsolattartás', label: 'Tanszéki értekezlet emlékeztető (körlevél)',
    subject: (c) => `Tanszéki értekezlet, ${or(c.when, '[dátum, időpont]')}`,
    body: (c) => `Kedves Kollégák!\n\nEmlékeztető: ${or(c.when, '[dátum] [időpont]')}-kor tanszéki értekezlet${c.place ? ` (${nd(c.place)})` : ' [helyszín / Zoom-link]'}. Napirend: [pontok].\n\nKérlek, jelezzétek, ha nem tudtok jönni. Köszönöm!`,
  },
  {
    id: 'unnepi-koszonto', group: '2 · Oktatói kapcsolattartás', label: 'Évzáró / ünnepi köszöntő (körlevél)',
    subject: () => 'Békés ünnepeket!',
    body: () => `Kedves Kollégák!\n\nKöszönöm az idei félév közös munkáját, sokat tettetek hozzá a szak sikeréhez. Kellemes ünnepeket és pihentető szünetet kívánok mindannyiótoknak!\n\nTalálkozunk januárban!`,
  },
  {
    id: 'tantargyfelosztas', group: '1 · Tematikák és órarend', label: 'Tantárgyfelosztás egyeztetése (következő félév)',
    subject: () => '[Félév], tantárgyfelosztás egyeztetés',
    body: (c) => `Szia [Név]!\n\nA következő félévre a(z) [tantárgy/tantárgyak]-at terveztem hozzád. Megfelel? Kérlek, ${or(c.due, '[dátum]')}-ig jelezz vissza, hogy véglegesíthessem a felosztást.\n\nKöszönöm!`,
  },
  {
    id: 'orarend-veglegesites', group: '1 · Tematikák és órarend', label: 'Órarend véglegesítése (körlevél)',
    subject: () => '[Félév] órarend, véglegesítés',
    body: (c) => `Kedves Kollégák!\n\nKüldöm a [félév] órarend tervezetét: [link / csatolmány]. Kérlek, ${or(c.due, '[dátum]')}-ig jelezzétek az ütközéseket, hogy véglegesíthessük.\n\nKöszönöm!`,
  },
  {
    id: 'szakdolgozat-utemterv', group: '13 · Záróvizsga / opponencia', label: 'Szakdolgozati konzultációk ütemezése (körlevél)',
    subject: () => 'Szakdolgozati konzultációk, ütemezés',
    body: (c) => `Kedves Kollégák!\n\nKérlek, egyeztessetek a témavezetett hallgatóitokkal a konzultációs ütemtervről, és küldjétek felém ${or(c.due, '[dátum]')}-ig. Így időben látjuk, ha valahol csúszás van.\n\nKöszönöm!`,
  },
  {
    id: 'valaszthato-kurzus', group: '8 · Hallgatói ügyek', label: 'Új választható kurzus meghirdetése (körlevél, hallgatók)',
    subject: () => 'Új választható kurzus: [cím]',
    body: () => `Kedves Hallgatók!\n\n[Félév]-ben indul a(z) [kurzuscím] választható kurzus. Rövid leírás: [szöveg]. Jelentkezés: [mód, határidő].\n\nÉrdemes időben jelentkezni, a helyek száma korlátozott!`,
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
    body: (c) => `Kedves Hallgatók!\n\nAz órák ${or(c.when, '[dátum]')}-án indulnak a megszokott rend szerint. Az órarendet itt éritek el: [link]. Az első héten minden órán részvételt várunk, ott hangzanak el a féléves követelmények.\n\nJó félévet mindenkinek!`,
  },
  {
    id: 'szakmai-gyakorlat', group: '8 · Hallgatói ügyek', label: 'Szakmai gyakorlat egyeztetése',
    subject: () => 'Szakmai gyakorlat: [hallgató / cég]',
    body: () => `Szia [Név]!\n\n[Hallgató] szakmai gyakorlatáról egyeztetnék: [cég], [időszak]. Kérlek, [teendő / jóváhagyás]. Ha a céges oldalról kell még dokumentum, azt is jelezd.\n\nKöszönöm!`,
  },
  {
    id: 'szakdolgozat-leadas', group: '13 · Záróvizsga / opponencia', label: 'Szakdolgozat-leadási emlékeztető (körlevél)',
    subject: (c) => `Szakdolgozat leadás, határidő: ${or(c.due, '[dátum]')}`,
    body: (c) => `Kedves Kollégák!\n\nEmlékeztető: a szakdolgozatok leadási határideje ${or(c.due, '[dátum]')}. Kérlek, sürgessétek a témavezetett hallgatóitokat, és jelezzétek, ha valakinél csúszás várható, hogy időben tudjunk lépni.\n\nKöszönöm!`,
  },
  {
    id: 'konzultacio-statusz', group: '13 · Záróvizsga / opponencia', label: 'Konzultációs státusz bekérése',
    subject: () => 'Szakdolgozati konzultáció, státusz',
    body: (c) => `Szia [Név]!\n\nHogy állnak a témavezetett hallgatóid a szakdolgozattal? Van, akinél beavatkozás kell ${or(c.due, '[dátum]')} előtt? Egy rövid, névsoros státusz is sokat segít.\n\nKöszönöm!`,
  },
  {
    id: 'workshop-felkeres', group: '6 · Külső kapcsolatok', label: 'Workshop felkérés',
    subject: (c) => `Workshop felkérés: ${or(c.title, '[téma]')}, ${or(c.when, '[dátum]')}`,
    body: (c) => `Kedves [Név]!\n\nEgy [időtartam]-es workshopra kérnélek fel ${or(c.title, '[téma]')} témában ${or(c.when, '[dátum]')} körül a Média Design szakon. A hallgatók nagyon sokat profitálnak a gyakorlati, kézzelfogható feladatokból.\n\nBelefér? A részleteket egyeztethetjük. Köszönöm!`,
  },
  {
    id: 'hallgatoi-bemutato', group: '6 · Külső kapcsolatok', label: 'Hallgatói bemutató / kiállítás előkészítése (körlevél)',
    subject: (c) => `Hallgatói bemutató: ${or(c.title, '[esemény]')}, ${or(c.when, '[dátum]')}`,
    body: (c) => `Kedves Kollégák!\n\nA(z) ${or(c.title, '[esemény]')} ${or(c.when, '[dátum]')}-án lesz${c.place ? ` (${nd(c.place)})` : ''}. Kérlek, készítsétek elő a hallgatói munkákat, és jelezzétek a technikai igényeket (vetítés, hang, installáció) ${or(c.due, '[határidő]')}-ig.\n\nKöszönöm!`,
  },
  {
    id: 'diplomabemutato', group: '13 · Záróvizsga / opponencia', label: 'Diplomabemutató szervezése (körlevél)',
    subject: (c) => `Diplomabemutató, ${or(c.when, '[dátum]')}`,
    body: (c) => `Kedves Kollégák!\n\nA diplomamunkák bemutatója ${or(c.when, '[dátum]')}-án lesz${c.place ? ` (${nd(c.place)})` : ' [helyszín]'}. Kérlek, készítsétek fel a hallgatókat, és jelezzétek a technikai igényeket ${or(c.due, '[határidő]')}-ig.\n\nKöszönöm!`,
  },
];

export const TOPIC_GROUPS: string[] = [...new Set(TOPIC_TEMPLATES.map((t) => t.group))];
