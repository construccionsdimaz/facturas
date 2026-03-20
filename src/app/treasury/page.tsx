import TreasuryClient from "./TreasuryClient";
import styles from "../invoices/page.module.css";

export const dynamic = 'force-dynamic';

export default function TreasuryPage() {
  return (
    <div className={styles.invoicesPage} style={{ padding: '0 24px' }}>
      <div className={styles.header}>
        <div>
          <h1 className="text-gradient">Tesorería y Pagos</h1>
          <p className={styles.subtitle}>Control centralizado de deudas con proveedores y subcontratas.</p>
        </div>
      </div>

      <TreasuryClient />
    </div>
  );
}
