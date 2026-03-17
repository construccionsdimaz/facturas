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
            <select 
              className={styles.inputModern}
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              required
            >
              <option value="">Selecciona un cliente...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
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
