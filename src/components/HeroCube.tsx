'use client';

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import * as THREE from 'three';
import s from './HeroCube.module.css';

export type HeroCubeHandle = {
  /** Rotation offsets in degrees, relative to the currently selected face. */
  setDrag: (x: number, y: number) => void;
  release: () => void;
};

const radians = Math.PI / 180;
const restX = 0.06;
const restY = -0.10;

/** The original soft B tile, extruded into a solid with a rounded rim. */
export function HeroCube({ flipped, cubeRef }: { flipped: boolean; cubeRef: Ref<HeroCubeHandle> }) {
  const host = useRef<HTMLSpanElement>(null);
  const desired = useRef({ x: 0, y: 0, flipped });
  const wake = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);

  useImperativeHandle(cubeRef, () => ({
    setDrag(x, y) { desired.current.x = x * radians; desired.current.y = y * radians; wake.current(); },
    release() { desired.current.x = desired.current.y = 0; wake.current(); },
  }), []);

  useEffect(() => { desired.current.flipped = flipped; wake.current(); }, [flipped]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let disposed = false, frame = 0, lastTime = 0, visible = true, contextLost = false;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      // A readable face stays available when WebGL is unavailable or disabled.
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    element.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1.9, 1.9, 1.9, -1.9, 0.1, 30);
    camera.position.set(0, 0, 6.7);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x514839, 1.8));
    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(-3, 5, 6); scene.add(key);
    const fill = new THREE.DirectionalLight(0xffb58a, 0.5);
    fill.position.set(4, -1, -3); scene.add(fill);

    const textures: THREE.CanvasTexture[] = [];
    const makeTexture = (face: 'front' | 'back') => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 768;
      const context = canvas.getContext('2d')!;
      context.fillStyle = '#f5f4f0'; context.fillRect(0, 0, 768, 768);
      context.fillStyle = '#11110f';
      context.textAlign = 'left'; context.textBaseline = 'alphabetic';
      if (face === 'front') {
        context.font = '800 632px Geist, Arial, sans-serif';
        context.shadowColor = '#73736b'; context.shadowOffsetX = 3; context.shadowOffsetY = 5;
        context.fillText('B', 115, 615);
        const periodX = 115 + context.measureText('B').width - 55;
        context.font = '800 316px Geist, Arial, sans-serif';
        context.fillStyle = '#f36b32'; context.shadowColor = '#a84b25';
        context.fillText('.', periodX, 615);
      } else if (face === 'back') {
        context.font = '550 116px Geist, Arial, sans-serif';
        context.fillText('Make it', 72, 320); context.fillText('useful', 72, 435);
        const periodX = 72 + context.measureText('useful').width + 14;
        context.fillStyle = '#f36b32'; context.beginPath(); context.arc(periodX, 423, 13, 0, Math.PI * 2); context.fill();
        context.strokeStyle = '#f36b32'; context.lineWidth = 13; context.lineCap = 'round'; context.lineJoin = 'round';
        context.beginPath(); context.moveTo(117, 592); context.lineTo(205, 504); context.moveTo(123, 504); context.lineTo(205, 504); context.lineTo(205, 586); context.stroke();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      textures.push(texture);
      return texture;
    };
    const materials = Array.from({ length: 3 }, () => new THREE.MeshStandardMaterial({ color: '#f5f4f0', roughness: 0.4, metalness: 0.03 }));
    const half = 1.18, radius = 0.60;
    const outline = new THREE.Shape();
    outline.moveTo(-half + radius, -half);
    outline.lineTo(half - radius, -half);
    outline.quadraticCurveTo(half, -half, half, -half + radius);
    outline.lineTo(half, half - radius);
    outline.quadraticCurveTo(half, half, half - radius, half);
    outline.lineTo(-half + radius, half);
    outline.quadraticCurveTo(-half, half, -half, half - radius);
    outline.lineTo(-half, -half + radius);
    outline.quadraticCurveTo(-half, -half, -half + radius, -half);
    const geometry = new THREE.ExtrudeGeometry(outline, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 8, curveSegments: 32, steps: 1 });
    geometry.center();
    // Distinct cap textures, mirrored rear UVs, and a plain softly lit rim.
    const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal'), uvs = geometry.getAttribute('uv');
    geometry.clearGroups();
    let groupStart = 0, previousMaterial = -1;
    for (let vertex = 0; vertex < positions.count; vertex += 3) {
      const normalZ = (normals.getZ(vertex) + normals.getZ(vertex + 1) + normals.getZ(vertex + 2)) / 3;
      const material = normalZ > 0.999 ? 0 : normalZ < -0.999 ? 1 : 2;
      if (material !== previousMaterial) {
        if (previousMaterial >= 0) geometry.addGroup(groupStart, vertex - groupStart, previousMaterial);
        groupStart = vertex; previousMaterial = material;
      }
      if (material < 2) for (let corner = vertex; corner < vertex + 3; corner++) {
        const u = (positions.getX(corner) + half) / (half * 2);
        uvs.setXY(corner, material === 1 ? 1 - u : u, (positions.getY(corner) + half) / (half * 2));
      }
    }
    geometry.addGroup(groupStart, positions.count - groupStart, previousMaterial);
    const cube = new THREE.Mesh(geometry, materials);
    cube.rotation.set(restX, restY + (desired.current.flipped ? Math.PI : 0), 0);
    const display = new THREE.Group();
    display.rotation.z = Math.PI / 20;
    display.add(cube);
    scene.add(display);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const velocity = { x: 0, y: 0 };

    const render = (time: number) => {
      frame = 0;
      if (disposed || !visible || document.hidden || contextLost) { lastTime = 0; return; }
      const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.032) : 1 / 60;
      lastTime = time;
      const targetX = restX + desired.current.x;
      const targetY = restY + (desired.current.flipped ? Math.PI : 0) + desired.current.y;
      if (reduced.matches) {
        cube.rotation.x = targetX; cube.rotation.y = targetY; velocity.x = velocity.y = 0;
      } else {
        // A slightly underdamped spring returns the physical object to its chosen face.
        velocity.x += ((targetX - cube.rotation.x) * 150 - velocity.x * 22) * dt;
        velocity.y += ((targetY - cube.rotation.y) * 150 - velocity.y * 22) * dt;
        cube.rotation.x += velocity.x * dt; cube.rotation.y += velocity.y * dt;
      }
      const moving = !reduced.matches && Math.abs(targetX - cube.rotation.x) + Math.abs(targetY - cube.rotation.y) + Math.abs(velocity.x) + Math.abs(velocity.y) > 0.001;
      if (!moving) { cube.rotation.x = targetX; cube.rotation.y = targetY; velocity.x = velocity.y = 0; }
      element.dataset.rotationX = cube.rotation.x.toFixed(4);
      element.dataset.rotationY = cube.rotation.y.toFixed(4);
      renderer.render(scene, camera);
      if (moving) frame = requestAnimationFrame(render);
      else lastTime = 0;
    };
    const start = () => { if (!disposed && !frame && visible && !document.hidden && !contextLost) frame = requestAnimationFrame(render); };
    wake.current = start;
    const resize = new ResizeObserver(() => {
      const width = element.clientWidth, height = element.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.left = -1.9 * width / height; camera.right = 1.9 * width / height;
      camera.updateProjectionMatrix(); start();
    });
    resize.observe(element);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start(); else { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
    });
    observer.observe(element);
    const visibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; } else start(); };
    const lost = (event: Event) => { event.preventDefault(); contextLost = true; cancelAnimationFrame(frame); frame = 0; setReady(false); };
    const restored = () => { contextLost = false; setReady(true); start(); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    renderer.domElement.addEventListener('webglcontextrestored', restored);
    document.addEventListener('visibilitychange', visibility);
    reduced.addEventListener('change', start);

    document.fonts.ready.then(() => {
      if (disposed) return;
      materials[0].map = makeTexture('front'); materials[1].map = makeTexture('back');
      materials.forEach(material => { material.needsUpdate = true; });
      setReady(true); start();
    });
    start();
    return () => {
      disposed = true; wake.current = () => {}; cancelAnimationFrame(frame);
      resize.disconnect(); observer.disconnect();
      document.removeEventListener('visibilitychange', visibility); reduced.removeEventListener('change', start);
      renderer.domElement.removeEventListener('webglcontextlost', lost); renderer.domElement.removeEventListener('webglcontextrestored', restored);
      geometry.dispose(); materials.forEach(material => material.dispose()); textures.forEach(texture => texture.dispose());
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  }, []);

  return <span ref={host} className={s.cube} data-cube-renderer data-ready={ready} data-face={flipped ? 'back' : 'front'} aria-hidden="true">
    <span className={s.fallback}>{flipped ? <span>Make it<br />useful<span className={s.dot}>.</span></span> : <span className={s.b}>B<span className={s.dot}>.</span></span>}</span>
  </span>;
}
