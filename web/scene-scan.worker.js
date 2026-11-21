let previous = null;
let changes = [];
let total = 0;
let processed = 0;
let lastChange = -Infinity;

self.onmessage = (event) => {
  const data = event.data || {};
  if (data.type === 'start') {
    previous = null; changes = []; total = Number(data.total) || 0;
    processed = 0; lastChange = -Infinity;
    return;
  }
  if (data.type === 'frame') {
    const pixels = new Uint8ClampedArray(data.pixels);
    const time = Number(data.time) || 0;
    if (previous && previous.length === pixels.length) {
      let difference = 0;
      const stride = 16;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4 * stride) {
        const currentLuma = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
        const previousLuma = 0.2126 * previous[i] + 0.7152 * previous[i + 1] + 0.0722 * previous[i + 2];
        difference += Math.abs(currentLuma - previousLuma) / 255;
        count++;
      }
      const score = count ? difference / count : 0;
      if (score >= 0.22 && time - lastChange >= 10) {
        changes.push({ time, visualChangeScore: Math.round(score * 1000) / 1000 });
        lastChange = time;
      }
    }
    previous = pixels;
    processed++;
    self.postMessage({ type: 'progress', processed, total });
    return;
  }
  if (data.type === 'finish') {
    self.postMessage({ type: 'result', scenes: changes, processed });
  }
};
