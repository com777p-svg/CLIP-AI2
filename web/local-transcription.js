/**
 * Local-first Whisper transcription. Video/audio bytes stay in the browser.
 * The model runtime and model weights are downloaded on demand from public CDNs.
 */
let ffmpegPromise;
let transcriberPromise;
const MODEL_ID = 'onnx-community/whisper-tiny';
const TRANSFORMERS_CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0';

async function loadFfmpeg(onProgress) {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
        import('@ffmpeg/ffmpeg'), import('@ffmpeg/util')
      ]);
      const ffmpeg = new FFmpeg();
      ffmpeg.on('log', ({ message }) => {
        if (/error/i.test(message)) onProgress('محرك الصوت: ' + message.slice(0, 120));
      });
      const base = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(base + '/ffmpeg-core.js', 'text/javascript'),
        wasmURL: await toBlobURL(base + '/ffmpeg-core.wasm', 'application/wasm')
      });
      return { ffmpeg, fetchFile };
    })().catch(error => { ffmpegPromise = null; throw error; });
  }
  return ffmpegPromise;
}

async function loadTranscriber(onProgress) {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      onProgress('تحميل مشغل Whisper إلى المتصفح لأول مرة...');
      const { pipeline } = await import(/* @vite-ignore */ TRANSFORMERS_CDN);
      const progress_callback = info => {
        if (info?.status === 'progress' && Number.isFinite(info.progress)) {
          onProgress('تحميل نموذج Whisper: ' + Math.round(info.progress) + '%');
        } else if (info?.status) onProgress('تحميل نموذج Whisper: ' + info.status);
      };
      if (navigator.gpu) {
        try {
          return await pipeline('automatic-speech-recognition', MODEL_ID, {
            device: 'webgpu', dtype: 'fp16', progress_callback
          });
        } catch (error) {
          onProgress('تعذر تشغيل WebGPU؛ نجرب المعالجة عبر WebAssembly...');
        }
      }
      return await pipeline('automatic-speech-recognition', MODEL_ID, {
        dtype: 'q8', progress_callback
      });
    })().catch(error => { transcriberPromise = null; throw error; });
  }
  return transcriberPromise;
}

function getDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(url);
      if (!Number.isFinite(duration) || duration <= 0) reject(new Error('تعذر قراءة مدة الفيديو.'));
      else resolve(duration);
    };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error('صيغة الفيديو غير مدعومة على هذا الجهاز.')); };
    video.src = url;
  });
}

function guessLanguage(text) {
  const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  if (arabic > latin * 1.15) return 'ar';
  if (latin > arabic * 1.15) return 'en';
  return 'unknown';
}

export async function transcribeLocalVideo(file, onProgress = () => {}) {
  if (!(file instanceof Blob)) throw new TypeError('اختر ملف فيديو محليًا أولاً.');
  if (file.size > 250 * 1024 * 1024) {
    throw new Error('حجم الفيديو أكبر من حد التجربة المحلية (250 MB). سنحتاج معالجة مجزأة أكثر كفاءة قبل دعم الملفات الأكبر.');
  }
  const duration = await getDuration(file);
  if (duration > 3600) throw new Error('نسخة التفريغ التجريبية تدعم فيديو حتى ساعة واحدة.');
  if (!('Worker' in globalThis) || !('WebAssembly' in globalThis)) {
    throw new Error('هذا المتصفح لا يدعم متطلبات تشغيل نموذج Whisper محليًا.');
  }

  onProgress('تجهيز محرك استخراج الصوت داخل المتصفح...');
  const { ffmpeg, fetchFile } = await loadFfmpeg(onProgress);
  const transcriber = await loadTranscriber(onProgress);
  const sourceName = 'clipai-source.mp4';
  await ffmpeg.writeFile(sourceName, await fetchFile(file));

  const chunkSeconds = 300;
  const totalChunks = Math.ceil(duration / chunkSeconds);
  const segments = [];
  try {
    for (let index = 0; index < totalChunks; index++) {
      const offset = index * chunkSeconds;
      const length = Math.min(chunkSeconds, duration - offset);
      onProgress('استخراج الصوت محليًا: الجزء ' + (index + 1) + ' من ' + totalChunks);
      try { await ffmpeg.deleteFile('clipai-audio.wav'); } catch {}
      await ffmpeg.exec([
        '-ss', String(offset), '-i', sourceName, '-t', String(length),
        '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le',
        '-f', 'wav', 'clipai-audio.wav'
      ]);
      const wav = await ffmpeg.readFile('clipai-audio.wav');
      const audioUrl = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
      try {
        onProgress('Whisper يحوّل الكلام إلى نص: الجزء ' + (index + 1) + ' من ' + totalChunks);
        const result = await transcriber(audioUrl, {
          chunk_length_s: 30, stride_length_s: 5, return_timestamps: true
        });
        const chunks = Array.isArray(result?.chunks) ? result.chunks : [];
        if (chunks.length) {
          for (const part of chunks) {
            const times = Array.isArray(part.timestamp) ? part.timestamp : [0, length];
            const start = Number(times[0] ?? 0), end = Number(times[1] ?? length);
            const text = String(part.text || '').trim();
            if (text) segments.push({
              start: offset + Math.max(0, start),
              end: offset + Math.max(start + 0.1, end),
              text
            });
          }
        } else if (String(result?.text || '').trim()) {
          segments.push({ start: offset, end: offset + length, text: String(result.text).trim() });
        }
      } finally {
        URL.revokeObjectURL(audioUrl);
      }
      onProgress('اكتمل ' + Math.round(((index + 1) / totalChunks) * 100) + '% من تفريغ الفيديو.');
    }
  } finally {
    try { await ffmpeg.deleteFile('clipai-audio.wav'); } catch {}
    try { await ffmpeg.deleteFile(sourceName); } catch {}
  }

  const text = segments.map(item => item.text).join(' ');
  return {
    segments,
    languageHint: guessLanguage(text),
    model: MODEL_ID,
    processing: 'browser-local',
    audioPolicy: 'original-audio-preserved'
  };
}
