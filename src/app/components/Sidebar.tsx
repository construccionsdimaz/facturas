"use client";

import styles from './sidebar.module.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={`glass-panel ${styles.sidebar}`}>
      <div className={styles.logo}>
        {/* Placeholder for real logo */}
        <div className={styles.logoIcon}></div>
        <h2>Next-Gen</h2>
      </div>
      
      <nav className={styles.nav}>
        <Link href="/" className={`${styles.navItem} ${pathname === '/' ? styles.active : ''}`}>
          <span className={styles.icon}>📊</span> Panel
        </Link>
        <Link href="/invoices" className={`${styles.navItem} ${pathname.startsWith('/invoices') ? styles.active : ''}`}>
          <span className={styles.icon}>📄</span> Facturas
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
