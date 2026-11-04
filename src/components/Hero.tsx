'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import type { HeroCubeHandle } from './HeroCube';
import { usePlaygroundGestures } from './usePlaygroundGestures';

import { Arrow } from './Arrow';
import s from './Hero.module.css';

const HeroCube = dynamic(() => import('./HeroCube').then(module => module.HeroCube), { ssr: false });

const verbs = [
  { name: 'Integrate', slug: 'hitalent', title: 'Everything, connected.', description: 'Bringing talent data, APIs, and the tools a team relies on into the same conversation.', image: '/images/projects/hitalent-cv.webp', label: 'HiTalent · Data & integrations', note: 'A useful connection.', turn: -3 },
  { name: 'Automate', slug: 'hitalent', title: 'A little less manual.', description: 'CV masking, AI-written reports, and workflows that give people their time back.', image: '/images/projects/hitalent-cv.webp', label: 'HiTalent · Applied AI & automation', note: 'Less busywork.', turn: 5 },
  { name: 'Develop', slug: 'methodata', title: 'Built around real people.', description: 'Thoughtful applications for complicated permissions, everyday decisions, and the work between them.', image: '/images/projects/methodata.webp', label: 'Methodata · Application development', note: 'Made for people.', turn: -1 },
  { name: 'Deploy', slug: 'astron-onboarding', title: 'Out of the editor. Into use.', description: 'Taking an onboarding portal from its learning material to a working internal deployment.', image: '/images/projects/astron-onboarding.webp', label: 'ASTRON · Delivery & deployment', note: 'Ready for the real world.', turn: 8 },
];

function Dither() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const points: { x: number; y: number; distance: number; angle: number }[] = [];
    for (let x = 12; x < 380; x += 9) {
      for (let y = 12; y < 380; y += 9) {
        const dx = x - 190, dy = y - 190, distance = Math.hypot(dx, dy);
        if (distance > 65 && distance < 173) points.push({ x, y, distance, angle: Math.atan2(dy, dx) });
      }
    }
    let frame = 0, visible = false, last = 0;
    const draw = (time: number) => {
      frame = 0;
      if (!visible || document.hidden || reduced.matches) return;
      if (time - last > 45) {
        last = time;
        context.clearRect(0, 0, 380, 380);
        for (const point of points) {
          const wave = Math.sin(point.distance * 0.035 - time * 0.00055 + point.angle * 3);
          if (wave <= 0.05) continue;
          context.fillStyle = `rgba(243,107,50,${(0.16 + wave * 0.26) * (1 - point.distance / 240)})`;
          const size = wave > 0.7 ? 3 : 2;
          context.fillRect(point.x, point.y, size, size);
        }
      }
      frame = requestAnimationFrame(draw);
    };
    const start = () => { if (!frame && visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(draw); };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else { cancelAnimationFrame(frame); frame = 0; }
    }, { rootMargin: '60px' });
    observer.observe(canvas);
    document.addEventListener('visibilitychange', start);
    reduced.addEventListener('change', start);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', start); reduced.removeEventListener('change', start); };
  }, []);
  return <canvas ref={ref} width={380} height={380} className={s.dither} aria-hidden="true" />;
}

function WorkMark({ active }: { active: number }) {
  if (active === 1) return <svg width="34" height="34" viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M20 4v32M4 20h32M9 9l22 22M31 9 9 31" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" /></svg>;
  if (active === 0) return <svg width="34" height="34" viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M5 20h30M12 13l-7 7 7 7M28 13l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (active === 2) return <span aria-hidden="true">{'{ }'}</span>;
  return <Arrow size={34} />;
}

