// Közös szöveg-normalizálók — az órarend, a tanterv-illesztés és a névfeloldás
// UGYANAZT a függvényt használja, különben szétesik az egyezés.
export const norm = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// címekhez (tárgynevek): whitespace-összevonás is — az Excel-forrásban dupla szóköz fordul elő
export const normTitle = (s: string): string => norm(s).replace(/\s+/g, ' ').trim();

// nevekhez: a Dr. / habil előtagok nélkül hasonlítunk ("Balogh Áron" ≡ "Dr. Balogh Áron")
export const normName = (s: string): string => normTitle(s.replace(/\b(dr|habil)\.?\s*/gi, ''));
