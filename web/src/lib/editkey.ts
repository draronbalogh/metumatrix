// Kliens-oldali hozzáférés: tárolás NINCS. A saját tailnet-eszközök kulcs nélkül is
// szerkesztők (a szerver a Tailscale-fejlécből ismeri fel őket); idegen gépen a
// kulcsos link működik: ?net=<kulcs> az URL-ben - ezt küldjük tovább fejlécben.
// (2026-07-17-ig a paraméter ?ts= volt; a régi név szándékosan NEM él tovább.)
export const getEditKey = (): string | null => {
  try {
    if (typeof window === 'undefined') return null;
    return new URL(window.location.href).searchParams.get('net');
  } catch { return null; }
};

export const editHeaders = (): Record<string, string> => {
  const k = getEditKey();
  return k ? { 'x-edit-key': k } : {};
};
