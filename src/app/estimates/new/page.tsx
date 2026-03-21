"use client";

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from '@/app/invoices/new/page.module.css';
import EstimatePDFTemplate from '@/app/estimates/EstimatePDFTemplate';
import { formatCurrency } from '@/lib/format';
import AutoEstimateBuilder, { mapProposalToEstimateDraft, type Proposal as GeneratedProposal } from './AutoEstimateBuilder';

interface EstimateItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  unit: string;
  chapter: string;
}

interface Client {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  phone: string | null;
  taxId: string | null;
}

interface CompanySettings {
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyZip: string;
  companyProvince: string;
  companyTaxId: string;
  companyLogo: string;
  logoZoom?: number;
  logoX?: number;
  logoY?: number;
  paymentMethod: string;
  bankAccount: string;
  dataProtection: string;
}

interface ProjectSummary {
  id: string;
  clientId: string;
  name: string;
  client?: {
    name?: string;
  };
}

interface DiscoverySessionResponse {
  id: string;
  clientId?: string | null;
  projectId?: string | null;
  budgetGoal: string;
  precisionMode: string;
  summary?: {
    headline?: {
      workTypeLabel?: string;
    };
  } | null;
  warnings?: { code: string; message: string }[] | null;
  assumptions?: { code: string; message: string }[] | null;
}

export default function NewEstimate() {
  return (
    <Suspense fallback={<div>Cargando editor...</div>}>
      <NewEstimateContent />
    </Suspense>
  );
}

