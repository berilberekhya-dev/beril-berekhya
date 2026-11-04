import type { AnalyticsAdapter } from './consent';

type GoogleWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; [key: `ga-disable-${string}`]: boolean | undefined };

export function clearAnalyticsCookies() {
  const names = document.cookie.split(';').map(cookie => cookie.trim().split('=')[0]).filter(name => /^_ga(?:_|$)/.test(name));
  // The integration explicitly uses host-only cookies and the root path.
  for (const name of names) {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${window.location.hostname}; SameSite=Lax`;
  }
}

export function browserAnalyticsAdapter(): AnalyticsAdapter {
  const target = window as unknown as GoogleWindow;
  return {
    initialize(id, origin) {
      target[`ga-disable-${id}`] = false;
      target.dataLayer = target.dataLayer || [];
      target.gtag = function () { target.dataLayer!.push(arguments); };
      const denied = { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };
      target.gtag('consent', 'default', denied);
      target.gtag('consent', 'update', { ...denied, analytics_storage: 'granted' });
      target.gtag('js', new Date());
      let referrer = '';
      try { referrer = document.referrer ? new URL(document.referrer).origin : ''; } catch { /* Omit malformed referrers. */ }
      target.gtag('config', id, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        cookie_domain: 'none',
        cookie_path: '/',
        cookie_expires: 180 * 24 * 60 * 60,
        cookie_update: false,
        cookie_flags: 'SameSite=Lax;Secure',
        page_location: origin,
        page_referrer: referrer,
      });
    },
    load(id) {
      if (document.getElementById('beril-google-analytics')) return;
      const script = document.createElement('script');
      script.id = 'beril-google-analytics';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      script.dataset.analyticsProvider = 'ga4';
      document.head.appendChild(script);
    },
    send(name, parameters) { target.gtag?.('event', name, parameters); },
    disable(id) {
      target[`ga-disable-${id}`] = true;
      document.getElementById('beril-google-analytics')?.remove();
      target.dataLayer = [];
      target.gtag = undefined;
      clearAnalyticsCookies();
      // Do not issue a denied-consent ping. A reload removes the loaded tag runtime.
    },
  };
}
