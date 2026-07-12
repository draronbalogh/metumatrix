// A szerkesztési jog kliens-oldali kezelése — SEMMILYEN tárolás nincs.
// A mód mindig az aktuális URL-ből jön: ?a=<kulcs> → admin (szerkesztő) mód,
// hiányzó vagy rossz érték → megtekintő mód. A paraméter az URL-ben marad.
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
