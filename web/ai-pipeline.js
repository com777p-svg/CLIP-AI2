/**
 * CLIP AI Engine — analysis result utilities.
 * This module consumes measured results from a connected AI worker; it does not
 * claim to analyze media by itself. It reuses one analysis for ranking and
 * bilingual subtitles while preserving source audio unchanged.
 */
export const SUPPORTED_LANGUAGES = Object.freeze(['ar', 'en']);
const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export function normalizeTranscriptSegments(segments, sourceLanguage) {
  if (!SUPPORTED_LANGUAGES.includes(sourceLanguage)) throw new TypeError('sourceLanguage must be "ar" or "en".');
  if (!Array.isArray(segments)) throw new TypeError('segments must be an array.');
  return segments.map((segment, index) => {
    const start = Number(segment.start), end = Number(segment.end);
    const originalText = String(segment.originalText ?? segment.text ?? '').trim();
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
      throw new TypeError('Invalid timestamps in transcript segment ' + index + '.');
    }
    if (!originalText) throw new TypeError('Transcript segment ' + index + ' has no original text.');
    return {
      id: String(segment.id ?? ('segment-' + (index + 1))),
      start, end, originalText,
      translatedText: String(segment.translatedText ?? '').trim()
    };
  });
}

/** Creates source and translated subtitle tracks. No audio is synthesized or replaced. */
export function createBilingualSubtitleTracks(segments, sourceLanguage) {
  const normalized = normalizeTranscriptSegments(segments, sourceLanguage);
  const targetLanguage = sourceLanguage === 'ar' ? 'en' : 'ar';
  const missingTranslations = normalized.filter((segment) => !segment.translatedText);
  return {
    sourceLanguage, targetLanguage,
    sourceTrack: {
      language: sourceLanguage,
      label: sourceLanguage === 'ar' ? 'العربية الأصلية' : 'Original English',
      segments: normalized.map(({ id, start, end, originalText }) => ({ id, start, end, text: originalText }))
    },
    translatedTrack: {
      language: targetLanguage,
      label: targetLanguage === 'ar' ? 'الترجمة العربية' : 'English translation',
      ready: missingTranslations.length === 0,
      missingTranslationCount: missingTranslations.length,
      segments: normalized.map(({ id, start, end, translatedText }) => ({ id, start, end, text: translatedText }))
    },
    audio: { mode: 'preserve-original', sourceLanguage, dubbing: false, voiceReplacement: false }
  };
}

const SCORE_WEIGHTS = Object.freeze({
  hookStrength: 0.22, storyClarity: 0.18, curiosity: 0.16,
  emotionalImpact: 0.14, standaloneContext: 0.14,
  audioClarity: 0.08, visualQuality: 0.08
});

/** Estimates editorial potential from metrics measured by the AI analyzer. */
export function scoreClipCandidate(candidate) {
  const metrics = candidate?.metrics ?? {};
  let weighted = 0, totalWeight = 0;
  for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
    if (metrics[key] === undefined || metrics[key] === null) continue;
    weighted += clamp01(metrics[key]) * weight;
    totalWeight += weight;
  }
  if (totalWeight === 0) throw new TypeError('Candidate has no measured quality metrics.');
  const duplicatePenalty = clamp01(metrics.duplicateSimilarity ?? 0) * 0.12;
  const contextPenalty = clamp01(metrics.missingContextRisk ?? 0) * 0.16;
  const score = Math.max(0, Math.min(100, ((weighted / totalWeight) - duplicatePenalty - contextPenalty) * 100));
  return { ...candidate, editorialScore: Math.round(score * 10) / 10 };
}

/** Selects diverse moments from worker-detected candidates; it does not detect moments itself. */
export function rankAndSelectClips(candidates, options = {}) {
  if (!Array.isArray(candidates)) throw new TypeError('candidates must be an array.');
  const maxClips = Math.max(1, Math.min(50, Number(options.maxClips) || 12));
  const minScore = Math.max(0, Math.min(100, Number(options.minScore) || 55));
  const minGapSeconds = Math.max(0, Number(options.minGapSeconds) || 20);
  const ranked = candidates.map(scoreClipCandidate)
    .filter((item) => Number(item.end) > Number(item.start))
    .sort((a, b) => b.editorialScore - a.editorialScore);
  const selected = [];
  for (const candidate of ranked) {
    if (candidate.editorialScore < minScore || selected.length >= maxClips) continue;
    const start = Number(candidate.start), end = Number(candidate.end);
    const tooClose = selected.some((chosen) =>
      start < Number(chosen.end) + minGapSeconds && end > Number(chosen.start) - minGapSeconds
    );
    if (!tooClose) selected.push(candidate);
  }
  return {
    candidatesEvaluated: ranked.length, selected,
    rejectedBelowThreshold: ranked.filter((item) => item.editorialScore < minScore).length,
    scoringNote: 'Editorial potential estimate only; not a prediction or guarantee of reach.'
  };
}

/** Builds two language outputs from one analysis, using the same ranges and original audio. */
export function buildBilingualProjectManifest({ sourceLanguage, transcript, selectedClips }) {
  const subtitles = createBilingualSubtitleTracks(transcript, sourceLanguage);
  if (!Array.isArray(selectedClips)) throw new TypeError('selectedClips must be an array.');
  return {
    schemaVersion: 1, analysisPasses: 1, sourceLanguage,
    selectedClips: selectedClips.map((clip) => ({
      id: String(clip.id), start: Number(clip.start), end: Number(clip.end),
      editorialScore: Number(clip.editorialScore)
    })),
    outputs: [
      { language: sourceLanguage, subtitleTrack: subtitles.sourceTrack, audio: 'original' },
      { language: subtitles.targetLanguage, subtitleTrack: subtitles.translatedTrack, audio: 'original' }
    ],
    audioPolicy: subtitles.audio,
    translationReady: subtitles.translatedTrack.ready
  };
}
