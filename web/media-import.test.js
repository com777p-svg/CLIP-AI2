import test from 'node:test';
import assert from 'node:assert/strict';
import { isSupportedVideoFile, partitionMediaFiles } from './media-import.js';

test('recognizes common video MIME types and extensions', () => {
  assert.equal(isSupportedVideoFile({ name: 'clip.mp4', type: 'video/mp4' }), true);
  assert.equal(isSupportedVideoFile({ name: 'clip.MOV', type: '' }), true);
  assert.equal(isSupportedVideoFile({ name: 'clip.webm', type: 'application/octet-stream' }), true);
  assert.equal(isSupportedVideoFile({ name: 'notes.txt', type: 'text/plain' }), false);
  assert.equal(isSupportedVideoFile({ name: 'image.png', type: 'image/png' }), false);
});

test('partitions mixed selections without losing valid video files', () => {
  const result = partitionMediaFiles([
    { name: 'one.mp4', type: '' },
    { name: 'two.webm', type: 'video/webm' },
    { name: 'readme.txt', type: 'text/plain' }
  ]);
  assert.equal(result.videos.length, 2);
  assert.equal(result.rejectedCount, 1);
});
