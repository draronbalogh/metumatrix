// A szerkesztési kulcs kliens-oldali kezelése (bemutató mód).
// A kulcs a böngésző localStorage-ában él eszközönként és címenként; a ?admin=<kulcs>
// URL-lel egyszer kell megadni, a ?admin=ki törli (az eszköz bemutató módba vált).
const KEY = 'mm-edit-key';

export const getEditKey = (): string | null => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};

export const setEditKey = (v: string | null): void => {
  try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch { /* privát mód */ }
};

// minden író fetch-hez: a kulcs fejléce (ha van)
export const editHeaders = (): Record<string, string> => {
  const k = getEditKey();
  return k ? { 'x-edit-key': k } : {};
};
