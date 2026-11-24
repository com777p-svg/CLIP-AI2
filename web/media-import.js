const VIDEO_EXTENSIONS = new Set(['mp4','webm','mov','m4v','ogv','ogg','avi','mkv','3gp','mpeg','mpg']);

/** Accept browser-recognized video MIME types and common video extensions. */
export function isSupportedVideoFile(file) {
  if (!file || typeof file.name !== 'string') return false;
  const type = String(file.type || '').toLowerCase();
  if (type.startsWith('video/')) return true;
  const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
  return VIDEO_EXTENSIONS.has(extension);
}

export function partitionMediaFiles(files) {
  const selected = Array.from(files || []);
  const videos = selected.filter(isSupportedVideoFile);
  return { videos, rejectedCount: selected.length - videos.length };
}
