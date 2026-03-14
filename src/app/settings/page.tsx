"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    companyName: '',
    companyAddress: '',
    companyTaxId: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setFormData({
          companyName: data.companyName || '',
          companyAddress: data.companyAddress || '',
          companyTaxId: data.companyTaxId || ''
        });
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to load settings", err);
        setIsLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setShowSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Failed to save settings');
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
    } catch (error) {
      console.error(error);
      alert('Error al guardar los ajustes');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.settingsPage}>
        <div className={styles.header}>
            <h1 className="text-gradient">Ajustes de Empresa</h1>
            <p className="loading-text">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.settingsPage}>
      <div className={styles.header}>
        <div>
          <h1 className="text-gradient">Ajustes de Empresa</h1>
          <p className={styles.subtitle}>Personaliza los datos de tu empresa para las facturas.</p>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.sidebarSection}>
          <ul className={styles.settingsNav}>
            <li className={styles.active}>Perfil de Empresa</li>
            <li className={styles.disabled}>Facturación y Planes 🔒</li>
            <li className={styles.disabled}>Equipo 🔒</li>
            <li className={styles.disabled}>Integraciones 🔒</li>
          </ul>
        </div>

        <div className={styles.mainSection}>
          <div className={`glass-panel ${styles.panel}`}>
            <h2 className={styles.panelTitle}>Perfil de Empresa</h2>
            <p className={styles.panelDesc}>Estos datos aparecerán en la cabecera de todas tus facturas PDF generadas.</p>
            
            <form onSubmit={handleSave} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Nombre de la Empresa/Marca</label>
                <input 
                  type="text" 
                  className="input-modern"
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  placeholder="Next-Gen Solutions"
                />
              </div>

              <div className={styles.formGroup}>
                <label>NIF/CIF</label>
                <input 
                  type="text" 
                  className="input-modern"
                  value={formData.companyTaxId}
                  onChange={(e) => setFormData({...formData, companyTaxId: e.target.value})}
                  placeholder="B-12345678"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Dirección Fiscal</label>
                <textarea 
                  className={`input-modern ${styles.textarea}`}
                  value={formData.companyAddress}
                  onChange={(e) => setFormData({...formData, companyAddress: e.target.value})}
                  placeholder="Calle Ejemplo 123&#10;Barcelona, 08001&#10;contacto@miempresa.com"
                  rows={4}
                />
              </div>

              <div className={styles.formActions}>
                {showSuccess && <span className={styles.successMsg}>✓ Perfil guardado correctamente!</span>}
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving ? 'Guardando...' : 'Guardar Perfil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
