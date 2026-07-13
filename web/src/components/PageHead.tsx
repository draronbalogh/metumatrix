import { ReactNode } from 'react';

// Egységes nézet-fejléc: MINDEN főnézet ugyanezzel a címsorral indul (azonos
// tipográfia és pozíció), így nézetváltáskor a cím nem ugrál és nem vált stílust.
// children = jobb oldali eszközsor (viewtoggle, + gomb).
export default function PageHead({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="cat-block-head">
      <h2 className="pl">{title}</h2>
      {sub && <span className="nm">{sub}</span>}
      {children}
    </div>
  );
}
