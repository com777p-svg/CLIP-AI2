/**
 * Lightweight local visual scene-change pre-scan.
 * It finds visual transitions only; it does not understand speech, meaning,
 * suspense, humor, or publishability. Those require an AI model.
 */
export async function scanLocalVideoScenes(file, onProgress = () => {}) {
  if (!(file instanceof Blob)) throw new TypeError('A local video file is required.');
  if (typeof Worker !== 'function') throw new Error('This browser does not support background workers.');
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  video.src = objectUrl;
  const worker = new Worker(new URL('./scene-scan.worker.js', import.meta.url), { type: 'module' });

  const waitFor = (target, eventName, timeoutMs = 20000) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(new Error('انتهت مهلة قراءة الفيديو.')); }, timeoutMs);
    const cleanup = () => { clearTimeout(timer); target.removeEventListener(eventName, done); target.removeEventListener('error', fail); };
    const done = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error('تعذر فك ترميز الفيديو على هذا الجهاز.')); };
    target.addEventListener(eventName, done, { once: true });
    target.addEventListener('error', fail, { once: true });
  });

  try {
    await waitFor(video, 'loadedmetadata');
    if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error('مدة الفيديو غير صالحة.');
    const width = 96, height = 54;
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('تعذر بدء المعالجة المحلية للصور.');
    const total = Math.min(240, Math.max(2, Math.ceil(video.duration / 15) + 1));
    worker.postMessage({ type: 'start', total });
    const resultPromise = new Promise((resolve, reject) => {
      worker.onmessage = (event) => {
        if (event.data?.type === 'progress') onProgress(event.data.processed, event.data.total);
        if (event.data?.type === 'result') resolve(event.data);
      };
      worker.onerror = () => reject(new Error('توقفت مهمة تحليل المشاهد.'));
    });
    for (let index = 0; index < total; index++) {
      const time = Math.min(video.duration - 0.05, (video.duration * index) / total);
      if (index > 0) {
        const seeked = waitFor(video, 'seeked', 20000);
        video.currentTime = time;
        await seeked;
      }
      context.drawImage(video, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height).data;
      const copy = new Uint8ClampedArray(pixels);
      worker.postMessage({ type: 'frame', time, pixels: copy.buffer }, [copy.buffer]);
    }
    worker.postMessage({ type: 'finish' });
    return await resultPromise;
  } finally {
    worker.terminate();
    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}
