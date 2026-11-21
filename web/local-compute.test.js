import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyLocalCompute } from './local-compute.js';

test('classifies a capable secure device as local strong', () => {
  const result = classifyLocalCompute({
    secureContext: true, webgpu: true, hardwareConcurrency: 8,
    deviceMemory: 8, workers: true, webAssembly: true, videoDecoder: true
  });
  assert.equal(result.tier, 'local-strong');
  assert.equal(result.canRunLocalTasks, true);
  assert.equal(result.canUseWebGPU, true);
});

test('uses hybrid mode when device capabilities are moderate', () => {
  const result = classifyLocalCompute({
    secureContext: true, webgpu: false, hardwareConcurrency: 4,
    deviceMemory: 4, workers: true, webAssembly: true
  });
  assert.equal(result.tier, 'local-hybrid');
});

test('does not recommend WebGPU outside secure contexts', () => {
  const result = classifyLocalCompute({
    secureContext: false, webgpu: true, hardwareConcurrency: 8,
    deviceMemory: 8, workers: true, webAssembly: true
  });
  assert.equal(result.tier, 'cloud-fallback');
  assert.equal(result.canUseWebGPU, false);
});
