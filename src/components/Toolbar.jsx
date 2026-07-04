import React from 'react';
import { 
  Upload, Play, Square, Trash2, Video, PenTool, Move, Download, Undo2, Redo2, Save, MousePointer2, Minus, Snail, Palette
} from 'lucide-react';

export default function Toolbar({
  mode, setMode, onImageUpload, onClear, onToggleAnimation, isAnimating,
  animationSpeed, setAnimationSpeed, epicycleColor, setEpicycleColor,
  pathColor, setPathColor,
  onRecord, isRecording, recordingUrl, onUndo, onRedo, canUndo, canRedo,
  onSavePoints, onLoadPoints
}) {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onImageUpload(url);
    }
  };

  if (isRecording) {
    return (
      <div className="recording-indicator glass-panel">
        <span className="dot"></span> Grabando... La animación se detendrá y guardará sola.
      </div>
    );
  }

  return (
    <div className="toolbar-container glass-panel">
      <div className="toolbar-header">
        <h1><PenTool size={24} /> Epiciclos</h1>
      </div>

      <div className="toolbar-sections">
        <div className="control-group">
          <h3>Fondo</h3>
          <label className="btn">
            <Upload size={18} />
            Subir Imagen
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </label>
        </div>

        <div className="control-group">
          <h3>Dibujo</h3>
          <div className="button-row">
            <button className={`btn icon-btn ${mode === 'draw-pencil' ? 'active' : ''}`} onClick={() => setMode('draw-pencil')} title="Lápiz (Libre)">
              <PenTool size={18} />
            </button>
            <button className={`btn icon-btn ${mode === 'draw-line' ? 'active' : ''}`} onClick={() => setMode('draw-line')} title="Líneas Rectas">
              <Minus size={18} />
            </button>
            <button className={`btn icon-btn ${mode === 'draw-curve' ? 'active' : ''}`} onClick={() => setMode('draw-curve')} title="Curvas">
              <Snail size={18} />
            </button>
          </div>
        </div>

        <div className="control-group">
          <h3>Herramientas</h3>
          <div className="button-row">
            <button className={`btn icon-btn ${mode === 'edit' ? 'active' : ''}`} onClick={() => setMode('edit')} title="Editar Puntos">
              <MousePointer2 size={18} />
            </button>
            <button className={`btn icon-btn ${mode === 'pan' ? 'active' : ''}`} onClick={() => setMode('pan')} title="Mover Lienzo">
              <Move size={18} />
            </button>
            <button className={`btn icon-btn ${mode === 'moveOrigin' ? 'active' : ''}`} onClick={() => setMode('moveOrigin')} title="Mover Centro">
              <div style={{width: 12, height: 12, borderRadius: '50%', backgroundColor: '#10b981'}}></div>
            </button>
          </div>
          
          <div className="button-row" style={{ marginTop: '10px' }}>
            <button className="btn icon-btn" onClick={onUndo} disabled={!canUndo} title="Deshacer (Ctrl+Z)">
              <Undo2 size={18} />
            </button>
            <button className="btn icon-btn" onClick={onRedo} disabled={!canRedo} title="Rehacer (Ctrl+Y)">
              <Redo2 size={18} />
            </button>
            <button className="btn icon-btn danger" onClick={onClear} title="Limpiar Todo">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        
        <div className="control-group">
          <h3>Datos</h3>
          <div className="button-row">
            <button className="btn" style={{flex: 1}} onClick={onSavePoints} title="Guardar .json">
              <Save size={18} />
            </button>
            <label className="btn" style={{flex: 1}} title="Cargar .json">
              <Upload size={18} />
              <input type="file" accept=".json" onChange={onLoadPoints} />
            </label>
          </div>
        </div>

        <div className="control-group">
          <h3>Apariencia y Animación</h3>
          <div className="color-picker-row">
            <label><Palette size={16}/> Epiciclos</label>
            <input type="color" value={epicycleColor} onChange={(e) => setEpicycleColor(e.target.value)} />
          </div>
          <div className="color-picker-row">
            <label><Palette size={16}/> Ruta Generada</label>
            <input type="color" value={pathColor} onChange={(e) => setPathColor(e.target.value)} />
          </div>

          <div className="slider-row">
            <label>Velocidad: {animationSpeed}x</label>
            <input 
              type="range" 
              min="0.1" 
              max="5" 
              step="0.1" 
              value={animationSpeed} 
              onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
            />
          </div>

          <button className={`btn ${isAnimating ? 'danger' : 'primary'} w-full`} onClick={onToggleAnimation}>
            {isAnimating ? <Square size={18} /> : <Play size={18} />}
            {isAnimating ? 'Detener' : 'Animar'}
          </button>
        </div>

        <div className="control-group">
          <h3>Exportar</h3>
          <button className={`btn ${isRecording ? 'danger' : 'accent'} w-full`} onClick={onRecord}>
            <Video size={18} />
            Grabar Video
          </button>
          
          {recordingUrl && (
            <a href={recordingUrl} download="epiciclos.webm" className="btn primary w-full" style={{ textDecoration: 'none', marginTop: '10px' }}>
              <Download size={18} />
              Descargar Video
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
