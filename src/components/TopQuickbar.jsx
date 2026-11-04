import React from 'react';
import {
  PenTool, Minus, Spline, MousePointer2, Move, Crosshair,
  Undo2, Redo2, Crop, ZoomIn, ZoomOut, RotateCcw,
  Play, Square, Plus, Eye, EyeOff, CircleDot, Scissors, PlusSquare
} from 'lucide-react';

const selectDrawMode = (setActiveTab, setMode, nextMode) => {
  setActiveTab('draw');
  setMode(nextMode);
};

export default function TopQuickbar({
  mode,
  setMode,
  activeTab,
  setActiveTab,
  layers = [],
  activeLayerId,
  setActiveLayerId,
  onAddLayer,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onZoomIn,
  onZoomOut,
  onResetView,
  isAnimating,
  onToggleAnimation,
  showRecordingBox,
  setShowRecordingBox,
  showEpicyclesPreview,
  onToggleEpicyclesPreview,
  onToggleClosePath,
  onDetachPoints,
  topOffset = 8
}) {
  const activeLayer = layers.find(l => l.id === activeLayerId) || layers[0] || {};
  const pointCount = activeLayer.points?.length || 0;
  const layerName = activeLayer.name || 'Trazo 1';

  const drawActive = (toolMode) => activeTab === 'draw' && mode === toolMode;

  return (
    <>
      <header className="studio-topbar" style={{ '--studio-top': `${topOffset}px` }}>
        <div className="studio-brand">Epiciclos</div>

        <div className="studio-chip">
          {layers.length > 1 ? (
            <select
              className="studio-chip-select"
              value={activeLayer.id}
              aria-label="Traza activa"
              onChange={(e) => setActiveLayerId(e.target.value)}
            >
              {layers.map((layer, index) => (
                <option key={layer.id} value={layer.id}>
                  {layer.name || `Trazo ${index + 1}`}
                </option>
              ))}
            </select>
          ) : (
            <span className="studio-chip-name">{layerName}</span>
          )}
          <span className="studio-chip-count">{pointCount} puntos</span>
          <button
            type="button"
            className="studio-chip-add"
            onClick={onAddLayer}
            title="Añadir nueva traza"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="studio-top-actions">
          <div className="studio-zoom-mobile">
            <button type="button" className="studio-icon-btn" onClick={onZoomIn} title="Acercar zoom">
              <ZoomIn size={16} />
            </button>
            <button type="button" className="studio-icon-btn" onClick={onZoomOut} title="Alejar zoom">
              <ZoomOut size={16} />
            </button>
            <button type="button" className="studio-icon-btn" onClick={onResetView} title="Centrar vista">
              <RotateCcw size={16} />
            </button>
          </div>
          <button
            type="button"
            className={`studio-play ${isAnimating ? 'is-paused' : ''}`}
            onClick={onToggleAnimation}
            title="Iniciar / Pausar animación"
          >
            {isAnimating ? <Square size={15} /> : <Play size={15} />}
            <span>{isAnimating ? 'Pausa' : 'Play'}</span>
          </button>
        </div>
      </header>

      <aside className="studio-rail" aria-label="Herramientas">
        <button
          type="button"
          className={`studio-rail-btn ${drawActive('draw-pencil') ? 'active' : ''}`}
          onClick={() => selectDrawMode(setActiveTab, setMode, 'draw-pencil')}
          title="Lápiz libre"
        >
          <PenTool size={18} />
        </button>
        <button
          type="button"
          className={`studio-rail-btn ${drawActive('draw-line') ? 'active' : ''}`}
          onClick={() => selectDrawMode(setActiveTab, setMode, 'draw-line')}
          title="Línea recta"
        >
          <Minus size={18} />
        </button>
        <button
          type="button"
          className={`studio-rail-btn ${drawActive('draw-curve') ? 'active' : ''}`}
          onClick={() => selectDrawMode(setActiveTab, setMode, 'draw-curve')}
          title="Curva suave"
        >
          <Spline size={18} />
        </button>
        <button
          type="button"
          className={`studio-rail-btn ${drawActive('insert-point') ? 'active' : ''}`}
          onClick={() => selectDrawMode(setActiveTab, setMode, 'insert-point')}
          title="Insertar punto"
        >
          <PlusSquare size={18} />
        </button>

        <div className="studio-rail-divider" />

        <button
          type="button"
          className={`studio-rail-btn ${drawActive('edit') ? 'active' : ''}`}
          onClick={() => selectDrawMode(setActiveTab, setMode, 'edit')}
          title="Editar puntos"
        >
          <MousePointer2 size={18} />
        </button>
        <button
          type="button"
          className={`studio-rail-btn ${mode === 'pan' ? 'active' : ''}`}
          onClick={() => setMode('pan')}
          title="Mover lienzo"
        >
          <Move size={18} />
        </button>
        <button
          type="button"
          className={`studio-rail-btn ${mode === 'moveOrigin' ? 'active' : ''}`}
          onClick={() => setMode('moveOrigin')}
          title="Mover centro"
        >
          <Crosshair size={18} />
        </button>
        <button
          type="button"
          className={`studio-rail-btn ${activeLayer.isClosed ? 'active' : ''}`}
          onClick={() => onToggleClosePath && onToggleClosePath(activeLayer.id)}
          title="Unir inicio y final"
        >
          <CircleDot size={18} />
        </button>
        <button
          type="button"
          className="studio-rail-btn"
          onClick={() => onDetachPoints && onDetachPoints(activeLayer.id)}
          title="Desunir puntos coincidentes"
        >
          <Scissors size={18} />
        </button>

        <div className="studio-rail-divider" />

        <button type="button" className="studio-rail-btn" onClick={onUndo} disabled={!canUndo} title="Deshacer">
          <Undo2 size={18} />
        </button>
        <button type="button" className="studio-rail-btn" onClick={onRedo} disabled={!canRedo} title="Rehacer">
          <Redo2 size={18} />
        </button>
        <button type="button" className="studio-rail-btn" onClick={onZoomIn} title="Acercar zoom">
          <ZoomIn size={18} />
        </button>
        <button type="button" className="studio-rail-btn" onClick={onZoomOut} title="Alejar zoom">
          <ZoomOut size={18} />
        </button>
        <button type="button" className="studio-rail-btn" onClick={onResetView} title="Centrar vista">
          <RotateCcw size={18} />
        </button>

        <div className="studio-rail-divider" />

        <button
          type="button"
          className={`studio-rail-btn ${showEpicyclesPreview ? 'active' : ''}`}
          onClick={onToggleEpicyclesPreview}
          title="Vista previa de epiciclos"
        >
          {showEpicyclesPreview ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
        <button
          type="button"
          className={`studio-rail-btn ${showRecordingBox ? 'active' : ''}`}
          onClick={() => setShowRecordingBox(prev => !prev)}
          title="Marco de grabación"
        >
          <Crop size={18} />
        </button>
      </aside>
    </>
  );
}
