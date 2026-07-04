export type Program = 'BA' | 'MA';
export type Institute = 'AMD' | 'ELM';

export interface Course {
  type: string;
  name: string;
  specialization: string | null;
  courseType: string;
  hours: number | null;
  credits: number | null;
  active: number | null;
  groups: string | null;
  instructors: string | null;
  institute: string;
  note: string | null;
  description: string | null;
  short?: string | null;
  felelos: string | null;
  prerequisite: string | null;
  requirement: string | null;
  software: string[];
  keywords: string[];
  category?: string[];
  cel: string | null;
  pdfUrl: string | null;
  group: number | null;
}

// Fix kategória-taxonómia — az adatban CSAK ezek szerepelhetnek (szűrő + kártya-chipek erre épülnek)
export const CATEGORIES = [
  '2d', '3d', 'animáció', 'film/videó', 'fotó', 'hang', 'grafika/tipográfia', 'ux/web/fejlesztés',
  'játék', 'installáció', 'ai', 'elmélet', 'diploma/portfólió', 'projekt',
] as const;

// A korábbi külön ux/web/fejlesztés kategóriák összevonva — a mentett adatban (fájl, localStorage,
// régi exportok) még a régi nevek szerepelhetnek, ezért minden olvasás ezen a leképezésen megy át.
const CAT_MERGE: Record<string, string> = {
  'ux/interakció': 'ux/web/fejlesztés',
  web: 'ux/web/fejlesztés',
  fejlesztés: 'ux/web/fejlesztés',
};

export const catList = (c: Course): string[] => {
  const out: string[] = [];
  (c.category ?? []).forEach((k) => {
    const m = CAT_MERGE[k] ?? k;
    if (!out.includes(m)) out.push(m);
  });
  return out;
};

export interface Cohort {
  version: string;
  program: Program;
  semester: number | null;
  label: string;
  courses: Course[];
}

// kézi összekötés vonalstílusa: animált (alapértelmezés) / folyamatos / szaggatott / pontozott
export type EdgeLook = 'anim' | 'solid' | 'dash' | 'dot';

export interface UserEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  look?: EdgeLook;
}

export interface Curriculum {
  title: string;
  cohorts: Cohort[];
  positions?: Record<string, { x: number; y: number }>;
  userEdges?: UserEdge[];
}

export const VERSION_ORDER = ['2026/2027', '2025/2026', '2024/2025', 'régi (korábbi)'];

export const DEFAULT_DATA: Curriculum = {
  "title": "METU Média Design – tantervi hierarchia",
  "cohorts": [
    {
      "version": "2026/2027",
      "program": "BA",
      "semester": 1,
      "label": "Média Design BA 2026/2027",
      "courses": [
        {
          "type": "Kötelező",
          "name": "Digitális grafikai stúdiumok",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 21,
          "groups": "2",
          "instructors": "Szacsvai Pál",
          "institute": "AMD",
          "note": null,
          "description": "A hallgató a kurzus során a képernyő-specifikus grafikai tervezés alapelveivel, a képi közlés alapelemeivel (szín, forma, vonal, kompozíció, tipográfiai és rajzi struktúra) és ezek kreatív tervezési alkalmazásával ismerkedik meg. A félév gyakorlati feladatai az adatvizualizációtól a piktogramtervezésen és logóparafrázison át a bitmap és vektoros elemeket ötvöző hibrid grafikákig terjednek, Adobe Illustrator és Photoshop használatával. A megszerzett tudás megalapozza a későbbi félévek mozgógrafikai és 3D modellezési stúdiumait.",
          "felelos": "Kiss Melinda",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Illustrator",
            "Photoshop"
          ],
          "keywords": [
            "grafikai tervezés",
            "illustrator",
            "photoshop",
            "képi közlés",
            "digitális grafika",
            "vizuális kommunikáció",
            "piktogram",
            "kompozíció"
          ],
          "cel": "A tantárgy célja a média design szakma műveléséhez elengedhetetlen képnyelvi és mozgóképnyelvi alapismeretek átadása, valamint a számítógépes képalkotás, képfeldolgozás és képszerkesztés alapelveinek ismertetése és gyakoroltatása az Adobe Illustrator és Photoshop programok használata útján.",
          "pdfUrl": "/tematikak/12306.pdf",
          "category": [
            "grafika/tipográfia",
            "2d"
          ],
          "group": null,
          "short": "Vektor- és pixelgrafika: adatvizualizáció, piktogram, logóparafrázis, hibrid grafika (Illustrator, Photoshop)."
        },
        {
          "type": "Kötelező",
          "name": "Interakciótervezés 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 6,
          "credits": 7,
          "active": null,
          "groups": "2",
          "instructors": "Poroszlai Eszter, Kunszt Gábor",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus bevezető részében a hallgatók megismerkednek az Arduino fejlesztői környezettel, valamint elektronikai és programozói alapismeretekkel, és bepillantást nyernek a folyamatalapú fizikai algoritmikus alkotás világába. A félév második felében műhelymunka keretében anyagkísérleteket és prototípusgyártást végeznek, majd saját koncepció alapján kisebb interaktív rendszereket készítenek. A technikai és művészeti modul párhuzamosan fut, a kinetikus előképektől az áramkörök esztétikájáig.",
          "felelos": "Sterk Barbara DLA",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Arduino"
          ],
          "keywords": [
            "interakciótervezés",
            "arduino",
            "fizikai computing",
            "prototípus",
            "elektronika",
            "interaktív installáció",
            "programozás"
          ],
          "cel": "A kurzus célja az interakciótervezés alapjainak elsajátítása eszközismereti (Arduino nyelv), fizikai alkotói (tervezői) és művészeti (esztétikai) szemlélet szempontjából. A hallgató a kurzus elvégzése eredményeképpen képes felismerni, elemezni, érteni, alkalmazni, valamint prezentálni az interakciótervezés alapjainak területét képező ismeretanyagot, technikai tudást és alkotói képességet.",
          "pdfUrl": "/tematikak/12308.pdf",
          "category": [
            "ux/interakció",
            "installáció"
          ],
          "group": null,
          "short": "Arduino-alapú fizikai prototípusok: elektronika, programozás, anyagkísérletek, saját interaktív objektumok."
        },
        {
          "type": "Kötelező",
          "name": "Kommunikációs ismeretek alapjai",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "A tantárgy a kommunikáció alapfogalmaival, elméleteivel és modelljeivel ismerteti meg a hallgatókat előadás formájában. Az elméleti alapozó kurzus a média design képzés társadalomtudományi hátterét erősíti, és kollokviummal zárul.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "kommunikáció",
            "kommunikációelmélet",
            "médiaelmélet",
            "alapismeretek",
            "előadás"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Kommunikáció alapfogalmai, elméletei és modelljei — társadalomtudományi alapozó előadás, kollokviummal."
        },
        {
          "type": "Kötelező",
          "name": "Média design stúdiumok 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": "2",
          "instructors": "Molnár Ágnes",
          "institute": "AMD",
          "note": null,
          "description": "A média design szak alapozó főtantárgya, amely a hallgatók alkotókészségét és művészeti kreativitását fejleszti, és megalapoz minden további gyakorlati média design tárgyat. Az első félév ismeretanyaga a kompozíció, a perspektíva és térábrázolás, az anatómia (portréábrázolás), valamint a kreatív látásmód fejlesztése, szabadkézi rajzi és digitális technikák ötvözésével. A kreatív feladatok a színtantól a parafrázison át múzeumlátogatásig terjednek, a félév prezentációval és kipakolással zárul.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Lightroom",
            "Premiere Pro",
            "After Effects"
          ],
          "keywords": [
            "médiadesign",
            "alapozó",
            "kreativitás",
            "kompozíció",
            "perspektíva",
            "anatómia",
            "szabadkézi rajz",
            "térlátás"
          ],
          "cel": "A tantárgy célja a média design szakma műveléséhez elengedhetetlen képnyelvi alapismeretek átadása és a területen való alkotói készségek kifejlesztése, valamint a manuális és számítógépes képalkotás alapelveinek, eljárásainak ismertetése és gyakoroltatása.",
          "pdfUrl": "/tematikak/12452.pdf",
          "category": [
            "2d",
            "grafika/tipográfia"
          ],
          "group": null,
          "short": "Kompozíció, perspektíva, portré-anatómia, színtan szabadkézi rajzzal és digitálisan; parafrázis, múzeum."
        },
        {
          "type": "Kötelező",
          "name": "Művészettörténet társadalomtudományi kontextusban 1.",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "A tantárgy a művészettörténet meghatározó korszakait és irányzatait tárgyalja társadalomtudományi kontextusba helyezve, előadás formájában. Az elméleti kurzus a hallgatók vizuális kultúrával kapcsolatos tájékozottságát és kritikai gondolkodását fejleszti, és kollokviummal zárul.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "művészettörténet",
            "társadalomtudomány",
            "kultúrtörténet",
            "elmélet",
            "előadás"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Meghatározó művészeti korszakok és irányzatok társadalmi kontextusban; vizuális kultúra, kritikai gondolkodás."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 1. (Média design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": null,
          "groups": "1",
          "instructors": "Balogh Áron",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át workshopok, meghívott előadók prezentációi, mesterkurzusok, innovációs és technikai bemutató előadások, konferencia- és kiállításlátogatások, valamint közös projektek formájában. Fontos szempont a társterületek alapismereteinek és kompetenciáinak beemelése, a kreatív ipari szemlélet fejlesztése és a portfólióépítés. A teljesítés feltétele a jelenlét és a kijelölt szakmai feladatok határidőre való leadása.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "mesterkurzus",
            "portfólió",
            "kiállítás"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak workshopok, előadások, meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, akár vendégelőadók, akár közös programok formájában, valamint a különböző szakterületek találkozása, a kreatív iparban használatos szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/12722.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, meghívott előadók, kiállításlátogatás és közös projektek — portfólióépítés."
        },
        {
          "type": "Kötelező",
          "name": "UX design stúdiumok 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": "2",
          "instructors": "Balogh Áron",
          "institute": "AMD",
          "note": null,
          "description": "A tantárgy a felhasználói élmény (UX) tervezés alapismereteit, módszereit és folyamatait, valamint az ehhez használt szoftvereket (Miro, Figma) ismerteti meg a hallgatókkal. A Design Thinking keretrendszer mentén haladva a félév a feltáró kutatásoktól az interjúkészítésen, perszónákon és customer journey-n át az információs architektúráig, user flow-ig és a Figmában készülő UI-tervekig ível. A hallgatók egy szabadon választott témájú digitális alkalmazás tervezési folyamatán keresztül alapozzák meg digitális terméktervezői készségeiket.",
          "felelos": "Balogh Áron Zsigmond Dr.",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Figma",
            "Miro"
          ],
          "keywords": [
            "ux design",
            "figma",
            "miro",
            "felhasználói élmény",
            "prototípus",
            "design thinking",
            "perszóna",
            "user flow"
          ],
          "cel": "A kurzus célja a UX design eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai) elsajátítása alap szinten. A hallgató a kurzus elvégzése eredményeképpen képes alap szinten felismerni, elemezni, érteni és felhasználni (alkalmazni), valamint prezentálni a UX design területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/12741.pdf",
          "category": [
            "ux/interakció"
          ],
          "group": null,
          "short": "Design Thinking: kutatás, interjú, perszóna, customer journey, user flow, UI-tervek Figmában és Miróban."
        }
      ]
    },
    {
      "version": "2026/2027",
      "program": "BA",
      "semester": 2,
      "label": "Média Design BA 2026/2027",
      "courses": [
        {
          "type": "Kötelező",
          "name": "Művészettörténet társadalomtudományi kontextusban 2.",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Előadás jellegű elméleti tantárgy, amely a művészettörténet korszakait és jelenségeit tágabb társadalomtudományi kontextusban tárgyalja. A kétféléves sorozat második részeként a hallgatók a műalkotásokat társadalmi, kulturális és történeti összefüggéseikben tanulják meg elemezni és értelmezni.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "művészettörténet",
            "társadalomtudomány",
            "elmélet",
            "kultúrtörténet",
            "vizuális kultúra",
            "műelemzés"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Műalkotások elemzése társadalmi, kulturális és történeti összefüggésekben, korszakokon átívelően."
        },
        {
          "type": "Kötelező",
          "name": "Bevezetés a filozófiába és az esztétikába",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Bevezető előadás a filozófia és az esztétika alapkérdéseibe és fogalomrendszerébe. A tantárgy a filozófiai gondolkodás főbb irányzatainak és az esztétika alapproblémáinak áttekintésével elméleti alapot ad a hallgatók művészeti és tervezői tanulmányaihoz.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "filozófia",
            "esztétika",
            "elmélet",
            "művészetfilozófia",
            "gondolkodástörténet"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Filozófiai irányzatok és esztétikai alapproblémák áttekintése, elméleti alap a művészeti tanulmányokhoz."
        },
        {
          "type": "Kötelező",
          "name": "Tipográfia és betűrajz",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 24,
          "groups": "2",
          "instructors": "Szacsvai Pál",
          "institute": "AMD",
          "note": null,
          "description": "A tantárgy a tipográfiai érzékenység kialakítását és a szöveges közlés megformálásának, kép és szöveg együttes elrendezésének technikáit tanítja. A hallgatók a betűtörténetet a római kapitálistól a modern betűtípusokig betűrajzi és kreatív gyakorlatokon keresztül dolgozzák fel, miközben InDesignban elsajátítják a számítógépes kiadványtervezés (DTP) alapjait a szedéstől a nyomdai előkészítésig. A félév során saját fonttervet és kiadványtervet készítenek, amelyek portfólióelemként is szolgálnak.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "InDesign",
            "Photoshop",
            "Fontself"
          ],
          "keywords": [
            "tipográfia",
            "betűrajz",
            "indesign",
            "betűtervezés",
            "betűtörténet",
            "kiadványtervezés",
            "dtp",
            "fonttervezés"
          ],
          "cel": "A kurzus célja a tipográfia és betűrajz eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai szemlélet szempontjából) elsajátítása alapszinten. A hallgató a kurzus elvégzése eredményeképpen képes alapszinten felismerni, elemezni, érteni és felhasználni, valamint prezentálni a tipográfia és betűrajz területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/15053.pdf",
          "category": [
            "grafika/tipográfia",
            "2d"
          ],
          "group": null,
          "short": "Betűtörténet a római kapitálistól, betűrajz, fontterv és kiadványtervezés InDesignban, nyomdai előkészítés."
        },
        {
          "type": "Kötelező",
          "name": "Média design stúdiumok 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 24,
          "groups": "2",
          "instructors": "Szűcs Levente",
          "institute": "AMD",
          "note": null,
          "description": "A tantárgy a média design szakma műveléséhez szükséges képnyelvi, fotográfiai és mozgóképnyelvi alapismereteket adja át. A hallgatók megismerik az expozíciót, a világítástechnikákat, a plánokat és kompozíciókat, a digitális képfeldolgozást Lightroomban, valamint a mozgóképkészítés alapjait a kameramozgásoktól a vágáson és színkezelésen át a hangig, Premiere Pro és After Effects használatával. A féléves feladat egy hívószóra készített fotósorozat és egy rövid kisfilm.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "Média design stúdiumok 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Lightroom",
            "Premiere Pro",
            "After Effects"
          ],
          "keywords": [
            "fotó",
            "lightroom",
            "premiere pro",
            "after effects",
            "mozgókép",
            "vágás",
            "világítás",
            "médiatervezés"
          ],
          "cel": "A kurzus célja a médiatervezés eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai szemlélet szempontjából) elsajátítása alap szinten. A hallgató a kurzus elvégzése eredményeképpen képes alap szinten felismerni, elemezni, érteni és felhasználni, valamint prezentálni a médiatervezés területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/15044.pdf",
          "category": [
            "fotó",
            "film/videó"
          ],
          "group": null,
          "short": "Fotó: expozíció, világítás, plánok, Lightroom; mozgókép: vágás, szín, hang (Premiere, After Effects)."
        },
        {
          "type": "Kötelező",
          "name": "Interakciótervezés 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 6,
          "credits": 7,
          "active": 24,
          "groups": "2",
          "instructors": "Poroszlai Eszter, Kunszt Gábor",
          "institute": "AMD",
          "note": null,
          "description": "A tantárgy két modulban vezeti be a hallgatókat a fizikai interakciótervezés haladó gyakorlataiba. A technikai modulban Arduino-programozással, szenzorokkal (távolság-, fény-, érintésérzékelés) és aktuátorokkal (fények, szervók, motorok vezérlése) ismerkednek meg, a művészeti modul pedig inspirációgyűjtésen, fénykutatáson, anyagkísérleteken és áramkörtervezésen keresztül a fizikai interakció művészeti alkalmazásába vezet be. A félév végére a hallgatók önálló interaktív műalkotást terveznek, kiviteleznek és dokumentálnak.",
          "felelos": "Sterk Barbara DLA",
          "prerequisite": "Interakciótervezés 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Arduino"
          ],
          "keywords": [
            "interakciótervezés",
            "arduino",
            "fizikai computing",
            "szenzorok",
            "interaktív installáció",
            "fényművészet",
            "elektronika"
          ],
          "cel": "A kurzus célja az interakciótervezés alapjainak eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai szemlélet szempontjából) elsajátítása haladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni és felhasználni, valamint prezentálni az interakciótervezés alapjainak területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/15034.pdf",
          "category": [
            "ux/interakció",
            "installáció"
          ],
          "group": null,
          "short": "Arduino-programozás szenzorokkal és aktuátorokkal; interaktív fényművészeti alkotás tervezése, építése."
        },
        {
          "type": "Kötelező",
          "name": "UX design stúdiumok 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 4,
          "active": 24,
          "groups": "2",
          "instructors": "Kiss Lőrinc",
          "institute": "AMD",
          "note": null,
          "description": "A tantárgy a felhasználói élmény (UX) tervezés módszereit, folyamatait és szoftvereit (Miro, Figma) tanítja a Design Thinking keretrendszer mentén, haladó szinten. A félév témái közé tartoznak a tervezési alapelvek, a usability heurisztikák, a platformspecifikus tervezés (reszponzív web, Android, iOS), az akadálymentesítés és a felhasználói tesztelés. A hallgatók egy szabadon választott digitális alkalmazás prototípusát tervezik meg Figmában, a kutatástól a perszónákon és user flow-n át a kész esettanulmányig.",
          "felelos": "Balogh Áron Zsigmond Dr.",
          "prerequisite": "UX design stúdiumok 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Figma",
            "Miro"
          ],
          "keywords": [
            "ux design",
            "figma",
            "miro",
            "prototípus",
            "design thinking",
            "felhasználói tesztelés",
            "akadálymentesítés",
            "user flow"
          ],
          "cel": "A kurzus célja a UX design eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai) elsajátítása haladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni és felhasználni, valamint prezentálni a UX design területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/14761.pdf",
          "category": [
            "ux/interakció"
          ],
          "group": null,
          "short": "Design Thinking, usability heurisztikák, akadálymentesítés, tesztelés; app-prototípus Figmában."
        },
        {
          "type": "Kötelező",
          "name": "Média design szakelmélet",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": 24,
          "groups": "1",
          "instructors": "Liszka Tamás",
          "institute": "AMD",
          "note": null,
          "description": "Előadás jellegű tantárgy, amely a média design szellemtörténeti előzményeivel, tudományos, technikai és társművészeti környezetével ismerteti meg a hallgatókat. A félév témái között szerepel a kép, jel és szimbólum kérdése, a fénykép ontológiája, a képi kommunikáció, az ikonográfia, a bio-art, a játék- és hálózatelmélet, valamint az interaktivitás és a nonlineáris művészeti formák. Konkrét művek és alkotók vizsgálatán keresztül körvonalazódik a média design kortárs művészeti alapállása.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "-",
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "elmélet",
            "médiadesign",
            "szakelmélet",
            "médiaelmélet",
            "szemiotika",
            "képelmélet",
            "interaktivitás"
          ],
          "cel": "A kurzus célja a média design általános elméletének elsajátítása, hogy a hallgató alkotó-, tervező- és művészi, valamint prezentációs munkájához elméleti megalapozásként és fogalmi kiegészítésként alkalmazhassa. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni és alkalmazni az elsajátított elméleti ismeretanyagot, és médiatervezői, médiaművészi gyakorlatát el tudja helyezni és sikeresen képviselni tudja szakmai együttműködései során, valamint egy szélesebb, interdiszciplináris keretben.",
          "pdfUrl": "/tematikak/15047.pdf",
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Kép, jel és szimbólum, fénykép-ontológia, bio-art, hálózatelmélet és nonlineáris művészeti formák."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 2. (Média design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": null,
          "groups": "1",
          "instructors": "Szacsvai Pál",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át workshopok, előadások és meghívott előadók által vezetett projektek formájában. A programok között szerepelnek szakmai prezentációk, mesterkurzusok, innovációs előadások, technikai bemutatók, konferencia- és kiállításlátogatások, valamint közös projektek kivitelezése. Fontos cél a társterületek alapismereteinek beemelése és a portfólióépítés.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "projektmunka",
            "mesterkurzus",
            "portfólió",
            "ba"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak workshopok, előadások és meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, akár vendégelőadók, akár közös programok formájában. A tárgy keretében megvalósulnak a MyBrand szemlélet fontos alappillérei: a különböző szakterületek találkozása, a tudás- és kompetenciaelemek egymásra épülése, a kreatív iparban használatos szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/14760.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, meghívott előadók, kiállításlátogatás és közös projektek; portfólióépítés."
        }
      ]
    },
    {
      "version": "2026/2027",
      "program": "BA",
      "semester": 3,
      "label": "Média Design BA 2026/2027",
      "courses": [
        {
          "type": "Kötelező",
          "name": "Művészetelmélet",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadás, amely a művészetelmélet alapfogalmaival, főbb irányzataival és a művészet értelmezésének kérdéseivel foglalkozik. A kurzus a média design gyakorlatához szükséges esztétikai és elméleti hátteret alapozza meg, támogatva a hallgatók kritikai és elemző gondolkodását.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "művészetelmélet",
            "esztétika",
            "művészettörténet",
            "elmélet",
            "vizuális kultúra",
            "kortárs művészet"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "A művészet értelmezésének alapfogalmai és fő irányzatai; esztétikai, kritikai és elemző gondolkodás."
        },
        {
          "type": "Kötelező",
          "name": "Bevezetés a médiakultúrába",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadás, amely bevezetést nyújt a médiakultúra alapfogalmaiba, a média történeti alakulásába és társadalmi-kulturális szerepébe. A kurzus a média design szak elméleti megalapozását szolgálja, segítve a hallgatókat a médiajelenségek kritikai értelmezésében.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "médiakultúra",
            "médiaelmélet",
            "tömegkommunikáció",
            "új média",
            "elmélet",
            "vizuális kultúra"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "A média történeti alakulása és társadalmi-kulturális szerepe; médiajelenségek kritikai értelmezése."
        },
        {
          "type": "Kötelező",
          "name": "Mozgógrafika 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 24,
          "groups": "2",
          "instructors": "Kolosy Becse, Kaiser Péter",
          "institute": "AMD",
          "note": null,
          "description": "A tantárgy az After Effects 2025 környezetének és a kortárs motion design gyakorlatának elsajátítására fókuszál, kiegészítve a mesterséges intelligencia alapú képi és videós tartalomgenerálás aktuális trendjeivel. A hallgatók megismerik a kompozíciós felépítést, a kulcskockás animációt, a maszkolási és áttűnési technikákat, a színkorrekciós és 3D layer-módszereket, valamint a professzionális renderelési folyamatot. A félév zárásaként elkészített branding spot integrálja a megszerzett elméleti és gyakorlati kompetenciákat.",
          "felelos": "Kiss Melinda",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "After Effects",
            "Adobe Firefly",
            "Runway",
            "Media Encoder"
          ],
          "keywords": [
            "mozgógrafika",
            "after effects",
            "animáció",
            "motion graphics",
            "kulcskocka",
            "kompozíció",
            "ai",
            "branding spot"
          ],
          "cel": "A kurzus célja a mozgógrafika eszközismereti, alkotói és művészi elsajátítása alapszinten Adobe After Effects szoftverkörnyezetben, kiegészítve a generatív AI-alapú kreatív eszköztárral és a legújabb animációs és VFX-munkafolyamatokkal. A kurzus elvégzésekor a hallgatók képesek lesznek önállóan létrehozni mozgógrafikai alkotásokat.",
          "pdfUrl": "/tematikak/12458.pdf",
          "category": [
            "animáció",
            "2d"
          ],
          "group": null,
          "short": "After Effects-alapok: kulcskocka, maszkolás, színkorrekció, 3D layer, AI-generálás; záró branding spot."
        },
        {
          "type": "Kötelező",
          "name": "Hang labor 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 24,
          "groups": "2",
          "instructors": "Kováts Jázon",
          "institute": "AMD",
          "note": null,
          "description": "A hallgató a kurzus során a hangfelvétel alapelveivel, a hang editálásának alapelemeivel, ezek kreatív tervezési alkalmazásával és a kortárs digitális rendszerekben betöltött szerepével ismerkedik meg. A tematika a hangtani alapfogalmaktól a mikrofonok és rögzítőeszközök használatán, a digitális hangszerkesztésen (EQ, zajszűrés, delay, reverb) át a MIDI/OSC alapú interaktív rendszerekig terjed. A megszerzett tudás megalapozza a későbbi félévek médiaanyagainak hangaláfestését.",
          "felelos": "Csáki László",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Audition",
            "Ableton Live",
            "Max/MSP",
            "PaulXStretch"
          ],
          "keywords": [
            "hangfelvétel",
            "hangvágás",
            "hangdesign",
            "audio",
            "midi",
            "osc",
            "keverés",
            "hangszerkesztés"
          ],
          "cel": "A tantárgy célja a média design szakma műveléséhez elengedhetetlen, képet kísérő hangnyelvi alapismeretek átadása, valamint a számítógépes hangmegmunkálás, hangfeldolgozás és hangsáv-szerkesztés alapelveinek ismertetése és gyakoroltatása. A hallgató a kurzus elvégzésekor képes lesz képi anyagok alatti hangsáv szerkesztésére (zörejek, zajok, hangdesign).",
          "pdfUrl": "/tematikak/12457.pdf",
          "category": [
            "hang"
          ],
          "group": null,
          "short": "Hangfelvétel, vágás, EQ, zajszűrés, reverb; hangdesign és MIDI/OSC interaktív rendszerek (Audition, Ableton)."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 3. (Média design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": 24,
          "groups": "1",
          "instructors": "Pálfi Szabolcs",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét keretében a mintatantervben foglalt szakmai ismereteken túlmutató programok valósulnak meg: a szakmában aktívan dolgozó meghívott előadók prezentációi, mesterkurzusok, innovációs témájú előadások és workshopok, technikai bemutatók, konferencia- és kiállításlátogatások, valamint közös projektek kivitelezése. A tárgy a társterületi kompetenciák beemelését és a portfólióépítést támogatja.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "mesterkurzus",
            "projektmunka",
            "portfólió"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak workshopok, előadások és meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, valamint a MyBrand szemlélet alappilléreinek megvalósítása: a különböző szakterületek találkozása, a kreatív iparban használatos szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/12745.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Meghívott előadók, mesterkurzusok, workshopok, kiállításlátogatás; társterületi tudás és portfólióépítés."
        },
        {
          "type": "Kötelező",
          "name": "Multimédia design 1.",
          "specialization": "Multimédia specializáció",
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": "1",
          "instructors": "Balogh Áron",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a sztenderdizálódott online médiafelületeket leíró nyelvek (HTML, CSS) alapjainak megismerésére és alkalmazására épül, a wireframing és prototípus-készítés (Figma, Penpot), a tipográfiai megoldások, az akadálymentesítés és a reszponzív design gyakorlati elsajátításával. A hallgatók a félév során önálló tervezési és fejlesztési projektfeladatot valósítanak meg, amelynek célja a template-jelleget meghaladó, egyedi, újszerű online médiatartalmak előállítása.",
          "felelos": "Mayer Éva",
          "prerequisite": "Média design stúdiumok 2.",
          "requirement": "gyakorlati jegy",
          "software": [
            "HTML",
            "CSS",
            "Figma",
            "Penpot"
          ],
          "keywords": [
            "webdesign",
            "html",
            "css",
            "prototípus",
            "wireframe",
            "reszponzív",
            "akadálymentesítés",
            "ui"
          ],
          "cel": "A kurzus célja a multimédia médiatervezés eszközismereti, alkotói és művészi (esztétikai) elsajátítása haladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni és felhasználni, valamint prezentálni a médiatervezés multimédia területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/12460.pdf",
          "category": [
            "web",
            "ux/interakció"
          ],
          "group": null,
          "short": "HTML/CSS-alapok, wireframe és prototípus (Figma, Penpot), tipográfia, akadálymentesítés, reszponzív design."
        },
        {
          "type": "Kötelező",
          "name": "3D labor (Multimédia) 1.",
          "specialization": "Multimédia specializáció",
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": "1",
          "instructors": "Berkes Bálint",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a formák és anyagok térbeli vizuális megjelenésének és viselkedésének megismerésére, valamint azok szoftveres reprodukálására és szimulálására épül. A hallgatók elsajátítják a 3D szoftverek alapvető használatát a modellezés, textúrázás, világítás, UV mapping, kamerakezelés és renderelés területén, és megismerkednek a fotogrammetriával is. A féléves projektfeladat egy választott mindennapi tárgy teljes körű 3D modelljének elkészítése és koncepcióalapú képsorozattal való bemutatása.",
          "felelos": "Selján Márk Endre",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Blender",
            "Unreal Engine"
          ],
          "keywords": [
            "3d",
            "modellezés",
            "textúrázás",
            "renderelés",
            "uv mapping",
            "világítás",
            "fotogrammetria",
            "pbr"
          ],
          "cel": "A kurzus célja a média designon belül a multimédia-specifikus képalkotás eszközismereti, alkotói és művészi tudásának elsajátítása középhaladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni és felhasználni, valamint prezentálni a multimédia-specifikus képalkotás területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/12454.pdf",
          "category": [
            "3d"
          ],
          "group": null,
          "short": "Blender-alapok: modellezés, textúrázás, UV mapping, világítás, render, fotogrammetria; tárgymodell-projekt."
        },
        {
          "type": "Kötelező és szabváll.",
          "name": "Új technológia pszichológiai vonatkozásai",
          "specialization": "Multimédia specializáció",
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": "1",
          "instructors": "Kollár Dávid",
          "institute": "AMD",
          "note": "szab.váll. létszám: összesen:",
          "description": "A kurzus a modern digitális technológiák pszichológiai hatásainak komplex kognitív tudományos vizsgálatára összpontosít: hogyan formálják a kurrens technológiák az emberi viselkedést, érzelmeket és kognitív folyamatokat. A tematika kiterjed az okoseszközök, a közösségi média, a virtuális valóság, a videójátékok és a mesterséges intelligencia pszichológiai hatásaira, valamint a reziliencia kérdéskörére. A tárgy fogalmi és értelmezési kereteket ad az egyének és közösségek digitális technológiákhoz fűződő viszonyának megértéséhez.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "pszichológia",
            "technológia",
            "kognitív tudomány",
            "közösségi média",
            "virtuális valóság",
            "mesterséges intelligencia",
            "elmélet"
          ],
          "cel": "A kurzus célja a multimédia területén használt új technológiák pszichológiai vonatkozásainak ismertetése, hogy a hallgató alkotó-, tervező- és művészi, valamint prezentációs munkájához elméleti megalapozásként és fogalmi kiegészítésként alkalmazhassa azokat egy szélesebb, interdiszciplináris keretben.",
          "pdfUrl": "/tematikak/12461.pdf",
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Okoseszközök, közösségi média, VR, videójátékok és AI pszichológiai hatásai; kogníció, reziliencia."
        },
        {
          "type": "Kötelező",
          "name": "Game Art és Design 1.",
          "specialization": "Játéktervezés specializáció",
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": "1",
          "instructors": "Pálfi Szabolcs, Kolosy Becse",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus során a hallgatók betekintést nyernek a játékfejlesztés széles spektrumába, az analóg társasjátékoktól a digitális játékok komplex tervezési és gyártási folyamataiig. A félév első fele a társasjáték-tervezésre (prototípus, balanszírozás, mechanikák, finalizálás), második fele a digitális játékfejlesztés gyártási fázisaira (koncepció, prototípus, vertical slice, alfa, béta, gold master) fókuszál. A féléves feladat egy poháralátét méretű társasjáték megtervezése és prezentálható dokumentálása.",
          "felelos": "Appelshoffer Péter",
          "prerequisite": "Média design stúdiumok 2.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Unity"
          ],
          "keywords": [
            "game design",
            "játékfejlesztés",
            "társasjáték",
            "prototípus",
            "játékmechanika",
            "vertical slice",
            "tesztelés"
          ],
          "cel": "A kurzus célja a játékfejlesztés eszközeinek, kreatív és technikai folyamatainak megismertetése a teljes gyártási folyamat mentén, a tervezői és vizuális, illetve az elméleti és gyakorlati feladatok összekapcsolásával. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni és alkalmazni, valamint prezentálni a játékfejlesztés tervezési területéhez tartozó ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat. Ez a tudás lehetővé teszi a komplex alkotási módszerek alkalmazását művészi, alkalmazott és ipari környezetben egyaránt.",
          "pdfUrl": "/tematikak/13184.pdf",
          "category": [
            "játék",
            "2d"
          ],
          "group": null,
          "short": "Társasjáték-tervezés: prototípus, balansz, mechanika; digitális gyártási fázisok koncepciótól gold masterig."
        },
        {
          "type": "Kötelező",
          "name": "3D labor (Játéktervezés) 1.",
          "specialization": "Játéktervezés specializáció",
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": "1",
          "instructors": "Gerő András",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus bevezeti a hallgatókat a játéktervezéshez kapcsolódó háromdimenziós környezetalkotás folyamatába, a Blender-alapú modellezéstől és textúrázástól az Unreal Engine-ben történő valós idejű megjelenítésig. A hallgatók elsajátítják a 3D modellezés és exportálás alapjait, majd saját játékkörnyezetet építenek, kitérve a világítás, az atmoszféra és a blueprint-alapú vizuális kódolás alapjaira. A félév zárásaként önálló environment-projektet fejeznek be és prezentálnak.",
          "felelos": "Selján Márk Endre",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Blender",
            "Unreal Engine",
            "Quixel"
          ],
          "keywords": [
            "3d",
            "unreal engine",
            "blender",
            "játékkörnyezet",
            "environment",
            "blueprint",
            "level design",
            "textúrázás"
          ],
          "cel": "A kurzus célja, hogy a hallgatók gyakorlati példákon keresztül elsajátítsák a háromdimenziós játékkörnyezetek tervezésének és megvalósításának alapvető lépéseit, a Blenderben végzett modellezéstől és textúrázástól az Unreal Engine-ben történő valós idejű megjelenítésig, koherens, prezentálható environment kialakításával.",
          "pdfUrl": "/tematikak/13153.pdf",
          "category": [
            "3d",
            "játék"
          ],
          "group": null,
          "short": "Játékkörnyezet-építés: Blender-modellezés és textúrázás, Unreal világítás, atmoszféra, blueprint-alapok."
        },
        {
          "type": "Kötelező",
          "name": "Játékpszichológia",
          "specialization": "Játéktervezés specializáció",
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": "1",
          "instructors": "Liszka Tamás",
          "institute": "AMD",
          "note": null,
          "description": "A tantárgy a játék pszichológiai működésének, céljának és hatásainak vizsgálatára fókuszál, különös tekintettel a pszichológiai összefüggések alkalmazására a játékélmény tudatos tervezésében. A tematika a játék fejlődéslélektani alapjaitól (Piaget, Vigotszkij) a motiváció és a flow elméletein át a csoportdinamikáig, a gamificationig és a UX designig terjed. A hallgatók képessé válnak a játékélmény pszichológiai szempontú elemzésére és formálására saját játéktervezői munkájukban.",
          "felelos": "Appelshoffer Péter",
          "prerequisite": "-",
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "játékpszichológia",
            "flow",
            "motiváció",
            "kognitív pszichológia",
            "gamification",
            "csoportdinamika",
            "ux"
          ],
          "cel": "A kurzus célja, hogy a hallgató megismerje a játékélményt alakító pszichológiai folyamatokat, a játék fejlődéslélektani, kognitív és szociálpszichológiai vonatkozásait, valamint a motiváció és a flow jelenségeit. A hallgató a kurzus elvégzése után képes felismerni és elemezni a játékélményt alakító pszichológiai folyamatokat, és ezeket tudatosan alkalmazni saját játéktervezői és kreatív munkájában, multidiszciplináris szakmai környezetben is.",
          "pdfUrl": "/tematikak/12853.pdf",
          "category": [
            "elmélet",
            "játék"
          ],
          "group": null,
          "short": "Fejlődéslélektan (Piaget, Vigotszkij), motiváció, flow, csoportdinamika, gamification és UX a játékélményben."
        }
      ]
    },
    {
      "version": "2026/2027",
      "program": "BA",
      "semester": 4,
      "label": "Média Design BA 2026/2027",
      "courses": [
        {
          "type": "Kötelező",
          "name": "A képalkotás elmélete",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadás a képalkotás alapkérdéseiről, amely a kép fogalmát, működését és a vizuális kultúrában betöltött szerepét vizsgálja. A kurzus a média design gyakorlati tárgyait megalapozó képelméleti és vizuális gondolkodási ismereteket közvetíti. A tárgy kollokviummal zárul.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "képalkotás",
            "képelmélet",
            "vizuális kultúra",
            "médiaelmélet",
            "elmélet",
            "előadás"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "A kép fogalma, működése és szerepe a vizuális kultúrában — képelméleti alapok a design gyakorlathoz."
        },
        {
          "type": "Kötelező és szabváll.",
          "name": "A játéktervezés elmélete",
          "specialization": "Játéktervezés specializáció",
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": 21,
          "groups": "1",
          "instructors": "Liszka Tamás",
          "institute": "AMD",
          "note": null,
          "description": "Az előadássorozat egyetlen kérdésre keres választ: hogyan készül egy jól játszható játék? A válaszhoz a filozófia, a pszichológia, a design, a matematika és a ludológia területein keresztül vezet az út, olyan témákat érintve, mint a játékmechanika, a jutalmazási rendszerek, a learning curve, az elbeszéléstechnika, az immerzió és az interakció. A hallgatók a félév végén saját fejlesztésű játékkoncepciót mutatnak be prezentáció keretében.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "játéktervezés",
            "game design",
            "elmélet",
            "játékmechanika",
            "ludológia",
            "narratíva",
            "immerzió",
            "játékelmélet"
          ],
          "category": [
            "játék",
            "elmélet"
          ],
          "cel": "A kurzus célja a játéktervezés elméletének elsajátítása, hogy a hallgató játéktervezői, alkotói és prezentációs munkájához elméleti megalapozásként és fogalmi kiegészítésként alkalmazhassa. A hallgató képessé válik az elsajátított elméleti ismeretanyagot elemezni és játéktervezői gyakorlatában, szakmai együttműködéseiben és tágabb interdiszciplináris keretben alkalmazni.",
          "pdfUrl": "/tematikak/15031.pdf",
          "group": null,
          "short": "Hogyan készül jól játszható játék? Játékmechanika, jutalmazás, narratíva, immerzió, saját játékkoncepció."
        },
        {
          "type": "Kötelező",
          "name": "Mozgógrafika 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 21,
          "groups": "2",
          "instructors": "Balogh Áron, Kolosy Becse",
          "institute": "AMD",
          "note": null,
          "description": "Két specializációs ágon futó gyakorlati kurzus. A multimédia ágon a hallgatók a Nuke node-alapú compositing munkafolyamatát sajátítják el: rotoscoping, 2D/planar tracking, screen replacement, keying, valamint tűz- és muzzle flash-effektek élethű integrálása, a félév végén breakdown videóval. A játéktervezés ágon a játékfejlesztéshez szükséges 3D asset-gyártás áll fókuszban Blenderrel és Substance Painterrel: modellezés, UV-kiterítés, PBR textúrázás, riggelés és exportálás Unreal Engine-be.",
          "felelos": "Kiss Melinda",
          "prerequisite": "Mozgógrafika 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Nuke",
            "Blender",
            "Substance Painter",
            "Unreal Engine"
          ],
          "keywords": [
            "vfx",
            "nuke",
            "compositing",
            "keying",
            "tracking",
            "rotoscoping",
            "3d asset",
            "substance painter"
          ],
          "cel": "A multimédia specializáción a cél, hogy a hallgatók magabiztosan kezeljék a Nuke szoftvert, és alkalmassá váljanak komplexebb junior compositor feladatok önálló elvégzésére. A játéktervezés specializáción a cél a játékfejlesztéshez szükséges 3D asset-gyártás technikai és művészeti folyamatainak elsajátítása Blender és Substance Painter segítségével.",
          "pdfUrl": "/tematikak/15049.pdf",
          "category": [
            "film/videó",
            "3d",
            "animáció"
          ],
          "group": null,
          "short": "Nuke compositing: roto, tracking, keying, tűzeffektek; vagy game-ready 3D assetek (Blender, Substance)."
        },
        {
          "type": "Kötelező",
          "name": "Hang labor 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 21,
          "groups": "2",
          "instructors": "Kováts Jázon",
          "institute": "AMD",
          "note": null,
          "description": "A Hang labor átfogó bevezetést nyújt a jelenkori média területén elterjedt hangzó technikák alapjaiba, a filmhang készítésének részleteire, a foley művészetre és az utómunka fázisaira fókuszálva. A hallgatók stúdiógyakorlatok keretében sajátítják el a hangstúdió eszközeinek kezelését, a mikrofonozási technikákat és a zörejezést, többek között speechless speech videók hangosításán keresztül. A félév önálló munkák zörejezésével és az elkészült alkotások prezentálásával zárul.",
          "felelos": "Balogh Áron Zsigmond Dr.",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Audition",
            "Ableton Live",
            "Max/MSP",
            "PaulXStretch"
          ],
          "keywords": [
            "filmhang",
            "foley",
            "utómunka",
            "hangvágás",
            "hangdesign",
            "hangstúdió",
            "zörejezés"
          ],
          "cel": "A hallgatók elméleti és gyakorlati síkon ismerkednek meg, a filmhang készítésének részleteivel, mind a foley művészettel , mind pedig az utómunka egyes fázisainak fontosabb kérdéseit tekintve át.",
          "pdfUrl": "/tematikak/15038.pdf",
          "category": [
            "hang"
          ],
          "group": null,
          "short": "Filmhang és foley a stúdióban: mikrofonozás, zörejezés, hangdesign, speechless speech videók hangosítása."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 4. (Média design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": null,
          "groups": "1",
          "instructors": "Balogh Áron",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át workshopok, előadások és meghívott előadók által vezetett projektek formájában. A programok között szerepel a szakmában aktívan dolgozó előadók prezentációja, mesterkurzusok, innovációs és technikai bemutatók, konferencia- és kiállításlátogatás, valamint közös projektek kivitelezése. A teljesítés feltétele a jelenlét és a kijelölt szakmai feladatok határidőre való leadása.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "mesterkurzus",
            "projektmunka",
            "portfólió",
            "ba"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak workshopok, előadások és meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, valamint a MyBrand szemlélet alappilléreinek megvalósítása: a különböző szakterületek találkozása, a tudáselemek egymásra épülése, a kreatív ipari szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/15056.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, meghívott szakmai előadók, kiállításlátogatás és közös projektek kivitelezése."
        },
        {
          "type": "Kötelező",
          "name": "Multimédia design 2.",
          "specialization": "Multimédia specializáció",
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 11,
          "groups": "1",
          "instructors": "Balogh Áron",
          "institute": "AMD",
          "note": null,
          "description": "A hallgatók a hagyományos HTML oldalak építése felől a modern, dinamikus webes alkalmazások irányába mozdulnak el: megismerik a Git alapú verziókezelést, a React és Next.js komponensalapú architektúráját, valamint a Tailwind CSS-alapú reszponzív stílusozást. Kiemelt szerepet kap az AI kódolási asszisztensek (Cursor, GitHub Copilot, Gemini, Claude) és az agent alapú fejlesztés hatékony használata a komponensgenerálásban és a hibakeresésben. A félév végére mindenki egy React Three Fiber 3D elemeket is tartalmazó, Vercelen publikált interaktív portfólió oldalt épít.",
          "felelos": "Kiss Melinda",
          "prerequisite": "Multimédia design 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "React",
            "Next.js",
            "Tailwind CSS",
            "React Three Fiber",
            "Git",
            "Cursor",
            "GitHub Copilot",
            "Vercel"
          ],
          "keywords": [
            "webfejlesztés",
            "react",
            "next.js",
            "tailwind",
            "react three fiber",
            "ai kódolás",
            "prompt engineering",
            "3d web"
          ],
          "cel": "A kurzus célja a modern webfejlesztési technológiák és a mesterséges intelligencia asszisztált kódolás gyakorlati bemutatása. A hallgatók a statikus weblapkészítési tudásukat továbbfejlesztve megismerik a komponensalapú architektúrákat (React, Next.js), a Tailwind CSS-t és a Web3D megoldásokat, és a félév végére önállóan felépítenek egy modern, interaktív portfólió oldalt.",
          "pdfUrl": "/tematikak/15050.pdf",
          "category": [
            "web",
            "fejlesztés",
            "ai"
          ],
          "group": null,
          "short": "React, Next.js, Tailwind és AI-asszisztált kódolás: publikált interaktív 3D portfólió oldal (R3F, Vercel)."
        },
        {
          "type": "Kötelező",
          "name": "3D labor (Multimédia) 2.",
          "specialization": "Multimédia specializáció",
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 11,
          "groups": "1",
          "instructors": "Berkes Bálint",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a 3D terek immerzív rétegeit mélyíti el a mozgás beemelésével: a hallgatók az első félévi Blender-alapok után a Cinema 4D-ben ismerkednek meg a motion design, a CGI és a VFX világával. A tematika az animálás 12 alaptörvényétől a Mograph rendszeren, a karaktercsontozáson és a Rokoko motion capture használatán át a fizikai, ruha- és részecskeszimulációkig terjed, a félév végén Unreal Engine-es valós idejű rendereléssel. Az egyéni projektfeladat egy folytatólagos animáció, amely a csoport közös történetébe illeszkedik.",
          "felelos": "Balogh Áron Zsigmond Dr.",
          "prerequisite": "3D labor (Multimédia) 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Cinema 4D",
            "Rokoko",
            "Unreal Engine"
          ],
          "keywords": [
            "cinema 4d",
            "3d",
            "motion design",
            "motion capture",
            "szimuláció",
            "mograph",
            "unreal engine",
            "animáció"
          ],
          "cel": "A kurzus célja a média designon belül a multimédia-specifikus képalkotás eszközismereti, alkotói és művészi tudásának elsajátítása középhaladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni, alkalmazni és prezentálni a multimédia-specifikus képalkotás ismeretanyagát, technikai tudását és prezentációs eljárásait.",
          "pdfUrl": "/tematikak/15030.pdf",
          "category": [
            "3d",
            "animáció"
          ],
          "group": null,
          "short": "Cinema 4D motion design: Mograph, karaktercsontozás, Rokoko mocap, fizikai és ruha-szimuláció, Unreal render."
        },
        {
          "type": "Kötelező",
          "name": "Game Art és Design 2.",
          "specialization": "Játéktervezés specializáció",
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 10,
          "groups": "1",
          "instructors": "Pápai Bence",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a videojátékot mint interaktív médiumot vizsgálja, ahol a tartalom, a vizuális megjelenés és az interakció egységben határozzák meg az élményt, különös tekintettel a game art és a game design kapcsolatára. A félév a játékprototipizálásra épül: paper prototyping, core mechanics tesztelése, level design alapok, UI/UX wireframe-ek, playtesting és vertical slice készítése. A hallgatók a korábbi félév társasjáték-projektjét adaptálják digitális környezetbe, és egy játszható, placeholder assetekre épülő videójáték-prototípust készítenek.",
          "felelos": "Balogh Áron Zsigmond Dr.",
          "prerequisite": "Game Art és Design 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Unity"
          ],
          "keywords": [
            "videojáték",
            "game design",
            "game art",
            "prototípus",
            "playtesting",
            "level design",
            "játékmechanika"
          ],
          "cel": "A tantárgy célja, hogy a hallgatók elmélyítsék ismereteiket a videojáték mint interaktív médium működéséről, és a vizuális, tartalmi és interakciós döntések összefüggéseit megértve olyan koncepciókat és struktúrákat alakítsanak ki, amelyek közvetlenül alkalmazhatók a játéktervezési és -fejlesztési folyamatokban.",
          "pdfUrl": "/tematikak/14800.pdf",
          "category": [
            "játék",
            "ux/interakció"
          ],
          "group": null,
          "short": "Játékprototípus Unityben: paper prototyping, core mechanics, level design, playtesting, vertical slice."
        },
        {
          "type": "Kötelező",
          "name": "3D labor (Játéktervezés) 2.",
          "specialization": "Játéktervezés specializáció",
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 10,
          "groups": "1",
          "instructors": "Gerő András",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a valós idejű játékmotoros fejlesztés objektumorientált és komponensalapú gondolkodását alkalmazza a gyakorlatban Unreal Engine környezetben. A hallgatók végigjárják a 3D workflow-t a level design blockouttól az UV-kon, textúrákon és material node-okon át a világításig, a post processig, a kamerakezelésig és a Level Sequence alapú renderelésig. A félév egy önálló projekttel zárul: hangulatos jelenet vagy dioráma készül professzionálisan komponált videórenderekkel.",
          "felelos": "Balogh Áron Zsigmond Dr.",
          "prerequisite": "3D labor (Játéktervezés) 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Unreal Engine",
            "Blender",
            "Photoshop"
          ],
          "keywords": [
            "unreal engine",
            "real-time",
            "blueprint",
            "level design",
            "material",
            "világítás",
            "játékmotor",
            "3d"
          ],
          "cel": "A tantárgy célja a hallgatók bevezetése a 3D digitális tartalomkészítés gyakorlati alapjaiba valós idejű engine környezetben, hogy képesek legyenek egyszerű, működő real-time jelenetek és prototípusok létrehozására, és tudatosan kezeljék a 3D tartalom és az interaktív működés kapcsolatát a játékfejlesztési folyamaton belül.",
          "pdfUrl": "/tematikak/14786.pdf",
          "category": [
            "3d",
            "játék"
          ],
          "group": null,
          "short": "Unreal Engine workflow: level design blockout, materialok, világítás, post process, Level Sequence render."
        }
      ]
    },
    {
      "version": "2026/2027",
      "program": "BA",
      "semester": 5,
      "label": "Média Design BA 2026/2027",
      "courses": [
        {
          "type": "Kötelező",
          "name": "Ökológia és művészet",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadás, amely az ökológiai gondolkodás és a művészet kapcsolatát vizsgálja. A kurzus azt tárgyalja, hogyan reflektál a kortárs művészet a környezeti kérdésekre, a fenntarthatóságra, valamint az ember és a természet viszonyára.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "ökológia",
            "fenntarthatóság",
            "kortárs művészet",
            "környezettudatosság",
            "művészetelmélet",
            "természet"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Ökológiai gondolkodás a kortárs művészetben: fenntarthatóság, ember–természet viszony."
        },
        {
          "type": "Kötelező",
          "name": "Gazdasági, menedzsment és jogi ismeretek",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadás, amely a kreatív ipari pályához szükséges gazdasági, menedzsment- és jogi alapismereteket adja át. A hallgatók megismerkednek a szakmai működésüket érintő gazdasági és jogi keretekkel, hogy tervezői munkájukat üzleti és jogi szempontból is tudatosan tudják végezni.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "gazdaság",
            "menedzsment",
            "jog",
            "vállalkozás",
            "kreatív ipar",
            "szerzői jog"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Kreatív ipari alapok: vállalkozás, menedzsment, szerzői jog — a tervezői munka gazdasági és jogi keretei."
        },
        {
          "type": "Kötelező",
          "name": "Prezentációs módszerek",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 4,
          "active": 21,
          "groups": "2",
          "instructors": "Molnár Ágnes",
          "institute": "AMD",
          "note": null,
          "description": "Gyakorlati kurzus, amely a hallgatók prezentációs készségeit fejleszti. A hallgatók a szakmai munkák, koncepciók és portfóliók hatékony bemutatásának módszereit, valamint a vizuális és verbális előadásmód eszközeit gyakorolják.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "prezentáció",
            "előadástechnika",
            "kommunikáció",
            "portfólió",
            "bemutatás",
            "vizuális kommunikáció"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Szakmai munkák, koncepciók és portfóliók hatásos bemutatása: vizuális és verbális előadástechnika gyakorlása."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 5. (Média design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": 21,
          "groups": "1",
          "instructors": "Szacsvai Pál",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatanterven túlmutató szakmai tudást közvetít workshopok, előadások és meghívott vendégelőadók által vezetett projektek formájában. A programok között szerepelnek a szakmában aktívan dolgozó előadók prezentációi, mesterkurzusok, innovációs és technikai bemutató előadások, konferencia- és kiállításlátogatások, valamint közös projektek kivitelezése. A teljesítés feltétele a jelenlét és a kijelölt szakmai feladatok határidőre való leadása.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "mesterkurzus",
            "projektmunka",
            "kreatív ipar",
            "portfólió",
            "ba"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak workshopok, előadások és meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, a kreatív iparban használatos szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/12747.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, vendégelőadók, kiállításlátogatás, közös projektek."
        },
        {
          "type": "Kötelező",
          "name": "Média labor 1.",
          "specialization": "Multimédia specializáció",
          "courseType": "gyakorlat",
          "hours": 6,
          "credits": 7,
          "active": 11,
          "groups": "1",
          "instructors": "Berkes Bálint",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a formák és anyagok térbeli vizuális megjelenésének és viselkedésének megismerésére, valamint azok szoftveres reprodukálására és szimulálására épül. A hallgatók a Blenderben sajátítják el a 3D munkafolyamat alapjait: modellezés, textúrázás (UV mapping, shader setup), világítás, kamerakezelés és renderelés (PBR workflow). A félév során egy választott hétköznapi eszköz lemodellezésével és koncepció szerinti képsorozat készítésével egyéni portfólióelemet hoznak létre.",
          "felelos": "Mayer Éva",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Blender"
          ],
          "keywords": [
            "3d",
            "blender",
            "modellezés",
            "textúrázás",
            "világítás",
            "renderelés",
            "képalkotás",
            "médiadesign"
          ],
          "cel": "A kurzus célja a média design specifikus képalkotás eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai) elsajátítása középhaladó szinten. A hallgató a kurzus elvégzésével képes haladó szinten felismerni, elemezni, érteni, alkalmazni és prezentálni a média design specifikus képalkotás ismeretanyagát és technikai tudását.",
          "pdfUrl": "/tematikak/10460.pdf",
          "category": [
            "3d"
          ],
          "group": null,
          "short": "Blender 3D alapok: modellezés, UV-textúrázás, világítás, PBR render; féléves tárgymodell és képsorozat."
        },
        {
          "type": "Kötelező",
          "name": "Multimédia design 3.",
          "specialization": "Multimédia specializáció",
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 11,
          "groups": "1",
          "instructors": "Kaiser Péter",
          "institute": "AMD",
          "note": null,
          "description": "A Multimédia design tárgysorozat harmadik kurzusa, a multimédia specializáció gyakorlati törzstárgya. Az előző félévekben megszerzett webes és interaktív médiatervezési ismeretekre építve a hallgatók összetettebb digitális projekteken keresztül mélyítik el tervezői és kivitelezői tudásukat.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "gyakorlati jegy",
          "software": [
            "HTML",
            "CSS",
            "Figma",
            "Penpot"
          ],
          "keywords": [
            "multimédia",
            "webdesign",
            "webfejlesztés",
            "interaktív média",
            "digitális tervezés",
            "portfólió"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "web",
            "fejlesztés"
          ],
          "group": null,
          "short": "Összetett webes és interaktív projektek tervezése és kivitelezése (HTML, CSS, Figma, Penpot)."
        },
        {
          "type": "Kötelező",
          "name": "Game Art és Design 3.",
          "specialization": "Játéktervezés specializáció",
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 10,
          "groups": "1",
          "instructors": "Pálfi Szabolcs, Kolosy Becse",
          "institute": "AMD",
          "note": null,
          "description": "A Game Art és Design tárgysorozat harmadik kurzusa a játéktervezés specializáción. Az előző félévek koncepciótervezési és prototipizálási ismereteire építve a hallgatók a videojáték mint interaktív médium vizuális és tervezési rendszereivel foglalkoznak, és a game art, a játékmenet és az interakció összefüggéseit projektmunkában alkalmazzák a játékmotoros fejlesztés irányába továbblépve.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "gyakorlati jegy",
          "software": [
            "Unity"
          ],
          "keywords": [
            "játéktervezés",
            "game art",
            "game design",
            "játékfejlesztés",
            "prototípus",
            "játékmechanika"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "játék",
            "2d"
          ],
          "group": null,
          "short": "Game art, játékmenet és interakció összefüggései projektmunkában, Unity játékmotoros fejlesztés felé lépve."
        },
        {
          "type": "Kötelező",
          "name": "Game labor 1.",
          "specialization": "Játéktervezés specializáció",
          "courseType": "gyakorlat",
          "hours": 6,
          "credits": 7,
          "active": 10,
          "groups": "1",
          "instructors": "Gerő András",
          "institute": "AMD",
          "note": null,
          "description": "Gyakorlati laborkurzus a játéktervezés specializáció hallgatói számára. A magas heti óraszámú műhelymunka során a hallgatók a játékfejlesztés eszközeit és munkafolyamatait sajátítják el gyakorlati feladatokon keresztül, saját játékprojektek építésével.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "gyakorlati jegy",
          "software": [
            "Unity"
          ],
          "keywords": [
            "játékfejlesztés",
            "játékmotor",
            "labor",
            "prototípus",
            "játéktervezés",
            "gyakorlat"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "játék"
          ],
          "group": null,
          "short": "Játékfejlesztési műhelymunka Unityben: eszközök, munkafolyamatok, saját játékprojektek építése."
        }
      ]
    },
    {
      "version": "2026/2027",
      "program": "BA",
      "semester": 6,
      "label": "Média Design BA 2026/2027",
      "courses": [
        {
          "type": "Kötelező",
          "name": "Interaktív grafika",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 26,
          "groups": "3",
          "instructors": "Berkes Bálint",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a fény médiumának kreatív, interdiszciplináris alkalmazására összpontosít, különös tekintettel a vetítéses technikákra (projection mapping) és a generatív, valós idejű vizualizációra. A hallgatók TouchDesigner, Unreal Engine és Cinema 4D segítségével hang- és mozgásreaktív vizuálokat, interaktív installációkat készítenek, és megismerik a DMX, Art-Net, OSC és MIDI rendszereket. A félév során egy fiktív megrendelő számára csoportos vetítést terveznek a Budapesti Metropolitan Egyetem körépületére, amelyet kiállítás keretében mutatnak be.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "TouchDesigner",
            "Unreal Engine",
            "Cinema 4D",
            "After Effects"
          ],
          "keywords": [
            "unreal engine",
            "touchdesigner",
            "valós idejű",
            "vetítés",
            "interaktív",
            "fénytérképezés",
            "generatív vizualizáció",
            "fényművészet"
          ],
          "cel": "A kurzus célja, hogy a hallgatók valós munkaszituációkhoz hasonló környezetben sajátítsák el a vetítéses technikák alkalmazását, a kreatív döntéshozatalt és a csapatmunkát. Egy fiktív megrendelő igényei alapján kell vetítésterveket készíteniük egy valós helyszínre, miközben rugalmasan alkalmazkodnak a fokozatosan megismert követelményekhez és technikai megkötésekhez.",
          "pdfUrl": "/tematikak/15040.pdf",
          "category": [
            "installáció",
            "ux/interakció",
            "3d"
          ],
          "group": null,
          "short": "Projection mapping és valós idejű generatív vizuálok: TouchDesigner, Unreal Engine, DMX; közös épületvetítés."
        },
        {
          "type": "Kötelező",
          "name": "Média design stúdiumok 6.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 26,
          "groups": "3",
          "instructors": "Pálfi Szabolcs",
          "institute": "AMD",
          "note": null,
          "description": "Az előző félév technikai ismereteire építve a kurzus a videojáték-tervezés strukturális és komplex folyamatát, valamint a kapcsolódó szakágakat vizsgálja egyéni és kifejezetten csoportos munkában. A hallgatók saját játékötletet fejlesztenek, amelyben a narratíva, a tér- és karaktertervezés gyakorlati alkalmazása kap hangsúlyt. A félév során esettanulmányokat és prezentációkat készítenek, meghívott előadó és stúdiólátogatás is szerepel a tananyagban, a tervezésmódszertan pedig a diplomára való felkészülést alapozza meg.",
          "felelos": "Molnár Ágnes Éva",
          "prerequisite": "Média design stúdiumok 5.",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "videojáték",
            "játéktervezés",
            "médiadesign",
            "narratíva",
            "csoportmunka",
            "prototípus",
            "játékfejlesztés"
          ],
          "cel": "A tantárgy célja a hallgatók bevezetése a számítógépes játékfejlesztés világába a játéktervezés elméleti alapjainak elsajátításán és gyakorlati hasznosításán keresztül: a játékfejlesztői workflow, a népszerűbb játékzsánerek, a fejlesztői eszközök és a tervezési folyamatok megismerése.",
          "pdfUrl": "/tematikak/15046.pdf",
          "category": [
            "játék",
            "projekt"
          ],
          "group": null,
          "short": "Videojáték-tervezés csoportban: saját játékötlet, narratíva, tér- és karaktertervezés, esettanulmányok."
        },
        {
          "type": "Kötelező",
          "name": "Új média kritikai stúdiumok",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": 26,
          "groups": "1",
          "instructors": "Szacsvai Pál",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus az újmédia elméletének folyamatosan megújuló irodalmát követi, ismerteti és értelmezi. A foglalkozásokon a hallgatók aktív reflexióira építő eszmecsere folyik, amely az olvasott szövegekből inspirált elméleti perspektívából elemzi kritikailag a technológiai innováció fordulatait. A témák között szerepel a gépi kreativitás, a mesterségesen intelligens művészet, az algoritmus szerepe a művészetben és a digitális jövő kérdései.",
          "felelos": "Mayer Éva",
          "prerequisite": "-",
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "új média",
            "kritikai elmélet",
            "médiaelmélet",
            "mesterséges intelligencia",
            "algoritmus",
            "gépi alkotás",
            "elmélet"
          ],
          "cel": "A kurzus célja, hogy a hallgatók megismerkedjenek az új médiumok kritikai elméletével, annak érdekében, hogy azt elméleti alapként és koncepcionális kiegészítésként alkalmazhassák médiatervezési tanulmányaik és gyakorlataik, valamint művészi munkájuk és prezentációs feladataik során.",
          "pdfUrl": "/tematikak/15054.pdf",
          "category": [
            "elmélet",
            "ai"
          ],
          "group": null,
          "short": "Újmédia-elmélet szövegolvasással: gépi kreativitás, AI-művészet, algoritmus, a digitális jövő kérdései."
        },
        {
          "type": "Kötelező",
          "name": "Szakdolgozat készítése (Média design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 2,
          "active": 26,
          "groups": "3",
          "instructors": "Kollár Dávid",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a szakdolgozat és általában a tudományos írásmű elkészítésének teljes folyamatát fedi le: anyaggyűjtés, forrásfeldolgozás, hivatkozási formák, a szöveg struktúrájának kialakítása és a tanulmány megírása. A hallgatók a félév során a saját szakdolgozati témájukhoz kapcsolódóan gyakorolják a forrásgyűjtést, a tartalomjegyzék-készítést és a kutatásmódszertant, szó esik a szakszövegírás és az AI viszonyáról is. Az értékelés az órai és otthoni feladatok, valamint a félév végi beadandó dolgozat alapján történik.",
          "felelos": "Mayer Éva",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "szakdolgozat",
            "kutatás",
            "írás",
            "forrásfeldolgozás",
            "hivatkozás",
            "kutatásmódszertan",
            "ba"
          ],
          "cel": "A kurzus célja a szakdolgozat készítéséhez szükséges elméleti és gyakorlati tudás és képességek elsajátítása, hogy a hallgató megfelelő színvonalú írásművet legyen képes alkotni a BA tanulmányait lezáró időszakban. A kurzus elvégzése eredményeképpen a hallgató képes haladó szinten felismerni, elemezni, érteni és értekező prózai szinten gyakorlatban alkalmazni az elsajátított elméleti ismeretanyagot, és szakdolgozata által szakmai tudását a megfelelő szakmai fórumokon érdemben képviselni.",
          "pdfUrl": "/tematikak/15055.pdf",
          "category": [
            "diploma/portfólió",
            "elmélet"
          ],
          "group": null,
          "short": "Forrásgyűjtés, hivatkozás, szövegstruktúra és kutatásmódszertan a saját szakdolgozati témára alkalmazva."
        },
        {
          "type": "Kötelező",
          "name": "Diplomatervezési feladat (Média design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 6,
          "credits": 8,
          "active": 26,
          "groups": "3",
          "instructors": "Forgács Kristóf, Nikázy Gusztáv",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a diplomamunka elkészítését támogatja két blokkban. Az egyik blokkban a hallgatók a diplomamunkához kapcsolódó önálló online médiaterméket terveznek és fejlesztenek: Figma/Penpot prototípust készítenek, majd dokumentum- és stílusleíró nyelvekkel működő prototípus szintjén valósítják meg, a hagyományos UX/UI keretek kitágításával. A másik blokk a diploma projektszerű kezelésére (ütemezés, mérföldkövek), a diplomaprezentáció gyakorlására, valamint a portfólió és showreel összeállítására készíti fel a végzős hallgatókat.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Figma",
            "Penpot",
            "HTML",
            "CSS"
          ],
          "keywords": [
            "diploma",
            "figma",
            "portfólió",
            "showreel",
            "prototípus",
            "webdesign",
            "projekttervezés",
            "prezentáció"
          ],
          "cel": "A kurzus célja a diplomamunkához szükséges eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai) ismeretek elsajátítása, kreatív készségek kifejlesztése, prezentációs és médiatervezési tudás megszerzése. A hallgató a kurzus végére képes felismerni, elemezni, érteni és alkalmazni a diplomamunkája elkészítéséhez elengedhetetlen ismeretanyagot, technikai tudást és prezentációs eljárásokat, valamint értékelni saját pozícióját és eredményeit a kreatív iparban és a médiaművészeti szcénában.",
          "pdfUrl": "/tematikak/15036.pdf",
          "category": [
            "diploma/portfólió",
            "web",
            "ux/interakció"
          ],
          "group": null,
          "short": "Diplomához kapcsolódó online médiatermék (Figma/Penpot, HTML/CSS) + projektterv, portfólió és showreel."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 6. (Média design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": null,
          "groups": "1",
          "instructors": "Pálfi Szabolcs",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át workshopok, előadások és meghívott előadók által vezetett projektek formájában. A programok között a szakmában aktívan dolgozó előadók prezentációi, mesterkurzusok, innovációs és technikai bemutató előadások, konferencia- és kiállításlátogatások, valamint közös projektek kivitelezése szerepel. A teljesítés feltétele a jelenlét és a kijelölt szakmai feladatok határidőre való leadása.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "mesterkurzus",
            "projektmunka",
            "portfólió",
            "ba"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak workshopok, előadások és meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, valamint a MyBrand szemlélet alappillérei: a különböző szakterületek találkozása, a kreatív iparban használatos szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/15058.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, meghívott szakemberek előadásai, kiállításlátogatás és közös projektek."
        }
      ]
    },
    {
      "version": "2026/2027",
      "program": "MA",
      "semester": 1,
      "label": "Média Design MA 2026/2027",
      "courses": [
        {
          "type": "Kötelező",
          "name": "3D tervezés és szimuláció 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 14,
          "groups": "2",
          "instructors": "Kaiser Péter",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a 3D-s tervezés alapjait ismerteti meg az Autodesk Maya szoftver segítségével, gyakorlati feladatokon keresztül. A hallgatók a virtuális térben létrehozott helyszínekkel dolgoznak: polygon modellezés, UV-zás és textúrázás, világítás, kameramozgatás, valamint Arnold renderelés, layer- és pass-alapú render (AOV-k). Emellett a virtuális tér szimulációs eszközeivel is megismerkednek: szilárd test, fény, folyadék, haj és ruha szimuláció, illetve egyszerűbb hierarchikus mozgó rendszerek. A félév végére egy 1280x720 méretű renderelt animáció készül el.",
          "felelos": "Balogh Áron Zsigmond Dr.",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Maya",
            "Arnold"
          ],
          "keywords": [
            "3d modellezés",
            "szimuláció",
            "maya",
            "textúrázás",
            "render",
            "világítás",
            "arnold",
            "uv"
          ],
          "cel": "A kurzus célja a 3D modellezés és szimuláció eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai) elsajátítása haladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni és felhasználni, valamint prezentálni a 3D modellezés és szimuláció területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/12453.pdf",
          "category": [
            "3d"
          ],
          "group": null,
          "short": "Maya: polygon modellezés, UV, textúrázás, világítás, Arnold render, AOV-k; félév végi renderelt animáció."
        },
        {
          "type": "Kötelező",
          "name": "Interaktív rendszerek 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 14,
          "groups": "2",
          "instructors": "Varga Vajk, Polena Réka",
          "institute": "AMD",
          "note": null,
          "description": "A szemeszter során a hallgatók egyszerű interaktív rendszerek tervezéséhez szükséges tudást sajátítanak el gyakorlati feladatokon keresztül: alapvető elektronikai ismereteket, mikrokontrollerekkel építhető interaktív architektúrákat, valamint a TouchDesigner szoftver és a Microsoft Kinect használatát és ezek kombinációit. Szó esik az audio-reaktív vizuálokról, a VJ-zés alapjairól, a DMX vezérlésről és az adatvizualizációról is. A félév végére a hallgatók saját multimédiás, interaktív installáció terveit készítik el és prezentálják.",
          "felelos": "Sterk Barbara DLA",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "TouchDesigner",
            "Arduino",
            "Kinect"
          ],
          "keywords": [
            "mikrokontroller",
            "elektronika",
            "touchdesigner",
            "interaktív installáció",
            "arduino",
            "kinect",
            "vj-zés",
            "adatvizualizáció"
          ],
          "cel": "A kurzus célja alapvető elektronikai ismeretek elsajátítása, a mikrokontrollerek használatának megértése és a velük kapcsolatos gyakorlati tudás megszerzése, valamint ezek alkalmazása különböző ipari és képzőművészeti területeken. A hallgató a kurzus elvégzése után képes haladó szinten létrehozni analóg és szoftveres eszközökkel vezérelhető interaktív elektronikai rendszereket, és gyakorlati tudást szerez az interaktív installációk megvalósítási lehetőségeinek különböző metódusairól.",
          "pdfUrl": "/tematikak/12466.pdf",
          "category": [
            "ux/interakció",
            "installáció",
            "fejlesztés"
          ],
          "group": null,
          "short": "Elektronika, Arduino, TouchDesigner, Kinect, DMX: audio-reaktív vizuálok és saját interaktív installáció."
        },
        {
          "type": "Kötelező",
          "name": "Kortárs művészetelmélet",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadás, amely a kortárs művészet elméleti kérdéseivel, irányzataival és diskurzusaival foglalkozik. A kurzus a média design mesterképzés elméleti megalapozását szolgálja, segítve a hallgatókat abban, hogy saját alkotói gyakorlatukat a kortárs művészet kontextusában értelmezzék. A tárgy kollokviummal zárul.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "kortárs művészet",
            "művészetelmélet",
            "esztétika",
            "kritikai gondolkodás",
            "elmélet",
            "műelemzés"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Kortárs művészeti irányzatok és diskurzusok: elméleti keret a saját alkotói gyakorlat értelmezéséhez."
        },
        {
          "type": "Kötelező és szabváll.",
          "name": "Kommunikációs rendszerek és vizuális nyelvek",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": 14,
          "groups": "1",
          "instructors": "Kollár Dávid",
          "institute": "ELM",
          "note": "szab.váll. létszám: összesen",
          "description": "Az előadás a kommunikációs rendszerek és vizuális nyelvek elméleti és gyakorlati dimenzióit vizsgálja kritikai módon, kortárs kommunikációtudományi, filozófiai és szociológiai perspektívákból. Témái között szerepel a nyelv előtti kommunikáció és humánetológia, a nonverbális kommunikáció, a vizuális kultúra és képfilozófia, a digitális kommunikáció és hálózatelméletek, a közösségi média algoritmusos kommunikációja, a filmnyelvi eszközök, valamint az AI és a poszthumán kommunikáció. A hallgatók képessé válnak médiadesign-munkájukat elméleti keretekben kontextualizálni.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "-",
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "vizuális nyelv",
            "kommunikáció",
            "elmélet",
            "jelrendszer",
            "vizuális kultúra",
            "médiaelmélet",
            "hálózatelmélet"
          ],
          "cel": "A kurzus célja a kommunikációs rendszerek és vizuális nyelvek elméleti területének ismertetése, hogy a hallgató média designeri, alkotó-, tervező- és művészi, valamint prezentációs munkájához elméleti megalapozásként és fogalmi kiegészítésként alkalmazhassa. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni és alkalmazni az elsajátított elméleti ismeretanyagot tanulmányai és gyakorlata megalapozásához, művészi és tervezői gyakorlatának konceptualizálásához és szakmai együttműködései során való képviseletéhez.",
          "pdfUrl": "/tematikak/12468.pdf",
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Humánetológia, képfilozófia, hálózatelméletek, filmnyelv, AI, poszthumán média."
        },
        {
          "type": "Kötelező",
          "name": "Médiakultúra",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadás, amely a médiakultúra jelenségeivel, a média és a kultúra kölcsönhatásaival foglalkozik a média design mesterképzés elméleti megalapozásaként. A tárgy segíti a hallgatókat abban, hogy a médiajelenségeket tágabb kulturális és társadalmi összefüggésekben értelmezzék. A kurzus kollokviummal zárul.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "médiakultúra",
            "médiaelmélet",
            "kultúra",
            "média",
            "elmélet",
            "társadalom"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Média és kultúra kölcsönhatásai: médiajelenségek társadalmi, kulturális összefüggésekben, elméleti alapozás."
        },
        {
          "type": "Kötelező",
          "name": "Médiatervezés 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 6,
          "credits": 7,
          "active": 14,
          "groups": "2",
          "instructors": "Gerő András, Kolosy Becse, Pálfi Szabolcs",
          "institute": "AMD",
          "note": null,
          "description": "Két modulból álló gyakorlati kurzus. Az A modulban a hallgatók az Adobe After Effects ismereteiket mélyítik el egy féléven átívelő feladattal: egy szabadon választott filmhez alternatív főcímet terveznek, amelyhez képes forgatókönyvet és látványterveket készítenek, a képi alapanyagot Photoshopban vagy Illustratorban hozzák létre, majd After Effectsben animálják. A B modulban tervezésmódszertani gyakorlatok és művészeti kutatás (artistic research) után egy fiktív karakter social media oldalát alkotják meg, releváns és eredeti posztokkal.",
          "felelos": "Molnár Ágnes Éva",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "After Effects",
            "Photoshop",
            "Illustrator"
          ],
          "keywords": [
            "médiatervezés",
            "after effects",
            "főcímtervezés",
            "mozgógrafika",
            "storyboard",
            "social media",
            "művészeti kutatás",
            "tervezésmódszertan"
          ],
          "cel": "A kurzus célja a médiatervezés eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai szemléleti) elsajátítása haladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni és felhasználni, valamint prezentálni a médiatervezés területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/12773.pdf",
          "category": [
            "animáció",
            "2d",
            "projekt"
          ],
          "group": null,
          "short": "Alternatív filmfőcím After Effectsben (storyboard, látványterv) + fiktív karakter social media oldala."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 1. (Média design MA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": 14,
          "groups": null,
          "instructors": "Balogh Áron",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át workshopok, előadások és meghívott előadók által vezetett projektek formájában. A programok között szerepel a szakmában aktívan dolgozó előadók prezentációja, mesterkurzusok, innovációs és technikai bemutató előadások, konferenciarészvétel, kiállításlátogatás és közös projektek kivitelezése. A teljesítés feltétele a jelenlét és a kijelölt szakmai feladatok határidőre való leadása.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "mesterkurzus",
            "konferencia",
            "portfólió",
            "mesterképzés"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak workshopok, előadások és meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, valamint a MyBrand szemlélet alappilléreinek megvalósítása: különböző szakterületek találkozása, tudás- és kompetenciaelemek egymásra épülése, a kreatív iparban használatos szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/12744.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, meghívott előadók, konferencia- és kiállításlátogatás, közös projektek."
        },
        {
          "type": "Kötelező",
          "name": "Egalizáló tárgy 1. (Média design stúdiumok 1.)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": "1",
          "instructors": "Balogh Áron",
          "institute": "AMD",
          "note": "Balogh Áron (1x2) Tóth Norbert (1x2)",
          "description": "Felzárkóztató kurzus, amelynek során a hallgatók megismerkednek a médiaművészet és médiadesign alapjaival: képszerkesztéssel (Photoshop), vektorgrafikával (Illustrator), kézi rajzzal, fotózással, videóvágással és fényeléssel (Premiere Pro, After Effects), programozással (C# és Arduino), valamint 3D modellezéssel (Blender). A kurzus elméleti és gyakorlati készségeket egyaránt fejleszt, a feladatokból a hallgatók egyéni portfóliót építenek. Értékelése: megfelelt / nem felelt meg.",
          "felelos": "Balogh Áron Zsigmond Dr.",
          "prerequisite": "-",
          "requirement": "megfelelt / nem felelt meg",
          "software": [
            "Photoshop",
            "Illustrator",
            "Premiere Pro",
            "After Effects",
            "Arduino",
            "Blender",
            "C#"
          ],
          "keywords": [
            "felzárkóztató",
            "képszerkesztés",
            "vektorgrafika",
            "videóvágás",
            "programozás",
            "3d modellezés",
            "fotózás",
            "kézi rajz"
          ],
          "cel": "A tárgy célja, hogy a különböző szakokról érkező hallgatókat technikailag felzárkóztassa a médiadesign alapképzésének szintjére.",
          "pdfUrl": "/tematikak/12510.pdf",
          "category": [
            "2d",
            "3d",
            "fejlesztés"
          ],
          "group": null,
          "short": "Felzárkóztató: Photoshop, Illustrator, kézi rajz, fotó, Premiere-vágás, C#/Arduino, Blender 3D alapok."
        }
      ]
    },
    {
      "version": "2026/2027",
      "program": "MA",
      "semester": 2,
      "label": "Média Design MA 2026/2027",
      "courses": [
        {
          "type": "Kötelező",
          "name": "Kritikai kultúrakutatás",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadás, amely a kritikai kultúrakutatás szemléletmódjába és fogalomkészletébe vezeti be a mesterszakos hallgatókat. A kurzus a kortárs kultúra és média jelenségeinek kritikai, társadalomtudományi elemzéséhez ad eszközöket, támogatva a hallgatók önálló alkotói és kutatói reflexióját.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "kritikai elmélet",
            "kultúrakutatás",
            "médiaelmélet",
            "társadalomtudomány",
            "kortárs kultúra",
            "elemzés"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Kortárs kultúra és média kritikai, társadalomtudományi elemzése; fogalomkészlet az alkotói reflexióhoz."
        },
        {
          "type": "Kötelező",
          "name": "Környezetpszichológia kortárs kérdésfeltevései",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadás, amely a környezetpszichológia kortárs kérdésfeltevéseit tekinti át: az ember és az őt körülvevő fizikai, épített és mediatizált környezet kölcsönhatásait vizsgálja. A kurzus pszichológiai szempontokat ad a tervezői gondolkodáshoz, segítve a terek és környezetek emberközpontú értelmezését.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "környezetpszichológia",
            "épített környezet",
            "észlelés",
            "pszichológia",
            "tér",
            "kortárs kérdések"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Ember és épített, mediatizált környezet kölcsönhatásai; pszichológiai szempontok a tervezői gondolkodáshoz."
        },
        {
          "type": "Kötelező",
          "name": "Integrált társművészeti gyakorlat",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "AMD",
          "note": null,
          "description": "Gyakorlati kurzus, amelyben a hallgatók különböző művészeti ágak képviselőivel együttműködve, interdiszciplináris alkotói folyamatban dolgoznak. A tárgy a társművészeti területek szemléletének és munkamódszereinek integrálását gyakoroltatja közös projektmunka keretében.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "társművészetek",
            "interdiszciplináris",
            "együttműködés",
            "alkotói gyakorlat",
            "integrált projekt",
            "média design"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Interdiszciplináris projektmunka más művészeti ágak képviselőivel: közös alkotói folyamat és módszertan."
        },
        {
          "type": "Kötelező",
          "name": "Médiatervezés 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 6,
          "credits": 7,
          "active": 16,
          "groups": "2",
          "instructors": "Kolosy Becse, Madácsi Blanka",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a videójáték-fejlesztés teljes vizuális pipeline-ját fedi le két egymásra épülő blokkban: az egyikben a hallgatók Maya és Substance Painter használatával game-ready 3D asseteket, karaktereket és animációkat készítenek (modellezés, UV, PBR textúrázás, rigging, keyframe és Rokoko motion capture workflow), a másikban ezeket Unreal Engine-ben integrálják. A félév végére blueprint-alapú interakciókkal működő demo játékot és portfólióba illeszthető assetcsomagot hoznak létre.",
          "felelos": "Molnár Ágnes Éva",
          "prerequisite": "Médiatervezés 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Maya",
            "Substance Painter",
            "Unreal Engine",
            "Rokoko"
          ],
          "keywords": [
            "videójáték-fejlesztés",
            "game asset",
            "unreal engine",
            "substance painter",
            "maya",
            "motion capture",
            "pbr",
            "blueprint"
          ],
          "cel": "A tantárgy célja, hogy a hallgatók mesterképzéshez illeszkedő, haladó szintű ismereteket szerezzenek a videójáték-fejlesztés teljes vizuális pipeline-járól, különös tekintettel a valós idejű megjelenítésre optimalizált 3D assetek, karakterek és animációk létrehozására, valamint azok játékmotorban történő alkalmazására.",
          "pdfUrl": "/tematikak/15048.pdf",
          "category": [
            "3d",
            "játék",
            "animáció"
          ],
          "group": null,
          "short": "Game-ready 3D assetek, karakterek, mocap (Maya, Substance Painter), majd demo játék Unreal blueprintekkel."
        },
        {
          "type": "Kötelező",
          "name": "3D tervezés és szimuláció 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 16,
          "groups": "2",
          "instructors": "Tóth Gergő",
          "institute": "AMD",
          "note": null,
          "description": "A félév során a hallgatók a game-ready assetek készítését és a 3D szoftverek, valamint az Unreal Engine közötti átjárhatóságot tanulják: nCloth-, részecske- és folyadékszimulációkat exportálnak, növényzettel népesítenek be terepeket a MASH Network segítségével, és renderelési optimalizációs technikákat alkalmaznak (Arnold stand-in, AOV-k). A kurzus zárásaként élettel benépesített, szimulációkkal kiegészített játék intrót, cinematicot vagy cutscene-t készítenek, amelyet After Effectsben kompozitálnak és fényelnek.",
          "felelos": "Balogh Áron Zsigmond Dr.",
          "prerequisite": "3D tervezés és szimuláció 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Maya",
            "Arnold",
            "Unreal Engine",
            "After Effects"
          ],
          "keywords": [
            "game ready asset",
            "szimuláció",
            "mash network",
            "arnold",
            "render optimalizáció",
            "kompozitálás",
            "cinematic",
            "pbr"
          ],
          "cel": "A modulok elvégzését követően a hallgató képes lesz PBR elvek mentén anyagokat készíteni, a játéktérben, 3D jelenetben terepeket modellezni, strukturálni, és a MASH Network segítségével ezeken nagyszámú objektumot elhelyezni, továbbá a renderelési időt és erőforrás-használatot optimalizálni és a render passzokat / layereket utómunkára alkalmas módon előállítani.",
          "pdfUrl": "/tematikak/15033.pdf",
          "category": [
            "3d",
            "animáció"
          ],
          "group": null,
          "short": "nCloth-, részecske- és folyadékszimuláció, MASH, Arnold; cutscene After Effectsben."
        },
        {
          "type": "Kötelező",
          "name": "Interaktív rendszerek 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 16,
          "groups": "2",
          "instructors": "Varga Vajk, Polena Réka",
          "institute": "AMD",
          "note": null,
          "description": "A szemeszter során a hallgatók összetett interaktív rendszerek tervezését sajátítják el gyakorlati feladatokon keresztül: elektronikai rendszerekkel és mikrokontrollerekkel, TouchDesigner szoftverrel, Microsoft Kinecttel és ezek kombinációival építenek interaktív architektúrákat. A tematika kitér az audioreaktív vizuálokra, a particle systemekre, a DMX/NDI/OSC/MIDI vezérlésre és a nyomtatott áramkörök készítésére is; a félév végén a hallgatók saját multimédiás interaktív installációt készítenek, és csoportosan audiovizuális alkotást terveznek a Magyar Zene Háza hangdómjába.",
          "felelos": "Sterk Barbara DLA",
          "prerequisite": "Interaktív rendszerek 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "TouchDesigner",
            "Kinect"
          ],
          "keywords": [
            "touchdesigner",
            "kinect",
            "interaktív installáció",
            "mikrokontroller",
            "adatvizualizáció",
            "dmx",
            "osc",
            "audiovizuális"
          ],
          "cel": "A kurzus célja az interaktív rendszerek eszközismereti, alkotói (tervezői) és művészi (esztétikai szemlélet szempontjából történő) elsajátítása haladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni, felhasználni és prezentálni az e rendszerek területének műveléséhez szükséges ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/15043.pdf",
          "category": [
            "ux/interakció",
            "installáció"
          ],
          "group": null,
          "short": "TouchDesigner, Kinect, mikrokontrollerek: audioreaktív vizuálok, DMX/OSC/MIDI, saját interaktív installáció."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 2. (Média design MA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": null,
          "groups": "1",
          "instructors": "Balogh Áron",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át workshopok, meghívott előadók prezentációi, mesterkurzusok, technikai bemutatók, konferencia- és kiállításlátogatások, valamint közös projektek formájában. A programok között szerepelnek Erasmus-beszámolók, BEST OF diplomaprezentációk és az OMDK intézményi forduló; a teljesítés feltétele a jelenlét és a kijelölt szakmai feladatok határidőre való leadása.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "mesterkurzus",
            "portfólió",
            "szakmai program"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak, workshopok, előadások és meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, valamint a MyBrand szemlélet alappilléreinek megvalósítása: a különböző szakterületek találkozása, a kreatív iparban használatos szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/15052.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, meghívott előadók, kiállításlátogatás; Erasmus-beszámolók és OMDK-forduló."
        },
        {
          "type": "Kötelező",
          "name": "Egalizáló tárgy 2. (Média design stúdiumok 2.)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": "1",
          "instructors": "Balogh Áron",
          "institute": "AMD",
          "note": null,
          "description": "Felzárkóztató kurzus a nem média design alapszakról érkező hallgatóknak, amely a médiaművészet és médiadesign alapjait fedi le: képszerkesztés (Photoshop), vektorgrafika (Illustrator), kézi rajz, analóg és digitális fotográfia, videóvágás és fényelés (Premiere Pro), programozás (C# és Arduino), valamint 3D modellezés és animáció (Blender). A tematikában szerepel továbbá 3D mapping és fényfestés Resolume Arénával, illetve webdesign Figmával és HTML/CSS/JavaScript alapokkal; a hallgatók a feladatokból egyéni portfóliót építenek.",
          "felelos": "Kiss Melinda",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Photoshop",
            "Illustrator",
            "Premiere Pro",
            "Blender",
            "Resolume Arena",
            "Arduino",
            "Figma"
          ],
          "keywords": [
            "felzárkóztató",
            "médiaművészet",
            "képszerkesztés",
            "videóvágás",
            "3d modellezés",
            "fényfestés",
            "webdesign",
            "programozás"
          ],
          "cel": "A tantárgy célja olyan ismeretkörök átadása, amelyekre a nem média design alapszakot végző hallgatóknak korábban nem nyílt lehetőségük: alapszintű média design technikák, speciális szoftverek ismerete és a média design tervezés fő alaphelyzetei; a teljesítéssel a hallgató érti és alkalmazni tudja a szakterület alapfogalmait és fő elveit.",
          "pdfUrl": "/tematikak/15037.pdf",
          "category": [
            "projekt",
            "2d",
            "3d"
          ],
          "group": null,
          "short": "Felzárkóztatás: fotó, videóvágás, Blender 3D, fényfestés (Resolume), webdesign (Figma, HTML/CSS), Arduino."
        }
      ]
    },
    {
      "version": "2026/2027",
      "program": "MA",
      "semester": 3,
      "label": "Média Design MA 2026/2027",
      "courses": [
        {
          "type": "Kötelező",
          "name": "Kommunikációs ismeretek",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadás, amely a kommunikáció alapfogalmaival és folyamataival foglalkozik a média design mesterképzés keretében. A kurzus a szakmai munkához szükséges kommunikációs ismeretek megalapozását szolgálja, kollokviummal zárul.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "kommunikáció",
            "elmélet",
            "kommunikációelmélet",
            "médiakommunikáció",
            "prezentáció"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Kommunikáció alapfogalmai és folyamatai: kommunikációelmélet, médiakommunikáció, prezentáció."
        },
        {
          "type": "Kötelező",
          "name": "Gazdaság és jog",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadás, amely a kreatív szakmai tevékenységhez kapcsolódó gazdasági és jogi alapismereteket tárgyalja a média design mesterképzésben. A kurzus a hallgatók piaci és jogi tájékozottságát alapozza meg, kollokviummal zárul.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "gazdaság",
            "jog",
            "szerzői jog",
            "vállalkozás",
            "elmélet",
            "kreatívipar"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Gazdasági és jogi alapok a kreatíviparban: szerzői jog, vállalkozási és piaci ismeretek."
        },
        {
          "type": "Kötelező",
          "name": "Hangdesign",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 13,
          "groups": "2",
          "instructors": "Kováts Jázon",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a multimédia környezetben alkalmazott audio lehetőségeibe vezet be haladó szinten: a hangvágás és keverés alapjaitól a hangfelvételi eszközparkon és a digitális hangszerkesztésen (EQ, zajszűrés, effektek) át a foley-ig. Kiemelt téma az interaktivitás: MIDI és Open Sound Control alapú rendszerek építése Ableton Live és Max környezetben. A félév során stúdió- és low budget eszközökkel egyaránt dolgoznak a hallgatók, és a diplomamunka-tervek hangi megoldásait is konzultálják.",
          "felelos": "Csáki László",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Audition",
            "Ableton Live",
            "Max/MSP",
            "PaulXStretch"
          ],
          "keywords": [
            "hangdesign",
            "audition",
            "ableton",
            "hangtervezés",
            "audio",
            "midi",
            "osc",
            "foley"
          ],
          "cel": "A kurzus célja a hangdesign eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai) elsajátítása haladó szinten. A hallgató a kurzus végére képes haladó szinten felismerni, elemezni, érteni, alkalmazni és prezentálni a hangdesign területét képező ismeretanyagot és technikai tudást.",
          "pdfUrl": "/tematikak/12513.pdf",
          "category": [
            "hang"
          ],
          "group": null,
          "short": "Hangvágás, keverés, EQ, foley, MIDI/OSC-alapú interaktív rendszerek (Audition, Ableton Live, Max)."
        },
        {
          "type": "Kötelező",
          "name": "Médiatervezés 3.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 6,
          "credits": 7,
          "active": 13,
          "groups": "2",
          "instructors": "Berkes Bálint, Pálfi Szabolcs, Forgács Kristóf",
          "institute": "AMD",
          "note": null,
          "description": "Két modulból álló gyakorlati kurzus. Az egyik modulban a hallgatók a fényt mint művészi eszközt ismerik meg: projection mapping, DMX-vezérelt lámpák és robotlámpák, LED-technológiák és valós idejű, Unreal Engine-nel összekötött fényinstallációk készítése a téma, a félév saját fényművészeti alkotással zárul. A másik modul a játéktervezés folyamatát dolgozza fel az ötlettől a tervezői dokumentumon (GDD) át a prototípusig, érintve a karakter-, level- és UI/UX-tervezést, animációt és optimalizációt.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "Médiatervezés 2.",
          "requirement": "gyakorlati jegy",
          "software": [
            "MadMapper",
            "MadLight",
            "Unreal Engine"
          ],
          "keywords": [
            "médiatervezés",
            "fényművészet",
            "projection mapping",
            "dmx",
            "játéktervezés",
            "prototípus",
            "installáció",
            "projektmunka"
          ],
          "cel": "A tantárgy célja egyrészt, hogy a hallgatók megismerjék a fény mint művészi eszköz alkalmazási lehetőségeit a multimédiás formákban, másrészt hogy elsajátítsák a játéktervezés alapelveit és folyamatait a játékmechanikáktól a prototípus-készítésen át az iterációig.",
          "pdfUrl": "/tematikak/12515.pdf",
          "category": [
            "installáció",
            "játék"
          ],
          "group": null,
          "short": "Fényművészet (projection mapping, DMX, Unreal Engine) és játéktervezés a GDD-től a prototípusig."
        },
        {
          "type": "Kötelező",
          "name": "Kísérleti médiaművészet",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 13,
          "groups": "2",
          "instructors": "Varga Vajk, Forgács Kristóf",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a kísérleti médiaművészet világába vezet be, az új média technológiáira és az avantgárd művészeti mozgalmak hatásaira építve. Az egyik modulban a hallgatók a fényművészet és a luminokinetika alapjaival, kiállítástervezéssel és -építéssel, valamint interaktív installációk technológiai hátterével (haladó TouchDesigner) foglalkoznak, és saját projektet valósítanak meg. A másik modulban nagyvárosi kreatív ötlettervek kidolgozása és vizuális prezentációja a feladat, amelyek egyedi módon erősíthetik egy város arculatát és élményét.",
          "felelos": "Mayer Éva",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "TouchDesigner"
          ],
          "keywords": [
            "médiaművészet",
            "kísérleti",
            "experimentális",
            "fényművészet",
            "luminokinetika",
            "installáció",
            "touchdesigner",
            "új média"
          ],
          "cel": "A tantárgy célja a hagyományos média design és médiaművészeti területeken kívül eső kompetenciák felfedezése és gyakorlatba ültetése, a hallgatók bátorítása a határterületek vizsgálatára, kísérletek elvégzésére és az azokból való tanulságok levonására.",
          "pdfUrl": "/tematikak/12459.pdf",
          "category": [
            "installáció",
            "projekt"
          ],
          "group": null,
          "short": "Fényművészet, luminokinetika, interaktív installációk (TouchDesigner), városi kreatív ötlettervek."
        },
        {
          "type": "Kötelező",
          "name": "Analitikus médiaelmélet",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 3,
          "active": 13,
          "groups": "2",
          "instructors": "Kollár Dávid",
          "institute": "ELM",
          "note": null,
          "description": "A kurzus a média elemzésének és értelmezésének kritikai szemléletét adja át: a hallgatók megismerkednek a főbb médiaelméleti irányzatokkal, modellekkel és kulcsfogalmakkal. Szó esik a médiafogyasztási trendekről, a média és a nyilvánosság, illetve a hatalom viszonyáról, a médiareprezentációról, valamint a médiaszövegek szemiotikai és diskurzuselemzéséről. A félév végére a hallgatók képessé válnak a kortárs médiajelenségek és -platformok kontextusban való, kritikai elemzésére.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "-",
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "médiaelmélet",
            "analitikus",
            "médiakritika",
            "elmélet",
            "reprezentáció",
            "szemiotika",
            "nyilvánosság"
          ],
          "cel": "A kurzus célja, hogy a hallgatók megismerkedjenek az analitikus médiaelmélet alapjaival, és elsajátítsák azokat az elméleti kereteket és fogalmakat, amelyekkel képessé válnak a médiajelenségek mélyebb megértésére, valamint a médiatartalmak és -platformok kritikai elemzésére saját média designeri munkájukban is.",
          "pdfUrl": "/tematikak/12512.pdf",
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Médiaelméleti irányzatok, média és hatalom, reprezentáció, szemiotikai és diskurzuselemzés."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 3. (Média design MA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": 13,
          "groups": "1",
          "instructors": "Molnár Ágnes",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át workshopok, meghívott előadók prezentációi, mesterkurzusok, innovációs és technikai bemutató előadások, konferenciarészvétel, kiállításlátogatás és közös projektek formájában. Fontos szempont a társterületi alapismeretek és kompetenciák beemelése, valamint a portfólióépítés. A teljesítés feltétele a jelenlét és a kijelölt szakmai feladatok határidőre való leadása.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "projektmunka",
            "ma",
            "mesterkurzus",
            "konferencia"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak workshopok, előadások és meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, valamint a kreatív iparban használatos szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/12746.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, kiállításlátogatás meghívott szakemberekkel; portfólió."
        }
      ]
    },
    {
      "version": "2026/2027",
      "program": "MA",
      "semester": 4,
      "label": "Média Design MA 2026/2027",
      "courses": [
        {
          "type": "Kötelező és szabváll.",
          "name": "Produkciós ismeretek",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 3,
          "active": 13,
          "groups": "1",
          "instructors": "Pápai Bence",
          "institute": "ELM",
          "note": "szab.váll. létszám: összesen",
          "description": "A kurzus a digitális produkciók – elsősorban a játékfejlesztési workflow – vezetői oldalát mutatja be: projektmenedzsment-alapok, kockázatok és felelősségek, a piac szereplői és a szükséges szakembergárda. A hallgatók áttekintik a finanszírozási lehetőségeket (közösségi finanszírozás, kiadók, befektetők), a költségtervezést, valamint a marketing és PR szerepét. A félév során fiktív pitch csomagot állítanak össze koncepcióval, célpiaccal, csapatösszetétellel, költségvetéssel és ütemezéssel.",
          "felelos": "Besenyei Zsuzsanna",
          "prerequisite": "-",
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "produkció",
            "projektmenedzsment",
            "játékfejlesztés",
            "finanszírozás",
            "kiadói rendszer",
            "pitch",
            "költségvetés",
            "marketing"
          ],
          "cel": "A tantárgy célja, hogy a hallgatók megismerkedjenek a projektek és produkciók létrehozása során felmerülő alkotói, tervezői problémákkal és megoldási stratégiáikkal, ismerjék a produkcióhoz szükséges szakemberek szerepköreit és felelősségeit, és képesek legyenek egy produkció megtervezésére és teljes körű levezénylésére.",
          "pdfUrl": "/tematikak/ext-produkcios-ismeretek.pdf",
          "category": [
            "játék",
            "projekt",
            "elmélet"
          ],
          "group": null,
          "short": "Játékipari produkció vezetői oldala: finanszírozás, kiadók, PM-eszközök, marketing; fiktív pitch csomag."
        },
        {
          "type": "Kötelező",
          "name": "Diplomamunka (Média design)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 12,
          "credits": 20,
          "active": 13,
          "groups": "2",
          "instructors": "Pálfi Szabolcs, Forgács Kristóf, Madácsi Blanka, Varga Vajk, Kollár Dávid, Kováts Jázon",
          "institute": "AMD",
          "note": null,
          "description": "A záró félév kurzusa három blokkban kíséri a diplomamunka elkészítését: az egyik blokkban a hallgatók a játékfejlesztés folyamataival ismerkednek meg a tervezéstől a kiadásig, és közös projektben a maguk választotta területen hoznak létre portfólióba illeszthető produktumokat; a másikban a szakdolgozatírás módszertanát sajátítják el (kutatási kérdés, hivatkozás, szakirodalom-feldolgozás, formai követelmények); a harmadikban a diplomamunka projektszerű felépítésével (ütemezés, mérföldkövek, vészforgatókönyv), a diplomaprezentáció gyakorlásával, valamint a portfólió és showreel összeállításával foglalkoznak. A teljesítés további feltétele a félév során két központi konzultáción való részvétel, ahol a diplomamunka készültségét oktatókból álló bizottság értékeli.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "diplomamunka",
            "szakdolgozat",
            "portfólió",
            "showreel",
            "prezentáció",
            "projektterv",
            "kutatásmódszertan"
          ],
          "cel": "A kurzus célja a diplomamunkához szükséges eszközismereti, alkotói és művészi ismeretek elsajátítása haladó szinten, a kreatív készségek kifejlesztése és a prezentációs tudás megszerzése.",
          "pdfUrl": "/tematikak/ext-diplomamunka-media-design.pdf",
          "category": [
            "diploma/portfólió"
          ],
          "group": null,
          "short": "Három blokk: játékfejlesztési csapatprojekt, szakdolgozat-módszertan, projektterv, portfólió és showreel."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 4. (Média design MA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": 13,
          "groups": "1",
          "instructors": "Forgács Kristóf",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervben foglalt szakmai ismereteken túlmutató programokat kínál: meghívott szakemberek előadásait, mesterkurzusokat, innovációs és technikai workshopokat, konferencia- és kiállításlátogatásokat, valamint közös projektek kivitelezését. A programok között Erasmus-beszámoló, BEST OF diplomaprezentációk és az OMDK intézményi forduló is szerepel. A teljesítés feltétele a jelenlét és a kijelölt szakmai feladatok határidőre való elvégzése.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "mesterkurzus",
            "projektmunka",
            "portfólió",
            "ma"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak workshopok, előadások és meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, valamint a MyBrand szemlélet alappilléreinek megvalósítása: különböző szakterületek találkozása, a kreatív iparban használatos szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/15057.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Meghívott előadók, mesterkurzusok, workshopok; Erasmus-beszámoló, BEST OF diplomaprezentációk, OMDK forduló."
        }
      ]
    },
    {
      "version": "2025/2026",
      "program": "BA",
      "semester": 1,
      "label": "Média Design BA 2025/2026",
      "courses": [
        {
          "type": "Kötelező",
          "name": "Digitális grafikai stúdiumok",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 20,
          "groups": "2",
          "instructors": "Szacsvai Pál",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a képernyő-specifikus grafikai tervezés alapelveivel és a képi közlés alapelemeivel (szín, forma, vonal, kompozíció, tipográfiai és rajzi struktúra) ismerteti meg a hallgatót, valamint ezek kreatív alkalmazásával a kortárs digitális kommunikációs rendszerekben. A számítógépes képalkotás, képfeldolgozás és képszerkesztés eljárásait az Adobe Illustrator és Photoshop programokon keresztül gyakorolják, adatvizualizációs, piktogram-, logó- és bannertervezési feladatokkal. A megszerzett tudás megalapozza a későbbi félévek mozgógrafikai és 3D modellezői stúdiumait.",
          "felelos": "Kiss Melinda",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Illustrator",
            "Photoshop"
          ],
          "keywords": [
            "grafikai tervezés",
            "illustrator",
            "photoshop",
            "képi közlés",
            "digitális grafika",
            "piktogram",
            "vizuális kommunikáció",
            "kompozíció"
          ],
          "cel": "A tantárgy célja a média design szakma műveléséhez elengedhetetlen képnyelvi és mozgóképnyelvi alapismeretek átadása, valamint a számítógépes képalkotás, képfeldolgozás és képszerkesztés alapelveinek ismertetése és gyakoroltatása az Adobe Illustrator és Photoshop programok használata útján.",
          "pdfUrl": "/tematikak/12306.pdf",
          "category": [
            "grafika/tipográfia",
            "2d"
          ],
          "group": null,
          "short": "Vektor- és pixelgrafika: adatvizualizáció, piktogram, logó, banner, hibrid képnyelv (Illustrator, Photoshop)."
        },
        {
          "type": "Kötelező",
          "name": "Interakciótervezés 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 6,
          "credits": 7,
          "active": 20,
          "groups": "2",
          "instructors": "Kunszt Gábor",
          "institute": "AMD",
          "note": "Új oktató szervezése folyamatban",
          "description": "A kurzus bevezető részében a hallgatók megismerkednek az Arduino fejlesztői környezettel, valamint elektronikai és programozói alapismeretekkel (digitális és analóg I/O, vezérlési szerkezetek, szervomotorok). Emellett bepillantást nyernek a folyamatalapú fizikai algoritmikus alkotás világába. A kurzus második felében műhelymunka során anyagkísérleteket és prototípusgyártást végeznek, és saját koncepció alapján kisebb interaktív rendszereket készítenek.",
          "felelos": "Sterk Barbara DLA",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Arduino"
          ],
          "keywords": [
            "interakciótervezés",
            "arduino",
            "fizikai számítástechnika",
            "prototípus",
            "elektronika",
            "interaktív installáció",
            "algoritmikus alkotás"
          ],
          "cel": "A kurzus célja az interakciótervezés alapjainak elsajátítása eszközismereti (Arduino nyelv), fizikai alkotói (tervezői) és művészeti (esztétikai) szemlélet szempontjából. A hallgató a kurzus elvégzése eredményeképpen képes felismerni, elemezni, érteni, alkalmazni, valamint prezentálni az interakciótervezés alapjait képező ismeretanyagot, technikai tudást és alkotói képességet.",
          "pdfUrl": "/tematikak/12308.pdf",
          "category": [
            "ux/interakció",
            "installáció"
          ],
          "group": null,
          "short": "Arduino: elektronika, szenzorok, szervók, anyagkísérletek, interaktív objektumok építése."
        },
        {
          "type": "Kötelező",
          "name": "Kommunikációs ismeretek alapjai",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": 232,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti alapozó előadás, amely a kommunikáció alapfogalmaival, modelljeivel és folyamataival ismerteti meg a hallgatókat. A kurzus a média design képzés közös elméleti alapozásának része, és kollokviummal zárul.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "kommunikáció",
            "kommunikációelmélet",
            "alapismeretek",
            "médiaelmélet",
            "elmélet"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Kommunikáció alapfogalmai, modelljei és folyamatai — közös elméleti alapozó előadás, kollokviummal."
        },
        {
          "type": "Kötelező",
          "name": "Média design stúdiumok 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 20,
          "groups": "2",
          "instructors": "Mayer Éva",
          "institute": "AMD",
          "note": null,
          "description": "A média design szak alapozó főtantárgya, amely a hallgatók alkotó készségét és művészeti kreativitását fejleszti, és megalapoz minden további gyakorlati média design tárgyat. Az első félév ismeretanyaga a kompozíció, a perspektíva és térábrázolás, az anatómia (portréábrázolás), valamint a kreatív látásmód fejlesztése, szabadkézi rajzi és digitális technikák kombinálásával. A félév kreatív feladatokat (színkontraszt, parafrázis, kollázs) és múzeumlátogatást is tartalmaz.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Lightroom",
            "Premiere Pro",
            "After Effects"
          ],
          "keywords": [
            "médiadesign",
            "alapozó",
            "kreativitás",
            "kompozíció",
            "perspektíva",
            "anatómia",
            "rajz",
            "térlátás"
          ],
          "cel": "A tantárgy célja a média design szakma műveléséhez elengedhetetlen képnyelvi alapismeretek átadása és az alkotói készségek kifejlesztése, valamint a manuális és számítógépes képalkotás alapelveinek, eljárásainak ismertetése és gyakoroltatása.",
          "pdfUrl": "/tematikak/12452.pdf",
          "category": [
            "2d",
            "grafika/tipográfia"
          ],
          "group": null,
          "short": "Kompozíció, perspektíva, portréanatómia: szabadkézi rajz digitális technikákkal, parafrázis, múzeumlátogatás."
        },
        {
          "type": "Kötelező",
          "name": "Művészettörténet társadalomtudományi kontextusban 1.",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": 242,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadás, amely a művészettörténet korszakait és jelenségeit társadalomtudományi kontextusban tárgyalja. A kurzus a művészeti képzések közös elméleti alapozásának része, és kollokviummal zárul.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "művészettörténet",
            "társadalomtudomány",
            "kultúrtörténet",
            "vizuális kultúra",
            "elmélet"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Korszakok és művészeti jelenségek társadalmi-kulturális összefüggésekben; közös elméleti alapozó, kollokvium."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 1. (Média design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": null,
          "groups": "1",
          "instructors": "Szacsvai Pál",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át workshopok, meghívott előadók prezentációi, mesterkurzusok, innovációs és technikai bemutató előadások, konferencia- és kiállításlátogatások, valamint közös projektek formájában. Az első félévben a hallgatók megismerkednek a média design szakkal, az Erasmus pályázati rendszerrel és a METU művészeti szakjaival. Fontos szempont a társterületek alapismereteinek beemelése és a portfólióépítés.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "projektmunka",
            "mesterkurzus",
            "portfólió",
            "ba"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak workshopok, előadások és meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, akár vendégelőadók, akár közös programok formájában. A tárgy keretében megvalósulnak a MyBrand szemlélet fontos alappillérei: különböző szakterületek találkozása, tudás- és kompetenciaelemek egymásra épülése, a kreatív iparban használatos szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/12722.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, meghívott előadók; szakbemutató, Erasmus-ismertető, portfólióépítés."
        },
        {
          "type": "Kötelező",
          "name": "UX design stúdiumok 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 4,
          "active": 20,
          "groups": "2",
          "instructors": "Kiss Lőrinc",
          "institute": "AMD",
          "note": null,
          "description": "A tantárgy a felhasználói élmény (UX) tervezés alapismereteit, módszereit és folyamatait tanítja a Miro és Figma szoftverek használatával, a Design Thinking keretrendszer mentén. A hallgatók kutatási módszerekkel (interjúk, perszónák, customer journey), információs architektúrával és user flow-val, majd UI-tervezéssel foglalkoznak. A két féléves kurzus során egy szabadon választott digitális alkalmazás prototípusát tervezik meg Figmában, ami megalapozza a digitális terméktervezői készségeket.",
          "felelos": "Balogh Áron Zsigmond Dr.",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Figma",
            "Miro"
          ],
          "keywords": [
            "ux design",
            "figma",
            "miro",
            "felhasználói élmény",
            "prototípus",
            "design thinking",
            "perszóna",
            "user flow"
          ],
          "cel": "A kurzus célja a UX design eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai) elsajátítása alap szinten. A hallgató a kurzus elvégzése eredményeképpen képes alap szinten felismerni, elemezni, érteni, felhasználni és prezentálni a UX design területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/12741.pdf",
          "category": [
            "ux/interakció"
          ],
          "group": null,
          "short": "Design Thinking: kutatás, perszóna, customer journey, user flow, app-prototípus Figmában és Miróban."
        }
      ]
    },
    {
      "version": "2025/2026",
      "program": "BA",
      "semester": 2,
      "label": "Média Design BA 2025/2026",
      "courses": [
        {
          "type": "Kötelező",
          "name": "Művészettörténet társadalomtudományi kontextusban 2.",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "A művészettörténet főbb korszakait és irányzatait társadalomtudományi kontextusban tárgyaló előadássorozat második féléve. A hallgatók a műalkotásokat a létrejöttüket meghatározó társadalmi, kulturális és gazdasági összefüggésekben vizsgálják, ezáltal fejlődik elemző és kritikai gondolkodásuk.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "művészettörténet",
            "társadalomtudomány",
            "elmélet",
            "kultúrtörténet",
            "műelemzés",
            "kontextus"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Művészeti korszakok és irányzatok társadalmi, kulturális, gazdasági összefüggésekben; műelemzés, kritika."
        },
        {
          "type": "Kötelező",
          "name": "Bevezetés a filozófiába és az esztétikába",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Bevezető előadás a filozófia és az esztétika alapfogalmaiba, főbb kérdésfelvetéseibe és gondolkodástörténeti hagyományába. A kurzus elméleti alapot ad a művészeti és tervezői gyakorlat reflektált, kritikai szemléletű megközelítéséhez.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "filozófia",
            "esztétika",
            "elmélet",
            "gondolkodástörténet",
            "műelemzés",
            "bevezetés"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Filozófiai és esztétikai alapfogalmak, gondolkodástörténeti hagyomány; elméleti alap a kritikai műelemzéshez."
        },
        {
          "type": "Kötelező",
          "name": "Tipográfia és betűrajz",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 24,
          "groups": "2",
          "instructors": "Szacsvai Pál",
          "institute": "AMD",
          "note": null,
          "description": "A tantárgy a tipográfiai érzékenység kialakítását és a szöveges közlés megformálásának, kép és szöveg együttes elrendezésének technikáit tanítja. A hallgatók betűtörténeti korszakokon (római kapitálistól a talp nélküli antikváig) haladva betűrajzi és kreatív betűtervezési gyakorlatokat végeznek, miközben elsajátítják a számítógépes kiadványtervezés (DTP) alapjait InDesignban. A félév végére saját fonttervet és kiadványtervet készítenek, a tervezett betűt Fontself segítségével fontállománnyá is alakítják.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "InDesign",
            "Photoshop",
            "Fontself"
          ],
          "keywords": [
            "tipográfia",
            "betűrajz",
            "indesign",
            "betűtervezés",
            "betűtörténet",
            "kiadványtervezés",
            "dtp",
            "fonttervezés"
          ],
          "cel": "A kurzus célja a tipográfia és betűrajz eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai szemlélet szempontjából) elsajátítása alapszinten. A hallgató a kurzus elvégzése eredményeképpen képes alapszinten felismerni, elemezni, érteni és felhasználni (alkalmazni), valamint prezentálni a tipográfia és betűrajz területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/15053.pdf",
          "category": [
            "grafika/tipográfia",
            "2d"
          ],
          "group": null,
          "short": "Betűtörténet a római kapitálistól a sans serifig; saját fontterv és kiadványterv InDesignban, Fontselffel."
        },
        {
          "type": "Kötelező",
          "name": "Média design stúdiumok 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 24,
          "groups": "2",
          "instructors": "Szűcs Levente",
          "institute": "AMD",
          "note": null,
          "description": "A tantárgy a média design szakma műveléséhez szükséges képnyelvi, fotográfiai és mozgóképnyelvi alapismereteket adja át. A hallgatók a fotográfia alapjaitól (expozíció, világítás, plánok, kompozíció) a Lightroom-alapú képfeldolgozáson át a mozgóképkészítésig jutnak: kameramozgások, vágás, log rögzítés és színezés, hangi történetmesélés, valamint a Premiere Pro és After Effects közötti dynamic link használata is a tematika része. A féléves feladat egy hívószóra készített fotósorozat és egy rövid kisfilm.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "Média design stúdiumok 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Lightroom",
            "Premiere Pro",
            "After Effects"
          ],
          "keywords": [
            "fotó",
            "mozgókép",
            "lightroom",
            "premiere pro",
            "after effects",
            "világítás",
            "vágás",
            "színkorrekció"
          ],
          "cel": "A kurzus célja a médiatervezés eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai szemlélet szempontjából) elsajátítása alap szinten. A hallgató a kurzus elvégzése eredményeképpen képes alap szinten felismerni, elemezni, érteni és felhasználni (alkalmazni), valamint prezentálni a médiatervezés területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/15044.pdf",
          "category": [
            "fotó",
            "film/videó"
          ],
          "group": null,
          "short": "Fotó: expozíció, világítás, plánok; Lightroom; mozgókép vágás, színezés, hang (Premiere Pro, After Effects)."
        },
        {
          "type": "Kötelező",
          "name": "Interakciótervezés 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 6,
          "credits": 7,
          "active": 24,
          "groups": "2",
          "instructors": "Poroszlai Eszter, Kunszt Gábor",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus két modulban vezeti be a hallgatókat a fizikai interakciótervezés haladó gyakorlatába. A technikai modulban Arduino-alapú fizikai számítástechnikával, szenzorokkal (távolság-, fény-, érintésérzékelés) és aktuátorokkal (fények, szervók, motorok vezérlése) dolgoznak; a művészeti modul inspirációgyűjtésen, fénykutatáson, anyagkísérleten és tárgytervezésen keresztül a luminokinetika és az interaktív fényművek világába kalauzol. A félév végére a hallgatók csoportmunkában interaktív műalkotást terveznek, kiviteleznek és dokumentálnak.",
          "felelos": "Sterk Barbara DLA",
          "prerequisite": "Interakciótervezés 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Arduino"
          ],
          "keywords": [
            "interakciótervezés",
            "arduino",
            "fizikai computing",
            "szenzorok",
            "aktuátorok",
            "fényművészet",
            "interaktív installáció"
          ],
          "cel": "A kurzus célja az interakciótervezés alapjainak eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai szemlélet szempontjából) elsajátítása haladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni és felhasználni (alkalmazni), valamint prezentálni az interakciótervezés alapjainak területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/15034.pdf",
          "category": [
            "ux/interakció",
            "installáció"
          ],
          "group": null,
          "short": "Arduino-alapú fizikai computing: szenzorok, fény- és motorvezérlés; csoportos interaktív fénymű építése."
        },
        {
          "type": "Kötelező",
          "name": "UX design stúdiumok 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 4,
          "active": 24,
          "groups": "2",
          "instructors": "Kiss Lőrinc",
          "institute": "AMD",
          "note": null,
          "description": "A felhasználói élmény (UX) tervezés módszereit és folyamatait haladó szinten feldolgozó gyakorlati kurzus, amely a Design Thinking keretrendszerre épül. A félév témái között szerepelnek a tervezési alapelvek, usability heurisztikák, platformspecifikus tervezés (reszponzív web, Android, iOS), akadálymentesítés, UX-szövegezés és felhasználói tesztelés. A hallgatók a két félév során egy szabadon választott digitális alkalmazás prototípusát tervezik meg Figmában, a kutatási összefoglalótól a perszónákon és user flow-n át az esettanulmányig.",
          "felelos": "Balogh Áron Zsigmond Dr.",
          "prerequisite": "UX design stúdiumok 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Figma",
            "Miro"
          ],
          "keywords": [
            "ux design",
            "figma",
            "miro",
            "prototípus",
            "design thinking",
            "használhatóság",
            "felhasználói tesztelés",
            "akadálymentesítés"
          ],
          "cel": "A kurzus célja a UX design eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai) elsajátítása haladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni és felhasználni (alkalmazni), valamint prezentálni a UX design területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/14761.pdf",
          "category": [
            "ux/interakció"
          ],
          "group": null,
          "short": "Usability, platformok (web, Android, iOS), akadálymentesítés, felhasználói tesztelés; prototípus Figmában."
        },
        {
          "type": "Kötelező",
          "name": "Média design szakelmélet",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": 24,
          "groups": "1",
          "instructors": "Liszka Tamás",
          "institute": "AMD",
          "note": null,
          "description": "A média design szellemtörténeti előzményeit, tudományos, technikai és társművészeti környezetét feldolgozó előadássorozat. A tematika a kép, jel és szimbólum kérdéseitől (Saussure, Peirce) a fénykép ontológiáján (Bazin), az ikonográfián és a képi fordulaton át a bio-artig, a hálózatkutatásig és a nonlineáris, interaktív művészeti formákig ível. Konkrét művek és alkotók elemzésén keresztül körvonalazódik a média design kortárs és jövőbeli formáit meghatározó művészeti alapállás.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "-",
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "médiaelmélet",
            "szakelmélet",
            "szemiotika",
            "ikonográfia",
            "médiaművészet",
            "interaktivitás",
            "képelmélet"
          ],
          "cel": "A kurzus célja a média design általános elméletének elsajátítása, hogy a hallgató alkotó-, tervező- és művészi, valamint prezentációs munkájához elméleti megalapozásként és fogalmi kiegészítésként alkalmazhassa. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni és alkalmazni az elsajátított elméleti ismeretanyagot, és médiatervezői, médiaművészi gyakorlatát el tudja helyezni és sikeresen képviselni tudja szakmai együttműködései során, valamint egy szélesebb, interdiszciplináris keretben.",
          "pdfUrl": "/tematikak/15047.pdf",
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Szemiotikától a bio-artig: kép, jel, fénykép-ontológia, ikonográfia, hálózatkutatás, interaktív műformák."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 2. (Média design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": null,
          "groups": "1",
          "instructors": "Szacsvai Pál",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át workshopok, meghívott előadók prezentációi, mesterkurzusok, innovációs előadások, konferencia- és kiállításlátogatások, valamint közös projektek formájában. Fontos szempont a társterületek alapismereteinek beemelése és a kreatív ipari szemlélet, valamint a portfólió építése. A teljesítés feltétele a jelenlét és a kijelölt szakmai feladatok határidőre való leadása.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "mesterkurzus",
            "portfólió",
            "projektmunka"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak workshopok, előadások és meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, a kreatív iparban használatos szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/14760.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, meghívott előadók, kiállításlátogatások; portfólióépítés és projektmunka."
        }
      ]
    },
    {
      "version": "2025/2026",
      "program": "BA",
      "semester": 3,
      "label": "Média Design BA 2025/2026",
      "courses": [
        {
          "type": "Kötelező",
          "name": "3D labor (Játéktervezés) 1.",
          "specialization": "Játéktervezés specializáció",
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 10,
          "groups": "1",
          "instructors": "Balogh Áron",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus bevezeti a hallgatókat a játéktervezéshez kapcsolódó háromdimenziós környezetalkotás folyamatába, a Blender-alapú modellezéstől és textúrázástól az Unreal Engine-ben történő valós idejű megjelenítésig. A hallgatók elsajátítják a 3D-modellezés és -exportálás alapjait, majd az Unreal Engine asset-kezelési eszközeivel saját játékkörnyezetet építenek, kitérve a világításra, az atmoszférára és a blueprint-alapú vizuális kódolásra. A félév zárásaként önálló environment-projektet fejeznek be és prezentálnak.",
          "felelos": "Selján Márk Endre",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Blender",
            "Unreal Engine",
            "Quixel"
          ],
          "keywords": [
            "unreal engine",
            "blender",
            "quixel",
            "játékkörnyezet",
            "level design",
            "3d modellezés",
            "blueprint",
            "textúrázás"
          ],
          "cel": "A kurzus célja, hogy a hallgatók gyakorlati példákon keresztül elsajátítsák a háromdimenziós játékkörnyezetek tervezésének és megvalósításának alapvető lépéseit, a Blenderben végzett modellezéstől és textúrázástól az Unreal Engine-ben történő valós idejű megjelenítésig. A félév végére a hallgató képes lesz önállóan létrehozni és exportálni 3D-modelleket, azokat integrálni egy valós idejű engine környezetébe, valamint koherens, prezentálható environmentet kialakítani.",
          "pdfUrl": "/tematikak/13153.pdf",
          "category": [
            "3d",
            "játék"
          ],
          "group": null,
          "short": "Játékkörnyezetek Blenderben és Unreal Engine-ben: modellezés, textúrázás, világítás, blueprint, environment."
        },
        {
          "type": "Kötelező",
          "name": "3D labor (Multimédia) 1.",
          "specialization": "Multimédia specializáció",
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 11,
          "groups": "1",
          "instructors": "Berkes Bálint",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a formák és anyagok vizuális megjelenésének és térbeli viselkedésének megismerésével, valamint azok szoftveres reprodukálásával és szimulálásával foglalkozik. A hallgatók elsajátítják a 3D szoftverek alapvető használatát a modellezés, textúrázás, világítás, kamerakezelés és renderelés területén, érintve a PBR workflow-t, az UV mapping-et és a fotogrammetriát is. A féléves feladat egy választott mindennapi tárgy teljes körű 3D modelljének elkészítése és koncepcióalapú képsorozattal való bemutatása.",
          "felelos": "Selján Márk Endre",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Blender",
            "Unreal Engine"
          ],
          "keywords": [
            "3d",
            "modellezés",
            "textúrázás",
            "renderelés",
            "világítás",
            "uv mapping",
            "fotogrammetria",
            "multimédia"
          ],
          "cel": "A kurzus célja a média designon belül a multimédia-specifikus képalkotás eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai szemléletbeli) tudásának elsajátítása közép haladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni, felhasználni és prezentálni a multimédia-specifikus képalkotás területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/12454.pdf",
          "category": [
            "3d"
          ],
          "group": null,
          "short": "3D alapok Blenderben: modellezés, PBR textúrázás, UV mapping, világítás, renderelés, fotogrammetria."
        },
        {
          "type": "Kötelező és szabváll.",
          "name": "Bevezetés a médiakultúrába",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": 84,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadás, amely bevezetést nyújt a médiakultúra alapfogalmaiba és jelenségeibe. A tárgy a média és a kultúra kapcsolatának megértését alapozza meg a média design hallgatók számára. A félév kollokviummal zárul.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "médiakultúra",
            "médiaelmélet",
            "kultúra",
            "tömegmédia",
            "kommunikáció",
            "elmélet"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Média és kultúra: médiaelméleti alapfogalmak, tömegmédia-jelenségek elemzése."
        },
        {
          "type": "Kötelező",
          "name": "Game Art és Design 1.",
          "specialization": "Játéktervezés specializáció",
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 10,
          "groups": "1",
          "instructors": "Pápai Bence",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus során a hallgatók betekintést nyernek a játékfejlesztés széles spektrumába, az analóg társasjátékoktól a digitális játékok komplex tervezési és gyártási folyamataiig. A félév első fele a társasjáték-tervezésre (prototípus, balanszírozás, mechanikák), második fele a digitális játékfejlesztés fázisaira (koncepció, prototípus, vertical slice, alfa, béta, kiadás) épül. A féléves feladat egy poháralátét méretű társasjáték megtervezése és prezentálható dokumentálása.",
          "felelos": "Appelshoffer Péter",
          "prerequisite": "Média design stúdiumok 2.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Unity"
          ],
          "keywords": [
            "game art",
            "játékfejlesztés",
            "game design",
            "társasjáték",
            "prototípus",
            "játékmechanika",
            "vizuális tervezés"
          ],
          "cel": "A kurzus célja a játékfejlesztés eszközeinek, kreatív és technikai folyamatainak megismertetése a teljes gyártási folyamat mentén, a tervezői és vizuális, illetve az elméleti és gyakorlati feladatok összekapcsolásával. A hallgató képes lesz haladó szinten felismerni, elemezni és alkalmazni a játékfejlesztés tervezési területéhez tartozó ismeretanyagot.",
          "pdfUrl": "/tematikak/13184.pdf",
          "category": [
            "játék",
            "2d"
          ],
          "group": null,
          "short": "Társasjáték-tervezés (prototípus, balansz, mechanikák) és digitális játékfejlesztési fázisok a kiadásig."
        },
        {
          "type": "Kötelező",
          "name": "Hang labor 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 21,
          "groups": "2",
          "instructors": "Kováts Jázon",
          "institute": "AMD",
          "note": null,
          "description": "A hallgató a kurzus során a hangfelvétel alapelveivel, a hangszerkesztés és -editálás alapelemeivel, valamint ezek kreatív tervezési alkalmazásával és a kortárs digitális rendszerekben betöltött szerepével ismerkedik meg. A tematika a mikrofonoktól és rögzítőktől a digitális hangszerkesztésen (EQ, zajszűrés, delay, reverb) át a MIDI/OSC-alapú interaktív rendszerekig terjed, Adobe Audition és Ableton Live környezetben. A kurzus megalapozza a későbbi félévek médiaanyagainak hangaláfestéséhez szükséges tudást.",
          "felelos": "Csáki László",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Audition",
            "Ableton Live",
            "Max/MSP",
            "PaulXStretch"
          ],
          "keywords": [
            "hangfelvétel",
            "hangvágás",
            "hangdesign",
            "audition",
            "ableton",
            "midi",
            "osc",
            "keverés"
          ],
          "cel": "A tantárgy célja a média design szakma műveléséhez elengedhetetlen, képet kísérő hangnyelvi alapismeretek átadása és az alkotói készségek kifejlesztése, valamint a számítógépes hangmegmunkálás, hangfeldolgozás és hangsávszerkesztés alapelveinek ismertetése és gyakoroltatása.",
          "pdfUrl": "/tematikak/12457.pdf",
          "category": [
            "hang"
          ],
          "group": null,
          "short": "Hangfelvétel és -szerkesztés: EQ, reverb, zajszűrés, hangdesign, MIDI/OSC rendszerek Auditionben, Abletonban."
        },
        {
          "type": "Kötelező",
          "name": "Játékpszichológia",
          "specialization": "Játéktervezés specializáció",
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": 10,
          "groups": "1",
          "instructors": "Liszka Tamás",
          "institute": "AMD",
          "note": null,
          "description": "A tantárgy a játék pszichológiai működésének, céljának és hatásainak vizsgálatára fókuszál, különös tekintettel arra, hogyan alkalmazhatók a pszichológiai összefüggések a játékélmény tudatos tervezésében. A tematika a fejlődéslélektani alapoktól (Piaget, Vigotszkij) a motiváción és a flow-elméleten át a szociálpszichológiáig, a gamificationig és a UX designig terjed. A hallgatók a félév végén képesek lesznek a játékélmény pszichológiai szempontú elemzésére és formálására saját játéktervezői munkájukban.",
          "felelos": "Appelshoffer Péter",
          "prerequisite": "-",
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "játékpszichológia",
            "flow",
            "motiváció",
            "kognitív pszichológia",
            "gamification",
            "csoportdinamika",
            "fejlődéslélektan"
          ],
          "cel": "A kurzus célja, hogy a hallgató megismerje a játékélményt alakító pszichológiai folyamatokat, a játék fejlődéslélektani, kognitív és szociálpszichológiai vonatkozásait, valamint a motiváció és a flow jelenségeit. A hallgató a kurzus elvégzése után képes felismerni és elemezni a játékélményt alakító pszichológiai folyamatokat, és ezeket tudatosan alkalmazni saját játéktervezői és kreatív munkájában, multidiszciplináris szakmai környezetben is.",
          "pdfUrl": "/tematikak/12853.pdf",
          "category": [
            "játék",
            "elmélet"
          ],
          "group": null,
          "short": "Flow, motiváció, fejlődéslélektan (Piaget, Vigotszkij), csoportdinamika, gamification, UX a játéktervezésben."
        },
        {
          "type": "Kötelező",
          "name": "Mozgógrafika 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 21,
          "groups": "2",
          "instructors": "Balogh Áron",
          "institute": "AMD",
          "note": null,
          "description": "A tantárgy az After Effects 2025 környezetének és a kortárs motion design gyakorlatának elsajátítására fókuszál, kiegészítve a mesterséges intelligencia alapú képi és videós tartalomgenerálás aktuális trendjeivel. A hallgatók megismerik a kompozíciós felépítést, a kulcskockás animációt, a maszkolási és áttűnési technikákat, a színkorrekciós és 3D layer-módszereket, valamint a professzionális renderelési folyamatot. A félév zárásaként elkészített branding spot integrálja a megszerzett elméleti és gyakorlati kompetenciákat.",
          "felelos": "Kiss Melinda",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "After Effects",
            "Adobe Firefly",
            "Runway",
            "Media Encoder"
          ],
          "keywords": [
            "mozgógrafika",
            "after effects",
            "motion graphics",
            "animáció",
            "kulcskocka",
            "ai",
            "branding spot",
            "renderelés"
          ],
          "cel": "A kurzus célja a mozgógrafika eszközismereti, alkotói és művészi elsajátítása alapszinten: a hallgatók korszerű kompetenciát szereznek a mozgógrafika tervezésében és kivitelezésében Adobe After Effects környezetben, kiegészítve a generatív AI-alapú kreatív eszköztárral, és képesek lesznek önállóan mozgógrafikai alkotásokat létrehozni.",
          "pdfUrl": "/tematikak/12458.pdf",
          "category": [
            "animáció",
            "2d"
          ],
          "group": null,
          "short": "After Effects-alapok: kulcskockás animáció, maszkolás, színkorrekció, AI-képgenerálás, branding spot."
        },
        {
          "type": "Kötelező",
          "name": "Multimédia design 1.",
          "specialization": "Multimédia specializáció",
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 11,
          "groups": "1",
          "instructors": "Nikázy Gusztáv",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a sztenderdizálódott online médiafelületeket leíró nyelvek (HTML, CSS) alapjainak megismerésére és alkalmazására épül. A hallgatók a wireframing és prototyping módszereivel, tipográfiai és akadálymentesítési szempontokkal, valamint reszponzív design megoldásokkal dolgozva önálló tervezési-fejlesztési projektfeladatot valósítanak meg, Figma és Penpot prototípusok segítségével. A cél a template-jellegek határainak feloldása és egyedi, újszerű online médiatartalmak előállítása.",
          "felelos": "Mayer Éva",
          "prerequisite": "Média design stúdiumok 2.",
          "requirement": "gyakorlati jegy",
          "software": [
            "HTML",
            "CSS",
            "Figma",
            "Penpot"
          ],
          "keywords": [
            "webdesign",
            "html",
            "css",
            "prototípus",
            "wireframe",
            "reszponzív design",
            "tipográfia",
            "akadálymentesítés"
          ],
          "cel": "A kurzus célja a multimédia médiatervezés eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai szemléletbeli) elsajátítása haladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni, felhasználni és prezentálni a médiatervezés multimédia területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/12460.pdf",
          "category": [
            "web",
            "ux/interakció"
          ],
          "group": null,
          "short": "Webtervezés HTML/CSS-sel: wireframe, Figma/Penpot prototípus, tipográfia, reszponzív és akadálymentes design."
        },
        {
          "type": "Kötelező",
          "name": "Művészetelmélet",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": 103,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadás, amely a művészetelmélet alapfogalmaival és főbb irányzataival ismerteti meg a hallgatókat. A tárgy a média design képzés elméleti megalapozását szolgálja, a művészeti alkotások értelmezéséhez szükséges fogalmi keretek átadásával. A félév kollokviummal zárul.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "művészetelmélet",
            "esztétika",
            "művészettörténet",
            "kultúra",
            "elmélet"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Esztétikai alapfogalmak és fő elméleti irányzatok: fogalmi keretek a műalkotások értelmezéséhez."
        },
        {
          "type": "Kötelező",
          "name": "Új technológia pszichológiai vonatkozásai",
          "specialization": "Multimédia specializáció",
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": 11,
          "groups": "1",
          "instructors": "Kollár Dávid",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a modern digitális technológiák pszichológiai hatásainak komplex kognitív tudományos vizsgálatára összpontosít. A hallgatók átfogó képet kapnak arról, hogy a kurrens technológiák — okoseszközök, közösségi média, virtuális valóság, videójátékok, mesterséges intelligencia — miként formálják az emberi viselkedést, érzelmeket és kognitív folyamatokat. A tárgy emellett bemutatja azokat a fogalmakat és értelmezési kereteket, amelyek az egyének és közösségek digitális technológiákhoz fűződő viszonyát meghatározzák.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "pszichológia",
            "technológia",
            "médiapszichológia",
            "kognitív tudomány",
            "közösségi média",
            "virtuális valóság",
            "elmélet"
          ],
          "cel": "A kurzus célja a multimédia területén használt új technológiák pszichológiai vonatkozásainak ismertetése, hogy a hallgató alkotó-, tervező- és művészi, valamint prezentációs munkájához elméleti megalapozásként és fogalmi kiegészítésként alkalmazhassa. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni és alkalmazni az új technológiák pszichológiai vonatkozásainak elméleti ismeretanyagát, és multimédia designer gyakorlatát szakmai együttműködésekben és szélesebb, interdiszciplináris keretben is el tudja helyezni.",
          "pdfUrl": "/tematikak/12461.pdf",
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Okoseszközök, közösségi média, VR, videójátékok és AI hatása a viselkedésre és a kognitív folyamatokra."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 3. (Média design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": 21,
          "groups": "1",
          "instructors": "Mayer Éva",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét keretében megvalósuló programok a szakmában aktívan dolgozó meghívott előadók prezentációit, mesterkurzusokat, innovációs és technikai témájú előadásokat, workshopokat, konferencia- és kiállításlátogatásokat, valamint közös projektek kivitelezését foglalják magukban. A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át, és a portfólióépítést is támogatja. A teljesítés feltétele a jelenlét és a kijelölt szakmai feladatok határidőre való leadása.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "mesterkurzus",
            "portfólió",
            "projektmunka"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni workshopok, előadások és meghívott előadók által vezetett projektek formájában, a társterületeket érintő alapismeretek és kompetenciák beemelésével, a kreatív ipari szemlélet fejlesztésével és a portfólió építésével.",
          "pdfUrl": "/tematikak/12745.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Szakmai workshopok, mesterkurzusok, kiállításlátogatások és közös projektek, portfólióépítéssel."
        }
      ]
    },
    {
      "version": "2025/2026",
      "program": "BA",
      "semester": 4,
      "label": "Média Design BA 2025/2026",
      "courses": [
        {
          "type": "Kötelező",
          "name": "A képalkotás elmélete",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadássorozat, amely a képalkotás alapvető kérdéseit és a vizuális kommunikáció elméleti hátterét tárgyalja. A kurzus a média design képzés elméleti megalapozását szolgálja, és kollokviummal zárul.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "képalkotás",
            "vizuális kultúra",
            "elmélet",
            "képelmélet",
            "vizuális kommunikáció",
            "média design"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Képelmélet és vizuális kultúra előadássorozat: a kép működése, a vizuális kommunikáció elméleti háttere."
        },
        {
          "type": "Kötelező és szabváll.",
          "name": "A játéktervezés elmélete",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": 21,
          "groups": "1",
          "instructors": "Liszka Tamás",
          "institute": "AMD",
          "note": null,
          "description": "Az előadássorozat egyetlen kérdésre keres választ: hogyan készül egy jól játszható játék? A válaszhoz vezető út a filozófián, etológián, pszichológián, designon és matematikán át a ludológiáig vezet, érintve a műfaj, a célközönség, az interfész, a játékmechanika, a jutalmazási rendszerek és a játékfa-komplexitás kérdéseit. A félév témái között szerepel a motiváció, a learning curve, az elbeszéléstechnika, az immerzió és az interakció, esettanulmányokkal; a vizsgára a hallgatók saját játékkoncepciót fejlesztenek és prezentálnak.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "játéktervezés",
            "game design",
            "ludológia",
            "játékmechanika",
            "immerzió",
            "narratíva",
            "játékelmélet"
          ],
          "cel": "A kurzus célja a játéktervezés elméletének elsajátítása, hogy a hallgató játéktervezői, alkotó-, tervező- és művészi, valamint prezentációs munkájához elméleti megalapozásként és fogalmi kiegészítésként alkalmazhassa. A hallgató képessé válik az elméleti ismeretanyagot játéktervezői gyakorlatában és szélesebb, interdiszciplináris keretben is elhelyezni és képviselni.",
          "pdfUrl": "/tematikak/15031.pdf",
          "category": [
            "játék",
            "elmélet"
          ],
          "group": null,
          "short": "Hogyan készül jól játszható játék? Ludológia, motiváció, jutalmazás, narratíva, immerzió, játékkoncepció."
        },
        {
          "type": "Kötelező",
          "name": "Mozgógrafika 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 21,
          "groups": "2",
          "instructors": "Balogh Áron, Kolosy Becse",
          "institute": "AMD",
          "note": null,
          "description": "A tárgy két specializációs ágon fut: a multimédia ágon a hallgatók a Nuke node-alapú compositing munkafolyamatát sajátítják el a rotoscoping, a 2D/planar tracking, a screen replacement, a keying, valamint a tűz- és muzzle flash-integráció technikáival, a félévet breakdown videóval zárva. A játéktervezés ágon a játékfejlesztéshez szükséges 3D asset-gyártás áll a fókuszban: Blenderben modellezés és UV-kiterítés, Substance Painterben PBR textúrázás, végül riggelés és exportálás Unreal Engine-be.",
          "felelos": "Kiss Melinda",
          "prerequisite": "Mozgógrafika 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Nuke",
            "Blender",
            "Substance Painter",
            "Unreal Engine"
          ],
          "keywords": [
            "vfx",
            "nuke",
            "compositing",
            "rotoscoping",
            "keying",
            "tracking",
            "3d asset",
            "pbr"
          ],
          "cel": "A multimédia specializáción a cél, hogy a hallgatók magabiztosan kezeljék a Nuke szoftvert és junior compositor feladatok önálló elvégzésére váljanak alkalmassá. A játéktervezés specializáción a cél a játékfejlesztéshez szükséges 3D asset-gyártás technikai és művészeti folyamatainak elsajátítása Blender és Substance Painter segítségével.",
          "pdfUrl": "/tematikak/15049.pdf",
          "category": [
            "film/videó",
            "3d",
            "animáció"
          ],
          "group": null,
          "short": "Nuke compositing: roto, tracking, keying — vagy játék-asset: Blender modell, Substance PBR, Unreal export."
        },
        {
          "type": "Kötelező",
          "name": "Hang labor 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 21,
          "groups": "2",
          "instructors": "Kováts Jázon",
          "institute": "AMD",
          "note": null,
          "description": "A Hang labor átfogó bevezetést nyújt a jelenkori média területén elterjedt hangzó technikák alapjaiba, a filmhangkészítés és a foley művészet gyakorlatával. A hallgatók az egyetem hangstúdiójában dolgoznak: mikrofonozási technikákat tanulnak, speechless speech videókat zörejeznek, és csoportban elkészítik egy kiválasztott kisfilm hangját. A hangok szerkesztésén keresztül más művészeti ágakban is alkalmazható tudást szereznek.",
          "felelos": "Balogh Áron Zsigmond Dr.",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Audition",
            "Ableton Live",
            "Max/MSP",
            "PaulXStretch"
          ],
          "keywords": [
            "filmhang",
            "foley",
            "utómunka",
            "hangvágás",
            "hangdesign",
            "zörejezés",
            "hangstúdió"
          ],
          "cel": "A hallgatók elméleti és gyakorlati síkon ismerkednek meg, a filmhang készítésének részleteivel, mind a foley művészettel , mind pedig az utómunka egyes fázisainak fontosabb kérdéseit tekintve át.",
          "pdfUrl": "/tematikak/15038.pdf",
          "category": [
            "hang"
          ],
          "group": null,
          "short": "Filmhang és foley a hangstúdióban: mikrofonozás, zörejezés, kisfilm hangjának csoportos elkészítése."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 4. (Média design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": null,
          "groups": "1",
          "instructors": "Balogh Áron",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át workshopok, előadások és meghívott vendégelőadók által vezetett projektek formájában. A programok között szakmában dolgozó előadók prezentációi, mesterkurzusok, innovációs és technikai bemutatók, konferencia- és kiállításlátogatások, valamint közös projektek szerepelnek. A teljesítés feltétele a jelenlét és a kijelölt szakmai feladatok határidőre való leadása.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "mesterkurzus",
            "portfólió",
            "ba"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak, workshopok, előadások és meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, akár vendégelőadók, akár közös programok formájában. A tárgy keretében megvalósulnak a MyBrand szemlélet alappillérei: a különböző szakterületek találkozása, a tudás- és kompetenciaelemek egymásra épülése, a kreatív iparban használatos szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/15056.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, vendégelőadók, kiállítás- és konferencialátogatás; portfólióépítés."
        },
        {
          "type": "Kötelező",
          "name": "Multimédia design 2.",
          "specialization": "Multimédia specializáció",
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 11,
          "groups": "1",
          "instructors": "Balogh Áron",
          "institute": "AMD",
          "note": null,
          "description": "A tantárgy során a hallgatók a hagyományos HTML oldalak építése felől a modern, dinamikus webes alkalmazások irányába mozdulnak el: megtanulják a Git verziókezelést, a React és Next.js komponensalapú architektúráját, valamint a Tailwind CSS-alapú reszponzív stílusozást. Kiemelt szerepet kap az AI-asszisztált és agent alapú fejlesztés (Cursor, GitHub Copilot, Gemini, Claude) és a prompt engineering, valamint a React Three Fiber webes 3D lehetőségei. A félév végére mindenki egy saját, Vercelen publikált, interaktív 3D elemeket tartalmazó portfólió oldalt épít.",
          "felelos": "Kiss Melinda",
          "prerequisite": "Multimédia design 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "React",
            "Next.js",
            "Tailwind CSS",
            "React Three Fiber",
            "Cursor",
            "GitHub Copilot",
            "Git",
            "Vercel"
          ],
          "keywords": [
            "webfejlesztés",
            "react",
            "next.js",
            "tailwind",
            "react three fiber",
            "ai kódolás",
            "prompt engineering",
            "portfólió"
          ],
          "cel": "A kurzus célja a modern webfejlesztési technológiák és a mesterséges intelligencia asszisztált kódolás gyakorlati bemutatása. A hallgatók az alapvető statikus weblapkészítési tudásukat továbbfejlesztve megismerkednek a modern komponensalapú architektúrákkal (React, Next.js), a Tailwind CSS-alapú vizuális építkezéssel és a látványos Web3D megoldások integrálásával. A félév végére a hallgatók képesek lesznek önállóan felépíteni egy magas színvonalú, modern technológiákra épülő interaktív portfólió oldalt.",
          "pdfUrl": "/tematikak/15050.pdf",
          "category": [
            "web",
            "fejlesztés",
            "ai"
          ],
          "group": null,
          "short": "React, Next.js, Tailwind, AI-asszisztált kódolás és Web3D (R3F); interaktív portfólió-oldal Vercelen."
        },
        {
          "type": "Kötelező",
          "name": "3D labor (Multimédia) 2.",
          "specialization": "Multimédia specializáció",
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 11,
          "groups": "1",
          "instructors": "Berkes Bálint",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a 3D terek immerzív rétegeit mélyíti el a mozgás beemelésével: a hallgatók a Blender-alapozás után áttérnek a Maxon Cinema4D-re, és megismerkednek a motion design, a CGI, a VFX és a motion capture világával. A félév témái az animálás 12 törvénye, a Mograph rendszer, a karaktercsontozás és a Rokoko-alapú motion capture, a fizikai, ruha- és organikus (részecske, pyro) szimulációk, valamint a valós idejű renderelés Unreal Engine-ben. Az egyéni projektfeladat egy folytatólagos animáció készítése, amely csapatszinten egy közös történetté áll össze.",
          "felelos": "Balogh Áron Zsigmond Dr.",
          "prerequisite": "3D labor (Multimédia) 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Cinema 4D",
            "Unreal Engine",
            "Rokoko"
          ],
          "keywords": [
            "cinema 4d",
            "motion design",
            "mograph",
            "motion capture",
            "szimuláció",
            "3d animáció",
            "unreal engine"
          ],
          "cel": "A kurzus célja a média designon belül a multimédia-specifikus képalkotás eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai szemléleti) tudásának elsajátítása középhaladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni, felhasználni és prezentálni a multimédia-specifikus képalkotás területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/15030.pdf",
          "category": [
            "3d",
            "animáció"
          ],
          "group": null,
          "short": "Cinema 4D motion design: animálás 12 törvénye, Mograph, motion capture, szimulációk, Unreal render."
        },
        {
          "type": "Kötelező",
          "name": "Game Art és Design 2.",
          "specialization": "Játéktervezés specializáció",
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 10,
          "groups": "1",
          "instructors": "Pápai Bence",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a videojátékot mint interaktív médiumot vizsgálja, ahol a tartalom, a vizuális megjelenés és az interakció egységben határozzák meg az élményt, különös tekintettel a game art és a game design kapcsolatára. A félév a játékprototipizálásra épül: paper prototyping, core mechanics tesztelése, level design alapok, UI/UX wireframe-ek, playtesting és vertical slice készítése. A hallgatók a korábbi félév társasjáték-projektjét adaptálják digitális formába, és a félév végére egy játszható, placeholder assetekkel működő videojáték-prototípust készítenek és prezentálnak.",
          "felelos": "Balogh Áron Zsigmond Dr.",
          "prerequisite": "Game Art és Design 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Unity"
          ],
          "keywords": [
            "videojáték",
            "game design",
            "game art",
            "prototípus",
            "playtesting",
            "level design",
            "interaktív médium"
          ],
          "cel": "A tantárgy célja, hogy a hallgatók elmélyítsék ismereteiket a videojáték mint interaktív médium működéséről, és képessé váljanak a vizuális és tervezési döntések játékbeli következményeinek felismerésére, valamint digitális játékok tervezési folyamataiban közvetlenül alkalmazható koncepciók és struktúrák kialakítására.",
          "pdfUrl": "/tematikak/14800.pdf",
          "category": [
            "játék",
            "ux/interakció"
          ],
          "group": null,
          "short": "Játékprototipizálás: paper prototyping, level design, UI/UX wireframe, playtesting; vertical slice Unityben."
        },
        {
          "type": "Kötelező",
          "name": "3D labor (Játéktervezés) 2.",
          "specialization": "Játéktervezés specializáció",
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 10,
          "groups": "1",
          "instructors": "Gerő András",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a valós idejű játékmotoros fejlesztés objektumorientált és komponensalapú gondolkodását alkalmazza a gyakorlatban Unreal Engine környezetben. A hallgatók megismerik az engine architektúráját (GameMode, Actor, Blueprint), a level design alapjait, a textúra- és material-készítést, a világítást, a post processt, a kamerakezelést és a szekvencia-alapú renderelést. A félév egy önálló projekttel zárul: hangulatos jelenet vagy dioráma készül professzionálisan komponált videórenderekkel.",
          "felelos": "Balogh Áron Zsigmond Dr.",
          "prerequisite": "3D labor (Játéktervezés) 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Unreal Engine",
            "Blender",
            "Photoshop"
          ],
          "keywords": [
            "unreal engine",
            "blueprint",
            "real-time",
            "level design",
            "material",
            "világítás",
            "játékmotor"
          ],
          "cel": "A tantárgy célja a hallgatók bevezetése a 3D digitális tartalomkészítés gyakorlati alapjaiba valós idejű engine környezetben, hogy képesek legyenek egyszerű, működő real-time jelenetek és prototípusok létrehozására, és tudatosan kezeljék a 3D tartalom és az interaktív működés kapcsolatát a játékfejlesztési folyamaton belül.",
          "pdfUrl": "/tematikak/14786.pdf",
          "category": [
            "3d",
            "játék",
            "fejlesztés"
          ],
          "group": null,
          "short": "Unreal Engine: blueprintek, level design, materialok, világítás, post process; dioráma videórenderrel."
        }
      ]
    },
    {
      "version": "2025/2026",
      "program": "BA",
      "semester": 5,
      "label": "Média Design BA 2025/2026",
      "courses": [
        {
          "type": "Kötelező és szabváll.",
          "name": "Gazdasági, menedzsment és jogi ismeretek",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": 226,
          "groups": "3",
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Előadás jellegű elméleti kurzus, amely a kreatív szakmák gyakorlásához szükséges alapvető gazdasági, menedzsment- és jogi ismereteket adja át. A hallgatók áttekintést kapnak a szakmai működésüket érintő üzleti és jogi keretekről. A tárgy kollokviummal zárul.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "gazdaság",
            "menedzsment",
            "jog",
            "vállalkozás",
            "kreatív ipar",
            "üzleti ismeretek"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Kreatív ipari működés üzleti és jogi keretei: vállalkozási, gazdálkodási és menedzsmentalapok."
        },
        {
          "type": "Kötelező",
          "name": "A játéktervezés elmélete",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": 13,
          "groups": "1",
          "instructors": "Liszka Tamás",
          "institute": "AMD",
          "note": null,
          "description": "Az előadássorozat egyetlen kérdésre keres választ: hogyan készül egy jól játszható játék? A válaszhoz a ludológia, a pszichológia, a matematikai játékelmélet, a design és az elbeszéléstechnika területein keresztül jut el, olyan témákat érintve, mint a játékmechanika, a jutalmazási rendszerek, a learning curve, az immerzió és az interakció. A félév végén a hallgatók saját fejlesztésű, innovatív játékkoncepciót prezentálnak, és szakmailag indokolják alkotói döntéseiket.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "játéktervezés",
            "game design",
            "elmélet",
            "játékmechanika",
            "ludológia",
            "narratíva",
            "immerzió",
            "játékelmélet"
          ],
          "cel": "A kurzus célja a játéktervezés elméletének elsajátítása, hogy a hallgató azt játéktervezői, alkotó-, tervező- és művészi, valamint prezentációs munkájához elméleti megalapozásként és fogalmi kiegészítésként alkalmazhassa. A kurzus elvégzésével a hallgató képes haladó szinten felismerni, elemezni és alkalmazni az elméleti ismeretanyagot, és játéktervezői gyakorlatát szakmai együttműködésekben, interdiszciplináris keretben is képviselni tudja.",
          "pdfUrl": "/tematikak/15031.pdf",
          "category": [
            "játék",
            "elmélet"
          ],
          "group": null,
          "short": "Hogyan készül jól játszható játék? Ludológia, játékmechanika, jutalmazási rendszerek, immerzió, narratíva."
        },
        {
          "type": "Kötelező",
          "name": "Média design stúdiumok 5.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 26,
          "groups": "3",
          "instructors": "Pálfi Szabolcs",
          "institute": "AMD",
          "note": null,
          "description": "A tantárgy ebben és a következő félévben a videojátékok tervezési szempontjainak gyakorlati alkalmazására fókuszál, kiemelten a vizuális megjelenítésre, az ergonómiára és a funkcionalitásra. A hallgatók a game design és a game art alapjaival párhuzamosan ismerkednek, és egy saját videojátékot fejlesztenek az ötlettől a játszható prototípusig és a game design dokumentumig. Emellett megismerkednek olyan kapcsolódó technológiákkal, mint a LED fal rendszerek, a VR környezetek, a 3D szkennelés, a MoCap és a mesterséges intelligencia céltudatos használata.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "Média design stúdiumok 4.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Unity",
            "Unreal Engine",
            "Blender"
          ],
          "keywords": [
            "médiatervezés",
            "interaktív",
            "non-lineáris",
            "haladó",
            "game design",
            "game art",
            "játékfejlesztés",
            "prototípus"
          ],
          "cel": "A kurzus célja, hogy a hallgatók haladó szinten sajátítsák el a digitális médiatervezéshez kapcsolódó eszközismereti, alkotói és esztétikai szemléletmódot, különös tekintettel az interaktív, non-lineáris, élményspecifikus vizuális tartalmakra. A kurzus támogatja a komplex gondolkodásmód kialakítását, amelyben a technikai tudás, a vizuális érzékenység és a tervezői szemlélet integráltan jelenik meg.",
          "pdfUrl": "/tematikak/12462.pdf",
          "category": [
            "játék",
            "projekt"
          ],
          "group": null,
          "short": "Saját videojáték az ötlettől a játszható prototípusig: game design, game art, GDD (Unity, Unreal, Blender)."
        },
        {
          "type": "Kötelező",
          "name": "Média labor 3.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 6,
          "credits": 7,
          "active": 26,
          "groups": "3",
          "instructors": "Madácsi Blanka, Berkes Bálint",
          "institute": "AMD",
          "note": null,
          "description": "Kétmodulos gyakorlati kurzus. Az egyik modul a digitális utómunka és a 3D tartalomkészítés területét mélyíti el a VFX gyártási folyamatra fókuszálva: haladó compositing Nuke-ban, modellezés, UV mapping, animáció és renderelés Mayában, valamint PBR textúrázás Substance 3D Painterben, a félév végére egy komplex VFX-shot vagy 3D jelenet elkészítésével. A másik modul a fényművészettel és a projection mappinggel foglalkozik: a hallgatók a Resolume Arena szoftverrel terveznek és kiviteleznek vetítéses installációkat, a munkáikat dokumentálva.",
          "felelos": "Mayer Éva",
          "prerequisite": "Média labor 2.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Nuke",
            "Maya",
            "Substance Painter",
            "Resolume Arena"
          ],
          "keywords": [
            "compositing",
            "vfx",
            "3d modellezés",
            "textúrázás",
            "projection mapping",
            "fényművészet",
            "installáció",
            "renderelés"
          ],
          "cel": "A tantárgy célja egyrészt a digitális utómunka és a 3D tartalomkészítés ismereteinek elmélyítése ipari sztenderdek szerint, másrészt a fény művészi alkalmazásának elméleti és gyakorlati elsajátítása multimédiás technológiák segítségével, saját fényalapú alkotások és installációk létrehozásával.",
          "pdfUrl": "/tematikak/12463.pdf",
          "category": [
            "3d",
            "film/videó",
            "installáció"
          ],
          "group": null,
          "short": "VFX-pipeline: Nuke compositing, Maya modellezés, Substance textúrázás + projection mapping (Resolume)."
        },
        {
          "type": "Kötelező és szabváll.",
          "name": "Ökológia és művészet",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": 39,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Előadás jellegű elméleti kurzus, amely az ökológia és a művészet kapcsolatát vizsgálja. A hallgatók áttekintést kapnak a környezeti kérdések művészeti reflexióiról és a fenntarthatóság szempontjainak alkotói vonatkozásairól. A tárgy kollokviummal zárul.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "ökológia",
            "művészet",
            "fenntarthatóság",
            "környezet",
            "kortárs művészet",
            "elmélet"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Környezeti kérdések művészeti reflexiói: fenntarthatóság és ökológiai szemlélet a kortárs alkotásokban."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 5. (Média design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": null,
          "active": 26,
          "groups": "1",
          "instructors": "Mayer Éva",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át workshopok, előadások és meghívott előadók által vezetett projektek formájában. A programok között szerepelnek szakmai prezentációk, mesterkurzusok, innovációs és technikai bemutató előadások, konferencia- és kiállításlátogatások, valamint közös projektek kivitelezése. A teljesítés feltétele a jelenlét és a kijelölt szakmai feladatok határidőre való leadása.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "projektmunka",
            "mesterkurzus",
            "portfólió",
            "ba"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak workshopok, előadások és meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, akár vendégelőadók, akár közös programok formájában. A tárgy keretében megvalósulnak a MyBrand szemlélet fontos alappillérei: különböző szakterületek találkozása, a tudás- és kompetenciaelemek egymásra épülése, a kreatív iparban használatos szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/12747.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, vendégelőadók, kiállítás- és konferencialátogatás, közös projektek."
        }
      ]
    },
    {
      "version": "2025/2026",
      "program": "BA",
      "semester": 6,
      "label": "Média Design BA 2025/2026",
      "courses": [
        {
          "type": "Kötelező",
          "name": "Interaktív grafika",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 26,
          "groups": "3",
          "instructors": "Berkes Bálint",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a fény médiumának kreatív, interdiszciplináris alkalmazására összpontosít, különös tekintettel a vetítéses technikákra (projection mapping) és a generatív, valós idejű vizualizációra. A hallgatók TouchDesigner, Unreal Engine és Cinema 4D segítségével hang- és mozgásreaktív vizuálokat, interaktív installációkat készítenek, és megismerkednek a DMX, Art-Net, OSC és MIDI rendszerekkel. A félév során egy szimulált megrendelői helyzetben csoportos vetítést terveznek a Budapesti Metropolitan Egyetem körépületére, amelyet kiállítás keretében mutatnak be.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "TouchDesigner",
            "Unreal Engine",
            "Cinema 4D",
            "After Effects"
          ],
          "keywords": [
            "unreal engine",
            "touchdesigner",
            "valós idejű",
            "vetítés",
            "interaktív",
            "mapping",
            "generatív",
            "fényművészet"
          ],
          "cel": "A kurzus célja, hogy a hallgatók valós munkaszituációkhoz hasonló környezetben sajátítsák el a vetítéses technikák alkalmazását, a kreatív döntéshozatalt és a csapatmunkát. Egy fiktív megrendelő fokozatosan megismert igényei alapján kell vetítésterveket készíteniük egy valós helyszínre, rugalmasan alkalmazkodva az új követelményekhez és technikai megkötésekhez.",
          "pdfUrl": "/tematikak/15040.pdf",
          "category": [
            "installáció",
            "ux/interakció",
            "animáció"
          ],
          "group": null,
          "short": "Projection mapping, hang- és mozgásreaktív vizuálok (TouchDesigner, Unreal, DMX) a körépületre."
        },
        {
          "type": "Kötelező",
          "name": "Média design stúdiumok 6.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 26,
          "groups": "3",
          "instructors": "Pálfi Szabolcs",
          "institute": "AMD",
          "note": null,
          "description": "A videojáték-tervezés gyakorlati megvalósítására épülő kurzus, amely az előző félév technikai ismereteire alapozva a játéktervezés strukturális és komplex folyamatát, valamint a kiegészítő szakágakat vizsgálja egyéni és csoportos munkában. A hallgatók saját játékötletet fejlesztenek, miközben a narratíva, a tér- és karaktertervezés, a játékmechanikák és a UX kapcsolatát elemzik esettanulmányokon és prezentációkon keresztül. A félév részét képezi meghívott előadó és stúdiólátogatás is, a tervezésmódszertan pedig a diplomamunkára készít fel.",
          "felelos": "Molnár Ágnes Éva",
          "prerequisite": "Média design stúdiumok 5.",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "videojáték",
            "játéktervezés",
            "narratíva",
            "játékmechanika",
            "csapatmunka",
            "prototípus",
            "médiadesign"
          ],
          "cel": "A tantárgy célja a hallgatók bevezetése a számítógépes játékfejlesztés világába a játéktervezés elméleti alapjainak elsajátításán és gyakorlati alkalmazásán keresztül: a játékfejlesztői workflow fázisainak, a népszerű játékzsánereknek, a fejlesztői eszközöknek és a tervezési folyamatoknak a megismerése.",
          "pdfUrl": "/tematikak/15046.pdf",
          "category": [
            "játék",
            "projekt"
          ],
          "group": null,
          "short": "Videojáték-tervezés csoportban: játékötlet fejlesztése — narratíva, tér- és karaktertervezés, mechanikák."
        },
        {
          "type": "Kötelező",
          "name": "Új média kritikai stúdiumok",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": 26,
          "groups": "1",
          "instructors": "Szacsvai Pál",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus az újmédia elméletének folyamatosan megújuló irodalmát követi, ismerteti és értelmezi, a hallgatók aktív reflexióira építő eszmecsere formájában. Az olvasott szövegekből inspirált elméleti perspektívából elemzi kritikailag a technológiai innováció újabb fordulatait, kiemelt témái között a gépi kreativitás, a mesterséges intelligencia és művészet viszonya, valamint az algoritmusok szerepe szerepel. A félév végén írásbeli vizsga zárja a tárgyat.",
          "felelos": "Mayer Éva",
          "prerequisite": "-",
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "új média",
            "kritikai elmélet",
            "médiaelmélet",
            "mesterséges intelligencia",
            "generatív művészet",
            "algoritmus",
            "elmélet"
          ],
          "cel": "A kurzus célja, hogy a hallgatók megismerkedjenek az új médiumok kritikai elméletével, annak érdekében, hogy azt elméleti alapként és koncepcionális kiegészítésként alkalmazhassák médiatervezési tanulmányaik és gyakorlataik, valamint művészi munkájuk és prezentációs feladataik során.",
          "pdfUrl": "/tematikak/15054.pdf",
          "category": [
            "elmélet",
            "ai"
          ],
          "group": null,
          "short": "Újmédia-elmélet szövegolvasással: gépi kreativitás, AI és művészet, algoritmusok kritikai elemzése."
        },
        {
          "type": "Kötelező",
          "name": "Szakdolgozat készítése (Média design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 2,
          "active": 26,
          "groups": "3",
          "instructors": "Kollár Dávid",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a szakdolgozat és általában a tudományos írásművek elkészítésének teljes folyamatát dolgozza fel: az anyaggyűjtést, a forrásfeldolgozást, a hivatkozási formákat, a szövegstruktúra és a tartalomjegyzék kialakítását, végül a tanulmány megírását. A hallgatók a félév során órai és otthoni feladatokon, forráselemzéseken keresztül jutnak el a beadandó záródolgozatig, és külön téma a szakszövegírás és az AI viszonya is.",
          "felelos": "Mayer Éva",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "szakdolgozat",
            "kutatás",
            "írás",
            "forrásfeldolgozás",
            "hivatkozás",
            "kutatásmódszertan",
            "ba"
          ],
          "cel": "A kurzus célja a szakdolgozat készítéséhez szükséges elméleti és gyakorlati tudás és képességek elsajátítása, hogy a hallgató megfelelő színvonalú írásművet legyen képes alkotni a BA tanulmányait lezáró időszakban. A kurzus elvégzése eredményeképpen a hallgató képes haladó szinten felismerni, elemezni, érteni és értekező prózai szinten a gyakorlatban alkalmazni az elsajátított elméleti ismeretanyagot, és szakdolgozata révén a BA tanulmányai alatt megszerzett szakmai tudását a megfelelő szakmai fórumokon és a szélesebb, interdiszciplináris mezőnyben érdemben képviselni.",
          "pdfUrl": "/tematikak/15055.pdf",
          "category": [
            "diploma/portfólió",
            "elmélet"
          ],
          "group": null,
          "short": "Tudományos írás lépésről lépésre: forrásgyűjtés, hivatkozás, szövegstruktúra, kutatásmódszertan, AI-használat."
        },
        {
          "type": "Kötelező",
          "name": "Diplomatervezési feladat (Média design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 6,
          "credits": 8,
          "active": 26,
          "groups": "3",
          "instructors": "Forgács Kristóf, Nikázy Gusztáv",
          "institute": "AMD",
          "note": null,
          "description": "A diplomamunkára felkészítő gyakorlati kurzus két blokkban zajlik. Az egyik blokkban a hallgatók a diplomamunkájukhoz kapcsolódó önálló online médiaterméket terveznek és fejlesztenek: felülettervező szoftverekben (Figma/Penpot) prototípust készítenek, majd dokumentum- és stílusleíró nyelvekkel működő felületté fejlesztik, túllépve a sablonos UX/UI megoldásokon. A másik blokk a diploma projektszerű kezelésére (ütemezés, mérföldkövek), a diplomaprezentáció gyakorlására, valamint a portfólió és showreel összeállítására fókuszál, két kötelező központi konzultációval.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Figma",
            "Penpot"
          ],
          "keywords": [
            "diploma",
            "portfólió",
            "showreel",
            "prototípus",
            "webdesign",
            "prezentáció",
            "projekttervezés"
          ],
          "cel": "A kurzus célja a diplomamunkához szükséges eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai) ismeretek elsajátítása, kreatív készségek kifejlesztése, prezentációs és médiatervezési tudás megszerzése. A hallgató a kurzus elvégzése eredményeképpen képes felismerni, elemezni, érteni és alkalmazni a diplomamunkája elkészítéséhez elengedhetetlen ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat, valamint képes értékelni a szakmai területen belül elfoglalt pozícióját és alkalmazni tudását a kreatív iparban és a médiaművészeti szcénában.",
          "pdfUrl": "/tematikak/15036.pdf",
          "category": [
            "diploma/portfólió",
            "web",
            "ux/interakció"
          ],
          "group": null,
          "short": "Diplomához kapcsolódó online médiatermék (Figma/Penpot prototípus, webfejlesztés) + portfólió és showreel."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 6. (Média design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": null,
          "groups": "1",
          "instructors": "Pálfi Szabolcs",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át workshopok, előadások és meghívott előadók által vezetett projektek formájában. A programok között szerepel gyakorló szakemberek prezentációja, mesterkurzus, innovációs és technikai bemutató előadás, konferencia- és kiállításlátogatás, valamint közös projektek kivitelezése. A teljesítés feltétele a jelenlét és a kijelölt szakmai feladatok határidőre való leadása.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "mesterkurzus",
            "vendégelőadó",
            "projektmunka",
            "ba"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak, workshopok, előadások és meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, valamint a MyBrand szemlélet alappilléreinek megvalósítása: különböző szakterületek találkozása, tudás- és kompetenciaelemek egymásra épülése, a kreatív iparban használatos szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/15058.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, vendégelőadók, konferencia- és kiállításlátogatás a tantervi kereteken túl."
        }
      ]
    },
    {
      "version": "2025/2026",
      "program": "MA",
      "semester": 1,
      "label": "Média Design MA 2025/2026",
      "courses": [
        {
          "type": "Kötelező",
          "name": "3D tervezés és szimuláció 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 13,
          "groups": "2",
          "instructors": "Tóth Gergő",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a 3D-s tervezés alapjait ismerteti meg az Autodesk Maya szoftver segítségével. Gyakorlati feladatokon keresztül a hallgatók virtuális térben létrehozott helyszínekkel dolgoznak: poligonmodellezés, UV-kezelés, textúrázás, világítás és kameramozgatás, valamint Arnold renderelés, layer- és pass-alapú renderelés (AOV-k). A félév a szimulációs eszközöket is érinti: szilárd test, fény, folyadék, haj és ruha szimulációja. A félév végére a hallgatók egy rövid renderelt animációt készítenek.",
          "felelos": "Balogh Áron Zsigmond Dr.",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Maya",
            "Arnold"
          ],
          "keywords": [
            "3d modellezés",
            "szimuláció",
            "maya",
            "textúrázás",
            "render",
            "világítás",
            "uv",
            "arnold"
          ],
          "cel": "A kurzus célja a 3D modellezés és szimuláció eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai) elsajátítása haladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni és felhasználni, valamint prezentálni a 3D modellezés és szimuláció területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/12453.pdf",
          "category": [
            "3d"
          ],
          "group": null,
          "short": "Maya-alapú 3D: poligonmodellezés, UV, textúrázás, világítás, Arnold render, AOV-k; félévvégi animáció."
        },
        {
          "type": "Kötelező",
          "name": "Interaktív rendszerek 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 13,
          "groups": "2",
          "instructors": "Varga Vajk, Polena Réka",
          "institute": "AMD",
          "note": null,
          "description": "A szemeszter során a hallgatók az egyszerű interaktív rendszerek tervezéséhez szükséges tudásanyagot sajátítják el gyakorlati feladatokon keresztül: elektronikai alapismeretek, mikrokontrollerekkel épített interaktív architektúrák, valamint a TouchDesigner szoftver és a Microsoft Kinect kombinált használata. A feladatok különböző interfészépítési lehetőségek és komplex interaktív művészeti installációk megvalósítására készítenek fel; a félév végén a hallgatók saját multimédiás interaktív installáció tervét készítik el és prezentálják.",
          "felelos": "Sterk Barbara DLA",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "TouchDesigner",
            "Arduino",
            "Kinect"
          ],
          "keywords": [
            "mikrokontroller",
            "elektronika",
            "touchdesigner",
            "interaktív installáció",
            "arduino",
            "kinect",
            "adatvizualizáció",
            "vj"
          ],
          "cel": "A kurzus célja alapvető elektronikai ismeretek és a mikrokontrollerek használatával kapcsolatos gyakorlati tudás elsajátítása, valamint ezek alkalmazása ipari és képzőművészeti területen. A hallgató a kurzus után képes haladó szinten analóg és szoftveres eszközökkel vezérelhető interaktív elektronikai rendszereket létrehozni.",
          "pdfUrl": "/tematikak/12466.pdf",
          "category": [
            "ux/interakció",
            "installáció"
          ],
          "group": null,
          "short": "Elektronika, mikrokontrollerek, TouchDesigner és Kinect: interaktív installáció tervezése, VJ-alapok."
        },
        {
          "type": "Kötelező",
          "name": "Kortárs művészetelmélet",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": 192,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadás-kurzus, amely a kortárs művészet elméleti megközelítéseivel és diskurzusaival foglalkozik. A tárgy célja, hogy a hallgatók a média design MA tanulmányaikhoz elméleti és fogalmi hátteret kapjanak a kortárs művészeti jelenségek értelmezéséhez és kritikai elemzéséhez. A kurzus kollokviummal zárul.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "kortárs művészet",
            "művészetelmélet",
            "elmélet",
            "esztétika",
            "kritikai gondolkodás",
            "kortárs tendenciák"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Kortárs művészeti jelenségek értelmezése, kritikai elemzése; elméleti és fogalmi háttér az MA-munkákhoz."
        },
        {
          "type": "Kötelező",
          "name": "Kommunikációs rendszerek és vizuális nyelvek",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": 13,
          "groups": "1",
          "instructors": "Kollár Dávid",
          "institute": "ELM",
          "note": null,
          "description": "Az előadás-kurzus a kommunikációs rendszerek és vizuális nyelvek elméleti és gyakorlati dimenzióit vizsgálja kritikai módon, kortárs kommunikációtudományi, filozófiai és szociológiai perspektívákból. Témái között szerepel a nyelv előtti és nonverbális kommunikáció, a vizuális kultúra és képfilozófia, a digitális kommunikáció és hálózatelméletek, a közösségi média és algoritmusos kommunikáció, a filmnyelvi eszközök, valamint az AI és a poszthumán kommunikáció. A hallgatók képessé válnak médiadesign-munkájukat elméleti keretekben kontextualizálni.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "-",
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "vizuális nyelv",
            "kommunikáció",
            "elmélet",
            "jelrendszer",
            "médiaelmélet",
            "vizuális kultúra",
            "hálózatelmélet"
          ],
          "cel": "A kurzus célja a kommunikációs rendszerek és vizuális nyelvek elméleti területének ismertetése, hogy a hallgató média designeri, alkotó-, tervező- és művészi, valamint prezentációs munkájához elméleti megalapozásként és fogalmi kiegészítésként alkalmazhassa, és tervezői gyakorlatát interdiszciplináris keretben is konceptualizálni, képviselni tudja.",
          "pdfUrl": "/tematikak/12468.pdf",
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Nonverbális és digitális kommunikáció, képfilozófia, hálózatelméletek, közösségi média, filmnyelv, AI."
        },
        {
          "type": "Kötelező",
          "name": "Médiakultúra",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": 67,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadás-kurzus, amely a médiakultúra jelenségeivel, a média és a kultúra kölcsönhatásaival foglalkozik. A tárgy a média design MA képzés elméleti megalapozását szolgálja, segítve a hallgatókat a médiajelenségek kulturális és társadalmi kontextusban való értelmezésében. A kurzus kollokviummal zárul.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "médiakultúra",
            "médiaelmélet",
            "elmélet",
            "média",
            "kultúra",
            "médiatudomány"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Média és kultúra kölcsönhatásai: médiajelenségek értelmezése társadalmi, kulturális kontextusban."
        },
        {
          "type": "Kötelező",
          "name": "Médiatervezés 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 6,
          "credits": 7,
          "active": 13,
          "groups": "2",
          "instructors": "Németi Fanni, Forgács Kristóf",
          "institute": "AMD",
          "note": null,
          "description": "Két modulból álló gyakorlati kurzus. Az A modulban a hallgatók az Adobe After Effects elmélyült használatát sajátítják el egy féléven átívelő feladaton keresztül: egy szabadon választott filmhez terveznek alternatív főcímet, amelyhez képes forgatókönyvet és látványterveket készítenek, majd a videót After Effectsben állítják össze. A B modulban tervezésmódszertani gyakorlatok és művészeti kutatás után egy fiktív karakter social media oldalát alkotják meg, eredeti posztokkal és dokumentációval.",
          "felelos": "Molnár Ágnes Éva",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "After Effects",
            "Photoshop",
            "Illustrator"
          ],
          "keywords": [
            "médiatervezés",
            "after effects",
            "főcímtervezés",
            "mozgógrafika",
            "storyboard",
            "social media",
            "tervezésmódszertan"
          ],
          "cel": "A kurzus célja a médiatervezés eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai szemléleti) elsajátítása haladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni és felhasználni, valamint prezentálni a médiatervezés területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/12773.pdf",
          "category": [
            "animáció",
            "2d",
            "projekt"
          ],
          "group": null,
          "short": "Alternatív filmfőcím After Effectsben (storyboard, látványterv) + fiktív karakter social media oldala."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 1. (Média design MA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": 13,
          "groups": "1",
          "instructors": "Forgács Kristóf",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át workshopok, meghívott előadók prezentációi, mesterkurzusok, innovációs és technikai bemutató előadások, konferenciarészvétel, kiállításlátogatás és közös projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, valamint a kreatív iparban használatos szemlélet és a portfólió fejlesztése. A teljesítés feltétele a jelenlét és a kijelölt szakmai feladatok határidőre való leadása.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "mesterkurzus",
            "konferencia",
            "portfólió",
            "ma"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak, workshopok, előadások és meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, valamint a kreatív iparban használatos szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/12744.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, meghívott előadók, konferencia- és kiállításlátogatás; portfólióépítés."
        },
        {
          "type": "Kötelező",
          "name": "Egalizáló tárgy 1. (Média design stúdiumok 1.)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": "1",
          "instructors": "Varga Vajk",
          "institute": "AMD",
          "note": null,
          "description": "Felzárkóztató kurzus, amelyen a különböző szakokról érkező hallgatók a médiaművészet és médiadesign alapjaival ismerkednek meg: képszerkesztés (Photoshop), vektorgrafika (Illustrator), kézi rajz és térábrázolás, fotózás, videóvágás és fényelés (Premiere Pro, After Effects), programozás (C# és Arduino), valamint 3D modellezés (Blender). A kurzus elméleti és gyakorlati készségeket egyaránt fejleszt, a feladatokból a hallgatók egyéni portfóliót építenek.",
          "felelos": "Balogh Áron Zsigmond Dr.",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Photoshop",
            "Illustrator",
            "Premiere Pro",
            "After Effects",
            "Blender",
            "Arduino",
            "C#"
          ],
          "keywords": [
            "felzárkóztató",
            "képszerkesztés",
            "vektorgrafika",
            "videóvágás",
            "programozás",
            "3d modellezés",
            "fotózás",
            "kézi rajz"
          ],
          "cel": "A tárgy célja, hogy a különböző szakokról érkező hallgatókat technikailag felzárkóztassa a médiadesign alapképzésének szintjére.",
          "pdfUrl": "/tematikak/12510.pdf",
          "category": [
            "2d",
            "3d",
            "fejlesztés"
          ],
          "group": null,
          "short": "Felzárkóztató: Photoshop, Illustrator, kézi rajz, fotó, Premiere-vágás, C#/Arduino, Blender 3D; portfólió."
        }
      ]
    },
    {
      "version": "2025/2026",
      "program": "MA",
      "semester": 2,
      "label": "Média Design MA 2025/2026",
      "courses": [
        {
          "type": "Kötelező",
          "name": "Kritikai kultúrakutatás",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadás, amely a kritikai kultúrakutatás megközelítéseivel foglalkozik: a kultúra, a média és a társadalom összefüggéseit vizsgálja kritikai nézőpontból. A kurzus a hallgatók elemző és kritikai gondolkodását fejleszti a kortárs kulturális jelenségek értelmezésében.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "kultúrakutatás",
            "kritikai elmélet",
            "média",
            "társadalom",
            "kultúra",
            "elmélet"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Kultúra, média és társadalom összefüggései kritikai nézőpontból; kortárs kulturális jelenségek elemzése."
        },
        {
          "type": "Kötelező",
          "name": "Környezetpszichológia kortárs kérdésfeltevései",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadás, amely a környezetpszichológia kortárs kérdésfeltevéseit tárgyalja: az ember és az épített, illetve természeti környezet kölcsönhatásának pszichológiai vonatkozásait. A kurzus a tervezői munkát megalapozó szemléletet ad a terek észlelésének és használatának megértéséhez.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "környezetpszichológia",
            "pszichológia",
            "épített környezet",
            "tér",
            "észlelés",
            "elmélet"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Ember és épített/természeti környezet kölcsönhatása: terek észlelése és használata tervezői szemmel."
        },
        {
          "type": "Kötelező",
          "name": "Integrált társművészeti gyakorlat",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "AMD",
          "note": null,
          "description": "Gyakorlati kurzus, amelyben a hallgatók különböző művészeti területek találkozásán alapuló, integrált alkotói munkát végeznek. A társművészeti együttműködés során interdiszciplináris projektekben fejlesztik tervezői és alkotói kompetenciáikat.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "társművészet",
            "interdiszciplináris",
            "együttműködés",
            "projektmunka",
            "alkotás",
            "gyakorlat"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Művészeti területek találkozása: interdiszciplináris, csoportos projektek, közös alkotói munka."
        },
        {
          "type": "Kötelező",
          "name": "Médiatervezés 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 6,
          "credits": 7,
          "active": 16,
          "groups": "2",
          "instructors": "Kolosy Becse, Madácsi Blanka",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a videójáték-fejlesztés teljes vizuális pipeline-ját fedi le két egymásra épülő blokkban: az egyikben a hallgatók Maya és Substance Painter használatával készítenek game-ready 3D asseteket, karaktereket, UV-térképeket, PBR textúrákat, valamint keyframe és motion capture alapú animációkat. A másik blokkban az Unreal Engine környezetben valósítanak meg videójáték-demót: assetintegráció, landscape, materialök, fényelés, blueprint alapú interakciók és karakteranimációk. A félév végére portfólióba illeszthető assetcsomag és játszható demo készül.",
          "felelos": "Molnár Ágnes Éva",
          "prerequisite": "Médiatervezés 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Maya",
            "Substance Painter",
            "Unreal Engine",
            "Rokoko"
          ],
          "keywords": [
            "videójáték",
            "game-ready asset",
            "3d modellezés",
            "pbr textúrázás",
            "unreal engine",
            "motion capture",
            "rigging",
            "blueprint"
          ],
          "cel": "A tantárgy célja, hogy a hallgatók mesterképzéshez illeszkedő, haladó szintű ismereteket szerezzenek a videójáték-fejlesztés teljes vizuális pipeline-járól, különös tekintettel a valós idejű megjelenítésre optimalizált 3D assetek, karakterek és animációk létrehozására, valamint azok játékmotorban történő alkalmazására.",
          "pdfUrl": "/tematikak/15048.pdf",
          "category": [
            "3d",
            "játék",
            "animáció"
          ],
          "group": null,
          "short": "Game-ready 3D assetek, mocap animáció (Maya, Substance Painter), majd játszható demó Unreal Engine-ben."
        },
        {
          "type": "Kötelező",
          "name": "3D tervezés és szimuláció 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 16,
          "groups": "2",
          "instructors": "Tóth Gergő",
          "institute": "AMD",
          "note": null,
          "description": "A félév során a hallgatók átfogó képet kapnak a game-ready assetekről és a 3D szoftverek, valamint az Unreal Engine közötti átjárhatóságról: nCloth-, részecske- és folyadékszimulációk exportálásáról, növényzettel benépesített terepek MASH Network alapú felépítéséről és a renderelési optimalizációról (Arnold stand-in, AOV-k). Az elkészült anyagokat passz-alapú kompozitálással és fényeléssel dolgozzák fel After Effectsben; a félév végére egy élettel benépesített játék intrót, cinematicot vagy cutscene-t készítenek.",
          "felelos": "Balogh Áron Zsigmond Dr.",
          "prerequisite": "3D tervezés és szimuláció 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Maya",
            "Arnold",
            "Unreal Engine",
            "After Effects"
          ],
          "keywords": [
            "3d szimuláció",
            "game ready asset",
            "pbr",
            "mash network",
            "render optimalizáció",
            "kompozitálás",
            "cinematic"
          ],
          "cel": "A modulok elvégzését követően a hallgató képes lesz PBR elvek mentén anyagokat készíteni, a játéktérben, 3D jelenetben terepeket modellezni, strukturálni, és a MASH Network segítségével ezeken nagyszámú objektumot elhelyezni, továbbá a renderelési időt és erőforrás-használatot optimalizálni, a render passzokat és layereket utómunkára alkalmas módon előállítani.",
          "pdfUrl": "/tematikak/15033.pdf",
          "category": [
            "3d",
            "animáció"
          ],
          "group": null,
          "short": "nCloth-, részecske- és folyadékszimuláció, MASH terepek, renderoptimalizálás; kompozitálás After Effectsben."
        },
        {
          "type": "Kötelező",
          "name": "Interaktív rendszerek 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 16,
          "groups": "2",
          "instructors": "Varga Vajk, Polena Réka",
          "institute": "AMD",
          "note": null,
          "description": "A szemeszter során a hallgatók összetett interaktív rendszerek tervezését sajátítják el gyakorlati feladatokon keresztül: elektronikai rendszerekkel és mikrokontrollerekkel, TouchDesigner szoftverrel, Microsoft Kinecttel és ezek kombinációival építenek interaktív architektúrákat. A tematikában audio-reaktív vizuálok, mozgásvezérelt interakció, particle systemek, adatvizualizáció, valamint DMX-, NDI-, OSC- és MIDI-alapú vezérlés szerepel. A félév végére saját multimédiás interaktív installációt készítenek, és csoportosan audiovizuális alkotást terveznek a Magyar Zene Háza hangdómjába.",
          "felelos": "Sterk Barbara DLA",
          "prerequisite": "Interaktív rendszerek 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "TouchDesigner",
            "Kinect"
          ],
          "keywords": [
            "touchdesigner",
            "kinect",
            "interaktív installáció",
            "mikrokontroller",
            "adatvizualizáció",
            "vj",
            "dmx",
            "audiovizuális"
          ],
          "cel": "A kurzus célja az interaktív rendszerek eszközismereti, alkotói (tervezői) és művészi (esztétikai szemlélet szempontjából) elsajátítása haladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni, felhasználni és prezentálni az e rendszerek területének műveléséhez szükséges ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/15043.pdf",
          "category": [
            "ux/interakció",
            "installáció"
          ],
          "group": null,
          "short": "TouchDesigner + Kinect: audio-reaktív, mozgásvezérelt vizuálok, DMX/OSC/MIDI, saját interaktív installáció."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 2. (Média design MA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": null,
          "groups": "1",
          "instructors": "Balogh Áron",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatanterven túlmutató szakmai tudást ad át workshopok, meghívott előadók prezentációi, mesterkurzusok, technikai bemutatók, konferencia- és kiállításlátogatások, valamint közös projektek formájában. A programban Erasmus-ösztöndíj beszámoló, BEST OF diplomaprezentációk és az OMDK intézményi fordulója is szerepel. A teljesítés feltétele a jelenlét és a kijelölt szakmai feladatok határidőre történő leadása.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "mesterkurzus",
            "portfólió",
            "erasmus",
            "omdk"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak workshopok, előadások és meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, valamint a MyBrand szemlélet alappillérei: szakterületek találkozása, a kreatív iparban használatos szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/15052.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, meghívott előadók; Erasmus-beszámoló, BEST OF diplomaprezentációk, OMDK forduló."
        },
        {
          "type": "Kötelező",
          "name": "Egalizáló tárgy 2. (Média design stúdiumok 2.)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": "1",
          "instructors": "Balogh Áron",
          "institute": "AMD",
          "note": null,
          "description": "Felzárkóztató kurzus a nem média design alapszakról érkező MA-hallgatóknak, amely a médiaművészet és médiadesign alapjait adja át: képszerkesztés (Photoshop), vektorgrafika (Illustrator), analóg és digitális fotográfia, videóvágás és fényelés (Premiere Pro), 3D modellezés és animáció (Blender), 3D mapping és fényfestés (Resolume Arena), valamint webdesign (Figma, HTML, JavaScript, CSS) és programozási alapok (C#, Arduino). A gyakorlati feladatokból a hallgatók egyéni portfóliót építenek.",
          "felelos": "Kiss Melinda",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Photoshop",
            "Illustrator",
            "Premiere Pro",
            "Blender",
            "Resolume Arena",
            "Arduino",
            "Figma"
          ],
          "keywords": [
            "médiaművészet",
            "felzárkóztató",
            "képszerkesztés",
            "videóvágás",
            "3d modellezés",
            "fényfestés",
            "webdesign",
            "fotográfia"
          ],
          "cel": "A tantárgy célja olyan ismeretkörök átadása, amelyekre a nem média design alapszakot végző hallgatóknak korábban nem nyílt lehetőségük: alapszintű média design technikák, speciális szoftverek ismerete és a média design tervezés alaphelyzetei; a tárgy teljesítésével a hallgató érti és alkalmazni tudja a szakterület alapfogalmait és fő elveit.",
          "pdfUrl": "/tematikak/15037.pdf",
          "category": [
            "projekt",
            "2d",
            "installáció"
          ],
          "group": null,
          "short": "Felzárkóztató: fotó, videóvágás, Blender 3D, fényfestés (Resolume), webdesign (Figma, HTML/CSS/JS)."
        }
      ]
    },
    {
      "version": "2025/2026",
      "program": "MA",
      "semester": 3,
      "label": "Média Design MA 2025/2026",
      "courses": [
        {
          "type": "Kötelező",
          "name": "Analitikus médiaelmélet",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 3,
          "active": 13,
          "groups": "1",
          "instructors": "Kollár Dávid",
          "institute": "ELM",
          "note": null,
          "description": "A kurzus a média elemzésének és értelmezésének kritikai szemléletét adja át: a hallgatók megismerkednek a főbb médiaelméleti irányzatokkal, modellekkel és kulcsfogalmakkal. Szó esik a médiafogyasztási trendekről, a média és a nyilvánosság, illetve a hatalom viszonyáról, a médiareprezentációról, valamint a médiaszövegek szemiotikai és diskurzuselemzéséről. A félév végére a hallgatók képessé válnak a kortárs médiajelenségek és -platformok kontextusban való, kritikai elemzésére.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "-",
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "médiaelmélet",
            "analitikus",
            "médiakritika",
            "elmélet",
            "reprezentáció",
            "szemiotika",
            "nyilvánosság",
            "befogadáselmélet"
          ],
          "cel": "A kurzus célja, hogy a hallgatók megismerkedjenek az analitikus médiaelmélet alapjaival, és elsajátítsák azokat az elméleti kereteket és fogalmakat, amelyek segítségével képessé válnak a médiajelenségek mélyebb megértésére és kritikai elemzésére. A résztvevők betekintést nyernek a legfontosabb médiaelméleti megközelítésekbe és modellekbe, megismerik a főbb irányzatok kulcsfogalmait, és képessé válnak a médiatartalmak és -platformok kritikai szempontú, társadalmi, kulturális és technológiai kontextusban való elemzésére.",
          "pdfUrl": "/tematikak/12512.pdf",
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Médiaelméleti irányzatok, média és hatalom, reprezentáció, szemiotikai és diskurzuselemzés kortárs példákon."
        },
        {
          "type": "Kötelező",
          "name": "Gazdaság és jog",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": 137,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadás, amely a kreatív szakmák gyakorlásához szükséges gazdasági és jogi alapismereteket tekinti át. A hallgatók a mesterképzés részeként ismerkednek meg a szakmai működésüket érintő gazdasági és jogi keretekkel. A tárgy kollokviummal zárul.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "gazdaság",
            "jog",
            "szerzői jog",
            "vállalkozás",
            "kreatívipar",
            "elmélet"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Kreatív szakmák gyakorlásához szükséges gazdasági és jogi alapok: szerzői jog, vállalkozási ismeretek."
        },
        {
          "type": "Kötelező",
          "name": "Hangdesign",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 13,
          "groups": "2",
          "instructors": "Farkas Bence, Kováts Jázon",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus során a hallgatók haladó szinten ismerkednek meg a multimédia környezetben alkalmazott audio lehetőségeivel: a hangvágás és keverés mellett hangdesign-módszerekkel, foley-technikákkal és interaktív megoldásokkal (MIDI, OSC) is dolgoznak. A félévben stúdió- és low budget eszközöket egyaránt használnak, Adobe Audition, PaulXStretch, Ableton Live és MAX környezetben. A kurzus a diplomamunka-tervek hangi megoldásainak konzultációjára is kitér.",
          "felelos": "Csáki László",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Audition",
            "Ableton Live",
            "Max/MSP",
            "PaulXStretch"
          ],
          "keywords": [
            "hangdesign",
            "audition",
            "ableton",
            "hangtervezés",
            "audio",
            "midi",
            "osc",
            "foley"
          ],
          "cel": "A kurzus célja a hangdesign eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai szemléletű) elsajátítása haladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni, felhasználni és prezentálni a hangdesign területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/12513.pdf",
          "category": [
            "hang"
          ],
          "group": null,
          "short": "Hangvágás, keverés, foley, MIDI/OSC interaktív rendszerek Audition, Ableton Live és Max környezetben."
        },
        {
          "type": "Kötelező",
          "name": "Kísérleti médiaművészet",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": 13,
          "groups": "2",
          "instructors": "Varga Vajk, Forgács Kristóf",
          "institute": "AMD",
          "note": null,
          "description": "Két modulból álló gyakorlati kurzus, amely a hagyományos média design területeken túlmutató kísérletezésre bátorít. Az egyik modulban a hallgatók a fényművészet és a luminokinetika alapjaival, kiállítástervezéssel és -építéssel, valamint interaktív installációk technológiai hátterével (haladó TouchDesigner) foglalkoznak, és saját projektet valósítanak meg. A másik modulban nagyvárosi kreatív ötlettervek kidolgozása és vizualizálása a cél, amelyek eredeti, figyelemfelkeltő megoldásokkal erősíthetik egy város arculatát.",
          "felelos": "Mayer Éva",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "TouchDesigner"
          ],
          "keywords": [
            "médiaművészet",
            "kísérleti",
            "experimentális",
            "fényművészet",
            "luminokinetika",
            "installáció",
            "touchdesigner",
            "avantgárd"
          ],
          "cel": "A tantárgy célja a hagyományos média design és médiaművészeti területeken kívül eső kompetenciák felfedezése és gyakorlatba ültetése: a kurzus a határterületek vizsgálatára, kísérletek elvégzésére és az azokból való tanulságok levonására bátorítja a hallgatókat.",
          "pdfUrl": "/tematikak/12459.pdf",
          "category": [
            "installáció",
            "projekt"
          ],
          "group": null,
          "short": "Fényművészet, luminokinetika, kiállításépítés és haladó TouchDesigner; városi kreatív ötlettervek."
        },
        {
          "type": "Kötelező",
          "name": "Kommunikációs ismeretek",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": 148,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadás, amely a kommunikáció alapfogalmait és működését tekinti át a média design mesterképzés hallgatói számára. A tárgy a szakmai munkához szükséges kommunikációs alapismereteket adja át, és kollokviummal zárul.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "kommunikáció",
            "kommunikációelmélet",
            "médiakommunikáció",
            "nyilvánosság",
            "elmélet"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Kommunikációs alapfogalmak és modellek: médiakommunikáció, nyilvánosság, elméleti háttér."
        },
        {
          "type": "Kötelező",
          "name": "Médiatervezés 3.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 6,
          "credits": 7,
          "active": 13,
          "groups": "2",
          "instructors": "Berkes Bálint, Pápai Bence",
          "institute": "AMD",
          "note": null,
          "description": "Két modulból álló haladó gyakorlati tárgy. Az egyik modul a fényt mint művészi eszközt járja körül: projection mapping, DMX-es lámpavezérlés, robotlámpák és valós idejű megoldások (MadMapper, MadLight, Unreal Engine) segítségével a hallgatók saját fényművészeti alkotást hoznak létre. A másik modul a játéktervezés folyamatait fedi le az ötlettől a kiadásig: játékmechanikák, GDD-készítés, karakter- és level design, UX/UI, valamint prototipizálás és optimalizáció témáin keresztül.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "Médiatervezés 2.",
          "requirement": "gyakorlati jegy",
          "software": [
            "MadMapper",
            "MadLight",
            "Unreal Engine"
          ],
          "keywords": [
            "médiatervezés",
            "fényművészet",
            "projection mapping",
            "dmx",
            "játéktervezés",
            "prototípus",
            "level design",
            "haladó"
          ],
          "cel": "A tantárgy célja egyrészt, hogy a hallgatók megismerjék a fény mint művészi eszköz alkalmazási lehetőségeit a különböző multimédiás formákban, másrészt hogy elsajátítsák a játéktervezés alapelveit és folyamatait a prototípus-készítéstől a tesztelésen át az iterációig.",
          "pdfUrl": "/tematikak/12515.pdf",
          "category": [
            "installáció",
            "játék",
            "projekt"
          ],
          "group": null,
          "short": "Projection mapping, DMX-lámpavezérlés, Unreal Engine fényinstallációk; játéktervezés GDD-től prototípusig."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 3. (Média design MA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": 13,
          "groups": "1",
          "instructors": "Forgács Kristóf",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át workshopok, meghívott előadók prezentációi, mesterkurzusok, innovációs és technikai bemutató előadások, konferenciarészvétel, kiállításlátogatás és közös projektek formájában. Hangsúlyos a társterületek alapismereteinek beemelése és a portfólióépítés. A teljesítés feltétele a jelenlét és a kijelölt szakmai feladatok határidőre való leadása.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "projektmunka",
            "mesterkurzus",
            "konferencia",
            "ma"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak workshopok, előadások és meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, valamint a kreatív iparban használatos szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/12746.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, kiállításlátogatás meghívott szakemberekkel; portfólió."
        }
      ]
    },
    {
      "version": "2025/2026",
      "program": "MA",
      "semester": 4,
      "label": "Média Design MA 2025/2026",
      "courses": [
        {
          "type": "Kötelező és szabváll.",
          "name": "Produkciós ismeretek",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 3,
          "active": 13,
          "groups": "1",
          "instructors": "Pápai Bence",
          "institute": "ELM",
          "note": "szab.váll. létszám: összesen",
          "description": "A kurzus a digitális produkciók, elsősorban a játékfejlesztési workflow vezetői oldalát mutatja be: projektmenedzsment-alapok, kockázatok és felelősségek, a piac szereplői és a szükséges szakembergárda. Áttekinti a finanszírozási lehetőségeket (közösségi finanszírozás, kiadók, befektetők), a költségtervezést, a marketing és PR szerepét, valamint a gyártás fázisait az ötlettől a megjelenésig. A hallgatók vizsgafeladatként fiktív pitch csomagot állítanak össze koncepcióval, célpiaccal, csapatösszetétellel, költségvetéssel és ütemezéssel.",
          "felelos": "Besenyei Zsuzsanna",
          "prerequisite": "-",
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "produkció",
            "projektmenedzsment",
            "játékfejlesztés",
            "finanszírozás",
            "pitch",
            "költségvetés",
            "kiadói rendszer",
            "marketing"
          ],
          "cel": "A hallgatók megismerkedjenek a projektek és produkciók létrehozása során felmerülő alkotói, tervezői problémákkal és megoldási stratégiáikkal, ismerjék a produkcióhoz szükséges szakemberek szerepköreit és felelősségeit, és képesek legyenek egy produkció megtervezésére és teljes körű levezénylésére.",
          "pdfUrl": "/tematikak/ext-produkcios-ismeretek.pdf",
          "category": [
            "elmélet",
            "játék"
          ],
          "group": null,
          "short": "Játékfejlesztés vezetői oldala: finanszírozás, kiadói rendszer, marketing, PM-eszközök; fiktív pitch csomag."
        },
        {
          "type": "Kötelező",
          "name": "Diplomamunka (Média design)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 12,
          "credits": 20,
          "active": 13,
          "groups": "2",
          "instructors": "Pálfi Szabolcs, Forgács Kristóf, Madácsi Blanka, Varga Vajk, Kollár Dávid, Kováts Jázon",
          "institute": "AMD",
          "note": null,
          "description": "A média design MA képzést lezáró diplomatárgy, amely három blokkban készíti fel a hallgatókat: játékfejlesztési projektmunka a tervezéstől a kiadásig, tudományos szakszövegírás és a szakdolgozat strukturált felépítése, valamint a diplomamunka projektszerű kezelése mérföldkövekkel és konzultációkkal. A félév végére portfólió, showreel, prezentáció és a szakdolgozat előzetes változata készül el. A teljesítés feltétele a két központi konzultáción bemutatott, megfelelő készültségű diplomamunka.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Zotero",
            "ChatGPT"
          ],
          "keywords": [
            "diplomamunka",
            "portfólió",
            "showreel",
            "szakdolgozat",
            "prezentáció",
            "projekttervezés",
            "kutatásmódszertan"
          ],
          "cel": "A diplomamunkához szükséges eszközismereti (szoftverismereti), alkotói és művészi ismeretek elsajátítása, kreatív készségek fejlesztése és prezentációs tudás megszerzése haladó szinten.",
          "pdfUrl": "/tematikak/ext-diplomamunka-media-design.pdf",
          "category": [
            "diploma/portfólió"
          ],
          "group": null,
          "short": "Játékfejlesztési projektmunka, szakszövegírás, projektterv; kimenet: portfólió, showreel, szakdolgozat."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 4. (Média design MA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": 13,
          "groups": "1",
          "instructors": "Forgács Kristóf",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatanterven túlmutató szakmai programokat kínál: a szakmában aktívan dolgozó meghívott előadók prezentációit, mesterkurzusokat, innovációs és technikai témájú workshopokat, konferenciarészvételt, kiállításlátogatást és közös projektek kivitelezését. A félév programjában szakos szakmai programok, Erasmus-beszámoló, BEST OF diplomaprezentációk és az OMDK intézményi forduló szerepelnek. A teljesítés feltétele a jelenlét és a kijelölt szakmai feladatok határidőre való leadása.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "projektmunka",
            "mesterkurzus",
            "portfólió",
            "ma"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak workshopok, előadások és meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése vendégelőadók vagy közös programok révén, valamint a MyBrand szemlélet alappilléreinek megvalósítása: különböző szakterületek találkozása, tudás- és kompetenciaelemek egymásra épülése, a kreatív iparban használatos szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/15057.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Meghívott előadók, mesterkurzusok, workshopok; Erasmus-beszámoló, BEST OF diplomaprezentációk, OMDK forduló."
        }
      ]
    },
    {
      "version": "2024/2025",
      "program": "BA",
      "semester": 1,
      "label": "Média Design BA 2024/2025",
      "courses": [
        {
          "type": "Kötelező",
          "name": "Digitális stúdiumok 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Tóth Erika",
          "institute": "AMD",
          "note": null,
          "description": "A tantárgy alapszintű bevezetést nyújt az animációs művészetben használt digitális eszközökbe, elsősorban a 3D modellezés alapismereteibe. A hallgatók Blenderben tanulnak poligonos szerkesztést, módosítókat, sculptingot, retopológiát, UV-szerkesztést, fény- és renderbeállításokat. A félév végére saját referenciák alapján önállóan felépítik egy karakter 3D tömegvázlatát, és portfólióképes render képeket készítenek.",
          "felelos": "Kiss Melinda",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Blender"
          ],
          "keywords": [
            "3d modellezés",
            "blender",
            "poligonos szerkesztés",
            "sculpting",
            "textúrázás",
            "renderelés",
            "karaktermodell",
            "digitális"
          ],
          "cel": "A tantárgy alapszintű bevezetést nyújt az animációs művészetben használatos digitális eszközök lehetőségeibe: a hallgatók elsajátítják a 3D modellezés és mozgatás alapjait, a digitális térbeli gondolkodás főbb elveit, és megismerkednek a specifikus szoftverek használatával.",
          "pdfUrl": "/tematikak/10531.pdf",
          "category": [
            "3d",
            "animáció"
          ],
          "group": null,
          "short": "3D modellezés Blenderben: poligonszerkesztés, sculpting, retopológia, UV, render — féléves karaktermodell."
        },
        {
          "type": "Kötelező",
          "name": "Egalizáló tárgy 1. (Média design stúdiumok 1.)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Varga Vajk",
          "institute": "AMD",
          "note": null,
          "description": "Felzárkóztató kurzus a más szakokról érkező hallgatók számára, amely a médiadesign alapképzés technikai alapjait fedi le. A hallgatók megismerkednek a médiaművészet alapjaival, a képszerkesztéssel (Photoshop), a vektorgrafikával (Illustrator), a kézi rajzzal, a fotózással, a videóvágással és effektezéssel (Premiere Pro, After Effects), a programozással (C# és Arduino), valamint a 3D modellezéssel (Blender). Az elkészült gyakorlati munkákból a hallgatók egyéni portfóliót építenek.",
          "felelos": "-",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Photoshop",
            "Illustrator",
            "Premiere Pro",
            "After Effects",
            "Blender",
            "Arduino",
            "C#"
          ],
          "keywords": [
            "felzárkóztató",
            "képszerkesztés",
            "vektorgrafika",
            "videóvágás",
            "programozás",
            "3d modellezés",
            "médiadesign",
            "fotográfia"
          ],
          "cel": "A tárgy célja, hogy a különböző szakokról érkező hallgatókat technikailag felzárkóztassa a médiadesign alapképzésének szintjére.",
          "pdfUrl": "/tematikak/10461.pdf",
          "category": [
            "2d",
            "film/videó",
            "3d"
          ],
          "group": null,
          "short": "Felzárkóztató alapok: Photoshop, Illustrator, rajz, fotó, Premiere, After Effects, Arduino, Blender."
        },
        {
          "type": "Kötelező",
          "name": "Interakciótervezés 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 6,
          "credits": 7,
          "active": null,
          "groups": null,
          "instructors": "Kunszt Gábor, Sterk Barbara",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus bevezető részében a hallgatók megismerik az Arduino fejlesztői környezetet, valamint elektronikai és programozói alapismereteket szereznek (digitális és analóg I/O, vezérlési szerkezetek, szervomotorok). Emellett bepillantást nyernek a folyamatalapú fizikai algoritmikus alkotás világába. A félév második felében műhelymunka keretében anyagkísérleteket és prototípusgyártást végeznek, majd saját koncepció alapján kisebb interaktív rendszereket, objekteket készítenek és prezentálnak.",
          "felelos": "Sterk Barbara DLA",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Arduino"
          ],
          "keywords": [
            "interakciótervezés",
            "arduino",
            "fizikai computing",
            "elektronika",
            "prototípus",
            "interaktív objekt",
            "kinetikus művészet"
          ],
          "cel": "A kurzus célja az interakciótervezés alapjainak elsajátítása eszközismereti (Arduino nyelv), fizikai alkotói (tervezői) és művészeti (esztétikai) szemlélet szempontjából; a hallgató képes lesz felismerni, elemezni, érteni, alkalmazni és prezentálni az interakciótervezés alapjait képező ismeretanyagot.",
          "pdfUrl": "/tematikak/10444.pdf",
          "category": [
            "ux/interakció",
            "installáció",
            "fejlesztés"
          ],
          "group": null,
          "short": "Arduino-alapú elektronika és programozás: szervók, anyagkísérletek, saját interaktív objekt építése."
        },
        {
          "type": "Kötelező",
          "name": "Mozgógrafika 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Szabó Eszter",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus során a hallgatók megismerik és megtanulják kezelni az After Effects szoftvert, amelyben különböző mozgógrafikai alkotásokat hoznak létre: loopolt shape-animációkat, audio-reaktív animációkat, vektoros karakteranimációt és Puppet tool-lal készített járásciklust. A technikai ismeretek mellett különböző mozgógrafikai stílusokkal is megismerkednek. A félév végén az órai munkákból egy önálló, hanggal ellátott, 1-2 perces videót vágnak össze, amely a Mozgógrafika 2. tantárgyat is megalapozza.",
          "felelos": "Kiss Melinda",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "After Effects",
            "Photoshop"
          ],
          "keywords": [
            "mozgógrafika",
            "after effects",
            "animáció",
            "motion graphics",
            "karakteranimáció",
            "shape layer",
            "puppet tool"
          ],
          "cel": "A kurzus célja a mozgógrafika eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai) elsajátítása alapszinten. A hallgató a kurzus elvégzése eredményeképpen képes alapszinten felismerni, elemezni, érteni és felhasználni, valamint prezentálni a mozgógrafika területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/10456.pdf",
          "category": [
            "animáció",
            "2d"
          ],
          "group": null,
          "short": "After Effects alapok: loopolt shape-animációk, audio-reaktív animáció, Puppet tool járásciklus, féléves videó."
        },
        {
          "type": "Kötelező",
          "name": "Média design stúdiumok 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Mayer Éva",
          "institute": "AMD",
          "note": null,
          "description": "A média design szak alapozó főtantárgya, amely a hallgatók alkotókészségét és művészeti kreativitását fejleszti, és megalapozza a szak gyakorlati tárgyait. Az első félév ismeretanyaga a kompozíció, a perspektíva/tér és az anatómia: a hallgatók portréábrázolást, szabadkézi és digitálisan továbbdolgozott perspektíva-rajzokat, kollázs- és frottázstechnikás kompozíciókat, valamint színtani és parafrázis-feladatokat készítenek. A tárgy a térlátás, a kompozíciós készség és a vizuális gondolkodás fejlesztésével a médiatervezés továbbtanulására készít fel.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Lightroom",
            "Premiere Pro",
            "After Effects"
          ],
          "keywords": [
            "kompozíció",
            "perspektíva",
            "anatómia",
            "kézi rajz",
            "térábrázolás",
            "színtan",
            "képi gondolkodás",
            "alapozó"
          ],
          "cel": "A tantárgy célja a média design szakma műveléséhez elengedhetetlen képnyelvi alapismeretek átadása és az alkotói készségek kifejlesztése, valamint a manuális és számítógépes képalkotás alapelveinek, eljárásainak ismertetése és gyakoroltatása.",
          "pdfUrl": "/tematikak/10451.pdf",
          "category": [
            "2d",
            "grafika/tipográfia"
          ],
          "group": null,
          "short": "Kompozíció, perspektíva, anatómia: portrérajz, frottázs- és kollázskompozíciók, színtan, parafrázis-feladatok."
        },
        {
          "type": "Kötelező",
          "name": "Média labor 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Berkes Bálint, Dózsa Liliána",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a formák és anyagok térbeli vizuális megjelenésének és viselkedésének megismerésével, valamint azok szoftveres reprodukálásával és szimulálásával foglalkozik. A hallgatók a Blender alapvető használatát sajátítják el a modellezés, textúrázás (UV mapping, shader setup), világítás, kamerakezelés és renderelés (PBR workflow) területén, kiegészítve képelméleti ismeretekkel. A féléves feladat egy választott mindennapi eszköz lemodellezése és koncepció szerinti képsorozat készítése.",
          "felelos": "Mayer Éva",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Blender"
          ],
          "keywords": [
            "3d",
            "blender",
            "modellezés",
            "textúrázás",
            "világítás",
            "renderelés",
            "pbr",
            "képelmélet"
          ],
          "cel": "A kurzus célja a média design specifikus képalkotás eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai szemlélet szempontjából) elsajátítása közép haladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni és felhasználni, valamint prezentálni a média design specifikus képalkotás területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/10460.pdf",
          "category": [
            "3d"
          ],
          "group": null,
          "short": "Blender-alapok: modellezés, UV-textúrázás, világítás, PBR render; hétköznapi tárgy modellje képsorozattal."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 1. (Média design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": null,
          "groups": null,
          "instructors": "Szacsvai Pál",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át workshopok, előadások és meghívott előadók által vezetett projektek formájában. A programok között szerepel gyakorló szakemberek prezentációja, mesterkurzusok, innovációs és technikai bemutató előadások, konferencia- és kiállításlátogatás, valamint közös projektek kivitelezése. Az első alkalom a média design szakkal, a félév felépítésével és az Erasmus-lehetőségekkel való ismerkedést szolgálja.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "mesterkurzus",
            "kiállítás",
            "portfólióépítés",
            "ba"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak workshopok, előadások és meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, valamint a MyBrand szemlélet alappillérei: különböző szakterületek találkozása, tudás- és kompetenciaelemek egymásra épülése, a kreatív iparban használatos szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/10446.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, meghívott előadók, kiállításlátogatás, közös projektek, Erasmus-infók."
        },
        {
          "type": "Kötelező",
          "name": "UX design stúdiumok 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": "Bohati Bence, Dér Kristóf Gordon",
          "institute": "AMD",
          "note": null,
          "description": "A tantárgy a felhasználói élmény (UX) tervezés alapismereteit, módszereit és folyamatait, valamint az ezekhez használt szoftvereket (Miro, Figma) ismerteti meg a Design Thinking keretrendszer mentén. A hallgatók feltáró kutatással, interjúkészítéssel, perszónákkal, customer journey-vel, információs architektúrával és user flow-val alapozzák meg egy szabadon választott digitális alkalmazás tervét, majd Figmában UI elemeket és UI kitet készítenek. A kétféléves kurzus végére képesek lesznek egy digitális alkalmazás felhasználói élményének megtervezésére.",
          "felelos": "Balogh Áron Zsigmond Dr.",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Figma",
            "Miro"
          ],
          "keywords": [
            "ux design",
            "design thinking",
            "felhasználói élmény",
            "kutatás",
            "perszóna",
            "customer journey",
            "prototípus",
            "figma"
          ],
          "cel": "A kurzus célja a UX design eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai) elsajátítása alapszinten. A hallgató a kurzus elvégzése eredményeképpen képes alapszinten felismerni, elemezni, érteni és felhasználni, valamint prezentálni a UX design területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/10555.pdf",
          "category": [
            "ux/interakció"
          ],
          "group": null,
          "short": "Design Thinking gyakorlatban: kutatás, interjú, perszóna, customer journey, user flow, UI kit Figmában."
        }
      ]
    },
    {
      "version": "2024/2025",
      "program": "BA",
      "semester": 2,
      "label": "Média Design BA 2024/2025",
      "courses": [
        {
          "type": "Kötelező",
          "name": "Digitális stúdiumok 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Tóth Erika",
          "institute": "AMD",
          "note": null,
          "description": "A félév során a hallgatók megismerik a 3D animáció alapjait Blenderben. A kurzus fókuszában az animációs technikák elsajátítása áll: keyframe-ek, görbék, kinematikák (FK/IK), constraint-ek, karakteranimáció, riggelés, skinnelés, walk cycle, valamint a Rigify használata. A félév végén a hallgatók saját animációs műalkotást hoznak létre a tanult technikák gyakorlására és elmélyítésére.",
          "felelos": "Balogh Áron Zsigmond Dr.",
          "prerequisite": "Digitális stúdiumok 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Blender"
          ],
          "keywords": [
            "3d animáció",
            "blender",
            "animáció",
            "rigging",
            "karakteranimáció",
            "walk cycle",
            "keyframe",
            "skinning"
          ],
          "cel": "A tantárgy alapszintű bevezetést nyújt az animációs művészetben használatos digitális eszközök lehetőségeibe. A hallgatók elsajátítják a 3D modellezés és mozgatás alapjait, a digitális térbeli gondolkodás főbb elveit, és a kurzus teljesítésével képesek lesznek alapszinten, nagy biztonsággal mozogni a 3D-s virtuális környezetben.",
          "pdfUrl": "/tematikak/12058.pdf",
          "category": [
            "3d",
            "animáció"
          ],
          "group": null,
          "short": "3D animáció Blenderben: riggelés, FK/IK, weight painting, Rigify, walk cycle, saját animációs projekt."
        },
        {
          "type": "Kötelező",
          "name": "Egalizáló tárgy 2. (Média design stúdiumok 2.)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Varga Vajk",
          "institute": "AMD",
          "note": null,
          "description": "Felzárkóztató kurzus a nem média design alapszakról érkező hallgatóknak, amely a médiaművészet és médiadesign alapjait adja át. A hallgatók megismerkednek a képszerkesztéssel (Photoshop), vektorgrafikával (Illustrator), fotózással, videóvágással (Premiere Pro), programozással (C# és Arduino), 3D modellezéssel (Blender), 3D mappinggel és fényfestéssel (Resolume Arena), valamint a webdesign alapjaival (Figma, HTML, JavaScript, CSS). A kurzus elméleti és gyakorlati készségeket egyaránt fejleszt, hogy a hallgatók önálló projekteket hozhassanak létre.",
          "felelos": "Kiss Melinda",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Photoshop",
            "Illustrator",
            "Premiere Pro",
            "Blender",
            "Resolume Arena",
            "Arduino",
            "Figma"
          ],
          "keywords": [
            "médiaművészet",
            "felzárkóztató",
            "képszerkesztés",
            "videóvágás",
            "fényfestés",
            "webdesign",
            "3d modellezés",
            "fotó"
          ],
          "cel": "A tantárgy célja olyan ismeretkörök átadása, amelyekre az alapképzés során a nem média design alapszakot végző hallgatóknak nem nyílt lehetőségük: alapszintű média design technikák, speciális szoftverek ismerete, a média design tervezés fő alaphelyzetei és kihívásai.",
          "pdfUrl": "/tematikak/11215.pdf",
          "category": [
            "2d",
            "film/videó",
            "projekt"
          ],
          "group": null,
          "short": "Felzárkóztató: Photoshop, Illustrator, videóvágás, Blender, fényfestés (Resolume), webdesign, Arduino."
        },
        {
          "type": "Kötelező",
          "name": "Interakciótervezés 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 6,
          "credits": 7,
          "active": null,
          "groups": null,
          "instructors": "Sterk Barbara, Kunszt Gábor",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus két modulban mélyíti el a fizikai interakciótervezés ismereteit haladó szinten. A technikai modulban a hallgatók Arduino programozással, haladó szenzor- és aktuátorhasználattal (távolság-, fény-, érintésérzékelés, fények és motorok vezérlése) tanulnak önállóan interaktív tárgyakat létrehozni. A művészeti modul elméleti kitekintésen, inspirációgyűjtésen, fénykutatáson, anyagkísérleten és tárgytervezésen keresztül vezeti be őket a fizikai interakciótervezés művészeti alkalmazásába, a félév végén interaktív műalkotás készül.",
          "felelos": "Sterk Barbara DLA",
          "prerequisite": "Interakciótervezés 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Arduino"
          ],
          "keywords": [
            "interakciótervezés",
            "arduino",
            "fizikai computing",
            "szenzorok",
            "aktuátorok",
            "fényművészet",
            "interaktív installáció",
            "luminokinetika"
          ],
          "cel": "A kurzus célja az interakciótervezés alapjainak eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai szemlélet szempontjából való) elsajátítása haladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni és felhasználni (alkalmazni), valamint prezentálni az interakciótervezés alapjainak területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/11221.pdf",
          "category": [
            "ux/interakció",
            "installáció",
            "fejlesztés"
          ],
          "group": null,
          "short": "Haladó Arduino: szenzorok, fény- és motorvezérlés; interaktív fényművészeti alkotás tervezése, építése."
        },
        {
          "type": "Kötelező",
          "name": "Mozgógrafika 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Madácsi Blanka",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus során a hallgatók az előző félévben megszerzett ismeretekre alapozva elmélyítik tudásukat a Nuke compositing szoftverben, és átfogó betekintést nyernek a vizuális effektek (VFX) világába és a filmipar működésébe. A témák között szerepel a rotoscoping, a screen replacement, a 2D és 3D tracking, a clean up, a keying technikák, valamint tűz- és muzzle flash effektek integrálása. A félév záróprojekttel és a workflow optimalizálásával zárul.",
          "felelos": "Kiss Melinda",
          "prerequisite": "Mozgógrafika 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Nuke"
          ],
          "keywords": [
            "vfx",
            "nuke",
            "compositing",
            "keying",
            "tracking",
            "rotoscoping",
            "vizuális effektek",
            "filmipar"
          ],
          "cel": "A kurzus célja, hogy a résztvevők megismerkedjenek a VFX világával, elsajátítsák az iparágban használt szoftverek, például a Nuke alapvető használatát, valamint betekintést nyerjenek a filmipar működésébe, különös tekintettel a vizuális effektek szerepére és integrációjára a produkciókban. Az óra során az alapvető technikák, fogalmak és munkafolyamatok bemutatására kerül sor, hogy megalapozzák a résztvevők tudását és fejlesszék gyakorlati készségeiket.",
          "pdfUrl": "/tematikak/11428.pdf",
          "category": [
            "animáció",
            "film/videó"
          ],
          "group": null,
          "short": "VFX Nuke-ban: rotoscoping, 2D/3D tracking, keying, clean up, screen replacement, tűz- és muzzle flash."
        },
        {
          "type": "Kötelező",
          "name": "Média design stúdiumok 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Varga Vajk, Szűcs Levente",
          "institute": "AMD",
          "note": null,
          "description": "A tantárgy a média design szakma műveléséhez elengedhetetlen képnyelvi, fotográfiai és mozgóképnyelvi alapismereteket adja át, az analóg és digitális képalkotástól a szoftveres képfeldolgozásig. A hallgatók a sötétkamrai fotogramkészítéstől a lyukkamerán és síkfilmes gépeken át a digitális fotográfiáig haladnak, gyakorolják a kompozíciót, a világítást és az expozíciós technikákat. A képek utómunkáját és rendszerezését Adobe Lightroomban és Photoshopban sajátítják el, a félév 6-8 képes fotósorozattal zárul.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "Média design stúdiumok 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Photoshop",
            "Lightroom"
          ],
          "keywords": [
            "fotó",
            "analóg fotográfia",
            "photoshop",
            "lightroom",
            "kompozíció",
            "világítás",
            "expozíció",
            "képszerkesztés"
          ],
          "cel": "A kurzus célja a médiatervezés eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai szemlélet szempontjából való) elsajátítása alapszinten. A hallgató a kurzus elvégzése eredményeképpen képes alapszinten felismerni, elemezni, érteni és felhasználni (alkalmazni), valamint prezentálni a médiatervezés területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/11224.pdf",
          "category": [
            "fotó",
            "2d"
          ],
          "group": null,
          "short": "Analóg és digitális fotográfia: fotogram, lyukkamera, világítás, kompozíció; Lightroom/Photoshop utómunka."
        },
        {
          "type": "Kötelező",
          "name": "Média labor 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Dózsa Liliána, Berkes Bálint",
          "institute": "AMD",
          "note": null,
          "description": "A tavaszi félévben a hallgatók a 3D képalkotási alapokra építve a 3D animáció világába lépnek. A félév első felében a motion design kultúrával, a klasszikus animációs elmélettel (az animáció 12 alapelve), karaktercsontozással és motion capture animálással ismerkednek, elsősorban Cinema 4D-ben. A második rész a VFX-re épül: fizikai, ruha- és organikus (részecske, füst, folyadék) szimulációkat készítenek, majd Unreal Engine-ben renderelnek valós idejű jelenetet. Féléves feladatként közös, folytatólagos golyóvándorlás-animációt készítenek.",
          "felelos": "Molnár Ágnes Éva",
          "prerequisite": "Média labor 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Cinema 4D",
            "Blender",
            "Unreal Engine",
            "Rokoko"
          ],
          "keywords": [
            "3d animáció",
            "cinema 4d",
            "blender",
            "motion design",
            "szimuláció",
            "vfx",
            "motion capture",
            "unreal engine"
          ],
          "cel": "A kurzus célja a média design specifikus képalkotás eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai szemlélet szempontjából való) elsajátítása középhaladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni és felhasználni (alkalmazni), valamint prezentálni a média design specifikus képalkotás területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/11390.pdf",
          "category": [
            "3d",
            "animáció"
          ],
          "group": null,
          "short": "3D animáció és VFX Cinema 4D-ben: 12 alapelv, csontozás, motion capture, szimulációk, Unreal render."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 2. (Média design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": null,
          "groups": null,
          "instructors": "Szacsvai Pál",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át workshopok, előadások és meghívott előadók által vezetett projektek formájában. A programok között szerepel szakmai előadók prezentációja, mesterkurzusok, innovációs és technikai bemutatók, konferencia- és kiállításlátogatás, valamint közös projektek kivitelezése. Fontos szempont a társterületek alapismereteinek beemelése és a portfólióépítés.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "mesterkurzus",
            "projektmunka",
            "portfólió",
            "ba"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni workshopok, előadások és meghívott előadók által vezetett projektek formájában, a MyBrand szemlélet alappilléreire — szakterületek találkozására, a kreatív ipari szemlélet fejlesztésére és a portfólióépítésre — építve.",
          "pdfUrl": "/tematikak/11834.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, szakmai előadások, kiállításlátogatás és közös projektek portfólióépítéssel."
        },
        {
          "type": "Kötelező",
          "name": "UX design stúdiumok 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": "Dér Kristóf Gordon, Bohati Bence",
          "institute": "AMD",
          "note": null,
          "description": "A tantárgy a felhasználói élmény (UX) tervezés ismereteit, módszereit és folyamatait mélyíti el haladó szinten, a Design Thinking keretrendszer mentén, Miro és Figma szoftverekkel. A félév témái között szerepel a vizuális hierarchia, az interakciók, a reszponzív webdesign, az Android/iOS platformok, a usability heurisztikák és a felhasználói tesztelés. A hallgatók egy szabadon választott digitális alkalmazás prototípusát tervezik meg Figmában, a kutatástól a perszónákon és user flow-n át az esettanulmányig.",
          "felelos": "Balogh Áron Zsigmond Dr.",
          "prerequisite": "UX design stúdiumok 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Figma",
            "Miro"
          ],
          "keywords": [
            "ux design",
            "figma",
            "miro",
            "prototípus",
            "design thinking",
            "felhasználói tesztelés",
            "reszponzív design",
            "usability"
          ],
          "cel": "A kurzus célja a UX design eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai) elsajátítása haladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni és felhasználni (alkalmazni), valamint prezentálni a UX design területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/11228.pdf",
          "category": [
            "ux/interakció",
            "web"
          ],
          "group": null,
          "short": "App-prototípus Figmában: user flow, perszónák, reszponzív design, usability, felhasználói tesztelés."
        }
      ]
    },
    {
      "version": "2024/2025",
      "program": "BA",
      "semester": 3,
      "label": "Média Design BA 2024/2025",
      "courses": [
        {
          "type": "Kötelező",
          "name": "Média design stúdiumok 3.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Nikázy Gusztáv",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus az online médiafelületek már megismert leíró nyelveire (HTML, CSS) építve egyedi, a template-jelleg határait feloldó, újszerű médiatartalmak létrehozását célozza. A hallgatók modern felülettervező szoftverben megtervezik grafikai-kommunikációs felületeiket, majd dokumentum- és stílusleíró nyelvekkel működő prototípus szintjén valósítják meg azokat. A félév egyéni projektmunkára épül: saját online kommunikációs stratégia, történetmesélésre épülő blog, honlap vagy portfólió tervezése és kivitelezése, wireframing és prototípus-készítés oktatói konzultációval.",
          "felelos": "Szendeff-Sztojánovits Andrea",
          "prerequisite": "Média design stúdiumok 2.",
          "requirement": "gyakorlati jegy",
          "software": [
            "HTML",
            "CSS",
            "Penpot"
          ],
          "keywords": [
            "médiatervezés",
            "webdesign",
            "prototípus",
            "html",
            "css",
            "storytelling",
            "ux/ui",
            "online média"
          ],
          "cel": "A kurzus célja a médiatervezés eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai) elsajátítása haladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni, alkalmazni és prezentálni a médiatervezés területét képező ismeretanyagot, technikai tudást és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/10455.pdf",
          "category": [
            "web",
            "ux/interakció"
          ],
          "group": null,
          "short": "Egyéni webprojekt HTML/CSS-sel: blog, portfólió vagy honlap, wireframe és Penpot prototípus készítése."
        },
        {
          "type": "Kötelező",
          "name": "Média labor 3.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 6,
          "credits": 7,
          "active": null,
          "groups": null,
          "instructors": "Berkes Bálint, Cseszneg Gyöngyi",
          "institute": "AMD",
          "note": null,
          "description": "Kétmodulos gyakorlati labor: az A modul az Adobe Animate-re épülő 2D animációval és karaktertervezéssel foglalkozik — adott koncepció vizuális megjelenítése, hangulatok megfogalmazása, egyéni karakter kidolgozása, szabadkézi és vektoros digitális rajzolás, valamint híres portrék animált mozgó montázsa Photoshop és After Effects segítségével. A B modul a 3D projection mapping világába vezet be a Resolume Arena szoftverrel: fényalapú installációk tervezése és kivitelezése, jelforrások, NDI, midi/dmx jelek és hangreaktív installáció készítése egyéni és csoportos feladatokban.",
          "felelos": "Szendeff-Sztojánovits Andrea",
          "prerequisite": "Média labor 2.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Animate",
            "Photoshop",
            "After Effects",
            "Resolume Arena"
          ],
          "keywords": [
            "2d animáció",
            "karaktertervezés",
            "projection mapping",
            "fényinstalláció",
            "adobe animate",
            "resolume arena",
            "mozgó montázs",
            "installáció"
          ],
          "cel": "A kurzus célja a média design specifikus képalkotás eszközismereti, alkotói és művészi (esztétikai) elsajátítása haladó szinten: a hallgató képes haladó szinten felismerni, elemezni, érteni, alkalmazni és prezentálni a média design specifikus képalkotás ismeretanyagát és technikai tudását. A B modul célja emellett a fény művészi alkalmazása elméleti és gyakorlati alapjainak elsajátítása multimédiás technológiák használatával: a hallgatók megismerik a fény fizikai és esztétikai tulajdonságait, és képesek lesznek saját fényalapú művészeti alkotásokat, kreatív fényinstallációkat létrehozni, dokumentálni és bemutatni.",
          "pdfUrl": "/tematikak/10462.pdf",
          "category": [
            "animáció",
            "installáció",
            "2d"
          ],
          "group": null,
          "short": "2D animáció, karaktertervezés Animate-ben; projection mapping és hangreaktív fényinstalláció Resolume-mal."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 3. (Média design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": null,
          "groups": null,
          "instructors": "Mayer Éva",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át workshopok, előadások és meghívott előadók által vezetett projektek formájában. A programok között szerepel a szakmában aktívan dolgozó előadók prezentációja, mesterkurzusok, innovációs és technikai témájú előadások, konferenciarészvétel, kiállításlátogatás és közös projektek kivitelezése. Fontos szempont a társterületeket érintő alapismeretek beemelése és a portfólióépítés.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "mesterkurzus",
            "projektmunka",
            "kiállítás",
            "konferencia"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni workshopok, előadások és meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, valamint a MyBrand szemlélet alappilléreinek megvalósítása: különböző szakterületek találkozása, a kreatív iparban használatos szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/10442.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, vendégelőadók, kiállításlátogatás és közös projektek a portfólióépítéshez."
        }
      ]
    },
    {
      "version": "2024/2025",
      "program": "BA",
      "semester": 4,
      "label": "Média Design BA 2024/2025",
      "courses": [
        {
          "type": "Kötelező és szabváll.",
          "name": "Alkalmazott 3D, versenyképes digitális megjelenítési módok",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Horányi Soma",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a Blender nyílt forráskódú 3D szoftver rutinszerű használatát tanítja meg gyakorlati példafeladatokon keresztül: a hallgatók a 3D alapfogalmaitól (vertex, poligon, UVW) a teljes munkameneten át (modellezés, textúrázás, riggelés, animáció, fényelés, renderelés, kompozitálás) jutnak el az önálló projektig. Az érintett témák között szerepel a 3D nyomtatás, ékszermintázás, ételvizualizáció, kozmetikai termékvizualizáció, belsőtéri storyboard-tervezés és az AR/VR célú low poly modellezés. A félév személyes projekttel és prezentációval zárul.",
          "felelos": "Selján Márk Endre",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Blender"
          ],
          "keywords": [
            "3d",
            "blender",
            "modellezés",
            "renderelés",
            "textúrázás",
            "3d nyomtatás",
            "termékvizualizáció",
            "low poly"
          ],
          "cel": "A tantárgy célja, hogy a különböző szakterületeken tanuló hallgatók versenyképes 3D-s tudásra tegyenek szert: elképzeléseiket a 3D eszközeivel tudják vizualizálni, és elsajátítsák a Blender professzionális, rutinszerű használatát.",
          "pdfUrl": "/tematikak/12077.pdf",
          "category": [
            "3d"
          ],
          "group": null,
          "short": "Blender-munkamenet a modellezéstől a renderelésig: 3D nyomtatás, ékszer, ételvizualizáció, low poly AR/VR."
        },
        {
          "type": "Kötelező",
          "name": "Interaktív grafika",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Berkes Bálint",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a fény médiumának kreatív, interdiszciplináris alkalmazására összpontosít, különös tekintettel a vetítéses technikákra és a generatív vizualizációra. A hallgatók TouchDesigner, Unreal Engine és Cinema 4D segítségével hang- és mozgásreaktív vizuálokat, interaktív installációkat készítenek, megismerik a DMX, Art-Net, OSC és MIDI rendszereket. A félév során egy fiktív megrendelőnek dolgozva, csapatmunkában készítenek csoportos vetítést a Magyar Zene Háza Hangdóm termébe.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "TouchDesigner",
            "Unreal Engine",
            "Cinema 4D",
            "After Effects"
          ],
          "keywords": [
            "vetítés",
            "mapping",
            "generatív vizuál",
            "touchdesigner",
            "unreal engine",
            "dmx",
            "interaktív",
            "fényművészet"
          ],
          "cel": "A kurzus célja, hogy a hallgatók valós munkaszituációkhoz hasonló környezetben sajátítsák el a vetítéses technikák alkalmazását, a kreatív döntéshozatalt és a csapatmunkát. Egy fiktív megrendelő igényei alapján készítenek vetítésterveket egy valós helyszínre, amelynek paramétereit és elvárásait fokozatosan, változó követelmények mellett ismerik meg. A kurzus végére megtapasztalják, milyen kihívásokkal jár egy professzionális fény- és vetítésinstalláció megtervezése és kivitelezése.",
          "pdfUrl": "/tematikak/11214.pdf",
          "category": [
            "ux/interakció",
            "installáció"
          ],
          "group": null,
          "short": "Vetítéses technikák, hang- és mozgásreaktív vizuálok (TouchDesigner, Unreal, DMX) a Hangdómba."
        },
        {
          "type": "Kötelező",
          "name": "Média design stúdiumok 4.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Mayer Éva",
          "institute": "AMD",
          "note": null,
          "description": "A félév az ÉN-TÉR-KÉP téma kibontására épül: a hallgatók az identitás megjelenítési lehetőségeit vizsgálják különböző terekben és művészeti műfajokban, a kortárs installációs művészet, a body art és a performance elméleti hátterével. A féléves komplex feladatban egy virtuális kiállítási teret hoznak létre tetszőleges 3D szoftverrel, digitális önportré-sorozat, kép+objekt és installáció műfajok bevonásával. A kiállításhoz InDesign vagy Illustrator segítségével meghívót vagy plakátot is terveznek.",
          "felelos": "Mayer Éva",
          "prerequisite": "Média design stúdiumok 3.",
          "requirement": "gyakorlati jegy",
          "software": [
            "InDesign",
            "Illustrator"
          ],
          "keywords": [
            "installáció",
            "virtuális kiállítás",
            "identitás",
            "önportré",
            "3d modellezés",
            "kortárs művészet",
            "indesign",
            "plakát"
          ],
          "cel": "A kurzus célja a médiatervezés eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai szemléletű) elsajátítása haladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni, felhasználni és prezentálni a médiatervezés területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/11225.pdf",
          "category": [
            "installáció",
            "3d",
            "fotó"
          ],
          "group": null,
          "short": "ÉN-TÉR-KÉP: digitális önportrék, kép+objekt és installáció 3D-ben modellezett virtuális kiállítási térben."
        },
        {
          "type": "Kötelező",
          "name": "Média design szakelmélet",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": "Liszka Tamás",
          "institute": "AMD",
          "note": null,
          "description": "A média design szerteágazó, folyton alakuló művészeti terület szellemtörténeti előzményeivel, tudományos, technikai és társművészeti környezetével ismertet meg az előadássorozat. Témái között szerepel a kép, jel és szimbólum szemiotikája, a fénykép ontológiája, a képi fordulat, a bio-art, a játék- és hálózatelmélet, valamint az interaktív és nonlineáris művészeti formák. Konkrét művek és alkotók vizsgálatán keresztül körvonalazza a média design kortárs és jövőbeli formáit meghatározó művészeti alapállást.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "-",
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "médiaelmélet",
            "szemiotika",
            "képi fordulat",
            "ikonográfia",
            "interaktivitás",
            "hálózatkutatás",
            "elmélet"
          ],
          "cel": "A kurzus célja a média design általános elméletének elsajátítása, hogy a hallgató alkotó-, tervező- és művészi, valamint prezentációs munkájához elméleti megalapozásként és fogalmi kiegészítésként alkalmazhassa. A hallgató a kurzus elvégzésével képes az elsajátított elméleti ismeretanyagot felismerni, elemezni és alkalmazni, valamint médiatervezői és médiaművészi gyakorlatát elhelyezni és képviselni szakmai együttműködésekben és szélesebb, interdiszciplináris keretben.",
          "pdfUrl": "/tematikak/11227.pdf",
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Szemiotika, a fénykép ontológiája, képi fordulat, bio-art, hálózat- és játékelmélet művek elemzésével."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 4. (Média design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": null,
          "groups": null,
          "instructors": "Sterk Barbara",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át workshopok, előadások és meghívott előadók által vezetett projektek formájában. A programok között szerepel a szakmában aktívan dolgozó előadók prezentációja, mesterkurzusok, innovációs és technikai bemutatók, konferencia- és kiállításlátogatás, valamint közös projektek kivitelezése. Fontos szempont a társterületi kompetenciák beemelése és a portfólióépítés.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "mesterkurzus",
            "portfólió",
            "kreatív ipar"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak workshopok, előadások és meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, a kreatív iparban használatos szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/11831.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, meghívott szakmai előadók, kiállításlátogatás és közös projektek egy héten át."
        },
        {
          "type": "Kötelező",
          "name": "Tipográfia és betűrajz",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Szacsvai Pál",
          "institute": "AMD",
          "note": null,
          "description": "A tantárgy a tipográfiai érzékenység kialakítását és a szöveges közlés megformálásának, kép és szöveg együttes elrendezésének technikáit tanítja. A félév a betűtörténetet (a római kapitálistól a gótikán és reneszánszon át a talp nélküli antikváig) betűrajzi és kreatív gyakorlatokkal dolgozza fel, párhuzamosan a számítógépes kiadványtervezés (DTP) alapjaival InDesignban. A hallgatók saját betűtípust, fontállományt és kiadványtervet készítenek.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "InDesign",
            "Photoshop",
            "Fontself"
          ],
          "keywords": [
            "tipográfia",
            "betűrajz",
            "betűtörténet",
            "betűtervezés",
            "kiadványszerkesztés",
            "dtp",
            "indesign",
            "fonttervezés"
          ],
          "cel": "A kurzus célja a tipográfia és betűrajz eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai szemléletű) elsajátítása alapszinten. A hallgató a kurzus elvégzése eredményeképpen képes alapszinten felismerni, elemezni, érteni, felhasználni és prezentálni a tipográfia és betűrajz területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/11220.pdf",
          "category": [
            "grafika/tipográfia"
          ],
          "group": null,
          "short": "Betűtörténet a római kapitálistól a sans serifig; saját betűtípus, fontállomány és kiadványterv InDesignban."
        },
        {
          "type": "Kötelező",
          "name": "Új média kritikai stúdiumok",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": "Liszka Tamás",
          "institute": "AMD",
          "note": null,
          "description": "Az előadássorozat az új médiumok kritikai elméletébe vezet be, a klasszikus médiaelméleti és művészetfilozófiai szakszövegeket a mesterséges intelligencia közelmúltbeli fejlődésének fényében újraolvasva. Témái között szerepel az újmédia definíciója és az Ars Electronica, a digitális létezés cyberpunk-reflexiói, Baudrillard szimulakrum-elmélete, Manovich új média-nyelve, a képi fordulat, valamint a múzeum és az online tér viszonya. A félév szakszövegolvasásra, vitákra és félév végi tesztre épül.",
          "felelos": "Mayer Éva",
          "prerequisite": "-",
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "új média",
            "kritikai elmélet",
            "médiaelmélet",
            "mesterséges intelligencia",
            "szimulakrum",
            "képi fordulat",
            "cyberpunk"
          ],
          "cel": "A kurzus célja, hogy a hallgatók megismerkedjenek az új médiumok kritikai elméletével, annak érdekében, hogy azt elméleti alapként és koncepcionális kiegészítésként alkalmazhassák médiatervezési tanulmányaik és gyakorlataik, valamint művészi munkájuk és prezentációs feladataik során.",
          "pdfUrl": "/tematikak/11205.pdf",
          "category": [
            "elmélet",
            "ai"
          ],
          "group": null,
          "short": "Médiaelméleti szövegek (Baudrillard szimulakruma, Manovich) újraolvasása az AI és a cyberpunk fényében."
        }
      ]
    },
    {
      "version": "2024/2025",
      "program": "BA",
      "semester": 5,
      "label": "Média Design BA 2024/2025",
      "courses": [
        {
          "type": "Kötelező",
          "name": "A játéktervezés elmélete",
          "specialization": "Játéktervezés specializáció",
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": "Liszka Tamás",
          "institute": "AMD",
          "note": null,
          "description": "Az előadássorozat egyetlen kérdésre keres választ: hogyan készül egy jól játszható játék? A válaszhoz vezető út a filozófián, etológián, pszichológián, designon és matematikán át a ludológiáig vezet. A hallgatók a játék műfaját, célját, közönségét, az interfészt, a játékmechanikát, a jutalmazási rendszereket, az elbeszéléstechnikát és az immerziót vizsgálják esettanulmányokon keresztül, a félév végén pedig saját játékkoncepciót fejlesztenek és prezentálnak.",
          "felelos": "Liszka Tamás Zoltán",
          "prerequisite": "-",
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "játéktervezés",
            "game design",
            "elmélet",
            "játékmechanika",
            "ludológia",
            "narratíva",
            "immerzió",
            "játékpszichológia"
          ],
          "cel": "A kurzus célja a játéktervezés elméletének elsajátítása, hogy a hallgató játéktervezői, alkotó-, tervező- és művészi, valamint prezentációs munkájához elméleti megalapozásként és fogalmi kiegészítésként alkalmazhassa. A hallgató a kurzus végére képes haladó szinten felismerni, elemezni, érteni és alkalmazni az elsajátított elméleti ismeretanyagot, és játéktervezői gyakorlatát el tudja helyezni egy szélesebb, interdiszciplináris keretben.",
          "pdfUrl": "/tematikak/10463.pdf",
          "category": [
            "játék",
            "elmélet"
          ],
          "group": null,
          "short": "Jól játszható játék titkai: ludológia, játékmechanika, jutalmazási rendszerek, immerzió; saját játékkoncepció."
        },
        {
          "type": "Kötelező és szabváll.",
          "name": "Alkalmazott 3D, versenyképes digitális megjelenítési módok",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Horányi Soma",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a Blender open source 3D szoftver elsajátítását és rutinszerű használatát segíti elő, hogy a hallgatók elképzeléseiket a 3D nyújtotta eszközökkel tudják vizualizálni. A félév során a 3D munkafolyamat teljes ívét bejárják: modellezés, textúrázás, UVW kiterítés, digitális mintázás, anyagbeállítás, világítás és renderelés. A gyakorlati projektek között szerepel városrész-építés, ruhaszimuláció, ételvizualizáció, 3D nyomtatásra szánt ékszer, termékvizualizáció, storyboard és AR/VR célú low poly modellezés, a félév személyes záróprojekttel és prezentációval zárul.",
          "felelos": "Selján Márk Endre",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Blender"
          ],
          "keywords": [
            "3d",
            "blender",
            "modellezés",
            "renderelés",
            "textúrázás",
            "3d nyomtatás",
            "termékvizualizáció",
            "digitális mintázás"
          ],
          "cel": "A tantárgy célja, hogy a hallgatók olyan versenyképes 3D-s tudásra tegyenek szert, amely választott hivatásukat segíti: a Blender professzionális használatával összetett tervezési, kutatási és prezentálási módszerekkel tudjanak dolgozni.",
          "pdfUrl": "/tematikak/10521.pdf",
          "category": [
            "3d"
          ],
          "group": null,
          "short": "Blender-alapú 3D: modellezés, textúrázás, renderelés — város, ékszer, ételvizualizáció, low poly AR/VR."
        },
        {
          "type": "Kötelező",
          "name": "Digitális grafikai stúdiumok",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Szacsvai Pál",
          "institute": "AMD",
          "note": null,
          "description": "A hallgató a kurzus során a képernyő-specifikus grafikai tervezés alapelveivel és a képi közlés alapelemeivel (szín, forma, vonal, kompozíció, tipográfiai és rajzi struktúra) ismerkedik meg, valamint ezek kreatív alkalmazásával a kortárs digitális kommunikációs rendszerekben. Az Adobe Illustrator és Photoshop használatán keresztül gyakorolja a számítógépes képalkotást, képfeldolgozást és képszerkesztést: adatvizualizáció, logó-parafrázis, piktogramszett és vektoros-bitmap hibrid grafikák készülnek. A tárgy megalapozza a későbbi félévek mozgógrafikai és 3D modellezői tudását.",
          "felelos": "Kiss Melinda",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Illustrator",
            "Photoshop"
          ],
          "keywords": [
            "grafikai tervezés",
            "illustrator",
            "photoshop",
            "képi közlés",
            "digitális grafika",
            "piktogram",
            "vizuális kommunikáció",
            "adatvizualizáció"
          ],
          "cel": "A tantárgy célja a média design szakma műveléséhez elengedhetetlen képnyelvi és mozgóképnyelvi alapismeretek átadása, valamint a számítógépes képalkotás, képfeldolgozás és képszerkesztés alapelveinek gyakoroltatása az Adobe Illustrator és Photoshop programok használatával.",
          "pdfUrl": "/tematikak/10449.pdf",
          "category": [
            "grafika/tipográfia",
            "2d"
          ],
          "group": null,
          "short": "Vektor- és pixelgrafika: adatvizualizáció, piktogram, logó, hibrid grafikák (Illustrator, Photoshop)."
        },
        {
          "type": "Kötelező és szabváll.",
          "name": "Mozgóképes tipográfia",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Ulrich Gábor",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a mozgóképes tipográfia kultúrtörténeti, stilisztikai, információs és technikai vonatkozásaiba vezet be: a hallgatók az alapvető betűtörténeti és tipográfiai ismeretektől jutnak el a dinamikus tipográfia esztétikai és dramaturgiai alkalmazásáig. A számítógépes gyakorlatokon az After Effects szoftverben készítenek animált szövegeket, stáblistát, egyszerű és összetett főcímeket, a program pedig együttműködik az Adobe Premiere, Audition, Photoshop és Illustrator szoftverekkel. A félév végi produktum három rövid, különböző műfajú mozgóképes felirat-munka tervezése és kivitelezése.",
          "felelos": "-",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "After Effects",
            "Photoshop",
            "Illustrator",
            "Premiere Pro",
            "Audition"
          ],
          "keywords": [
            "tipográfia",
            "mozgókép",
            "after effects",
            "kinetikus tipográfia",
            "animáció",
            "betűtörténet",
            "főcím",
            "stáblista"
          ],
          "cel": "A tantárgy célja, hogy a hallgatók ökonomikus látásmóddal rendelkezzenek a mozgóképes tipográfia kultúrtörténeti, stilisztikai, információs és technikai vonatkozásait illetően, képessé váljanak mozgóképes mű elemzésére, egyéni tipográfia megtervezésére és kivitelezésére, valamint jártasságot szerezzenek az After Effects használatában.",
          "pdfUrl": "/tematikak/10539.pdf",
          "category": [
            "grafika/tipográfia",
            "animáció"
          ],
          "group": null,
          "short": "Animált szövegek After Effectsben: stáblista, főcímek, kinetikus tipográfia betűtörténeti alapokkal."
        },
        {
          "type": "Kötelező",
          "name": "Média design stúdiumok 5.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Pálfi Szabolcs",
          "institute": "AMD",
          "note": null,
          "description": "A tantárgy fő területe ebben és a következő félévben a videojátékok tervezési szempontjainak gyakorlati alkalmazása, kifejezetten a vizuális megjelenítésre, ergonómiára és funkcionalitásra fókuszálva. A hallgatók a game design és a game art alapjaival párhuzamosan ismerkednek, és saját videojátékot fejlesztenek az ötlettől a játszható prototípusig, Unity és Unreal játékmotorok, valamint Blender és Adobe szoftverek együttes használatával. A félév végére a játék elméleti és vizuális koncepciójától eljutnak a game design dokumentumig, miközben LED fal rendszerekkel, VR környezetekkel, 3D szkenneléssel, MoCap-pel és a mesterséges intelligencia céltudatos használatával is megismerkednek.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "Média design stúdiumok 4.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Unity",
            "Unreal Engine",
            "Blender"
          ],
          "keywords": [
            "médiatervezés",
            "game design",
            "game art",
            "videojáték",
            "játékmotor",
            "level design",
            "prototípus",
            "interaktív"
          ],
          "cel": "A kurzus célja a médiatervezés eszközismereti, alkotói és művészi elsajátítása haladó szinten: a hallgató képes lesz felismerni, elemezni, érteni, alkalmazni és prezentálni a médiatervezés e szintjét képező ismeretanyagot, technikai tudást és prezentációs eljárásokat. A tervezésmódszertani ismeretek gyakorlati alkalmazásával új tervezési stratégiát hoz létre, és a multidiszciplináris területeket kombinálva komplex alkotási módszert sajátít el.",
          "pdfUrl": "/tematikak/10459.pdf",
          "category": [
            "játék",
            "projekt"
          ],
          "group": null,
          "short": "Saját videojáték az ötlettől a játszható prototípusig: game design, game art, Unity/Unreal, Blender."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 5. (Média design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": null,
          "groups": null,
          "instructors": "Sterk Barbara",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét keretében megvalósuló programok a szakmában aktívan dolgozó meghívott előadók prezentációit, mesterkurzusokat, innovációs témájú előadásokat és workshopokat, technikai bemutatókat, konferenciarészvételt, kiállításlátogatást és közös projektek kivitelezését foglalják magukban. A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át, a társterületek alapismereteinek beemelésével és a portfólióépítés támogatásával.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "mesterkurzus",
            "portfólió",
            "projektmunka",
            "ba"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak workshopok, előadások és meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, valamint a különböző szakterületek találkozása, a kreatív iparban használatos szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/10340.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Meghívott előadók, mesterkurzusok, workshopok és kiállításlátogatás — portfólióépítés a kreatív iparhoz."
        },
        {
          "type": "Kötelező",
          "name": "Új technológia pszichológiai vonatkozásai",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": "Kollár Dávid",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a modern digitális technológiák pszichológiai hatásainak komplex kognitív tudományos vizsgálatára összpontosít: a hallgatók átfogó képet kapnak arról, hogy a kurrens technológiák miként formálják az emberi viselkedést, érzelmeket és kognitív folyamatokat. A témakörök között szerepel az okoseszközök, a közösségi média, a virtuális valóság és a videójátékok pszichológiai hatása, a reziliencia, valamint az új technológiák pozitív és negatív hatásai. A kurzus bemutatja azokat a fogalmakat és értelmezési kereteket is, amelyek az egyének és közösségek digitális technológiákhoz fűződő viszonyát meghatározzák.",
          "felelos": "Molnár Ágnes Éva",
          "prerequisite": "-",
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "pszichológia",
            "technológia",
            "médiapszichológia",
            "elmélet",
            "kognitív tudomány",
            "közösségi média",
            "virtuális valóság",
            "digitális kultúra"
          ],
          "cel": "A kurzus célja az új technológia pszichológiai vonatkozásainak ismertetése, hogy a hallgató alkotó-, tervező- és művészi, valamint prezentációs munkájához elméleti megalapozásként és fogalmi kiegészítésként alkalmazhassa. A hallgató a kurzus végére képes haladó szinten felismerni, elemezni, érteni és alkalmazni az elméleti ismeretanyagot, és média designer gyakorlatát el tudja helyezni egy szélesebb, interdiszciplináris keretben.",
          "pdfUrl": "/tematikak/10556.pdf",
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Okoseszközök, közösségi média, VR és videojátékok pszichológiai hatásai; reziliencia, digitális kultúra."
        }
      ]
    },
    {
      "version": "2024/2025",
      "program": "BA",
      "semester": 6,
      "label": "Média Design BA 2024/2025",
      "courses": [
        {
          "type": "Kötelező",
          "name": "Diplomatervezési feladat (média design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 6,
          "credits": 8,
          "active": null,
          "groups": null,
          "instructors": "Forgács Kristóf, Nikázy Gusztáv",
          "institute": "AMD",
          "note": null,
          "description": "A végzős hallgatókat a diplomamunkához kapcsolódó feladatok elvégzésére felkészítő gyakorlati kurzus, két blokkban. Az egyik blokkban a hallgató modern online felülettervező szoftverekben (Figma/Penpot) megtervezi, majd dokumentum- és stílusleíró nyelvekkel prototípus szinten megvalósítja a diplomamunkáját támogató, önálló alkotásként is értelmezhető online médiaterméket, a szokásos UX/UI kereteken túlmutató megoldásokkal. A másik blokk a diplomamunka projektszerű kezelését (timing, mérföldkövek, vészforgatókönyv), a diplomaprezentáció összeállítását és gyakorlását, valamint a portfólió és showreel elkészítését segíti.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Figma",
            "Penpot",
            "HTML",
            "CSS"
          ],
          "keywords": [
            "diploma",
            "portfólió",
            "showreel",
            "prototípus",
            "webdesign",
            "prezentáció",
            "projekttervezés",
            "figma"
          ],
          "cel": "A kurzus célja a diplomamunkához szükséges eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai) ismeretek elsajátítása, kreatív készségek fejlesztése, prezentációs és médiatervezési tudás megszerzése. A hallgató képessé válik a diplomamunkája elkészítéséhez szükséges ismeretanyag, technikai tudás és prezentációs eljárások alkalmazására, valamint szakmai pozíciójának és eredményeinek értékelésére a kreatív iparban.",
          "pdfUrl": "/tematikak/11217.pdf",
          "category": [
            "diploma/portfólió",
            "web",
            "ux/interakció"
          ],
          "group": null,
          "short": "Diplomát támogató online médiatermék Figma/Penpot prototípussal, projektterv, portfólió és showreel."
        },
        {
          "type": "Kötelező",
          "name": "Média design stúdiumok 6.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Pálfi Szabolcs",
          "institute": "AMD",
          "note": null,
          "description": "Az előző félév technikai ismereteire építve a kurzus a játéktervezés strukturális, komplex folyamatát és kiegészítő szakágait vizsgálja egyéni és csoportos munkában. A hallgatók saját videojáték-ötletet fejlesztenek megadott tematikák mentén, miközben a narratíva, a tér- és karaktertervezés, valamint a UX/UI elemek kapcsolatát tanulmányozzák esettanulmányokon, prezentációkon, meghívott előadókon és stúdiólátogatáson keresztül. A félév kiemelt hangsúlyt fektet a tervezésmódszertanra, amely a diplomamunkához szükséges támpontokat teremti meg.",
          "felelos": "Molnár Ágnes Éva",
          "prerequisite": "Média design stúdiumok 5.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Lightroom",
            "Premiere Pro",
            "After Effects"
          ],
          "keywords": [
            "videojáték",
            "játéktervezés",
            "narratíva",
            "történetmesélés",
            "karaktertervezés",
            "tértervezés",
            "játékmotor",
            "médiadesign"
          ],
          "cel": "A tantárgy célja a hallgatók bevezetése a számítógépes játékfejlesztés világába a játéktervezés elméleti alapjainak elsajátításán és gyakorlati hasznosításán keresztül. A hallgató megismeri a népszerűbb játékzsánereket, a fejlesztői eszközök működését, a játéktervezői mentalitást és a tervezési folyamatokat.",
          "pdfUrl": "/tematikak/11226.pdf",
          "category": [
            "játék",
            "ux/interakció"
          ],
          "group": null,
          "short": "Saját videojáték-ötlet fejlesztése: narratíva, tér- és karaktertervezés, UX/UI, stúdiólátogatás."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 6. (Média design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": null,
          "groups": null,
          "instructors": "Sterk Barbara",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át workshopok, előadások és meghívott előadók által vezetett projektek formájában. A programok között szerepel a szakmában aktívan dolgozó előadók prezentációja, mesterkurzusok, innovációs és technikai bemutató előadások, konferencia- és kiállításlátogatás, valamint közös projektek kivitelezése. A teljesítés feltétele a jelenlét és a kijelölt szakmai feladatok határidőre való leadása.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "mesterkurzus",
            "projektmunka",
            "kiállítás",
            "ba"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni workshopok, előadások és meghívott előadók által vezetett projektek formájában, a társterületeket érintő alapismeretek és kompetenciák beemelésével, a kreatív ipari szemlélet fejlesztésével és a portfólió építésével.",
          "pdfUrl": "/tematikak/11826.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, vendégelőadók, kiállításlátogatás, közös projektek."
        },
        {
          "type": "Kötelező",
          "name": "Szakdolgozat készítése (média design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 2,
          "active": null,
          "groups": null,
          "instructors": "Kollár Dávid",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a szakdolgozat és általában a tudományos írásmű elkészítésének teljes folyamatát fedi le: anyaggyűjtés, forrásfeldolgozás, hivatkozási formák, a szövegstruktúra és a tartalomjegyzék kialakítása, végül a tanulmány megírása. A félév során a hallgatók pontosítják szakdolgozati témájukat, több forrást dolgoznak fel és ismertetnek, kutatásmódszertani ismereteket szereznek, és a szakszövegírás és az AI kapcsolatával is foglalkoznak. A félév végére elkészül a forrásgyűjtés, a tartalomjegyzék és a bevezetés.",
          "felelos": "Mayer Éva",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "szakdolgozat",
            "kutatás",
            "forrásgyűjtés",
            "hivatkozás",
            "tudományos írás",
            "kutatásmódszertan",
            "ba"
          ],
          "cel": "A kurzus célja a szakdolgozat készítéséhez szükséges elméleti és gyakorlati tudás elsajátítása, hogy a hallgató megfelelő színvonalú írásművet legyen képes alkotni a BA tanulmányait lezáró időszakban, és megszerzett szakmai tudását a szakmai fórumokon és a szélesebb, interdiszciplináris mezőnyben érdemben képviselje.",
          "pdfUrl": "/tematikak/11222.pdf",
          "category": [
            "diploma/portfólió",
            "elmélet"
          ],
          "group": null,
          "short": "Forrásgyűjtés, hivatkozás, kutatásmódszertan, szövegstruktúra; félév végére tartalomjegyzék és bevezetés."
        }
      ]
    },
    {
      "version": "2024/2025",
      "program": "MA",
      "semester": 1,
      "label": "Média Design MA 2024/2025",
      "courses": [
        {
          "type": "Kötelező",
          "name": "3D tervezés és szimuláció 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Tóth Gergő",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a 3D-s tervezés alapjait ismerteti meg az Autodesk Maya szoftver segítségével. Gyakorlati feladatokon keresztül a hallgatók virtuális térben létrehozott helyszínekkel dolgoznak: polygon modellezés, UV-kiterítés, textúrázás, shading, világítás és Arnold render, valamint layer- és pass-alapú renderelés. A félév a virtuális térben működő szimulációs eszközöket is érinti (szilárd test, fény, folyadék, haj, ruha), és a félév végére egy renderelt animáció készül el.",
          "felelos": "Balogh Áron Zsigmond Dr.",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Maya",
            "Arnold"
          ],
          "keywords": [
            "3d modellezés",
            "szimuláció",
            "maya",
            "textúrázás",
            "render",
            "világítás",
            "uv",
            "arnold"
          ],
          "cel": "A kurzus célja a 3D modellezés és szimuláció eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai) elsajátítása haladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni, felhasználni és prezentálni a 3D modellezés és szimuláció területét képező ismeretanyagot, technikai tudást és alkotói képességet.",
          "pdfUrl": "/tematikak/10443.pdf",
          "category": [
            "3d"
          ],
          "group": null,
          "short": "Maya: polygon modellezés, UV, shading, Arnold render, pass-ek, szimulációk; félévvégi renderelt animáció."
        },
        {
          "type": "Kötelező",
          "name": "Digitális tervezés 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Bogdán Zoltán, Palotás Kincső",
          "institute": "AMD",
          "note": null,
          "description": "Kétmodulos gyakorlati kurzus: a 3D modulban a hallgatók egy élethű textúrákkal, fényekkel és látvánnyal kidolgozott 3D-s képet készítenek a Maya shading, textúrázás, világítás és render eszközeivel, egyszerű dinamikai szimulációval és animációval kiegészítve. A 2D modulban a digitális animáció alapjait sajátítják el After Effectsben a kezdetektől az exportálásig, féléves feladatként pedig archív fotókra épülő, állókép alapú parallax animációt hoznak létre.",
          "felelos": "Selján Márk Endre",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Maya",
            "After Effects",
            "Photoshop"
          ],
          "keywords": [
            "3d",
            "maya",
            "after effects",
            "textúra",
            "fény",
            "shading",
            "parallax animáció",
            "kompozitálás"
          ],
          "cel": "A tantárgy az animáció területén használatos digitális eljárások magas szintű alkalmazására helyezi a hangsúlyt, kiemelten és személyre szabottan támogatva a párhuzamosan futó kreatív projekteket. A félévi tevékenység önálló kutatásra és kísérletezésre sarkallja a hallgatókat, amelynek eredményeként új eszközöket fedeznek fel és projektre szabott, egyéni munkafolyamatokat alakítanak ki.",
          "pdfUrl": "/tematikak/10542.pdf",
          "category": [
            "3d",
            "2d",
            "animáció"
          ],
          "group": null,
          "short": "Élethű 3D kép Mayában (textúra, fény, render) + After Effects: archív fotókra épülő parallax animáció."
        },
        {
          "type": "Kötelező",
          "name": "Interaktív rendszerek 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Varga Vajk",
          "institute": "AMD",
          "note": null,
          "description": "A szemeszter során a hallgatók egyszerű interaktív rendszerek tervezéséhez szükséges tudást sajátítanak el gyakorlati feladatokon keresztül: elektronikai alapismeretek, forrasztás, mikrokontrollerek és érzékelők használata, valamint a mikrokontrollerek és szoftverek (pl. TouchDesigner) összekapcsolása, DMX vezérlés. A félév végére mindenki egy saját multimédiás, interaktív installáció terveit készíti el és prezentálja.",
          "felelos": "Sterk Barbara DLA",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Arduino",
            "TouchDesigner"
          ],
          "keywords": [
            "mikrokontroller",
            "elektronika",
            "touchdesigner",
            "interaktív",
            "arduino",
            "installáció",
            "érzékelők",
            "dmx"
          ],
          "cel": "A kurzus célja alapvető elektronikai ismeretek elsajátítása, a mikrokontrollerek használatának megértése és gyakorlati alkalmazása különböző ipari és képzőművészeti területeken. A hallgató a kurzus elvégzése után képes haladó szinten létrehozni analóg és szoftveres eszközökkel vezérelhető interaktív elektronikai rendszereket, és gyakorlati tudást szerez az interaktív installációk megvalósítási metódusairól.",
          "pdfUrl": "/tematikak/10458.pdf",
          "category": [
            "ux/interakció",
            "installáció"
          ],
          "group": null,
          "short": "Elektronika, forrasztás, Arduino és szenzorok, TouchDesigner- és DMX-vezérlés; saját installáció terve."
        },
        {
          "type": "Kötelező",
          "name": "Médiatervezés 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 6,
          "credits": 7,
          "active": null,
          "groups": null,
          "instructors": "Németi Fanni, Forgács Kristóf",
          "institute": "AMD",
          "note": null,
          "description": "Kétmodulos gyakorlati kurzus a médiatervezés haladó szintű elsajátítására. Az egyik modulban a hallgatók After Effectsben dolgoznak: egy szabadon választott filmhez alternatív főcímet, valamint kreatív mozgóképes önéletrajzot (CV) terveznek és kiviteleznek storyboardtól a kész filmig. A másik modulban tervezésmódszertani gyakorlatok és művészeti kutatás után egy fiktív karakter social media oldalát építik fel eredeti, kreatív posztokkal.",
          "felelos": "Molnár Ágnes Éva",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "After Effects",
            "Photoshop",
            "Illustrator"
          ],
          "keywords": [
            "médiatervezés",
            "after effects",
            "mozgókép",
            "főcím",
            "mozgástervezés",
            "közösségi média",
            "storyboard",
            "tervezésmódszertan"
          ],
          "cel": "A kurzus célja a médiatervezés eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai) elsajátítása haladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni, felhasználni és prezentálni a médiatervezés területét képező ismeretanyagot, technikai tudást és alkotói képességet.",
          "pdfUrl": "/tematikak/10454.pdf",
          "category": [
            "animáció",
            "2d",
            "film/videó"
          ],
          "group": null,
          "short": "Alternatív filmfőcím és mozgóképes CV After Effectsben; fiktív karakter social media oldala posztokkal."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 1. (Média design MA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": null,
          "groups": null,
          "instructors": "Forgács Kristóf",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át workshopok, előadások és meghívott előadók által vezetett projektek formájában. A programok között szerepel a szakmában aktívan dolgozó előadók prezentációja, mesterkurzusok, innovációs és technikai bemutatók, konferenciarészvétel, kiállításlátogatás és közös projektek kivitelezése. Fontos szempont a társterületi alapismeretek beemelése és a portfólióépítés.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "projektmunka",
            "kiállítás",
            "mesterkurzus",
            "konferencia"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak workshopok, előadások és meghívott előadók által vezetett projektek formájában, a társterületeket érintő kompetenciák beemelésével és a kreatív iparban használatos szemlélet, valamint a portfólió fejlesztésével.",
          "pdfUrl": "/tematikak/10452.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, konferencia- és kiállításlátogatás meghívott előadókkal; portfólióépítés."
        }
      ]
    },
    {
      "version": "2024/2025",
      "program": "MA",
      "semester": 2,
      "label": "Média Design MA 2024/2025",
      "courses": [
        {
          "type": "Kötelező",
          "name": "3D tervezés és szimuláció 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Tóth Gergő",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a 3D tervezés elmélyítésére épül: a hallgatók finomhangolják kulcsolási, kameramozgatási, renderelési és fényelési képességeiket, és megtanulják a komplex 3D jeleneteket produkciós minőségben utómunkára előkészíteni és véglegesíteni. A félév során az Autodesk Maya legújabb szimulációs és árnyalási eszközeivel, Mixamo-alapú karakteranimációval, környezetépítéssel (camera mapping, bifrost szimulációk) és kompozitálási alapokkal foglalkoznak. A félév végi projekt egy maximum egyperces videó, amely a megszerzett tudást összegzi.",
          "felelos": "Balogh Áron Zsigmond Dr.",
          "prerequisite": "3D tervezés és szimuláció 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Maya",
            "Mixamo"
          ],
          "keywords": [
            "3d animáció",
            "maya",
            "mixamo",
            "kulcsolás",
            "renderelés",
            "kompozitálás",
            "szimuláció",
            "fényelés"
          ],
          "cel": "A kurzus célja, hogy a diákok alaposan elsajátítsák a 3D tervezés alapjait: az előző félévben tapasztalt hiányosságok kiküszöbölésével finomhangolják a kulcsolási, kameramozgatási, renderelési és fényelési képességeiket, valamint megismerjék az utómunka-szoftverek szerepét a produkciós minőségű 3D jelenetek véglegesítésében.",
          "pdfUrl": "/tematikak/11223.pdf",
          "category": [
            "3d",
            "animáció"
          ],
          "group": null,
          "short": "Maya: Mixamo karakteranimáció, camera mapping, bifrost szimuláció, fényelés, render passok, kompozitálás."
        },
        {
          "type": "Kötelező",
          "name": "Digitális tervezés 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Bogdán Zoltán, Palotás Kincső",
          "institute": "AMD",
          "note": null,
          "description": "A tantárgy az animáció területén használatos digitális eljárások magas szintű alkalmazására helyezi a hangsúlyt, önálló kutatásra és kísérletezésre sarkallva a hallgatókat. A 3D blokkban egy komplexebb 3D animáció készül Autodesk Maya szoftverrel: forgatott 2D nyersanyaghoz illesztett 3D tér, HDRI világítás, karakter rigging és render passes kompozitálás. A 2D blokkban After Effectsben egy 3-5 másodperces mozgó logó (ID) készül saját logótervezéssel és animálással, effektek és expressionök használatával.",
          "felelos": "Selján Márk Endre",
          "prerequisite": "Digitális tervezés 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Maya",
            "After Effects",
            "Illustrator"
          ],
          "keywords": [
            "3d",
            "maya",
            "after effects",
            "illustrator",
            "kompozitálás",
            "mozgó logó",
            "karakteranimáció",
            "expression"
          ],
          "cel": "A tantárgy célja az animáció területén használatos digitális eljárások magas szintű alkalmazása, a párhuzamosan futó kreatív projektek személyre szabott támogatásával. A hallgatók önálló kutatás és kísérletezés révén új eszközöket fedeznek fel, és projektre szabott, egyéni munkafolyamatokat alakítanak ki.",
          "pdfUrl": "/tematikak/12057.pdf",
          "category": [
            "3d",
            "animáció",
            "2d"
          ],
          "group": null,
          "short": "3D animáció forgatott videóra illesztve (Maya, HDRI, rigging) + 3-5 mp-es mozgó logó After Effectsben."
        },
        {
          "type": "Kötelező",
          "name": "Interaktív rendszerek 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Varga Vajk",
          "institute": "AMD",
          "note": null,
          "description": "A szemeszter során a hallgatók összetett interaktív rendszerek tervezéséhez szükséges tudást sajátítanak el gyakorlati feladatokon keresztül: elektronikai rendszerekkel, mikrokontrollerekkel, TouchDesigner szoftverrel és Microsoft Kinecttel dolgoznak. Témák többek között az audio-reaktív vizuálok, mozgásvezérelt interfészek, particle systemek, DMX/NDI/OSC/MIDI vezérlés és adatvizualizáció. A félév végén saját multimédiás interaktív installációt készítenek, valamint csoportosan audiovizuális alkotást terveznek a Magyar Zene Háza hangdómjába.",
          "felelos": "Sterk Barbara DLA",
          "prerequisite": "Interaktív rendszerek 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "TouchDesigner",
            "Kinect"
          ],
          "keywords": [
            "touchdesigner",
            "kinect",
            "interaktív",
            "motion tracking",
            "installáció",
            "adatvizualizáció",
            "vj",
            "elektronika"
          ],
          "cel": "A kurzus célja az interaktív rendszerek eszközismereti, alkotói (tervezői) és művészi (esztétikai) elsajátítása haladó szinten. A hallgató a kurzus elvégzése eredményeképpen képes haladó szinten felismerni, elemezni, érteni, felhasználni és prezentálni az ezen rendszerek területének műveléséhez szükséges ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/11434.pdf",
          "category": [
            "ux/interakció",
            "installáció"
          ],
          "group": null,
          "short": "TouchDesigner + Kinect: audio-reaktív vizuálok, mozgásvezérlés, particle system, DMX/OSC/MIDI, installáció."
        },
        {
          "type": "Kötelező",
          "name": "Médiatervezés 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 6,
          "credits": 7,
          "active": null,
          "groups": null,
          "instructors": "Princz Ágoston, Németi Fanni",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus két blokkban dolgozza fel a médiatervezés haladó gyakorlatát. Az egyik blokk a filmes vizuális effektek (VFX) utómunkájára fókuszál: tervezés, forgatási eljárások, kamera lekövetés, rotoscope, digital matte paint és kompozitálás Blender és DaVinci Resolve szoftverekkel. A másik blokkban a hallgatók egy 1-2 perces explainer (magyarázó) videót készítenek szabadon választott témában, saját szöveggel, storyboarddal és látványtervvel, a megvalósításhoz Adobe After Effectset használva.",
          "felelos": "Molnár Ágnes Éva",
          "prerequisite": "Médiatervezés 1.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Blender",
            "DaVinci Resolve",
            "After Effects",
            "Illustrator",
            "Photoshop"
          ],
          "keywords": [
            "vfx",
            "kompozitálás",
            "after effects",
            "blender",
            "davinci resolve",
            "explainer videó",
            "utómunka",
            "mozgógrafika"
          ],
          "cel": "A kurzus célja a médiatervezés eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai) elsajátítása magas szinten. A hallgató a kurzus elvégzése eredményeképpen képes elmélyült szinten felismerni, elemezni, érteni, felhasználni és prezentálni a médiatervezés területét képező ismeretanyagot, technikai tudást, alkotói képességet és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/11230.pdf",
          "category": [
            "film/videó",
            "animáció",
            "3d"
          ],
          "group": null,
          "short": "Filmes VFX-utómunka (tracking, rotoscope, matte paint, Blender, Resolve) + explainer videó After Effectsben."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 2. (Média design MA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": null,
          "groups": null,
          "instructors": "Mayer Éva",
          "institute": "AMD",
          "note": null,
          "description": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át workshopok, előadások és meghívott előadók által vezetett projektek formájában. A programok között szerepelnek a szakmában aktívan dolgozó előadók prezentációi, mesterkurzusok, innovációs és technikai bemutató előadások, konferenciarészvétel, kiállításlátogatás és közös projektek kivitelezése. A teljesítés feltétele a jelenlét és a kijelölt szakmai feladatok határidőre való leadása.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "mesterkurzus",
            "portfólió",
            "konferencia",
            "kiállítás"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak workshopok, előadások és meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, akár vendégelőadók, akár közös programok formájában. A tárgy keretében megvalósulnak a MyBrand szemlélet fontos alappillérei: különböző szakterületek találkozása, tudás- és kompetenciaelemek egymásra épülése, a kreatív iparban használatos szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/11835.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, meghívott előadók, kiállításlátogatás és közös projektek a tanterven túl."
        }
      ]
    },
    {
      "version": "2024/2025",
      "program": "MA",
      "semester": 3,
      "label": "Média Design MA 2024/2025",
      "courses": [
        {
          "type": "Kötelező",
          "name": "Digitális tervezés 3.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Bogdán Zoltán, Palotás Kincső",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus két modulban mélyíti a digitális animációs tudást: a 3D modulban a hallgatók a Maya haladó szimulációs eszközeivel (nCloth ruhaszimuláció, tűz- és Bifrost folyadékszimuláció) készítenek egy komplexebb 3D animációt, a shadeléstől a renderelésig. A 2D modulban a digitális animációs utómunka folyamatait gyakorolják — maszkolás, karakteranimálás, puppet tool, effektek, kompozitálás, expression-ök —, a féléves beadandó egy 1-3 perces infografikai animáció.",
          "felelos": "Csáki László",
          "prerequisite": "Digitális tervezés 2.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Maya",
            "After Effects",
            "Photoshop"
          ],
          "keywords": [
            "3d",
            "maya",
            "szimuláció",
            "ncloth",
            "bifrost",
            "mozgógrafika",
            "kompozitálás",
            "infografika"
          ],
          "cel": "A tárgy a korábbi tapasztalatokra alapozba, továbbra is az egyéni stílus és projektre szabott munkamódszer fejlesztésére helyezi a hangsúlyt, szem előtt tartva a gyárthatóság szempontjait. A tárgyalt területek érintik a 2d és 3d animáció, valamint a vizuális effektek animációs vonatkozású területét.",
          "pdfUrl": "/tematikak/10543.pdf",
          "category": [
            "3d",
            "animáció",
            "2d"
          ],
          "group": null,
          "short": "Maya-szimulációk (nCloth, tűz, Bifrost) + 2D utómunka: puppet tool, expression, infografikai animáció."
        },
        {
          "type": "Kötelező",
          "name": "Médiatervezés 3.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 6,
          "credits": 7,
          "active": null,
          "groups": null,
          "instructors": "Berkes Bálint, Pápai Bence",
          "institute": "AMD",
          "note": null,
          "description": "Kétmodulos gyakorlati tárgy: az A modulban a hallgatók a fényt mint művészi eszközt tanulmányozzák — projection mapping, DMX-vezérelt lámpák, robotlámpák és valós idejű Unreal Engine-es megoldások segítségével saját fényművészeti installációt hoznak létre. A B modul a game design alapjaira fókuszál: játékmechanikák, GDD-írás, karakter- és level design, UX/UI, prototípuskészítés és iteráció, a félév végén saját játékfejlesztési asset dokumentált leadásával.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "Médiatervezés 2.",
          "requirement": "gyakorlati jegy",
          "software": [
            "MadMapper",
            "Unreal Engine"
          ],
          "keywords": [
            "fényművészet",
            "projection mapping",
            "installáció",
            "dmx",
            "játékmechanika",
            "játéktervezés",
            "prototípus",
            "pályatervezés"
          ],
          "cel": "A tárgy célja, hogy a hallgatók megismerjék a fény mint művészi eszköz alkalmazási lehetőségeit a multimédiás formákban, valamint elsajátítsák a játéktervezés alapelveit és folyamatait a mechanikáktól a prototípuskészítésen át az iterációig.",
          "pdfUrl": "/tematikak/10447.pdf",
          "category": [
            "installáció",
            "játék"
          ],
          "group": null,
          "short": "Fényművészet: projection mapping, DMX, robotlámpák, Unreal + game design: GDD, level design, prototípus."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 3. (Média design MA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": null,
          "groups": null,
          "instructors": "Forgács Kristóf",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át: a szakmában aktívan dolgozó meghívott előadók prezentációi, mesterkurzusok, innovációs előadások és workshopok, technikai bemutatók, konferenciarészvétel, kiállításlátogatás és közös projektek formájában. Fontos szempont a társterületi alapismeretek és kompetenciák beemelése, valamint a portfólió építése.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "mesterkurzus",
            "konferencia",
            "portfólió",
            "ma"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak workshopok, előadások és meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, akár vendégelőadók, akár közös programok formájában, valamint a MyBrand szemlélet alappilléreinek megvalósítása és a portfólió építése.",
          "pdfUrl": "/tematikak/10341.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Meghívott előadók, mesterkurzusok, workshopok, konferencia- és kiállításlátogatás, portfólióépítés."
        }
      ]
    },
    {
      "version": "2024/2025",
      "program": "MA",
      "semester": 4,
      "label": "Média Design MA 2024/2025",
      "courses": [
        {
          "type": "Kötelező",
          "name": "Diplomamunka (média design MA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 12,
          "credits": 20,
          "active": null,
          "groups": null,
          "instructors": "Forgács Kristóf, Pápai Bence, Kollár Dávid",
          "institute": "AMD",
          "note": null,
          "description": "A mesterszakos diplomafélév három blokkban készíti fel a végzős hallgatókat a diplomához kapcsolódó feladatokra. Az egyik blokk a játékfejlesztés teljes folyamatát járja végig a tervezéstől a kiadásig, csapatmunkában, a hallgató által választott fejlesztési területen (grafika, animáció, level design, hang stb.). Egy másik blokk a szakszövegírást, a tudományos szövegek feldolgozását és a szakdolgozat strukturált felépítését gyakoroltatja, a harmadik pedig a diplomamunka projektszerű kezelését, a diplomaprezentációt, valamint a portfólió és showreel összeállítását segíti.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "diplomamunka",
            "ma",
            "portfólió",
            "showreel",
            "prezentáció",
            "szakdolgozat",
            "játékfejlesztés",
            "projekttervezés"
          ],
          "cel": "A kurzus célja a diplomamunkához szükséges eszközismereti (szoftverismereti), alkotói (tervezői) és művészi (esztétikai) ismeretek elsajátítása, kreatív készségek kifejlesztése és prezentációs tudás megszerzése haladó szinten. A hallgató a kurzus eredményeképpen képes haladó szinten felismerni, elemezni, érteni és alkalmazni a diplomamunkája elkészítéséhez elengedhetetlen ismeretanyagot, technikai tudást és prezentációs eljárásokat.",
          "pdfUrl": "/tematikak/11218.pdf",
          "category": [
            "diploma/portfólió",
            "projekt"
          ],
          "group": null,
          "short": "Diplomafélév három blokkban: játékfejlesztés csapatban, szakdolgozatírás, portfólió és showreel."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 4. (Média design MA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": null,
          "groups": null,
          "instructors": "Forgács Kristóf",
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át workshopok, előadások és meghívott előadók által vezetett projektek formájában. A programok között szerepel szakmában dolgozó előadók prezentációja, mesterkurzusok, innovációs és technikai bemutató előadások, konferenciarészvétel, kiállításlátogatás és közös projektek kivitelezése. A teljesítés feltétele a jelenlét, valamint a kijelölt szakmai feladatok határidőre való leadása.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "mesterkurzus",
            "projektmunka",
            "kiállítás",
            "ma"
          ],
          "cel": "A tárgy a mintatantervben foglalt szakmai ismereteken túlmutató tudást hivatott átadni a hallgatóknak workshopok, előadások és meghívott előadók által vezetett projektek formájában. Fontos szempont a társterületeket érintő alapismeretek és kompetenciák beemelése, akár vendégelőadók, akár közös programok formájában. A tárgy keretében megvalósulnak a MyBrand szemlélet fontos alappillérei: különböző szakterületek találkozása, tudás- és kompetenciaelemek egymásra épülése, a kreatív iparban használatos szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/11828.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, meghívott előadók; kiállításlátogatás, konferenciák, közös szakmai projektek."
        }
      ]
    },
    {
      "version": "régi (korábbi)",
      "program": "BA",
      "semester": 1,
      "label": "Média Design BA régi (korábbi)",
      "courses": [
        {
          "type": "Kötelező",
          "name": "Művészettörténet társadalomtudományi kontextusban 1.",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Előadás jellegű elméleti alapozó tárgy, amely a művészettörténet meghatározó korszakait és irányzatait társadalomtudományi kontextusban tárgyalja. A hallgatók a művek és alkotók megismerése mellett a mögöttes társadalmi, kulturális és gazdasági összefüggéseket is vizsgálják, ami megalapozza a média design képzés vizuális műveltségét.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "művészettörténet",
            "társadalomtudomány",
            "kultúrtörténet",
            "vizuális kultúra",
            "korszakok",
            "elmélet"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Művészettörténeti korszakok és irányzatok társadalmi, kulturális és gazdasági összefüggéseikben."
        },
        {
          "type": "Kötelező",
          "name": "Kommunikációs ismeretek alapjai",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadás, amely a kommunikáció alapfogalmait, modelljeit és folyamatait ismerteti. A tárgy a kommunikációtudomány alapvető ismeretanyagát adja át, megalapozva a média design szak további elméleti és gyakorlati tárgyait.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "kommunikáció",
            "kommunikációelmélet",
            "médiaelmélet",
            "üzenet",
            "befogadó",
            "alapismeretek"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "A kommunikáció alapfogalmai, modelljei és folyamatai — elméleti alap a további média design tárgyakhoz."
        },
        {
          "type": "Kötelező",
          "name": "Média-design stúdiumok 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": null,
          "credits": null,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "AMD",
          "note": null,
          "description": "A média design szak alapozó, alkotói készségfejlesztő főtantárgya, amely a manuális és digitális képalkotás alapelveit tanítja kompozíciós, perspektíva- és anatómiai gyakorlatokon keresztül. A félév a kockológiától és a rész-egész kompozícióktól a portréábrázoláson és a színkontraszt-gyakorlatokon át a digitális parafrázisokig vezet, múzeumlátogatással kiegészítve. A kézi rajzokat a hallgatók digitális szoftverekkel értelmezik tovább, így fejlődik térlátásuk, kompozíciós készségük és egyéni formanyelvük.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Lightroom",
            "Premiere Pro",
            "After Effects"
          ],
          "keywords": [
            "kompozíció",
            "perspektíva",
            "anatómia",
            "szabadkézi rajz",
            "térábrázolás",
            "színtan",
            "parafrázis",
            "képalkotás"
          ],
          "cel": "A média design szakma műveléséhez elengedhetetlen képnyelvi alapismeretek átadása, az alkotói készségek fejlesztése, valamint a manuális és számítógépes képalkotás alapelveinek ismertetése és gyakoroltatása.",
          "pdfUrl": "/tematikak/ext-media-design-studiumok-1.pdf",
          "category": [
            "2d",
            "grafika/tipográfia"
          ],
          "group": null,
          "short": "Kompozíció, perspektíva, portré-anatómia, színtan: kézi rajz digitális továbbértelmezéssel, parafrázisok."
        },
        {
          "type": "Kötelező",
          "name": "Digitális grafikai stúdiumok",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": null,
          "credits": null,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "AMD",
          "note": null,
          "description": "Alapozó gyakorlati tárgy, amely a képernyő-specifikus grafikai tervezés és a digitális képalkotás, képfeldolgozás alapelveit tanítja az Adobe Illustrator és Photoshop használatán keresztül. A hallgatók a képi közlés alapelemeivel (szín, forma, vonal, kompozíció, tipográfia) és azok kreatív alkalmazásával dolgoznak adatvizualizációs, piktogram-, logóparafrázis- és bannertervezési feladatokban. A kurzus megalapozza a későbbi mozgógrafikai és 3D modellezői tanulmányokat.",
          "felelos": "Kiss Melinda",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Illustrator",
            "Photoshop"
          ],
          "keywords": [
            "digitális grafika",
            "vizuális kommunikáció",
            "piktogram",
            "adatvizualizáció",
            "vektorgrafika",
            "képfeldolgozás",
            "logó",
            "banner"
          ],
          "cel": "A média design szakma műveléséhez szükséges képnyelvi és mozgóképnyelvi alapismeretek átadása, valamint a számítógépes képalkotás, képfeldolgozás és képszerkesztés alapelveinek elsajátítása az Adobe Illustrator és Photoshop programok használatával.",
          "pdfUrl": "/tematikak/ext-digitalis-grafikai-studiumok.pdf",
          "category": [
            "2d",
            "grafika/tipográfia"
          ],
          "group": null,
          "short": "Vektor- és pixelgrafika: adatvizualizáció, piktogram, logóparafrázis, banner (Illustrator, Photoshop)."
        },
        {
          "type": "Kötelező",
          "name": "UX-design stúdiumok 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": null,
          "credits": null,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "AMD",
          "note": null,
          "description": "Alapozó UX design gyakorlat, amely a felhasználói élmény tervezés alapismereteit, módszereit és folyamatait tanítja a Design Thinking keretrendszer mentén, Miro és Figma szoftverek használatával. A hallgatók egy szabadon választott digitális alkalmazás tervezési folyamatát viszik végig a feltáró kutatástól és interjúzástól a perszónákon, customer journey-n és információs architektúrán át az interfésztervekig és a prototípusig. A kurzus a munkaerőpiacon keresett digitális terméktervezői készségeket alapozza meg.",
          "felelos": "Balogh Áron Zsigmond Dr.",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Figma",
            "Miro"
          ],
          "keywords": [
            "ux",
            "felhasználói élmény",
            "design thinking",
            "perszóna",
            "customer journey",
            "user flow",
            "prototípus",
            "figma"
          ],
          "cel": "A UX design eszközismereti, alkotói és művészi elsajátítása alapszinten; a hallgató képes lesz a UX design ismeretanyagát felismerni, elemezni, alkalmazni és prezentálni.",
          "pdfUrl": "/tematikak/ext-ux-design-studiumok-1.pdf",
          "category": [
            "ux/interakció"
          ],
          "group": null,
          "short": "App-tervezés Design Thinking mentén: kutatás, perszóna, customer journey, user flow, prototípus (Figma, Miro)."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 1. (Média design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": null,
          "credits": null,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "AMD",
          "note": null,
          "description": "Interdiszciplináris projekthét, amely a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át workshopok, előadások, mesterkurzusok és meghívott szakmai vendégek programjai formájában. A programok között innovációs előadások, technikai bemutatók, konferencia- és kiállításlátogatások, valamint közös projektek szerepelnek, támogatva a kreatív ipari szemlélet fejlesztését és a portfólióépítést.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "jelenlét és a kijelölt szakmai feladatok teljesítése",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "mesterkurzus",
            "meghívott előadó",
            "portfólió",
            "kreatív ipar",
            "kiállítás"
          ],
          "cel": "A mintatantervi ismereteken túlmutató szakmai tudás átadása, a különböző szakterületek közötti párbeszéd ösztönzése, a kreatív iparban használatos szemlélet és a portfólióépítés támogatása.",
          "pdfUrl": "/tematikak/ext-projekthet-1-media-design-ba.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, meghívott előadók, kiállításlátogatás — szakmán túli tudás, portfólióépítés."
        },
        {
          "type": "Kötelező",
          "name": "Start My Brand (művész)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 2,
          "credits": 0,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "AMD",
          "note": null,
          "description": "A METU MyBrand programjához kapcsolódó tréning jellegű kurzus művészeti szakos hallgatóknak, amely a személyes márka és a szakmai identitás tudatos építését alapozza meg. A hallgatók önismereti és karriertervezési gyakorlatokon keresztül ismerkednek saját erősségeikkel és céljaikkal.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "tr (tréning)",
          "software": [],
          "keywords": [
            "személyes márka",
            "önismeret",
            "karrier",
            "tréning",
            "portfólió",
            "mybrand"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Önismereti és karriertervezési tréning: személyes márka és szakmai identitás tudatos építése."
        },
        {
          "type": "Kötelező",
          "name": "Interakciótervezés 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": null,
          "credits": null,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "AMD",
          "note": null,
          "description": "Az interakciótervezés alapjait tanító gyakorlat, amely technikai és művészeti modulra tagolódik. A technikai részben a hallgatók az elektronika alapjait és az Arduino programozását sajátítják el (digitális és analóg I/O, vezérlési szerkezetek, ciklusok, szervomotorok), a művészeti modulban pedig a fizikai algoritmikus alkotás, kinetikus előképek és anyagkísérletek világával ismerkednek. A félév végére műhelymunka keretében saját tervezésű interaktív objekteket készítenek videódokumentációval és prezentációval.",
          "felelos": "Sterk Barbara DLA",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Arduino"
          ],
          "keywords": [
            "interakciótervezés",
            "arduino",
            "elektronika",
            "fizikai számítástechnika",
            "prototípus",
            "kinetikus",
            "anyagkísérlet",
            "interaktív objekt"
          ],
          "cel": "Az interakciótervezés alapjainak elsajátítása eszközismereti (Arduino), fizikai alkotói és művészeti szemlélet szempontjából; a hallgató képes lesz az interakciótervezés ismeretanyagát felismerni, elemezni, alkalmazni és prezentálni.",
          "pdfUrl": "/tematikak/ext-interakciotervezes-1.pdf",
          "category": [
            "ux/interakció",
            "installáció"
          ],
          "group": null,
          "short": "Arduino és elektronika alapok, szenzorok, szervók; anyagkísérletek, saját interaktív objektek építése."
        }
      ]
    },
    {
      "version": "régi (korábbi)",
      "program": "BA",
      "semester": 2,
      "label": "Média Design BA régi (korábbi)",
      "courses": [
        {
          "type": "Kötelező",
          "name": "Művészettörténet társadalomtudományi kontextusban 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": null,
          "credits": null,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "AMD",
          "note": null,
          "description": "A művészettörténet-sorozat második féléve, amely a művészet történetét társadalomtudományi kontextusban tárgyalja. A kurzus a korszakok, irányzatok és alkotók megismerésén túl a művek társadalmi, kulturális és gazdasági beágyazottságának megértését célozza. Az elméleti ismeretek a hallgatók tervezői és alkotói munkájának történeti megalapozását szolgálják.",
          "felelos": "—Oktató: —Összegzés: —Cél: —Alkalmazott szoftver: —Kérdés-kérés: —Előfeltétel: —Előadás: 2 óraGyakorlat: 0 óraKövetelmény: kKredit: 4Intézet: ELM",
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "művészettörténet",
            "társadalomtudomány",
            "kultúrtörténet",
            "műelemzés",
            "vizuális kultúra",
            "elmélet"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Korszakok, irányzatok és alkotók: a művek társadalmi, kulturális és gazdasági beágyazottsága."
        },
        {
          "type": "Kötelező",
          "name": "Bevezetés a filozófiába és az esztétikába",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadás, amely bevezetést nyújt a filozófia és az esztétika alapkérdéseibe, fő irányzataiba és fogalmi rendszerébe. A kurzus a művészeti és tervezői gyakorlat elméleti hátterét alapozza meg, fejlesztve a hallgatók kritikai és fogalmi gondolkodását.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "filozófia",
            "esztétika",
            "művészetfilozófia",
            "elmélet",
            "kritikai gondolkodás",
            "fogalmi alapok"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Filozófiai és esztétikai alapkérdések, fő irányzatok és fogalmak; kritikai gondolkodás fejlesztése."
        },
        {
          "type": "Kötelező",
          "name": "Tipográfia és betűrajz",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": null,
          "credits": null,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "AMD",
          "note": null,
          "description": "Alapozó tipográfia és betűrajz kurzus, amely a betűanatómiát, a betűtörténetet a római kapitálistól a talpnélküli antikváig, valamint a számítógépes kiadványtervezés (DTP) alapjait dolgozza fel. A hallgatók betűrajzi és kreatív gyakorlatokon keresztül betűkompozíciókat, geometrikus, kábel és kontúr típusú betűterveket, saját fontot és kiadványtervet készítenek. A szoftveres munka az InDesignra épül, a tervezett betű fontállománnyá alakításáig és a nyomdai előkészítésig.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "InDesign",
            "Photoshop",
            "Fontself"
          ],
          "keywords": [
            "tipográfia",
            "betűrajz",
            "betűtörténet",
            "betűtervezés",
            "kiadványtervezés",
            "dtp",
            "fonttervezés",
            "nyomdai előkészítés"
          ],
          "cel": "A tipográfia és betűrajz eszközismereti, alkotói és művészi elsajátítása alapszinten; a hallgató képes legyen felismerni, elemezni és alkalmazni a tipográfia és betűrajz ismeretanyagát, valamint prezentálni munkáit.",
          "pdfUrl": "/tematikak/ext-tipografia-es-beturajz.pdf",
          "category": [
            "grafika/tipográfia",
            "2d"
          ],
          "group": null,
          "short": "Betűanatómia, betűtörténet a római kapitálistól a sans serifig; fontterv és kiadvány InDesignban."
        },
        {
          "type": "Kötelező",
          "name": "Média-design stúdiumok 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": null,
          "credits": null,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "AMD",
          "note": null,
          "description": "A médiatervezés képnyelvi, fotográfiai és mozgóképnyelvi alapjait tanító gyakorlati kurzus második féléve. A hallgatók az expozíció, világítástechnika, plánok és kompozíció témáitól a Lightroom-alapú képfeldolgozáson át a mozgóképkészítésig jutnak: kameramozgások, vágás, log rögzítés és színkezelés, hangi történetmesélés, valamint a Premiere Pro és After Effects közti Dynamic Link használata. Féléves feladat egy hívószóra készített fotósorozat és egy rövid kisfilm.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "Média design stúdiumok 1. (teljesítés)",
          "requirement": "gyakorlati jegy",
          "software": [
            "Lightroom",
            "Premiere Pro",
            "After Effects"
          ],
          "keywords": [
            "fotográfia",
            "mozgókép",
            "képnyelv",
            "világítás",
            "kompozíció",
            "vágás",
            "színkezelés",
            "utómunka"
          ],
          "cel": "A médiatervezés eszközismereti, alkotói és művészi elsajátítása alapszinten; a hallgató képes legyen a képnyelvi ismeretek, a videó-felvételtechnika és a szerkesztés alkalmazására és továbbtanulására.",
          "pdfUrl": "/tematikak/ext-media-design-studiumok-2.pdf",
          "category": [
            "fotó",
            "film/videó"
          ],
          "group": null,
          "short": "Expozíció, világítás, plánok; Lightroom-képfeldolgozás, vágás, színkezelés — fotósorozat és kisfilm."
        },
        {
          "type": "Kötelező",
          "name": "Interakciótervezés 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": null,
          "credits": null,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "AMD",
          "note": null,
          "description": "Haladó interakciótervezés kurzus, amely technikai és művészeti modulból áll. A technikai modulban a hallgatók az Arduino haladóbb gyakorlatait sajátítják el: szenzorok (távolság-, fény-, érintés- és közelségérzékelés) és aktuátorok (fények, szervók, motorok) programozását. A művészeti modul inspirációgyűjtésen, fénykutatáson, anyagkísérleten és a luminokinetika művészettörténeti kontextusán keresztül vezet el egy interaktív műalkotás megtervezéséig, kivitelezéséig és dokumentálásáig.",
          "felelos": "Sterk Barbara",
          "prerequisite": "Interakciótervezés 1. (teljesítés)",
          "requirement": "gyakorlati jegy",
          "software": [
            "Arduino"
          ],
          "keywords": [
            "interakciótervezés",
            "arduino",
            "fizikai számítástechnika",
            "szenzorok",
            "aktuátorok",
            "luminokinetika",
            "interaktív installáció",
            "anyagkísérlet"
          ],
          "cel": "Az interakciótervezés eszközismereti, alkotói és művészi elsajátítása haladó szinten; a hallgató képes legyen önállóan interaktív tárgyak, művek létrehozására és prezentálására.",
          "pdfUrl": "/tematikak/ext-interakciotervezes-2.pdf",
          "category": [
            "ux/interakció",
            "installáció"
          ],
          "group": null,
          "short": "Haladó Arduino: szenzorok és aktuátorok programozása; interaktív fénymű tervezése és kivitelezése."
        },
        {
          "type": "Kötelező",
          "name": "UX-design stúdiumok 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": null,
          "credits": null,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "AMD",
          "note": null,
          "description": "A felhasználói élmény tervezés haladó kurzusa, amely a Design Thinking keretrendszer mentén viszi végig a hallgatókat egy szabadon választott digitális alkalmazás tervezési folyamatán. Témái a vizuális hierarchia és tervezési alapelvek, interakciók, usability heurisztikák, platformok (reszponzív web, Android, iOS), akadálymentesítés, felhasználói tesztelés és az esettanulmány-készítés. A féléves munka Figmában készített prototípusban, valamint kutatási összefoglalóban, perszónákban, customer journey-ben, user flow-ban és interfész tervekben ölt testet.",
          "felelos": "Balogh Áron Zsigmond",
          "prerequisite": "UX design stúdiumok 1. (teljesítés)",
          "requirement": "gyakorlati jegy",
          "software": [
            "Figma",
            "Miro"
          ],
          "keywords": [
            "ux design",
            "felhasználói élmény",
            "design thinking",
            "prototípus",
            "usability",
            "felhasználói tesztelés",
            "reszponzív",
            "interfész"
          ],
          "cel": "A UX design eszközismereti, alkotói és művészi elsajátítása haladó szinten; a hallgató képes legyen egy digitális alkalmazás felhasználói élményének megtervezésére és a folyamat prezentálására.",
          "pdfUrl": "/tematikak/ext-ux-design-studiumok-2.pdf",
          "category": [
            "ux/interakció",
            "web"
          ],
          "group": null,
          "short": "Design Thinking: app-prototípus Figmában — perszónák, user flow, usability-tesztelés, esettanulmány."
        },
        {
          "type": "Kötelező",
          "name": "Média-design szakelmélet",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": null,
          "credits": null,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "AMD",
          "note": null,
          "description": "Elméleti előadás, amely a média design szellemtörténeti előzményeivel, tudományos, technikai és társművészeti környezetével foglalkozik. Témái között szerepel a kép, jel és szimbólum szemiotikája, a fénykép ontológiája, a szóbeliség és írásbeliség, az ikonográfia és a képi fordulat, a bio-art, a játék- és gráfelmélet, az interaktivitás és a nonlineáris művészeti formák. Konkrét művek és alkotók elemzésén keresztül körvonalazza a média design kortárs művészeti alapállását.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "-",
          "requirement": "félév végi teszt vagy esszé",
          "software": [],
          "keywords": [
            "médiaelmélet",
            "szemiotika",
            "ikonográfia",
            "bio-art",
            "interaktivitás",
            "hálózatkutatás",
            "médiaművészet",
            "képelmélet"
          ],
          "cel": "A média design általános elméletének elsajátítása, hogy a hallgató alkotó-, tervező- és prezentációs munkájához elméleti megalapozásként és fogalmi kiegészítésként alkalmazhassa.",
          "pdfUrl": "/tematikak/ext-media-design-szakelmelet.pdf",
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Kép, jel, szimbólum: szemiotika, fénykép-ontológia, ikonográfia, bio-art, interaktivitás, hálózatok."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 2. (Média Design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": null,
          "credits": null,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "AMD",
          "note": null,
          "description": "A mintatantervben foglalt szakmai ismereteken túlmutató tudást átadó kurzus, amely workshopok, meghívott szakmai előadók prezentációi, mesterkurzusok, technikai bemutatók, konferenciarészvétel, kiállításlátogatás és közös projektek formájában valósul meg. Célja a különböző szakterületek találkozásának ösztönzése, a kreatív ipari szemlélet fejlesztése és a portfólióépítés támogatása.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "jelenlét és a kijelölt szakmai feladatok teljesítése",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "mesterkurzus",
            "portfólió",
            "kreatív ipar",
            "szakmai program"
          ],
          "cel": "A mintatanterven túlmutató szakmai tudás átadása, társterületi kompetenciák beemelése, a kreatív ipari szemlélet és a portfólióépítés fejlesztése.",
          "pdfUrl": "/tematikak/ext-projekthet-2-media-design-ba.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, meghívott előadók, kiállításlátogatás; kreatív ipari szemlélet, portfólió."
        }
      ]
    },
    {
      "version": "régi (korábbi)",
      "program": "BA",
      "semester": 3,
      "label": "Média Design BA régi (korábbi)",
      "courses": [
        {
          "type": "Kötelező",
          "name": "Művészetelmélet",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "A művészetelmélet alapfogalmait és főbb irányzatait bemutató elméleti előadás. A kurzus a művészeti alkotások értelmezéséhez és elemzéséhez szükséges fogalmi kereteket adja át, támogatva a hallgatók tervezői és alkotói munkájának elméleti megalapozását.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "művészetelmélet",
            "esztétika",
            "művészettörténet",
            "elmélet",
            "vizuális kultúra",
            "műelemzés"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Műelemzés és esztétika fogalmi keretei: a művészeti alkotások értelmezésének főbb elméleti irányzatai."
        },
        {
          "type": "Kötelező",
          "name": "Bevezetés a médiakultúrába",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "A médiakultúra alapjaiba bevezető elméleti előadás, amely a média működésének, történetének és társadalmi-kulturális szerepének átfogó megismerését szolgálja. A kurzus fogalmi és elméleti alapot nyújt a média design szakos hallgatók további tanulmányaihoz.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "médiakultúra",
            "médiaelmélet",
            "tömegkommunikáció",
            "vizuális kultúra",
            "média",
            "elmélet"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "A média története, működése és társadalmi-kulturális szerepe: elméleti alap a további tanulmányokhoz."
        },
        {
          "type": "Kötelező",
          "name": "Mozgógrafika 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": null,
          "credits": null,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "AMD",
          "note": null,
          "description": "Mozgógrafikai alapozó gyakorlat, amely az Adobe After Effects környezetében tanítja a kortárs motion design eszköztárát: kompozíciós felépítés, kulcskockás animáció, maszkolási és áttűnési technikák, színkorrekció, 3D layer-módszerek és a professzionális renderelési folyamat. A tematikát AI-alapú képi és videós tartalomgenerálás (Firefly, Runway) egészíti ki. A félév fő tanulási produktuma egy branding spot vizsgamunka, amelyet írásbeli elméleti zárthelyi egészít ki.",
          "felelos": "Kiss Melinda",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "After Effects",
            "Adobe Firefly",
            "Runway",
            "Media Encoder"
          ],
          "keywords": [
            "mozgógrafika",
            "motion design",
            "animáció",
            "after effects",
            "kulcskocka",
            "kompozíció",
            "generatív ai",
            "branding spot"
          ],
          "cel": "A mozgógrafika eszközismereti, alkotói és művészi elsajátítása alapszinten, hogy a hallgató korszerű kompetenciákkal, önállóan hozzon létre mozgógrafikai alkotásokat After Effects szoftverkörnyezetben, generatív AI-eszközökkel kiegészítve.",
          "pdfUrl": "/tematikak/ext-mozgografika-1.pdf",
          "category": [
            "animáció",
            "2d"
          ],
          "group": null,
          "short": "Motion design After Effectsben: kulcskocka, maszk, színkorrekció, AI-videó (Firefly, Runway), branding spot."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 3. (Média Design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": null,
          "credits": null,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervi szakmai ismereteken túlmutató tudást ad át workshopok, előadások, mesterkurzusok és meghívott szakmai vendégek által vezetett közös projektek formájában. A programok között innovációs előadások, technikai bemutatók, konferenciarészvétel és kiállítás-látogatás is szerepel, támogatva a szakterületek közötti együttműködést és a portfólióépítést.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "mesterkurzus",
            "vendégelőadó",
            "portfólió",
            "kreatív ipar",
            "együttműködés"
          ],
          "cel": "A kreatív iparban használatos szemlélet fejlesztése, különböző szakterületek találkozásának és a tudáselemek egymásra épülésének ösztönzése, valamint a hallgatói portfólió építésének támogatása.",
          "pdfUrl": "/tematikak/ext-projekthet-3-media-design-ba.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok és vendégelőadók: közös projektek, kiállítás-látogatás, portfólióépítés."
        },
        {
          "type": "Kötelező",
          "name": "Média labor 1.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "AMD",
          "note": null,
          "description": "Gyakorlati kurzus, amely a formák és anyagok térbeli vizuális megjelenésének és viselkedésének megismerésére, valamint azok szoftveres reprodukálására és szimulálására épül. A hallgatók a Blender alapvető használatát sajátítják el a modellezés, textúrázás, világítás, kamerakezelés és renderelés területén, a félévet egy saját tárgy lemodellezése és koncepció szerinti képsorozat zárja.",
          "felelos": "Mayer Éva",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Blender"
          ],
          "keywords": [
            "3d",
            "modellezés",
            "textúrázás",
            "renderelés",
            "világítás",
            "blender",
            "pbr",
            "képelmélet"
          ],
          "cel": "A média design specifikus képalkotás eszközismereti, alkotói és művészi elsajátítása középhaladó szinten, hogy a hallgató képes legyen a 3D képalkotás ismeretanyagát felismerni, elemezni, alkalmazni és prezentálni.",
          "pdfUrl": "/tematikak/ext-media-labor-1.pdf",
          "category": [
            "3d"
          ],
          "group": null,
          "short": "Blender-alapok: 3D modellezés, textúrázás, világítás, kamera, renderelés; saját tárgy modellje, képsorozat."
        },
        {
          "type": "Kötelező",
          "name": "Új technológiák pszichológiai vonatkozásai",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": null,
          "credits": null,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "AMD",
          "note": null,
          "description": "Elméleti előadás, amely a modern digitális technológiák pszichológiai hatásainak kognitív tudományos vizsgálatára összpontosít: hogyan formálják a kurrens technológiák az emberi viselkedést, érzelmeket és kognitív folyamatokat. A tematika kitér az okoseszközök, a közösségi média, a virtuális valóság és a videójátékok pszichológiai hatásaira, a rezilienciára, valamint az egyének és közösségek digitális technológiákhoz fűződő viszonyát meghatározó értelmezési keretekre.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "kollokvium (aktív órai részvétel 20%, írásbeli vizsga 80%)",
          "software": [],
          "keywords": [
            "pszichológia",
            "új technológiák",
            "kognitív tudomány",
            "közösségi média",
            "virtuális valóság",
            "videójátékok",
            "reziliencia",
            "digitális kultúra"
          ],
          "cel": "Az új technológiák pszichológiai vonatkozásainak ismertetése, hogy a hallgató alkotó-, tervező- és prezentációs munkájához elméleti megalapozásként alkalmazhassa, és designeri gyakorlatát szélesebb, interdiszciplináris keretben tudja elhelyezni.",
          "pdfUrl": "/tematikak/ext-uj-technologiak-pszichologiai-vonatkozasai.pdf",
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Okoseszközök, közösségi média, VR és videójátékok pszichológiai hatásai; kognitív folyamatok, reziliencia."
        }
      ]
    },
    {
      "version": "régi (korábbi)",
      "program": "BA",
      "semester": 4,
      "label": "Média Design BA régi (korábbi)",
      "courses": [
        {
          "type": "Kötelező",
          "name": "A képalkotás elmélete",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadás, amely a képalkotás elméleti alapjait tárgyalja, a Művészetelmélet kurzusra épülve. A hallgatók a kép fogalmával, a vizuális ábrázolás elméleti kérdéseivel és a képi jelentésképzés összefüggéseivel foglalkoznak, ami megalapozza a média design gyakorlati tárgyainak tudatos, reflektált művelését.",
          "felelos": null,
          "prerequisite": "Művészetelmélet",
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "képalkotás",
            "képelmélet",
            "vizuális kultúra",
            "művészetelmélet",
            "esztétika",
            "médiaelmélet"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Kép fogalma, vizuális ábrázolás és képi jelentésképzés elmélete, a Művészetelmélet kurzusra épülve."
        },
        {
          "type": "Kötelező",
          "name": "Mozgógrafika 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": null,
          "credits": null,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "AMD",
          "note": null,
          "description": "Specializációk szerint bontott gyakorlati kurzus: a Multimédia specializáción a hallgatók a Nuke node-alapú compositing munkafolyamatát sajátítják el (rotoscoping, 2D/planar tracking, screen replacement, keying, tűz- és muzzle flash-integráció), a félév végén breakdown videót készítenek. A Játéktervezés specializáción Blenderben és Substance Painterben tanulnak game-ready 3D asset-gyártást: modellezést, UV-kiterítést, PBR textúrázást, riggelést és Unreal Engine-be exportálást.",
          "felelos": "Kiss Melinda",
          "prerequisite": "Mozgógrafika 1. (teljesítés)",
          "requirement": "gyakorlati jegy",
          "software": [
            "Nuke",
            "Blender",
            "Substance Painter",
            "Unreal Engine"
          ],
          "keywords": [
            "compositing",
            "vfx",
            "rotoscoping",
            "keying",
            "tracking",
            "3d modellezés",
            "textúrázás",
            "game art"
          ],
          "cel": "A hallgatók a félév végére magabiztosan kezeljék a compositing (Nuke), illetve a 3D asset-gyártási (Blender, Substance Painter) munkafolyamatokat, és alkalmassá váljanak junior szintű iparági feladatok önálló elvégzésére.",
          "pdfUrl": "/tematikak/ext-mozgografika-2.pdf",
          "category": [
            "animáció",
            "3d"
          ],
          "group": null,
          "short": "Nuke compositing (roto, tracking, keying, VFX) vagy game-ready 3D asset-gyártás (Blender, Substance Painter)."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 4. (Média Design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": null,
          "credits": null,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervi szakmai ismereteken túlmutató tudást ad át workshopok, előadások, mesterkurzusok és meghívott vendégelőadók által vezetett projektek formájában. A programok között szerepel konferenciarészvétel, kiállításlátogatás és közös projektek kivitelezése is, hangsúlyt fektetve a szakterületek közötti együttműködésre, a kreatív ipari szemlélet fejlesztésére és a portfólióépítésre.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy (jelenlét és a kijelölt szakmai feladatok határidőre teljesítése)",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "előadás",
            "vendégelőadó",
            "mesterkurzus",
            "portfólió",
            "együttműködés",
            "kreatív ipar"
          ],
          "cel": "A hallgatók szakmai és kreatív kompetenciáinak fejlesztése a mintatanterven túlmutató programokkal, a szakterületek közötti párbeszéd és együttműködés ösztönzése, valamint a kreatív ipar elvárásainak megfelelő szemlélet és portfólió építése.",
          "pdfUrl": "/tematikak/ext-projekthet-4-media-design-ba.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, vendégelőadók, kiállításlátogatás; kreatív ipari szemlélet, portfólióépítés."
        },
        {
          "type": "Kötelező",
          "name": "Média labor 2.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Dózsa Liliána, Berkes Bálint",
          "institute": "AMD",
          "note": null,
          "description": "A Média labor 1.-re épülő gyakorlati kurzus, amely a 3D képalkotást a 3D animáció irányába viszi tovább. A félév első felében a hallgatók a motion design alapjait, az animáció 12 alapelvét, a karaktercsontozást és a motion capture animálást sajátítják el Cinema 4D-ben és Blenderben, majd a félév második felében fizikai, ruha-, részecske- és pyro-szimulációkkal, valamint Unreal Engine-es valós idejű rendereléssel foglalkoznak. A féléves feladat egy közös, folytatólagos golyóvándorlás-animáció elkészítése.",
          "felelos": "Molnár Ágnes Éva",
          "prerequisite": "Média labor 1. (teljesítés)",
          "requirement": "gyakorlati jegy",
          "software": [
            "Blender",
            "Cinema 4D",
            "Unreal Engine",
            "Rokoko"
          ],
          "keywords": [
            "3d animáció",
            "motion design",
            "szimuláció",
            "vfx",
            "karakteranimáció",
            "motion capture",
            "riggelés"
          ],
          "cel": "A média design specifikus képalkotás szoftverismereti, alkotói és esztétikai elsajátítása középhaladó szinten; a hallgató képes legyen a 3D animációs és szimulációs ismeretanyagot haladó szinten felismerni, elemezni, alkalmazni és prezentálni.",
          "pdfUrl": "/tematikak/ext-media-labor-2.pdf",
          "category": [
            "3d",
            "animáció"
          ],
          "group": null,
          "short": "3D animáció: motion design, 12 alapelv, riggelés, motion capture, ruha- és pyro-szimuláció (C4D, Blender, UE)."
        }
      ]
    },
    {
      "version": "régi (korábbi)",
      "program": "BA",
      "semester": 5,
      "label": "Média Design BA régi (korábbi)",
      "courses": [
        {
          "type": "Kötelező",
          "name": "Ökológia és művészet",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadás, amely az ökológia és a művészet kapcsolódási pontjait vizsgálja. A kurzus a környezeti kérdések művészeti reflexióival és a fenntarthatóság kreatív alkotói gyakorlatokban betöltött szerepével foglalkozik. A tárgy kollokviummal zárul.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "ökológia",
            "művészet",
            "fenntarthatóság",
            "környezet",
            "kortárs művészet",
            "elmélet"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Környezeti kérdések művészeti reflexiói: fenntarthatóság szerepe a kortárs alkotói gyakorlatokban."
        },
        {
          "type": "Kötelező",
          "name": "Gazdasági, menedzsment és jogi ismeretek",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "ELM",
          "note": null,
          "description": "Elméleti előadás, amely a kreatív szakmák gyakorlásához szükséges gazdasági, menedzsment- és jogi alapismereteket adja át. A hallgatók áttekintést kapnak a szakmai működést érintő gazdálkodási és jogi keretekről. A tárgy kollokviummal zárul.",
          "felelos": null,
          "prerequisite": null,
          "requirement": "kollokvium",
          "software": [],
          "keywords": [
            "gazdaság",
            "menedzsment",
            "jog",
            "vállalkozás",
            "szerzői jog",
            "kreatív ipar",
            "elmélet"
          ],
          "cel": null,
          "pdfUrl": null,
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Kreatív szakmák gazdálkodási és jogi keretei: vállalkozás, menedzsment, szerzői jog alapjai."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 5. (Média Design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": null,
          "credits": null,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át workshopok, előadások, mesterkurzusok és meghívott előadók által vezetett projektek formájában. A programok között szerepel konferenciarészvétel, kiállításlátogatás, technikai bemutatók és közös projektek kivitelezése, hangsúlyt fektetve a szakterületek közötti együttműködésre és a portfólióépítésre. A teljesítés feltétele a jelenlét és a kijelölt szakmai feladatok határidőre való leadása.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": null,
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "vendégelőadó",
            "mesterkurzus",
            "portfólió",
            "együttműködés",
            "kreatív ipar"
          ],
          "cel": "A hallgatók szakmai és kreatív kompetenciáinak fejlesztése a szakterületek találkozása, a tudáselemek egymásra épülése és a kreatív iparban használatos szemlélet erősítése révén, a MyBrand szemlélet alappilléreinek megvalósításával.",
          "pdfUrl": "/tematikak/ext-projekthet-5-media-design-ba.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, vendégelőadók, kiállításlátogatás; portfólióépítés."
        },
        {
          "type": "Kötelező",
          "name": "Média labor 3.",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 6,
          "credits": 7,
          "active": null,
          "groups": null,
          "instructors": "Berkes Bálint, Cseszneg Gyöngyi",
          "institute": "AMD",
          "note": null,
          "description": "Kétmodulos gyakorlati labor: az A modul a digitális utómunka és a 3D tartalomkészítés VFX-gyártási folyamatára fókuszál, haladó kompozitálással (Nuke), modellezéssel, UV mappinggel, animációval és rendereléssel (Maya), valamint PBR textúrázással (Substance 3D Painter), a félév végére egy komplex VFX-shot vagy 3D jelenet készül el ipari sztenderdek szerint. A B modul a fény művészi alkalmazásával és a projection mapping formanyelvével foglalkozik: a hallgatók a Resolume Arena szoftverrel terveznek és kiviteleznek fényalapú installációkat, amelyeket dokumentálnak és bemutatnak.",
          "felelos": "Mayer Éva",
          "prerequisite": "Média labor 2.",
          "requirement": "gyakorlati jegy",
          "software": [
            "Nuke",
            "Maya",
            "Substance Painter",
            "Resolume Arena"
          ],
          "keywords": [
            "vfx",
            "compositing",
            "3d modellezés",
            "textúrázás",
            "projection mapping",
            "fényművészet",
            "installáció",
            "renderelés"
          ],
          "cel": "A hallgatók elmélyítik ismereteiket a digitális utómunka és a 3D tartalomkészítés területén a VFX-gyártási folyamat mentén, valamint elsajátítják a fény művészi alkalmazásának elméleti és gyakorlati alapjait multimédiás technológiák és projection mapping eszközök használatával.",
          "pdfUrl": "/tematikak/ext-media-labor-3.pdf",
          "category": [
            "3d",
            "film/videó",
            "installáció"
          ],
          "group": null,
          "short": "VFX-shot és 3D jelenet (Nuke, Maya, Substance Painter) + fényinstalláció, projection mapping (Resolume)."
        }
      ]
    },
    {
      "version": "régi (korábbi)",
      "program": "BA",
      "semester": 6,
      "label": "Média Design BA régi (korábbi)",
      "courses": [
        {
          "type": "Kötelező",
          "name": "Új média kritikai stúdiumok",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": null,
          "credits": null,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "AMD",
          "note": null,
          "description": "Az új médiumok kritikai elméletébe bevezető előadás, amely az újmédia folyamatosan megújuló szakirodalmát követi, ismerteti és értelmezi. A foglalkozásokon a hallgatók aktív reflexióira építő eszmecsere folyik, amely a technológiai innováció újabb fordulatait — a gépi kreativitást, a mesterséges intelligenciát mint másik intelligenciát, az algoritmus szerepét a művészetben — elemzi kritikailag. A kurzus elméleti alapot nyújt a médiatervezési gyakorlathoz, a művészi munkához és a szakmai prezentációkhoz.",
          "felelos": "Mayer Éva",
          "prerequisite": "-",
          "requirement": "A hallgató érdemjegyét az órák látogatásán kívül a vitákban való részvétel és a félév végi írásbeli vizsga határozza meg.",
          "software": [],
          "keywords": [
            "új média",
            "médiaelmélet",
            "kritikai gondolkodás",
            "mesterséges intelligencia",
            "generatív művészet",
            "algoritmus",
            "manovich",
            "digitális kultúra"
          ],
          "cel": "A hallgatók megismerkedjenek az új médiumok kritikai elméletével, hogy azt elméleti alapként és koncepcionális kiegészítésként alkalmazhassák médiatervezési tanulmányaik, művészi munkájuk és prezentációs feladataik során.",
          "pdfUrl": "/tematikak/ext-uj-media-kritikai-studiumok.pdf",
          "category": [
            "elmélet"
          ],
          "group": null,
          "short": "Újmédia-elmélet kritikai olvasata: gépi kreativitás, MI mint másik intelligencia, algoritmus a művészetben."
        },
        {
          "type": "Kötelező",
          "name": "Interaktív grafika",
          "specialization": null,
          "courseType": "előadás",
          "hours": 4,
          "credits": 5,
          "active": null,
          "groups": null,
          "instructors": "Berkes Bálint",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a fény médiumának kreatív és interdiszciplináris alkalmazására összpontosít, különös tekintettel a vetítéses technikákra (mapping) és a generatív vizualizációra. A hallgatók TouchDesigner, Unreal Engine és Cinema 4D segítségével készítenek interaktív, hang- és mozgásreaktív, térspecifikus fényalkotásokat, valamint megismerik a DMX, Art-Net, OSC és MIDI rendszereket. A félév során egy szimulációs keretben, fiktív megrendelőnek dolgozva csoportos vetítést terveznek a Budapesti Metropolitan Egyetem körépületére, amelyet vetítési kiállításon mutatnak be.",
          "felelos": "Szacsvai Pál",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "TouchDesigner",
            "Unreal Engine",
            "Cinema 4D",
            "After Effects"
          ],
          "keywords": [
            "mapping",
            "vetítéstechnika",
            "generatív vizualizáció",
            "fényművészet",
            "interaktív installáció",
            "dmx",
            "hangreaktív vizuál",
            "valós idejű grafika"
          ],
          "cel": "A hallgatók valós munkaszituációkhoz hasonló környezetben sajátítsák el a vetítéses technikák alkalmazását, a kreatív döntéshozatalt és a csapatmunkát, egy fiktív megrendelő igényei alapján készítve vetítésterveket valós helyszínre.",
          "pdfUrl": "/tematikak/ext-interaktiv-grafika.pdf",
          "category": [
            "installáció",
            "ux/interakció",
            "animáció"
          ],
          "group": null,
          "short": "Mapping és hang-/mozgásreaktív generatív vizuálok (TouchDesigner, Unreal, C4D, DMX) a METU körépületére."
        },
        {
          "type": "Kötelező",
          "name": "Szakdolgozat készítése",
          "specialization": null,
          "courseType": "előadás",
          "hours": 2,
          "credits": 4,
          "active": null,
          "groups": null,
          "instructors": "Kollár Dávid",
          "institute": "AMD",
          "note": null,
          "description": "A kurzus a BA-tanulmányokat lezáró szakdolgozat megírására készíti fel a hallgatókat: a témaválasztástól a forrásgyűjtésen és -feldolgozáson át a szöveg struktúrájának kialakításáig és a tanulmány megírásáig. Témái között szerepel a hivatkozási formák, a tartalomjegyzék-készítés, a kutatásmódszertan, valamint a szakszövegírás és az AI viszonya. Az értékelés az órai és otthoni feladatok, valamint a félév végi beadandó dolgozat alapján történik.",
          "felelos": "Mayer Éva",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [],
          "keywords": [
            "szakdolgozat",
            "tudományos írás",
            "forrásgyűjtés",
            "kutatásmódszertan",
            "hivatkozás",
            "szövegstruktúra",
            "műleírás"
          ],
          "cel": "A szakdolgozat készítéséhez szükséges elméleti és gyakorlati tudás elsajátítása, hogy a hallgató megfelelő színvonalú írásművet legyen képes alkotni BA-tanulmányai lezáró időszakában.",
          "pdfUrl": "/tematikak/ext-szakdolgozat-keszitese.pdf",
          "category": [
            "diploma/portfólió",
            "elmélet"
          ],
          "group": null,
          "short": "Témaválasztás, forrásgyűjtés, hivatkozás, kutatásmódszertan, szövegírás és AI."
        },
        {
          "type": "Kötelező",
          "name": "Duplomatervezési feladat",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": 6,
          "credits": 8,
          "active": null,
          "groups": null,
          "instructors": "Forgács Kristóf, Nikázy Gusztáv",
          "institute": "AMD",
          "note": null,
          "description": "A diplomamunka elkészítésére felkészítő gyakorlati kurzus, amely két blokkban fut. Az egyik blokkban a hallgatók a diplomamunkájukhoz kapcsolódó önálló online médiaterméket terveznek és fejlesztenek: modern felülettervező szoftverekben (Figma/Penpot) készítenek prototípust, majd dokumentum- és stílusleíró nyelvekkel valósítják meg, a template-jellegű megoldások keretein túllépve. A másik blokk a diploma projektszerű kezelésére (ütemezés, mérföldkövek), a diplomaprezentáció gyakorlására, valamint a portfólió és showreel összeállítására fókuszál; a teljesítés feltétele két központi konzultáción való részvétel.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "gyakorlati jegy",
          "software": [
            "Figma",
            "Penpot",
            "HTML",
            "CSS"
          ],
          "keywords": [
            "diplomamunka",
            "portfólió",
            "showreel",
            "prototípus",
            "webtervezés",
            "prezentáció",
            "projekttervezés",
            "médiatermék"
          ],
          "cel": "A diplomamunkához szükséges szoftverismereti, alkotói és művészi ismeretek elsajátítása, kreatív készségek fejlesztése, valamint prezentációs és médiatervezési tudás megszerzése.",
          "pdfUrl": "/tematikak/ext-duplomatervezesi-feladat.pdf",
          "category": [
            "diploma/portfólió",
            "web"
          ],
          "group": null,
          "short": "Diplomához kötődő online médiatermék (Figma/Penpot, HTML/CSS), plusz projektterv, portfólió és showreel."
        },
        {
          "type": "Kötelező",
          "name": "Projekthét 6. (Média Design BA)",
          "specialization": null,
          "courseType": "gyakorlat",
          "hours": null,
          "credits": null,
          "active": null,
          "groups": null,
          "instructors": null,
          "institute": "AMD",
          "note": null,
          "description": "A projekthét a mintatantervben foglalt szakmai ismereteken túlmutató tudást ad át workshopok, előadások, mesterkurzusok és meghívott szakmai vendégek által vezetett projektek formájában. A programok között innovációs előadások, technikai bemutatók, konferenciarészvétel, kiállításlátogatás és közös projektek kivitelezése szerepel, hangsúlyt kap a társterületek közötti együttműködés és a portfólióépítés. A teljesítés feltétele a jelenlét és a kijelölt szakmai feladatok határidőre való leadása.",
          "felelos": "Forgács Kristóf",
          "prerequisite": "-",
          "requirement": "A tárgy teljesítésének feltétele a jelenlét, valamint a kijelölt szakmai feladatok teljesítése és határidőre való leadása.",
          "software": [],
          "keywords": [
            "projekthét",
            "workshop",
            "mesterkurzus",
            "vendégelőadó",
            "kreatív ipar",
            "portfólióépítés",
            "együttműködés"
          ],
          "cel": "A mintatanterven túlmutató szakmai tudás átadása, a társterületi kompetenciák beemelése, a kreatív iparban használatos szemlélet fejlesztése és a portfólió építése.",
          "pdfUrl": "/tematikak/ext-projekthet-6-media-design-ba.pdf",
          "category": [
            "projekt"
          ],
          "group": null,
          "short": "Workshopok, mesterkurzusok, vendégelőadók: innovációs és technikai bemutatók, kiállítás, közös projektek."
        }
      ]
    }
  ]
};

export const PROGRAM_COLOR: Record<Program, { c: string; bg: string }> = {
  BA: { c: 'var(--brand)', bg: 'var(--brand-100)' },
  MA: { c: 'var(--ink)', bg: 'var(--paper-2)' },
};

export function cohortTotals(c: Cohort) {
  let cr = 0, h = 0;
  for (const x of c.courses) { cr += x.credits ?? 0; h += x.hours ?? 0; }
  return { cr, h, n: c.courses.length };
}

export const semLabel = (s: number | null) => (s ? `${s}. félév` : '');

export const specShort = (s: string | null): string => {
  if (!s) return '';
  if (/Multim/i.test(s)) return 'Multimédia';
  if (/J[áa]t[ée]k/i.test(s)) return 'Játéktervezés';
  return s.replace(/specializ.*/i, '').trim();
};

export const specClass = (s: string | null): string => {
  if (!s) return '';
  if (/Multim/i.test(s)) return 'mm';
  if (/J[áa]t[ée]k/i.test(s)) return 'jt';
  return 'szv';
};

export const isMissing = (x: Course) => !x.instructors;

// Besorolás/szín: közös (0, zöld) → Multimédia spec (1, kék) → Játéktervezés spec (2, lila) → külső elméleti intézet (3, szürke).
// Szürke KIZÁRÓLAG az institute==='ELM' (külső intézet); a saját szakos elméleti a saját sávja színét kapja.
export function courseGroup(c: Course): number {
  if (c.group != null) return c.group;
  if (c.institute === 'ELM') return 3;
  const sp = specClass(c.specialization);
  if (sp === 'mm') return 1;
  if (sp === 'jt') return 2;
  return 0;
}
export const groupClass = (c: Course): string => `g${courseGroup(c)}`;
export function courseRank(c: Course): number {
  return /my\s?brand|projekth[ée]t/i.test(c.name) ? 1 : 0;
}
export const GROUP_LABEL: Record<number, string> = {
  0: 'Közös', 1: 'Multimédia specializáció', 2: 'Játéktervezés specializáció', 3: 'Elméleti intézet (külső)',
};

export function emptyCourse(): Course {
  return { type: 'Kötelező', name: '', specialization: null, courseType: 'gyakorlat', hours: null, credits: null, active: null, groups: null, instructors: null, institute: 'AMD', note: null, description: null, short: null, felelos: null, prerequisite: null, requirement: null, software: [], keywords: [], category: [], cel: null, pdfUrl: null, group: null };
}
