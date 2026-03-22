"use client";

import { useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/format';
import type {
  EstimateLineEconomicSnapshot,
  EstimateStatusSnapshot,
} from '@/lib/estimate/estimate-status';
import type { IntegratedEstimateCostBucket } from '@/lib/estimate/estimate-integration';

export type ProposalLine = {
  chapter: string;
  code?: string | null;
  description: string;
  unit: string;
  quantity: number;
  commercialPrice: number;
  internalCost: number;
  laborHours: number;
  laborCost: number;
  materialCost: number;
  associatedCost: number;
  kind: string;
  source: 'MASTER' | 'FALLBACK';
  typologyCode?: string | null;
  standardActivityCode?: string | null;
  productivityRateName?: string | null;
  measurementRule?: Record<string, unknown> | null;
  pricingRule?: Record<string, unknown> | null;
  appliedAssumptions?: Record<string, unknown> | null;
  economicStatus: EstimateLineEconomicSnapshot;
};

export type Proposal = {
  chapters: string[];
  lines: ProposalLine[];
  summary: {
    materialCost: number;
    laborCost: number;
    associatedCost: number;
    internalCost: number;
    contingencyAmount: number;
    marginAmount: number;
    commercialSubtotal: number;
    vatAmount: number;
    commercialTotal: number;
  };
  notes: string[];
  typologyCode?: string | null;
  source: 'MASTER' | 'FALLBACK';
  seedVersion?: number | null;
  estimateStatus: EstimateStatusSnapshot;
  integratedCostBuckets?: IntegratedEstimateCostBucket[];
};

export type EstimateItem = {
  id: string;
  description: string;
  quantity: number;
  price: number;
  unit: string;
  chapter: string;
};

export function mapProposalToEstimateDraft(proposal: Proposal): {
  items: EstimateItem[];
  chapters: string[];
  proposal: Proposal;
} {
  const items: EstimateItem[] = proposal.lines.map((line, index) => ({
    id: `auto-${index + 1}`,
    description: `${line.description} (${line.kind})`,
    quantity: line.quantity,
    price: line.commercialPrice / Math.max(line.quantity, 0.0001),
    unit: line.unit,
    chapter: line.chapter,
  }));

  return {
    items,
    chapters: proposal.chapters,
    proposal,
  };
}

export default function AutoEstimateBuilder({
  onApply,
}: {
  onApply: (payload: { items: EstimateItem[]; chapters: string[]; proposal: Proposal }) => void;
}) {
  const [workType, setWorkType] = useState('REFORMA_INTEGRAL_VIVIENDA');
  const [siteType, setSiteType] = useState('PISO');
  const [scopeType, setScopeType] = useState('REFORMA_INTEGRAL');
  const [area, setArea] = useState('90');
  const [works, setWorks] = useState('demolicion, electricidad, fontaneria, pladur, suelo y pintura');
  const [finishLevel, setFinishLevel] = useState('MEDIO_ALTO');
  const [accessLevel, setAccessLevel] = useState('NORMAL');
  const [conditions, setConditions] = useState('');
  const [bathrooms, setBathrooms] = useState('2');
  const [kitchens, setKitchens] = useState('1');
  const [rooms, setRooms] = useState('3');
  const [units, setUnits] = useState('1');
  const [floors, setFloors] = useState('1');
  const [hasElevator, setHasElevator] = useState(true);
  const [structuralWorks, setStructuralWorks] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const canApply = useMemo(() => !!proposal?.lines.length, [proposal]);

  const estimateModeLabel = (mode: Proposal['estimateStatus']['estimateMode']) => {
    switch (mode) {
      case 'RECIPE_PRICED':
        return 'Receta valorada';
      case 'MIXED':
        return 'Mixto';
      default:
        return 'Parametrico preliminar';
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/estimates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workType,
          siteType,
          scopeType,
          area,
          works,
          finishLevel,
          accessLevel,
          conditions,
          bathrooms,
          kitchens,
          rooms,
          units,
          floors,
          hasElevator,
          structuralWorks,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo generar la propuesta');
      }

      const data = await res.json();
      setProposal(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error generando propuesta';
      alert(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const applyProposal = () => {
    if (!proposal) return;
    onApply(mapProposalToEstimateDraft(proposal));
  };

  const sitePresets: Record<string, { works: string; scopeType: string; units: string; floors: string; structuralWorks: boolean }> = {
    PISO: { works: 'demolicion, electricidad, fontaneria, pladur, suelo y pintura', scopeType: 'REFORMA_INTEGRAL', units: '1', floors: '1', structuralWorks: false },
    LOCAL: { works: 'adecuacion, electricidad, fontaneria, suelos, pintura, evacuacion de residuos', scopeType: 'ADECUACION', units: '1', floors: '1', structuralWorks: false },
    EDIFICIO: { works: 'rehabilitacion, zonas comunes, fachadas, instalaciones, evacuacion de residuos', scopeType: 'REESTRUCTURACION', units: '6', floors: '4', structuralWorks: true },
    VIVIENDA_UNIFAMILIAR: { works: 'reforma integral, cubierta, instalaciones, acabados', scopeType: 'REFORMA_INTEGRAL', units: '1', floors: '2', structuralWorks: false },
    OBRA_NUEVA: { works: 'obra nueva, estructura, instalaciones, acabados, legalizaciones', scopeType: 'OBRA_NUEVA', units: '1', floors: '2', structuralWorks: true },
    CAMBIO_USO: { works: 'cambio de uso, reforma integral, instalaciones, ventilacion, protecciones', scopeType: 'CAMBIO_USO', units: '1', floors: '1', structuralWorks: false },
    OFICINA: { works: 'adecuacion de oficina, instalaciones, acabados, particiones', scopeType: 'ADECUACION', units: '1', floors: '1', structuralWorks: false },
    NAVE: { works: 'adecuacion nave, instalacion electrica, suelo industrial, protecciones', scopeType: 'ADECUACION', units: '1', floors: '1', structuralWorks: false },
  };

  const applySitePreset = (nextSiteType: string) => {
    setSiteType(nextSiteType);
    const preset = sitePresets[nextSiteType] || sitePresets.PISO;
    setScopeType(preset.scopeType);
    setWorks(preset.works);
    setUnits(preset.units);
    setFloors(preset.floors);
    setStructuralWorks(preset.structuralWorks);
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
      <h3 style={{ marginTop: 0 }}>Generador automatico de presupuesto</h3>
      <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>
        Introduce pocos datos y el sistema propone estructura, mano de obra, costes asociados y precio comercial.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <div className="formGroup">
          <label>Tipo de obra</label>
          <select className="input-modern" value={workType} onChange={(e) => setWorkType(e.target.value)}>
            <option value="REFORMA_INTEGRAL_VIVIENDA">Reforma integral vivienda</option>
            <option value="REFORMA_COCINA_BANO">Cocina y bano</option>
            <option value="REFORMA_PARCIAL">Reforma parcial</option>
            <option value="ADECUACION_LOCAL">Adecuacion de local</option>
            <option value="COLIVING">Coliving</option>
            <option value="REHABILITACION_LIGERA">Rehabilitacion ligera</option>
          </select>
        </div>
        <div className="formGroup">
          <label>Que es la obra</label>
          <select className="input-modern" value={siteType} onChange={(e) => applySitePreset(e.target.value)}>
            <option value="PISO">Piso / vivienda</option>
            <option value="LOCAL">Local</option>
            <option value="EDIFICIO">Edificio</option>
            <option value="VIVIENDA_UNIFAMILIAR">Vivienda unifamiliar</option>
            <option value="OBRA_NUEVA">Obra nueva</option>
            <option value="CAMBIO_USO">Cambio de uso</option>
            <option value="OFICINA">Oficina</option>
            <option value="NAVE">Nave / industrial</option>
          </select>
        </div>
        <div className="formGroup">
          <label>Alcance</label>
          <select className="input-modern" value={scopeType} onChange={(e) => setScopeType(e.target.value)}>
            <option value="REFORMA_INTEGRAL">Reforma integral</option>
            <option value="REFORMA_PARCIAL">Reforma parcial</option>
            <option value="REHABILITACION">Rehabilitacion</option>
            <option value="ADECUACION">Adecuacion</option>
            <option value="OBRA_NUEVA">Obra nueva</option>
            <option value="REESTRUCTURACION">Reestructuracion</option>
            <option value="CAMBIO_USO">Cambio de uso</option>
          </select>
        </div>
        <div className="formGroup">
          <label>Superficie / m2</label>
          <input className="input-modern" type="number" value={area} onChange={(e) => setArea(e.target.value)} />
        </div>
        <div className="formGroup">
          <label>Acabado</label>
          <select className="input-modern" value={finishLevel} onChange={(e) => setFinishLevel(e.target.value)}>
            <option value="BASICO">Basico</option>
            <option value="MEDIO">Medio</option>
            <option value="MEDIO_ALTO">Medio-alto</option>
            <option value="ALTO">Alto</option>
          </select>
        </div>
        <div className="formGroup">
          <label>Acceso / Logistica</label>
          <select className="input-modern" value={accessLevel} onChange={(e) => setAccessLevel(e.target.value)}>
            <option value="FACIL">Facil</option>
            <option value="NORMAL">Normal</option>
            <option value="COMPLICADO">Complicado</option>
            <option value="MUY_COMPLICADO">Muy complicado</option>
          </select>
        </div>
        <div className="formGroup">
          <label>Baños</label>
          <input className="input-modern" type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
        </div>
        <div className="formGroup">
          <label>Cocinas</label>
          <input className="input-modern" type="number" value={kitchens} onChange={(e) => setKitchens(e.target.value)} />
        </div>
        <div className="formGroup">
          <label>Habitaciones</label>
          <input className="input-modern" type="number" value={rooms} onChange={(e) => setRooms(e.target.value)} />
        </div>
        <div className="formGroup">
          <label>Unidades / viviendas</label>
          <input className="input-modern" type="number" value={units} onChange={(e) => setUnits(e.target.value)} />
        </div>
        <div className="formGroup">
          <label>Plantas / niveles</label>
          <input className="input-modern" type="number" value={floors} onChange={(e) => setFloors(e.target.value)} />
        </div>
      </div>

      <details style={{ marginTop: '12px' }}>
        <summary style={{ cursor: 'pointer', color: 'var(--accent-primary)', fontWeight: 600 }}>Detalles avanzados del proyecto</summary>
        <div style={{ marginTop: '12px', display: 'grid', gap: '12px' }}>
          <div className="formGroup">
            <label>Que hay que hacer</label>
            <textarea className="input-modern" rows={3} value={works} onChange={(e) => setWorks(e.target.value)} />
          </div>
          <div className="formGroup">
            <label>Condicionantes</label>
            <textarea
              className="input-modern"
              rows={2}
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="Acceso complicado, vecinos, horario, residuos, estructura, licencias, etc."
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={hasElevator} onChange={(e) => setHasElevator(e.target.checked)} />
              <span>Hay ascensor / facil acceso vertical</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={structuralWorks} onChange={(e) => setStructuralWorks(e.target.checked)} />
              <span>Hay trabajos estructurales / redistribucion fuerte</span>
            </label>
          </div>
        </div>
      </details>

      <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
        <button className="btn-primary" type="button" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? 'Generando...' : 'Generar propuesta automatica'}
        </button>
        <button className="btn-secondary" type="button" onClick={applyProposal} disabled={!canApply}>
          Aplicar al presupuesto
        </button>
      </div>

	      {proposal && (
	        <div style={{ marginTop: '20px', display: 'grid', gap: '16px' }}>
	          <div
              className="glass-panel"
              style={{
                padding: '14px',
                borderColor:
                  proposal.estimateStatus.estimateMode === 'PARAMETRIC_PRELIMINARY'
                    ? '#f59e0b'
                    : proposal.estimateStatus.estimateMode === 'MIXED'
                      ? '#60a5fa'
                      : '#10b981',
                background:
                  proposal.estimateStatus.estimateMode === 'PARAMETRIC_PRELIMINARY'
                    ? 'rgba(245, 158, 11, 0.08)'
                    : 'rgba(255,255,255,0.03)',
              }}
            >
	            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Estado del estimate</div>
	            <div style={{ fontWeight: 700 }}>
	              {estimateModeLabel(proposal.estimateStatus.estimateMode)}
	            </div>
              <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Cobertura tecnica {proposal.estimateStatus.technicalCoveragePercent}% | Receta {proposal.estimateStatus.recipeCoveragePercent}% | Precio {proposal.estimateStatus.priceCoveragePercent}% | Lineas pendientes {proposal.estimateStatus.pendingValidationCount}
              </div>
              {proposal.estimateStatus.estimateMode === 'PARAMETRIC_PRELIMINARY' && (
                <div style={{ marginTop: '8px', fontSize: '13px', color: '#fcd34d', fontWeight: 600 }}>
                  Esta propuesta no debe presentarse como presupuesto final cerrado. Falta especificacion tecnica o precio real suficiente.
                </div>
              )}
              <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>Fuente aplicada</div>
	            <div style={{ fontWeight: 700 }}>
	              {proposal.source || 'MASTER'}{proposal.typologyCode ? ` | ${proposal.typologyCode}` : ''}
	            </div>
	            {proposal.notes.length > 0 && (
	              <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
	                {proposal.notes.join(' | ')}
	              </div>
	            )}
	          </div>

	          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <div className="glass-panel" style={{ padding: '14px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Coste interno</div>
              <strong>{formatCurrency(proposal.summary.internalCost)}</strong>
            </div>
            <div className="glass-panel" style={{ padding: '14px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Margen</div>
              <strong>{formatCurrency(proposal.summary.marginAmount)}</strong>
            </div>
            <div className="glass-panel" style={{ padding: '14px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Subtotal comercial</div>
              <strong>{formatCurrency(proposal.summary.commercialSubtotal)}</strong>
            </div>
            <div className="glass-panel" style={{ padding: '14px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total con IVA</div>
              <strong>{formatCurrency(proposal.summary.commercialTotal)}</strong>
            </div>
          </div>

          <div>
            <h4 style={{ marginBottom: '8px' }}>Desglose automatico</h4>
            <div style={{ display: 'grid', gap: '8px' }}>
	              {proposal.lines.map((line) => (
	                <div key={`${line.chapter}-${line.description}`} className="glass-panel" style={{ padding: '12px' }}>
	                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
	                    <div>
	                      <div style={{ fontWeight: 600 }}>{line.chapter}</div>
	                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{line.description}</div>
                        <div style={{ marginTop: '6px', fontSize: '12px', color: '#fcd34d' }}>
                          {line.economicStatus.economicStatus} | {line.economicStatus.priceSource} | {line.economicStatus.costSource}
                          {line.economicStatus.pendingValidation ? ' | Pendiente de validacion' : ''}
                        </div>
	                    </div>
	                    <div style={{ textAlign: 'right' }}>
	                      <div>{line.quantity.toFixed(2)} {line.unit}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        MO {formatCurrency(line.laborCost)} | Mat {formatCurrency(line.materialCost)} | Asoc {formatCurrency(line.associatedCost)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {proposal.integratedCostBuckets && proposal.integratedCostBuckets.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ marginBottom: '8px' }}>Buckets tecnicos integrados</h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                {proposal.integratedCostBuckets.map((bucket) => (
                  <div key={bucket.bucketCode} className="glass-panel" style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 600 }}>{bucket.bucketCode}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {bucket.source} | {bucket.priceStatus} | Receta {bucket.recipeCoveragePercent}% | Precio {bucket.priceCoveragePercent}%
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '13px' }}>
                      Mat {formatCurrency(bucket.materialCost)} | MO {formatCurrency(bucket.laborCost)} | Asoc {formatCurrency(bucket.indirectCost)} | Total {bucket.totalCost == null ? 'Pendiente' : formatCurrency(bucket.totalCost)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
