'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Project } from '@/data/projects';
import { PixelImage } from './PixelImage';
import { Arrow } from './Arrow';
import { Words } from './Words';
import s from './ProjectPlate.module.css';

const purposes: Record<string, string> = {
  hitalent: 'AI for recruitment operations',
  'ut-operations': 'The everyday work of a branch',
  methodata: 'Connected church administration',
  'family-gathering': 'Registration. Celebration. Live draws.',
};

export function ProjectPlate({ project, index }: { project: Project; index: number }) {
  const surface = useRef<HTMLDivElement>(null);
  const badge = useRef<HTMLSpanElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const state = useRef({ targetX: 0, targetY: 0, x: 0, y: 0, bx: 0, by: 0, targetBx: 0, targetBy: 0, active: false, dirty: true });
  const bounds = useRef<DOMRect | null>(null);
  const animation = useRef(0);
  const previous = useRef(0);
  const reduced = useRef(false);

  const animate = (time: number) => {
    const value = state.current;
    const dt = Math.min(48, time - (previous.current || time - 16));
    previous.current = time;
    const factor = 1 - Math.exp(-dt / 62);
    value.x += (value.targetX - value.x) * factor;
    value.y += (value.targetY - value.y) * factor;
    value.bx += (value.targetBx - value.bx) * factor;
    value.by += (value.targetBy - value.by) * factor;
    surface.current?.style.setProperty('--tilt-x', `${value.x.toFixed(3)}deg`);
    surface.current?.style.setProperty('--tilt-y', `${value.y.toFixed(3)}deg`);
    badge.current?.style.setProperty('--badge-x', `${value.bx.toFixed(2)}px`);
    badge.current?.style.setProperty('--badge-y', `${value.by.toFixed(2)}px`);
    const unsettled = Math.abs(value.targetX - value.x) + Math.abs(value.targetY - value.y) + Math.abs(value.targetBx - value.bx) + Math.abs(value.targetBy - value.by) > 0.08;
    if (unsettled && !document.hidden && !reduced.current) animation.current = requestAnimationFrame(animate);
    else { animation.current = 0; previous.current = 0; }
  };
  const run = () => { if (!animation.current && !reduced.current) animation.current = requestAnimationFrame(animate); };
  const reset = () => {
    state.current.active = false;
    state.current.targetX = 0;
    state.current.targetY = 0;
    run();
  };

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => {
      reduced.current = preference.matches;
      if (preference.matches) {
        cancelAnimationFrame(animation.current);
        animation.current = 0;
        Object.assign(state.current, { targetX: 0, targetY: 0, x: 0, y: 0, active: false });
        surface.current?.style.setProperty('--tilt-x', '0deg');
        surface.current?.style.setProperty('--tilt-y', '0deg');
      }
    };
    const dirty = () => { state.current.dirty = true; };
    change();
    preference.addEventListener('change', change);
    window.addEventListener('resize', dirty, { passive: true });
    window.addEventListener('scroll', dirty, { passive: true });
    return () => {
      cancelAnimationFrame(animation.current);
      preference.removeEventListener('change', change);
      window.removeEventListener('resize', dirty);
      window.removeEventListener('scroll', dirty);
    };
  }, []);

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || reduced.current) return;
    if (state.current.dirty || !bounds.current) {
      bounds.current = frame.current?.getBoundingClientRect() || null;
      state.current.dirty = false;
    }
    const box = bounds.current;
    if (!box) return;
    const x = Math.max(0, Math.min(box.width, event.clientX - box.left));
    const y = Math.max(0, Math.min(box.height, event.clientY - box.top));
    state.current.targetX = -(y / box.height - 0.5) * 8;
    state.current.targetY = (x / box.width - 0.5) * 8;
    state.current.targetBx = Math.max(64, Math.min(box.width - 64, x));
    state.current.targetBy = Math.max(36, Math.min(box.height - 36, y));
    if (!state.current.active) {
      state.current.bx = state.current.targetBx;
      state.current.by = state.current.targetBy;
    }
    state.current.active = true;
    run();
  };

  return (
    <article className={`${s.project} ${s[`position${index}`]}`} data-project-plate data-project-index={index}>
      <div data-work-travel className={s.travel}>
        <Link href={`/work/${project.slug}`} className={s.link} data-project-slug={project.slug} data-project-placement="featured">
          <div ref={frame} className={s.perspective} onPointerMove={move} onPointerLeave={reset}>
            <div data-work-enter className={s.entry}><div data-work-lean className={s.lean}><div ref={surface} className={s.surface}>
              <div className={s.depth} aria-hidden="true" />
              <PixelImage src={project.cover} alt={project.gallery[0]?.alt || project.summary} />
            </div></div></div>
            <span ref={badge} className={s.badge} aria-hidden="true">View project <Arrow size={17} /></span>
          </div>
          <div className={s.caption}>
            <div className={s.title}><h3><Words text={project.shortTitle} /></h3><span><Arrow size={25} /></span></div>
            <p className={s.purpose}>{purposes[project.slug]}</p>
            <p className={s.summary}>{project.summary}</p>
            <div className={s.meta}><span>{project.tags.slice(0, 2).join(' / ')}</span><span>{project.status}</span></div>
          </div>
        </Link>
      </div>
    </article>
  );
}
