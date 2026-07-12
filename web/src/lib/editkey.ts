// Kliens-oldali hozzáférés: tárolás NINCS. A saját tailnet-eszközök kulcs nélkül is
// szerkesztők (a szerver a Tailscale-fejlécből ismeri fel őket); idegen gépen a
// szerkesztői link működik: ?a=<kulcs> az URL-ben — ezt küldjük tovább fejlécben.
export const getEditKey = (): string | null => {
  try {
    if (typeof window === 'undefined') return null;
    return new URL(window.location.href).searchParams.get('a');
  } catch { return null; }
};

export const editHeaders = (): Record<string, string> => {
  const k = getEditKey();
  return k ? { 'x-edit-key': k } : {};
};
