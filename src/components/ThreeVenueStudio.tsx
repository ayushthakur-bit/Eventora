import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Sparkles,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Eye,
  Check,
  RotateCcw,
  Sliders,
  Palette,
  Users,
  Compass,
  Layers,
  Save,
  ArrowLeft,
} from 'lucide-react';
import { useEvents } from '../context/EventContext';
import { VenueType, ThemeType } from '../types';

// Pre-allocated scratch objects to prevent garbage collection spikes in 60fps render loop
const _vec3 = new THREE.Vector3();
const _targetVec = new THREE.Vector3();
const _posA = new THREE.Vector3();
const _posB = new THREE.Vector3();

// Detect software WebGL safely without user-agent sniffing
const isSoftwareGl = (() => {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
})();

// Helper to create a procedural marble/tile canvas texture with zero external 404 dependencies
function createProceduralTileTexture(isDark: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = isDark ? '#1a1f2c' : '#f8fafc';
  ctx.fillRect(0, 0, 512, 512);

  // Tile grid lines
  ctx.strokeStyle = isDark ? '#2a3347' : '#e2e8f0';
  ctx.lineWidth = 3;
  const gridSize = 64;
  for (let x = 0; x <= 512; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Subtle marble vein noise
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * 512, 0);
    ctx.bezierCurveTo(
      Math.random() * 512,
      170,
      Math.random() * 512,
      340,
      Math.random() * 512,
      512
    );
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Helper to create a procedural royal carpet runner texture
function createCarpetTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep royal velvet red
  ctx.fillStyle = '#6b1124';
  ctx.fillRect(0, 0, 256, 512);

  // Gold ornate border
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 12;
  ctx.strokeRect(10, 10, 236, 492);

  ctx.strokeStyle = '#f5e08b';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, 216, 472);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

interface ThreeVenueStudioProps {
  onBackToOverview?: () => void;
}

