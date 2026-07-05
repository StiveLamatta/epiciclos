import React, { useState } from 'react';
import { 
  Upload, Play, Square, Trash2, Video, PenTool, Move, Download, Undo2, Redo2, Save, MousePointer2, Minus, Snail, Palette, Pencil, Spline, Crosshair, FolderOpen, User
} from 'lucide-react';
import Dashboard from './Dashboard';
import AdInterstitialModal from './AdInterstitialModal';

export default function Toolbar({
  session, onLoginClick, onLogout, currentPoints,
  mode, setMode, onImageUpload, onClear, onToggleAnimation, isAnimating,
  animationSpeed, setAnimationSpeed, epicycleColor, setEpicycleColor,
  pathColor, setPathColor, epicycleThickness, setEpicycleThickness,
  pathThickness, setPathThickness, pathScale, setPathScale, pointSize, setPointSize,
  snapRadius, setSnapRadius,
  onRecord, isRecording, recordingUrl, recordingMp4Url, onUndo, onRedo, canUndo, canRedo,
  onSavePoints, onLoadPoints
}) {
  const [pendingDownload, setPendingDownload] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onImageUpload(url);
    }
  };

  const handleDownloadClick = (url, extension) => {
    // Si no hay red, bloqueamos incluso intentar descargar
    if (!navigator.onLine) {
      alert("Error: No tienes conexión a internet para continuar.");
      return;
    }
    setPendingDownload({ url, extension });
  };

  const executeDownload = () => {
    if (!pendingDownload) return;
    const a = document.createElement('a');
    a.href = pendingDownload.url;
    a.download = `animacion-epiciclos.${pendingDownload.extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setPendingDownload(null);
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
        
        {!session ? (
          <button onClick={onLoginClick} className="btn primary w-full" style={{ marginBottom: '15px' }}>
            <User size={16} /> Iniciar Sesión para Guardar
          </button>
        ) : (
          <Dashboard 
            session={session} 
            onLogout={onLogout} 
            currentPoints={currentPoints}
            onSaveProject={(pts) => onSavePoints(pts)} // Using prop from earlier or can save directly
            onLoadProject={onLoadPoints}
          />
        )}
      </div>

      <div className="toolbar-sections">
        <div className="control-group">
          <h3>Fondo y Archivos</h3>
          <div className="button-row">
            <label className="btn icon-btn" title="Subir Fondo">
              <Upload size={18} />
              <input type="file" accept="image/*" onChange={handleFileChange} />
            </label>
            <button className="btn icon-btn" onClick={onSavePoints} title="Guardar Puntos">
              <Save size={18} />
            </button>
            <label className="btn icon-btn" title="Cargar Puntos">
              <FolderOpen size={18} />
              <input type="file" accept=".json" onChange={onLoadPoints} />
            </label>
          </div>
        </div>

        <div className="control-group">
          <h3>Dibujo</h3>
          <div className="button-row">
            <button className={`btn icon-btn ${mode === 'draw-pencil' ? 'active' : ''}`} onClick={() => setMode('draw-pencil')} title="Lápiz (Libre)">
              <Pencil size={18} />
            </button>
            <button className={`btn icon-btn ${mode === 'draw-line' ? 'active' : ''}`} onClick={() => setMode('draw-line')} title="Líneas Rectas">
              <Minus size={18} />
            </button>
            <button className={`btn icon-btn ${mode === 'draw-curve' ? 'active' : ''}`} onClick={() => setMode('draw-curve')} title="Curva Suave">
              <Spline size={18} />
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
              <Crosshair size={18} />
            </button>
          </div>
          
          <div className="button-row" style={{ marginTop: '10px' }}>
            <button className="btn icon-btn" onClick={onUndo} disabled={!canUndo} title="Deshacer (Ctrl+Z)">
              <Undo2 size={18} />
            </button>
            <button className="btn icon-btn" onClick={onRedo} disabled={!canRedo} title="Rehacer (Ctrl+Y)">
              <Redo2 size={18} />
            </button>
            <button className="btn icon-btn danger" onClick={onClear} title="Borrar Todo">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        
        <div className="control-group">
          <h3>Apariencia</h3>
          <div className="color-picker-row">
            <label><Palette size={16}/> Epiciclos</label>
            <input type="color" value={epicycleColor} onChange={(e) => setEpicycleColor(e.target.value)} />
          </div>
          <div className="color-picker-row">
            <label><Palette size={16}/> Ruta</label>
            <input type="color" value={pathColor} onChange={(e) => setPathColor(e.target.value)} />
          </div>
          
          <div className="slider-row">
            <label>Escala Dibujo: {pathScale.toFixed(1)}x</label>
            <input 
              type="range" 
              min="0.1" 
              max="5" 
              step="0.1" 
              value={pathScale} 
              onChange={(e) => setPathScale(parseFloat(e.target.value))} 
            />
          </div>

          <div className="slider-row">
            <label>Grosor Epiciclos: {epicycleThickness}px</label>
            <input 
              type="range" 
              min="0.1" 
              max="5" 
              step="0.1" 
              value={epicycleThickness} 
              onChange={(e) => setEpicycleThickness(parseFloat(e.target.value))} 
            />
          </div>

          <div className="slider-row">
            <label>Grosor Ruta: {pathThickness}px</label>
            <input 
              type="range" 
              min="0.1" 
              max="10" 
              step="0.1" 
              value={pathThickness} 
              onChange={(e) => setPathThickness(parseFloat(e.target.value))} 
            />
          </div>

          <div className="slider-row">
            <label>Tamaño Puntos: {pointSize}px</label>
            <input 
              type="range" 
              min="1" 
              max="10" 
              step="1" 
              value={pointSize} 
              onChange={(e) => setPointSize(parseInt(e.target.value))} 
            />
          </div>

          <div className="slider-row">
            <label>Radio Imán: {snapRadius}px</label>
            <input 
              type="range" 
              min="5" 
              max="50" 
              step="1" 
              value={snapRadius} 
              onChange={(e) => setSnapRadius(parseInt(e.target.value))} 
            />
          </div>
        </div>

        <div className="control-group">
          <h3>Animación</h3>
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
            {isAnimating ? 'Detener Animación' : 'Iniciar Animación'}
          </button>
        </div>

        <div className="control-group">
          <h3>Grabación</h3>
          <button className={`btn ${isRecording ? 'danger' : 'accent'} w-full`} onClick={onRecord}>
            <Video size={18} />
            {isRecording ? 'Detener Grabación' : 'Grabar Video'}
          </button>
          
          {(recordingUrl || recordingMp4Url) && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              {recordingMp4Url && (
                <button onClick={() => handleDownloadClick(recordingMp4Url, 'mp4')} className="btn primary w-full">
                  <Download size={16} /> Descargar .MP4
                </button>
              )}
              {recordingUrl && (
                <button onClick={() => handleDownloadClick(recordingUrl, 'webm')} className="btn w-full">
                  <Download size={16} /> Descargar .WebM
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {pendingDownload && (
        <AdInterstitialModal 
          onSkip={executeDownload} 
        />
      )}
    </div>
  );
}
