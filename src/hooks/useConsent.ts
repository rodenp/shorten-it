'use client';

import { useState, useEffect, useCallback } from 'react';
import { getInitialConsentState, setConsentCookie, ConsentPreferences } from '@/lib/cookieUtils';
import MockAnalytics from '@/lib/mockAnalytics'; // Assuming this is our mock or real analytics service

export type ConsentCategory = keyof ConsentPreferences;

const useConsent = () => {
  const [consent, setConsent] = useState<ConsentPreferences>(() => getInitialConsentState());
  const [isConsentInitialized, setIsConsentInitialized] = useState(false);

  // Initialize consent from cookie on mount
  useEffect(() => {
    const initialConsent = getInitialConsentState();
    setConsent(initialConsent);
    setIsConsentInitialized(true);
  }, []);

  // Effect to initialize/reset analytics when consent changes or on initial load
  useEffect(() => {
    if (!isConsentInitialized) return; // Don't run until consent is loaded from cookie

    if (consent.analytics) {
      if (!MockAnalytics.isLoaded()) {
        console.log("useConsent: Analytics consent given. Initializing MockAnalytics.");
        MockAnalytics.init({ apiKey: 'MOCK_API_KEY_IF_NEEDED' });
        // For Google Analytics, you might call a gtag('consent', 'update', { 'analytics_storage': 'granted' })
        // or load the GA script here if not already handled by a Tag Manager with consent mode.
      }
    } else {
      if (MockAnalytics.isLoaded()) {
        console.log("useConsent: Analytics consent revoked/not given. Resetting MockAnalytics.");
        MockAnalytics.reset(); // If your analytics tool has a way to stop tracking or de-initialize
        // For Google Analytics, gtag('consent', 'update', { 'analytics_storage': 'denied' })
      }
    }
    // Similar logic for 'functional' scripts if any
    // if (consent.functional) { /* load functional scripts */ } else { /* unload/disable functional scripts */ }

  }, [consent, isConsentInitialized]);


  const updateConsent = useCallback((newPreferences: Partial<ConsentPreferences>) => {
    setConsent(prev => {
      const updated = { ...prev, ...newPreferences };
      setConsentCookie(updated);
      return updated;
    });
    // The 'consentChanged' event can be listened to by other parts of the app,
    // e.g., a top-level component that manages script tags dynamically.
    window.dispatchEvent(new CustomEvent('consentChanged', { detail: { ...consent, ...newPreferences } }));
  }, [consent]);

  const grantConsent = useCallback((category: ConsentCategory) => {
    updateConsent({ [category]: true });
  }, [updateConsent]);

  const revokeConsent = useCallback((category: ConsentCategory) => {
    updateConsent({ [category]: false });
  }, [updateConsent]);
  
  const setFullConsent = useCallback((preferences: ConsentPreferences) => {
    setConsent(preferences);
    setConsentCookie(preferences);
    window.dispatchEvent(new CustomEvent('consentChanged', { detail: preferences }));
  }, []);

  const isCategoryConsented = useCallback((category: ConsentCategory): boolean => {
    return !!consent[category];
  }, [consent]);

  return {
    consent,
    isConsentInitialized,
    grantConsent,
    revokeConsent,
    updateConsent, // For more granular updates if needed by preference center
    setFullConsent, // For "Accept All" / "Reject All" type actions
    isCategoryConsented,
  };
};

export default useConsent;