export const ThreeVenueStudio: React.FC<ThreeVenueStudioProps> = ({ onBackToOverview }) => {
  const { activeEvent, updateEvent } = useEvents();

  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Dynamic Scene Elements references
  const stageGroupRef = useRef<THREE.Group | null>(null);
  const tablesGroupRef = useRef<THREE.Group | null>(null);
  const floorMeshRef = useRef<THREE.Mesh | null>(null);
  const lightingGroupRef = useRef<THREE.Group | null>(null);
  const environmentGroupRef = useRef<THREE.Group | null>(null);

  // Exploded parts groups
  const explodedLevel1Ref = useRef<THREE.Group | null>(null); // Tables & Chairs (low lift)
  const explodedLevel2Ref = useRef<THREE.Group | null>(null); // Stage Podium & Altar (med lift)
  const explodedLevel3Ref = useRef<THREE.Group | null>(null); // Pillars, Trusses & Arches (high lift)
  const explodedLevel4Ref = useRef<THREE.Group | null>(null); // Canopies & Chandeliers (highest lift)

  // Interactive State connected directly to Event Details
  const [venueSetting, setVenueSetting] = useState<VenueType>(activeEvent?.venueType || 'Mixed');
  const [themeMode, setThemeMode] = useState<ThemeType>(activeEvent?.theme || 'Traditional');
  const [guestCountInput, setGuestCountInput] = useState<number>(activeEvent?.guestCount || 200);
  const [decorTier, setDecorTier] = useState<'Minimal' | 'Standard' | 'Grand'>('Grand');

  // 3D Controls
  const [explodedView, setExplodedView] = useState<number>(0);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'layout' | 'theme' | 'camera'>('layout');
  const [savedSuccessToast, setSavedSuccessToast] = useState(false);

  // Camera Target
  const targetCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 12, 24));
  const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.5, 0));

  // Sync state if activeEvent changes
  useEffect(() => {
    if (activeEvent) {
      setVenueSetting(activeEvent.venueType);
      setThemeMode(activeEvent.theme);
      setGuestCountInput(activeEvent.guestCount);
    }
  }, [activeEvent?.id]);

  // Mount Three.js Scene
  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Atmosphere
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const horizonColor = venueSetting === 'Outdoor' ? 0x0f172a : 0x090d16;
    scene.background = new THREE.Color(horizonColor);
    scene.fog = new THREE.FogExp2(horizonColor, 0.022);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 14, 26);
    camera.lookAt(0, 1.5, 0);
    cameraRef.current = camera;

    // 3. Renderer with PBR Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Studio Environment Reflection via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. OrbitControls with Damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.04; // Don't clip below floor
    controls.minDistance = 4;
    controls.maxDistance = 48;
    controls.target.set(0, 1.5, 0);

    // 6. Lighting Rig
    const lightingGroup = new THREE.Group();
    lightingGroupRef.current = lightingGroup;
    scene.add(lightingGroup);

    // Cool Hemisphere fill
    const hemiLight = new THREE.HemisphereLight(0xced8f5, 0x1e2430, 0.7);
    hemiLight.position.set(0, 20, 0);
    lightingGroup.add(hemiLight);

    // Warm Directional Key Light with tight shadow bounds
    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.0);
    keyLight.position.set(12, 22, 14);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 2048;
      keyLight.shadow.mapSize.height = 2048;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 60;
      keyLight.shadow.camera.left = -18;
      keyLight.shadow.camera.right = 18;
      keyLight.shadow.camera.top = 18;
      keyLight.shadow.camera.bottom = -18;
      keyLight.shadow.bias = -0.0004;
      keyLight.shadow.normalBias = 0.02;
    }
    lightingGroup.add(keyLight);

    // Soft Stage Accent Spotlights
    const stageSpot = new THREE.SpotLight(0xffd59e, 3.5, 25, Math.PI / 5, 0.4);
    stageSpot.position.set(0, 12, 8);
    stageSpot.target.position.set(0, 2, -6);
    scene.add(stageSpot.target);
    lightingGroup.add(stageSpot);

    // 7. Exploded Hierarchy Groups
    const exp1 = new THREE.Group(); // Tables
    const exp2 = new THREE.Group(); // Stage Riser & Altar
    const exp3 = new THREE.Group(); // Pillars & Arches
    const exp4 = new THREE.Group(); // Canopies & Lighting Truss
    explodedLevel1Ref.current = exp1;
    explodedLevel2Ref.current = exp2;
    explodedLevel3Ref.current = exp3;
    explodedLevel4Ref.current = exp4;
    scene.add(exp1);
    scene.add(exp2);
    scene.add(exp3);
    scene.add(exp4);

    // 8. Ground Floor with procedural marble texture
    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.18,
      metalness: 0.08,
      map: createProceduralTileTexture(true),
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = !isSoftwareGl;
    scene.add(floorMesh);
    floorMeshRef.current = floorMesh;

    // Ceremonial Aisle Runner Carpet
    const carpetGeo = new THREE.PlaneGeometry(4, 28);
    const carpetMat = new THREE.MeshStandardMaterial({
      roughness: 0.85,
      metalness: 0.02,
      map: createCarpetTexture(),
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const carpetMesh = new THREE.Mesh(carpetGeo, carpetMat);
    carpetMesh.rotation.x = -Math.PI / 2;
    carpetMesh.position.set(0, 0.02, 6);
    carpetMesh.receiveShadow = !isSoftwareGl;
    scene.add(carpetMesh);

    // 9. Build Hero Stage / Mandap Pavilion (Composite 9-part procedural group)
    buildStagePavilion(exp2, exp3, exp4, themeMode, decorTier);

    // 10. Build Banquet Seating Tables (Responds to guest count)
    buildTablesLayout(exp1, guestCountInput, themeMode);

    // 11. Environment Boundary / Backdrop
    const envGroup = new THREE.Group();
    environmentGroupRef.current = envGroup;
    scene.add(envGroup);
    buildPerimeterEnvironment(envGroup, venueSetting);

    // 12. Animation Loop with Software-WebGL Pacing
    let frameId = 0;
    let clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 60);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const dt = clock.getDelta();

      // Smooth camera interpolation towards target preset
      if (cameraRef.current && controlsRef.current) {
        camera.position.lerp(targetCamPosRef.current, 1 - Math.exp(-4 * dt));
        controls.target.lerp(targetLookAtRef.current, 1 - Math.exp(-4 * dt));
        controls.update();
      }

      // Smooth exploded layer damping
      if (explodedLevel1Ref.current) {
        explodedLevel1Ref.current.position.y = THREE.MathUtils.damp(
          explodedLevel1Ref.current.position.y,
          explodedView * 0.8,
          6,
          dt
        );
      }
      if (explodedLevel2Ref.current) {
        explodedLevel2Ref.current.position.y = THREE.MathUtils.damp(
          explodedLevel2Ref.current.position.y,
          explodedView * 1.6,
          6,
          dt
        );
      }
      if (explodedLevel3Ref.current) {
        explodedLevel3Ref.current.position.y = THREE.MathUtils.damp(
          explodedLevel3Ref.current.position.y,
          explodedView * 2.8,
          6,
          dt
        );
      }
      if (explodedLevel4Ref.current) {
        explodedLevel4Ref.current.position.y = THREE.MathUtils.damp(
          explodedLevel4Ref.current.position.y,
          explodedView * 4.4,
          6,
          dt
        );
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    // 13. Window Resize Handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      cameraRef.current.aspect = newW / newH;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (isSoftwareGl) {
        clearTimeout(frameId);
      } else {
        cancelAnimationFrame(frameId);
      }
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // Rebuild Stage Pavilion when theme or decor tier changes
  useEffect(() => {
    if (explodedLevel2Ref.current && explodedLevel3Ref.current && explodedLevel4Ref.current) {
      clearGroup(explodedLevel2Ref.current);
      clearGroup(explodedLevel3Ref.current);
      clearGroup(explodedLevel4Ref.current);
      buildStagePavilion(
        explodedLevel2Ref.current,
        explodedLevel3Ref.current,
        explodedLevel4Ref.current,
        themeMode,
        decorTier
      );
    }
  }, [themeMode, decorTier]);

  // Rebuild Tables when guest count or theme changes
  useEffect(() => {
    if (explodedLevel1Ref.current) {
      clearGroup(explodedLevel1Ref.current);
      buildTablesLayout(explodedLevel1Ref.current, guestCountInput, themeMode);
    }
  }, [guestCountInput, themeMode]);

  // Rebuild Environment when venue setting changes
  useEffect(() => {
    if (environmentGroupRef.current) {
      clearGroup(environmentGroupRef.current);
      buildPerimeterEnvironment(environmentGroupRef.current, venueSetting);
      if (sceneRef.current) {
        const horizon = venueSetting === 'Outdoor' ? 0x0f172a : 0x090d16;
        sceneRef.current.background = new THREE.Color(horizon);
        sceneRef.current.fog = new THREE.FogExp2(horizon, 0.022);
      }
    }
  }, [venueSetting]);

  // Helper to dispose and clear an object group
  function clearGroup(group: THREE.Group) {
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if ((obj as THREE.Mesh).geometry) {
        (obj as THREE.Mesh).geometry.dispose();
      }
      if ((obj as THREE.Mesh).material) {
        const mat = (obj as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    }
  }

  // Composite 9-part Stage / Mandap Pavilion Model
  function buildStagePavilion(
    level2: THREE.Group,
    level3: THREE.Group,
    level4: THREE.Group,
    theme: ThemeType,
    decor: 'Minimal' | 'Standard' | 'Grand'
  ) {
    const stageZ = -8;

    // Palette adjustments based on theme
    const isGold = theme === 'Traditional' || theme === 'Cultural';
    const primaryMetal = isGold ? 0xd4af37 : 0x94a3b8;
    const accentFloral = isGold ? 0xf59e0b : 0x6366f1;
    const velvetColor = isGold ? 0x881337 : 0x1e1b4b;

    // Part 1: Stepped Tiered Octagonal Podium Base
    const baseGeo = new THREE.CylinderGeometry(5.2, 5.6, 0.45, 8);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.16,
      metalness: 0.08,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(0, 0.225, stageZ);
    baseMesh.receiveShadow = !isSoftwareGl;
    level2.add(baseMesh);

    // Soft Radial Contact Shadow beneath stage
    const shadowGeo = new THREE.PlaneGeometry(12, 12);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, 0.01, stageZ);
    level2.add(shadowMesh);

    // Part 2: Inner Ceremonial Riser Platform with Gold Trim
    const riserGeo = new THREE.CylinderGeometry(4.2, 4.35, 0.25, 8);
    const riserMat = new THREE.MeshStandardMaterial({
      color: primaryMetal,
      roughness: 0.2,
      metalness: 0.85,
    });
    const riserMesh = new THREE.Mesh(riserGeo, riserMat);
    riserMesh.position.set(0, 0.55, stageZ);
    level2.add(riserMesh);

    // Part 3: 4 Fluted Architectural Pillars
    const pillarPositions = [
      [-2.6, -stageZ - 2.6],
      [2.6, -stageZ - 2.6],
      [-2.6, -stageZ + 2.6],
      [2.6, -stageZ + 2.6],
    ];

    const pillarGeo = new THREE.CylinderGeometry(0.18, 0.22, 3.8, 16);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.28,
      metalness: 0.15,
    });

    // Part 4: Pillar Brass Collars & Pedestals
    const collarGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.25, 8);
    const collarMat = new THREE.MeshStandardMaterial({
      color: primaryMetal,
      roughness: 0.15,
      metalness: 0.9,
    });

    pillarPositions.forEach(([px, pz]) => {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(px, 2.5, -pz);
      pillar.castShadow = !isSoftwareGl;
      level3.add(pillar);

      const collarBottom = new THREE.Mesh(collarGeo, collarMat);
      collarBottom.position.set(px, 0.75, -pz);
      level3.add(collarBottom);

      const collarTop = new THREE.Mesh(collarGeo, collarMat);
      collarTop.position.set(px, 4.3, -pz);
      level3.add(collarTop);
    });

    // Part 5: Vaulted Canopy Arch Roof / Upper Cornice
    const corniceGeo = new THREE.TorusGeometry(3.6, 0.16, 8, 8);
    const corniceMat = new THREE.MeshStandardMaterial({
      color: primaryMetal,
      roughness: 0.2,
      metalness: 0.85,
    });
    const cornice = new THREE.Mesh(corniceGeo, corniceMat);
    cornice.rotation.x = Math.PI / 2;
    cornice.position.set(0, 4.45, stageZ);
    level4.add(cornice);

    // Dome Canopy
    const domeGeo = new THREE.SphereGeometry(3.6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 3);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      roughness: 0.5,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.set(0, 4.45, stageZ);
    level4.add(dome);

    // Part 6: Floral Garland Swags
    if (decor !== 'Minimal') {
      const garlandGeo = new THREE.TorusGeometry(2.5, 0.12, 8, 24);
      const garlandMat = new THREE.MeshStandardMaterial({
        color: accentFloral,
        roughness: 0.8,
        metalness: 0.05,
      });
      const garland1 = new THREE.Mesh(garlandGeo, garlandMat);
      garland1.rotation.x = Math.PI / 2;
      garland1.position.set(0, 4.25, stageZ);
      level4.add(garland1);
    }

    // Part 7: Central Ceremonial Altar / Keynote Podium
    const altarBaseGeo = new THREE.CylinderGeometry(0.7, 0.85, 0.5, 8);
    const altarMat = new THREE.MeshStandardMaterial({
      color: primaryMetal,
      roughness: 0.2,
      metalness: 0.9,
    });
    const altar = new THREE.Mesh(altarBaseGeo, altarMat);
    altar.position.set(0, 0.9, stageZ);
    level2.add(altar);

    // Part 8: Royal Ceremonial Thrones / Lounge Chairs
    const throneSeatGeo = new THREE.BoxGeometry(1.0, 0.25, 0.9);
    const throneSeatMat = new THREE.MeshStandardMaterial({
      color: velvetColor,
      roughness: 0.75,
      metalness: 0.05,
    });
    const throneBackGeo = new THREE.BoxGeometry(1.0, 1.4, 0.2);
    const throneFrameMat = new THREE.MeshStandardMaterial({
      color: primaryMetal,
      roughness: 0.18,
      metalness: 0.88,
    });

    [-1.2, 1.2].forEach((tx) => {
      const throneGroup = new THREE.Group();
      throneGroup.position.set(tx, 0.7, stageZ - 1.2);

      const seat = new THREE.Mesh(throneSeatGeo, throneSeatMat);
      seat.position.y = 0.35;
      throneGroup.add(seat);

      const back = new THREE.Mesh(throneBackGeo, throneSeatMat);
      back.position.set(0, 1.0, -0.35);
      throneGroup.add(back);

      const trim = new THREE.Mesh(new THREE.BoxGeometry(1.08, 1.48, 0.08), throneFrameMat);
      trim.position.set(0, 1.0, -0.42);
      throneGroup.add(trim);

      level2.add(throneGroup);
    });

    // Part 9: Overhead Crystal Chandelier with Warm Glow
    const chandelierGeo = new THREE.OctahedronGeometry(0.8, 1);
    const chandelierMat = new THREE.MeshStandardMaterial({
      color: 0xfff3c4,
      roughness: 0.1,
      metalness: 0.95,
      emissive: 0xffd54f,
      emissiveIntensity: 0.6,
    });
    const chandelier = new THREE.Mesh(chandelierGeo, chandelierMat);
    chandelier.position.set(0, 4.0, stageZ);
    level4.add(chandelier);
  }

  // Composite Banquet Tables & Seating (Scales with Guest Count)
  function buildTablesLayout(group: THREE.Group, guests: number, theme: ThemeType) {
    // Number of tables: 1 table per 10 guests (minimum 4, max 24)
    const tableCount = Math.max(4, Math.min(20, Math.ceil(guests / 10)));
    const rows = 3;
    const cols = Math.ceil(tableCount / rows);

    const isGold = theme === 'Traditional' || theme === 'Cultural';
    const chairColor = isGold ? 0xd4af37 : 0x64748b;
    const clothColor = isGold ? 0xfffdf7 : 0xf1f5f9;

    const tableGeo = new THREE.CylinderGeometry(1.3, 1.3, 0.85, 16);
    const tableMat = new THREE.MeshStandardMaterial({
      color: clothColor,
      roughness: 0.45,
      metalness: 0.05,
    });

    const centerpieceGeo = new THREE.CylinderGeometry(0.15, 0.25, 0.5, 8);
    const centerpieceMat = new THREE.MeshStandardMaterial({
      color: isGold ? 0xf59e0b : 0x8b5cf6,
      roughness: 0.2,
      metalness: 0.8,
    });

    const chairGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.55, 8);
    const chairMat = new THREE.MeshStandardMaterial({
      color: chairColor,
      roughness: 0.25,
      metalness: 0.7,
    });

    let placed = 0;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (placed >= tableCount) break;

        const x = (c - (cols - 1) / 2) * 5.8;
        // Avoid center aisle (keep x between -2.2 and 2.2 empty)
        const adjustedX = Math.abs(x) < 2.0 ? (x < 0 ? -3.2 : 3.2) : x;
        const z = 2 + r * 5.2;

        const tableGroup = new THREE.Group();
        tableGroup.position.set(adjustedX, 0, z);

        // Table Mesh
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.y = 0.425;
        table.castShadow = !isSoftwareGl;
        table.receiveShadow = !isSoftwareGl;
        tableGroup.add(table);

        // Floral Centerpiece
        const cp = new THREE.Mesh(centerpieceGeo, centerpieceMat);
        cp.position.y = 0.85 + 0.25;
        tableGroup.add(cp);

        // 6 Surrounding Chiavari Chairs
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const chair = new THREE.Mesh(chairGeo, chairMat);
          chair.position.set(Math.cos(angle) * 1.8, 0.275, Math.sin(angle) * 1.8);
          tableGroup.add(chair);
        }

        group.add(tableGroup);
        placed++;
      }
    }
  }

  // Natural Perimeter Environment
  function buildPerimeterEnvironment(group: THREE.Group, setting: VenueType) {
    if (setting === 'Outdoor') {
      // Outdoor Stone Balustrade & Cypress Planters
      const railGeo = new THREE.BoxGeometry(0.3, 0.9, 44);
      const railMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.7,
        metalness: 0.1,
      });

      const railLeft = new THREE.Mesh(railGeo, railMat);
      railLeft.position.set(-22, 0.45, 0);
      group.add(railLeft);

      const railRight = new THREE.Mesh(railGeo, railMat);
      railRight.position.set(22, 0.45, 0);
      group.add(railRight);

      // Planter Shrubs along borders
      const bushGeo = new THREE.ConeGeometry(0.9, 2.8, 8);
      const bushMat = new THREE.MeshStandardMaterial({
        color: 0x14532d,
        roughness: 0.85,
        metalness: 0.05,
      });

      for (let z = -18; z <= 18; z += 6) {
        const bushL = new THREE.Mesh(bushGeo, bushMat);
        bushL.position.set(-23.5, 1.4, z);
        group.add(bushL);

        const bushR = new THREE.Mesh(bushGeo, bushMat);
        bushR.position.set(23.5, 1.4, z);
        group.add(bushR);
      }
    } else {
      // Indoor Pillars and Wall Paneling
      const wallPillarGeo = new THREE.BoxGeometry(1.2, 8.0, 1.2);
      const wallPillarMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.4,
        metalness: 0.2,
      });

      for (let z = -18; z <= 18; z += 9) {
        const pL = new THREE.Mesh(wallPillarGeo, wallPillarMat);
        pL.position.set(-20, 4.0, z);
        group.add(pL);

        const pR = new THREE.Mesh(wallPillarGeo, wallPillarMat);
        pR.position.set(20, 4.0, z);
        group.add(pR);
      }
    }
  }

  // Camera Presets
  const setCameraView = (preset: 'cinematic' | 'stage' | 'top' | 'vip') => {
    if (preset === 'cinematic') {
      targetCamPosRef.current.set(0, 13, 25);
      targetLookAtRef.current.set(0, 2.0, 0);
    } else if (preset === 'stage') {
      targetCamPosRef.current.set(0, 4.5, -0.5);
      targetLookAtRef.current.set(0, 2.5, -8);
    } else if (preset === 'top') {
      targetCamPosRef.current.set(0, 36, 6);
      targetLookAtRef.current.set(0, 0, 0);
    } else if (preset === 'vip') {
      targetCamPosRef.current.set(-6, 3.2, 8);
      targetLookAtRef.current.set(0, 2.2, -8);
    }
  };

  // Direct Control: Save updates to Active Event
  const handleSaveToEvent = () => {
    if (!activeEvent) return;
    updateEvent(activeEvent.id, {
      venueType: venueSetting,
      theme: themeMode,
      guestCount: guestCountInput,
      spendingPriorities: decorTier === 'Grand'
        ? Array.from(new Set([...activeEvent.spendingPriorities, 'Decoration']))
        : activeEvent.spendingPriorities,
    });
    setSavedSuccessToast(true);
    setTimeout(() => setSavedSuccessToast(false), 3500);
  };

  return (
    <div className="relative w-full h-[calc(100vh-6.5rem)] rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl select-none">
      {/* 1. Full-Bleed WebGL Canvas Mount Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* 2. Top-Left Minimal Floating Badge */}
      <div className="absolute top-5 left-5 z-20 flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-white shadow-xl pointer-events-auto">
        {onBackToOverview && (
          <button
            onClick={onBackToOverview}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Return to Overview"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0">
          <Compass className="w-4 h-4" />
        </div>
        <div>
          <div className="text-xs font-bold tracking-wide flex items-center gap-1.5">
            <span>3D Spatial Venue Studio</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 font-mono">
              Three.js PBR
            </span>
          </div>
          <div className="text-[11px] text-slate-400 truncate max-w-[220px]">
            {activeEvent ? activeEvent.name : 'Event Stage Layout'}
          </div>
        </div>
      </div>

      {/* 3. Top-Right Save / Sync Status Pill */}
      <div className="absolute top-5 right-5 z-20 flex items-center gap-2">
        {savedSuccessToast && (
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-600/90 text-white text-xs font-semibold shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2">
            <Check className="w-4 h-4" />
            <span>Event Details Synchronized!</span>
          </div>
        )}

        <button
          onClick={handleSaveToEvent}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save to Event Plan</span>
        </button>
      </div>

      {/* 4. Bottom Collapsible Control Dock (Strictly <= 15% viewport, zero side occlusion) */}
      <div
        className="absolute z-20 transition-all duration-300 ease-out pointer-events-auto"
        style={{
          bottom: isControlsCollapsed ? '-160px' : '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(940px, 94vw)',
        }}
      >
        {/* Collapse / Expand Toggle Button attached to top edge */}
        <div className="flex justify-center mb-1.5">
          <button
            onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
            className="px-4 py-1 rounded-full bg-slate-900/95 border border-slate-700/80 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shadow-lg flex items-center gap-1.5"
            aria-label={isControlsCollapsed ? 'Show Controls Dock' : 'Hide Controls Dock'}
          >
            {isControlsCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-indigo-400" />
                <span>Show Venue Controls</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                <span>Hide Controls (Zen View)</span>
              </>
            )}
          </button>
        </div>

        {/* Dock Panel (Solid rgba surface without backdrop-filter over WebGL) */}
        <div className="rounded-2xl bg-slate-900/95 border border-slate-700/80 p-4 shadow-2xl text-white space-y-3">
          {/* Dock Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setActiveTab('layout')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'layout'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Spatial Layout & Capacity</span>
              </button>

              <button
                onClick={() => setActiveTab('theme')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'theme'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Aesthetic & Lighting</span>
              </button>

              <button
                onClick={() => setActiveTab('camera')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'camera'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Camera Angles</span>
              </button>
            </div>

            {/* Exploded View Slider */}
            <div className="flex items-center gap-2.5 text-xs">
              <Layers className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-slate-400 text-[11px] font-medium hidden sm:inline">
                Exploded Layers:
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={explodedView}
                onChange={(e) => setExplodedView(parseFloat(e.target.value))}
                className="w-24 sm:w-32 accent-violet-500 cursor-pointer"
                title="Separate architectural layers"
              />
              <span className="text-[11px] font-mono text-violet-300 w-8 text-right">
                {Math.round(explodedView * 100)}%
              </span>
            </div>
          </div>

          {/* TAB 1: SPATIAL LAYOUT & CAPACITY */}
          {activeTab === 'layout' && (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center text-xs">
              {/* Venue Setting */}
              <div className="sm:col-span-5 space-y-1">
                <span className="text-slate-400 text-[11px] font-medium block">
                  Venue Setting (Updates Event Type):
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Indoor', 'Outdoor', 'Mixed'] as VenueType[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setVenueSetting(v)}
                      className={`py-1.5 px-2 rounded-lg text-center font-medium transition-all ${
                        venueSetting === v
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guest Count / Table Density Slider */}
              <div className="sm:col-span-4 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Guest Headcount:</span>
                  <span className="text-indigo-400 font-bold font-mono">
                    {guestCountInput} Attendees ({Math.ceil(guestCountInput / 10)} Tables)
                  </span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={450}
                  step={10}
                  value={guestCountInput}
                  onChange={(e) => setGuestCountInput(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Decor Level */}
              <div className="sm:col-span-3 space-y-1">
                <span className="text-slate-400 text-[11px] font-medium block">
                  Stage Decor Tier:
                </span>
                <div className="grid grid-cols-3 gap-1 text-[11px]">
                  {(['Minimal', 'Standard', 'Grand'] as const).map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setDecorTier(tier)}
                      className={`py-1.5 rounded-lg text-center font-medium transition-all ${
                        decorTier === tier
                          ? 'bg-violet-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AESTHETIC & LIGHTING */}
          {activeTab === 'theme' && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 text-[11px] font-medium block">
                  Thematic Aesthetic Palette:
                </span>
                <div className="flex flex-wrap gap-2">
                  {(['Traditional', 'Elegant', 'Minimal', 'Luxury'] as ThemeType[]).map((thm) => (
                    <button
                      key={thm}
                      onClick={() => setThemeMode(thm)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        themeMode === thm
                          ? 'bg-indigo-600 text-white font-bold shadow-xs'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {thm}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-slate-400 max-w-xs">
                💡 Swapping aesthetic instantly recalibrates 3D PBR materials (gold leaf, satin drapes, floral swags).
              </div>
            </div>
          )}

          {/* TAB 3: CAMERA ANGLES */}
          {activeTab === 'camera' && (
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <span className="text-slate-400 text-[11px] font-medium mr-1">
                Direct Viewports:
              </span>
              <button
                onClick={() => setCameraView('cinematic')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white transition-colors"
              >
                Cinematic Overview
              </button>
              <button
                onClick={() => setCameraView('stage')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white transition-colors"
              >
                Stage / Mandap Close-Up
              </button>
              <button
                onClick={() => setCameraView('vip')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white transition-colors"
              >
                VIP Guest Table View
              </button>
              <button
                onClick={() => setCameraView('top')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white transition-colors"
              >
                Bird's-Eye Floorplan (Top)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
