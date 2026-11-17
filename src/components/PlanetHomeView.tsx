import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ArrowRight,
  BookMarked,
  ChevronDown,
  ChevronUp,
  Compass,
  Crosshair,
  Flag,
  LayoutGrid,
  Moon,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Star,
  Sun,
  Swords,
  Trophy,
  X,
} from 'lucide-react';
import { SECTORS, getSectorStarStats, getTotalSystemStars } from '../data/sectors';
import {
  AppMode,
  ProfileRecord,
  SectorId,
  THEME_META,
  ThemeMode,
  getNextThemeMode,
  isDarkTheme,
} from '../types';
import { soundEngine } from '../utils/soundEngine';
import {
  SOLAR_PLANET_CONFIGS,
  buildOrbitalBeaconGroup,
  buildStarCruiserGroup,
  createGlowSpriteTexture,
  createPlanetSurfaceTexture,
  detectSoftwareWebGL,
} from '../utils/spaceDiorama3D';
import { AchievementWallBar } from './AchievementWallBar';
import { AudioToggleButtons } from './AudioToggleButtons';

interface PlanetHomeViewProps {
  profile: ProfileRecord;
  mode: AppMode;
  theme: ThemeMode;
  wrongCount: number;
  onSelectSector: (id: SectorId) => void;
  onSwitchToGrid: () => void;
  onOpenBattle: () => void;
  onToggleTheme: (t: ThemeMode) => void;
  onChangeMode: (m: AppMode) => void;
  onOpenProgressModal: () => void;
  onOpenWrongModal: () => void;
}

export interface PlanetOrbitMeta {
  id: SectorId;
  lon: number;
  lat: number;
  orbitRadius: number;
  orbitDuration: number;
  startAngle: number;
  planetRadius: number;
  colorLight: string;
  color: string;
  colorDeep: string;
  glowColor: string;
  bandColor: string;
  landFill: string;
  shoreFill: string;
  hasRing?: boolean;
  hasMoon?: boolean;
}

export const PLANET_META: Record<SectorId, PlanetOrbitMeta> = {
  s1: {
    id: 's1',
    lon: -28,
    lat: 24,
    orbitRadius: 90,
    orbitDuration: 24,
    startAngle: -28,
    planetRadius: 18,
    colorLight: '#C4B5FD',
    color: '#8B5CF6',
    colorDeep: '#4C1D95',
    glowColor: '#C4B5FD',
    bandColor: '#EDE9FE',
    landFill: '#C084FC',
    shoreFill: '#FDE68A',
    hasMoon: true,
  },
  s2: {
    id: 's2',
    lon: 34,
    lat: 20,
    orbitRadius: 122,
    orbitDuration: 30,
    startAngle: 46,
    planetRadius: 20,
    colorLight: '#F9A8D4',
    color: '#EC4899',
    colorDeep: '#831843',
    glowColor: '#F9A8D4',
    bandColor: '#FCE7F3',
    landFill: '#F472B6',
    shoreFill: '#FEF08A',
  },
  s3: {
    id: 's3',
    lon: -16,
    lat: -18,
    orbitRadius: 154,
    orbitDuration: 38,
    startAngle: 128,
    planetRadius: 22,
    colorLight: '#FDE68A',
    color: '#F59E0B',
    colorDeep: '#78350F',
    glowColor: '#FCD34D',
    bandColor: '#FEF3C7',
    landFill: '#FBBF24',
    shoreFill: '#FEF9C3',
    hasMoon: true,
  },
  s4: {
    id: 's4',
    lon: 48,
    lat: -24,
    orbitRadius: 186,
    orbitDuration: 46,
    startAngle: 206,
    planetRadius: 23,
    colorLight: '#99F6E4',
    color: '#14B8A6',
    colorDeep: '#134E4A',
    glowColor: '#5EEAD4',
    bandColor: '#CCFBF1',
    landFill: '#2DD4BF',
    shoreFill: '#E0F2FE',
    hasRing: true,
  },
  s5: {
    id: 's5',
    lon: 112,
    lat: 18,
    orbitRadius: 218,
    orbitDuration: 54,
    startAngle: -102,
    planetRadius: 21,
    colorLight: '#FED7AA',
    color: '#F97316',
    colorDeep: '#7C2D12',
    glowColor: '#FDBA74',
    bandColor: '#FFEDD5',
    landFill: '#FB923C',
    shoreFill: '#FEF3C7',
    hasMoon: true,
  },
  s6: {
    id: 's6',
    lon: 162,
    lat: -16,
    orbitRadius: 250,
    orbitDuration: 62,
    startAngle: -14,
    planetRadius: 25,
    colorLight: '#A7F3D0',
    color: '#10B981',
    colorDeep: '#064E3B',
    glowColor: '#6EE7B7',
    bandColor: '#D1FAE5',
    landFill: '#34D399',
    shoreFill: '#ECFDF5',
    hasRing: true,
    hasMoon: true,
  },
  s7: {
    id: 's7',
    lon: -128,
    lat: 14,
    orbitRadius: 282,
    orbitDuration: 72,
    startAngle: 92,
    planetRadius: 22,
    colorLight: '#BAE6FD',
    color: '#0EA5E9',
    colorDeep: '#0C4A6E',
    glowColor: '#7DD3FC',
    bandColor: '#E0F2FE',
    landFill: '#38BDF8',
    shoreFill: '#F0F9FF',
    hasRing: true,
  },
  s8: {
    id: 's8',
    lon: -88,
    lat: -22,
    orbitRadius: 314,
    orbitDuration: 84,
    startAngle: 174,
    planetRadius: 24,
    colorLight: '#C7D2FE',
    color: '#6366F1',
    colorDeep: '#312E81',
    glowColor: '#A5B4FC',
    bandColor: '#E0E7FF',
    landFill: '#818CF8',
    shoreFill: '#EEF2FF',
    hasMoon: true,
  },
};

const PLANET_SUBTITLE_MAP: Record<SectorId, string> = {
  s1: '雙峰奇偶翡翠星',
  s2: '燈塔規律粉晶星',
  s3: '離子面積琥珀星',
  s4: '光環賽博計數星',
  s5: '跨河峽谷橘焰星',
  s6: '翡翠環繞生態星',
  s7: '冰晶陣列深藍星',
  s8: '航太雙塔靛藍星',
};

// Reusable module-scope math objects (zero per-frame heap allocations)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();
const _overviewTarget = new THREE.Vector3(0, 0, 0);

interface PlanetRuntime {
  id: SectorId;
  orbitPivot: THREE.Group;
  planetAnchor: THREE.Group;
  sphereMesh: THREE.Mesh;
  atmosphereMat: THREE.MeshBasicMaterial;
  orbitRingMat: THREE.MeshBasicMaterial;
  targetRing: THREE.Mesh;
  targetRingMat: THREE.MeshBasicMaterial;
  moonPivot: THREE.Group | null;
  beaconPivot: THREE.Group | null;
  hitProxy: THREE.Mesh;
  orbitalAngle: number;
  orbitSpeed: number;
  spinSpeed: number;
  planetRadius: number;
}

