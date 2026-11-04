import { useEffect, type RefObject } from 'react';
import type { HeroCubeHandle } from './HeroCube';

type Options = {
  stage: RefObject<HTMLDivElement | null>;
  sculpture: RefObject<HTMLButtonElement | null>;
  preview: RefObject<HTMLButtonElement | null>;
  badge: RefObject<HTMLButtonElement | null>;
  cube: RefObject<HeroCubeHandle | null>;
  suppressClick: RefObject<boolean>;
};

export function usePlaygroundGestures({ stage, sculpture, preview, badge, cube, suppressClick }: Options) {
  useEffect(() => {
    const scene = stage.current;
    if (!scene) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const cleanups: (() => void)[] = [];
    for (const [element, kind] of [[sculpture.current, 'cube'], [preview.current, 'preview'], [badge.current, 'badge']] as const) {
      if (!element) continue;
      const layer = kind === 'cube' ? null : element.parentElement!;
      let pointer = -1, startX = 0, startY = 0, originX = 0, originY = 0;
      let x = 0, y = 0, tx = 0, ty = 0, vx = 0, vy = 0, moved = false;
      let frame = 0, last = 0, timer: ReturnType<typeof setTimeout> | undefined;
      let minX = -100, maxX = 100, minY = -90, maxY = 90;
      const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
      const paint = () => {
        if (layer) layer.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${(x * .045).toFixed(2)}deg)`;
      };
      const tick = (time: number) => {
        frame = 0;
        const dt = last ? Math.min((time - last) / 1000, .032) : 1 / 60;
        last = time;
        if (pointer >= 0) {
          const smooth = 1 - Math.exp(-dt / .025);
          x += (tx - x) * smooth; y += (ty - y) * smooth;
          vx = vy = 0;
        } else {
          vx += (-x * 150 - vx * 20) * dt;
          vy += (-y * 150 - vy * 20) * dt;
          x += vx * dt; y += vy * dt;
        }
        paint();
        if (pointer >= 0 || Math.abs(x) + Math.abs(y) + Math.abs(vx) + Math.abs(vy) > .08) frame = requestAnimationFrame(tick);
        else { x = y = vx = vy = 0; last = 0; paint(); }
      };
      const run = () => { if (!frame && kind !== 'cube') frame = requestAnimationFrame(tick); };
      const finish = (cancelled = false) => {
        if (pointer >= 0 && element.hasPointerCapture(pointer)) element.releasePointerCapture(pointer);
        pointer = -1;
        element.dataset.dragging = 'false';
        if (kind === 'cube') { suppressClick.current = moved || cancelled; cube.current?.release(); }
        else if (reduced.matches || cancelled) { cancelAnimationFrame(frame); frame = 0; last = 0; x = y = vx = vy = 0; paint(); }
        else run();
      };
      const down = (event: PointerEvent) => {
        if (pointer >= 0 || (event.pointerType === 'mouse' && event.button !== 0)) return;
        if (timer) clearTimeout(timer);
        pointer = event.pointerId; moved = false;
        if (kind === 'cube') suppressClick.current = false;
        startX = event.clientX; startY = event.clientY; originX = x; originY = y;
        tx = x; ty = y;
        const bounds = element.getBoundingClientRect(), area = scene.getBoundingClientRect();
        minX = 12 - bounds.left + x;
        maxX = innerWidth - 12 - bounds.right + x;
        minY = area.top - bounds.top + y - 10;
        maxY = area.bottom - bounds.bottom + y - 8;
        element.setPointerCapture(pointer);
        element.dataset.dragging = 'true';
      };
      const move = (event: PointerEvent) => {
        if (event.pointerId !== pointer) return;
        const dx = event.clientX - startX, dy = event.clientY - startY;
        if (Math.hypot(dx, dy) > 6) moved = true;
        if (!moved || reduced.matches) return;
        if (kind === 'cube') cube.current?.setDrag(clamp(dy * .8, -160, 160), clamp(dx * .95, -240, 240));
        else { tx = clamp(originX + dx, minX, maxX); ty = clamp(originY + dy, minY, maxY); run(); }
      };
      const up = (event: PointerEvent) => { if (event.pointerId === pointer) finish(event.type === 'pointercancel'); };
      const lost = () => { if (pointer >= 0) finish(true); };
      const key = (event: KeyboardEvent) => {
        if (kind === 'cube' || reduced.matches) return;
        const offsets: Record<string, [number, number]> = { ArrowLeft: [-35, 0], ArrowRight: [35, 0], ArrowUp: [0, -25], ArrowDown: [0, 25], Enter: [0, -20], ' ': [0, -20] };
        const offset = offsets[event.key];
        if (!offset) return;
        event.preventDefault();
        if (timer) clearTimeout(timer);
        x += offset[0]; y += offset[1]; paint();
        timer = setTimeout(run, 120);
      };
      const reset = () => finish(true);
      const hidden = () => { if (document.hidden) reset(); };
      element.addEventListener('pointerdown', down);
      element.addEventListener('pointermove', move);
      element.addEventListener('pointerup', up);
      element.addEventListener('pointercancel', up);
      element.addEventListener('lostpointercapture', lost);
      element.addEventListener('keydown', key);
      window.addEventListener('blur', reset);
      document.addEventListener('visibilitychange', hidden);
      reduced.addEventListener('change', reset);
      cleanups.push(() => {
        finish(true); cancelAnimationFrame(frame); if (timer) clearTimeout(timer);
        element.removeEventListener('pointerdown', down); element.removeEventListener('pointermove', move);
        element.removeEventListener('pointerup', up); element.removeEventListener('pointercancel', up);
        element.removeEventListener('lostpointercapture', lost); element.removeEventListener('keydown', key);
        window.removeEventListener('blur', reset); document.removeEventListener('visibilitychange', hidden);
        reduced.removeEventListener('change', reset);
      });
    }
    return () => cleanups.forEach(cleanup => cleanup());
  }, [stage, sculpture, preview, badge, cube, suppressClick]);
}
