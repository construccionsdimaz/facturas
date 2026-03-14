"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    companyName: '',
    companyAddress: '',
    companyTaxId: '',
    companyLogo: ''
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
          companyTaxId: data.companyTaxId || '',
          companyLogo: data.companyLogo || ''
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
              <div className={styles.formGroup} style={{ marginBottom: '32px' }}>
                <label>Logo de la Empresa</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '12px' }}>
                  <div style={{ 
                    width: '100px', 
                    height: '100px', 
                    borderRadius: '12px', 
                    background: 'rgba(255,255,255,0.05)', 
                    border: '1px dashed rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    {formData.companyLogo ? (
                      <img src={formData.companyLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: '24px', color: 'rgba(255,255,255,0.3)' }}>📷</span>
                    )}
                  </div>
                  <div>
                    <input 
                      type="file" 
                      id="logo-upload" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData({...formData, companyLogo: reader.result as string});
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <label htmlFor="logo-upload" className="btn-secondary" style={{ cursor: 'pointer', padding: '8px 16px', fontSize: '14px' }}>
                      Subir Imagen
                    </label>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                      PNG, JPG o SVG. Máx 500KB.
                    </p>
                    {formData.companyLogo && (
                      <button 
                        type="button" 
                        onClick={() => setFormData({...formData, companyLogo: ''})}
                        style={{ background: 'none', border: 'none', color: '#ff4d4d', fontSize: '12px', cursor: 'pointer', padding: 0, marginTop: '4px', display: 'block' }}
                      >
                        Eliminar logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

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
