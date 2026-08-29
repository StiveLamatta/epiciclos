import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Trash2, PenTool, Minus, Spline, Undo2, HelpCircle } from 'lucide-react';
import { generateSpline } from '../utils/math';

export default function CustomRotorModal({ onClose, onSaveCustomShape, currentCustomShape }) {
  const canvasRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [mode, setMode] = useState('pencil'); // 'pencil' | 'line' | 'curve'
  const [isDrawing, setIsDrawing] = useState(false);

  // Puntos guía: Origen (A) y Punta del Radio (B)
  const [originPoint, setOriginPoint] = useState({ x: 120, y: 200 });
  const [targetPoint, setTargetPoint] = useState({ x: 280, y: 200 });
  const [draggingHandle, setDraggingHandle] = useState(null); // 'origin' | 'target' | null

  const width = 400;
  const height = 400;

  // Redibujar el mini-lienzo
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Limpiar fondo
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Cuadrícula técnica sutil
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 20;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Vector guía del radio (Línea discontinua de A a B)
    ctx.beginPath();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 2;
    ctx.moveTo(originPoint.x, originPoint.y);
    ctx.lineTo(targetPoint.x, targetPoint.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Flecha indicadora en B
    const angle = Math.atan2(targetPoint.y - originPoint.y, targetPoint.x - originPoint.x);
    const arrowLen = 12;
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
      if (mode === 'curve' && points.length > 2) {
        renderPts = generateSpline(points, 15, false);
      }

      ctx.beginPath();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(renderPts[0].x, renderPts[0].y);
      for (let i = 1; i < renderPts.length; i++) {
        ctx.lineTo(renderPts[i].x, renderPts[i].y);
      }
      ctx.stroke();

      // Puntos de control
      points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });
    }

    // Dibujar Punto A (Origen / Centro del Rotor)
    ctx.beginPath();
    ctx.arc(originPoint.x, originPoint.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('A (Centro)', originPoint.x - 24, originPoint.y - 14);

    // Dibujar Punto B (Punta / Conexión siguiente rotor)
    ctx.beginPath();
    ctx.arc(targetPoint.x, targetPoint.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('B (Punta)', targetPoint.x - 20, targetPoint.y - 14);

  }, [points, originPoint, targetPoint, mode]);

  const getCanvasPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e) => {
    const pos = getCanvasPos(e);

    // Verificar si tocó los puntos de control A o B
    if (Math.hypot(pos.x - originPoint.x, pos.y - originPoint.y) < 22) {
      setDraggingHandle('origin');
      return;
    }
    if (Math.hypot(pos.x - targetPoint.x, pos.y - targetPoint.y) < 22) {
      setDraggingHandle('target');
      return;
    }

    if (mode === 'pencil') {
      setIsDrawing(true);
      setPoints([...points, pos]);
    } else {
      setPoints([...points, pos]);
    }
  };

  const handlePointerMove = (e) => {
    const pos = getCanvasPos(e);

    if (draggingHandle === 'origin') {
      setOriginPoint(pos);
      return;
    }
    if (draggingHandle === 'target') {
      setTargetPoint(pos);
      return;
    }

    if (isDrawing && mode === 'pencil') {
      const last = points[points.length - 1];
      if (!last || Math.hypot(pos.x - last.x, pos.y - last.y) > 4) {
        setPoints([...points, pos]);
      }
    }
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    setDraggingHandle(null);
  };

  const handleSave = () => {
    if (points.length < 2) {
      alert('Por favor dibuja una forma con al menos 2 puntos.');
      return;
    }

    // Normalización matemática relativa respecto al vector (targetPoint - originPoint)
    const vx = targetPoint.x - originPoint.x;
    const vy = targetPoint.y - originPoint.y;
    const baseLen = Math.hypot(vx, vy);
    const baseAngle = Math.atan2(vy, vx);

    if (baseLen < 10) {
      alert('Los puntos A y B están demasiado juntos.');
      return;
    }

    let finalPoints = points;
    if (mode === 'curve' && points.length > 2) {
      finalPoints = generateSpline(points, 15, false);
    }

    const relativePoints = finalPoints.map(p => {
      const dx = p.x - originPoint.x;
      const dy = p.y - originPoint.y;
      // Proyección en eje paralelo (u) y perpendicular (v)
      const u = (dx * Math.cos(baseAngle) + dy * Math.sin(baseAngle)) / baseLen;
      const v = (-dx * Math.sin(baseAngle) + dy * Math.cos(baseAngle)) / baseLen;
      return { u, v };
    });

    onSaveCustomShape(relativePoints);
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 3000 }}>
      <div className="auth-modal glass-panel" style={{ width: '440px', maxWidth: '95vw', padding: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc' }}>🎨 Diseñar Forma de Rotor</h3>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0 0 10px 0' }}>
          Dibuja tu forma. <b style={{ color: '#10b981' }}>🟢 A</b> es el centro donde nace el rotor, y <b style={{ color: '#38bdf8' }}>🔵 B</b> es la punta hacia donde apunta el radio.
        </p>

        {/* Herramientas de dibujo para la forma */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
          <button 
            className={`btn icon-btn ${mode === 'pencil' ? 'active' : ''}`}
            onClick={() => setMode('pencil')}
            title="Lápiz Libre"
          >
            <PenTool size={16} /> Lápiz
          </button>
          <button 
            className={`btn icon-btn ${mode === 'line' ? 'active' : ''}`}
            onClick={() => setMode('line')}
            title="Líneas Rectas"
          >
            <Minus size={16} /> Línea
          </button>
          <button 
            className={`btn icon-btn ${mode === 'curve' ? 'active' : ''}`}
            onClick={() => setMode('curve')}
            title="Curva Suave"
          >
            <Spline size={16} /> Curva
          </button>
          <button 
            className="btn icon-btn danger"
            onClick={() => setPoints([])}
            title="Borrar dibujo"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Canvas de diseño */}
        <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', justifyContent: 'center' }}>
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{ width: '100%', maxWidth: '360px', height: 'auto', aspectRatio: '1/1', touchAction: 'none', cursor: 'crosshair' }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          />
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
          <button className="btn w-full" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary w-full" onClick={handleSave}>
            <Check size={18} /> Aplicar Forma
          </button>
        </div>
      </div>
    </div>
  );
}
