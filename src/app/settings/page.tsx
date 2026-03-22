"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    companyName: '',
    companyAddress: '',
    companyCity: '',
    companyZip: '',
    companyProvince: '',
    companyTaxId: '',
    companyLogo: '',
    logoZoom: 1,
    logoX: 0,
    logoY: 0,
    paymentMethod: '',
    bankAccount: '',
    dataProtection: ''
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
          companyCity: data.companyCity || '',
          companyZip: data.companyZip || '',
          companyProvince: data.companyProvince || '',
          companyTaxId: data.companyTaxId || '',
          companyLogo: data.companyLogo || '',
          logoZoom: data.logoZoom || 1,
          logoX: data.logoX || 0,
          logoY: data.logoY || 0,
          paymentMethod: data.paymentMethod || '',
          bankAccount: data.bankAccount || '',
          dataProtection: data.dataProtection || ''
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
            <li><a href="/settings/offers" style={{ color: 'inherit', textDecoration: 'none' }}>Catalogo y Ofertas</a></li>
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
                <div className={styles.logoUploadContainer}>
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
                    position: 'relative',
                    flexShrink: 0
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
                      {formData.companyLogo ? 'Cambiar Logo' : 'Subir Imagen'}
                    </label>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                      PNG, JPG o SVG. Máx 500KB.
                    </p>
                    {formData.companyLogo && (
                      <button 
                        type="button" 
                        onClick={() => setFormData({...formData, companyLogo: '', logoZoom: 1, logoX: 0, logoY: 0})}
                        style={{ background: 'none', border: 'none', color: '#ff4d4d', fontSize: '12px', cursor: 'pointer', padding: 0, marginTop: '4px', display: 'block' }}
                      >
                        Eliminar logo
                      </button>
                    )}
                  </div>
                </div>

                {formData.companyLogo && (
                  <div className={styles.cropperContainer}>
                    <div>
                      <h3 className={styles.cropperLabel}>Ajuste y Recorte del Logo</h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Desliza para ajustar cómo se verá el logo en la factura.</p>
                    </div>

                    <div className={styles.cropperPreviewContainer}>
                      <div style={{ 
                        width: '100%', 
                        height: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}>
                        <img 
                          src={formData.companyLogo} 
                          alt="Preview" 
                          style={{ 
                            transform: `scale(${formData.logoZoom}) translate(${formData.logoX}px, ${formData.logoY}px)`,
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            transition: 'none'
                          }} 
                        />
                      </div>
                    </div>

                    <div className={styles.controlsGrid}>
                      <div className={styles.controlItem}>
                        <label>Zoom ({formData.logoZoom.toFixed(1)}x)</label>
                        <input 
                          type="range" 
                          min="1" 
                          max="5" 
                          step="0.1" 
                          value={formData.logoZoom}
                          onChange={(e) => setFormData({...formData, logoZoom: parseFloat(e.target.value)})}
                          className={styles.rangeInput}
                        />
                      </div>
                      <div className={styles.controlItem}>
                        <label>Posición Horizontal ({formData.logoX}px)</label>
                        <input 
                          type="range" 
                          min="-200" 
                          max="200" 
                          step="1" 
                          value={formData.logoX}
                          onChange={(e) => setFormData({...formData, logoX: parseInt(e.target.value)})}
                          className={styles.rangeInput}
                        />
                      </div>
                      <div className={styles.controlItem}>
                        <label>Posición Vertical ({formData.logoY}px)</label>
                        <input 
                          type="range" 
                          min="-200" 
                          max="200" 
                          step="1" 
                          value={formData.logoY}
                          onChange={(e) => setFormData({...formData, logoY: parseInt(e.target.value)})}
                          className={styles.rangeInput}
                        />
                      </div>
                      <div className={styles.controlItem} style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                        <button 
                          type="button" 
                          className="btn-secondary"
                          style={{ fontSize: '12px', padding: '4px 12px' }}
                          onClick={() => setFormData({...formData, logoZoom: 1, logoX: 0, logoY: 0})}
                        >
                          Resetear
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
                <label>Dirección Fiscal (Calle, nº, piso)</label>
                <input 
                  type="text" 
                  className="input-modern"
                  value={formData.companyAddress}
                  onChange={(e) => setFormData({...formData, companyAddress: e.target.value})}
                  placeholder="Calle Ejemplo 123, 2º 1ª"
                />
              </div>

              <div className={styles.grid3}>
                <div className={styles.formGroup}>
                  <label>Población</label>
                  <input 
                    type="text" 
                    className="input-modern"
                    value={formData.companyCity}
                    onChange={(e) => setFormData({...formData, companyCity: e.target.value})}
                    placeholder="Barcelona"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Cód. Postal</label>
                  <input 
                    type="text" 
                    className="input-modern"
                    value={formData.companyZip}
                    onChange={(e) => setFormData({...formData, companyZip: e.target.value})}
                    placeholder="08001"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Provincia</label>
                  <input 
                    type="text" 
                    className="input-modern"
                    value={formData.companyProvince}
                    onChange={(e) => setFormData({...formData, companyProvince: e.target.value})}
                    placeholder="Barcelona"
                  />
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.formGroup}>
                  <label>Forma de Pago (ej: Transferencia)</label>
                  <input 
                    type="text" 
                    className="input-modern"
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                    placeholder="Transferencia Bancaria"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Cuenta de Abono (IBAN)</label>
                  <input 
                    type="text" 
                    className="input-modern"
                    value={formData.bankAccount}
                    onChange={(e) => setFormData({...formData, bankAccount: e.target.value})}
                    placeholder="ES21 0000 0000 0000 0000 0000"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Texto Protección de Datos (RGPD)</label>
                <textarea 
                  className={`input-modern ${styles.textarea}`}
                  value={formData.dataProtection}
                  onChange={(e) => setFormData({...formData, dataProtection: e.target.value})}
                  placeholder="PROTECCIÓN DE DATOS: De conformidad con lo dispuesto..."
                  rows={6}
                />
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Este texto aparecerá en letra pequeña en el pie de página de todas tus facturas.
                </p>
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
