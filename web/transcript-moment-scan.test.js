import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestTranscriptMoments } from './transcript-moment-scan.js';

test('suggests timestamped transcript moments and labels heuristic cues', () => {
  const result = suggestTranscriptMoments([
    { start: 1, end: 18, text: 'Wait, this is impossible! I finally won the challenge.' },
    { start: 25, end: 35, text: 'We went there and came back.' },
    { start: 50, end: 65, text: 'يا إلهي هذا مذهل، لقد فزت أخيرًا!' }
  ], { minGapSeconds: 20 });
  assert.equal(result.suggestions.length, 2);
  assert.equal(result.suggestions[0].cueDetected, true);
  assert.ok(result.suggestions[0].heuristicScore > 0);
  assert.match(result.note, /ليست تقييمًا دلاليًا/);
});

test('rejects invalid timing and limits overlapping suggestions', () => {
  const result = suggestTranscriptMoments([
    { start: 5, end: 2, text: 'Amazing!' },
    { start: 10, end: 25, text: 'Amazing, finally something happened!' },
    { start: 12, end: 28, text: 'Wait, this is incredible!' }
  ], { minGapSeconds: 10 });
  assert.equal(result.suggestions.length, 1);
  assert.equal(result.suggestions[0].start, 10);
});
