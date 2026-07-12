// Hozzáférés-kezelés: NINCS. A védelem maga a Tailscale-hálózat — az appot csak a
// tailnetbe bejelentkezett saját eszközök érik el, ott pedig mindig teljes
// (szerkesztő) mód jár. A korábbi kulcs/query-logika szándékosan törölve.
// (Ha valaha nyilvános Funnel-kitettség lesz, a szerver-oldali EDIT_KEY kapu a
// web/.env.local-ban visszakapcsolható — akkor ide kell újra kulcs-fejléc.)
export const editHeaders = (): Record<string, string> => ({});
