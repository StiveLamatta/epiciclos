import * as Mp4Muxer from 'mp4-muxer';
import * as WebmMuxer from 'webm-muxer';

/**
 * Motor de Renderizado Offline Determinista a 60 FPS con soporte Multicapa.
 * Renderiza frame a frame de forma discreta usando WebCodecs (VideoEncoder) + MP4/WebM Muxer.
 * Dibuja simultáneamente múltiples trazas/cadenas de epiciclos con 60 FPS EXACTOS.
 */

function drawPolygon(ctx, cx, cy, r, theta, sides) {
  ctx.beginPath();
  for (let k = 0; k < sides; k++) {
    const angle = theta + (2 * Math.PI * k) / sides;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawStar(ctx, cx, cy, r, theta, points = 5) {
  ctx.beginPath();
  const innerR = r * 0.42;
  const step = Math.PI / points;
  for (let k = 0; k < points * 2; k++) {
    const currentR = k % 2 === 0 ? r : innerR;
    const angle = theta + k * step;
    const x = cx + currentR * Math.cos(angle);
    const y = cy + currentR * Math.sin(angle);
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawHeart(ctx, cx, cy, r, theta, samples = 25) {
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  ctx.beginPath();

  const p0 = { u: 0, v: 0 };
  const p1 = { u: -0.22 * r, v: 0.58 * r };
  const p2 = { u: 0.45 * r, v: 0.68 * r };
  const p3 = { u: r, v: 0 };

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const u = Math.pow(1 - t, 3) * p0.u + 3 * Math.pow(1 - t, 2) * t * p1.u + 3 * (1 - t) * Math.pow(t, 2) * p2.u + Math.pow(t, 3) * p3.u;
    const v = Math.pow(1 - t, 3) * p0.v + 3 * Math.pow(1 - t, 2) * t * p1.v + 3 * (1 - t) * Math.pow(t, 2) * p2.v + Math.pow(t, 3) * p3.v;
    const x = cx + u * cosT - v * sinT;
    const y = cy + u * sinT + v * cosT;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  const q0 = { u: r, v: 0 };
  const q1 = { u: 0.45 * r, v: -0.68 * r };
  const q2 = { u: -0.22 * r, v: -0.58 * r };
  const q3 = { u: 0, v: 0 };

  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const u = Math.pow(1 - t, 3) * q0.u + 3 * Math.pow(1 - t, 2) * t * q1.u + 3 * (1 - t) * Math.pow(t, 2) * q2.u + Math.pow(t, 3) * q3.u;
    const v = Math.pow(1 - t, 3) * q0.v + 3 * Math.pow(1 - t, 2) * t * q1.v + 3 * (1 - t) * Math.pow(t, 2) * q2.v + Math.pow(t, 3) * q3.v;
    const x = cx + u * cosT - v * sinT;
    const y = cy + u * sinT + v * cosT;
    ctx.lineTo(x, y);
  }

  ctx.closePath();
  ctx.stroke();
}

function drawCustomShape(ctx, cx, cy, r, theta, relativePts) {
  if (!relativePts || relativePts.length === 0) return;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  ctx.beginPath();
  for (let i = 0; i < relativePts.length; i++) {
    const u = relativePts[i].u * r;
    const v = relativePts[i].v * r;
    const x = cx + u * cosT - v * sinT;
    const y = cy + u * sinT + v * cosT;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

export async function renderFourierVideoOffline({
  layers = [],
  fourier = null, // fallback legacy
  origin = null,
  epicycleShape = 'circle',
  customRotorShape = null,
  epicycleColor = '#3b82f6',
  pathColor = '#38bdf8',
  epicycleThickness = 1.5,
  pathThickness = 3.5,
  exportQuality = '1080p',
  recordingBox = null,
  totalFrames = 360, // Exactamente 6 segundos a 60 FPS (1 ciclo completo)
  fps = 60,
  onProgress = () => {}
}) {
  // Normalizar lista de capas
  let activeLayers = [];
  if (layers && layers.length > 0) {
    activeLayers = layers.filter(l => l.visible !== false && (l.effectiveFourier?.length > 0 || l.fourier?.length > 0));
  } else if (fourier && fourier.length > 0) {
    activeLayers = [{
      effectiveFourier: fourier,
      origin: origin || { x: 0, y: 0 },
      epicycleShape,
      customRotorShape,
      epicycleColor,
      pathColor,
      epicycleThickness,
      pathThickness
    }];
  }

  if (activeLayers.length === 0) {
    throw new Error('No hay trazos con coeficientes de Fourier para renderizar.');
  }

  // Dimensiones según calidad seleccionada (múltiplos pares para codecs H.264/VP9)
  const dimensions = {
    '480p': { width: 720, height: 720, bitrate: 4000000 },
    '720p': { width: 1080, height: 1080, bitrate: 8000000 },
    '1080p': { width: 1440, height: 1440, bitrate: 16000000 },
    '2k': { width: 2048, height: 2048, bitrate: 28000000 },
    '4k': { width: 3840, height: 3840, bitrate: 60000000 },
  };

  const targetDim = dimensions[exportQuality] || dimensions['1080p'];
  const outWidth = targetDim.width;
  const outHeight = targetDim.height;

  const canvas = document.createElement('canvas');
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext('2d', { alpha: false });

  // Calcular encuadre conjunto si no hay recordingBox definido
  let box = recordingBox;
  if (!box || !box.width || !box.height) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    for (const layer of activeLayers) {
      const fList = layer.effectiveFourier || layer.fourier;
      const lOrigin = layer.origin || { x: 0, y: 0 };
      for (let k = 0; k <= 100; k++) {
        const t = (k / 100) * Math.PI * 2;
        let x = lOrigin.x;
        let y = lOrigin.y;
        for (let i = 0; i < fList.length; i++) {
          x += fList[i].amp * Math.cos(fList[i].freq * t + fList[i].phase);
          y += fList[i].amp * Math.sin(fList[i].freq * t + fList[i].phase);
        }
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }

    const padding = 60;
    const size = Math.max(maxX - minX, maxY - minY, 100) + padding * 2;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    box = {
      x: centerX - size / 2,
      y: centerY - size / 2,
      width: size,
      height: size
    };
  }

  const scale = outWidth / box.width;
  
  // Historial de caminos para cada capa
  const layerPaths = activeLayers.map(() => []);

  // Función de renderizado de 1 frame individual a canvas con todas las capas
  const renderFrameToCanvas = (frameIdx) => {
    const t = (frameIdx / totalFrames) * Math.PI * 2;

    // 1. Fondo espacial negro profundo
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, outWidth, outHeight);

    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-box.x, -box.y);

    // 2. Renderizar cada capa
    activeLayers.forEach((layer, layerIdx) => {
      const fList = layer.effectiveFourier || layer.fourier;
      if (!fList || fList.length === 0) return;

      const lOrigin = layer.origin || { x: 0, y: 0 };
      const lShape = layer.epicycleShape || 'circle';
      const lCustom = layer.customRotorShape || null;
      const lEpicycleColor = layer.epicycleColor || '#3b82f6';
      const lPathColor = layer.pathColor || '#38bdf8';
      const lEpicycleThick = layer.epicycleThickness || 1.5;
      const lPathThick = layer.pathThickness || 3.5;

      let x = lOrigin.x;
      let y = lOrigin.y;

      for (let i = 0; i < fList.length; i++) {
        const prevX = x;
        const prevY = y;
        const freq = fList[i].freq;
        const radius = fList[i].amp;
        const phase = fList[i].phase;
        const angle = freq * t + phase;

        x += radius * Math.cos(angle);
        y += radius * Math.sin(angle);

        ctx.strokeStyle = lEpicycleColor;
        ctx.lineWidth = lEpicycleThick;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (lShape === 'triangle') {
          drawPolygon(ctx, prevX, prevY, radius, angle, 3);
        } else if (lShape === 'square') {
          drawPolygon(ctx, prevX, prevY, radius, angle, 4);
        } else if (lShape === 'heart') {
          drawHeart(ctx, prevX, prevY, radius, angle);
        } else if (lShape === 'custom' && lCustom) {
          drawCustomShape(ctx, prevX, prevY, radius, angle, lCustom);
        } else if (lShape === 'pentagon') {
          drawPolygon(ctx, prevX, prevY, radius, angle, 5);
        } else if (lShape === 'hexagon') {
          drawPolygon(ctx, prevX, prevY, radius, angle, 6);
        } else if (lShape === 'star') {
          drawStar(ctx, prevX, prevY, radius, angle, 5);
        } else {
          ctx.beginPath();
          ctx.arc(prevX, prevY, radius, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      layerPaths[layerIdx].push({ x, y });

      // Trazado continuo acumulado de esta capa
      const history = layerPaths[layerIdx];
      if (history.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = lPathColor;
        ctx.lineWidth = lPathThick;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(history[0].x, history[0].y);
        for (let p = 1; p < history.length; p++) {
          ctx.lineTo(history[p].x, history[p].y);
        }
        ctx.stroke();
      }

      // Punta luminosa de trazado
      ctx.beginPath();
      ctx.arc(x, y, lPathThick * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = lPathColor;
      ctx.fill();
    });

    ctx.restore();
  };

  // =========================================================================
  // ESTRATEGIA 1: WebCodecs (VideoEncoder) + MP4/WebM Muxer (60 FPS NATIVO)
  // =========================================================================
  if (typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined') {
    try {
      console.log('[VideoRenderer] Renderizando multicapa con WebCodecs + MP4 Muxer (60 FPS)');
      
      const muxer = new Mp4Muxer.Muxer({
        target: new Mp4Muxer.ArrayBufferTarget(),
        video: {
          codec: 'avc',
          width: outWidth,
          height: outHeight
        },
        fastStart: 'in-memory'
      });

      let encodeError = null;
      const encoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => {
          console.error('[VideoEncoder Error]', e);
          encodeError = e;
        }
      });

      // Configurar H.264
      encoder.configure({
        codec: 'avc1.420034',
        width: outWidth,
        height: outHeight,
        bitrate: targetDim.bitrate,
        framerate: fps
      });

      const frameDurationUs = Math.round(1000000 / fps);

      for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
        if (encodeError) throw encodeError;

        renderFrameToCanvas(frameIdx);

        const timestampUs = frameIdx * frameDurationUs;
        const videoFrame = new VideoFrame(canvas, {
          timestamp: timestampUs,
          duration: frameDurationUs
        });

        const keyFrame = frameIdx % 60 === 0;
        encoder.encode(videoFrame, { keyFrame });
        videoFrame.close();

        if (frameIdx % 6 === 0) {
          onProgress(Math.round(((frameIdx + 1) / totalFrames) * 100));
          await new Promise(r => setTimeout(r, 0));
        }
      }

      await encoder.flush();
      muxer.finalize();

      const buffer = muxer.target.buffer;
      const blob = new Blob([buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      onProgress(100);
      return { blob, url, extension: 'mp4' };
    } catch (webCodecsErr) {
      console.warn('[VideoRenderer] Falló WebCodecs MP4, intentando WebM Muxer...', webCodecsErr);
      
      try {
        const webmMuxer = new WebmMuxer.Muxer({
          target: new WebmMuxer.ArrayBufferTarget(),
          video: {
            codec: 'V_VP9',
            width: outWidth,
            height: outHeight,
            frameRate: fps
          }
        });

        const vp9Encoder = new VideoEncoder({
          output: (chunk, meta) => webmMuxer.addVideoChunk(chunk, meta),
          error: (e) => console.error(e)
        });

        vp9Encoder.configure({
          codec: 'vp09.00.10.08',
          width: outWidth,
          height: outHeight,
          bitrate: targetDim.bitrate,
          framerate: fps
        });

        layerPaths.forEach(lp => lp.length = 0);
        const frameDurationUs = Math.round(1000000 / fps);

        for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
          renderFrameToCanvas(frameIdx);

          const timestampUs = frameIdx * frameDurationUs;
          const videoFrame = new VideoFrame(canvas, {
            timestamp: timestampUs,
            duration: frameDurationUs
          });

          const keyFrame = frameIdx % 60 === 0;
          vp9Encoder.encode(videoFrame, { keyFrame });
          videoFrame.close();

          if (frameIdx % 6 === 0) {
            onProgress(Math.round(((frameIdx + 1) / totalFrames) * 100));
            await new Promise(r => setTimeout(r, 0));
          }
        }

        await vp9Encoder.flush();
        webmMuxer.finalize();

        const buffer = webmMuxer.target.buffer;
        const blob = new Blob([buffer], { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        onProgress(100);
        return { blob, url, extension: 'webm' };
      } catch (vp9Err) {
        console.warn('[VideoRenderer] Falló WebM Muxer, usando fallback...', vp9Err);
      }
    }
  }

  // =========================================================================
  // FALLBACK: MediaRecorder Pacing a 60 FPS
  // =========================================================================
  console.log('[VideoRenderer] Usando fallback MediaRecorder multicapa');
  layerPaths.forEach(lp => lp.length = 0);

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    videoBitsPerSecond: targetDim.bitrate
  });

  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      resolve({ blob, url, extension: 'webm' });
    };
  });

  recorder.start();

  const frameIntervalMs = 1000 / fps;
  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    const frameStart = performance.now();
    renderFrameToCanvas(frameIdx);

    if (frameIdx % 6 === 0) {
      onProgress(Math.round(((frameIdx + 1) / totalFrames) * 100));
    }

    const elapsed = performance.now() - frameStart;
    const waitTime = Math.max(0, frameIntervalMs - elapsed);
    await new Promise(r => setTimeout(r, waitTime));
  }

  onProgress(100);
  recorder.stop();

  return await recordingPromise;
}
