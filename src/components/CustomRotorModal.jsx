import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Trash2, PenTool, Minus, Spline, ZoomIn, ZoomOut, RotateCcw, HelpCircle } from 'lucide-react';
import { generateSpline } from '../utils/math';

export default function CustomRotorModal({ onClose, onSaveCustomShape, currentCustomShape }) {
  const canvasRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [mode, setMode] = useState('line'); // 'pencil' | 'line' | 'curve'
  const [isDrawing, setIsDrawing] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Puntos guía: A (Origen/Centro) y B (Punta/Radio)
  const [originPoint, setOriginPoint] = useState({ x: 90, y: 150 });
  const [targetPoint, setTargetPoint] = useState({ x: 230, y: 150 });
  const [draggingHandle, setDraggingHandle] = useState(null); // 'origin' | 'target' | null
  const [snappedToPoint, setSnappedToPoint] = useState(null);

  const canvasWidth = 320;
  const canvasHeight = 300;
  const snapDist = 20;

  // Redibujar el mini-lienzo
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Limpiar fondo
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Cuadrícula técnica sutil
    ctx.save();
    ctx.scale(zoom, zoom);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1 / zoom;
    const gridSize = 20;
    for (let x = 0; x < canvasWidth / zoom; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight / zoom);
      ctx.stroke();
    }
    for (let y = 0; y < canvasHeight / zoom; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth / zoom, y);
      ctx.stroke();
    }

    // Vector guía del radio (Línea discontinua de A a B)
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 2 / zoom;
    ctx.moveTo(originPoint.x, originPoint.y);
    ctx.lineTo(targetPoint.x, targetPoint.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Flecha indicadora en B
    const angle = Math.atan2(targetPoint.y - originPoint.y, targetPoint.x - originPoint.x);
    const arrowLen = 10 / zoom;
    ctx.beginPath();
    ctx.fillStyle = '#38bdf8';
    ctx.moveTo(targetPoint.x, targetPoint.y);
    ctx.lineTo(
      targetPoint.x - arrowLen * Math.cos(angle - Math.PI / 6),
      targetPoint.y - arrowLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      targetPoint.x - arrowLen * Math.cos(angle + Math.PI / 6),
      targetPoint.y - arrowLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.fill();

    // Dibujar trazo del usuario
    if (points.length > 0) {
      let renderPts = points;
      if (mode === 'curve' && points.length >= 3) {
        renderPts = generateSpline(points, 20, false);
      }

      ctx.beginPath();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3 / zoom;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(renderPts[0].x, renderPts[0].y);
      for (let i = 1; i < renderPts.length; i++) {
        ctx.lineTo(renderPts[i].x, renderPts[i].y);
      }
      ctx.stroke();

      // Puntos de control dibujados
      points.forEach((p, idx) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = idx === 0 ? '#10b981' : (idx === points.length - 1 ? '#38bdf8' : '#ffffff');
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1 / zoom;
        ctx.stroke();
      });
    }

    // Efecto de Imán / Snapping activo
    if (snappedToPoint) {
      ctx.beginPath();
      ctx.arc(snappedToPoint.x, snappedToPoint.y, 14 / zoom, 0, Math.PI * 2);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();
    }

    // Dibujar Punto A (Origen / Centro del Rotor)
    ctx.beginPath();
    ctx.arc(originPoint.x, originPoint.y, 8 / zoom, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 / zoom;
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.font = `bold ${Math.max(10, 11 / zoom)}px sans-serif`;
    ctx.fillText('A (Centro)', originPoint.x - 24 / zoom, originPoint.y - 12 / zoom);

    // Dibujar Punto B (Punta / Conexión siguiente rotor)
    ctx.beginPath();
    ctx.arc(targetPoint.x, targetPoint.y, 8 / zoom, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 / zoom;
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = `bold ${Math.max(10, 11 / zoom)}px sans-serif`;
    ctx.fillText('B (Punta)', targetPoint.x - 20 / zoom, targetPoint.y - 12 / zoom);

    ctx.restore();

  }, [points, originPoint, targetPoint, mode, zoom, snappedToPoint]);

  const getCanvasPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: ((clientX - rect.left) * scaleX) / zoom,
      y: ((clientY - rect.top) * scaleY) / zoom
    };
  };

  const findNearestPoint = (pos) => {
    for (let p of points) {
      if (Math.hypot(p.x - pos.x, p.y - pos.y) < snapDist / zoom) {
        return p;
      }
    }
    return null;
  };

  const handlePointerDown = (e) => {
    const pos = getCanvasPos(e);

    // Verificar si tocó los puntos de control A o B
    if (Math.hypot(pos.x - originPoint.x, pos.y - originPoint.y) < 24 / zoom) {
      setDraggingHandle('origin');
      return;
    }
    if (Math.hypot(pos.x - targetPoint.x, pos.y - targetPoint.y) < 24 / zoom) {
      setDraggingHandle('target');
      return;
    }

    if (mode === 'pencil') {
      setIsDrawing(true);
      setPoints(prev => [...prev, pos]);
    } else {
      // Línea o Curva: conectar con imán si está cerca del inicio
      const near = findNearestPoint(pos);
      const newPos = near || pos;
      setPoints(prev => [...prev, newPos]);
    }
  };

  const handlePointerMove = (e) => {
    const pos = getCanvasPos(e);

    if (draggingHandle === 'origin') {
      const near = findNearestPoint(pos);
      setSnappedToPoint(near);
      setOriginPoint(near || pos);
      return;
    }
    if (draggingHandle === 'target') {
      const near = findNearestPoint(pos);
      setSnappedToPoint(near);
      setTargetPoint(near || pos);
      return;
    }

    if (isDrawing && mode === 'pencil') {
      const last = points[points.length - 1];
      if (!last || Math.hypot(pos.x - last.x, pos.y - last.y) > 3 / zoom) {
        setPoints(prev => [...prev, pos]);
      }
    }
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    setDraggingHandle(null);
    setSnappedToPoint(null);
  };

  const handleSave = () => {
    if (points.length < 2) {
      alert('Por favor dibuja una forma con al menos 2 puntos.');
      return;
    }

    const vx = targetPoint.x - originPoint.x;
    const vy = targetPoint.y - originPoint.y;
    const baseLen = Math.hypot(vx, vy);
    const baseAngle = Math.atan2(vy, vx);

    if (baseLen < 5) {
      alert('Los puntos A y B deben estar separados.');
      return;
    }

    let finalPoints = points;
    if (mode === 'curve' && points.length >= 3) {
      finalPoints = generateSpline(points, 20, false);
    }

    const relativePoints = finalPoints.map(p => {
      const dx = p.x - originPoint.x;
      const dy = p.y - originPoint.y;
      const u = (dx * Math.cos(baseAngle) + dy * Math.sin(baseAngle)) / baseLen;
      const v = (-dx * Math.sin(baseAngle) + dy * Math.cos(baseAngle)) / baseLen;
      return { u, v };
    });

    onSaveCustomShape(relativePoints);
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 3000, padding: '12px' }}>
      <div 
        className="auth-modal glass-panel" 
        style={{ 
          width: '380px', 
          maxWidth: '100%', 
          maxHeight: '90vh', 
          overflowY: 'auto', 
          padding: '16px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc' }}>🎨 Diseñar Forma de Rotor</h3>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0 0 8px 0', lineHeight: '1.3' }}>
          Dibuja tu figura. Arrastra <b style={{ color: '#10b981' }}>🟢 A (Centro)</b> y <b style={{ color: '#38bdf8' }}>🔵 B (Punta)</b> (se imantan a tus puntos).
        </p>

        {/* Herramientas de dibujo y Zoom */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <button 
            className={`btn icon-btn ${mode === 'line' ? 'active' : ''}`}
            onClick={() => setMode('line')}
            style={{ padding: '6px 8px', fontSize: '0.72rem' }}
          >
            <Minus size={14} /> Recta
          </button>
          <button 
            className={`btn icon-btn ${mode === 'curve' ? 'active' : ''}`}
            onClick={() => setMode('curve')}
            style={{ padding: '6px 8px', fontSize: '0.72rem' }}
          >
            <Spline size={14} /> Curva
          </button>
          <button 
            className={`btn icon-btn ${mode === 'pencil' ? 'active' : ''}`}
            onClick={() => setMode('pencil')}
            style={{ padding: '6px 8px', fontSize: '0.72rem' }}
          >
            <PenTool size={14} /> Lápiz
          </button>
          <button 
            className="btn icon-btn"
            onClick={() => setZoom(prev => Math.min(2.5, prev + 0.25))}
            title="Acercar Zoom"
            style={{ padding: '6px 8px' }}
          >
            <ZoomIn size={14} />
          </button>
          <button 
            className="btn icon-btn"
            onClick={() => setZoom(prev => Math.max(0.75, prev - 0.25))}
            title="Alejar Zoom"
            style={{ padding: '6px 8px' }}
          >
            <ZoomOut size={14} />
          </button>
          <button 
            className="btn icon-btn danger"
            onClick={() => setPoints([])}
            title="Borrar dibujo"
            style={{ padding: '6px 8px' }}
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Canvas de diseño */}
        <div style={{ 
          borderRadius: '10px', 
          overflow: 'hidden', 
          border: '1px solid rgba(255,255,255,0.15)', 
          display: 'flex', 
          justifyContent: 'center',
          background: '#0a0f1d'
        }}>
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            style={{ 
              width: '100%', 
              height: 'auto', 
              aspectRatio: '320/300', 
              touchAction: 'none', 
              cursor: 'crosshair',
              display: 'block'
            }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          />
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button className="btn w-full" onClick={onClose} style={{ padding: '10px', fontSize: '0.82rem' }}>
            Cancelar
          </button>
          <button className="btn primary w-full" onClick={handleSave} style={{ padding: '10px', fontSize: '0.82rem' }}>
            <Check size={16} /> Aplicar Forma
          </button>
        </div>
      </div>
    </div>
  );
}
