"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import { useEffect } from "react";

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPrintPage = pathname?.includes('/print');

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => console.log('SW registered:', registration))
        .catch((error) => console.error('SW registration failed:', error));
    }
  }, []);

  if (isPrintPage) {
    return <>{children}</>;
  }

  return (
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
  );
}
