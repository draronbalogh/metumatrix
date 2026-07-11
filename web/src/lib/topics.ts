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
    body: (c) => `Kedves Kollégák!\n\nKüldöm az őszi Projekthét programtervét: [link / csatolmány]. Kérlek, nézzétek át a saját blokkotokat, és ${or(c.due, '[dátum]')}-ig jelezzétek a módosításokat.\n\nKöszönöm!`,
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
];

export const TOPIC_GROUPS: string[] = [...new Set(TOPIC_TEMPLATES.map((t) => t.group))];
