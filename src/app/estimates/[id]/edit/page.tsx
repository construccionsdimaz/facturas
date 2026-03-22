"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from '@/app/invoices/new/page.module.css';
import { formatCurrency } from '@/lib/format';
import { mapProposalToEstimateDraft, type Proposal as GeneratedProposal } from '@/app/estimates/new/AutoEstimateBuilder';
import { materializeEstimateOperationalView } from '@/lib/estimate/estimate-runtime-materialization';

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

export default function EditEstimatePage() {
  const router = useRouter();
  const params = useParams();
  const estimateId = params.id as string;

  const [items, setItems] = useState<EstimateItem[]>([]);
  const [chapters, setChapters] = useState<string[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [estimateNumber, setEstimateNumber] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [language, setLanguage] = useState('ES');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [spellcheckLang, setSpellcheckLang] = useState('ES');
  const [discoverySessionId, setDiscoverySessionId] = useState('');
  const [linkedProjectId, setLinkedProjectId] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  const [taxRate, setTaxRate] = useState(21);
  const [taxAmount, setTaxAmount] = useState(0);
  const [total, setTotal] = useState(0);

  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  useEffect(() => {
    if (!estimateId) return;

    Promise.all([
      fetch(`/api/estimates/${estimateId}`).then((r) => r.json()),
      fetch('/api/clients').then((r) => r.json()),
    ]).then(([estimate, clientsData]) => {
      setEstimateNumber(estimate.number);
      setSelectedClientId(estimate.clientId);
      setClientSearch(estimate.client?.name || '');
      setValidUntil(estimate.validUntil ? estimate.validUntil.split('T')[0] : '');
      setStatus(estimate.status);
      setDiscoverySessionId(estimate.discoverySessionId || '');
      setLinkedProjectId(estimate.projectId || '');
      if (estimate.language) setLanguage(estimate.language);

      const operational = materializeEstimateOperationalView({
        commercialRuntimeOutput: estimate.commercialRuntimeOutput,
        commercialEstimateProjection: estimate.commercialEstimateProjection,
        estimateStatus: estimate.commercialReadModel?.commercialRuntimeOutput?.status || null,
        legacyItems: estimate.items.map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          unit: item.unit || 'ud',
          chapter: item.chapter || '01 GENERAL',
        })),
      });

      const loadedItems = operational.legacyItems.map((item: any, index: number) => ({
        id: `${estimateId}-${index + 1}`,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        unit: item.unit || 'ud',
        chapter: item.chapter || '01 GENERAL',
      }));
      setItems(loadedItems);

      const uniqueChapters = operational.chapters.length
        ? operational.chapters
        : (Array.from(new Set(loadedItems.map((i: any) => i.chapter))) as string[]);
      if (uniqueChapters.length === 0) uniqueChapters.push('01 GENERAL');
      setChapters(uniqueChapters.sort());

      if (estimate.taxAmount !== undefined) setTaxAmount(estimate.taxAmount);
      if (estimate.total !== undefined) setTotal(estimate.total);
      if (estimate.subtotal > 0 && estimate.taxAmount !== undefined) {
        setTaxRate((estimate.taxAmount / estimate.subtotal) * 100);
      }
      setClients(clientsData || []);
      setIsLoading(false);
    });
  }, [estimateId]);

  const addItemToChapter = (chapterName: string) => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        description: '',
        quantity: 1,
        price: 0,
        unit: 'ud',
        chapter: chapterName,
      },
    ]);
  };

  const addChapter = () => {
    const nextNum = chapters.length + 1;
    const newChapter = `${nextNum.toString().padStart(2, '0')} NUEVO CAPITULO`;
    setChapters([...chapters, newChapter]);
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        description: '',
        quantity: 1,
        price: 0,
        unit: 'ud',
        chapter: newChapter,
      },
    ]);
  };

  const removeChapter = (chapterName: string) => {
    if (chapters.length > 1) {
      setChapters(chapters.filter((c) => c !== chapterName));
      setItems(items.filter((item) => item.chapter !== chapterName));
    }
  };

  const updateChapterName = (oldName: string, newName: string) => {
    setChapters(chapters.map((c) => (c === oldName ? newName : c)));
    setItems(items.map((item) => (item.chapter === oldName ? { ...item, chapter: newName } : item)));
  };

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof EstimateItem, value: string | number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  useEffect(() => {
    const newTax = subtotal * (taxRate / 100);
    setTaxAmount(newTax);
    setTotal(subtotal + newTax);
  }, [subtotal, taxRate]);

  const handleTaxAmountChange = (val: number) => {
    setTaxAmount(val);
    setTotal(subtotal + val);
    if (subtotal !== 0) setTaxRate((val / subtotal) * 100);
  };

  const handleTotalChange = (val: number) => {
    setTotal(val);
    const newTax = val - subtotal;
    setTaxAmount(newTax);
    if (subtotal !== 0) setTaxRate((newTax / subtotal) * 100);
  };

  const handleTaxRateChange = (val: number) => {
    setTaxRate(val);
    const newTax = subtotal * (val / 100);
    setTaxAmount(newTax);
    setTotal(subtotal + newTax);
  };

  const handleSave = async () => {
    if (!selectedClientId) {
      alert('Por favor selecciona un cliente.');
      return;
    }
    setIsSaving(true);
    setSaveSuccess('');
    try {
      const res = await fetch(`/api/estimates/${estimateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: estimateNumber,
          clientId: selectedClientId,
          subtotal,
          taxAmount,
          total,
          status,
          validUntil: validUntil || null,
          language,
          discoverySessionId: discoverySessionId || null,
          items: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            unit: item.unit,
            chapter: item.chapter,
          })),
        }),
      });
      if (!res.ok) throw new Error('Error');
      setSaveSuccess('✓ Presupuesto actualizado correctamente');
      setTimeout(() => {
        router.push(`/estimates/${estimateId}`);
      }, 1500);
    } catch {
      alert('Error al guardar el presupuesto.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateFromDiscovery = async () => {
    if (!discoverySessionId) return;
    setIsRegenerating(true);
    setSaveSuccess('');
    try {
      const res = await fetch(`/api/discovery/sessions/${discoverySessionId}/generate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo regenerar la propuesta');

      const proposal = data.proposal as GeneratedProposal;
      const mapped = mapProposalToEstimateDraft(proposal);
      setItems(mapped.items);
      setChapters(mapped.chapters);
      setSaveSuccess('✓ Estructura regenerada desde Discovery. Guarda para confirmar los cambios.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      alert(error.message || 'No se pudo regenerar la estructura desde Discovery');
    } finally {
      setIsRegenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', color: 'var(--text-secondary)' }}>
        Cargando presupuesto...
      </div>
    );
  }

  return (
    <div className={styles.invoiceCreator}>
      <div className={styles.header}>
        <div>
          <button onClick={() => router.push(`/estimates/${estimateId}`)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '14px', display: 'block', marginBottom: '8px', cursor: 'pointer' }}>
            ← Volver al presupuesto
          </button>
          <h1 className="text-gradient">Editar Presupuesto {estimateNumber}</h1>
          <p className={styles.subtitle}>Modifica los datos y estructura de capitulos.</p>
        </div>
        <div className={styles.actions}>
          {saveSuccess && <span style={{ color: '#10b981', marginRight: '16px', fontWeight: 600 }}>{saveSuccess}</span>}
          {discoverySessionId && (
            <a
              href={`/estimates/discovery?sessionId=${discoverySessionId}${linkedProjectId ? `&projectId=${linkedProjectId}` : ''}`}
              className="btn-secondary"
              style={{ marginRight: '12px', textDecoration: 'none' }}
            >
              Editar datos de obra
            </a>
          )}
          {discoverySessionId && (
            <button className="btn-secondary" onClick={handleRegenerateFromDiscovery} style={{ marginRight: '12px' }} disabled={isRegenerating}>
              {isRegenerating ? 'Regenerando...' : 'Regenerar estructura'}
            </button>
          )}
          <button className="btn-secondary" onClick={() => router.push(`/estimates/${estimateId}`)} style={{ marginRight: '12px' }}>
            Cancelar
          </button>
          <button className={`btn-primary ${styles.saveBtn}`} onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Guardando...' : '💾 Guardar Cambios'}
          </button>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.formPanel}>
          {discoverySessionId && (
            <div className={`glass-panel ${styles.card}`} style={{ border: '1px solid rgba(59, 130, 246, 0.35)', background: 'rgba(59, 130, 246, 0.08)' }}>
              <h3>Presupuesto vinculado a Discovery</h3>
              <div style={{ display: 'grid', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                <div>Puedes volver a editar los datos de la obra y regenerar la estructura del presupuesto desde la misma sesion guiada.</div>
                <div>Si este presupuesto venia de un fallback antiguo, usa "Regenerar estructura" y luego guarda.</div>
              </div>
            </div>
          )}

          <div className={`glass-panel ${styles.card}`}>
            <h3>Datos del Presupuesto</h3>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Nº Presupuesto</label>
                <input type="text" className="input-modern" value={estimateNumber} onChange={(e) => setEstimateNumber(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label>Fecha Emision</label>
                <input type="date" className="input-modern" disabled defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
              <div className={styles.formGroup}>
                <label>Valido hasta</label>
                <input type="date" className="input-modern" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
            </div>

            <div className={styles.formRow} style={{ marginTop: '1.5rem' }}>
              <div className={styles.formGroup}>
                <label>Estado</label>
                <select className="input-modern" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="DRAFT">Borrador</option>
                  <option value="SENT">Enviado</option>
                  <option value="ACCEPTED">Aceptado</option>
                  <option value="REJECTED">Rechazado</option>
                  <option value="CONVERTED" disabled>Convertido</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Idioma PDF</label>
                <select className="input-modern" value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="ES">Español</option>
                  <option value="CA">Català</option>
                  <option value="EN">English</option>
                </select>
              </div>
              <div className={styles.formGroup}></div>
            </div>
          </div>

          <div className={`glass-panel ${styles.card}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Estructura del Presupuesto</h3>
              <div className={styles.langToggle}>
                <button className={`${styles.langBtn} ${spellcheckLang === 'ES' ? styles.langBtnActive : ''}`} onClick={() => setSpellcheckLang('ES')}>
                  ESP
                </button>
                <button className={`${styles.langBtn} ${spellcheckLang === 'CA' ? styles.langBtnActive : ''}`} onClick={() => setSpellcheckLang('CA')}>
                  CAT
                </button>
              </div>
            </div>

            {chapters.map((chapterName) => {
              const chapterItems = items.filter((i) => i.chapter === chapterName);
              const chapterTotal = chapterItems.reduce((s, i) => s + i.quantity * i.price, 0);

              return (
                <div key={chapterName} style={{ marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px' }}>
                    <input className="input-modern" style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--accent-primary)', flex: 1 }} value={chapterName} onChange={(e) => updateChapterName(chapterName, e.target.value)} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>Subtotal: {formatCurrency(chapterTotal)}</span>
                      <button onClick={() => removeChapter(chapterName)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className={styles.itemsTable}>
                    {chapterItems.map((item) => (
                      <div key={item.id} className={styles.itemRow}>
                        <div className={styles.colDesc}>
                          <textarea className="input-modern" placeholder="Descripcion" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} spellCheck lang={spellcheckLang === 'ES' ? 'es' : 'ca'} />
                        </div>
                        <div style={{ width: '80px' }}>
                          <input type="text" className="input-modern" placeholder="Ud." value={item.unit} onChange={(e) => updateItem(item.id, 'unit', e.target.value)} style={{ textAlign: 'center' }} />
                        </div>
                        <div className={styles.colQty}>
                          <input type="number" className="input-modern" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className={styles.colPrice}>
                          <input type="number" className="input-modern" value={item.price} onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className={styles.colAction}>
                          <button className={styles.deleteBtn} onClick={() => removeItem(item.id)}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className={styles.addBtn} style={{ marginTop: '12px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', border: '1px dashed var(--accent-primary)' }} onClick={() => addItemToChapter(chapterName)}>
                    + Añadir Partida a {chapterName}
                  </button>
                </div>
              );
            })}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-primary" style={{ flex: 1, padding: '12px' }} onClick={addChapter}>
                📂 Nuevo Capítulo
              </button>
            </div>

            <div className={styles.divider} style={{ margin: '1.5rem 0' }}></div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px', marginLeft: 'auto' }}>
              <div className={styles.summaryRow}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Ejecucion Material (Base)</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
              </div>

              <div className={styles.summaryRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>IVA</span>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', padding: '2px 6px' }}>
                    <input type="number" value={taxRate % 1 === 0 ? taxRate : taxRate.toFixed(2)} onChange={(e) => handleTaxRateChange(parseFloat(e.target.value) || 0)} style={{ width: '45px', background: 'transparent', border: 'none', color: 'white', textAlign: 'right', outline: 'none', fontSize: '13px' }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>%</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', padding: '2px 6px' }}>
                  <input type="number" step="0.01" value={taxAmount.toFixed(2)} onChange={(e) => handleTaxAmountChange(parseFloat(e.target.value) || 0)} style={{ width: '80px', background: 'transparent', border: 'none', color: 'white', textAlign: 'right', outline: 'none', fontSize: '14px' }} />
                  <span style={{ marginLeft: '4px' }}>€</span>
                </div>
              </div>

              <div className={styles.divider}></div>

              <div className={styles.summaryRow} style={{ marginTop: '4px' }}>
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Total Presupuesto</span>
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '6px', padding: '6px 12px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                  <input type="number" step="0.01" value={total.toFixed(2)} onChange={(e) => handleTotalChange(parseFloat(e.target.value) || 0)} style={{ width: '120px', background: 'transparent', border: 'none', fontWeight: 800, textAlign: 'right', outline: 'none', fontSize: '24px', color: 'white' }} />
                  <span className="text-gradient" style={{ marginLeft: '6px', fontWeight: 800, fontSize: '24px' }}>€</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.summaryPanel}>
          <div className={`glass-panel ${styles.summaryCard}`}>
            <h3>Resumen Rapido</h3>
            <div className={styles.summaryRow}>
              <span>Material</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>IVA ({taxRate.toFixed(0)}%)</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div className={styles.divider}></div>
            <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
              <span>Total</span>
              <span className="text-gradient">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
