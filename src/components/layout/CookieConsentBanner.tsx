'use client';

import React, { useState, useEffect } from 'react';
import { setConsentCookie, getConsentCookie, ConsentPreferences } from '@/lib/cookieUtils';

interface CookieConsentBannerProps {
  onManagePreferences: () => void; // Callback to open the preference center modal
}

const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ onManagePreferences }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = getConsentCookie();
    // Show banner if no consent cookie exists or if it's a "default" state (e.g., all false)
    // This logic might need refinement based on how "explicitly given" is defined.
    // For now, if a cookie exists (meaning user made a choice), we don't show the banner.
    // A more robust check might involve a specific flag in the cookie like `consentGiven: true`.
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const preferences: ConsentPreferences = {
      analytics: true,
      functional: true,
      // marketing: true, // If marketing cookies were an option
    };
    setConsentCookie(preferences);
    setIsVisible(false);
    // Optionally, trigger a page reload or event to load newly consented scripts
    window.dispatchEvent(new CustomEvent('consentChanged', { detail: preferences }));
  };

  const handleRejectAll = () => {
    const preferences: ConsentPreferences = {
      analytics: false,
      functional: false,
      // marketing: false,
    };
    setConsentCookie(preferences); // Still set the cookie to remember the "rejected all" choice
    setIsVisible(false);
    window.dispatchEvent(new CustomEvent('consentChanged', { detail: preferences }));
  };

  const handleManagePreferences = () => {
    setIsVisible(false); // Hide banner when opening modal
    onManagePreferences();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#23272f', // Dark background
      color: '#fff', // White text
      padding: '20px',
      boxShadow: '0 -2px 10px rgba(0,0,0,0.2)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
    }}>
      <p style={{ margin: '0 0 15px 0', fontSize: '16px' }}>
        We use cookies to enhance your experience, analyze site traffic, and for other purposes. 
        For more information, please see our{' '}
        <a href="/cookie-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#61dafb' }}>Cookie Policy</a> and{' '}
        <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#61dafb' }}>Privacy Policy</a>.
      </p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button 
          onClick={handleAcceptAll} 
          style={buttonStyle}>
          Accept All
        </button>
        <button 
          onClick={handleRejectAll} 
          style={buttonStyleSecondary}>
          Reject All (Non-Essential)
        </button>
        <button 
          onClick={handleManagePreferences} 
          style={buttonStyleSecondary}>
          Manage Preferences
        </button>
      </div>
    </div>
  );
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: '#61dafb', // Primary action color
  color: '#23272f',
  border: 'none',
  padding: '10px 20px',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 'bold',
};

const buttonStyleSecondary: React.CSSProperties = {
  backgroundColor: '#4a4f58', // Secondary action color
  color: '#fff',
  border: '1px solid #61dafb',
  padding: '10px 20px',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '14px',
};

export default CookieConsentBanner;
