'use client';

import React, { useState, useEffect } from 'react';
import { setConsentCookie, getInitialConsentState, ConsentPreferences }_from '@/lib/cookieUtils';

interface CookiePreferenceCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const CookiePreferenceCenter: React.FC<CookiePreferenceCenterProps> = ({ isOpen, onClose }) => {
  const [preferences, setPreferences] = useState<ConsentPreferences>(getInitialConsentState());

  useEffect(() => {
    // When the modal opens, re-initialize state from cookies in case it changed elsewhere
    if (isOpen) {
      setPreferences(getInitialConsentState());
    }
  }, [isOpen]);

  const handleToggle = (category: keyof ConsentPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleSavePreferences = () => {
    setConsentCookie(preferences);
    onClose();
    // Optionally, trigger a page reload or event to load/unload scripts based on new consent
    window.dispatchEvent(new CustomEvent('consentChanged', { detail: preferences }));
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#e0e0e0' }}>Cookie Preferences</h2>
        
        <p style={{ fontSize: '14px', color: '#b0b0b0', marginBottom: '20px' }}>
          Manage your cookie preferences below. Changes will be saved when you click "Save Preferences".
          For more details, please see our <a href="/cookie-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#61dafb' }}>Cookie Policy</a>.
        </p>

        <div style={categoryStyle}>
          <h3 style={categoryHeaderStyle}>Essential Cookies</h3>
          <p style={categoryDescriptionStyle}>
            These cookies are necessary for the website to function and cannot be switched off in our systems.
            They are usually only set in response to actions made by you which amount to a request for services,
            such as setting your privacy preferences, logging in or filling in forms.
          </p>
          <button style={{ ...toggleButtonStyle, backgroundColor: '#555', cursor: 'not-allowed', color: '#aaa' }} disabled>
            Always Active
          </button>
        </div>

        <div style={categoryStyle}>
          <h3 style={categoryHeaderStyle}>Analytics Cookies</h3>
          <p style={categoryDescriptionStyle}>
            These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site.
            They help us to know which pages are the most and least popular and see how visitors move around the site.
            All information these cookies collect is aggregated and therefore anonymous.
          </p>
          <button 
            onClick={() => handleToggle('analytics')} 
            style={{...toggleButtonStyle, backgroundColor: preferences.analytics ? '#61dafb' : '#4a4f58' }}>
            {preferences.analytics ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <div style={categoryStyle}>
          <h3 style={categoryHeaderStyle}>Functional Cookies</h3>
          <p style={categoryDescriptionStyle}>
            These cookies enable the website to provide enhanced functionality and personalisation.
            They may be set by us or by third party providers whose services we have added to our pages.
            If you do not allow these cookies then some or all ofthese services may not function properly.
          </p>
          <button 
            onClick={() => handleToggle('functional')} 
            style={{...toggleButtonStyle, backgroundColor: preferences.functional ? '#61dafb' : '#4a4f58' }}>
            {preferences.functional ? 'Enabled' : 'Disabled'}
          </button>
        </div>
        
        {/* Add Marketing category here if/when needed */}

        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={secondaryButtonStyle}>Cancel</button>
          <button onClick={handleSavePreferences} style={primaryButtonStyle}>Save Preferences</button>
        </div>
      </div>
    </div>
  );
};

// Styles (similar to CookieConsentBanner for consistency, but adapted for modal)
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1001, // Higher than banner
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#2c2f36', // Dark modal background
  color: '#fff',
  padding: '30px',
  borderRadius: '8px',
  width: '90%',
  maxWidth: '600px',
  boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
  maxHeight: '80vh',
  overflowY: 'auto',
};

const categoryStyle: React.CSSProperties = {
  marginBottom: '20px',
  paddingBottom: '15px',
  borderBottom: '1px solid #4a4f58',
};
const categoryHeaderStyle: React.CSSProperties = {
    fontSize: '18px',
    color: '#61dafb', // Accent color for headers
    marginBottom: '8px',
};
const categoryDescriptionStyle: React.CSSProperties = {
    fontSize: '13px',
    lineHeight: '1.5',
    color: '#d0d0d0',
    marginBottom: '10px',
};

const toggleButtonStyle: React.CSSProperties = {
  color: '#fff',
  border: 'none',
  padding: '8px 15px',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '14px',
  minWidth: '100px',
  textAlign: 'center',
};

const primaryButtonStyle: React.CSSProperties = {
  backgroundColor: '#61dafb',
  color: '#23272f',
  border: 'none',
  padding: '12px 25px',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '15px',
  fontWeight: 'bold',
};

const secondaryButtonStyle: React.CSSProperties = {
  backgroundColor: '#4a4f58',
  color: '#fff',
  border: '1px solid #61dafb',
  padding: '12px 25px',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '15px',
};

export default CookiePreferenceCenter;
