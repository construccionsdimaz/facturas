import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Next-Gen Invoicing",
  description: "A premium B2B/B2C financial management center",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
