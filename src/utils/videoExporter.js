// Video Exporter using HTML5 Canvas & MediaRecorder API

export async function exportUnifiedFilm({
  scenes,
  aspectRatio, // "16:9" or "9:16"
  onProgress,
  onComplete,
  onError
}) {
  try {
    const isHorizontal = aspectRatio === "16:9";
    const width = isHorizontal ? 1280 : 720;
    const height = isHorizontal ? 720 : 1280;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Audio setup for export
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioCtx();
    const dest = audioCtx.createMediaStreamDestination();

    // Create simple ambient audio tone for the export stream
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(110, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(dest);
    osc.start();

    // Canvas stream
    const canvasStream = canvas.captureStream(30); // 30 FPS
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...dest.stream.getAudioTracks()
    ]);

    let mimeType = "video/webm;codecs=vp9,opus";
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = "video/webm";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "";
      }
    }

    const recorder = mimeType ? new MediaRecorder(combinedStream, { mimeType }) : new MediaRecorder(combinedStream);
    const recordedChunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    recorder.start(100);

    const totalDuration = scenes.reduce((acc, s) => acc + (s.duration || 5), 0);
    let currentTime = 0;
    const fps = 30;
    const frameInterval = 1 / fps;
    const totalFrames = Math.floor(Math.min(totalDuration, 20) * fps); // max 20s for fast export demo
    let frameIndex = 0;

    const drawFrame = () => {
      if (frameIndex >= totalFrames) {
        recorder.stop();
        osc.stop();
        audioCtx.close();

        setTimeout(() => {
          const blob = new Blob(recordedChunks, { type: "video/mp4" });
          const downloadUrl = URL.createObjectURL(blob);
          onProgress(100);
          onComplete({ downloadUrl, blob, totalDuration });
        }, 500);
        return;
      }

      currentTime = (frameIndex / totalFrames) * totalDuration;
      let sceneTimeAcc = 0;
      let activeScene = scenes[0];
      for (const scene of scenes) {
        if (currentTime >= sceneTimeAcc && currentTime < sceneTimeAcc + (scene.duration || 5)) {
          activeScene = scene;
          break;
        }
        sceneTimeAcc += (scene.duration || 5);
      }

      // Render scene frame onto canvas
      const progressInScene = (currentTime - sceneTimeAcc) / (activeScene.duration || 5);

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, width, height);
      if (activeScene.shotNumber % 2 === 0) {
        grad.addColorStop(0, "#090d16");
        grad.addColorStop(0.5, "#1e1338");
        grad.addColorStop(1, "#08101e");
      } else {
        grad.addColorStop(0, "#1c0d02");
        grad.addColorStop(0.5, "#0b1526");
        grad.addColorStop(1, "#120a1f");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Cinematic grid & camera motion simulation
      ctx.save();
      const zoom = 1 + progressInScene * 0.12;
      const panX = Math.sin(progressInScene * Math.PI) * 20;
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2 + panX, -height / 2);

      // Glowing orbs / particles
      for (let i = 0; i < 15; i++) {
        const px = ((i * 137) % width);
        const py = ((i * 89 + frameIndex * 2) % height);
        const r = 2 + (i % 4);
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? "rgba(245, 158, 11, 0.4)" : "rgba(6, 182, 212, 0.4)";
        ctx.fill();
      }

      // Ambient glow center
      const radial = ctx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, width * 0.45);
      radial.addColorStop(0, "rgba(245, 158, 11, 0.2)");
      radial.addColorStop(1, "transparent");
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, width, height);

      ctx.restore();

      // Film Letterbox bars if horizontal
      if (isHorizontal) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, 36);
        ctx.fillRect(0, height - 36, width, 36);
      }

      // Cinematic HUD overlay
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font = "bold 20px 'JetBrains Mono', monospace";
      ctx.fillText(`SCENE [0${activeScene.shotNumber || 1}] : ${activeScene.title.toUpperCase()}`, 30, isHorizontal ? 75 : 60);

      ctx.font = "14px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = "#f59e0b";
      ctx.fillText(`CAM: ${activeScene.cameraMovement}`, 30, isHorizontal ? 100 : 85);

      if (activeScene.characterTag) {
        ctx.fillStyle = "#10b981";
        ctx.fillText(`R2V REF: ${activeScene.characterTag}`, 30, isHorizontal ? 122 : 107);
      }

      // Timecode
      const mins = Math.floor(currentTime / 60).toString().padStart(2, '0');
      const secs = Math.floor(currentTime % 60).toString().padStart(2, '0');
      const ms = Math.floor((currentTime % 1) * 100).toString().padStart(2, '0');
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "14px 'JetBrains Mono', monospace";
      ctx.fillText(`TC: ${mins}:${secs}:${ms} | 30 FPS MASTER`, 30, height - (isHorizontal ? 50 : 35));

      // Watermark
      ctx.fillStyle = "rgba(245, 158, 11, 0.7)";
      ctx.fillText("FLOW STUDIO AI", width - 180, height - (isHorizontal ? 50 : 35));

      frameIndex++;
      const progressPercent = Math.round((frameIndex / totalFrames) * 100);
      onProgress(progressPercent);

      requestAnimationFrame(drawFrame);
    };

    drawFrame();
  } catch (err) {
    console.error("Export error:", err);
    onError(err.message || "Erro durante o processamento do vídeo");
  }
}
