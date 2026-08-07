import React, { Suspense } from 'react';
import { SetupWizardClient } from '@/components/restaurant-os/provisioning/SetupWizardClient';

interface PageProps {
  searchParams: Promise<{ restaurantId?: string }>;
}

export default async function SetupWizardPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  // Default to Demo Restaurant ID if no query param provided
  const restaurantId = resolvedParams.restaurantId || 'a3c3e5f7-36e7-4409-8a25-76e4f7f47213';

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Loading Setup Wizard Engine...</p>
        </div>
      </div>
    }>
      <SetupWizardClient restaurantId={restaurantId} />
    </Suspense>
  );
}
