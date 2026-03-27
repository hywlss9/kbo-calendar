import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FavoriteTeamProvider } from "@/lib/favorite/context";
import { FavoriteTeamSelectDialog } from "@/components/favorite/FavoriteTeamSelectDialog";
import { FavoriteSettingsDialog } from "@/components/favorite/FavoriteSettingsDialog";

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
    default: "KBO Calendar",
    template: "%s — KBO Calendar",
  },
  description: "KBO 일정을 한눈에 확인해보세요",
  openGraph: {
    title: "KBO Calendar",
    description: "KBO 일정을 한눈에 확인해보세요",
    siteName: "KBO Calendar",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "KBO Calendar",
    description: "KBO 일정을 한눈에 확인해보세요",
  },
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
      <body className="min-h-full flex flex-col">
          <FavoriteTeamProvider>
            {children}
            <FavoriteTeamSelectDialog />
            <FavoriteSettingsDialog />
          </FavoriteTeamProvider>
        </body>
    </html>
  );
}
