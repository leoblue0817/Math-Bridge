import * as THREE from 'three';
import { SectorId } from '../types';

export interface PlanetOrbitConfig {
  id: SectorId;
  orbitRadius: number;
  orbitSpeed: number;
  orbitTiltX: number;
  orbitTiltZ: number;
  startAngle: number;
  planetRadius: number;
  axialTilt: number;
  spinSpeed: number;
  baseHex: string;
  secondaryHex: string;
  oceanHex: string;
  glowHex: string;
  style: 'continents' | 'bands' | 'cyber' | 'canyon' | 'emerald' | 'ice' | 'citadel';
  hasRing?: boolean;
  ringColor?: string;
  hasMoon?: boolean;
  hasBeacon?: boolean;
}

export const SOLAR_PLANET_CONFIGS: Record<SectorId, PlanetOrbitConfig> = {
  s1: {
    id: 's1',
    orbitRadius: 6.4,
    orbitSpeed: 0.24,
    orbitTiltX: 0.08,
    orbitTiltZ: 0.04,
    startAngle: -0.65,
    planetRadius: 1.08,
    axialTilt: 0.28,
    spinSpeed: 0.55,
    baseHex: '#0EA5E9',
    secondaryHex: '#FDE68A',
    oceanHex: '#0C4A6E',
    glowHex: '#38BDF8',
    style: 'ice',
    hasRing: true,
    ringColor: '#7DD3FC',
    hasMoon: true,
    hasBeacon: true,
  },
  s2: {
    id: 's2',
    orbitRadius: 9.0,
    orbitSpeed: 0.19,
    orbitTiltX: -0.06,
    orbitTiltZ: 0.07,
    startAngle: 0.72,
    planetRadius: 1.12,
    axialTilt: 0.22,
    spinSpeed: 0.48,
    baseHex: '#8B5CF6',
    secondaryHex: '#EDE9FE',
    oceanHex: '#4C1D95',
    glowHex: '#C4B5FD',
    style: 'bands',
    hasBeacon: true,
  },
  s3: {
    id: 's3',
    orbitRadius: 11.6,
    orbitSpeed: 0.155,
    orbitTiltX: 0.09,
    orbitTiltZ: -0.05,
    startAngle: 2.05,
    planetRadius: 1.18,
    axialTilt: 0.35,
    spinSpeed: 0.44,
    baseHex: '#F59E0B',
    secondaryHex: '#34D399',
    oceanHex: '#0C4A6E',
    glowHex: '#FBBF24',
    style: 'continents',
    hasMoon: true,
  },
  s4: {
    id: 's4',
    orbitRadius: 14.5,
    orbitSpeed: 0.125,
    orbitTiltX: -0.09,
    orbitTiltZ: 0.05,
    startAngle: 3.32,
    planetRadius: 1.32,
    axialTilt: 0.42,
    spinSpeed: 0.38,
    baseHex: '#14B8A6',
    secondaryHex: '#38BDF8',
    oceanHex: '#0F172A',
    glowHex: '#2DD4BF',
    style: 'cyber',
    hasRing: true,
    ringColor: '#5EEAD4',
  },
  s5: {
    id: 's5',
    orbitRadius: 17.6,
    orbitSpeed: 0.1,
    orbitTiltX: 0.06,
    orbitTiltZ: 0.08,
    startAngle: -1.95,
    planetRadius: 1.16,
    axialTilt: 0.18,
    spinSpeed: 0.52,
    baseHex: '#FB7185',
    secondaryHex: '#FDE68A',
    oceanHex: '#881337',
    glowHex: '#FDA4AF',
    style: 'canyon',
    hasMoon: true,
  },
  s6: {
    id: 's6',
    orbitRadius: 20.6,
    orbitSpeed: 0.082,
    orbitTiltX: -0.05,
    orbitTiltZ: -0.07,
    startAngle: -0.25,
    planetRadius: 1.36,
    axialTilt: 0.38,
    spinSpeed: 0.36,
    baseHex: '#10B981',
    secondaryHex: '#6EE7B7',
    oceanHex: '#064E3B',
    glowHex: '#34D399',
    style: 'emerald',
    hasRing: true,
    ringColor: '#6EE7B7',
    hasMoon: true,
  },
  s7: {
    id: 's7',
    orbitRadius: 23.8,
    orbitSpeed: 0.066,
    orbitTiltX: 0.07,
    orbitTiltZ: -0.06,
    startAngle: 1.38,
    planetRadius: 1.24,
    axialTilt: 0.31,
    spinSpeed: 0.42,
    baseHex: '#F97316',
    secondaryHex: '#E0F2FE',
    oceanHex: '#7C2D12',
    glowHex: '#FDBA74',
    style: 'bands',
    hasRing: true,
    ringColor: '#FDBA74',
  },
  s8: {
    id: 's8',
    orbitRadius: 27.0,
    orbitSpeed: 0.054,
    orbitTiltX: -0.08,
    orbitTiltZ: 0.05,
    startAngle: 2.75,
    planetRadius: 1.28,
    axialTilt: 0.25,
    spinSpeed: 0.45,
    baseHex: '#6366F1',
    secondaryHex: '#22D3EE',
    oceanHex: '#1E1B4B',
    glowHex: '#818CF8',
    style: 'citadel',
    hasMoon: true,
    hasBeacon: true,
  },
};

