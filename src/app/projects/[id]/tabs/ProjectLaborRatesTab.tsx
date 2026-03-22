"use client";

import { useEffect, useState } from 'react';
import styles from '@/app/invoices/page.module.css';
import { PRODUCTIVITY_FAMILY_CODES } from '@/lib/estimate/project-productivity-policy';
import { LABOR_TRADE_CODE_CATALOG } from '@/lib/estimate/labor-productivity';

const FAMILY_LABELS: Record<string, string> = {
  PARTITIONS: 'Tabiqueria',
  CEILINGS: 'Falsos techos',
  FLOORING: 'Suelos y rodapies',
  WALL_FINISHES: 'Acabados verticales',
  BATHROOMS_WET: 'Banos y humedos',
  KITCHENETTES: 'Kitchenettes',
  ELECTRICAL: 'Electricidad',
  PLUMBING: 'Fontaneria',
  DRAINAGE: 'Saneamiento',
  COMMON_AREAS: 'Zonas comunes',
  ROOMS: 'Habitaciones',
  CARPENTRY: 'Carpinteria',
  GENERAL: 'General',
};

const TRADE_LABELS: Record<string, string> = {
  OFICIO_ALBANIL: 'Albanil',
  OFICIO_PLADUR: 'Pladur',
  OFICIO_PINTOR: 'Pintor',
  OFICIO_ELECTRICISTA: 'Electricista',
  OFICIO_FONTANERO: 'Fontanero',
  OFICIO_CARPINTERO: 'Carpintero',
  OFICIO_SOLADOR: 'Solador',
  OFICIO_TECNICO_MULTI: 'Tecnico multi',
};

type FamilyOverride = {
  familyCode: string;
  rateMultiplier?: number;
  hourlyRate?: number;
};

type TradeOverride = {
  tradeCode: string;
  hourlyRate?: number;
};

