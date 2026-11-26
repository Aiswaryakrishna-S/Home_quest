import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import './ScrollVilla3D.css';

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function segmentProgress(p, start, end) {
  return clamp01((p - start) / (end - start));
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── PROCEDURAL PBR ARCHITECTURAL TEXTURE GENERATORS ──

function createConcreteTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Warm alabaster architectural concrete base
  ctx.fillStyle = '#f2eee7';
  ctx.fillRect(0, 0, size, size);

  // Subtle architectural plaster / concrete micro-grain
  for (let i = 0; i < 6500; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const alpha = 0.015 + Math.random() * 0.025;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(120,112,102,${alpha})` : `rgba(255,255,255,${alpha})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Subtle modernist board-formed architectural panel seams
  ctx.strokeStyle = 'rgba(135, 128, 118, 0.14)';
  ctx.lineWidth = 1.5;
  for (let y = 128; y < size; y += 128) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  for (let x = 256; x < size; x += 256) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }

  // Subtle tie-rod dimples (authentic Tadao Ando concrete detail)
  ctx.fillStyle = 'rgba(120, 114, 106, 0.18)';
  for (let y = 64; y < size; y += 128) {
    for (let x = 64; x < size; x += 128) {
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function createWoodTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Rich warm natural cedar / teak base
  const grad = ctx.createLinearGradient(0, 0, size, 0);
  grad.addColorStop(0, '#b57b4a');
  grad.addColorStop(0.35, '#a86e3f');
  grad.addColorStop(0.7, '#bd8352');
  grad.addColorStop(1, '#a56b3d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Fine vertical natural wood grain fibers
  for (let i = 0; i < 420; i++) {
    const x = Math.random() * size;
    const w = 0.8 + Math.random() * 2.4;
    const dark = Math.random() > 0.35;
    ctx.fillStyle = dark
      ? `rgba(74, 42, 18, ${0.06 + Math.random() * 0.12})`
      : `rgba(230, 185, 138, ${0.05 + Math.random() * 0.08})`;
    ctx.fillRect(x, 0, w, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createTravertineTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#e2dbd0';
  ctx.fillRect(0, 0, size, size);

  // Subtle horizontal limestone veining
  for (let i = 0; i < 160; i++) {
    const y = Math.random() * size;
    ctx.fillStyle = `rgba(165, 155, 140, ${0.04 + Math.random() * 0.06})`;
    ctx.fillRect(0, y, size, 1 + Math.random() * 3);
  }

  // Clean large-format architectural paver grid
  ctx.strokeStyle = 'rgba(130, 122, 110, 0.22)';
  ctx.lineWidth = 2;
  const step = 128;
  for (let p = 0; p <= size; p += step) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function createWaterRippleTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 90; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const rx = 14 + Math.random() * 32;
    const ry = 6 + Math.random() * 14;
    const g = ctx.createRadialGradient(x, y, 1, x, y, rx);
    g.addColorStop(0, 'rgba(215, 215, 215, 0.22)');
    g.addColorStop(1, 'rgba(128, 128, 128, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.5, 2.5);
  return tex;
}

function createSoftShadowPadTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.16,
    size / 2,
    size / 2,
    size * 0.48
  );
  grad.addColorStop(0, 'rgba(20, 26, 36, 0.22)');
  grad.addColorStop(0.65, 'rgba(20, 26, 36, 0.08)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

export default function ScrollVilla3D() {
  const sectionRef = useRef(null);
  const canvasHostRef = useRef(null);
  const titleOverlayRef = useRef(null);
  const progressRef = useRef(0);
  const smoothProgressRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [scrollPct, setScrollPct] = useState(0);

  // Scroll tracking mapped cleanly across the landing runway -> [0, 1]
  useEffect(() => {
    const handleScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const totalScrollable = el.offsetHeight - window.innerHeight;
      if (totalScrollable <= 0) return;
      const clamped = clamp01(-rect.top / totalScrollable);
      progressRef.current = clamped;
      setScrollPct(Math.round(clamped * 100));
    };

    const handleMouseMove = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Three.js Photorealistic White-Studio Modernist Villa (Zero Trees)
  useEffect(() => {
    const container = canvasHostRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#ffffff');
    scene.fog = new THREE.Fog('#ffffff', 32, 74);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 150);
    camera.position.set(17, 10, 19);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // ── PHOTOREALISTIC STUDIO ENVIRONMENT MAP (IBL REFLECTIONS) ──
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.52;

    // ── ARCHITECTURAL STUDIO 3-POINT DAYLIGHT RIG ──
    const hemiLight = new THREE.HemisphereLight('#ffffff', '#e9e4dc', 0.85);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight('#fff8ed', 2.05);
    sunLight.position.set(16, 24, 15);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 65;
    sunLight.shadow.camera.left = -15;
    sunLight.shadow.camera.right = 15;
    sunLight.shadow.camera.top = 15;
    sunLight.shadow.camera.bottom = -15;
    sunLight.shadow.bias = -0.0003;
    sunLight.shadow.normalBias = 0.025;
    sunLight.shadow.radius = 2.8;
    scene.add(sunLight);

    const skyFillLight = new THREE.DirectionalLight('#ddeaff', 0.6);
    skyFillLight.position.set(-16, 13, -12);
    scene.add(skyFillLight);

    // Warm architectural interior & accent lighting (ramped in smoothly)
    const livingLight = new THREE.PointLight('#ffca7d', 0, 12, 1.5);
    livingLight.position.set(-2.0, 2.7, -0.4);
    scene.add(livingLight);

    const masterLight = new THREE.PointLight('#ffd494', 0, 12, 1.5);
    masterLight.position.set(1.6, 6.2, -0.6);
    scene.add(masterLight);

    const hearthLight = new THREE.PointLight('#ff9436', 0, 6, 1.8);
    hearthLight.position.set(-4.9, 1.3, -1.8);
    scene.add(hearthLight);

    // ── STUDIO SHADOW CATCHER & CONTACT AO PAD ──
    const studioFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.ShadowMaterial({ opacity: 0.16 })
    );
    studioFloor.rotation.x = -Math.PI / 2;
    studioFloor.position.y = -0.01;
    studioFloor.receiveShadow = true;
    scene.add(studioFloor);

    const aoTexture = createSoftShadowPadTexture();
    const aoPad = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 20),
      new THREE.MeshBasicMaterial({
        map: aoTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
    );
    aoPad.rotation.x = -Math.PI / 2;
    aoPad.position.y = 0.002;
    scene.add(aoPad);

    // ── PROCEDURAL PBR TEXTURES & MATERIALS ──
    const concreteTex = createConcreteTexture();
    const woodTex = createWoodTexture();
    const travertineTex = createTravertineTexture();
    const waterRippleTex = createWaterRippleTexture();

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    concreteTex.anisotropy = maxAniso;
    woodTex.anisotropy = maxAniso;
    travertineTex.anisotropy = maxAniso;

    const concreteMat = new THREE.MeshStandardMaterial({
      map: concreteTex,
      color: '#f8f5f0',
      roughness: 0.56,
      metalness: 0.02,
    });

    const concreteWarmMat = new THREE.MeshStandardMaterial({
      map: concreteTex,
      color: '#eae4da',
      roughness: 0.62,
      metalness: 0.03,
    });

    const basaltMat = new THREE.MeshStandardMaterial({
      color: '#262b33',
      roughness: 0.55,
      metalness: 0.16,
    });

    const travertineMat = new THREE.MeshStandardMaterial({
      map: travertineTex,
      color: '#ebe4d8',
      roughness: 0.64,
      metalness: 0.02,
    });

    const gravelMat = new THREE.MeshStandardMaterial({
      color: '#d4cec4',
      roughness: 0.92,
      metalness: 0.0,
    });

    const architecturalLawnMat = new THREE.MeshStandardMaterial({
      color: '#738f67',
      roughness: 0.9,
      metalness: 0.0,
    });

    const warmWoodMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      color: '#c98f5c',
      roughness: 0.48,
      metalness: 0.04,
    });

    const deepTeakMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      color: '#7d4d2a',
      roughness: 0.42,
      metalness: 0.06,
    });

    const anodizedFrameMat = new THREE.MeshStandardMaterial({
      color: '#181c22',
      roughness: 0.28,
      metalness: 0.84,
    });

    const brushedSteelMat = new THREE.MeshStandardMaterial({
      color: '#d4dae0',
      roughness: 0.22,
      metalness: 0.92,
    });

    const champagneBrassMat = new THREE.MeshStandardMaterial({
      color: '#d2b482',
      roughness: 0.25,
      metalness: 0.88,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#c4e0eb',
      roughness: 0.05,
      metalness: 0.05,
      transmission: 0.62,
      transparent: true,
      opacity: 0.46,
      ior: 1.52,
      reflectivity: 0.95,
      envMapIntensity: 1.3,
    });

    const railingGlassMat = new THREE.MeshPhysicalMaterial({
      color: '#d8edf5',
      roughness: 0.04,
      metalness: 0.04,
      transparent: true,
      opacity: 0.28,
      reflectivity: 0.98,
      envMapIntensity: 1.4,
    });

    const poolWaterMat = new THREE.MeshPhysicalMaterial({
      color: '#2ab3c6',
      roughness: 0.07,
      metalness: 0.04,
      bumpMap: waterRippleTex,
      bumpScale: 0.028,
      transparent: true,
      opacity: 0.82,
      reflectivity: 0.95,
      envMapIntensity: 1.25,
    });

    const poolMosaicMat = new THREE.MeshStandardMaterial({
      color: '#196978',
      roughness: 0.36,
      metalness: 0.08,
    });

    const interiorPlasterMat = new THREE.MeshStandardMaterial({
      color: '#f6efe4',
      emissive: new THREE.Color('#ffcb82'),
      emissiveIntensity: 0,
      roughness: 0.78,
    });

    const linenMat = new THREE.MeshStandardMaterial({
      color: '#dfd8cc',
      roughness: 0.9,
      metalness: 0.0,
    });

    const rugMat = new THREE.MeshStandardMaterial({
      color: '#cfc7ba',
      roughness: 0.95,
      metalness: 0.0,
    });

    const ledMat = new THREE.MeshStandardMaterial({
      color: '#fff4da',
      emissive: new THREE.Color('#ffb84d'),
      emissiveIntensity: 0,
      roughness: 0.15,
    });

    const hearthGlowMat = new THREE.MeshStandardMaterial({
      color: '#ffba66',
      emissive: new THREE.Color('#ff7a1a'),
      emissiveIntensity: 0,
      roughness: 0.2,
    });

    // Helper for crisp architectural chamfered slabs & clean geometric volumes
    const makeSlab = (w, h, d, mat, x, y, z, radius = 0.03) => {
      const r = Math.min(radius, w * 0.2, h * 0.2, d * 0.2);
      const geo =
        r > 0.005
          ? new RoundedBoxGeometry(w, h, d, 2, r)
          : new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };

    const makeBox = (w, h, d, mat, x, y, z) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };

    // ── MASTER ARCHITECTURAL ROOT ──
    const root = new THREE.Group();
    scene.add(root);

    // ── STAGE 0: MINIMAL ARCHITECTURAL DRAFTING GRID (Starts from nothing) ──
    const gridHelper = new THREE.GridHelper(24, 24, '#dad4ca', '#f0ece5');
    gridHelper.position.y = 0.004;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0;
    root.add(gridHelper);

    // ── STAGE 1: ARCHITECTURAL SITE PLINTH, COURTYARD, INFINITY POOL & STEPS ──
    const plotGroup = new THREE.Group();
    root.add(plotGroup);

    // Thin dark basalt site pedestal + clean perimeter architectural stone border
    const sitePedestal = makeSlab(17.8, 0.26, 14.2, basaltMat, 0, 0.13, 0.2, 0.03);
    const perimeterGravel = makeSlab(17.3, 0.08, 13.7, gravelMat, 0, 0.28, 0.2, 0.01);
    plotGroup.add(sitePedestal, perimeterGravel);

    // Flush inlaid minimalist courtyard lawn strips (clean geometry, NO trees)
    const lawnLeft = makeSlab(3.2, 0.07, 12.6, architecturalLawnMat, -6.7, 0.3, 0.2, 0.01);
    const lawnBack = makeSlab(11.4, 0.07, 2.2, architecturalLawnMat, 1.0, 0.3, -5.0, 0.01);
    const lawnFrontRight = makeSlab(3.0, 0.07, 2.2, architecturalLawnMat, 6.4, 0.3, 5.5, 0.01);
    plotGroup.add(lawnLeft, lawnBack, lawnFrontRight);

    // Honed travertine courtyard & foundation plinth
    const mainFoundation = makeSlab(12.0, 0.38, 8.2, concreteWarmMat, -0.2, 0.48, -0.9, 0.025);
    const interiorFloorSlab = makeSlab(11.6, 0.1, 7.8, travertineMat, -0.2, 0.72, -0.9, 0.01);
    const sunTerraceDeck = makeSlab(7.6, 0.24, 3.8, travertineMat, -2.0, 0.44, 4.1, 0.02);
    plotGroup.add(mainFoundation, interiorFloorSlab, sunTerraceDeck);

    // Architectural L-Shaped Infinity Lap Pool (front-right showcase)
    const poolWallOuter = makeSlab(5.2, 0.34, 4.0, concreteMat, 4.4, 0.46, 3.8, 0.02);
    const poolInnerBasin = makeBox(4.7, 0.16, 3.5, poolMosaicMat, 4.4, 0.56, 3.8);
    // Submerged pool entry steps
    const poolStep1 = makeBox(0.6, 0.12, 1.6, concreteWarmMat, 2.35, 0.58, 2.9);
    const poolStep2 = makeBox(0.45, 0.08, 1.6, concreteWarmMat, 2.85, 0.55, 2.9);
    const poolWater = makeBox(4.66, 0.06, 3.46, poolWaterMat, 4.4, 0.62, 3.8);
    poolWater.castShadow = false;
    plotGroup.add(poolWallOuter, poolInnerBasin, poolStep1, poolStep2, poolWater);

    // 5 Floating Monolithic Travertine Entry Stepping Stones + concealed LED strip
    for (let i = 0; i < 4; i++) {
      const zPos = 6.35 + i * 0.85;
      const stepSlab = makeSlab(2.3, 0.09, 0.62, travertineMat, -1.35, 0.42, zPos, 0.015);
      const stepGlow = makeBox(2.05, 0.025, 0.05, ledMat, -1.35, 0.36, zPos + 0.28);
      plotGroup.add(stepSlab, stepGlow);
    }

    // Designer Minimalist Poolside Sun Loungers + Travertine Side Table
    for (let i = 0; i < 2; i++) {
      const lx = 2.85 + i * 1.15;
      const frame = makeSlab(0.72, 0.12, 1.85, deepTeakMat, lx, 0.66, 1.15, 0.015);
      const cushion = makeSlab(0.66, 0.09, 1.74, linenMat, lx, 0.76, 1.15, 0.025);
      const headrest = makeSlab(0.62, 0.16, 0.38, linenMat, lx, 0.86, 0.48, 0.03);
      headrest.rotation.x = 0.42;
      plotGroup.add(frame, cushion, headrest);
    }
    const sideTable = makeSlab(0.45, 0.28, 0.45, travertineMat, 3.42, 0.72, 0.65, 0.02);
    plotGroup.add(sideTable);

    // ── STAGE 2: GROUND FLOOR CONCRETE VOLUMES, LUXURY INTERIORS & FULL-HEIGHT GLASS ──
    const groundFloorGroup = new THREE.Group();
    root.add(groundFloorGroup);

    // Architectural concrete shell (clean chamfered slabs with true thickness)
    const gfBackWall = makeSlab(11.8, 3.3, 0.42, concreteMat, -0.2, 2.42, -4.75, 0.025);
    const gfLeftFeatureWall = makeSlab(0.44, 3.3, 7.9, concreteMat, -5.95, 2.42, -0.95, 0.025);
    const gfRightCore = makeSlab(3.8, 3.3, 6.6, concreteMat, 3.7, 2.42, -1.5, 0.025);
    const gfInteriorPlaster = makeBox(9.4, 3.15, 0.14, interiorPlasterMat, -0.9, 2.38, -4.42);
    groundFloorGroup.add(gfBackWall, gfLeftFeatureWall, gfRightCore, gfInteriorPlaster);

    // Architectural Interior — Monolithic Basalt Hearth Fireplace
    const hearthMonolith = makeSlab(0.55, 3.15, 1.85, basaltMat, -5.42, 2.38, -1.65, 0.02);
    const hearthFireStrip = makeBox(0.12, 0.18, 1.15, hearthGlowMat, -5.12, 1.28, -1.65);
    groundFloorGroup.add(hearthMonolith, hearthFireStrip);

    // Designer Living Room Lounge (Area Rug, L-Sectional Sofa, Travertine Coffee Table)
    const areaRug = makeBox(4.4, 0.03, 3.4, rugMat, -2.5, 0.78, -1.55);
    const sofaMain = makeSlab(3.1, 0.36, 0.96, linenMat, -2.5, 0.98, -2.65, 0.04);
    const sofaChaise = makeSlab(0.96, 0.36, 1.85, linenMat, -3.57, 0.98, -1.75, 0.04);
    const sofaBack = makeSlab(3.1, 0.44, 0.22, linenMat, -2.5, 1.32, -3.02, 0.04);
    const coffeeTable = makeSlab(1.45, 0.24, 0.82, travertineMat, -2.35, 0.92, -1.25, 0.025);
    groundFloorGroup.add(areaRug, sofaMain, sofaChaise, sofaBack, coffeeTable);

    // Open-Plan Minimalist Kitchen Island + Linear Pendant Light
    const islandBody = makeSlab(2.35, 0.84, 0.88, deepTeakMat, 0.55, 1.2, -2.65, 0.015);
    const islandTop = makeSlab(2.42, 0.08, 0.94, travertineMat, 0.55, 1.66, -2.65, 0.015);
    const pendantBar = makeBox(1.8, 0.045, 0.045, anodizedFrameMat, 0.55, 3.15, -2.65);
    const pendantLed = makeBox(1.72, 0.025, 0.03, ledMat, 0.55, 3.12, -2.65);
    const pendantWireL = makeBox(0.015, 0.9, 0.015, anodizedFrameMat, -0.15, 3.6, -2.65);
    const pendantWireR = makeBox(0.015, 0.9, 0.015, anodizedFrameMat, 1.25, 3.6, -2.65);
    groundFloorGroup.add(islandBody, islandTop, pendantBar, pendantLed, pendantWireL, pendantWireR);

    // Cantilevered Floating Oak Staircase + Frameless Glass Balustrade
    for (let s = 0; s < 10; s++) {
      const tread = makeSlab(
        1.15,
        0.075,
        0.32,
        warmWoodMat,
        -4.95,
        1.02 + s * 0.31,
        -4.05 + s * 0.31,
        0.01
      );
      groundFloorGroup.add(tread);
    }
    const stairGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 1.05, 3.2),
      railingGlassMat
    );
    stairGlass.position.set(-4.35, 2.75, -2.55);
    stairGlass.rotation.x = -0.78;
    groundFloorGroup.add(stairGlass);

    // Expansive Floor-to-Ceiling Low-Iron Glass Curtain Walls + Dark Anodized Mullions
    const gfGlassFront = makeBox(7.2, 3.16, 0.07, glassMat, -2.1, 2.4, 2.65);
    gfGlassFront.castShadow = false;
    const gfGlassSide = makeBox(0.07, 3.16, 4.1, glassMat, 1.54, 2.4, 0.65);
    gfGlassSide.castShadow = false;
    groundFloorGroup.add(gfGlassFront, gfGlassSide);

    // Slim recessed architectural aluminum tracks & vertical mullions
    const gfTopTrack = makeBox(7.36, 0.11, 0.18, anodizedFrameMat, -2.1, 4.0, 2.65);
    const gfBottomTrack = makeBox(7.36, 0.08, 0.18, anodizedFrameMat, -2.1, 0.82, 2.65);
    const gfSideTopTrack = makeBox(0.18, 0.11, 4.2, anodizedFrameMat, 1.54, 4.0, 0.65);
    groundFloorGroup.add(gfTopTrack, gfBottomTrack, gfSideTopTrack);

    for (let x = -5.7; x <= 1.55; x += 1.81) {
      const mullion = makeBox(0.065, 3.2, 0.14, anodizedFrameMat, x, 2.41, 2.65);
      groundFloorGroup.add(mullion);
    }
    for (let z = -1.2; z <= 2.65; z += 1.92) {
      const sMullion = makeBox(0.14, 3.2, 0.065, anodizedFrameMat, 1.54, 2.41, z);
      groundFloorGroup.add(sMullion);
    }

    // ── STAGE 3: PRECISION WARM WOOD SLAT CLADDING, PIVOT ENTRY & STEEL COLUMNS ──
    const woodGroup = new THREE.Group();
    root.add(woodGroup);

    // Recessed dark shadow-backing plane behind vertical wood slats for crisp shadow depth
    const slatBackingFront = makeBox(3.85, 3.22, 0.08, basaltMat, 3.7, 2.42, 1.82);
    woodGroup.add(slatBackingFront);

    const slats = [];
    // Front natural warm cedar slat screen (cascades smoothly slat-by-slat)
    for (let i = 0; i < 20; i++) {
      const slat = makeSlab(0.095, 3.22, 0.15, warmWoodMat, 1.84 + i * 0.195, 2.42, 1.92, 0.01);
      slat.userData.baseY = 2.42;
      slat.userData.delay = i / 20;
      slats.push(slat);
      woodGroup.add(slat);
    }

    // Side architectural wood louver fin screen along west patio edge
    for (let i = 0; i < 10; i++) {
      const slat = makeSlab(0.14, 3.22, 0.085, warmWoodMat, -6.08, 2.42, 0.05 + i * 0.27, 0.01);
      slat.userData.baseY = 2.42;
      slat.userData.delay = i / 12;
      slats.push(slat);
      woodGroup.add(slat);
    }

    // Monumental Oversized Teak Pivot Door in Dark Portal Frame + Brushed Brass Pull
    const doorFrameTop = makeBox(1.66, 0.12, 0.24, anodizedFrameMat, 0.55, 3.92, 2.62);
    const doorFrameL = makeBox(0.1, 3.1, 0.24, anodizedFrameMat, -0.22, 2.4, 2.62);
    const doorFrameR = makeBox(0.1, 3.1, 0.24, anodizedFrameMat, 1.32, 2.4, 2.62);
    const pivotDoor = makeSlab(1.42, 3.02, 0.14, deepTeakMat, 0.55, 2.36, 2.6, 0.015);
    const brassPull = makeSlab(0.04, 1.45, 0.07, champagneBrassMat, 1.04, 2.32, 2.71, 0.01);
    woodGroup.add(doorFrameTop, doorFrameL, doorFrameR, pivotDoor, brassPull);

    // Slender structural dark steel corner columns supporting the dramatic cantilever
    const cornerColFL = makeSlab(0.28, 3.3, 0.28, anodizedFrameMat, -5.85, 2.42, 2.7, 0.015);
    const cornerColFR = makeSlab(0.24, 3.3, 0.24, anodizedFrameMat, 5.55, 2.42, 1.85, 0.015);
    woodGroup.add(cornerColFL, cornerColFR);

    // ── STAGE 4: DRAMATIC CANTILEVERED 2ND FLOOR MASTER WING & FRAMELESS GLASS BALCONY ──
    const secondFloorGroup = new THREE.Group();
    root.add(secondFloorGroup);

    // Sculptural overhanging cantilevered 2nd-floor concrete slab + dark drip fascia + cedar soffit
    const sfCantileverSlab = makeSlab(13.8, 0.36, 9.6, concreteMat, 0.35, 4.24, -0.1, 0.03);
    const sfShadowGapTrim = makeBox(13.86, 0.075, 9.66, anodizedFrameMat, 0.35, 4.41, -0.1);
    const sfCedarSoffit = makeBox(13.2, 0.06, 3.4, warmWoodMat, 0.35, 4.04, 2.9);
    const sfTerraceFloor = makeBox(13.4, 0.06, 9.2, travertineMat, 0.35, 4.44, -0.1);
    secondFloorGroup.add(sfCantileverSlab, sfShadowGapTrim, sfCedarSoffit, sfTerraceFloor);

    // Asymmetric Master Suite Concrete Pavilion
    const sfBackWall = makeSlab(10.4, 3.15, 0.4, concreteMat, 1.75, 6.02, -4.35, 0.025);
    const sfRightWall = makeSlab(0.4, 3.15, 8.0, concreteMat, 6.8, 6.02, -0.5, 0.025);
    const sfLeftWall = makeSlab(0.4, 3.15, 6.0, concreteMat, -3.25, 6.02, -1.5, 0.025);
    const sfInteriorBack = makeBox(9.8, 3.0, 0.14, interiorPlasterMat, 1.75, 5.96, -4.02);
    secondFloorGroup.add(sfBackWall, sfRightWall, sfLeftWall, sfInteriorBack);

    // Upper Master Suite Interior (Minimalist Platform Bed + Warm Glowing Cove Headboard)
    const headboardPanel = makeSlab(3.2, 1.5, 0.14, deepTeakMat, 1.4, 5.35, -3.85, 0.02);
    const headboardLed = makeBox(3.15, 0.05, 0.05, ledMat, 1.4, 6.12, -3.88);
    const bedPlatform = makeSlab(2.35, 0.3, 2.45, deepTeakMat, 1.4, 4.64, -2.5, 0.02);
    const bedMattress = makeSlab(2.15, 0.28, 2.25, linenMat, 1.4, 4.92, -2.5, 0.04);
    const pillowL = makeSlab(0.82, 0.16, 0.46, concreteMat, 0.9, 5.14, -3.25, 0.04);
    const pillowR = makeSlab(0.82, 0.16, 0.46, concreteMat, 1.9, 5.14, -3.25, 0.04);
    secondFloorGroup.add(headboardPanel, headboardLed, bedPlatform, bedMattress, pillowL, pillowR);

    // Upper Floor Warm Wood Slat Feature Wall + Architectural Brise-Soleil Privacy Fins
    const sfWoodBacking = makeBox(2.55, 3.12, 0.08, basaltMat, 5.4, 6.02, 3.35);
    secondFloorGroup.add(sfWoodBacking);
    for (let i = 0; i < 12; i++) {
      const uSlat = makeSlab(0.095, 3.12, 0.14, warmWoodMat, 4.24 + i * 0.205, 6.02, 3.44, 0.01);
      secondFloorGroup.add(uSlat);
    }

    // Expansive Upper Floor-to-Ceiling Glass Sliding Facade + Slim Anodized Frames
    const sfGlassFront = makeBox(7.4, 3.04, 0.07, glassMat, 0.45, 6.0, 2.15);
    sfGlassFront.castShadow = false;
    secondFloorGroup.add(sfGlassFront);

    const sfTopTrack = makeBox(7.55, 0.1, 0.16, anodizedFrameMat, 0.45, 7.52, 2.15);
    const sfBottomTrack = makeBox(7.55, 0.08, 0.16, anodizedFrameMat, 0.45, 4.49, 2.15);
    secondFloorGroup.add(sfTopTrack, sfBottomTrack);

    for (let x = -3.25; x <= 4.18; x += 1.85) {
      const m = makeBox(0.065, 3.06, 0.14, anodizedFrameMat, x, 6.0, 2.15);
      secondFloorGroup.add(m);
    }

    // Wrap-Around Frameless Tempered Glass Terrace Balustrade + Recessed Channel & Steel Spigots
    const railingGroup = new THREE.Group();
    const frontChannel = makeBox(13.5, 0.08, 0.1, anodizedFrameMat, 0.35, 4.49, 4.62);
    const leftChannel = makeBox(0.1, 0.08, 9.2, anodizedFrameMat, -6.42, 4.49, -0.02);
    const frontRailGlass = makeBox(13.45, 1.02, 0.045, railingGlassMat, 0.35, 5.02, 4.62);
    frontRailGlass.castShadow = false;
    const leftRailGlass = makeBox(0.045, 1.02, 9.15, railingGlassMat, -6.42, 5.02, -0.02);
    leftRailGlass.castShadow = false;
    const frontCap = makeBox(13.52, 0.032, 0.065, brushedSteelMat, 0.35, 5.54, 4.62);
    const leftCap = makeBox(0.065, 0.032, 9.22, brushedSteelMat, -6.42, 5.54, -0.02);
    railingGroup.add(
      frontChannel,
      leftChannel,
      frontRailGlass,
      leftRailGlass,
      frontCap,
      leftCap
    );

    for (let x = -6.0; x <= 6.6; x += 2.1) {
      const spigot = makeBox(0.065, 0.18, 0.09, brushedSteelMat, x, 4.56, 4.62);
      railingGroup.add(spigot);
    }
    secondFloorGroup.add(railingGroup);

    // ── STAGE 5: ULTRA-THIN FLOATING FLAT ROOF, SKYLIGHT, PERGOLA & WARM LED FASCIA ──
    const roofGroup = new THREE.Group();
    root.add(roofGroup);

    // Sculptural overhanging geometric concrete roofline + mitered dark coping + recessed cedar soffit
    const mainRoof = makeSlab(12.2, 0.32, 10.0, concreteMat, 1.65, 7.74, -0.1, 0.025);
    const roofCoping = makeSlab(12.34, 0.11, 10.14, anodizedFrameMat, 1.65, 7.9, -0.1, 0.015);
    const roofCedarSoffit = makeBox(11.7, 0.055, 2.75, warmWoodMat, 1.65, 7.56, 3.45);
    roofGroup.add(mainRoof, roofCoping, roofCedarSoffit);

    // Framed Minimalist Architectural Roof Skylight
    const skylightFrame = makeSlab(3.2, 0.14, 2.2, anodizedFrameMat, 1.6, 8.0, -1.6, 0.015);
    const skylightGlass = makeBox(2.96, 0.06, 1.96, glassMat, 1.6, 8.04, -1.6);
    skylightGlass.castShadow = false;
    roofGroup.add(skylightFrame, skylightGlass);

    // Precision Architectural Timber Louver Pergola over the Left Upper Terrace
    const pergolaBeamFront = makeSlab(3.7, 0.2, 0.16, anodizedFrameMat, -4.65, 7.7, 2.65, 0.01);
    const pergolaBeamBack = makeSlab(3.7, 0.2, 0.16, anodizedFrameMat, -4.65, 7.7, -3.95, 0.01);
    const pergolaSide = makeSlab(0.16, 0.2, 6.76, anodizedFrameMat, -6.42, 7.7, -0.65, 0.01);
    const pergolaPostFL = makeSlab(0.16, 3.25, 0.16, anodizedFrameMat, -6.42, 6.08, 2.65, 0.01);
    const pergolaPostBL = makeSlab(0.16, 3.25, 0.16, anodizedFrameMat, -6.42, 6.08, -3.95, 0.01);
    roofGroup.add(pergolaBeamFront, pergolaBeamBack, pergolaSide, pergolaPostFL, pergolaPostBL);

    for (let z = -3.65; z <= 2.4; z += 0.48) {
      const louver = makeSlab(3.55, 0.09, 0.065, warmWoodMat, -4.65, 7.72, z, 0.008);
      roofGroup.add(louver);
    }

    // Continuous Integrated Warm LED Architectural Fascia Lighting Strips
    const ledRoofFront = makeBox(11.85, 0.05, 0.065, ledMat, 1.65, 7.55, 4.78);
    const ledRoofLeft = makeBox(0.065, 0.05, 9.6, ledMat, -4.32, 7.55, -0.1);
    const ledCantileverFront = makeBox(13.4, 0.05, 0.065, ledMat, 0.35, 4.03, 4.58);
    const ledCantileverLeft = makeBox(0.065, 0.05, 9.2, ledMat, -6.42, 4.03, -0.05);
    const ledPatioEdge = makeBox(7.3, 0.045, 0.06, ledMat, -2.0, 0.35, 5.98);
    const ledPoolUnderlip = makeBox(4.8, 0.045, 0.06, ledMat, 4.4, 0.56, 5.75);
    roofGroup.add(
      ledRoofFront,
      ledRoofLeft,
      ledCantileverFront,
      ledCantileverLeft,
      ledPatioEdge,
      ledPoolUnderlip
    );

    // Subtle minimalist architectural courtyard bollard lights (clean metal posts, NO trees)
    const bollardsGroup = new THREE.Group();
    root.add(bollardsGroup);
    for (let i = 0; i < 3; i++) {
      const zPos = 6.35 + i * 1.1;
      const post = makeSlab(0.08, 0.42, 0.08, anodizedFrameMat, -0.02, 0.51, zPos, 0.01);
      const lens = makeBox(0.088, 0.065, 0.088, ledMat, -0.02, 0.72, zPos);
      bollardsGroup.add(post, lens);
    }

    // ── SMOOTH ANIMATION LOOP ──
    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Buttery smooth scroll interpolation
      const targetP = progressRef.current;
      smoothProgressRef.current += (targetP - smoothProgressRef.current) * 0.085;
      const p = smoothProgressRef.current;

      // Opening Brand Title ("HomeQuest AI") — crisp on pure white at 0%, dissolves seamlessly as scrolling starts
      if (titleOverlayRef.current) {
        const titleOut = easeOutCubic(segmentProgress(p, 0.0, 0.11));
        const op = Math.max(0, 1 - titleOut);
        titleOverlayRef.current.style.opacity = String(op);
        titleOverlayRef.current.style.transform = `translate3d(0, ${(-titleOut * 52).toFixed(2)}px, 0) scale(${(1 - titleOut * 0.055).toFixed(4)})`;
        titleOverlayRef.current.style.filter = titleOut > 0.01 ? `blur(${(titleOut * 7).toFixed(2)}px)` : 'none';
        titleOverlayRef.current.style.visibility = op <= 0.004 ? 'hidden' : 'visible';
      }

      // 0. Subtle Drafting Grid (invisible at 0% white title screen, fades in once scrolling begins)
      const gridIn = easeOutCubic(segmentProgress(p, 0.03, 0.14));
      const gridOut = 1 - segmentProgress(p, 0.68, 0.94);
      gridHelper.material.opacity = gridIn * gridOut * 0.42;

      // Studio ambient occlusion shadow pad grows with plinth
      const pPlot = easeOutCubic(segmentProgress(p, 0.07, 0.26));
      aoPad.material.opacity = pPlot * 0.72;

      // 1. Site Plinth, Courtyard, Infinity Pool & Floating Steps (0.07 -> 0.26)
      plotGroup.visible = pPlot > 0.001;
      plotGroup.scale.set(
        0.9 + 0.1 * pPlot,
        Math.max(0.001, pPlot),
        0.9 + 0.1 * pPlot
      );
      plotGroup.position.y = (1 - pPlot) * -0.85;

      // 2. Ground Floor Concrete Shell, Interior & Full-Height Glazing (0.22 -> 0.45)
      const pGF = easeOutCubic(segmentProgress(p, 0.22, 0.45));
      groundFloorGroup.visible = pGF > 0.001;
      groundFloorGroup.scale.set(1, Math.max(0.001, pGF), 1);
      groundFloorGroup.position.y = (1 - pGF) * -0.25;

      // 3. Natural Warm Wood Slat Cladding Cascade & Pivot Entry (0.38 -> 0.60)
      const pWood = segmentProgress(p, 0.38, 0.60);
      woodGroup.visible = pWood > 0.001;
      slats.forEach((slat) => {
        const localT = easeOutCubic(
          clamp01((pWood - slat.userData.delay * 0.45) / 0.55)
        );
        slat.scale.y = Math.max(0.001, localT);
        slat.position.y = slat.userData.baseY - (1 - localT) * 1.4;
      });
      const entryT = easeOutCubic(segmentProgress(p, 0.44, 0.60));
      pivotDoor.scale.y = Math.max(0.001, entryT);
      brassPull.scale.y = Math.max(0.001, entryT);
      cornerColFL.scale.y = Math.max(0.001, entryT);
      cornerColFR.scale.y = Math.max(0.001, entryT);

      // 4. Cantilevered 2nd Floor Master Wing & Frameless Glass Balustrade (0.54 -> 0.78)
      const pSF = easeOutCubic(segmentProgress(p, 0.54, 0.76));
      secondFloorGroup.visible = pSF > 0.001;
      secondFloorGroup.position.y = (1 - pSF) * 2.4;
      secondFloorGroup.scale.set(
        0.94 + 0.06 * pSF,
        Math.max(0.001, pSF),
        0.94 + 0.06 * pSF
      );

      const pRail = easeOutCubic(segmentProgress(p, 0.66, 0.80));
      railingGroup.visible = pRail > 0.001;
      railingGroup.position.y = (1 - pRail) * -0.45;

      // 5. Ultra-Thin Floating Flat Roof, Pergola, Warm LED Fascia & Bollards (0.74 -> 0.96)
      const pRoof = easeOutCubic(segmentProgress(p, 0.74, 0.90));
      roofGroup.visible = pRoof > 0.001;
      roofGroup.position.y = (1 - pRoof) * 2.6;

      const pBollards = easeOutCubic(segmentProgress(p, 0.82, 0.96));
      bollardsGroup.visible = pBollards > 0.001;
      bollardsGroup.scale.set(1, Math.max(0.001, pBollards), 1);

      // Warm LED Fascia, Interior Glow & Fireplace Hearth Illumination
      const pGlow = easeInOutCubic(segmentProgress(p, 0.78, 1.0));
      ledMat.emissiveIntensity = pGlow * 2.4;
      hearthGlowMat.emissiveIntensity = pGlow * 2.6;
      interiorPlasterMat.emissiveIntensity = pGlow * 0.28;
      livingLight.intensity = pGlow * 2.8;
      masterLight.intensity = pGlow * 2.6;
      hearthLight.intensity = pGlow * 1.8;

      // Animated subtle ripple shimmer across the infinity pool surface
      waterRippleTex.offset.x = elapsed * 0.025;
      waterRippleTex.offset.y = elapsed * 0.018;
      poolWater.position.y = 0.62 + Math.sin(elapsed * 1.8) * 0.005;

      // Cinematic Architectural Camera Sweep (high isometric -> sculpted low 3/4 luxury hero)
      const angle = -0.56 + p * 1.24 + mouseRef.current.x * 0.065;
      const radius = 22.8 - p * 3.8;
      const camY = 13.6 - easeInOutCubic(p) * 7.4 + mouseRef.current.y * -0.4;

      camera.position.x = Math.sin(angle) * radius;
      camera.position.z = Math.cos(angle) * radius;
      camera.position.y = Math.max(3.8, camY);
      camera.lookAt(0.15, 2.35 + p * 0.65, 0);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      envRT.dispose();
      roomEnv.dispose();
      pmremGenerator.dispose();
      concreteTex.dispose();
      woodTex.dispose();
      travertineTex.dispose();
      waterRippleTex.dispose();
      aoTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <section
      className="sv3d-scroll-runway"
      ref={sectionRef}
      aria-label="3D Architectural Villa Landing Showcase"
    >
      <div className="sv3d-sticky-stage">
        {/* Three.js Pure White Studio Canvas */}
        <div className="sv3d-canvas-host" ref={canvasHostRef} />

        {/* Centered Pure-White Opening Brand Screen (dissolves immediately on scroll) */}
        <div className="sv3d-brand-splash" ref={titleOverlayRef}>
          <div className="sv3d-brand-inner">
            <span className="sv3d-brand-eyebrow">ARCHITECTURAL REAL ESTATE INTELLIGENCE</span>
            <h1 className="sv3d-brand-wordmark">
              HomeQuest <em>AI</em>
            </h1>
            <div className="sv3d-brand-rule" />
            <p className="sv3d-brand-tagline">Find the right home, the smart way</p>
          </div>
        </div>

        {/* Ultra-clean minimal bottom scroll indicator only */}
        <div className={`sv3d-minimal-footer ${scrollPct >= 95 ? 'done' : ''}`}>
          <div className="sv3d-thin-track">
            <div className="sv3d-thin-fill" style={{ width: `${scrollPct}%` }} />
          </div>
          {scrollPct < 4 && (
            <span className="sv3d-whisper-hint">Scroll to begin ↓</span>
          )}
        </div>
      </div>
    </section>
  );
}
