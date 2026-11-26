/**
 * CLIP AI — transcript-based moment suggestions.
 * Heuristic only: uses wording and segment timing, not semantic video understanding.
 */
const CUE_WORDS = /\b(never|finally|wait|what|why|how|impossible|amazing|incredible|insane|unbelievable|secret|mistake|danger|win|won|lose|lost|surprise|surprised|legendary|crazy|wow|no way|oh my god)\b|(?:مستحيل|أخيرًا|اخيرا|انتظر|لحظة|ماذا|كيف|لماذا|خطأ|فزت|فاز|خسرت|فشل|نجح|أسطوري|اسطوري|مذهل|رهيب|صدمة|يا إلهي|واو)/i;
const COMPLETE_END = /[.!?؟…]$/;
const clamp = n => Math.max(0, Math.min(1, n));

/** Returns timestamped suggestion windows based on transcript text cues. */
export function suggestTranscriptMoments(segments, options = {}) {
  if (!Array.isArray(segments)) throw new TypeError('segments must be an array');
  const minSeconds = Math.max(5, Number(options.minSeconds) || 12);
  const maxSeconds = Math.max(minSeconds, Number(options.maxSeconds) || 45);
  const minScore = clamp(Number(options.minScore ?? 0.25));
  const scored = segments.map((s, i) => {
    const start = Number(s.start), end = Number(s.end);
    const text = String(s.text ?? s.originalText ?? '').trim();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !text) return null;
    const duration = end - start;
    const cue = CUE_WORDS.test(text) ? 0.45 : 0;
    const punctuation = COMPLETE_END.test(text) ? 0.2 : 0;
    const length = clamp(text.split(/\s+/).length / 12) * 0.25;
    const durationFit = duration >= minSeconds && duration <= maxSeconds ? 0.1 : 0;
    const score = Math.min(1, cue + punctuation + length + durationFit);
    return { id: String(s.id ?? ('transcript-' + (i + 1))), start, end, text, heuristicScore: Math.round(score * 100), cueDetected: cue > 0 };
  }).filter(Boolean).filter(x => x.heuristicScore >= minScore * 100)
    .sort((a,b) => b.heuristicScore-a.heuristicScore);
  const selected=[];
  const gap=Math.max(0,Number(options.minGapSeconds)||15);
  for (const item of scored) {
    if (selected.some(chosen => item.start < chosen.end + gap && item.end > chosen.start - gap)) continue;
    selected.push(item);
    if (selected.length >= Math.max(1,Math.min(20,Number(options.maxSuggestions)||8))) break;
  }
  return { suggestions:selected, note:'اقتراحات تعتمد على كلمات وتوقيت التفريغ فقط؛ ليست تقييمًا دلاليًا ولا تحليلًا بصريًا أو ضمانًا لجودة المقطع.' };
}
