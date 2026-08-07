'use client';

import React, { useEffect } from 'react';
import { useSetupWizardStore } from '@/lib/stores/useSetupWizardStore';
import { SetupWizardHeader } from './SetupWizardHeader';
import { SetupWizardSidebar } from './SetupWizardSidebar';
import { SetupWizardFooter } from './SetupWizardFooter';

import { Step1Identity } from './steps/Step1Identity';
import { Step2BusinessInfo } from './steps/Step2BusinessInfo';
import { Step3OperatingHours } from './steps/Step3OperatingHours';
import { Step4FloorBlueprint } from './steps/Step4FloorBlueprint';
import { Step5TaxSettings } from './steps/Step5TaxSettings';
import { Step6OwnerPin } from './steps/Step6OwnerPin';
import { Step7SampleData } from './steps/Step7SampleData';
import { Step8Verification } from './steps/Step8Verification';

interface SetupWizardClientProps {
  restaurantId: string;
}

export const SetupWizardClient: React.FC<SetupWizardClientProps> = ({ restaurantId }) => {
  const { currentStep, initWizard, setOfflineStatus } = useSetupWizardStore();

  useEffect(() => {
    if (restaurantId) {
      initWizard(restaurantId);
    }
  }, [restaurantId]);

  // Online / Offline Detection
  useEffect(() => {
    const handleOnline = () => setOfflineStatus(false);
    const handleOffline = () => setOfflineStatus(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Identity />;
      case 2:
        return <Step2BusinessInfo />;
      case 3:
        return <Step3OperatingHours />;
      case 4:
        return <Step4FloorBlueprint />;
      case 5:
        return <Step5TaxSettings />;
      case 6:
        return <Step6OwnerPin />;
      case 7:
        return <Step7SampleData />;
      case 8:
        return <Step8Verification />;
      default:
        return <Step1Identity />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Header */}
      <SetupWizardHeader />

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto">
        {/* Left Sidebar Stepper */}
        <SetupWizardSidebar />

        {/* Content Area */}
        <main className="flex-1 p-6 lg:p-10 flex flex-col justify-between overflow-y-auto">
          <div className="max-w-4xl w-full mx-auto">{renderCurrentStep()}</div>
        </main>
      </div>

      {/* Sticky Bottom Footer */}
      <SetupWizardFooter />
    </div>
  );
};
