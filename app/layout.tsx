import type { Metadata } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import './globals.css';

const noto = Noto_Sans_KR({ weight: ['400', '700'], subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = { title: '복냥이', description: '복지 신청을 도와요.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body className={noto.className}>{children}</body></html>;
}
