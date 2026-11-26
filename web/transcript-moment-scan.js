/**
 * CLIP AI — grouped transcript moment suggestions.
 * Heuristic only: uses wording and segment timing, not semantic video understanding.
 */
const CUE_WORDS = /\b(never|finally|wait|what|why|how|impossible|amazing|incredible|insane|unbelievable|secret|mistake|danger|win|won|lose|lost|surprise|surprised|legendary|crazy|wow|no way|oh my god)\b|(?:مستحيل|أخيرًا|اخيرا|انتظر|لحظة|ماذا|كيف|لماذا|خطأ|فزت|فاز|خسرت|فشل|نجح|أسطوري|اسطوري|مذهل|رهيب|صدمة|يا إلهي|واو)/i;
const COMPLETE_END = /[.!?؟…]$/;
const clamp = n => Math.max(0, Math.min(1, n));

/** Combines adjacent transcript segments into 12–45s candidate windows. */
export function suggestTranscriptMoments(segments, options = {}) {
  if (!Array.isArray(segments)) throw new TypeError('segments must be an array');
  const minSeconds = Math.max(5, Number(options.minSeconds) || 12);
  const maxSeconds = Math.max(minSeconds, Number(options.maxSeconds) || 45);
  const minScore = clamp(Number(options.minScore ?? 0.25));
  const clean = segments.map((s, i) => {
    const start = Number(s.start), end = Number(s.end);
    const text = String(s.text ?? s.originalText ?? '').trim();
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || !text) return null;
    return { id: String(s.id ?? ('transcript-' + (i + 1))), start, end, text };
  }).filter(Boolean).sort((a,b)=>a.start-b.start);
  const candidates=[];
  for(let i=0;i<clean.length;i++){
    let group=[],start=clean[i].start,end=start;
    for(let j=i;j<clean.length;j++){
      const seg=clean[j];
      if(group.length && seg.start-end>3) break;
      if(seg.end-start>maxSeconds) break;
      group.push(seg);end=Math.max(end,seg.end);
      const duration=end-start;
      if(duration<minSeconds)continue;
      const text=group.map(x=>x.text).join(' ');
      const cue=CUE_WORDS.test(text)?0.45:0;
      const punctuation=COMPLETE_END.test(group.at(-1).text)?0.2:0;
      const length=clamp(text.split(/\s+/).length/30)*0.25;
      const durationFit=duration>=minSeconds&&duration<=maxSeconds?0.1:0;
      const score=Math.min(1,cue+punctuation+length+durationFit);
      candidates.push({id:group[0].id,start,end,text,heuristicScore:Math.round(score*100),cueDetected:cue>0});
    }
  }
  const selected=[];
  const gap=Math.max(0,Number(options.minGapSeconds)||15);
  for(const item of candidates.sort((a,b)=>b.heuristicScore-a.heuristicScore)){
    if(item.heuristicScore<minScore*100)continue;
    if(selected.some(chosen=>item.start<chosen.end+gap&&item.end>chosen.start-gap))continue;
    selected.push(item);
    if(selected.length>=Math.max(1,Math.min(20,Number(options.maxSuggestions)||8)))break;
  }
  return {suggestions:selected,note:'اقتراحات تعتمد على تجميع التفريغ والكلمات والتوقيت فقط؛ ليست تقييمًا دلاليًا ولا تحليلًا بصريًا أو ضمانًا لجودة المقطع.'};
}
