/**
 * Browser/device compute capability detection for CLIP AI.
 * This is capability detection only; it does not claim that an AI model is loaded.
 */
export function classifyLocalCompute(caps = {}) {
  const cores = Number(caps.hardwareConcurrency) || 1;
  const memory = Number(caps.deviceMemory) || 0;
  const webgpu = Boolean(caps.webgpu);
  const wasm = Boolean(caps.webAssembly);
  const secure = Boolean(caps.secureContext);
  const workers = Boolean(caps.workers);
  const videoDecode = Boolean(caps.videoDecoder || caps.webCodecs);

  let tier = 'cloud-fallback';
  if (secure && webgpu && cores >= 6 && memory >= 6 && workers) tier = 'local-strong';
  else if (secure && (webgpu || (wasm && cores >= 4 && memory >= 4)) && workers) tier = 'local-hybrid';

  return {
    tier,
    canRunLocalTasks: wasm && workers,
    canUseWebGPU: secure && webgpu,
    canDecodeVideoEfficiently: videoDecode,
    notes: {
      localStrong: 'الجهاز مناسب لتجربة نماذج محلية، لكن سرعة النموذج وحجمه يحتاجان اختبارًا فعليًا.',
      localHybrid: 'يمكن تنفيذ بعض المهام محليًا، ونوصي بتقسيم العمل واستخدام السحابة عند الحاجة.',
      cloudFallback: 'الأفضل استخدام مهام محلية خفيفة مع عامل سحابي عند توفر حصة مجانية.'
    }
  };
}

export async function detectLocalComputeCapabilities(env = globalThis) {
  const nav = env.navigator || {};
  let webgpu = false;
  if (nav.gpu && typeof nav.gpu.requestAdapter === 'function') {
    try { webgpu = Boolean(await nav.gpu.requestAdapter()); } catch { webgpu = false; }
  }
  return {
    webgpu,
    webAssembly: typeof env.WebAssembly === 'object',
    workers: typeof env.Worker === 'function',
    offscreenCanvas: typeof env.OffscreenCanvas === 'function',
    videoDecoder: typeof env.VideoDecoder === 'function',
    webCodecs: typeof env.VideoDecoder === 'function' && typeof env.VideoEncoder === 'function',
    hardwareConcurrency: Number(nav.hardwareConcurrency) || 1,
    deviceMemory: Number(nav.deviceMemory) || 0,
    secureContext: Boolean(env.isSecureContext)
  };
}
