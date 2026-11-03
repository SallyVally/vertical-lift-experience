// The mobile path keeps the spatial experience, with a smaller GPU and memory budget.
export function selectQuality() {
  const requested = new URLSearchParams(location.search).get('quality');
  const coarse = matchMedia('(pointer: coarse)').matches;
  const shortSide = Math.min(innerWidth, innerHeight);
  const compact = innerWidth < 800 || (coarse && shortSide <= 900);
  const mobile = requested === 'mobile' || requested === 'safe' || (requested !== 'desktop' && compact);
  const modest = (navigator.deviceMemory && navigator.deviceMemory <= 2) || navigator.hardwareConcurrency <= 4;
  const safe = requested === 'safe' || (mobile && modest);
  return {
    name: mobile ? (safe ? 'mobile-safe' : 'mobile') : 'desktop',
    mobile, safe,
    fps: mobile ? (safe ? 24 : 30) : 60,
    dpr: mobile ? (safe ? 1.25 : 1.5) : 2,
    pixelBudget: mobile ? (safe ? 600000 : 900000) : 5500000,
    mirrorSize: mobile ? (safe ? 768 : 1024) : 1536,
    mirrorSamples: mobile ? 2 : 4,
    mirrorFps: mobile ? (safe ? 10 : 15) : 60,
    textScale: 1,
    anisotropy: mobile ? 4 : 8,
    assets: mobile ? {
      model: './assets/mobile/elevator.glb',
      environment: './assets/mobile/studio.hdr',
      lighting: './assets/mobile/cabin-light.hdr',
      wood: './assets/mobile/walnut.webp?v=clarity-3'
    } : {
      model: './elevator-v4.glb',
      environment: './materials/studio.hdr',
      lighting: './materials/cabin-light.hdr',
      wood: './materials/walnut_veneer_02_Diffuse.jpg'
    }
  };
}

export function renderRatio(profile, width, height) {
  return Math.min(devicePixelRatio || 1, profile.dpr, Math.sqrt(profile.pixelBudget / (width * height)));
}
