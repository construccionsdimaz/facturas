import styles from './topbar.module.css';
import Link from 'next/link';

export default function Topbar() {
  return (
    <header className={`glass-panel ${styles.topbar}`}>
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
            + Nueva Factura
          </button>
        </Link>
      </div>
    </header>
  );
}
