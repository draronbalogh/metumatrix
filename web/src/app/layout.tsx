import type { Metadata, Viewport } from 'next';
import { Schibsted_Grotesk, Hanken_Grotesk, Bricolage_Grotesque, Instrument_Sans, Spline_Sans_Mono } from 'next/font/google';
import './globals.css';

const schibsted = Schibsted_Grotesk({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '700'], display: 'swap', variable: '--font-schibsted' });
const hanken = Hanken_Grotesk({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-hanken' });
const bricolage = Bricolage_Grotesque({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '700', '800'], display: 'swap', variable: '--font-bricolage' });
const instrument = Instrument_Sans({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-instrument' });
const splineMono = Spline_Sans_Mono({ subsets: ['latin', 'latin-ext'], weight: ['400', '500'], display: 'swap', variable: '--font-spline-mono' });

// a billentyűzet a tartalmat méretezze át (ne takarja): így a szerkesztőben a
// Mentés-sáv a billentyűzet fölött marad, és a 100dvh a látható területhez igazodik
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
};

export const metadata: Metadata = {
  title: 'Dr. Balogh Áron – MD tantervi mátrix',
  description: 'METU Média Design - a tantervi hierarchia (BA/MA, több évfolyam) interaktív, szerkeszthető node-térképen és kártya-katalógusban. Készítette: Dr. Balogh Áron.',
};

// villanásmentes téma: az ALAP sötét (data-theme="dark"), és ha NAPPAL van (07-20),
// a festés ELŐTT futó szkript világosra vált. A kézi ☾/☀ felülbírálást (md-theme2,
// az aktuális nap-/éj-időszakra) tiszteletben tartja. Ugyanaz a logika, mint a
// CurriculumApp themePeriodId/autoTheme/storedThemeFor - hogy ne legyen hidratálás-eltérés.
const THEME_INIT = `(function(){try{
  var d=new Date(),h=d.getHours(),night=(h>=20||h<7),b=new Date(d);
  if(h<7)b.setDate(b.getDate()-1);
  var p=function(n){return(n<10?'0':'')+n;};
  var period=b.getFullYear()+'-'+p(b.getMonth()+1)+'-'+p(b.getDate())+(night?'-n':'-d');
  var t=night?'dark':'light',raw=localStorage.getItem('md-theme2');
  if(raw&&raw[0]==='{'){var o=JSON.parse(raw);if((o.t==='light'||o.t==='dark')&&o.p===period)t=o.t;}
  document.documentElement.dataset.theme=t;
}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const fontVars = `${schibsted.variable} ${hanken.variable} ${bricolage.variable} ${instrument.variable} ${splineMono.variable}`;
  return (
    <html lang="hu" data-preset="muszerfal" data-theme="dark" className={fontVars} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {children}
      </body>
    </html>
  );
}