export function Hero() {
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const hero = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const name = useRef<HTMLHeadingElement>(null);
  const object = useRef<HTMLButtonElement>(null);
  const cube = useRef<HeroCubeHandle>(null);
  const preview = useRef<HTMLButtonElement>(null);
  const badge = useRef<HTMLButtonElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClick = useRef(false);
  const current = verbs[active];
  usePlaygroundGestures({ stage, sculpture: object, preview, badge, cube, suppressClick });

  useEffect(() => () => { if (transitionTimer.current) clearTimeout(transitionTimer.current); }, []);
  useEffect(() => {
    const root = hero.current, scene = stage.current, title = name.current;
    if (!root || !scene || !title) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const letters = Array.from(title.querySelectorAll<HTMLElement>('[data-letter]'));
    let centers: number[] = [];
    let waveRadius = 155, waveLift = 18;
    let rootLeft = 0, rootTop = 0, rootWidth = 1, rootHeight = 1;
    let visible = true, disposed = false, frame = 0, lastTime = 0;
    let pointerInName = false, pointerX = 0, smoothPointerX = 0, strength = 0;
    const target = { x: 0, y: 0 }, depth = { x: 0, y: 0 };
    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    // Read geometry only after layout changes, never while handling a pointer sweep.
    const measure = () => {
      const bounds = root.getBoundingClientRect();
      rootLeft = bounds.left; rootTop = bounds.top + window.scrollY;
      rootWidth = bounds.width || 1; rootHeight = bounds.height || 1;
      const nameLeft = title.getBoundingClientRect().left;
      centers = letters.map(letter => nameLeft + letter.offsetLeft + letter.offsetWidth / 2);
      waveRadius = clamp(title.offsetWidth * 0.16, 95, 200);
      waveLift = clamp(title.offsetHeight * 0.12, 9, 22);
    };
    const render = (time: number) => {
      frame = 0;
      if (disposed || !visible || document.hidden || reduced.matches) return;
      const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.032) : 1 / 60;
      lastTime = time;
      const smoothing = 1 - Math.exp(-dt / 0.04);
      smoothPointerX += (pointerX - smoothPointerX) * smoothing;
      depth.x += (target.x - depth.x) * smoothing;
      depth.y += (target.y - depth.y) * smoothing;
      const nextStrength = pointerInName ? 1 : 0;
      strength += (nextStrength - strength) * smoothing;
      scene.style.setProperty('--pointer-x', depth.x.toFixed(4));
      scene.style.setProperty('--pointer-y', depth.y.toFixed(4));
      for (let index = 0; index < letters.length; index++) {
        const distance = (centers[index] - smoothPointerX) / waveRadius;
        const influence = Math.exp(-distance * distance * 1.6) * strength;
        const rotation = clamp(distance * influence * 7.5, -2.6, 2.6);
        letters[index].style.transform = `translate3d(0,${(-waveLift * influence).toFixed(2)}px,0) rotate(${rotation.toFixed(2)}deg) scaleY(${(1 + influence * 0.11).toFixed(4)})`;
      }
      const depthMoving = Math.abs(depth.x - target.x) + Math.abs(depth.y - target.y) > 0.001;
      const nameMoving = Math.abs(strength - nextStrength) > 0.001 || (pointerInName && Math.abs(pointerX - smoothPointerX) > 0.2);
      if (depthMoving || nameMoving) frame = requestAnimationFrame(render);
      else lastTime = 0;
    };
    const start = () => { if (!frame && visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(render); };
    const reset = (immediate = false) => {
      pointerInName = false; target.x = target.y = 0;
      if (immediate) {
        cancelAnimationFrame(frame); frame = 0; lastTime = 0;
        depth.x = depth.y = strength = 0;
        scene.style.setProperty('--pointer-x', '0'); scene.style.setProperty('--pointer-y', '0');
        letters.forEach(letter => { letter.style.transform = ''; });
      } else start();
    };
    const move = (event: PointerEvent) => {
      // Real mouse input also works on hybrid devices whose primary pointer is touch.
      if (event.pointerType !== 'mouse' || reduced.matches) return;
      pointerX = event.clientX;
      const overName = title.contains(event.target as Node);
      if (overName && !pointerInName) smoothPointerX = pointerX;
      pointerInName = overName;
      target.x = clamp(((event.clientX - rootLeft) / rootWidth - 0.5) * 2, -1, 1);
      target.y = clamp(((event.pageY - rootTop) / rootHeight - 0.5) * 2, -1, 1);
      start();
    };
    const leave = () => reset();
    const preference = () => reset(true);
    const visibility = () => { if (document.hidden) reset(true); };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      root.dataset.heroVisible = visible ? 'true' : 'false';
      if (!visible) reset(true);
    });
    observer.observe(root);
    const resize = new ResizeObserver(measure);
    resize.observe(root); resize.observe(title); measure();
    document.fonts.ready.then(() => { if (!disposed) measure(); });
    root.addEventListener('pointermove', move); root.addEventListener('pointerleave', leave);
    reduced.addEventListener('change', preference);
    document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', preference);
    return () => {
      disposed = true; reset(true); observer.disconnect(); resize.disconnect();
      root.removeEventListener('pointermove', move); root.removeEventListener('pointerleave', leave);
      reduced.removeEventListener('change', preference);
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', preference);
    };
  }, []);

  const select = (index: number) => {
    if (index === active) return;
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    setPrevious(active); setActive(index);
    transitionTimer.current = setTimeout(() => setPrevious(null), 480);
  };
  const key = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % 4;
    else if (event.key === 'ArrowLeft') next = (index + 3) % 4;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 3;
    else return;
    event.preventDefault(); select(next); tabs.current[next]?.focus();
  };

  return <section className={s.hero} ref={hero} aria-label="Introduction" data-hero>
    <div className={`page-frame ${s.nameWrap}`}>
      <h1 className={s.name} ref={name} aria-label="Beril Berekhya">
        {'Beril Berekhya'.split('').map((character, index) => <span className={s.letterSlot} key={index} data-letter aria-hidden="true"><span className={s.letterEntrance} style={{ '--letter': index } as CSSProperties}>{character === ' ' ? '\u00a0' : character}</span></span>)}
      </h1>
      <div className={s.nameFooter}><span>Software. AI. The work in between.</span><span>Based in Indonesia <Arrow direction="down-right" size={16} /></span></div>
    </div>
    <div className={`page-frame ${s.top}`}>
      <div className={s.intro}>
        <p className={s.role}>Full-stack & AI<br />developer<span className={s.period}>.</span></p>
        <p className={s.description}>I turn everyday operational problems into web applications, AI tools, and automations people can actually use.</p>
        <div className={s.actions}><a href="#work" className="pill" data-magnetic>Explore my work <Arrow direction="down" /></a><a className={s.cv} href="/beril-berekhya-resume.pdf" download>My résumé <Arrow direction="down" size={16} /></a></div>
      </div>
      <div className={s.explorer}>
        <div className={s.stage} ref={stage} data-hero-stage style={{ '--verb-turn': `${current.turn}deg` } as CSSProperties}>
          <Dither />
          <p id="playground-help" className="sr-only">Drag the B sculpture to rotate it, then release to return. Tap or press Enter to flip it. Drag either small card and release to float it home. Scroll the page outside these objects.</p>
          <div className={s.tactilePosition}><div className={s.ambientFloat}>
            <button ref={object} className={s.object} type="button" aria-label="Flip B sculpture to its other face" aria-describedby="playground-help" aria-pressed={flipped} data-b-object data-b-sculpture data-flipped={flipped} onClick={event => {
              if (suppressClick.current && event.detail !== 0) { suppressClick.current = false; return; }
              suppressClick.current = false;
              setFlipped(value => !value);
            }}>
              <HeroCube cubeRef={cube} flipped={flipped} />
            </button>
          </div></div>
          <div className={s.orbitOneDepth}><div className={s.cardReturn} data-card-return="preview">
            <button ref={preview} type="button" className={s.orbitOne} data-play-card="preview" aria-label={`Play with project card: ${current.note}`} aria-describedby="playground-help">
              <span className={s.previewWindow} aria-hidden="true">
                {previous !== null && <span className={s.previewExit} key={`exit-${previous}`}><Image src={verbs[previous].image} alt="" width={250} height={181} sizes="210px" draggable={false} /></span>}
                <span className={s.previewEnter} key={`enter-${active}`}><Image src={current.image} alt="" width={250} height={181} sizes="210px" draggable={false} priority={active === 0} /></span>
              </span>
              <span key={active} className={s.previewNote}>{current.note}</span>
            </button>
          </div></div>
          <div className={s.orbitTwoDepth}><div className={s.cardReturn} data-card-return="badge">
            <button ref={badge} type="button" className={s.orbitTwo} data-play-card="badge" aria-label={`Play with ${current.name.toLowerCase()} icon`} aria-describedby="playground-help"><span key={active} className={s.codeMark} aria-hidden="true"><WorkMark active={active} /></span></button>
          </div></div>
          <div className={s.note} aria-hidden="true">software<br />with a purpose.</div>
        </div>
        <div className={s.tabs} role="tablist" aria-label="Explore what I do">
          {verbs.map((verb, index) => <button key={verb.name} ref={element => { tabs.current[index] = element; }} id={`verb-${index}`} role="tab" aria-selected={active === index} aria-controls="verb-panel" tabIndex={active === index ? 0 : -1} onKeyDown={event => key(event, index)} onClick={() => select(index)} className={active === index ? s.active : ''}>{verb.name}<span aria-hidden="true"><Arrow size={16} /></span></button>)}
        </div>
        <div role="tabpanel" id="verb-panel" aria-labelledby={`verb-${active}`} className={s.verbPanel} tabIndex={0}>
          <div className={s.panelCopy} key={active}><h2>{current.title}</h2><p>{current.description}</p></div>
          <Link href={`/work/${current.slug}`} aria-label={`Explore ${current.label}`} className={s.panelLink}><Arrow size={22} /></Link>
        </div>
      </div>
    </div>
  </section>;
}
