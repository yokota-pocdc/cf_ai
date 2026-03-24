import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'おこづかいC/Fノート',
  description: '投資・消費・浪費を仕分けて、お金の流れを見える化しよう',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="bg-[#f8f6f2] antialiased">{children}</body>
    </html>
  );
}
