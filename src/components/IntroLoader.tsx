'use client';

import { useEffect, useRef, useState } from 'react';
import s from './IntroLoader.module.css';

/** A fresh opening for each document visit, including restored browser pages. */
export function IntroLoader() {
  const [visit, setVisit] = useState(0);
  useEffect(() => {
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) setVisit(value => value + 1);
    };
    window.addEventListener('pageshow', restore);
    return () => window.removeEventListener('pageshow', restore);
  }, []);
  return <IntroSequence key={visit} />;
}

function IntroSequence() {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'leaving' | 'done'>('loading');
  const [started, setStarted] = useState(false);
  const overlay = useRef<HTMLDivElement>(null);
  const dismiss = useRef<() => void>(() => {});

  useEffect(() => {
    const element = overlay.current;
    const content = document.getElementById('site-content');
    if (!element || !content) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrast = window.matchMedia('(forced-colors: active)');
    // CSS can already have opened the page if hydration arrived very late.
    if (reduced.matches || contrast.matches || getComputedStyle(element).visibility === 'hidden') {
      setPhase('done');
      return;
    }

    let disposed = false;
    let finished = false;
    let leaving = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const listeners = new AbortController();
    const wasInert = content.inert;
    // CSS starts at first paint, while the document is still arriving. Count
    // that time too, so slow hydration never restarts a full artificial wait.
    const elapsed = Math.max(0, ...element.getAnimations({ subtree: true }).map(animation => typeof animation.currentTime === 'number' ? animation.currentTime : 0));
    const startedAt = performance.now() - elapsed;
    const later = (action: () => void, delay: number) => {
      timers.push(setTimeout(action, delay));
    };
    const release = () => {
      timers.forEach(clearTimeout);
      listeners.abort();
      content.inert = wasInert;
      document.documentElement.removeAttribute('data-intro-active');
    };
    const finish = (focusContent = false) => {
      if (finished) return;
      finished = true;
      const focusWasInside = element.contains(document.activeElement);
      release();
      if (disposed) return;
      setPhase('done');
      if (focusContent || focusWasInside) {
        const main = document.getElementById('main-content');
        if (main) {
          const previous = main.getAttribute('tabindex');
          main.tabIndex = -1;
          main.focus({ preventScroll: true });
          main.addEventListener('blur', () => {
            if (previous === null) main.removeAttribute('tabindex');
            else main.setAttribute('tabindex', previous);
          }, { once: true });
        }
      }
    };
    const open = () => {
      if (disposed || finished || leaving) return;
      leaving = true;
      setPhase('ready');
      later(() => {
        document.documentElement.removeAttribute('data-intro-active');
        setPhase('leaving');
        later(() => finish(), 880);
      }, 400);
    };
    dismiss.current = () => finish(true);

    // Install the deadline before temporarily making the page inert.
    later(() => finish(), Math.max(0, 5600 - elapsed));
    content.inert = true;
    document.documentElement.setAttribute('data-intro-active', 'true');
    setStarted(true);
    element.addEventListener('wheel', event => event.preventDefault(), { passive: false, signal: listeners.signal });
    element.addEventListener('animationend', event => {
      if (event.target === element) finish();
    }, { signal: listeners.signal });
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); finish(true); }
    }, { signal: listeners.signal });
    const preference = () => { if (reduced.matches || contrast.matches) finish(); };
    reduced.addEventListener('change', preference, { signal: listeners.signal });
    contrast.addEventListener('change', preference, { signal: listeners.signal });

    // Wait for the document/font, with a short ceiling. Lazy project images and
    // third-party services never hold the opening. The words are an intro, not
    // an invented loading percentage.
    const documentReady = document.readyState === 'loading'
      ? new Promise<void>(resolve => document.addEventListener('DOMContentLoaded', () => resolve(), { once: true, signal: listeners.signal }))
      : Promise.resolve();
    Promise.all([documentReady, document.fonts.ready]).then(() => {
      if (disposed || finished) return;
      later(open, Math.max(0, 3600 - (performance.now() - startedAt)));
    }).catch(open);
    later(open, Math.max(0, 4100 - elapsed));

    return () => {
      disposed = true;
      finished = true;
      dismiss.current = () => {};
      release();
    };
  }, []);

  if (phase === 'done') return null;
  return <>
    <noscript><style>{'[data-intro-loader]{display:none!important}'}</style></noscript>
    <div ref={overlay} className={s.loader} data-intro-loader data-phase={phase} data-started={started}>
      <div className={s.upper} aria-hidden="true" />
      <div className={s.lower} aria-hidden="true" />
      <div className={s.header}>
        <span className={s.signature} aria-hidden="true">beril<span>.</span></span>
        <button type="button" className={s.skip} onClick={() => dismiss.current()} aria-label="Skip opening animation">
          Skip intro <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      <div className={s.scene} aria-hidden="true">
        <div className={s.sculpture}>
          <img src="/images/social/b-tile.png" alt="" width={660} height={658} loading="eager" decoding="async" fetchPriority="high" />
        </div>
        <div className={s.words}>
          <p className={s.name}>Beril Berekhya</p>
          <div className={s.window} data-intro-word-window>
            <div className={s.track} data-intro-track>{['integrate', 'automate', 'develop', 'deploy'].map(verb => <span key={verb}>{verb}<span className={s.period}>.</span></span>)}</div>
          </div>
          <p className={s.role}>Full-stack &amp; AI developer</p>
        </div>
      </div>
      <div className={s.loading} data-intro-progress>
        <div className={s.loadingLabel} role="status" aria-live="polite">
          <span>{phase === 'loading' ? 'Loading portfolio' : "Ready. Let’s go."}</span>
          <span className={s.activity} aria-hidden="true"><i /><i /><i /></span>
        </div>
        <div className={s.bar} aria-hidden="true"><span className={s.fill} /></div>
      </div>
      <div className={s.footer} aria-hidden="true">
        <p>Software and AI<br />serving real world operations.</p>
        <svg className={s.asterisk} width="36" height="36" viewBox="0 0 40 40" fill="none"><path d="M20 2v36M2 20h36M7.3 7.3l25.4 25.4M7.3 32.7 32.7 7.3" stroke="currentColor" strokeWidth="4" /></svg>
      </div>
    </div>
  </>;
}
