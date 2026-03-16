import styles from './topbar.module.css';
import Link from 'next/link';

interface TopbarProps {
  onMenuClick?: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className={`glass-panel ${styles.topbar}`}>
      <button className={styles.menuBtn} onClick={onMenuClick}>
        <span>☰</span>
      </button>
      
      <div className={styles.searchContainer}>
        <span className={styles.searchIcon}>🔍</span>
        <input 
          type="text" 
          placeholder="Buscar facturas, clientes o comandos (Cmd + K)" 
          className={`input-modern ${styles.searchInput}`}
        />
      </div>
      
      <div className={styles.actions}>
        <button className={styles.iconBtn}>
          <span className={styles.icon}>🔔</span>
          <span className={styles.badge}>3</span>
        </button>
        <Link href="/invoices/new">
          <button className="btn-primary">
            + <span className={styles.newLabel}>Nueva Factura</span>
          </button>
        </Link>
      </div>
    </header>
  );
}
