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
  title: "GEO Score — AI 검색 가시성 분석",
  description: "ChatGPT · Perplexity · Gemini에서 내 서비스가 얼마나 잘 보이는지 30초 안에 분석해드립니다. 서비스 이름과 카테고리만 입력하세요.",
  keywords: "GEO, Generative Engine Optimization, AI 검색 최적화, ChatGPT SEO, Perplexity 최적화",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
