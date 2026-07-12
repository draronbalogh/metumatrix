'use client';

import { getEditKey } from '@/lib/editkey';

// 📚 Segédletek: belső útmutatók (Zoom, oktatói segédletek, tréning) saját főmenü-fülként.
// CSAK szerkesztő módban érhető el (a fájlok belső információkat tartalmaznak) —
// a /api/docs végpont a kulcsot / Tailscale-azonosítót ellenőrzi.

interface Doc { f: string; icon: string; title: string; desc: string; }
interface DocGroup { cim: string; docs: Doc[]; }

const GROUPS: DocGroup[] = [
  {
    cim: '📹 Zoom — online órák és meetingek',
    docs: [
      { f: 'zoom-hasznalat.pdf', icon: '📹', title: 'Zoom: központi fiókok és foglalás', desc: 'ZOOM01–ZOOM20 fiókok foglalási rendje, belépés, személyes meeting-link indítása.' },
      { f: 'zoom-utmutato.pdf', icon: '📹', title: 'Zoom használati útmutató (2024/25/2)', desc: 'Részletes lépések: kliens telepítése, óratartás, hibakezelés.' },
    ],
  },
  {
    cim: '📘 Oktatói segédletek és rendszerek',
    docs: [
      { f: 'fooallasu-oktatoi-segedlet.pdf', icon: '📘', title: 'Főállású oktatói segédlet (2024/25/2 · MKK)', desc: 'Adminisztráció, rendszerek, határidők — főállású oktatóknak.' },
      { f: 'oraado-oktatoi-segedlet.pdf', icon: '📗', title: 'Óraadó oktatói segédlet (2024/25/2 · MKK)', desc: 'A legfontosabb tudnivalók óraadóknak: belépések, Neptun, teendők.' },
      { f: 'rendszerhasznalati-trening.pptx', icon: '🖥', title: 'Rendszerhasználati tréning (2024/25)', desc: 'Bemutató az egyetemi rendszerek használatáról (letölthető pptx).' },
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
              <a key={d.f} className="cc-card it-doc" href={docHref(d.f)} target="_blank" rel="noreferrer">
                <span className="it-doc-icon">{d.icon}</span>
                <span className="it-doc-body">
                  <span className="it-doc-title">{d.title}</span>
                  <span className="it-doc-desc">{d.desc}</span>
                </span>
                <span className="it-doc-open">{d.f.endsWith('.pdf') ? 'megnyitás ↗' : 'letöltés ⤓'}</span>
              </a>
            ))}
          </div>
        </div>
      ))}
      {groups.length === 0 && <p className="tp-empty">Nincs a keresésnek megfelelő segédlet.</p>}
      <p className="tp-pv-hint">A PDF-ek új lapon nyílnak, a pptx letöltődik. Ha új segédlet érkezik, a grid/docs mappába kerül és ide vesszük fel.</p>
    </section>
  );
}
