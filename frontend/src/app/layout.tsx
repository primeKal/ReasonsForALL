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
  title: "Ralles | Confidence-Based AI Guardrails",
  description: "Ralles intercepts AI agent intents and evaluates them against dynamic business rules extracted by cooperative multi-agent systems, providing confidence-scored guardrails with threshold-based protection.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dashboard-dark`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
