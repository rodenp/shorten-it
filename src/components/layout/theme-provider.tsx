
'use client';

import { useEffect } from 'react';

// This component is responsible for setting the initial theme based on localStorage or system preference
// to avoid FOUC (Flash Of Unstyled Content). It should be rendered high in the component tree.
export function ThemeProvider() {
  useEffect(() => {
    const applyInitialTheme = () => {
      const storedTheme = localStorage.getItem('linkwiz-theme');
      const root = document.documentElement;
      root.classList.remove('light', 'dark'); // Clear any server-rendered classes if they differ

      let currentTheme;
      if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark')) {
        currentTheme = storedTheme;
      } else { // 'system' or null/invalid
        currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        if (!storedTheme) { // If no theme was stored, default to system and save it
            localStorage.setItem('linkwiz-theme', 'system');
        }
      }
      root.classList.add(currentTheme);

      const storedCompactMode = localStorage.getItem('linkwiz-compactMode');
      if (storedCompactMode) {
        const compact = JSON.parse(storedCompactMode);
        if (compact) {
          root.classList.add('compact-mode');
        } else {
          root.classList.remove('compact-mode');
        }
      }
    };

    applyInitialTheme();

    // Optional: Listen for storage changes from other tabs, though AppearanceSettings also handles this.
    // window.addEventListener('storage', applyInitialTheme);
    // return () => window.removeEventListener('storage', applyInitialTheme);
  }, []);

  return null; // This component does not render anything itself
}
