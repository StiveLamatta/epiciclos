/**
 * Motor de Renderizado Offline Determinista a 60 FPS.
 * Renderiza frame a frame en segundo plano con la máxima calidad y fluidez constante,
 * sin verse afectado por la velocidad de la CPU en pantalla ni los gestos de zoom del usuario.
 */

// Helper para dibujar polígonos regulares en 2D Canvas
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

// Helper para dibujar estrella
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

// Helper para dibujar corazón exacto
function drawHeart(ctx, cx, cy, r, theta, samples = 25) {
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  ctx.beginPath();

  // Lado derecho
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

  // Lado izquierdo
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

// Helper para dibujar forma personalizada
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
  fourier,
  origin,
  epicycleShape = 'circle',
  customRotorShape = null,
  epicycleColor = '#3b82f6',
  pathColor = '#3b82f6',
  epicycleThickness = 1.5,
  pathThickness = 3.5,
  exportQuality = '1080p',
  recordingBox = null,
  totalFrames = 360, // 6 segundos a 60 fps para 1 ciclo completo
  onProgress = () => {}
}) {
  if (!fourier || fourier.length === 0) {
    throw new Error('No hay coeficientes de Fourier para renderizar.');
  }

  // Dimensiones según calidad seleccionada
  const dimensions = {
    '480p': { width: 720, height: 720, bitrate: 3000000 },
    '720p': { width: 1080, height: 1080, bitrate: 6000000 },
    '1080p': { width: 1440, height: 1440, bitrate: 14000000 },
    '2k': { width: 2048, height: 2048, bitrate: 25000000 },
    '4k': { width: 3840, height: 3840, bitrate: 50000000 },
  };

  const targetDim = dimensions[exportQuality] || dimensions['1080p'];
  const outWidth = targetDim.width;
  const outHeight = targetDim.height;

  // Crear canvas offscreen
  const canvas = document.createElement('canvas');
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

  // Calcular encuadre si no hay recordingBox definido
  let box = recordingBox;
  if (!box || !box.width || !box.height) {
    // Calcular automáticamente el bounding box de la figura
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let k = 0; k <= 200; k++) {
      const t = (k / 200) * Math.PI * 2;
      let x = origin.x;
      let y = origin.y;
      for (let i = 0; i < fourier.length; i++) {
        x += fourier[i].amp * Math.cos(fourier[i].freq * t + fourier[i].phase);
        y += fourier[i].amp * Math.sin(fourier[i].freq * t + fourier[i].phase);
      }
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const padding = 60;
    const size = Math.max(maxX - minX, maxY - minY) + padding * 2;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    box = {
      x: centerX - size / 2,
      y: centerY - size / 2,
      width: size,
      height: size
    };
  }

  // Pre-computar la trayectoria completa para optimización
  const pathHistory = [];

  // Configurar MediaRecorder
  const mimeTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4'
  ];
  let selectedMime = 'video/webm';
  for (let m of mimeTypes) {
    if (MediaRecorder.isTypeSupported(m)) {
      selectedMime = m;
      break;
    }
  }

  const stream = canvas.captureStream(60);
  const recorder = new MediaRecorder(stream, {
    mimeType: selectedMime,
    videoBitsPerSecond: targetDim.bitrate
  });

  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  const recordingPromise = new Promise((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: selectedMime });
      const url = URL.createObjectURL(blob);
      resolve({ blob, url });
    };
  });

  recorder.start();

  const scale = outWidth / box.width;

  // Renderizar 360 frames (1 ciclo a 60 fps)
  for (let frame = 0; frame < totalFrames; frame++) {
    const t = (frame / totalFrames) * Math.PI * 2;

    // 1. Limpiar fondo espacial
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, outWidth, outHeight);

    // 2. Transformar al marco de grabación
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-box.x, -box.y);

    // 3. Calcular posiciones de rotores
    let x = origin.x;
    let y = origin.y;

    for (let i = 0; i < fourier.length; i++) {
      const prevX = x;
      const prevY = y;
      const freq = fourier[i].freq;
      const radius = fourier[i].amp;
      const phase = fourier[i].phase;
      const angle = freq * t + phase;

      x += radius * Math.cos(angle);
      y += radius * Math.sin(angle);

      // Dibujar forma de rotor
      ctx.strokeStyle = epicycleColor;
      ctx.lineWidth = epicycleThickness;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (epicycleShape === 'triangle') {
        drawPolygon(ctx, prevX, prevY, radius, angle, 3);
      } else if (epicycleShape === 'square') {
        drawPolygon(ctx, prevX, prevY, radius, angle, 4);
      } else if (epicycleShape === 'heart') {
        drawHeart(ctx, prevX, prevY, radius, angle);
      } else if (epicycleShape === 'custom' && customRotorShape) {
        drawCustomShape(ctx, prevX, prevY, radius, angle, customRotorShape);
      } else if (epicycleShape === 'pentagon') {
        drawPolygon(ctx, prevX, prevY, radius, angle, 5);
      } else if (epicycleShape === 'hexagon') {
        drawPolygon(ctx, prevX, prevY, radius, angle, 6);
      } else if (epicycleShape === 'star') {
        drawStar(ctx, prevX, prevY, radius, angle, 5);
      } else {
        ctx.beginPath();
        ctx.arc(prevX, prevY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Línea del vector radio
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    // Acumular punto de la trayectoria
    pathHistory.push({ x, y });

    // 4. Dibujar estela continua trazada
    if (pathHistory.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = pathColor;
      ctx.lineWidth = pathThickness;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(pathHistory[0].x, pathHistory[0].y);
      for (let p = 1; p < pathHistory.length; p++) {
        ctx.lineTo(pathHistory[p].x, pathHistory[p].y);
      }
      ctx.stroke();
    }

    // 5. Dibujar punta luminosa
    ctx.beginPath();
    ctx.arc(x, y, pathThickness * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = pathColor;
    ctx.fill();

    ctx.restore();

    // Reportar progreso y ceder CPU a la UI
    if (frame % 6 === 0) {
      onProgress(Math.round(((frame + 1) / totalFrames) * 100));
      await new Promise(r => setTimeout(r, 4));
    }
  }

  onProgress(100);
  recorder.stop();

  const result = await recordingPromise;
  return result;
}
