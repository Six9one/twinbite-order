import { useEffect } from 'react';

/**
 * Umami Analytics Tracker Component
 * 
 * To use:
 * Add VITE_UMAMI_WEBSITE_ID="your-website-uuid" to your .env file.
 * Optionally set VITE_UMAMI_SCRIPT_URL if you use a self-hosted instance (defaults to Umami Cloud).
 */
export function UmamiTracker() {
  useEffect(() => {
    const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID;
    const scriptUrl = import.meta.env.VITE_UMAMI_SCRIPT_URL || 'https://cloud.umami.is/script.js';

    if (websiteId) {
      // Prevent duplicate script injection
      const existingScript = document.querySelector(`script[data-website-id="${websiteId}"]`);
      if (!existingScript) {
        const script = document.createElement('script');
        script.async = true;
        script.src = scriptUrl;
        script.setAttribute('data-website-id', websiteId);
        
        // Exclude localhost from tracking by default, or limit to your production domains
        // E.g. data-domains="twinpizza.fr"
        const domains = import.meta.env.VITE_UMAMI_DOMAINS;
        if (domains) {
          script.setAttribute('data-domains', domains);
        }

        document.head.appendChild(script);
      }
    }
  }, []);

  return null;
}
