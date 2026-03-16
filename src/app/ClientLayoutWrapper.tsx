"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import React, { useEffect } from "react";

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPrintPage = pathname?.includes('/print');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  useEffect(() => {
    // Close mobile menu on route change
    setIsMobileMenuOpen(false);
  }, [pathname]);

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
        <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      </div>
      <div className="main-content">
        <div className="no-print">
          <Topbar onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
        </div>
        {children}
      </div>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="no-print"
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 998,
          }}
        />
      )}
    </div>
  );
}
