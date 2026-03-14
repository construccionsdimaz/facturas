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
      alert('Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.settingsPage}>
        <div className={styles.header}>
            <h1 className="text-gradient">Company Settings</h1>
            <p className="loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.settingsPage}>
      <div className={styles.header}>
        <div>
          <h1 className="text-gradient">Company Settings</h1>
          <p className={styles.subtitle}>Customize your brand details for the invoices.</p>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.sidebarSection}>
          <ul className={styles.settingsNav}>
            <li className={styles.active}>Company Profile</li>
            <li className={styles.disabled}>Billing & Plans 🔒</li>
            <li className={styles.disabled}>Team Members 🔒</li>
            <li className={styles.disabled}>Integrations 🔒</li>
          </ul>
        </div>

        <div className={styles.mainSection}>
          <div className={`glass-panel ${styles.panel}`}>
            <h2 className={styles.panelTitle}>Company Profile</h2>
            <p className={styles.panelDesc}>These details will appear on the header of all your generated PDF invoices.</p>
            
            <form onSubmit={handleSave} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Company/Brand Name</label>
                <input 
                  type="text" 
                  className="input-modern"
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  placeholder="Next-Gen Solutions"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Tax ID (CIF/NIF/EIN)</label>
                <input 
                  type="text" 
                  className="input-modern"
                  value={formData.companyTaxId}
                  onChange={(e) => setFormData({...formData, companyTaxId: e.target.value})}
                  placeholder="B-12345678"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Registered Address</label>
                <textarea 
                  className={`input-modern ${styles.textarea}`}
                  value={formData.companyAddress}
                  onChange={(e) => setFormData({...formData, companyAddress: e.target.value})}
                  placeholder="123 Innovation Drive&#10;Tech City, TC 90210&#10;contact@nextgen.inc"
                  rows={4}
                />
              </div>

              <div className={styles.formActions}>
                {showSuccess && <span className={styles.successMsg}>✓ Profile saved successfully!</span>}
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
