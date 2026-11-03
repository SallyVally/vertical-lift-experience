export function createMonitor(profile) {
  if (new URLSearchParams(location.search).get('perf') !== '1') return null;
  const output = document.createElement('output');
  output.id = 'perf-stats';
  output.style.cssText = 'position:fixed;top:85px;left:10px;z-index:90;max-width:95vw;padding:10px;background:#000d;color:#b9efc5;font:10px monospace;white-space:pre;pointer-events:none';
  document.body.append(output);
  let totalFrames = 0, frames = 0, calls = 0, triangles = 0, cpu = 0, mirrors = 0, last = performance.now();
  const assets = new Set();
  let summary = { profile: profile.name, state: 'loading', frames: 0 };
  const publish = () => { output.dataset.metrics = JSON.stringify(summary); output.textContent = JSON.stringify(summary, null, 2); };
  publish();
  return {
    asset(url) { if (!url.startsWith('blob:')) assets.add(url); },
    status(state) { summary = { ...summary, state, frames: totalFrames }; publish(); last = performance.now(); frames = calls = triangles = cpu = mirrors = 0; },
    frame(renderer, canvas, cpuMs, reflectionPasses) {
      frames++; totalFrames++;
      calls += renderer.info.render.calls; triangles += renderer.info.render.triangles; cpu += cpuMs; mirrors += reflectionPasses;
      const now = performance.now(), duration = now - last;
      if (duration < 1000) return;
      summary = { assets: [...assets], profile: profile.name, state: 'running', frames: totalFrames, fps: +(frames * 1000 / duration).toFixed(1), callsAvg: +(calls / frames).toFixed(1), trianglesAvg: Math.round(triangles / frames), cpuMs: +(cpu / frames).toFixed(2), mirrorFps: +(mirrors * 1000 / duration).toFixed(1), drawWidth: canvas.width, drawHeight: canvas.height, dpr: +renderer.getPixelRatio().toFixed(2), textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries };
      publish(); last = now; frames = calls = triangles = cpu = mirrors = 0;
    }
  };
}
