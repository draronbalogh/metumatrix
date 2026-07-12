// Hozzáférés-kezelés a kliensen: NINCS. A szerver a Tailscale-identitás fejlécből
// dönt (saját tailnet-eszköz = szerkesztő, Funnelen érkező külső = megtekintő).
// Se kulcs, se query-paraméter, se tárolás.
export const editHeaders = (): Record<string, string> => ({});
