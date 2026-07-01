import type { Metadata } from 'next';
import { Schibsted_Grotesk, Hanken_Grotesk, Bricolage_Grotesque, Instrument_Sans, Spline_Sans_Mono } from 'next/font/google';
import './globals.css';

const schibsted = Schibsted_Grotesk({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '700'], display: 'swap', variable: '--font-schibsted' });
const hanken = Hanken_Grotesk({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-hanken' });
const bricolage = Bricolage_Grotesque({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '700', '800'], display: 'swap', variable: '--font-bricolage' });
const instrument = Instrument_Sans({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-instrument' });
const splineMono = Spline_Sans_Mono({ subsets: ['latin', 'latin-ext'], weight: ['400', '500'], display: 'swap', variable: '--font-spline-mono' });

export const metadata: Metadata = {
  title: 'Dr. Balogh Áron – MD tantervi mátrix',
  description: 'METU Média Design — a tantervi hierarchia (BA/MA, több évfolyam) interaktív, szerkeszthető node-térképen és kártya-katalógusban. Készítette: Dr. Balogh Áron.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const fontVars = `${schibsted.variable} ${hanken.variable} ${bricolage.variable} ${instrument.variable} ${splineMono.variable}`;
  return (
    <html lang="hu" data-preset="muszerfal" className={fontVars}>
      <body>{children}</body>
    </html>
  );
}
