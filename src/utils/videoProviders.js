export const VIDEO_PROVIDERS = {
  veo: { label: 'Veo', configuration: 'veoConfigured' },
  omni: { label: 'Omni Flash', configuration: 'omniConfigured' }
};

export function generationProvider(scene, selectedProvider = 'veo') {
  // Resuming a saved operation must never send it to a different provider.
  if (scene.operationName) return scene.operationName.startsWith('omni-') ? 'omni' : 'veo';
  return Object.hasOwn(VIDEO_PROVIDERS, selectedProvider) ? selectedProvider : 'veo';
}

export async function videoDuration(url) {
  const video = document.createElement('video');
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error('Tempo esgotado ao verificar o clipe. Use Retomar para tentar novamente.')), 20000);
      const finish = error => { clearTimeout(timer); video.onloadedmetadata = null; video.onerror = null; if (error) reject(error); else resolve(); };
      video.onloadedmetadata = () => finish();
      video.onerror = () => finish(new Error('Não foi possível abrir o clipe. Use Retomar para tentar novamente.'));
      video.preload = 'metadata'; video.src = url;
    });
    if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error('O provedor retornou um clipe sem duração válida.');
    return video.duration;
  } finally { video.removeAttribute('src'); video.load(); }
}
