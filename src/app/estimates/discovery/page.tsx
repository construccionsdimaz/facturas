"use client";

import { Suspense } from 'react';
import DiscoveryWizard from './DiscoveryWizard';

export default function DiscoveryEstimatePage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px' }}>Cargando discovery...</div>}>
      <DiscoveryWizard />
    </Suspense>
  );
}
