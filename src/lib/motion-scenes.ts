import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function isAnchorIntroduction(element: Element) {
  return window.location.hash === '#about' && Boolean(element.closest('[data-about-intro]'));
}

export function createMotionScene(root: HTMLElement) {
  const manual: (() => void)[] = [];
  const context = gsap.context(() => {
    // Each heading has its own masks; no layout boxes or anchor targets move.
    root.querySelectorAll<HTMLElement>('[data-split]').forEach(split => {
      if (split.closest('[data-statement]') || isAnchorIntroduction(split)) return;
      const words = split.querySelectorAll('[data-motion-word]');
      if (!words.length) return;
      gsap.fromTo(words, { yPercent: 112, rotation: 2 }, {
        yPercent: 0, rotation: 0, duration: 0.78, stagger: 0.045,
        ease: 'power3.out', clearProps: 'transform',
        scrollTrigger: { trigger: split, start: 'top 96%', once: true },
      });
    });

    const reveals = root.matches('[data-reveal]') ? [root] : Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    reveals.forEach(element => {
      if (isAnchorIntroduction(element)) return;
      gsap.fromTo(element, { y: 26, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.7, ease: 'power3.out',
        clearProps: 'transform,opacity',
        scrollTrigger: { trigger: element, start: 'top 96%', once: true },
      });
    });

    const statement = root.querySelector<HTMLElement>('[data-statement]');
    if (statement) {
      const words = statement.querySelectorAll('[data-motion-word]');
      gsap.fromTo(words, { color: '#6b6b63' }, {
        color: '#11110f', stagger: 0.13, ease: 'none',
        scrollTrigger: { trigger: statement, start: 'top 88%', end: 'top 40%', scrub: 0.35 },
      });
      const signal = statement.nextElementSibling;
      if (signal) gsap.from(signal, {
        rotation: -70, scale: 0.7, duration: 1, ease: 'back.out(1.4)',
        scrollTrigger: { trigger: statement, start: 'top 93%', once: true },
      });
    }

    const belt = root.querySelector<HTMLElement>('[data-belt]');
    if (belt) {
      let active = false;
      let offset = 0;
      const cruisingSpeed = 46;
      let speed = cruisingSpeed;
      let impulse = 0;
      let width = Math.max(1, belt.scrollWidth / 2);
      let rotation = 0;
      const resize = new ResizeObserver(() => { width = Math.max(1, belt.scrollWidth / 2); });
      resize.observe(belt);
      const trigger = ScrollTrigger.create({
        trigger: root, start: 'top bottom', end: 'bottom top',
        onToggle: self => { active = self.isActive; },
        onUpdate: self => { impulse = gsap.utils.clamp(-150, 150, self.getVelocity() * 0.065); },
      });
      active = trigger.isActive;
      const tick = (_time: number, delta: number) => {
        if (!active || document.hidden) return;
        const dt = Math.min(delta, 40) / 1000;
        speed += (cruisingSpeed + impulse - speed) * (1 - Math.exp(-dt / 0.15));
        impulse *= Math.exp(-dt / 0.22);
        offset = ((offset + speed * dt) % width + width) % width;
        rotation += speed * dt * 0.22;
        belt.style.transform = 'translate3d(' + (-offset).toFixed(2) + 'px,0,0) skewX(' + gsap.utils.clamp(-3, 3, -speed / 80).toFixed(2) + 'deg)';
        belt.style.setProperty('--separator-rotation', rotation.toFixed(2) + 'deg');
      };
      gsap.ticker.add(tick);
      manual.push(() => { gsap.ticker.remove(tick); resize.disconnect(); trigger.kill(); belt.style.removeProperty('transform'); belt.style.removeProperty('--separator-rotation'); });
    }

    const portrait = root.querySelector<HTMLElement>('[data-portrait-reveal]');
    if (portrait && !isAnchorIntroduction(portrait)) gsap.fromTo(portrait, {
      clipPath: 'inset(12% 5% 12% 5% round 16px)', opacity: 0.65,
    }, {
      clipPath: 'inset(0% 0% 0% 0% round 16px)', opacity: 1, duration: 0.95, ease: 'power3.out',
      clearProps: 'clipPath,opacity', scrollTrigger: { trigger: portrait, start: 'top 95%', once: true },
    });

    root.querySelectorAll<HTMLElement>('[data-project-plate]').forEach((plate, index) => {
      const entrance = plate.querySelector<HTMLElement>('[data-work-enter]');
      if (entrance) gsap.fromTo(entrance, { y: 52, rotation: index % 2 ? 2 : -2, scale: 0.965 }, {
        y: 0, rotation: 0, scale: 1, duration: 0.88, ease: 'power3.out', clearProps: 'transform',
        scrollTrigger: { trigger: plate, start: 'top 96%', once: true },
      });
    });

    if (root.matches('[data-work-scene]')) {
      const responsive = gsap.matchMedia();
      responsive.add('(min-width:1100px) and (min-height:720px)', () => {
        const plates = Array.from(root.querySelectorAll<HTMLElement>('[data-project-plate]'));
        const heading = root.querySelector('[data-work-heading]');
        plates.forEach((plate, index) => {
          const travel = plate.querySelector('[data-work-travel]');
          const lean = plate.querySelector('[data-work-lean]');
          const drift = [35, -45, 30, -35][index] || 25;
          if (travel) gsap.fromTo(travel, { y: -drift }, {
            y: drift, ease: 'none', scrollTrigger: { trigger: plate, start: 'top bottom', end: 'bottom top', scrub: 0.45 },
          });
          if (lean) ScrollTrigger.create({
            trigger: plate, start: 'top bottom', end: 'bottom top',
            onUpdate: self => {
              gsap.to(lean, { rotation: gsap.utils.clamp(-0.65, 0.65, self.getVelocity() / 2500), duration: 0.5, overwrite: 'auto' });
            },
          });
        });
        if (heading && plates[0]) gsap.to(heading, {
          autoAlpha: 0, y: -14, ease: 'none',
          scrollTrigger: { trigger: plates[0], start: 'top 30%', end: 'top 22%', scrub: 0.15 },
        });
      });
      manual.push(() => responsive.revert());
    }

    const footerArrow = root.querySelector('[data-footer-arrow]');
    if (footerArrow) gsap.from(footerArrow, {
      rotation: -100, scale: 0.6, duration: 1.1, ease: 'back.out(1.4)',
      scrollTrigger: { trigger: footerArrow, start: 'top 96%', once: true },
    });
    const legal = root.querySelector('[data-footer-legal]');
    if (legal) gsap.fromTo(legal, { opacity: 0.75 }, {
      opacity: 1, duration: 0.7, clearProps: 'opacity',
      scrollTrigger: { trigger: legal, start: 'top 99%', once: true },
    });

    root.querySelectorAll<HTMLElement>('[data-magnetic]').forEach(element => {
      let rect: DOMRect | null = null;
      const enter = () => { rect = element.getBoundingClientRect(); };
      const move = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse' || !rect) return;
        gsap.to(element, { x: (event.clientX - rect.left - rect.width / 2) * 0.1, y: (event.clientY - rect.top - rect.height / 2) * 0.1, duration: 0.25, overwrite: 'auto' });
      };
      const leave = () => { rect = null; gsap.to(element, { x: 0, y: 0, duration: 0.5, ease: 'power3.out' }); };
      element.addEventListener('pointerenter', enter);
      element.addEventListener('pointermove', move);
      element.addEventListener('pointerleave', leave);
      manual.push(() => { element.removeEventListener('pointerenter', enter); element.removeEventListener('pointermove', move); element.removeEventListener('pointerleave', leave); gsap.set(element, { clearProps: 'transform' }); });
    });
  }, root);

  return () => { manual.reverse().forEach(stop => stop()); context.revert(); };
}

export function refreshMotion() { ScrollTrigger.refresh(); }
