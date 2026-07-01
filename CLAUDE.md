# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

METU (Metropolitan University, Budapest) Média Design szak tantervi térképe. Ez egy adat-repó, nem kód-projekt — nincs build, lint, vagy teszt.

## Key Assets

- **`metu_md_map015.xml`** — draw.io diagram (~5860 sor), a teljes tantervi térkép. Egy lap ("Oldal-1"), ~79 tantárgy, félévekre bontva, előfeltétel-élekkel összekötve.
- **`excel/`** — Órarendi Excel fájlok (OSZTÓ TT = órarendosztó táblázat)
- **`pdf/`** — Tantárgyi tematikák (syllabus PDF-ek a METU rendszerből, fájlnévben: tárgynév + kód + félév + Neptun ID)

## XML Structure (draw.io)

A diagram `mxGraphModel` struktúrát használ. Fontos elemek:

- **UserObject `label="..."`** — Tantárgykártyák (swimlane stílusú). A label a tárgynév, a belső `value` HTML-ben tartalmazza: Felelős, Oktató, Összegzés, Cél, Előfeltétel, Előadás/Gyakorlat óraszám, Követelmény, Kredit, Intézet, létszám.
- **mxCell `edge="1"`** — Előfeltétel-kapcsolatok és félév→tárgy hozzárendelések. `source`/`target` attribútumokkal.
- **`tags` attribútum** — `Háttér` (háttérelemek), `Folyamatábra` (félév-jelölők, programblokkok), `Összekötő` (élek)

## Programs in the Diagram

- **Média Design BA** — régi mintatanterv (2024/2025) és új mintatanterv, 6+ félév
- **Média Design MA** — mester szintű tantervek

## Departments

- **AMD** — Animáció és Média Design Tanszék (szakmai tárgyak)
- **ELM** — Elméleti tanszék (művészettörténet, filozófia, esztétika)
- **TREK** — egyéb tárgyak

## Conventions

- A fájlnevek magyar ékezetes karaktereket tartalmaznak (UTF-8)
- Az XML-ben a tantárgykártyák HTML-kódolt szöveget tartalmaznak (`&lt;b&gt;Kredit:&lt;/b&gt; 4`)
- Színkódolás: zöld (`#d5e8d4`) = BA program, sárga (`#fff2cc`) = félév, szürke (`#f5f5f5`) = tantárgykártya, kék (`#dae8fc`) = főcím
