"use client";

import { useState, useEffect } from 'react';
import styles from '@/app/invoices/page.module.css';
import { formatCurrency } from '@/lib/format';
import { PRODUCTIVITY_FAMILY_CODES } from '@/lib/estimate/project-productivity-policy';
import type { ProductivityFamilyCode } from '@/lib/estimate/project-productivity-policy';

const PRODUCTIVITY_FAMILIES: Record<ProductivityFamilyCode, string> = {
  PARTITIONS: 'Tabiquería',
  CEILINGS: 'Falsos Techos',
  FLOORING: 'Suelos y Rodapiés',
  WALL_FINISHES: 'Acabados Verticales',
  BATHROOMS_WET: 'Baños y Zonas Húmedas',
  KITCHENETTES: 'Cocinas',
  ELECTRICAL: 'Electricidad e Iluminación',
  PLUMBING: 'Fontanería',
  DRAINAGE: 'Saneamiento',
  COMMON_AREAS: 'Zonas Comunes',
  ROOMS: 'Habitaciones',
  CARPENTRY: 'Carpintería',
};

export default function ProjectProductivityTab({ projectId }: { projectId: string }) {
  const [policyData, setPolicyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [globalMultiplier, setGlobalMultiplier] = useState(1);
  const [familyOverrides, setFamilyOverrides] = useState<Array<{ familyCode: ProductivityFamilyCode; multiplier: number; forceCrewCode?: string; forceProfileCode?: string }>>([]);

  const fetchPolicy = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/productivity-policy`);
      if (res.ok) {
        const data = await res.json();
        setPolicyData(data);
        setGlobalMultiplier(data.policy.globalMultiplier || 1);
        setFamilyOverrides(data.policy.familyOverrides || []);
      }
    } catch (error) {
      console.error('Error fetching policy', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicy();
  }, [projectId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedPolicy = {
        globalMultiplier: parseFloat(globalMultiplier.toString()) || 1,
        familyOverrides,
      };

      const res = await fetch(`/api/projects/${projectId}/productivity-policy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policy: updatedPolicy, changedBy: 'PROJECT_MANAGER_UI' })
      });

      if (res.ok) {
        alert('Política de productividad actualizada correctamente.');
        fetchPolicy();
      } else {
        alert('Error al guardar la política.');
      }
    } catch (error) {
      console.error(error);
      alert('Error de red al guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddOverride = (familyCode: string) => {
    if (familyOverrides.some(o => o.familyCode === familyCode)) return;
    setFamilyOverrides([...familyOverrides, { familyCode: familyCode as ProductivityFamilyCode, multiplier: 1 }]);
  };

  const handleUpdateOverride = (familyCode: string, field: string, value: any) => {
    setFamilyOverrides(familyOverrides.map(o => {
      if (o.familyCode === familyCode) {
        return { ...o, [field]: value };
      }
      return o;
    }));
  };

  const handleRemoveOverride = (familyCode: string) => {
    setFamilyOverrides(familyOverrides.filter(o => o.familyCode !== familyCode));
  };

  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando política de productividad...</div>;

  const isDefault = policyData?.source === 'DEFAULT';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.4))', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <h2 style={{ fontSize: '20px', margin: '0 0 8px 0' }}>Política de Productividad de Obra</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>Ajusta los rendimientos teóricos y cuadrillas para adaptarlos a las condiciones reales de esta obra específica. Los cambios aquí afectarán a los presupuestos y cronogramas que se generen a partir de ahora.</p>
        </div>
        <div>
           <span className={`badge ${isDefault ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: '14px', padding: '8px 16px' }}>
            {isDefault ? 'Política Estándar' : 'Overrides de Proyecto'}
          </span>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🌍</span> Multiplicador Global de Rendimiento
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Un multiplicador mayor que 1.0 empeora el rendimiento (se tarda más y cuesta más). Un multiplicador menor que 1.0 mejora el rendimiento. Ej: 1.10 = 10% más lento.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <input 
            type="range" 
            min="0.5" 
            max="2.0" 
            step="0.05" 
            value={globalMultiplier}
            onChange={(e) => setGlobalMultiplier(parseFloat(e.target.value))}
            style={{ flex: 1, maxWidth: '300px' }}
          />
          <input 
            type="number" 
            step="0.01" 
            className="input-modern"
            style={{ width: '80px', textAlign: 'center', fontWeight: 'bold' }}
            value={globalMultiplier}
            onChange={(e) => setGlobalMultiplier(parseFloat(e.target.value) || 1)}
          />
          <span style={{ fontSize: '14px', color: globalMultiplier > 1 ? '#ff4444' : globalMultiplier < 1 ? '#10b981' : 'var(--text-primary)'}}>
            {globalMultiplier > 1 ? `+${Math.round((globalMultiplier - 1) * 100)}% Coste/Tiempo` : globalMultiplier < 1 ? `-${Math.round((1 - globalMultiplier) * 100)}% Coste/Tiempo` : 'Estándar'}
          </span>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎯</span> Excepciones por Familia de Producto
          </h3>
          <select 
            className="input-modern" 
            style={{ width: '250px' }}
            onChange={(e) => {
              if (e.target.value) {
                handleAddOverride(e.target.value);
                e.target.value = '';
              }
            }}
          >
            <option value="">+ Añadir Familia...</option>
            {Object.entries(PRODUCTIVITY_FAMILIES)
              .filter(([key]) => !familyOverrides.some(o => o.familyCode === key))
              .map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Configura excepciones específicas para familias enteras (ej: Carpintería o Alicatados). Estas reglas tienen prioridad sobre el multiplicador global.
        </p>

        {familyOverrides.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px' }}>
            No hay excepciones por familia configuradas. Se aplica el multiplicador global a todo.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {familyOverrides.map((override, idx) => (
              <div key={override.familyCode} style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 150px 1fr 50px', gap: '16px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--accent-primary)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{PRODUCTIVITY_FAMILIES[override.familyCode] || override.familyCode}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{override.familyCode}</div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Multiplicador Específico</label>
                  <input 
                    type="number" 
                    step="0.05"
                    className="input-modern"
                    style={{ width: '100%' }}
                    value={override.multiplier}
                    onChange={(e) => handleUpdateOverride(override.familyCode, 'multiplier', parseFloat(e.target.value) || 1)}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Forzar Cuadrilla (Opcional)</label>
                    <input 
                      type="text" 
                      className="input-modern"
                      placeholder="Ej: OFICIAL_AYUDANTE"
                      style={{ width: '100%', fontSize: '12px' }}
                      value={override.forceCrewCode || ''}
                      onChange={(e) => handleUpdateOverride(override.familyCode, 'forceCrewCode', e.target.value)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Forzar Perfil Rendimiento</label>
                    <input 
                      type="text" 
                      className="input-modern"
                      placeholder="Ej: REND_COMPLEJO"
                      style={{ width: '100%', fontSize: '12px' }}
                      value={override.forceProfileCode || ''}
                      onChange={(e) => handleUpdateOverride(override.familyCode, 'forceProfileCode', e.target.value)}
                    />
                  </div>
                </div>
                <button 
                  onClick={() => handleRemoveOverride(override.familyCode)}
                  style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '16px', height: '100%', display: 'flex', alignItems: 'flex-end', paddingBottom: '10px', justifyContent: 'center' }}
                  title="Eliminar excepción"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button 
          className="btn-primary" 
          onClick={handleSave}
          disabled={isSaving}
          style={{ padding: '12px 24px', fontSize: '15px' }}
        >
          {isSaving ? 'Guardando...' : '💾 Guardar Política'}
        </button>
      </div>

      {policyData?.history?.length > 0 && (
        <div className="glass-panel" style={{ padding: '24px', marginTop: '16px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Historial de Cambios</h3>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Autor</th>
                  <th>Resumen del Cambio</th>
                </tr>
              </thead>
              <tbody>
                {policyData.history.map((entry: any) => (
                  <tr key={entry.id}>
                    <td style={{ whiteSpace: 'nowrap', width: '150px' }}>{new Date(entry.changedAt).toLocaleString()}</td>
                    <td style={{ width: '150px' }}>{entry.changedBy}</td>
                    <td style={{ fontSize: '13px', opacity: 0.9 }}>{entry.summaryOfChanges}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
