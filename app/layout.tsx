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
  title: "7 Days 7 Games",
  description: "มินิเกมสำหรับพักสมอง",
  icons: {
    icon: [{ url: "/img/c7.png?v=2", type: "image/png" }],
    shortcut: [{ url: "/img/c7.png?v=2", type: "image/png" }],
    apple: [{ url: "/img/c7.png?v=2", type: "image/png" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}