/**
 * Formats a number as a currency string (EUR) with consistent 2-decimal precision.
 * Format: 1.234,56 €
 */
export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '0,00 €';
  
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Formats a number as a percentage string with 1 decimal precision.
 * Format: 45.2%
 */
export const formatPercentage = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '0,0%';
  return `${value.toFixed(1)}%`;
};
