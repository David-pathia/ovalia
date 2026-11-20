// Enregistrement du micro dans le navigateur, puis conversion en WAV 16 kHz mono :
// format lu par tous les services de transcription, quel que soit le navigateur (webm sur Chrome, mp4 sur Safari).

export const DUREE_MAX = 120; // secondes : au-delà, la requête dépasserait la limite de Vercel

export async function ouvrirMicro() {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      // Filtres du téléphone ou de l'ordinateur contre le bruit ambiant et l'écho.
      noiseSuppression: true,
      echoCancellation: true,
      autoGainControl: true,
      channelCount: 1
    }
  });
}

export function enregistrer(flux: MediaStream) {
  const morceaux: Blob[] = [];
  const recorder = new MediaRecorder(flux);
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) morceaux.push(e.data);
  };
  const fin = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      flux.getTracks().forEach((t) => t.stop());
      resolve(new Blob(morceaux, { type: recorder.mimeType }));
    };
  });
  recorder.start(1000);
  return { arreter: () => recorder.state !== 'inactive' && recorder.stop(), fin };
}

/** Décode l'enregistrement et le réencode en WAV 16 kHz mono 16 bits. */
export async function versWav(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext();
  const decode = await ctx.decodeAudioData(await blob.arrayBuffer());
  await ctx.close();
  const frequence = 16000;
  const offline = new OfflineAudioContext(1, Math.ceil(decode.duration * frequence), frequence);
  const source = offline.createBufferSource();
  source.buffer = decode;
  source.connect(offline.destination);
  source.start();
  const rendu = await offline.startRendering();
  const pcm = rendu.getChannelData(0);

  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(buffer);
  const ecrire = (o: number, s: string) =>
    [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  ecrire(0, 'RIFF');
  v.setUint32(4, 36 + pcm.length * 2, true);
  ecrire(8, 'WAVE');
  ecrire(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, frequence, true);
  v.setUint32(28, frequence * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  ecrire(36, 'data');
  v.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) {
    const x = Math.max(-1, Math.min(1, pcm[i]!));
    v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

export async function transcrireWav(wav: Blob): Promise<string> {
  const rep = await fetch('/api/dictee', {
    method: 'POST',
    headers: { 'Content-Type': 'audio/wav' },
    body: wav
  });
  const d = (await rep.json().catch(() => null)) as { texte?: string; error?: string } | null;
  if (!rep.ok || !d?.texte) throw new Error(d?.error ?? 'La transcription a échoué.');
  return d.texte;
}
