import React from 'react';
import { 
  PenTool, Minus, Spline, MousePointer2, Move, Crosshair, 
  Undo2, Redo2, Crop, ZoomIn, ZoomOut, RotateCcw, 
  Play, Square, Video, Trash2, Plus, Eye, EyeOff, CircleDot
} from 'lucide-react';

export default function TopQuickbar({
  mode,
  setMode,
  activeTab,
  setActiveTab,
  layers = [],
  activeLayerId,
  setActiveLayerId,
  onAddLayer,
  onUpdateLayer,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClear,
  onZoomIn,
  onZoomOut,
  onResetView,
  isAnimating,
  onToggleAnimation,
  showRecordingBox,
  setShowRecordingBox,
  isRenderingVideo,
  onStartRenderVideo,
  showEpicyclesPreview,
  onToggleEpicyclesPreview,
  onToggleClosePath,
  topOffset = 8
}) {
  const activeLayer = layers.find(l => l.id === activeLayerId) || layers[0] || {};

  return (
    <div className="top-quickbar-container" style={{ '--quickbar-top': `${topOffset}px` }}>
      <div className="top-quickbar glass-panel">
        {/* Selector Rápido de Capa / Traza */}
        {layers.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <select
              value={activeLayer.id}
              onChange={(e) => setActiveLayerId(e.target.value)}
              className="quick-btn"
              style={{
                background: 'rgba(56, 189, 248, 0.2)',
                border: '1px solid #38bdf8',
                color: '#38bdf8',
                fontWeight: 'bold',
                cursor: 'pointer',
                outline: 'none',
                padding: '4px 8px'
              }}
            >
              {layers.map((l, i) => (
                <option key={l.id} value={l.id} style={{ background: '#0f172a', color: '#fff' }}>
                  {l.name || `Trazo ${i + 1}`} ({l.points?.length || 0}p)
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          className="quick-btn"
          onClick={onAddLayer}
          title="Añadir Nueva Traza / Capa"
          style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}
        >
          <Plus size={15} />
          <span>Traza</span>
        </button>

        <div className="quickbar-divider" />

        {/* Herramientas de dibujo para la traza activa */}
        <button
          className={`quick-btn ${mode === 'draw-pencil' && activeTab === 'draw' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('draw');
            setMode('draw-pencil');
          }}
          title="Lápiz Libre"
        >
          <PenTool size={16} />
          <span>Lápiz</span>
        </button>

        <button
          className={`quick-btn ${mode === 'draw-line' && activeTab === 'draw' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('draw');
            setMode('draw-line');
          }}
          title="Líneas Rectas"
        >
          <Minus size={16} />
          <span>Línea</span>
        </button>

        <button
          className={`quick-btn ${mode === 'draw-curve' && activeTab === 'draw' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('draw');
            setMode('draw-curve');
          }}
          title="Curvas Suaves (Spline)"
        >
          <Spline size={16} />
          <span>Curva</span>
        </button>

        {/* Unir Inicio y Fin (Cerrar Trazo) */}
        <button
          className={`quick-btn ${activeLayer.isClosed ? 'active' : ''}`}
          onClick={() => onToggleClosePath && onToggleClosePath(activeLayer.id)}
          title="Unir Punto Inicial con Final (Cerrar Trazo)"
        >
          <CircleDot size={16} />
          <span>{activeLayer.isClosed ? 'Cerrado' : 'Cerrar'}</span>
        </button>

        <button
          className={`quick-btn ${mode === 'edit' && activeTab === 'draw' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('draw');
            setMode('edit');
          }}
          title="Editar Puntos"
        >
          <MousePointer2 size={16} />
          <span>Editar</span>
        </button>

        <button
          className={`quick-btn ${mode === 'pan' ? 'active' : ''}`}
          onClick={() => setMode('pan')}
          title="Mover Lienzo"
        >
          <Move size={16} />
          <span>Mover</span>
        </button>

        <button
          className={`quick-btn ${mode === 'moveOrigin' ? 'active' : ''}`}
          onClick={() => setMode('moveOrigin')}
          title="Mover Centro / Origen"
        >
          <Crosshair size={16} />
          <span>Centro</span>
        </button>

        <div className="quickbar-divider" />

        {/* Vista previa de Epiciclos */}
        <button
          className={`quick-btn ${showEpicyclesPreview ? 'active' : ''}`}
          onClick={onToggleEpicyclesPreview}
          title="Mostrar / Ocultar Vista Previa de Epiciclos"
        >
          {showEpicyclesPreview ? <Eye size={16} /> : <EyeOff size={16} />}
          <span>{showEpicyclesPreview ? 'Ver Epiciclos' : 'Epiciclos'}</span>
        </button>

        {/* Deshacer / Rehacer */}
        <button
          className="quick-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Deshacer"
        >
          <Undo2 size={16} />
        </button>

        <button
          className="quick-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Rehacer"
        >
          <Redo2 size={16} />
        </button>

        <div className="quickbar-divider" />

        {/* Marco de Grabación Delimitado */}
        <button
          className={`quick-btn ${showRecordingBox ? 'active' : ''}`}
          onClick={() => setShowRecordingBox(prev => !prev)}
          title="Ajustar Marco de Grabación"
        >
          <Crop size={16} />
          <span>Marco</span>
        </button>

        {/* Zoom */}
        <button className="quick-btn" onClick={onZoomIn} title="Acercar Zoom">
          <ZoomIn size={16} />
        </button>

        <button className="quick-btn" onClick={onZoomOut} title="Alejar Zoom">
          <ZoomOut size={16} />
        </button>

        <button className="quick-btn" onClick={onResetView} title="Centrar Vista">
          <RotateCcw size={16} />
        </button>

        <div className="quickbar-divider" />

        {/* Animación y Video */}
        <button
          className={`quick-btn ${isAnimating ? 'danger' : 'primary'}`}
          onClick={onToggleAnimation}
          title="Iniciar / Pausar Animación"
        >
          {isAnimating ? <Square size={16} /> : <Play size={16} />}
          <span>{isAnimating ? 'Pausa' : 'Play'}</span>
        </button>

        <button
          className={`quick-btn ${isRenderingVideo ? 'danger' : 'accent'}`}
          onClick={onStartRenderVideo}
          title="Renderizar Video 60 FPS en segundo plano"
        >
          <Video size={16} />
          <span>{isRenderingVideo ? 'Cancel' : 'Video 60fps'}</span>
        </button>

        <button className="quick-btn danger" onClick={onClear} title="Borrar Lienzo">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
