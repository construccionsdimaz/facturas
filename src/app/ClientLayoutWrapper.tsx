"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPrintPage = pathname?.includes('/print');

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