export function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

/**
 * Deterministic seeded PRNG for procedural planet terrain & starfields
 */
function createRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Generates rich equirectangular procedural CanvasTexture so 3D spheres look truly sculptural while rotating!
 */
export function createPlanetSurfaceTexture(
  config: PlanetOrbitConfig,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const rand = createRng(config.id.charCodeAt(1) * 9173);

  // 1. Ocean / atmospheric base gradient
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, config.secondaryHex);
  bg.addColorStop(0.18, config.oceanHex);
  bg.addColorStop(0.5, config.oceanHex);
  bg.addColorStop(0.84, config.oceanHex);
  bg.addColorStop(1, config.secondaryHex);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  if (config.style === 'bands' || config.style === 'ice') {
    // Swirling gas/ice storm belts (horizontal wraps seamlessly at X edges)
    for (let y = 16; y < height - 16; y += 12) {
      ctx.fillStyle = y % 24 === 0 ? config.baseHex : config.secondaryHex;
      ctx.globalAlpha = 0.25 + rand() * 0.45;
      const bandH = 6 + rand() * 14;
      ctx.fillRect(0, y, width, bandH);
    }
    // Oval cyclone storm eyes
    for (let i = 0; i < 6; i++) {
      const cx = rand() * width;
      const cy = 48 + rand() * (height - 96);
      const rx = 14 + rand() * 24;
      const ry = 7 + rand() * 10;
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = config.secondaryHex;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (config.style === 'cyber' || config.style === 'citadel') {
    // Geometric tech continents + glowing orbital grid veins
    for (let i = 0; i < 18; i++) {
      const cx = rand() * width;
      const cy = 34 + rand() * (height - 68);
      const w = 36 + rand() * 72;
      const h = 18 + rand() * 36;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = i % 3 === 0 ? config.secondaryHex : config.baseHex;
      ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
      if (cx + w / 2 > width) ctx.fillRect(cx - width - w / 2, cy - h / 2, w, h);
      if (cx - w / 2 < 0) ctx.fillRect(cx + width - w / 2, cy - h / 2, w, h);
    }
    // Glowing circuit trace lines
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = '#E0F2FE';
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const y = 24 + rand() * (height - 48);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y + (rand() - 0.5) * 28);
      ctx.stroke();
    }
  } else {
    // Organic sculpted continents + golden sandy rims + river/canyon veins
    for (let i = 0; i < 24; i++) {
      const cx = rand() * width;
      const cy = 36 + rand() * (height - 72);
      const rx = 20 + rand() * 48;
      const ry = 14 + rand() * 30;
      const rot = rand() * Math.PI;

      const drawIsland = (offsetX: number) => {
        // Sandy / mineral shore halo
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = config.secondaryHex;
        ctx.beginPath();
        ctx.ellipse(cx + offsetX, cy, rx + 5, ry + 4, rot, 0, Math.PI * 2);
        ctx.fill();

        // Main highland landmass
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = config.baseHex;
        ctx.beginPath();
        ctx.ellipse(cx + offsetX, cy, rx, ry, rot, 0, Math.PI * 2);
        ctx.fill();
      };

      drawIsland(0);
      drawIsland(width);
      drawIsland(-width);
    }

    // Glowing plasma river / canyon streams
    ctx.globalAlpha = 0.68;
    ctx.strokeStyle = config.glowHex;
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const sx = rand() * width;
      const sy = 40 + rand() * (height - 80);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(
        sx + 40,
        sy - 20,
        sx + 80,
        sy + 24,
        sx + 120,
        sy - 8
      );
      ctx.stroke();
    }
  }

  // Polar ice / aurora caps
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, 16);
  ctx.fillRect(0, height - 16, width, 16);

  // Subtle latitudinal highlights
  ctx.globalAlpha = 0.14;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  for (let y = 32; y < height; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = Math.max(1, Math.min(8, maxAnisotropy));
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates radial glow sprite texture for solar corona & stars (zero external image files!)
 */
export function createGlowSpriteTexture(innerHex: string, midHex: string): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, innerHex);
  grad.addColorStop(0.32, midHex);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Builds a 7-part Composite Procedural 3D Space Explorer Cruiser (THREE.Group)
 */
