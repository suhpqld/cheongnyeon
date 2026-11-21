import type { Metadata } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import './globals.css';

const noto = Noto_Sans_KR({ weight: ['400', '700'], subsets: ['latin'], display: 'swap' });

const VIEW_SCRIPT = `try{var v=localStorage.getItem('boknyang.view');if(v!=='pc'&&v!=='mobile')v=innerWidth>=900?'pc':'mobile';if(v==='pc')document.documentElement.classList.add('view-pc')}catch(e){}`;

export const metadata: Metadata = { title: '복냥이', description: '복지 신청을 도와요.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko" suppressHydrationWarning>
    <head>
      {/* 첫 화면이 그려지기 전에 PC/모바일 보기를 정한다 (lib/client/settings.ts의 useViewMode와 같은 규칙) */}
      <script dangerouslySetInnerHTML={{ __html: VIEW_SCRIPT }} />
    </head>
    <body className={noto.className}>{children}</body>
  </html>;
}