function NewEstimateContent() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');
  const discoverySessionId = searchParams.get('discoverySessionId');
  const discoveryEditUrl = discoverySessionId
    ? `/estimates/discovery?sessionId=${discoverySessionId}${projectIdParam ? `&projectId=${projectIdParam}` : ''}`
    : null;
  
  // Database State
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  
  // Form State
  const [items, setItems] = useState<EstimateItem[]>([
    { id: '1', description: '', quantity: 1, price: 0, unit: 'ud', chapter: '01 GENERAL' }
  ]);
  const [chapters, setChapters] = useState<string[]>(['01 GENERAL']);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [estimateNumber, setEstimateNumber] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [language, setLanguage] = useState('ES');
  const [brandColor] = useState('#8b5cf6');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [spellcheckLang, setSpellcheckLang] = useState('ES');
  const [internalProposal, setInternalProposal] = useState<GeneratedProposal | null>(null);
  const [discoverySummary, setDiscoverySummary] = useState<DiscoverySessionResponse | null>(null);
  const [isApplyingDiscovery, setIsApplyingDiscovery] = useState(false);
  const [discoveryError, setDiscoveryError] = useState('');
  
  // Calculation States
  const [taxRate, setTaxRate] = useState(21);
  const [taxAmount, setTaxAmount] = useState(0);
  const [total, setTotal] = useState(0);
  
  const pdfRef = useRef<HTMLDivElement>(null);
  const appliedDiscoveryRef = useRef<string | null>(null);

  // Quick Add Client State
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Load Initial Data + Sequential Estimate Number
  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then(res => res.json()),
      fetch('/api/settings').then(res => res.json()),
      fetch('/api/estimates').then(res => res.json())
    ]).then(([clientsData, settingsData, estimatesData]) => {
      setClients(clientsData || []);
      setSettings(settingsData || null);
      
      const year = new Date().getFullYear();
      const existingNumbers = (estimatesData || [])
        .map((est: { number?: string }) => {
          const matches = est.number?.match(/\d+/g);
          return matches ? parseInt(matches[matches.length - 1]) : 0;
        })
        .filter((n: number) => n > 0);
      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      setEstimateNumber(`PRE-${year}-${nextNumber.toString().padStart(3, '0')}`);
      
      if (projectIdParam) {
        fetch(`/api/projects/${projectIdParam}`).then(res => res.json()).then(project => {
          if (project && project.clientId) {
            setSelectedClientId(project.clientId);
            setSelectedProjectId(project.id);
            setClientSearch(project.client?.name || '');
          }
        });
      }
    }).catch(err => console.error("Error loading data", err));
  }, [projectIdParam]);

  useEffect(() => {
    if (!discoverySessionId || appliedDiscoveryRef.current === discoverySessionId) return;

    let mounted = true;

    async function applyDiscoveryProposal() {
      setIsApplyingDiscovery(true);
      setDiscoveryError('');

      try {
        const sessionRes = await fetch(`/api/discovery/sessions/${discoverySessionId}`);
        const sessionData: DiscoverySessionResponse & { error?: string } = await sessionRes.json();

        if (!sessionRes.ok) {
          throw new Error(sessionData.error || 'No se pudo cargar la sesion discovery');
        }

        if (!mounted) return;

        setDiscoverySummary(sessionData);

        if (sessionData.clientId) {
          setSelectedClientId(sessionData.clientId);
        }

        if (sessionData.projectId) {
          setSelectedProjectId(sessionData.projectId);
        }

        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(`discovery-proposal:${discoverySessionId}`);
        }

        const generateRes = await fetch(`/api/discovery/sessions/${discoverySessionId}/generate`, {
          method: 'POST',
        });
        const generateData = await generateRes.json();

        if (!generateRes.ok) {
          throw new Error(generateData.error || 'No se pudo generar la propuesta desde discovery');
        }

        const proposal = generateData.proposal as GeneratedProposal;
        setDiscoverySummary((current) => ({
          ...(current || sessionData),
          summary: generateData.summary ?? current?.summary ?? sessionData.summary,
          warnings: generateData.warnings ?? current?.warnings ?? sessionData.warnings,
          assumptions: generateData.assumptions ?? current?.assumptions ?? sessionData.assumptions,
        }));

        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(`discovery-proposal:${discoverySessionId}`, JSON.stringify(proposal));
        }

        if (!mounted || !proposal) return;

        const mapped = mapProposalToEstimateDraft(proposal);
        applyAutoProposal(mapped);
        appliedDiscoveryRef.current = discoverySessionId;
      } catch (error: any) {
        if (mounted) {
          setDiscoveryError(error.message || 'No se pudo aplicar la propuesta discovery');
        }
      } finally {
        if (mounted) {
          setIsApplyingDiscovery(false);
        }
      }
    }

    applyDiscoveryProposal();

    return () => {
      mounted = false;
    };
  }, [discoverySessionId]);

  // Fetch projects when client changes
  useEffect(() => {
      if (selectedClientId) {
        fetch(`/api/projects`).then(res => res.json()).then(data => {
        const clientProjects = (data || []).filter((p: ProjectSummary) => p.clientId === selectedClientId);
        setProjects(clientProjects);
        if (selectedProjectId && !clientProjects.some((p: ProjectSummary) => p.id === selectedProjectId)) {
          setSelectedProjectId('');
        }
      });
    } else {
      setProjects([]);
      setSelectedProjectId('');
    }
  }, [selectedClientId, selectedProjectId]);

  // Item & Chapter management
  const addItemToChapter = (chapterName: string) => {
    setItems([...items, { 
      id: Date.now().toString(), 
      description: '', 
      quantity: 1, 
      price: 0, 
      unit: 'ud', 
      chapter: chapterName 
    }]);
  };

  const addChapter = () => {
    const nextNum = chapters.length + 1;
    const newChapter = `${nextNum.toString().padStart(2, '0')} NUEVO CAPÍTULO`;
    setChapters([...chapters, newChapter]);
    setItems([...items, { 
      id: Date.now().toString(), 
      description: '', 
      quantity: 1, 
      price: 0, 
      unit: 'ud', 
      chapter: newChapter 
    }]);
  };

  const removeChapter = (chapterName: string) => {
    if (chapters.length > 1) {
      setChapters(chapters.filter(c => c !== chapterName));
      setItems(items.filter(item => item.chapter !== chapterName));
    }
  };

  const updateChapterName = (oldName: string, newName: string) => {
    setChapters(chapters.map(c => c === oldName ? newName : c));
    setItems(items.map(item => item.chapter === oldName ? { ...item, chapter: newName } : item));
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof EstimateItem, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  
  // Sync calculations when items or taxRate change
  useEffect(() => {
    const newTax = subtotal * (taxRate / 100);
    setTaxAmount(newTax);
    setTotal(subtotal + newTax);
  }, [subtotal, taxRate]);

  const handleTaxAmountChange = (val: number) => {
    setTaxAmount(val);
    setTotal(subtotal + val);
    if (subtotal !== 0) {
      setTaxRate((val / subtotal) * 100);
    }
  };

  const handleTotalChange = (val: number) => {
    setTotal(val);
    const newTax = val - subtotal;
    setTaxAmount(newTax);
    if (subtotal !== 0) {
      setTaxRate((newTax / subtotal) * 100);
    }
  };

  const handleTaxRateChange = (val: number) => {
    setTaxRate(val);
    const newTax = subtotal * (val / 100);
    setTaxAmount(newTax);
    setTotal(subtotal + newTax);
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const meaningfulItems = items.filter((item) => item.description.trim() || item.quantity > 0 || item.price > 0);
  const invalidItems = meaningfulItems.filter(
    (item) =>
      !item.description.trim() ||
      !Number.isFinite(item.quantity) ||
      item.quantity <= 0 ||
      !Number.isFinite(item.price) ||
      item.price < 0
  );
  const canSaveEstimate = Boolean(selectedClientId) && meaningfulItems.length > 0 && invalidItems.length === 0;

  const applyAutoProposal = (payload: { items: EstimateItem[]; chapters: string[]; proposal: GeneratedProposal }) => {
    setItems(payload.items);
    setChapters(payload.chapters);
    setInternalProposal(payload.proposal);
  };

  const saveEstimate = async () => {
    if (!selectedClientId) {
      alert("Por favor selecciona un cliente antes de guardar.");
      return;
    }
    if (meaningfulItems.length === 0) {
      alert("Añade al menos una partida válida antes de guardar el presupuesto.");
      return;
    }
    if (invalidItems.length > 0) {
      alert("Revisa las partidas: todas deben tener descripción, cantidad mayor que 0 y precio válido.");
      return;
    }
    setIsSaving(true);
    setSaveSuccess('');
    try {
      const estimateData = {
        number: estimateNumber,
        clientId: selectedClientId,
        subtotal,
        taxAmount,
        total,
        language,
        issueDate: issueDate || undefined,
        validUntil: validUntil || undefined,
        projectId: selectedProjectId || undefined,
        discoverySessionId: discoverySessionId || undefined,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          unit: item.unit,
          chapter: item.chapter
        })),
        internalAnalysis: internalProposal ? {
          source: internalProposal.source,
          typologyCode: internalProposal.typologyCode || null,
          seedVersion: internalProposal.seedVersion ?? null,
          notes: internalProposal.notes,
          summary: internalProposal.summary,
          lines: internalProposal.lines,
        } : undefined,
      };
      const res = await fetch('/api/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estimateData)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al guardar');
      }
      setSaveSuccess('✓ Presupuesto guardado correctamente');
      setTimeout(() => setSaveSuccess(''), 4000);
      
      const year = new Date().getFullYear();
      const currentNum = parseInt(estimateNumber.split('-').pop() || '0');
      setEstimateNumber(`PRE-${year}-${(currentNum + 1).toString().padStart(3, '0')}`);
      
    } catch (error: any) {
      alert(error.message || "Error al guardar el presupuesto.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.invoiceCreator}>
       {/* Hidden PDF Component */}
       <div ref={pdfRef} className="printable-invoice" style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <EstimatePDFTemplate data={{
          number: estimateNumber,
          issueDate: new Date().toISOString(),
          validUntil: validUntil,
          language: language,
          clientName: selectedClient?.name || '',
          clientAddress: selectedClient?.address || '',
          clientTaxId: selectedClient?.taxId || '',
          items: items,
          subtotal: subtotal,
          tax: taxAmount,
          total: total,
          brandColor: brandColor,
          companyName: settings?.companyName,
          companyAddress: settings?.companyAddress,
          companyCity: settings?.companyCity,
          companyZip: settings?.companyZip,
          companyProvince: settings?.companyProvince,
          companyTaxId: settings?.companyTaxId,
          companyLogo: settings?.companyLogo,
          logoZoom: settings?.logoZoom,
          logoX: settings?.logoX,
          logoY: settings?.logoY,
          paymentMethod: settings?.paymentMethod,
          bankAccount: settings?.bankAccount,
          dataProtection: settings?.dataProtection
        }} />
      </div>

      <div className={styles.header + " no-print"}>
        <div>
          <h1 className="text-gradient">Crear Nuevo Presupuesto</h1>
          <p className={styles.subtitle}>Genera una propuesta comercial estructurada por capítulos.</p>
        </div>
        <div className={styles.actions + " no-print"}>
          {saveSuccess && <span style={{ color: '#10b981', marginRight: '16px', fontWeight: 600 }}>{saveSuccess}</span>}
          <button 
            className={`btn-primary ${styles.saveBtn}`} 
            onClick={saveEstimate}
            disabled={isSaving || !canSaveEstimate}
          >
            {isSaving ? 'Guardando...' : '💾 Guardar Presupuesto'}
          </button>
        </div>
      </div>

      <div className={styles.contentGrid + " no-print"}>
        <div className={styles.formPanel}>
          {discoverySessionId && (
            <div className={`glass-panel ${styles.card}`} style={{ border: '1px solid rgba(59, 130, 246, 0.35)', background: 'rgba(59, 130, 246, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <h3 style={{ marginTop: 0, marginBottom: 0 }}>Propuesta llegada desde Discovery</h3>
                {discoveryEditUrl && (
                  <a href={discoveryEditUrl} className="btn-secondary" style={{ textDecoration: 'none' }}>
                    Editar datos de obra
                  </a>
                )}
              </div>
              <div style={{ display: 'grid', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                <div>
                  {isApplyingDiscovery
                    ? 'Aplicando propuesta guiada al editor...'
                    : discoverySummary?.summary?.headline?.workTypeLabel
                      ? `Perfil detectado: ${discoverySummary.summary.headline.workTypeLabel}`
                      : 'La propuesta guiada ya esta enlazada a este editor.'}
                </div>
                <div>Puedes volver al Discovery, cambiar las opciones de la obra y regenerar la estructura del presupuesto.</div>
                {discoverySummary?.warnings?.length ? (
                  <div> Avisos: {discoverySummary.warnings.map((warning) => warning.message).join(' | ')}</div>
                ) : null}
                {discoverySummary?.assumptions?.length ? (
                  <div> Supuestos: {discoverySummary.assumptions.map((assumption) => assumption.message).join(' | ')}</div>
                ) : null}
                {discoveryError ? <div style={{ color: '#fca5a5' }}>{discoveryError}</div> : null}
              </div>
            </div>
          )}

          <AutoEstimateBuilder
            onApply={({ items, chapters, proposal }) => {
              applyAutoProposal({ items, chapters, proposal });
            }}
          />

          {(!selectedClientId || meaningfulItems.length === 0 || invalidItems.length > 0 || !internalProposal) && (
            <div className={`glass-panel ${styles.card}`} style={{ border: '1px solid rgba(245, 158, 11, 0.35)', background: 'rgba(245, 158, 11, 0.08)' }}>
              <h3 style={{ marginTop: 0 }}>Checklist mínimo antes de guardar</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                <div>{selectedClientId ? '✅ Cliente seleccionado' : '⚠️ Falta seleccionar cliente'}</div>
                <div>{meaningfulItems.length > 0 ? '✅ Hay partidas cargadas' : '⚠️ Falta añadir una partida válida'}</div>
                <div>{invalidItems.length === 0 ? '✅ Partidas consistentes' : `⚠️ Hay ${invalidItems.length} partidas incompletas o inválidas`}</div>
                <div>{internalProposal ? `✅ Propuesta interna conservada (${internalProposal.source}${internalProposal.typologyCode ? ` | ${internalProposal.typologyCode}` : ''})` : 'ℹ️ Puedes guardar sin propuesta automática, pero no tendrás análisis interno generado'}</div>
              </div>
            </div>
          )}

          <div className={`glass-panel ${styles.card}`}>
            <h3>Datos del Presupuesto</h3>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Nº Presupuesto</label>
                <input 
                  type="text" 
                  className="input-modern" 
                  value={estimateNumber}
                  onChange={(e) => setEstimateNumber(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Fecha Emisión</label>
                <input 
                  type="date" 
                  className="input-modern" 
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Válido hasta</label>
                <input 
                  type="date" 
                  className="input-modern" 
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </div>
            
            <div className={styles.formRow} style={{ marginTop: '1.5rem' }}>
              <div className={styles.formGroup}>
                <label>Estado</label>
                <select className="input-modern" disabled defaultValue="DRAFT">
                  <option value="DRAFT">Borrador</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Idioma PDF</label>
                <select 
                  className="input-modern" 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="ES">Español</option>
                  <option value="CA">Català</option>
                  <option value="EN">English</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Vincular a Obra (Opcional)</label>
                <select 
                  className="input-modern" 
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={!selectedClientId}
                >
                  <option value="">-- Sin Obra --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className={styles.divider}></div>
            
            <h3>Información del Cliente</h3>
            <div className={styles.formGroup}>
              <label>Buscar Cliente</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input-modern"
                  placeholder="🔍 Buscar cliente..."
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setShowClientDropdown(true);
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                />
                {showClientDropdown && clientSearch && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                    background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto'
                  }}>
                    {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
                      <div
                        key={c.id}
                        onMouseDown={() => {
                          setSelectedClientId(c.id);
                          setClientSearch(c.name);
                          setShowClientDropdown(false);
                        }}
                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        {c.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={`glass-panel ${styles.card}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Estructura del Presupuesto (Capítulos y Partidas)</h3>
              <div className={styles.langToggle}>
                <button 
                  className={`${styles.langBtn} ${spellcheckLang === 'ES' ? styles.langBtnActive : ''}`}
                  onClick={() => setSpellcheckLang('ES')}
                >
                  ESP
                </button>
                <button 
                  className={`${styles.langBtn} ${spellcheckLang === 'CA' ? styles.langBtnActive : ''}`}
                  onClick={() => setSpellcheckLang('CA')}
                >
                  CAT
                </button>
              </div>
            </div>

            {chapters.map((chapterName) => {
              const chapterItems = items.filter(i => i.chapter === chapterName);
              const chapterTotal = chapterItems.reduce((s, i) => s + (i.quantity * i.price), 0);
              
              return (
                <div key={chapterName} style={{ marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px' }}>
                    <input 
                      className="input-modern"
                      style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--accent-primary)', flex: 1 }}
                      value={chapterName}
                      onChange={(e) => updateChapterName(chapterName, e.target.value)}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>Subtotal: {formatCurrency(chapterTotal)}</span>
                      <button 
                        onClick={() => removeChapter(chapterName)}
                        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                        title="Eliminar Capítulo"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className={styles.itemsTable}>
                    {chapterItems.map((item) => (
                      <div key={item.id} className={styles.itemRow}>
                        <div className={styles.colDesc}>
                          <textarea 
                            className="input-modern" 
                            placeholder="Descripción de la partida / concepto" 
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            spellCheck={true}
                            lang={spellcheckLang === 'ES' ? 'es' : 'ca'}
                          />
                        </div>
                        <div style={{ width: '80px' }}>
                          <input 
                            type="text" 
                            className="input-modern" 
                            placeholder="Ud."
                            value={item.unit}
                            onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                            style={{ textAlign: 'center' }}
                          />
                        </div>
                        <div className={styles.colQty}>
                          <input 
                            type="number" 
                            className="input-modern" 
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className={styles.colPrice}>
                          <input 
                            type="number" 
                            className="input-modern" 
                            value={item.price}
                            onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className={styles.colTotal}>
                          {(item.quantity * item.price).toFixed(2)} €
                        </div>
                        <div className={styles.colAction}>
                          <button className={styles.deleteBtn} onClick={() => removeItem(item.id)}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button 
                    className={styles.addBtn} 
                    style={{ marginTop: '12px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', border: '1px dashed var(--accent-primary)' }}
                    onClick={() => addItemToChapter(chapterName)}
                  >
                    + Añadir Partida a {chapterName}
                  </button>
                </div>
              );
            })}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn-primary" 
                style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
                onClick={addChapter}
              >
                📂 Nuevo Capítulo
              </button>
            </div>

            <div className={styles.divider} style={{ margin: '1.5rem 0' }}></div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px', marginLeft: 'auto' }}>
              <div className={styles.summaryRow}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Ejecución Material (Base)</span>
                <span style={{ fontWeight: 600 }}>{subtotal.toFixed(2)} €</span>
              </div>
              
              <div className={styles.summaryRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>IVA</span>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', padding: '2px 6px' }}>
                    <input 
                      type="number" 
                      value={taxRate % 1 === 0 ? taxRate : taxRate.toFixed(2)} 
                      onChange={(e) => handleTaxRateChange(parseFloat(e.target.value) || 0)}
                      style={{ width: '45px', background: 'transparent', border: 'none', color: 'white', textAlign: 'right', outline: 'none', fontSize: '13px' }}
                    />
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>%</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', padding: '2px 6px' }}>
                  <input 
                    type="number" 
                    step="0.01"
                    value={taxAmount.toFixed(2)} 
                    onChange={(e) => handleTaxAmountChange(parseFloat(e.target.value) || 0)}
                    style={{ width: '80px', background: 'transparent', border: 'none', color: 'white', textAlign: 'right', outline: 'none', fontSize: '14px' }}
                  />
                  <span style={{ marginLeft: '4px' }}>€</span>
                </div>
              </div>

              <div className={styles.divider}></div>

              <div className={styles.summaryRow} style={{ marginTop: '4px' }}>
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Total Presupuesto</span>
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '6px', padding: '6px 12px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                  <input 
                    type="number" 
                    step="0.01"
                    value={total.toFixed(2)} 
                    onChange={(e) => handleTotalChange(parseFloat(e.target.value) || 0)}
                    style={{ width: '120px', background: 'transparent', border: 'none', fontWeight: 800, textAlign: 'right', outline: 'none', fontSize: '24px', color: 'white' }}
                  />
                  <span className="text-gradient" style={{ marginLeft: '6px', fontWeight: 800, fontSize: '24px' }}>€</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.summaryPanel}>
          <div className={`glass-panel ${styles.summaryCard}`}>
            <h3>Resumen Rápido</h3>
            <div className={styles.summaryRow}>
              <span>Material</span>
              <span>{subtotal.toFixed(2)} €</span>
            </div>
            <div className={styles.summaryRow}>
              <span>IVA ({taxRate.toFixed(0)}%)</span>
              <span>{taxAmount.toFixed(2)} €</span>
            </div>
            <div className={styles.divider}></div>
            <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
              <span>Total</span>
              <span className="text-gradient">{total.toFixed(2)} €</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