export function buildStarCruiserGroup(): {
  group: THREE.Group;
  thrusterLeft: THREE.Mesh;
  thrusterRight: THREE.Mesh;
} {
  const group = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.28,
    metalness: 0.65,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.35,
    metalness: 0.72,
  });
  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    roughness: 0.12,
    metalness: 0.1,
    clearcoat: 1.0,
    emissive: 0x0369a1,
    emissiveIntensity: 0.45,
  });
  const engineMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.45,
    metalness: 0.85,
  });
  const plumeMat = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.9,
  });

  // 1. Tapered Nose + Main Fuselage (Lathe / Cone+Cylinder)
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.72, 16), hullMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 0.56;
  group.add(nose);

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.86, 16), hullMat);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.z = -0.18;
  group.add(fuselage);

  // 2. Cockpit Canopy
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 12), canopyMat);
  canopy.scale.set(0.85, 0.72, 1.55);
  canopy.position.set(0, 0.16, 0.15);
  group.add(canopy);

  // 3. Swept Delta Wings (Extruded)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0.25);
  wingShape.lineTo(0.82, -0.34);
  wingShape.lineTo(0.82, -0.52);
  wingShape.lineTo(0, -0.35);
  wingShape.closePath();

  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.04,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  wingGeo.rotateX(Math.PI / 2);

  const rightWing = new THREE.Mesh(wingGeo, trimMat);
  rightWing.position.set(0.12, -0.02, -0.05);
  group.add(rightWing);

  const leftWing = new THREE.Mesh(wingGeo, trimMat);
  leftWing.scale.x = -1;
  leftWing.position.set(-0.12, -0.02, -0.05);
  group.add(leftWing);

  // 4. Dorsal Vertical Fin
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.42), trimMat);
  fin.position.set(0, 0.24, -0.4);
  fin.rotation.x = -0.35;
  group.add(fin);

  // 5. Twin Engine Pods & Animated Ion Thruster Plumes
  const podGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.42, 12);
  podGeo.rotateX(Math.PI / 2);

  const podL = new THREE.Mesh(podGeo, engineMat);
  podL.position.set(-0.22, -0.04, -0.54);
  group.add(podL);

  const podR = new THREE.Mesh(podGeo, engineMat);
  podR.position.set(0.22, -0.04, -0.54);
  group.add(podR);

  const plumeGeo = new THREE.ConeGeometry(0.09, 0.48, 10);
  plumeGeo.rotateX(-Math.PI / 2);

  const thrusterLeft = new THREE.Mesh(plumeGeo, plumeMat);
  thrusterLeft.position.set(-0.22, -0.04, -0.92);
  group.add(thrusterLeft);

  const thrusterRight = new THREE.Mesh(plumeGeo, plumeMat);
  thrusterRight.position.set(0.22, -0.04, -0.92);
  group.add(thrusterRight);

  return { group, thrusterLeft, thrusterRight };
}

/**
 * Builds a 5-part Orbital Beacon / Space Station orbiting a planet
 */
export function buildOrbitalBeaconGroup(accentHex: string): THREE.Group {
  const group = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.25,
    metalness: 0.82,
  });
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.22,
    metalness: 0.55,
    emissive: 0x075985,
    emissiveIntensity: 0.35,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });

  // Hub Core
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.28, 12), metalMat);
  group.add(hub);

  // Dish Ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 8, 20), metalMat);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // Left & Right Solar Wings
  const wingGeo = new THREE.BoxGeometry(0.46, 0.02, 0.16);
  const wingL = new THREE.Mesh(wingGeo, panelMat);
  wingL.position.x = -0.34;
  group.add(wingL);

  const wingR = new THREE.Mesh(wingGeo, panelMat);
  wingR.position.x = 0.34;
  group.add(wingR);

  // Glowing Tip Spire
  const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), beaconMat);
  tip.position.y = 0.22;
  group.add(tip);

  return group;
}
