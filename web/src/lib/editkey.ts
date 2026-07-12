// Hozzáférés: a mód mindig az AKTUÁLIS URL-ből jön — semmilyen tárolás nincs.
// ?a=<kulcs> érvényes értékkel → szerkesztő (admin) mód; hiányzó vagy rossz érték →
// megtekintő mód. A csupasz link nyugodtan megosztható: azon csak nézelődni lehet.
export const getEditKey = (): string | null => {
  try {
    if (typeof window === 'undefined') return null;
    return new URL(window.location.href).searchParams.get('a');
  } catch { return null; }
};

// minden író fetch-hez: a kulcs fejléce (ha van)
export const editHeaders = (): Record<string, string> => {
  const k = getEditKey();
  return k ? { 'x-edit-key': k } : {};
};
