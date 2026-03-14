"use client";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isPrintPage = pathname?.includes('/print');

  if (isPrintPage) {
    return (
      <html lang="en">
        <body className={`${inter.className} light-print`}>
          {children}
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="app-container">
          <div className="no-print">
            <Sidebar />
          </div>
          <div className="main-content">
            <div className="no-print">
              <Topbar />
            </div>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
