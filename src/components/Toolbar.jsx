import React, { useState } from 'react';
import { 
  Upload, Play, Square, Trash2, Video, PenTool, Move, Download, 
  Undo2, Redo2, Save, MousePointer2, Minus, Palette, Pencil, 
  Spline, Crosshair, FolderOpen, User, Sparkles, Clapperboard, Brush, Layers
} from 'lucide-react';
import Dashboard from './Dashboard';
import AdInterstitialModal from './AdInterstitialModal';
import { downloadOrShareVideo } from '../services/downloader';

const TABS = [
  { id: 'draw',      label: 'Dibujo',    icon: Pencil },
  { id: 'style',     label: 'Apariencia', icon: Brush },
  { id: 'animate',   label: 'Animación',  icon: Sparkles },
  { id: 'project',   label: 'Proyecto',   icon: Layers },
];

export default function Toolbar({
  isPremium, session, onLoginClick, onLogout, currentPoints,
  mode, setMode, onImageUpload, onClear, onToggleAnimation, isAnimating,
  animationSpeed, setAnimationSpeed, epicycleColor, setEpicycleColor,
  pathColor, setPathColor, epicycleThickness, setEpicycleThickness,
  pathThickness, setPathThickness, pathScale, setPathScale, pointSize, setPointSize,
  snapRadius, setSnapRadius,
  onRecord, isRecording, recordingUrl, recordingMp4Url, onUndo, onRedo, canUndo, canRedo,
  onSavePoints, onLoadPoints, onLoadProject
}) {
  const [activeTab, setActiveTab] = useState('draw');
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [pendingDownload, setPendingDownload] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onImageUpload(url);
    }
  };

  const handleDownloadClick = (url, extension) => {
    if (!navigator.onLine) {
      alert("Error: No tienes conexión a internet para continuar.");
      return;
    }
    if (isPremium) {
      downloadOrShareVideo(url, extension);
    } else {
      setPendingDownload({ url, extension });
    }
  };

  const executeDownload = () => {
    if (!pendingDownload) return;
    if (!navigator.onLine) {
      alert("Error: Se perdió la conexión a internet.");
      setPendingDownload(null);
      return;
    }
    downloadOrShareVideo(pendingDownload.url, pendingDownload.extension);
    setPendingDownload(null);
  };

  const handleMobileTabClick = (tabId) => {
    if (activeTab === tabId && mobileSheetOpen) {
      setMobileSheetOpen(false);
    } else {
      setActiveTab(tabId);
      setMobileSheetOpen(true);
    }
  };

  // Recording mode — minimal overlay
  if (isRecording) {
    return (
      <div className="recording-indicator glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="dot"></span>
          <span style={{ fontSize: '0.85rem' }}>Grabando... Se detiene al terminar el ciclo.</span>
        </div>
        <button className="btn danger w-full" onClick={onRecord}>
          <Square size={16} /> Detener
        </button>
      </div>
    );
  }

  /* ---- TAB CONTENT PANELS ---- */
  const renderTabContent = () => {
    switch (activeTab) {
      case 'draw':
        return (
          <div className="toolbar-sections">
            <div className="control-group">
              <h3>Modo de dibujo</h3>
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
              <div className="button-row" style={{ marginTop: '8px' }}>
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
          </div>
        );

      case 'style':
        return (
          <div className="toolbar-sections">
            <div className="control-group">
              <h3>Colores</h3>
              <div className="color-picker-row">
                <label><Palette size={16}/> Epiciclos</label>
                <input type="color" value={epicycleColor} onChange={(e) => setEpicycleColor(e.target.value)} />
              </div>
              <div className="color-picker-row">
                <label><Palette size={16}/> Ruta</label>
                <input type="color" value={pathColor} onChange={(e) => setPathColor(e.target.value)} />
              </div>
            </div>

            <div className="control-group">
              <h3>Dimensiones</h3>
              <div className="slider-row">
                <label>Escala Dibujo <span>{pathScale.toFixed(1)}x</span></label>
                <input type="range" min="0.1" max="5" step="0.1" value={pathScale} onChange={(e) => setPathScale(parseFloat(e.target.value))} />
              </div>
              <div className="slider-row">
                <label>Grosor Epiciclos <span>{epicycleThickness}px</span></label>
                <input type="range" min="0.1" max="5" step="0.1" value={epicycleThickness} onChange={(e) => setEpicycleThickness(parseFloat(e.target.value))} />
              </div>
              <div className="slider-row">
                <label>Grosor Ruta <span>{pathThickness}px</span></label>
                <input type="range" min="0.1" max="10" step="0.1" value={pathThickness} onChange={(e) => setPathThickness(parseFloat(e.target.value))} />
              </div>
              <div className="slider-row">
                <label>Tamaño Puntos <span>{pointSize}px</span></label>
                <input type="range" min="1" max="10" step="1" value={pointSize} onChange={(e) => setPointSize(parseInt(e.target.value))} />
              </div>
              <div className="slider-row">
                <label>Radio Imán <span>{snapRadius}px</span></label>
                <input type="range" min="5" max="50" step="1" value={snapRadius} onChange={(e) => setSnapRadius(parseInt(e.target.value))} />
              </div>
            </div>
          </div>
        );

      case 'animate':
        return (
          <div className="toolbar-sections">
            <div className="control-group">
              <h3>Velocidad</h3>
              <div className="slider-row">
                <label>Velocidad <span>{animationSpeed}x</span></label>
                <input type="range" min="0.1" max="5" step="0.1" value={animationSpeed} onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))} />
              </div>
              <button className={`btn ${isAnimating ? 'danger' : 'primary'} w-full`} onClick={onToggleAnimation}>
                {isAnimating ? <Square size={18} /> : <Play size={18} />}
                {isAnimating ? 'Detener' : 'Iniciar Animación'}
              </button>
            </div>

            <div className="control-group">
              <h3>Grabación</h3>
              <button className={`btn ${isRecording ? 'danger' : 'accent'} w-full`} onClick={onRecord}>
                <Video size={18} />
                {isRecording ? 'Detener Grabación' : 'Grabar Video'}
              </button>
              
              {(recordingUrl || recordingMp4Url) && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                  {recordingMp4Url && (
                    <button onClick={() => handleDownloadClick(recordingMp4Url, 'mp4')} className="btn primary" style={{ flex: 1, padding: '8px', fontSize: '0.78rem' }}>
                      <Download size={14} /> .MP4
                    </button>
                  )}
                  {recordingUrl && (
                    <button onClick={() => handleDownloadClick(recordingUrl, 'webm')} className="btn" style={{ flex: 1, padding: '8px', fontSize: '0.78rem' }}>
                      <Download size={14} /> .WebM
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 'project':
        return (
          <div className="toolbar-sections">
            {!session ? (
              <button onClick={onLoginClick} className="btn primary w-full">
                <User size={16} /> Iniciar Sesión
              </button>
            ) : (
              <Dashboard 
                isPremium={isPremium}
                session={session} 
                onLogout={onLogout} 
                currentPoints={currentPoints}
                onSaveProject={(pts) => onSavePoints(pts)}
                onLoadProject={onLoadProject}
              />
            )}

            <div className="control-group">
              <h3>Archivos locales</h3>
              <div className="button-row">
                <label className="btn icon-btn" title="Subir Imagen de Fondo">
                  <Upload size={18} />
                  <input type="file" accept="image/*" onChange={handleFileChange} />
                </label>
                <button className="btn icon-btn" onClick={onSavePoints} title="Guardar Puntos (JSON)">
                  <Save size={18} />
                </button>
                <label className="btn icon-btn" title="Cargar Puntos (JSON)">
                  <FolderOpen size={18} />
                  <input type="file" accept=".json" onChange={onLoadPoints} />
                </label>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* ===== DESKTOP SIDEBAR ===== */}
      <div className="toolbar-container">
        <div className="toolbar-header">
          <h1><PenTool size={20} /> Epiciclos</h1>
        </div>

        {/* Tabs navigation */}
        <div className="tabs-nav">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="tab-content">
          {renderTabContent()}
        </div>
      </div>

      {/* ===== MOBILE: BOTTOM SHEET + BOTTOM NAV ===== */}
      
      {/* Overlay */}
      <div 
        className={`bottom-sheet-overlay ${mobileSheetOpen ? 'visible' : ''}`}
        onClick={() => setMobileSheetOpen(false)}
      />

      {/* Bottom Sheet */}
      <div className={`bottom-sheet ${mobileSheetOpen ? 'open' : ''}`}>
        <div className="bottom-sheet-handle" onClick={() => setMobileSheetOpen(false)} />
        <div className="bottom-sheet-title">
          {TABS.find(t => t.id === activeTab)?.label}
        </div>
        <div className="bottom-sheet-body">
          {renderTabContent()}
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <nav className="bottom-nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`bottom-nav-btn ${activeTab === tab.id && mobileSheetOpen ? 'active' : ''}`}
            onClick={() => handleMobileTabClick(tab.id)}
          >
            <tab.icon size={20} />
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Ad interstitial */}
      {pendingDownload && (
        <AdInterstitialModal onSkip={executeDownload} />
      )}
    </>
  );
}
