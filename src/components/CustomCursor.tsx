'use client';

import { useEffect, useRef } from 'react';
import s from './CustomCursor.module.css';

/** Mouse-only overlay; native cursors remain the fallback until a real mouse moves. */
export function CustomCursor() {
  const host = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLSpanElement>(null);
  const ring = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = host.current, point = dot.current, follower = ring.current;
    if (!root || !point || !follower) return;
    const html = document.documentElement;
    const fine = matchMedia('(any-pointer: fine) and (any-hover: hover)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const contrast = matchMedia('(forced-colors: active)');
    let x = 0, y = 0, fx = 0, fy = 0, visible = false, pressed = false, dragging = false;
    let frame = 0, last = 0;
    const allowed = () => fine.matches && !reduced.matches && !contrast.matches && !document.hidden;
    const place = () => {
      point.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
      follower.style.transform = `translate3d(${fx.toFixed(2)}px,${fy.toFixed(2)}px,0)`;
    };
    const hide = () => {
      visible = pressed = dragging = false;
      root.dataset.visible = 'false'; root.dataset.pressed = 'false';
      delete html.dataset.customCursor;
      cancelAnimationFrame(frame); frame = 0; last = 0;
    };
    const render = (time: number) => {
      frame = 0;
      if (!visible || !allowed()) { hide(); return; }
      const dt = last ? Math.min(time - last, 48) : 16;
      last = time;
      const follow = 1 - Math.exp(-dt / (dragging ? 24 : 48));
      fx += (x - fx) * follow; fy += (y - fy) * follow;
      const moving = Math.abs(x - fx) + Math.abs(y - fy) > .12;
      if (!moving) { fx = x; fy = y; last = 0; }
      place();
      if (moving) frame = requestAnimationFrame(render);
    };
    const run = () => { if (!frame) frame = requestAnimationFrame(render); };
    const inspect = (target: EventTarget | null) => {
      const element = target instanceof Element ? target : null;
      if (!element || element.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""], [data-native-cursor]')) return false;
      const dragTarget = element.closest('[data-b-sculpture], [data-play-card], [draggable="true"]');
      const action = element.closest('a[href], button:not(:disabled), summary, [role="button"], [role="tab"], label[for]');
      root.dataset.mode = dragging || dragTarget ? 'drag' : action ? 'action' : 'default';
      return true;
    };
    const move = (event: PointerEvent) => {
      // Native selection feedback stays available while selecting page copy.
      const selecting = event.buttons === 1 && !dragging && event.target instanceof Element
        && !event.target.closest('a[href], button, summary, [role="button"], [role="tab"]');
      if (selecting) { hide(); return; }
      if (event.pointerType !== 'mouse' || !allowed() || !inspect(event.target)) { hide(); return; }
      x = event.clientX; y = event.clientY;
      if (!visible) { fx = x; fy = y; place(); }
      visible = true;
      root.dataset.visible = 'true';
      html.dataset.customCursor = 'true';
      run();
    };
    const down = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0 || !allowed()) { hide(); return; }
      dragging = Boolean(event.target instanceof Element && event.target.closest('[data-b-sculpture], [data-play-card], [draggable="true"]'));
      move(event);
      if (visible) { pressed = true; root.dataset.pressed = 'true'; }
    };
    const up = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') { hide(); return; }
      pressed = dragging = false; root.dataset.pressed = 'false';
      if (visible && !inspect(document.elementFromPoint(event.clientX, event.clientY))) hide();
    };
    const over = (event: PointerEvent) => { if (visible && event.pointerType === 'mouse' && !inspect(event.target)) hide(); };
    const out = (event: PointerEvent) => { if (!event.relatedTarget) hide(); };
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Tab' || event.key === 'Escape') hide(); };
    const change = () => { if (!allowed()) hide(); };
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerdown', down, { passive: true });
    document.addEventListener('pointerup', up, { passive: true });
    document.addEventListener('pointercancel', hide);
    document.addEventListener('pointerover', over, { passive: true });
    document.addEventListener('pointerout', out, { passive: true });
    document.addEventListener('keydown', keyboard);
    document.addEventListener('visibilitychange', change);
    window.addEventListener('blur', hide);
    fine.addEventListener('change', change); reduced.addEventListener('change', change); contrast.addEventListener('change', change);
    return () => {
      hide();
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', hide);
      document.removeEventListener('pointerover', over); document.removeEventListener('pointerout', out);
      document.removeEventListener('keydown', keyboard); document.removeEventListener('visibilitychange', change);
      window.removeEventListener('blur', hide);
      fine.removeEventListener('change', change); reduced.removeEventListener('change', change); contrast.removeEventListener('change', change);
    };
  }, []);

  return <div ref={host} className={s.cursor} data-custom-cursor-overlay data-visible="false" data-mode="default" data-pressed="false" aria-hidden="true">
    <span ref={dot} className={s.point}><span /></span>
    <span ref={ring} className={s.follower}><span className={s.halo}>
      <svg className={s.action} viewBox="0 0 24 24" fill="none"><path d="M6 18 18 6M6 6h12v12" /></svg>
      <svg className={s.drag} viewBox="0 0 24 24" fill="none"><path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" /></svg>
    </span></span>
  </div>;
}
