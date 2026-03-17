"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';

export default function NewProjectForm({ clients }: { clients: any[] }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    clientId: ''
  });

  // Search state
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.clientId) {
      alert("Por favor rellena el nombre y selecciona un cliente.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Error al crear la obra');
      
      router.push('/projects');
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Error al guardar la obra.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`glass-panel`} style={{ padding: '32px' }}>
      <h1 className="text-gradient" style={{ marginBottom: '8px' }}>Nueva Obra / Proyecto</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Define una nueva obra para agrupar tus facturas y presupuestos.</p>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className={styles.filterGroup}>
            <label>Nombre de la Obra *</label>
            <input 
              type="text" 
              className={styles.inputModern} 
              placeholder="Ej: Reforma Cocina Calle Mayor"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className={styles.filterGroup}>
            <label>Cliente vinculada *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className={styles.inputModern}
                placeholder="🔍 Buscar por nombre, DNI, teléfono..."
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setShowClientDropdown(true);
                  if (!e.target.value) setFormData({ ...formData, clientId: '' });
                }}
                onFocus={() => setShowClientDropdown(true)}
                onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                required={!formData.clientId}
              />
              {showClientDropdown && clientSearch && (() => {
                const query = clientSearch.toLowerCase();
                const filtered = clients.filter(c =>
                  c.name.toLowerCase().includes(query) ||
                  (c.taxId && c.taxId.toLowerCase().includes(query)) ||
                  (c.phone && c.phone.toLowerCase().includes(query)) ||
                  (c.email && c.email.toLowerCase().includes(query))
                );
                return filtered.length > 0 ? (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                  }}>
                    {filtered.map(c => (
                      <div
                        key={c.id}
                        onMouseDown={() => {
                          setFormData({ ...formData, clientId: c.id });
                          setClientSearch(c.name);
                          setShowClientDropdown(false);
                        }}
                        style={{
                          padding: '10px 14px', cursor: 'pointer',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59,130,246,0.1)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{c.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {[c.taxId, c.phone, c.email].filter(Boolean).join(' · ') || 'Sin datos adicionales'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}
              {formData.clientId && (
                <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
                  ✓ Cliente seleccionado: {clients.find(c => c.id === formData.clientId)?.name}
                </div>
              )}
            </div>
          </div>

          <div className={styles.filterGroup}>
            <label>Dirección de la Obra (Opcional)</label>
            <input 
              type="text" 
              className={styles.inputModern} 
              placeholder="Ej: Calle Mayor 12, 3º B"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className={styles.filterGroup}>
            <label>Descripción / Notas</label>
            <textarea 
              className={styles.inputModern} 
              style={{ minHeight: '100px', resize: 'vertical' }}
              placeholder="Detalles adicionales sobre el proyecto..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button 
              type="button" 
              className="btn-secondary"
              onClick={() => router.back()}
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : '💾 Crear Obra'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