export default function ProjectLaborRatesTab({ projectId }: { projectId: string }) {
  const [policyData, setPolicyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [globalMultiplier, setGlobalMultiplier] = useState(1);
  const [familyOverrides, setFamilyOverrides] = useState<FamilyOverride[]>([]);
  const [tradeOverrides, setTradeOverrides] = useState<TradeOverride[]>([]);

  async function fetchPolicy() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/labor-rate-policy`);
      if (res.ok) {
        const data = await res.json();
        setPolicyData(data);
        setGlobalMultiplier(data.policy.globalLaborMultiplier || 1);
        setFamilyOverrides(
          Object.entries(data.policy.overridesByFamily || {}).map(([familyCode, value]: any) => ({
            familyCode,
            rateMultiplier: value?.rateMultiplier ?? 1,
            hourlyRate: value?.hourlyRate ?? undefined,
          })),
        );
        setTradeOverrides(
          Object.entries(data.policy.tradeOverrides || {}).map(([tradeCode, value]: any) => ({
            tradeCode,
            hourlyRate: value?.hourlyRate ?? undefined,
          })),
        );
      }
    } catch (error) {
      console.error('Error fetching labor policy', error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchPolicy();
  }, [projectId]);

  async function handleSave() {
    setIsSaving(true);
    try {
      const policy = {
        globalLaborMultiplier: parseFloat(globalMultiplier.toString()) || 1,
        overridesByFamily: Object.fromEntries(
          familyOverrides.map((entry) => [
            entry.familyCode,
            {
              rateMultiplier:
                typeof entry.rateMultiplier === 'number' && Number.isFinite(entry.rateMultiplier)
                  ? entry.rateMultiplier
                  : undefined,
              hourlyRate:
                typeof entry.hourlyRate === 'number' && Number.isFinite(entry.hourlyRate)
                  ? entry.hourlyRate
                  : undefined,
            },
          ]),
        ),
        tradeOverrides: Object.fromEntries(
          tradeOverrides.map((entry) => [
            entry.tradeCode,
            {
              hourlyRate:
                typeof entry.hourlyRate === 'number' && Number.isFinite(entry.hourlyRate)
                  ? entry.hourlyRate
                  : undefined,
            },
          ]),
        ),
      };

      const res = await fetch(`/api/projects/${projectId}/labor-rate-policy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policy, changedBy: 'PROJECT_LABOR_UI' }),
      });

      if (!res.ok) {
        alert('Error al guardar la policy laboral.');
      } else {
        await fetchPolicy();
        alert('Policy laboral actualizada correctamente.');
      }
    } catch (error) {
      console.error(error);
      alert('Error de red al guardar la policy laboral.');
    } finally {
      setIsSaving(false);
    }
  }

  function updateFamilyOverride(familyCode: string, field: 'rateMultiplier' | 'hourlyRate', value: number | undefined) {
    setFamilyOverrides((current) =>
      current.map((item) => (item.familyCode === familyCode ? { ...item, [field]: value } : item)),
    );
  }

  function addFamilyOverride(familyCode: string) {
    if (!familyCode || familyOverrides.some((item) => item.familyCode === familyCode)) return;
    setFamilyOverrides((current) => [...current, { familyCode, rateMultiplier: 1 }]);
  }

  function removeFamilyOverride(familyCode: string) {
    setFamilyOverrides((current) => current.filter((item) => item.familyCode !== familyCode));
  }

  function updateTradeOverride(tradeCode: string, value: number | undefined) {
    setTradeOverrides((current) =>
      current.map((item) => (item.tradeCode === tradeCode ? { ...item, hourlyRate: value } : item)),
    );
  }

  function addTradeOverride(tradeCode: string) {
    if (!tradeCode || tradeOverrides.some((item) => item.tradeCode === tradeCode)) return;
    setTradeOverrides((current) => [...current, { tradeCode }]);
  }

  function removeTradeOverride(tradeCode: string) {
    setTradeOverrides((current) => current.filter((item) => item.tradeCode !== tradeCode));
  }

  if (isLoading) {
    return <div style={{ padding: '32px', textAlign: 'center' }}>Cargando policy laboral...</div>;
  }

  const isDefault = policyData?.source === 'DEFAULT';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.4))', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <h2 style={{ fontSize: '20px', margin: '0 0 8px 0' }}>Gobernanza de rates laborales</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
            Ajusta el coste laboral canónico de la obra con overrides prudentes por familia u oficio.
            Esto endurece el pricing laboral y deja trazabilidad de si la obra usa rates default u override propio.
          </p>
        </div>
        <span className={`badge ${isDefault ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: '14px', padding: '8px 16px' }}>
          {isDefault ? 'Rates Estandar' : 'Override de Proyecto'}
        </span>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 12px 0' }}>Multiplicador global de mano de obra</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Se aplica sobre el rate laboral canónico cuando no exista un rate fijo mas especifico.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <input
            type="range"
            min="0.7"
            max="1.5"
            step="0.05"
            value={globalMultiplier}
            onChange={(e) => setGlobalMultiplier(parseFloat(e.target.value))}
            style={{ flex: 1, maxWidth: '320px' }}
          />
          <input
            type="number"
            step="0.01"
            className="input-modern"
            style={{ width: '90px', textAlign: 'center' }}
            value={globalMultiplier}
            onChange={(e) => setGlobalMultiplier(parseFloat(e.target.value) || 1)}
          />
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>Overrides por familia</h3>
          <select
            className="input-modern"
            style={{ width: '260px' }}
            onChange={(e) => {
              if (e.target.value) {
                addFamilyOverride(e.target.value);
                e.target.value = '';
              }
            }}
          >
            <option value="">+ Anadir familia...</option>
            {[...PRODUCTIVITY_FAMILY_CODES, 'GENERAL']
              .filter((familyCode) => !familyOverrides.some((item) => item.familyCode === familyCode))
              .map((familyCode) => (
                <option key={familyCode} value={familyCode}>
                  {FAMILY_LABELS[familyCode] || familyCode}
                </option>
              ))}
          </select>
        </div>

        {familyOverrides.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px' }}>
            No hay overrides por familia. Se usa el rate canónico más el multiplicador global.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {familyOverrides.map((override) => (
              <div key={override.familyCode} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr auto', gap: '12px', alignItems: 'end', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{FAMILY_LABELS[override.familyCode] || override.familyCode}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{override.familyCode}</div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Multiplicador</label>
                  <input
                    type="number"
                    step="0.05"
                    className="input-modern"
                    value={override.rateMultiplier ?? ''}
                    onChange={(e) => updateFamilyOverride(override.familyCode, 'rateMultiplier', e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Rate fijo €/h</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-modern"
                    value={override.hourlyRate ?? ''}
                    onChange={(e) => updateFamilyOverride(override.familyCode, 'hourlyRate', e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
                <button className="btn-secondary" onClick={() => removeFamilyOverride(override.familyCode)}>
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>Overrides por oficio</h3>
          <select
            className="input-modern"
            style={{ width: '260px' }}
            onChange={(e) => {
              if (e.target.value) {
                addTradeOverride(e.target.value);
                e.target.value = '';
              }
            }}
          >
            <option value="">+ Anadir oficio...</option>
            {LABOR_TRADE_CODE_CATALOG.filter((tradeCode) => !tradeOverrides.some((item) => item.tradeCode === tradeCode)).map((tradeCode) => (
              <option key={tradeCode} value={tradeCode}>
                {TRADE_LABELS[tradeCode] || tradeCode}
              </option>
            ))}
          </select>
        </div>

        {tradeOverrides.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px' }}>
            No hay overrides por oficio.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tradeOverrides.map((override) => (
              <div key={override.tradeCode} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto', gap: '12px', alignItems: 'end', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{TRADE_LABELS[override.tradeCode] || override.tradeCode}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{override.tradeCode}</div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Rate fijo €/h</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-modern"
                    value={override.hourlyRate ?? ''}
                    onChange={(e) => updateTradeOverride(override.tradeCode, e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
                <button className="btn-secondary" onClick={() => removeTradeOverride(override.tradeCode)}>
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Guardando...' : 'Guardar policy laboral'}
        </button>
      </div>

      {policyData?.history?.length > 0 && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0' }}>Historial reciente</h3>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Autor</th>
                  <th>Resumen</th>
                </tr>
              </thead>
              <tbody>
                {policyData.history.map((entry: any) => (
                  <tr key={entry.id}>
                    <td style={{ whiteSpace: 'nowrap', width: '170px' }}>{new Date(entry.changedAt).toLocaleString()}</td>
                    <td style={{ width: '160px' }}>{entry.changedBy || 'SYSTEM'}</td>
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
