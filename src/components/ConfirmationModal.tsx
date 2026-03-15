"use client";

import styles from './ConfirmationModal.module.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'info' | 'warning';
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  type = 'danger'
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={`glass-panel ${styles.modal} ${styles[type]}`}>
        <div className={styles.header}>
          <h3>{title}</h3>
          <button className={styles.closeBtn} onClick={onCancel}>×</button>
        </div>
        <div className={styles.body}>
          <p>{message}</p>
        </div>
        <div className={styles.actions}>
          <button className="btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button 
            className={type === 'danger' ? 'btn-primary' : 'btn-primary'} 
            style={type === 'danger' ? { backgroundColor: '#ff4444' } : undefined}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
