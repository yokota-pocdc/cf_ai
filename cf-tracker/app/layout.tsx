import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'おこづかいC/Fノート ✨',
  description: '投資・消費・浪費を仕分けて、お金の流れを見える化しよう',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="bg-gradient-to-b from-[#fdf2f8] via-[#faf5ff] to-[#ede9fe] antialiased">
        {children}
      </body>
    </html>
  );
}
