"use client";

import styles from './sidebar.module.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={`glass-panel ${styles.sidebar} ${isOpen ? styles.mobileOpen : ''}`}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}></div>
        <h2>Dímaz</h2>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>
      
      <nav className={styles.nav}>
        <Link href="/" className={`${styles.navItem} ${pathname === '/' ? styles.active : ''}`}>
          <span className={styles.icon}>📊</span> Panel
        </Link>
        <Link href="/invoices" className={`${styles.navItem} ${pathname.startsWith('/invoices') ? styles.active : ''}`}>
          <span className={styles.icon}>📄</span> Facturas
        </Link>
        <Link href="/estimates" className={`${styles.navItem} ${pathname.startsWith('/estimates') ? styles.active : ''}`}>
          <span className={styles.icon}>📋</span> Presupuestos
        </Link>
        <Link href="/clients" className={`${styles.navItem} ${pathname.startsWith('/clients') ? styles.active : ''}`}>
          <span className={styles.icon}>👥</span> Clientes
        </Link>
        <Link href="/settings" className={`${styles.navItem} ${pathname.startsWith('/settings') ? styles.active : ''}`}>
          <span className={styles.icon}>⚙️</span> Ajustes
        </Link>
      </nav>
      
      <div className={styles.bottom}>
        <div className={styles.userProfile}>
          <div className={styles.avatar}>AM</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>Administrador</span>
            <span className={styles.userRole}>Super Admin</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