export function PlanetHomeView({
  profile,
  mode,
  theme,
  wrongCount,
  onSelectSector,
  onSwitchToGrid,
  onOpenBattle,
  onToggleTheme,
  onChangeMode,
  onOpenProgressModal,
  onOpenWrongModal,
}: PlanetHomeViewProps) {
  const [focusedSector, setFocusedSector] = useState<SectorId | null>(null);
  const [hoveredSector, setHoveredSector] = useState<SectorId | null>(null);
  const [orbitPaused, setOrbitPaused] = useState(false);
  const [dockOpen, setDockOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const labelRefs = useRef<Partial<Record<SectorId, HTMLButtonElement | null>>>({});

  // Latest UI state synced into mutable refs so the Three.js scene runs uninterrupted
  const focusedRef = useRef<SectorId | null>(focusedSector);
  const hoveredRef = useRef<SectorId | null>(hoveredSector);
  const themeRef = useRef<ThemeMode>(theme);
  const orbitPausedRef = useRef<boolean>(orbitPaused);
  const onSelectSectorRef = useRef(onSelectSector);

  focusedRef.current = focusedSector;
  hoveredRef.current = hoveredSector;
  themeRef.current = theme;
  orbitPausedRef.current = orbitPaused;
  onSelectSectorRef.current = onSelectSector;

  // Controls smooth fly-to transitions vs free manual OrbitControls
  const cameraGoalRef = useRef<'overview' | 'planet'>('overview');
  const isAutoGlidingRef = useRef<boolean>(false);
  const liveThemeSyncRef = useRef<((t: ThemeMode) => void) | null>(null);

  const isDark = isDarkTheme(theme);
  const themeMeta = THEME_META[theme];

  const { totalEarnedStars, totalSystemStars, completedPlanets, nextRecommendedSector } = useMemo(() => {
    let earned = 0;
    let planetsDone = 0;
    let recommended: SectorId = 's1';
    let foundNext = false;

    SECTORS.forEach((sec) => {
      const stats = getSectorStarStats(sec, profile.sectors[sec.id]);
      earned += stats.earned;
      if (stats.earned === stats.total) {
        planetsDone += 1;
      } else if (!foundNext) {
        recommended = sec.id;
        foundNext = true;
      }
    });

    return {
      totalEarnedStars: earned,
      totalSystemStars: getTotalSystemStars(SECTORS),
      completedPlanets: planetsDone,
      nextRecommendedSector: recommended,
    };
  }, [profile]);

  const focusedSectorDef = useMemo(
    () => (focusedSector ? SECTORS.find((s) => s.id === focusedSector) ?? null : null),
    [focusedSector]
  );

  const focusedSectorStats = useMemo(
    () =>
      focusedSectorDef
        ? getSectorStarStats(focusedSectorDef, profile.sectors[focusedSectorDef.id])
        : null,
    [focusedSectorDef, profile.sectors]
  );

  // Trigger live theme update inside the 3D WebGL scene without tearing down canvas
  useEffect(() => {
    liveThemeSyncRef.current?.(theme);
  }, [theme]);

  // Trigger smooth camera fly-to whenever focusedSector changes
  useEffect(() => {
    if (focusedSector) {
      cameraGoalRef.current = 'planet';
      isAutoGlidingRef.current = true;
    } else {
      cameraGoalRef.current = 'overview';
      isAutoGlidingRef.current = true;
    }
  }, [focusedSector]);

  // Keyboard shortcuts: Escape returns to solar overview, H collapses/expands dock
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'Escape' && focusedRef.current) {
        soundEngine.playClick();
        setFocusedSector(null);
      } else if ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setDockOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Main Three.js WebGL Multi-Planet Interstellar Scene
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const isCoarsePointer =
      typeof window !== 'undefined' &&
      (window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches);
    const isMobileTier = isSoftwareGl || isCoarsePointer;
    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);

    // 1. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setPixelRatio(
      isSoftwareGl
        ? 1
        : isMobileTier
          ? Math.min(window.devicePixelRatio, 1.5)
          : Math.min(window.devicePixelRatio, 2)
    );
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);

    // 2. Scene + Environment IBL
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.65;
    pmrem.dispose();

    const spaceBgColor = new THREE.Color('#030816');
    const brightBgColor = new THREE.Color('#0E4A7E');
    const initialDark = isDarkTheme(themeRef.current);
    scene.background = (initialDark ? spaceBgColor : brightBgColor).clone();
    const fog = new THREE.FogExp2(
      initialDark ? 0x030816 : 0x0e4a7d,
      initialDark ? 0.0085 : 0.0062
    );
    scene.fog = fog;

    // 3. Camera & OrbitControls (dynamic portrait FOV & pullback distance)
    const dynOverviewPos = new THREE.Vector3(0, 19.5, 35.5);
    const camera = new THREE.PerspectiveCamera(46, width / height, 0.25, 220);
    const applyResponsiveCamera = (w: number, h: number) => {
      const aspect = w / h;
      const isPortrait = aspect < 1;
      camera.aspect = aspect;
      camera.fov = isPortrait ? 56 : 46;
      camera.updateProjectionMatrix();
      dynOverviewPos.set(0, isPortrait ? 23.5 : 19.5, isPortrait ? 45 : 35.5);
    };
    applyResponsiveCamera(width, height);
    camera.position.copy(dynOverviewPos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.065;
    controls.minDistance = 4.2;
    controls.maxDistance = 74;
    controls.maxPolarAngle = Math.PI * 0.84;
    controls.minPolarAngle = 0.14;
    controls.rotateSpeed = 0.72;
    controls.zoomSpeed = 0.88;
    controls.target.copy(_overviewTarget);

    // Cancel automated camera glide if user grabs/scrolls controls
    const handleControlsStart = () => {
      isAutoGlidingRef.current = false;
    };
    controls.addEventListener('start', handleControlsStart);

    // 4. Lighting
    const sunPointLight = new THREE.PointLight(0xfff0cc, 105, 130, 1.25);
    sunPointLight.position.set(0, 0, 0);
    scene.add(sunPointLight);

    const hemiLight = new THREE.HemisphereLight(
      initialDark ? 0x38bdf8 : 0xbae6fd,
      initialDark ? 0x0f172a : 0x1e3a8a,
      initialDark ? 0.72 : 1.2
    );
    scene.add(hemiLight);

    const rimDirLight = new THREE.DirectionalLight(0x7dd3fc, 0.85);
    rimDirLight.position.set(-18, 22, -16);
    scene.add(rimDirLight);

    // Resource tracking for clean disposal
    const disposableGeos: THREE.BufferGeometry[] = [];
    const disposableMats: THREE.Material[] = [];
    const disposableTexs: THREE.Texture[] = [];

    const trackGeo = <T extends THREE.BufferGeometry>(g: T) => {
      disposableGeos.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T) => {
      disposableMats.push(m);
      return m;
    };
    const trackTex = <T extends THREE.Texture>(t: T) => {
      disposableTexs.push(t);
      return t;
    };

    // 5. Central Sun Group
    const sunGroup = new THREE.Group();
    scene.add(sunGroup);

    const sunGeo = trackGeo(new THREE.SphereGeometry(2.55, 36, 28));
    const sunMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfde047,
        emissive: 0xff8c00,
        emissiveIntensity: 1.9,
        roughness: 0.35,
      })
    );
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunGroup.add(sunMesh);

    const innerCoronaTex = trackTex(
      createGlowSpriteTexture('rgba(255, 250, 210, 0.95)', 'rgba(251, 191, 36, 0.55)')
    );
    const innerCoronaMat = trackMat(
      new THREE.SpriteMaterial({
        map: innerCoronaTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const innerCorona = new THREE.Sprite(innerCoronaMat);
    innerCorona.scale.set(9.8, 9.8, 1);
    sunGroup.add(innerCorona);

    const outerCoronaTex = trackTex(
      createGlowSpriteTexture('rgba(251, 146, 60, 0.45)', 'rgba(56, 189, 248, 0.14)')
    );
    const outerCoronaMat = trackMat(
      new THREE.SpriteMaterial({
        map: outerCoronaTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const outerCorona = new THREE.Sprite(outerCoronaMat);
    outerCorona.scale.set(16.5, 16.5, 1);
    sunGroup.add(outerCorona);

    const solarRingGeo = trackGeo(new THREE.TorusGeometry(3.35, 0.032, 8, 64));
    const solarRingMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.42,
      })
    );
    const solarRingA = new THREE.Mesh(solarRingGeo, solarRingMat);
    solarRingA.rotation.x = Math.PI / 2.3;
    sunGroup.add(solarRingA);

    const solarRingB = new THREE.Mesh(solarRingGeo, solarRingMat);
    solarRingB.rotation.x = -Math.PI / 2.6;
    solarRingB.rotation.z = 0.55;
    sunGroup.add(solarRingB);

    // 6. 3D Starfield (tiered for mobile & software WebGL)
    const starCount = isMobileTier ? 650 : 1400;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const palette = [
      new THREE.Color('#FFFFFF'),
      new THREE.Color('#BAE6FD'),
      new THREE.Color('#FDE68A'),
      new THREE.Color('#C4B5FD'),
    ];
    for (let i = 0; i < starCount; i++) {
      const r = 46 + ((i * 73) % 44);
      const theta = ((i * 1.6180339) % 1) * Math.PI * 2;
      const phi = Math.acos(1 - 2 * (((i * 0.7548776) % 1)));
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const c = palette[i % palette.length];
      starColors[i * 3] = c.r;
      starColors[i * 3 + 1] = c.g;
      starColors[i * 3 + 2] = c.b;
    }
    const starGeo = trackGeo(new THREE.BufferGeometry());
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = trackMat(
      new THREE.PointsMaterial({
        size: 0.34,
        vertexColors: true,
        transparent: true,
        opacity: initialDark ? 0.92 : 0.62,
        sizeAttenuation: true,
      })
    );
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 7. Instanced Asteroid Belt between s4 (r=14.5) and s5 (r=17.6)
    const asteroidCount = isMobileTier ? 80 : 175;
    const asteroidGeo = trackGeo(new THREE.IcosahedronGeometry(0.15, 0));
    const asteroidMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.78,
        metalness: 0.25,
      })
    );
    const asteroidBelt = new THREE.InstancedMesh(asteroidGeo, asteroidMat, asteroidCount);
    const dummyObj = new THREE.Object3D();
    for (let i = 0; i < asteroidCount; i++) {
      const angle = (i / asteroidCount) * Math.PI * 2 + (i % 7) * 0.04;
      const rad = 15.65 + ((i * 37) % 100) * 0.0095;
      const y = (((i * 19) % 100) / 100 - 0.5) * 0.72;
      dummyObj.position.set(Math.cos(angle) * rad, y, Math.sin(angle) * rad);
      dummyObj.rotation.set(i * 0.4, i * 0.7, i * 0.2);
      const scale = 0.55 + ((i * 13) % 10) * 0.11;
      dummyObj.scale.setScalar(scale);
      dummyObj.updateMatrix();
      asteroidBelt.setMatrixAt(i, dummyObj.matrix);
    }
    asteroidBelt.instanceMatrix.needsUpdate = true;
    asteroidBelt.computeBoundingSphere();
    scene.add(asteroidBelt);

    // 8. Shooting Comets
    const cometGlowTex = trackTex(
      createGlowSpriteTexture('rgba(224, 242, 254, 0.95)', 'rgba(56, 189, 248, 0.35)')
    );
    const createComet = (colorHex: number) => {
      const comet = new THREE.Group();
      const head = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.18, 12, 10)),
        trackMat(new THREE.MeshBasicMaterial({ color: 0xffffff }))
      );
      comet.add(head);

      const sprite = new THREE.Sprite(
        trackMat(
          new THREE.SpriteMaterial({
            map: cometGlowTex,
            color: colorHex,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        )
      );
      sprite.scale.set(1.25, 1.25, 1);
      comet.add(sprite);

      const tailGeo = trackGeo(new THREE.ConeGeometry(0.16, 2.6, 10));
      tailGeo.rotateX(-Math.PI / 2);
      tailGeo.translate(0, 0, -1.35);
      const tail = new THREE.Mesh(
        tailGeo,
        trackMat(
          new THREE.MeshBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.42,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        )
      );
      comet.add(tail);
      scene.add(comet);
      return comet;
    };
    const cometA = createComet(0x38bdf8);
    const cometB = createComet(0xfde047);

    // 9. Eight Composite 3D Planets
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const planetRuntimes: Record<SectorId, PlanetRuntime> = {} as Record<SectorId, PlanetRuntime>;
    const raycastTargets: THREE.Object3D[] = [];

    const sphereSegW = isMobileTier ? 28 : 48;
    const sphereSegH = isMobileTier ? 20 : 32;

    SECTORS.forEach((sec) => {
      const cfg = SOLAR_PLANET_CONFIGS[sec.id];

      // Tilted Orbit Plane
      const orbitPlane = new THREE.Group();
      orbitPlane.rotation.x = cfg.orbitTiltX;
      orbitPlane.rotation.z = cfg.orbitTiltZ;
      scene.add(orbitPlane);

      // Orbit Track Torus Ring
      const orbitRingGeo = trackGeo(new THREE.TorusGeometry(cfg.orbitRadius, 0.022, 8, 128));
      orbitRingGeo.rotateX(Math.PI / 2);
      const orbitRingMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: cfg.glowHex,
          transparent: true,
          opacity: 0.24,
        })
      );
      const orbitRing = new THREE.Mesh(orbitRingGeo, orbitRingMat);
      orbitPlane.add(orbitRing);

      // Rotating Orbit Pivot
      const orbitPivot = new THREE.Group();
      orbitPivot.rotation.y = cfg.startAngle;
      orbitPlane.add(orbitPivot);

      // Planet Anchor positioned at orbital radius
      const planetAnchor = new THREE.Group();
      planetAnchor.position.set(cfg.orbitRadius, 0, 0);
      orbitPivot.add(planetAnchor);

      // Axial Tilt Holder
      const tiltGroup = new THREE.Group();
      tiltGroup.rotation.z = cfg.axialTilt;
      planetAnchor.add(tiltGroup);

      // Core 3D Sphere with seamless procedural CanvasTexture
      const surfaceTex = trackTex(createPlanetSurfaceTexture(cfg, maxAniso));
      const sphereGeo = trackGeo(new THREE.SphereGeometry(cfg.planetRadius, sphereSegW, sphereSegH));
      const sphereMat = trackMat(
        new THREE.MeshStandardMaterial({
          map: surfaceTex,
          roughness: 0.62,
          metalness: 0.14,
          emissive: new THREE.Color(cfg.baseHex),
          emissiveIntensity: 0.12,
        })
      );
      const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
      tiltGroup.add(sphereMesh);

      // Translucent Atmospheric Rim Shell
      const atmoGeo = trackGeo(new THREE.SphereGeometry(cfg.planetRadius * 1.075, 24, 18));
      const atmosphereMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: cfg.glowHex,
          transparent: true,
          opacity: 0.18,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.BackSide,
        })
      );
      const atmosphereMesh = new THREE.Mesh(atmoGeo, atmosphereMat);
      tiltGroup.add(atmosphereMesh);

      // Optional Planetary Rings
      if (cfg.hasRing) {
        const innerR = cfg.planetRadius * 1.38;
        const outerR = cfg.planetRadius * 2.02;
        const discGeo = trackGeo(new THREE.RingGeometry(innerR, outerR, 48));
        discGeo.rotateX(Math.PI / 2);
        const discMat = trackMat(
          new THREE.MeshBasicMaterial({
            color: cfg.ringColor ?? cfg.glowHex,
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
        );
        const disc = new THREE.Mesh(discGeo, discMat);
        tiltGroup.add(disc);

        const edgeGeo = trackGeo(new THREE.TorusGeometry(outerR, 0.025, 8, 64));
        edgeGeo.rotateX(Math.PI / 2);
        const edgeMat = trackMat(
          new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.52,
          })
        );
        tiltGroup.add(new THREE.Mesh(edgeGeo, edgeMat));
      }

      // Target Lock Reticle Ring (brightens when hovered or focused)
      const targetGeo = trackGeo(new THREE.TorusGeometry(cfg.planetRadius * 1.54, 0.036, 8, 48));
      targetGeo.rotateX(Math.PI / 2);
      const targetRingMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: cfg.glowHex,
          transparent: true,
          opacity: 0.0,
        })
      );
      const targetRing = new THREE.Mesh(targetGeo, targetRingMat);
      planetAnchor.add(targetRing);

      // Optional Orbiting Moon
      let moonPivot: THREE.Group | null = null;
      if (cfg.hasMoon) {
        moonPivot = new THREE.Group();
        moonPivot.rotation.z = 0.24;
        planetAnchor.add(moonPivot);
        const moonMesh = new THREE.Mesh(
          trackGeo(new THREE.SphereGeometry(cfg.planetRadius * 0.23, 14, 12)),
          trackMat(
            new THREE.MeshStandardMaterial({
              color: 0xe2e8f0,
              roughness: 0.78,
              metalness: 0.08,
            })
          )
        );
        moonMesh.position.set(cfg.planetRadius * 1.92, 0, 0);
        moonPivot.add(moonMesh);
      }

      // Optional 5-Part Orbiting Space Station / Beacon
      let beaconPivot: THREE.Group | null = null;
      if (cfg.hasBeacon || cfg.hasRing) {
        beaconPivot = new THREE.Group();
        beaconPivot.rotation.z = -0.32;
        planetAnchor.add(beaconPivot);
        const beacon = buildOrbitalBeaconGroup(cfg.glowHex);
        beacon.scale.setScalar(0.56);
        beacon.position.set(-cfg.planetRadius * 1.65, cfg.planetRadius * 0.48, 0);
        beaconPivot.add(beacon);
        beacon.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            trackGeo(obj.geometry);
            if (Array.isArray(obj.material)) obj.material.forEach(trackMat);
            else trackMat(obj.material);
          }
        });
      }

      // Invisible Layer-1 Proxy Sphere for crisp effortless raycasting
      const proxyMat = trackMat(
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
          colorWrite: false,
        })
      );
      const hitProxy = new THREE.Mesh(
        trackGeo(
          new THREE.SphereGeometry(cfg.planetRadius * (isCoarsePointer ? 1.82 : 1.62), 12, 12)
        ),
        proxyMat
      );
      hitProxy.layers.set(1);
      hitProxy.userData.sectorId = cfg.id;
      planetAnchor.add(hitProxy);
      raycastTargets.push(hitProxy);

      planetRuntimes[sec.id] = {
        id: sec.id,
        orbitPivot,
        planetAnchor,
        sphereMesh,
        atmosphereMat,
        orbitRingMat,
        targetRing,
        targetRingMat,
        moonPivot,
        beaconPivot,
        hitProxy,
        orbitalAngle: cfg.startAngle,
        orbitSpeed: cfg.orbitSpeed,
        spinSpeed: cfg.spinSpeed,
        planetRadius: cfg.planetRadius,
      };
    });

    // 10. Animated 7-Part Star-Cruiser Spaceship patrolling the Star System
    const { group: cruiserGroup, thrusterLeft, thrusterRight } = buildStarCruiserGroup();
    cruiserGroup.scale.setScalar(0.92);
    scene.add(cruiserGroup);
    cruiserGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        trackGeo(obj.geometry);
        if (Array.isArray(obj.material)) obj.material.forEach(trackMat);
        else trackMat(obj.material);
      }
    });

    const patrolCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(10, 3.2, 10),
        new THREE.Vector3(-4, 5.4, 15.5),
        new THREE.Vector3(-19, 2.2, 6),
        new THREE.Vector3(-12, -1.8, -14),
        new THREE.Vector3(6, 4.2, -20),
        new THREE.Vector3(21, 1.8, -6),
        new THREE.Vector3(16, -1.2, 12),
      ],
      true
    );
    let cruiserT = 0;

    // Live theme updater callback (updates background, fog, stars, hemiLight seamlessly)
    liveThemeSyncRef.current = (nextTheme: ThemeMode) => {
      const dark = isDarkTheme(nextTheme);
      scene.background = (dark ? spaceBgColor : brightBgColor).clone();
      fog.color.copy(dark ? spaceBgColor : brightBgColor);
      fog.density = dark ? 0.0085 : 0.0062;
      starMat.opacity = dark ? 0.92 : 0.62;
      hemiLight.intensity = dark ? 0.72 : 1.2;
    };

    // Pre-compile shaders on hardware GPU
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 11. Raycaster Interaction (Throttled Hover + Drag-Safe Click)
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const ndcPointer = new THREE.Vector2();
    let lastHoverCheck = 0;
    let pointerDownPos = { x: 0, y: 0 };

    const updatePointerNdc = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndcPointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndcPointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      return rect;
    };

    const pickSectorAt = (clientX: number, clientY: number): SectorId | null => {
      updatePointerNdc(clientX, clientY);
      raycaster.setFromCamera(ndcPointer, camera);
      const hits = raycaster.intersectObjects(raycastTargets, false);
      if (hits.length > 0) {
        return (hits[0].object.userData.sectorId as SectorId | undefined) ?? null;
      }
      return null;
    };

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheck < 32) return;
      lastHoverCheck = now;

      const hitId = pickSectorAt(e.clientX, e.clientY);
      renderer.domElement.style.cursor = hitId ? 'pointer' : 'grab';
      if (hoveredRef.current !== hitId) {
        setHoveredSector(hitId);
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
      if (!hoveredRef.current) {
        renderer.domElement.style.cursor = 'grabbing';
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      renderer.domElement.style.cursor = hoveredRef.current ? 'pointer' : 'grab';
      if (Math.hypot(dx, dy) > 9) return; // Dragged to orbit; don't trigger click

      const hitId = pickSectorAt(e.clientX, e.clientY);
      if (hitId) {
        if (focusedRef.current === hitId) {
          soundEngine.playWarp();
          onSelectSectorRef.current(hitId);
        } else {
          soundEngine.playHoverLock();
          setFocusedSector(hitId);
        }
      } else if (focusedRef.current) {
        soundEngine.playClick();
        setFocusedSector(null);
      }
    };

    const handlePointerLeave = () => {
      if (hoveredRef.current !== null) {
        setHoveredSector(null);
      }
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);

    // 12. ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(entry.contentRect.width, 320);
      const h = Math.max(entry.contentRect.height, 320);
      applyResponsiveCamera(w, h);
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // 13. Render Loop (afterDraw pacing on Software WebGL, rAF on Hardware GPU)
    let disposed = false;
    let rafId = 0;
    let swTimerId: number | null = null;
    let prevTime = performance.now();

    const glCtx = isSoftwareGl ? renderer.getContext() : null;
    const afterDraw = (fn: () => void) => {
      if (disposed) return;
      if (glCtx && glCtx instanceof WebGL2RenderingContext) {
        const sync = glCtx.fenceSync(glCtx.SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (sync) {
          glCtx.flush();
          const poll = () => {
            if (disposed) {
              glCtx.deleteSync(sync);
              return;
            }
            const status = glCtx.clientWaitSync(sync, 0, 0);
            if (status === glCtx.WAIT_FAILED || status === glCtx.CONDITION_SATISFIED || status === glCtx.ALREADY_SIGNALED) {
              glCtx.deleteSync(sync);
              swTimerId = window.setTimeout(fn, 65);
            } else {
              swTimerId = window.setTimeout(poll, 16);
            }
          };
          swTimerId = window.setTimeout(poll, 16);
          return;
        }
      }
      swTimerId = window.setTimeout(fn, 80);
    };

    const tick = () => {
      if (disposed) return;

      const now = performance.now();
      const delta = Math.min((now - prevTime) / 1000, 0.08);
      prevTime = now;
      const elapsed = now * 0.001;

      const curFocused = focusedRef.current;
      const curHovered = hoveredRef.current;
      const pausedAll = orbitPausedRef.current;

      // Central Sun animation
      sunMesh.rotation.y += delta * 0.14;
      solarRingA.rotation.z += delta * 0.22;
      solarRingB.rotation.z -= delta * 0.18;
      const sunPulse = 1 + Math.sin(elapsed * 2.1) * 0.045;
      innerCorona.scale.set(9.8 * sunPulse, 9.8 * sunPulse, 1);

      // Distant starfield & asteroid belt drift
      starField.rotation.y += delta * 0.008;
      if (!pausedAll) {
        asteroidBelt.rotation.y += delta * 0.032;
      }

      // Comets flying elliptical paths across deep space
      const cometAngleA = elapsed * 0.34;
      cometA.position.set(
        Math.cos(cometAngleA) * 31,
        Math.sin(cometAngleA * 1.4) * 9 + 4,
        Math.sin(cometAngleA) * 26
      );
      _vec3A.set(
        Math.cos(cometAngleA + 0.04) * 31,
        Math.sin((cometAngleA + 0.04) * 1.4) * 9 + 4,
        Math.sin(cometAngleA + 0.04) * 26
      );
      cometA.lookAt(_vec3A);

      const cometAngleB = -elapsed * 0.26 + 2.4;
      cometB.position.set(
        Math.cos(cometAngleB) * 35,
        Math.cos(cometAngleB * 1.2) * 8 - 3,
        Math.sin(cometAngleB) * 29
      );
      _vec3A.set(
        Math.cos(cometAngleB - 0.04) * 35,
        Math.cos((cometAngleB - 0.04) * 1.2) * 8 - 3,
        Math.sin(cometAngleB - 0.04) * 29
      );
      cometB.lookAt(_vec3A);

      // Update 8 3D Planets
      SECTORS.forEach((sec) => {
        const pr = planetRuntimes[sec.id];
        const isFocus = curFocused === sec.id;
        const isHover = curHovered === sec.id;

        // Genuine 3D Y-axis sphere spin NEVER stops so spheres always show full 3D depth!
        pr.sphereMesh.rotation.y += pr.spinSpeed * (isFocus ? 0.72 : 1) * delta;

        // Pause orbital revolution for that planet if paused globally OR hovered/focused for crisp UX
        if (!pausedAll && !isFocus && !isHover) {
          pr.orbitalAngle += pr.orbitSpeed * delta;
          pr.orbitPivot.rotation.y = pr.orbitalAngle;
        }

        if (pr.moonPivot) {
          pr.moonPivot.rotation.y += delta * 0.95;
        }
        if (pr.beaconPivot) {
          pr.beaconPivot.rotation.y -= delta * 0.72;
        }

        // Smooth hover / focus visual highlight
        const targetScale = isFocus ? 1.12 : isHover ? 1.16 : 1.0;
        const curScale = pr.planetAnchor.scale.x;
        const nextScale = THREE.MathUtils.damp(curScale, targetScale, 8, delta);
        pr.planetAnchor.scale.setScalar(nextScale);

        pr.orbitRingMat.opacity = THREE.MathUtils.damp(
          pr.orbitRingMat.opacity,
          isFocus ? 0.85 : isHover ? 0.65 : 0.22,
          8,
          delta
        );
        pr.targetRingMat.opacity = THREE.MathUtils.damp(
          pr.targetRingMat.opacity,
          isFocus ? 0.92 : isHover ? 0.78 : 0.0,
          10,
          delta
        );
        if (isFocus || isHover) {
          pr.targetRing.rotation.z += delta * 1.4;
        }
      });

      // Animate 7-Part Star-Cruiser Spaceship
      const thrusterPulse = 0.85 + Math.sin(elapsed * 26) * 0.28;
      thrusterLeft.scale.z = thrusterPulse;
      thrusterRight.scale.z = thrusterPulse;

      if (curFocused && planetRuntimes[curFocused]) {
        const pr = planetRuntimes[curFocused];
        pr.planetAnchor.getWorldPosition(_vec3A);
        const escortAngle = elapsed * 0.75;
        _vec3B.set(
          _vec3A.x + Math.cos(escortAngle) * (pr.planetRadius * 2.15),
          _vec3A.y + pr.planetRadius * 0.72 + Math.sin(elapsed * 1.6) * 0.25,
          _vec3A.z + Math.sin(escortAngle) * (pr.planetRadius * 2.15)
        );
        cruiserGroup.position.lerp(_vec3B, Math.min(1, delta * 3.5));
        _vec3C.set(
          _vec3A.x + Math.cos(escortAngle + 0.25) * (pr.planetRadius * 2.15),
          _vec3A.y + pr.planetRadius * 0.72,
          _vec3A.z + Math.sin(escortAngle + 0.25) * (pr.planetRadius * 2.15)
        );
        cruiserGroup.lookAt(_vec3C);
      } else {
        cruiserT = (cruiserT + delta * 0.045) % 1;
        patrolCurve.getPointAt(cruiserT, _vec3A);
        patrolCurve.getPointAt((cruiserT + 0.015) % 1, _vec3B);
        cruiserGroup.position.lerp(_vec3A, Math.min(1, delta * 4));
        cruiserGroup.lookAt(_vec3B);
      }

      // Smooth Camera Fly-To / Return-to-Overview
      if (isAutoGlidingRef.current) {
        if (cameraGoalRef.current === 'planet' && curFocused && planetRuntimes[curFocused]) {
          const pr = planetRuntimes[curFocused];
          pr.planetAnchor.getWorldPosition(_vec3A); // Desired target

          // Compute outward vantage direction from the Sun so sun lights the planet face nicely!
          _vec3B.copy(_vec3A).normalize();
          if (_vec3B.lengthSq() < 0.01) _vec3B.set(0, 0, 1);
          const dist = pr.planetRadius * (camera.aspect < 1 ? 4.85 : 4.2) + 2.4;
          _vec3C.set(
            _vec3A.x + _vec3B.x * dist + _vec3B.z * (dist * 0.42),
            _vec3A.y + pr.planetRadius * 1.85 + 1.15,
            _vec3A.z + _vec3B.z * dist - _vec3B.x * (dist * 0.42)
          );

          controls.target.x = THREE.MathUtils.damp(controls.target.x, _vec3A.x, 5.5, delta);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, _vec3A.y, 5.5, delta);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, _vec3A.z, 5.5, delta);

          camera.position.x = THREE.MathUtils.damp(camera.position.x, _vec3C.x, 4.6, delta);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, _vec3C.y, 4.6, delta);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, _vec3C.z, 4.6, delta);

          if (camera.position.distanceTo(_vec3C) < 0.08 && controls.target.distanceTo(_vec3A) < 0.06) {
            isAutoGlidingRef.current = false;
          }
        } else if (cameraGoalRef.current === 'overview') {
          controls.target.x = THREE.MathUtils.damp(controls.target.x, _overviewTarget.x, 5.0, delta);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, _overviewTarget.y, 5.0, delta);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, _overviewTarget.z, 5.0, delta);

          camera.position.x = THREE.MathUtils.damp(camera.position.x, dynOverviewPos.x, 4.2, delta);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, dynOverviewPos.y, 4.2, delta);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, dynOverviewPos.z, 4.2, delta);

          if (camera.position.distanceTo(dynOverviewPos) < 0.12) {
            isAutoGlidingRef.current = false;
          }
        }
      }

      controls.update();
      renderer.render(scene, camera);

      // Project 3D Planet Nameplate Overlays directly via DOM refs (zero React re-renders!)
      const canvasW = container.clientWidth;
      const canvasH = container.clientHeight;
      const isNarrow = canvasW < 768;
      const topPad = isNarrow ? 74 : 70;
      const bottomPad = isNarrow ? 152 : 42;
      const sidePad = isNarrow ? 34 : 44;

      SECTORS.forEach((sec) => {
        const el = labelRefs.current[sec.id];
        if (!el) return;
        const pr = planetRuntimes[sec.id];
        pr.planetAnchor.getWorldPosition(_vec3A);
        _vec3A.y += pr.planetRadius * 1.48 + 0.35;
        _vec3A.project(camera);

        const inFront = _vec3A.z > -1 && _vec3A.z < 1;
        const sx = (_vec3A.x * 0.5 + 0.5) * canvasW;
        const sy = (-_vec3A.y * 0.5 + 0.5) * canvasH;
        const inBounds = sx > sidePad && sx < canvasW - sidePad && sy > topPad && sy < canvasH - bottomPad;

        if (!inFront || !inBounds) {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          return;
        }

        const dimmed = Boolean(curFocused && curFocused !== sec.id);
        el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -100%)`;
        el.style.opacity = dimmed ? '0.28' : '1';
        el.style.pointerEvents = 'auto';
      });

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      rafId = window.requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      liveThemeSyncRef.current = null;
      if (rafId) window.cancelAnimationFrame(rafId);
      if (swTimerId !== null) window.clearTimeout(swTimerId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', handleControlsStart);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      controls.dispose();
      disposableGeos.forEach((g) => g.dispose());
      disposableMats.forEach((m) => m.dispose());
      disposableTexs.forEach((t) => t.dispose());
      envRT.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleResetOverview = () => {
    soundEngine.playClick();
    setFocusedSector(null);
    cameraGoalRef.current = 'overview';
    isAutoGlidingRef.current = true;
  };

  const handleDockPlanetClick = (id: SectorId) => {
    if (focusedSector === id) {
      soundEngine.playWarp();
      onSelectSector(id);
      return;
    }
    soundEngine.playHoverLock();
    setFocusedSector(id);
  };

  return (
    <div className="relative h-[calc(100dvh-56px)] sm:h-[calc(100dvh-68px)] min-h-[520px] w-full overflow-hidden select-none">
      {/* ================= FULL-VIEWPORT THREE.JS WEBGL 3D SPACE CANVAS ================= */}
      <div
        ref={canvasMountRef}
        aria-label="3D 星際探險太陽系舞台（可拖曳 360 度環視、滾輪縮放、點擊八大數學星球）"
        className="absolute inset-0 h-full w-full"
      />

      {/* ================= 3D-PROJECTED FLOATING PLANET NAMEPLATES ================= */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {SECTORS.map((sec) => {
          const meta = PLANET_META[sec.id];
          const stats = getSectorStarStats(sec, profile.sectors[sec.id]);
          const isFocused = focusedSector === sec.id;
          const isHovered = hoveredSector === sec.id;
          const isRecommended = nextRecommendedSector === sec.id && !focusedSector;
          const isCompleted = stats.earned === stats.total;

          return (
            <button
              key={sec.id}
              ref={(node) => {
                labelRefs.current[sec.id] = node;
              }}
              type="button"
              data-sfx="custom"
              onMouseEnter={() => setHoveredSector(sec.id)}
              onMouseLeave={() => setHoveredSector((prev) => (prev === sec.id ? null : prev))}
              onClick={() => handleDockPlanetClick(sec.id)}
              aria-label={`飛往第 ${sec.code} 星球 ${sec.shortTitle}，目前已收集 ${stats.earned} 顆星`}
              style={{
                opacity: 0,
                borderColor: isFocused || isHovered ? meta.color : undefined,
              }}
              className={`webgl-hud-surface pointer-events-auto absolute top-0 left-0 flex items-center gap-1 rounded-xl px-2 py-1 text-[10px] font-bold shadow-lg transition-[border-color,box-shadow] duration-150 sm:gap-1.5 sm:px-2.5 sm:text-[11px] ${
                isFocused
                  ? 'ring-2 ring-cyan-400/80'
                  : isRecommended
                  ? 'ring-1 ring-amber-400/70'
                  : ''
              }`}
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: meta.color }}
              />
              <span className="font-mono text-[9px] opacity-80 sm:text-[10px]">{sec.code}</span>
              <span className="whitespace-nowrap">{sec.shortTitle}</span>
              <span
                className={`items-center gap-0.5 rounded-md px-1 py-0.5 font-mono text-[10px] ${
                  isFocused || isRecommended ? 'inline-flex' : 'hidden sm:inline-flex'
                } ${
                  isCompleted
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                }`}
              >
                <Star className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
                {stats.earned}/{stats.total}
              </span>
            </button>
          );
        })}
      </div>

      {/* ================= TOP-LEFT COMPACT ACHIEVEMENT WALL HUD (NO BACKDROP BLUR) ================= */}
      <div className="pointer-events-none absolute top-2 left-2.5 z-20 flex max-w-[calc(100%-175px)] flex-col gap-2 sm:top-3 sm:left-4 sm:max-w-[330px]">
        <div className="pointer-events-auto">
          <AchievementWallBar profile={profile} theme={theme} variant="corner" noBlur />
        </div>
        <div className="webgl-hud-surface pointer-events-auto hidden items-center gap-2 rounded-xl px-3 py-1.5 text-[11px] font-semibold text-slate-700 md:inline-flex dark:text-slate-200">
          <Compass className="h-3.5 w-3.5 text-sky-600 dark:text-cyan-300" aria-hidden="true" />
          <span>拖曳 360° 環視宇宙 · 滾輪縮放 · 點擊星球飛近登陸</span>
        </div>
      </div>

      {/* ================= TOP-RIGHT COMPACT SYSTEM CONTROLS HUD (NO BACKDROP BLUR) ================= */}
      <div className="pointer-events-none absolute top-2 right-2.5 z-20 flex flex-col items-end gap-2 sm:top-3 sm:right-4">
        <div className="webgl-hud-surface pointer-events-auto flex flex-wrap items-center justify-end gap-1 rounded-2xl p-1 sm:gap-1.5 sm:p-1.5">
          <button
            type="button"
            onClick={() => onToggleTheme(getNextThemeMode(theme))}
            title={`點擊切換光源：${themeMeta.label}`}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-xl bg-slate-900/5 px-2 py-1.5 text-[11px] font-bold text-slate-800 transition-colors hover:bg-sky-500/15 sm:min-h-0 sm:gap-1.5 sm:px-2.5 dark:bg-white/10 dark:text-white dark:hover:bg-cyan-500/20"
          >
            {isDark ? (
              <Moon className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
            ) : (
              <Sun className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{themeMeta.label}</span>
          </button>

          <AudioToggleButtons compact />

          <button
            type="button"
            onClick={() => onChangeMode(mode === 'student' ? 'projector' : 'student')}
            className={`inline-flex min-h-[36px] items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-bold transition-colors sm:min-h-0 sm:px-2.5 ${
              mode === 'projector'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-900/5 text-slate-800 hover:bg-sky-500/15 dark:bg-white/10 dark:text-slate-100'
            }`}
          >
            <span className="sm:hidden">{mode === 'projector' ? '投影' : '自學'}</span>
            <span className="hidden sm:inline">{mode === 'projector' ? '教室投影' : '學生自學'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenBattle}
            className="hidden items-center gap-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1.5 text-[11px] font-extrabold text-white shadow-sm transition-transform hover:scale-105 md:inline-flex"
          >
            <Swords className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden md:inline">多人搶答</span>
          </button>

          <button
            type="button"
            onClick={onOpenWrongModal}
            className="hidden items-center gap-1 rounded-xl bg-slate-900/5 px-2.5 py-1.5 text-[11px] font-bold text-slate-800 hover:bg-rose-500/15 md:inline-flex dark:bg-white/10 dark:text-slate-100"
          >
            <BookMarked className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" aria-hidden="true" />
            <span className="font-mono">{wrongCount}</span>
          </button>

          <button
            type="button"
            onClick={onOpenProgressModal}
            aria-label="題庫與雲端管理"
            className="hidden items-center gap-1 rounded-xl bg-slate-900/5 px-2.5 py-1.5 text-[11px] font-bold text-slate-800 hover:bg-sky-500/15 md:inline-flex dark:bg-white/10 dark:text-slate-100"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-sky-600 dark:text-cyan-300" aria-hidden="true" />
            <span className="hidden xl:inline">題庫雲端</span>
          </button>
        </div>
      </div>

      {/* ================= FOCUSED PLANET MISSION LAUNCH OVERLAY ================= */}
      {focusedSectorDef && focusedSectorStats && (
        <div
          className={`pointer-events-auto fixed left-1/2 z-30 w-[94%] max-w-[440px] -translate-x-1/2 transition-all ${
            dockOpen
              ? 'bottom-[calc(176px+env(safe-area-inset-bottom))] md:bottom-[116px]'
              : 'bottom-[calc(132px+env(safe-area-inset-bottom))] md:bottom-12'
          }`}
        >
          <div className="webgl-hud-surface rounded-2xl p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold text-white"
                    style={{ backgroundColor: PLANET_META[focusedSectorDef.id].color }}
                  >
                    <Crosshair className="h-3 w-3" aria-hidden="true" />
                    第 {focusedSectorDef.code} 星球鎖定
                  </span>
                  <span className="text-xs font-semibold text-sky-700 dark:text-cyan-300">
                    {PLANET_SUBTITLE_MAP[focusedSectorDef.id]}
                  </span>
                </div>
                <h2 className="mt-1.5 text-lg font-extrabold text-slate-900 dark:text-white">
                  {focusedSectorDef.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={handleResetOverview}
                aria-label="取消特寫並返回星系全景"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-300">
                <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                {focusedSectorStats.earned} / {focusedSectorStats.total} 顆星星
              </span>
              <span>·</span>
              <span>創意對戰：{focusedSectorDef.creativeName}</span>
            </div>

            <div className="mt-3.5 flex items-center gap-2">
              <button
                type="button"
                data-sfx="custom"
                onClick={() => {
                  soundEngine.playWarp();
                  onSelectSector(focusedSectorDef.id);
                }}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-md transition-transform hover:scale-[1.02]"
              >
                <span>立即降落探索</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={handleResetOverview}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-300/80 bg-white/80 px-3 py-2.5 text-xs font-bold text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>全景</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= COLLAPSIBLE BOTTOM STAR-SYSTEM CONTROL DOCK ================= */}
      <div className="pointer-events-none fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-1/2 z-20 flex w-[96%] max-w-[1040px] -translate-x-1/2 flex-col items-center md:bottom-2.5">
        <button
          type="button"
          onClick={() => setDockOpen((v) => !v)}
          aria-expanded={dockOpen}
          className="webgl-hud-surface pointer-events-auto inline-flex items-center gap-1.5 rounded-t-xl border-b-0 px-3.5 py-1 text-[11px] font-bold text-slate-800 shadow-md transition-colors hover:text-sky-600 dark:text-slate-100 dark:hover:text-cyan-300"
        >
          {dockOpen ? (
            <>
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="md:hidden">收合遙測儀表板</span>
              <span className="hidden md:inline">收合星際導航列 (H)</span>
            </>
          ) : (
            <>
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="md:hidden">展開星系遙測 · 暫停公轉</span>
              <span className="hidden md:inline">展開星際導航列 · 8 大探索星球 (H)</span>
            </>
          )}
        </button>

        {/* On mobile when collapsed, still keep the 8-planet swipeable quick-fly strip cleanly docked above MobileBottomNav */}
        <div className="webgl-hud-surface pointer-events-auto flex w-full flex-col gap-2 rounded-2xl px-2.5 py-2 shadow-2xl md:px-3 md:py-2.5 lg:flex-row lg:items-center lg:justify-between">
          {/* Left Telemetry + Orbit Controls */}
          <div
            className={`${
              dockOpen ? 'flex' : 'hidden'
            } flex-wrap items-center justify-between gap-2 lg:justify-start`}
          >
            <div className="flex items-center gap-2.5 text-xs font-bold">
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-300">
                <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                <span className="font-mono">
                  {totalEarnedStars}/{totalSystemStars}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-300">
                <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="font-mono">{completedPlanets}/8</span>
              </span>
              <span className="inline-flex items-center gap-1 text-sky-700 dark:text-cyan-300">
                <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="font-mono">{profile.totalScore} 分</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setOrbitPaused((p) => !p)}
                className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-slate-900/5 px-2.5 py-1 text-[11px] font-bold text-slate-800 hover:bg-sky-500/15 sm:min-h-0 dark:bg-white/10 dark:text-slate-100"
              >
                {orbitPaused ? (
                  <>
                    <Play className="h-3 w-3 text-emerald-500" aria-hidden="true" />
                    <span>繼續公轉</span>
                  </>
                ) : (
                  <>
                    <Pause className="h-3 w-3 text-sky-500 dark:text-cyan-300" aria-hidden="true" />
                    <span>暫停公轉</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResetOverview}
                className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-slate-900/5 px-2.5 py-1 text-[11px] font-bold text-slate-800 hover:bg-sky-500/15 sm:min-h-0 dark:bg-white/10 dark:text-slate-100"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                <span>全景</span>
              </button>

              <button
                type="button"
                onClick={onSwitchToGrid}
                className="hidden items-center gap-1 rounded-lg bg-slate-900/5 px-2.5 py-1 text-[11px] font-bold text-slate-800 hover:bg-sky-500/15 md:inline-flex dark:bg-white/10 dark:text-slate-100"
              >
                <LayoutGrid className="h-3 w-3" aria-hidden="true" />
                <span>航圖</span>
              </button>
            </div>
          </div>

          {/* Right Quick-Fly 8 Planets Strip (always swipeable on mobile even when telemetry is collapsed) */}
          <div
            className={`${
              dockOpen ? 'flex' : 'flex md:hidden'
            } no-scrollbar items-center gap-1.5 overflow-x-auto pb-0.5 lg:pb-0`}
          >
            {SECTORS.map((sec) => {
              const meta = PLANET_META[sec.id];
              const stats = getSectorStarStats(sec, profile.sectors[sec.id]);
              const isFocused = focusedSector === sec.id;
              const isDone = stats.earned === stats.total;
              const isNext = nextRecommendedSector === sec.id && !focusedSector;

              return (
                <button
                  key={sec.id}
                  type="button"
                  data-sfx="custom"
                  onMouseEnter={() => setHoveredSector(sec.id)}
                  onMouseLeave={() => setHoveredSector((p) => (p === sec.id ? null : p))}
                  onClick={() => handleDockPlanetClick(sec.id)}
                  className={`inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition-all sm:min-h-0 ${
                    isFocused
                      ? 'border-cyan-400 bg-sky-500/20 text-sky-900 shadow-sm dark:text-white'
                      : isNext
                      ? 'border-amber-400/70 bg-amber-500/10 text-slate-900 dark:text-white'
                      : 'border-slate-300/60 bg-white/60 text-slate-800 hover:border-sky-400 dark:border-slate-700/70 dark:bg-slate-900/65 dark:text-slate-200'
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: meta.color }}
                  />
                  <span className="font-mono text-[10px] opacity-75">{sec.code}</span>
                  <span>{sec.shortTitle}</span>
                  {isDone && (
                    <Star className="h-3 w-3 fill-emerald-500 text-emerald-500" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
