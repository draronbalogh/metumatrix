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
  // az elküldött levelek 1-2. részéből átvett további sablonok
  {
    id: 'tematika-egyeni', group: '1 · Tematikák és órarend', label: 'Tematika kitöltés, egyéni felhívás',
    subject: (c) => `Tantárgytematika kitöltése, határidő: ${or(c.due, '[dátum]')}`,
    body: (c) => `Szia [Név]!\n\nKérlek, töltsd ki / frissítsd a(z) [tantárgy] tematikáját a Neptun felületén ${or(c.due, '[dátum]')}-ig. Ha kérdés van, szólj.\n\nKöszönöm!`,
  },
  {
    id: 'szillabusz', group: '1 · Tematikák és órarend', label: 'Szillabusz leadási emlékeztető',
    subject: () => 'Szillabusz leadás, emlékeztető',
    body: (c) => `Szia [Név]!\n\nEmlékeztetőül: a(z) [tantárgy] szillabuszát ${or(c.due, '[dátum]')}-ig várom. A sablont itt éred el: [link].\n\nKöszönöm!`,
  },
  {
    id: 'targykiosztas', group: '1 · Tematikák és órarend', label: 'Tárgykiosztás egyeztetése',
    subject: () => 'MD tárgykiosztás, [tanév] ősz',
    body: () => `Szia [Név]!\n\nKöszönöm a tárgykiosztást. Átnéztem, egy kérdésem/észrevételem van: [pont]. A többivel egyetértek. Egyeztessünk, ha kell, egy rövid hívásban.\n\nKöszönöm!`,
  },
  {
    id: 'orarend-egyeztetes', group: '1 · Tematikák és órarend', label: 'Órarendi sáv egyeztetése (egyéni)',
    subject: () => 'Órarend [félév], egyeztetés',
    body: () => `Szia [Név]!\n\nKüldöm a tervezett órarendi sávodat: [nap, időpont, terem]. Kérlek, jelezz vissza, hogy megfelel-e, vagy van-e ütközés.\n\nKöszönöm!`,
  },
  {
    id: 'orarend-utkozes', group: '1 · Tematikák és órarend', label: 'Órarendi ütközés, válasz',
    subject: () => 'Re: Órarendi ütközés',
    body: () => `Szia [Név]!\n\nKöszönöm a jelzést. Áthelyeztük a(z) [tantárgy]-t [új időpont]-ra. Így már nincs ütközés, ugye?\n\nKöszönöm!`,
  },
  {
    id: 'uj-oktato', group: '2 · Oktatói kapcsolattartás', label: 'Új oktató bemutatása (körlevél)',
    subject: () => 'Új kolléga: [Név] bemutatása',
    body: () => `Kedves Kollégák!\n\nSzeretném bemutatni [Név]-t, aki [félév]-től a(z) [tantárgy]-t viszi nálunk. Kérlek, segítsétek a beilleszkedését.\n\nKöszönöm!`,
  },
  {
    id: 'elerhetoseg-potlas', group: '2 · Oktatói kapcsolattartás', label: 'Elérhetőség pótlása (egyéni)',
    subject: () => 'MD oktatói elérhetőségek, kérlek pótold',
    body: () => `Szia [Név]!\n\nA szakos elérhetőségi listát frissítem. Kérlek, küldd el a telefonszámod és a preferált email-címed.\n\nKöszönöm!`,
  },
  {
    id: 'konzultacios-idosav', group: '2 · Oktatói kapcsolattartás', label: 'Konzultációs idősávok bekérése',
    subject: () => 'Konzultációs idősávok, [félév]',
    body: () => `Szia [Név]!\n\nKérlek, add meg a heti konzultációs idősávodat, hogy meghirdethessük a hallgatóknak.\n\nKöszönöm!`,
  },
  {
    id: 'havi-hataridok', group: '2 · Oktatói kapcsolattartás', label: 'Havi határidő-összefoglaló (körlevél)',
    subject: () => '[Hónap] határidők, összefoglaló',
    body: () => `Kedves Kollégák!\n\nRöviden a hónap teendői:\n1. [teendő]\n2. [teendő]\n3. [teendő]\n\nA határidők: [dátumok]. Köszönöm, hogy tartjátok!`,
  },
  {
    id: 'felveteli-levelek', group: '3 · Pótfelvételi', label: 'Felvételi levelek (MED) kiküldése',
    subject: () => 'Média Design, felvételi levelek',
    body: (c) => `Kedves [Név]!\n\nKüldöm a MED szak normál és pótfelvételi leveleinek szövegét/listáját. Kérlek, [teendő] ${or(c.due, '[határidő]')}-ig.\n\nKöszönöm!`,
  },
  {
    id: 'projekthet-felkeres', group: '4 · Projekthét', label: 'Projekthét oktatói felkérés (egyéni)',
    subject: (c) => `Projekthét, ${or(c.when, '[dátum]')}, felkérés`,
    body: (c) => `Szia [Név]!\n\nA(z) ${or(c.title, '[projekthét téma]')} projekthéten szeretnélek felkérni [szerep]-re (${or(c.when, '[dátum]')}). Belefér? A részleteket küldöm.\n\nKöszönöm!`,
  },
  {
    id: 'szemeszterkezdes', group: '8 · Hallgatói ügyek', label: 'Szemeszterkezdő tájékoztató (körlevél, hallgatók)',
    subject: () => 'Szemeszterkezdés, fontos tudnivalók',
    body: (c) => `Kedves Hallgatók!\n\nA(z) [félév] ${or(c.when, '[dátum]')}-án indul. A legfontosabbak:\n1. [órarend]\n2. [regisztráció]\n3. [helyszínek]\n\nKérdés esetén írjatok!`,
  },
  {
    id: 'szakdolgozati-temak', group: '13 · Záróvizsga / opponencia', label: 'Szakdolgozati témák bekérése (körlevél)',
    subject: (c) => `Szakdolgozati témák, leadás ${or(c.due, '[dátum]')}-ig`,
    body: (c) => `Kedves Kollégák!\n\nKérlek, gyűjtsétek be a témavezetett hallgatóitok szakdolgozati témáit ${or(c.due, '[dátum]')}-ig, és küldjétek felém.\n\nKöszönöm!`,
  },
  {
    id: 'web-bio-bekeres', group: '9 · Kommunikáció / arculat', label: 'Web-bio bekérése (angol szöveg + fotó)',
    subject: () => 'Web-bio, angol szöveg kérése',
    body: (c) => `Szia [Név]!\n\nA honlapra kérnék tőled egy rövid angol bemutatkozó szöveget (kb. [terjedelem]) és egy fotót ${or(c.due, '[dátum]')}-ig.\n\nKöszönöm!`,
  },
  {
    id: 'teremigeny', group: '10 · Belső / technikai', label: 'Teremigény egyeztetése',
    subject: () => 'Teremigény: [tantárgy], [időpont]',
    body: () => `Szia [Név]!\n\nA(z) [tantárgy]-hoz [teremtípus]-ra lenne szükségem [nap, időpont]. Meg tudjátok oldani?\n\nKöszönöm!`,
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
];

export const TOPIC_GROUPS: string[] = [...new Set(TOPIC_TEMPLATES.map((t) => t.group))];
