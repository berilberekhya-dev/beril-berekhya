'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  CONSENT_KEY, analyticsEligibility, classifyAnalyticsLink, createAnalyticsController,
  createConsent, parseConsent, type ConsentRecord, type PublicAnalyticsConfig,
} from '@/lib/consent';
import { browserAnalyticsAdapter } from '@/lib/analytics-browser';
import s from './PrivacyProvider.module.css';

const PrivacyContext = createContext<{ openSettings: () => void }>({ openSettings: () => {} });

export function CookieSettingsButton({ className }: { className?: string }) {
  const { openSettings } = useContext(PrivacyContext);
  return <button type="button" className={className} onClick={openSettings}>Cookie settings</button>;
}

type Controller = ReturnType<typeof createAnalyticsController>;

export function PrivacyProvider({ children, config }: { children: React.ReactNode; config: PublicAnalyticsConfig }) {
  const pathname = usePathname();
  const currentPath = useRef(pathname);
  currentPath.current = pathname;
  const controller = useRef<Controller | null>(null);
  const [ready, setReady] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [consent, setConsent] = useState<ConsentRecord | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftAnalytics, setDraftAnalytics] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const close = useRef<HTMLButtonElement>(null);

  const openSettings = useCallback(() => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    requestAnimationFrame(() => opener.current?.isConnected && opener.current.focus());
  }, []);

  useEffect(() => {
    const eligibility = analyticsEligibility(config, window.location.href);
    setEligible(eligibility.eligible);
    const engine = createAnalyticsController(eligibility, browserAnalyticsAdapter());
    controller.current = engine;
    let stored: ConsentRecord | null = null;
    try {
      stored = parseConsent(window.localStorage.getItem(CONSENT_KEY));
      if (!stored) window.localStorage.removeItem(CONSENT_KEY);
    } catch { setStorageUnavailable(true); }
    setConsent(stored);
    engine.setConsent(Boolean(stored?.analytics));
    engine.page(currentPath.current);
    setReady(true);

    const onClick = (event: MouseEvent) => {
      if (event.button !== 0) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!target) return;
      const placement = target.closest<HTMLElement>('[data-analytics-placement]')?.dataset.analyticsPlacement
        || (target.closest('[aria-label="Introduction"]') ? 'hero' : target.closest('#work') ? 'featured' : target.closest('main ul') ? 'index' : 'related');
      const action = classifyAnalyticsLink(target.href, window.location.origin, placement);
      if (action) engine.event(action);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== CONSENT_KEY) return;
      const next = parseConsent(event.newValue);
      const wasActive = engine.active;
      engine.setConsent(Boolean(next?.analytics));
      setConsent(next);
      engine.page(currentPath.current);
      if (wasActive && !next?.analytics) window.location.reload();
    };
    document.addEventListener('click', onClick);
    window.addEventListener('storage', onStorage);
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('storage', onStorage);
      // The root provider persists across route changes. Do not send consent pings.
      controller.current = null;
    };
  }, [config.enabled, config.measurementId, config.siteUrl, config.deploymentEnvironment]);

  useEffect(() => { controller.current?.page(pathname); }, [pathname]);

  useEffect(() => {
    if (!consent) return;
    let timeout = 0;
    const expire = () => {
      const remaining = consent.expiresAt - Date.now();
      if (remaining > 0) { timeout = window.setTimeout(expire, Math.min(remaining, 2_147_483_647)); return; }
      const active = controller.current?.active;
      controller.current?.setConsent(false);
      try { window.localStorage.removeItem(CONSENT_KEY); } catch { /* Keep the in-memory default denied. */ }
      setConsent(null);
      if (active) window.location.reload();
    };
    timeout = window.setTimeout(expire, Math.min(Math.max(0, consent.expiresAt - Date.now()), 2_147_483_647));
    return () => window.clearTimeout(timeout);
  }, [consent]);

  useEffect(() => {
    if (!settingsOpen) return;
    setDraftAnalytics(eligible && Boolean(consent?.analytics));
    close.current?.focus();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeSettings(); }
      if (event.key !== 'Tab' || !dialog.current) return;
      const elements = Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]'));
      const first = elements[0]; const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', onKey); };
  }, [settingsOpen, eligible, consent?.analytics, closeSettings]);

  function saveChoice(analytics: boolean) {
    const previousActive = Boolean(controller.current?.active);
    const next = createConsent(eligible && analytics);
    try { window.localStorage.setItem(CONSENT_KEY, JSON.stringify(next)); }
    catch { setStorageUnavailable(true); }
    setConsent(next);
    controller.current?.setConsent(next.analytics);
    controller.current?.page(pathname);
    closeSettings();
    if (previousActive && !next.analytics) window.location.reload();
  }

  return <PrivacyContext.Provider value={{ openSettings }}>
    {children}
    {ready && eligible && !consent && !settingsOpen && <section className={s.banner} aria-label="Analytics preferences">
      <div className={s.bannerCopy}><h2>A little insight. Your choice.</h2><p>Optional analytics helps me understand which work people explore. Google Analytics stays off unless you choose to allow it. <Link href="/cookie-policy">Cookie policy</Link></p></div>
      <div className={s.bannerActions}><button onClick={() => saveChoice(true)}>Accept analytics</button><button onClick={() => saveChoice(false)}>Reject optional</button><button onClick={openSettings}>Settings</button></div>
    </section>}
    {settingsOpen && <div className={s.backdrop} onClick={event => { if (event.target === event.currentTarget) closeSettings(); }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="privacy-settings-title" aria-describedby="privacy-settings-description" className={s.dialog}>
        <div className={s.dialogHeading}><h2 id="privacy-settings-title">Your privacy choices.</h2><button ref={close} type="button" onClick={closeSettings} className={s.close} aria-label="Close cookie settings">Close <span aria-hidden="true">×</span></button></div>
        <p id="privacy-settings-description">You decide whether optional analytics is used. The portfolio works either way.</p>
        <div className={s.preference}><div><h3>Necessary preferences</h3><p>Stores your privacy choice on this device for up to 180 days. It is used to remember consent, not to measure visits.</p></div><span className={s.always}>Always available</span></div>
        <div className={s.preference}><div><h3>Google Analytics</h3><p>{eligible ? 'Counts page visits, project selections, CV downloads, and contact-channel clicks after you opt in. Advertising features are disabled.' : 'Analytics is not active on this version. No optional Google Analytics script or tracking cookies are loaded here.'}</p></div><label className={s.toggle}><input type="checkbox" checked={draftAnalytics} disabled={!eligible} onChange={event => setDraftAnalytics(event.target.checked)} aria-label="Allow Google Analytics"/><span aria-hidden="true"/></label></div>
        {eligible && consent?.analytics && <p className={s.refreshNote}>Turning analytics off clears this site’s analytics cookies and refreshes the page.</p>}
        {storageUnavailable && <p className={s.refreshNote}>Your browser is blocking preference storage. Choices apply to this page, and you may be asked again next time.</p>}
        <div className={s.policyLinks}><Link href="/privacy-policy" onClick={closeSettings}>Privacy policy</Link><Link href="/cookie-policy" onClick={closeSettings}>Cookie policy</Link></div>
        <div className={s.dialogActions}>{eligible ? <><button onClick={() => saveChoice(draftAnalytics)}>Save preferences</button><button onClick={() => saveChoice(false)}>Reject optional</button></> : <button onClick={closeSettings}>Done</button>}</div>
      </div>
    </div>}
  </PrivacyContext.Provider>;
}
