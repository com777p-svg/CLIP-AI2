import test from 'node:test';
import assert from 'node:assert/strict';
import { createBilingualSubtitleTracks, rankAndSelectClips, buildBilingualProjectManifest } from './ai-pipeline.js';

test('creates Arabic and English subtitle tracks from one Arabic transcript', () => {
  const tracks = createBilingualSubtitleTracks([
    { start: 0, end: 2, originalText: 'مرحبا كيف حالكم', translatedText: 'Hello, how are you?' }
  ], 'ar');
  assert.equal(tracks.sourceTrack.language, 'ar');
  assert.equal(tracks.sourceTrack.segments[0].text, 'مرحبا كيف حالكم');
  assert.equal(tracks.translatedTrack.language, 'en');
  assert.equal(tracks.translatedTrack.segments[0].text, 'Hello, how are you?');
  assert.equal(tracks.audio.dubbing, false);
  assert.equal(tracks.audio.mode, 'preserve-original');
});

test('ranks candidates and avoids nearby duplicate moments', () => {
  const metrics = { hookStrength: .95, storyClarity: .9, curiosity: .9, emotionalImpact: .8,
    standaloneContext: .95, audioClarity: .9, visualQuality: .9 };
  const result = rankAndSelectClips([
    { id: 'a', start: 10, end: 35, metrics },
    { id: 'b', start: 20, end: 42, metrics },
    { id: 'c', start: 300, end: 330, metrics: { ...metrics, hookStrength: .7 } }
  ], { maxClips: 5, minScore: 55, minGapSeconds: 20 });
  assert.equal(result.selected[0].id, 'a');
  assert.equal(result.selected.some((clip) => clip.id === 'b'), false);
  assert.equal(result.selected.some((clip) => clip.id === 'c'), true);
});

test('builds two outputs from one analysis and preserves original audio', () => {
  const manifest = buildBilingualProjectManifest({
    sourceLanguage: 'en',
    transcript: [{ start: 1, end: 3, originalText: 'Good morning', translatedText: 'صباح الخير' }],
    selectedClips: [{ id: 'clip-1', start: 1, end: 3, editorialScore: 91 }]
  });
  assert.equal(manifest.analysisPasses, 1);
  assert.equal(manifest.outputs.length, 2);
  assert.equal(manifest.outputs[0].audio, 'original');
  assert.equal(manifest.outputs[1].audio, 'original');
  assert.equal(manifest.audioPolicy.dubbing, false);
});
