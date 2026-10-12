import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: 'Savepoint — Editorial game discovery',
    template: '%s — Savepoint',
  },
  description:
    'Savepoint is a premium editorial guide to games: curated features, a searchable catalog, collections, and upcoming releases.',
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto flex w-full max-w-6xl items-center px-4 py-4 sm:px-6">
            <span className="text-base font-semibold tracking-tight">Savepoint</span>
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
        <footer className="border-t border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-zinc-500 sm:px-6 dark:text-zinc-400">
            Savepoint — an editorial game discovery publication. Game data and artwork
            provided by <a href="https://www.igdb.com/" className="underline">IGDB</a>.
          </div>
        </footer>
      </body>
    </html>
  );
}
