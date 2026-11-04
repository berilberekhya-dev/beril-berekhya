'use client';

import { useEffect } from 'react';

export function Motion() {
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false;
    let generation = 0;
    let observer: IntersectionObserver | undefined;
    const controllers = new Map<HTMLElement, () => void>();
    const pending = new Set<HTMLElement>();
    let library: Promise<typeof import('@/lib/motion-scenes')> | undefined;
    // Native hero motion starts immediately. Scroll scenes wait for the first
    // scroll (or a deep link), so their library cannot delay the primary image.
    // The observer still prepares only nearby scenes, rather than every scene.
    let stopStartup = () => {};
    const presentationReady = new Promise<void>(resolve => {
      const idle = () => {
        if ('requestIdleCallback' in window) window.requestIdleCallback(() => resolve(), { timeout: 900 });
        else setTimeout(resolve, 0);
      };
      const start = () => {
        stopStartup();
        if (document.readyState === 'complete') idle();
        else window.addEventListener('load', idle, { once: true });
      };
      stopStartup = () => {
        window.removeEventListener('scroll', start);
        window.removeEventListener('hashchange', start);
      };
      if (window.location.hash || window.scrollY > 0) start();
      else {
        window.addEventListener('scroll', start, { passive: true, once: true });
        window.addEventListener('hashchange', start, { once: true });
      }
    });

    const prepare = (element: HTMLElement) => {
      if (disposed || preference.matches || controllers.has(element) || pending.has(element)) return;
      pending.add(element);
      const current = generation;
      library ||= presentationReady.then(() => import('@/lib/motion-scenes'));
      library.then(module => {
        if (disposed || preference.matches || generation !== current) return;
        pending.delete(element);
        controllers.set(element, module.createMotionScene(element));
      }).catch(() => { pending.delete(element); });
    };

    const observe = () => {
      observer?.disconnect();
      if (preference.matches || disposed) return;
      const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-motion-section]'));
      // Case-study blocks have no presentation scene wrapper.
      document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(element => {
        if (!element.closest('[data-motion-section]')) roots.push(element);
      });
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            prepare(entry.target as HTMLElement);
            observer?.unobserve(entry.target);
          }
        });
      }, { rootMargin: '260px 0px', threshold: 0 });
      roots.forEach(root => observer?.observe(root));
    };

    const change = () => {
      generation++;
      observer?.disconnect();
      controllers.forEach(stop => stop());
      controllers.clear();
      pending.clear();
      observe();
    };
    const refresh = () => {
      if (!preference.matches) library?.then(module => { if (!disposed) module.refreshMotion(); });
    };
    // A direct hash can be positioned before the self-hosted font finishes.
    // Align once after its layout settles, unless the visitor has begun scrolling.
    let manualScroll = false;
    const takeControl = () => { manualScroll = true; };
    const keyControl = (event: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) takeControl();
    };
    const alignHash = () => {
      manualScroll = false;
      const hash = window.location.hash;
      if (!hash || document.fonts.status === 'loaded') return;
      document.fonts.ready.then(() => {
        refresh();
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (disposed || manualScroll || window.location.hash !== hash) return;
          let id = hash.slice(1);
          try { id = decodeURIComponent(id); } catch { /* Unknown fragments have no matching target. */ }
          const anchor = document.getElementById(id);
          anchor?.scrollIntoView({ block: 'start', behavior: 'instant' });
        }));
      });
    };
    document.addEventListener('wheel', takeControl, { passive: true });
    document.addEventListener('touchmove', takeControl, { passive: true });
    document.addEventListener('keydown', keyControl);
    preference.addEventListener('change', change);
    window.addEventListener('hashchange', refresh);
    window.addEventListener('hashchange', alignHash);
    window.addEventListener('pageshow', refresh);
    document.fonts.ready.then(refresh);
    observe();
    alignHash();
    return () => {
      disposed = true;
      stopStartup();
      generation++;
      observer?.disconnect();
      controllers.forEach(stop => stop());
      preference.removeEventListener('change', change);
      window.removeEventListener('hashchange', refresh);
      window.removeEventListener('hashchange', alignHash);
      window.removeEventListener('pageshow', refresh);
      document.removeEventListener('wheel', takeControl);
      document.removeEventListener('touchmove', takeControl);
      document.removeEventListener('keydown', keyControl);
    };
  }, []);
  return null;
}
