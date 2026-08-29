import React from 'react';
import { 
  PenTool, Minus, Spline, MousePointer2, Move, Crosshair, 
  Undo2, Redo2, Crop, ZoomIn, ZoomOut, RotateCcw, 
  Play, Square, Video, Trash2 
} from 'lucide-react';

export default function TopQuickbar({
  mode,
  setMode,
  activeTab,
  setActiveTab,
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
  onStartRenderVideo
}) {
  return (
    <div className="top-quickbar-container">
      <div className="top-quickbar glass-panel">
        {/* Herramientas de dibujo */}
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
          title="Curvas Suaves"
        >
          <Spline size={16} />
          <span>Curva</span>
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
          <span>Origen</span>
        </button>

        <div className="quickbar-divider" />

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
