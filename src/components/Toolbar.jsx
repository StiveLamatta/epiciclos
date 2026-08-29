import React, { useState } from 'react';
import { 
  Upload, Play, Square, Trash2, Video, PenTool, Move, Download, 
  Undo2, Redo2, Save, MousePointer2, Minus, Palette, Pencil, 
  Spline, Crosshair, FolderOpen, User, Sparkles, Brush, Layers,
  Heart, Shapes, PlusCircle
} from 'lucide-react';
import Dashboard from './Dashboard';
import AdInterstitialModal from './AdInterstitialModal';
import CustomRotorModal from './CustomRotorModal';
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
  epicycleShape = 'circle', setEpicycleShape,
  customRotorShape, setCustomRotorShape,
  exportQuality = '480p', setExportQuality,
  onRecord, isRecording, recordingUrl, recordingMp4Url, onUndo, onRedo, canUndo, canRedo,
  onSavePoints, onLoadPoints, onLoadProject,
  activeTab = 'draw', setActiveTab,
  isDevUser, devPremiumToggle, onToggleDevPremium
}) {
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [pendingDownload, setPendingDownload] = useState(null);
  const [showCustomModal, setShowCustomModal] = useState(false);

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
      if (setActiveTab) setActiveTab(tabId);
      setMobileSheetOpen(true);
    }
  };

  const handleRecordClick = () => {
    setMobileSheetOpen(false); // Minimiza el menú de opciones para no tapar la grabación
    onRecord();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'draw':
        return (
          <div className="toolbar-sections">
            <div className="control-group">
              <h3>Trazado</h3>
              <div className="button-row">
                <button className={`btn icon-btn ${mode === 'draw-pencil' ? 'active' : ''}`} onClick={() => setMode('draw-pencil')} title="Lápiz Libre">
                  <PenTool size={18} />
                </button>
                <button className={`btn icon-btn ${mode === 'draw-line' ? 'active' : ''}`} onClick={() => setMode('draw-line')} title="Línea Recta">
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: 0 }}>Forma de Rotores</h3>
                <button 
                  type="button" 
                  className="btn" 
                  style={{ padding: '3px 8px', fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                  onClick={() => setShowCustomModal(true)}
                >
                  <PlusCircle size={13} /> Diseñar Forma
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '6px' }}>
                {[
                  { id: 'circle', label: 'Círculo', icon: '⚪' },
                  { id: 'triangle', label: 'Triángulo', icon: '🔺' },
                  { id: 'heart', label: 'Corazón', icon: '❤️' },
                  { id: 'square', label: 'Cuadrado', icon: '🟦' },
                  { id: 'star', label: 'Estrella', icon: '⭐' },
                  { id: 'pentagon', label: 'Pentágono', icon: '⬟' },
                  { id: 'hexagon', label: 'Hexágono', icon: '⬡' },
                  { id: 'custom', label: 'Mi Forma', icon: '✨', disabled: !customRotorShape },
                ].map(shape => (
                  <button
                    key={shape.id}
                    type="button"
                    disabled={shape.disabled}
                    className={`btn ${epicycleShape === shape.id ? 'primary' : ''}`}
                    style={{ padding: '6px 2px', fontSize: '0.68rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', opacity: shape.disabled ? 0.35 : 1 }}
                    onClick={() => {
                      if (shape.id === 'custom' && !customRotorShape) {
                        setShowCustomModal(true);
                      } else {
                        setEpicycleShape && setEpicycleShape(shape.id);
                      }
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>{shape.icon}</span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{shape.label}</span>
                  </button>
                ))}
              </div>
            </div>

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
              <h3>Calidad de Exportación</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                {[
                  { id: '480p', label: '480p SD', badge: 'Gratis', unlocked: true },
                  { id: '720p', label: '720p HD', badge: '🔓 Con Cuenta', unlocked: !!session || isPremium },
                  { id: '1080p', label: '1080p FHD', badge: '⭐ Premium', unlocked: isPremium },
                  { id: '2k', label: '2K QHD', badge: '⭐ Premium', unlocked: isPremium },
                  { id: '4k', label: '4K Ultra HD', badge: '⭐ Premium', unlocked: isPremium },
                ].map(item => {
                  const isSelected = exportQuality === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.unlocked) {
                          setExportQuality && setExportQuality(item.id);
                        } else if (!session) {
                          onLoginClick();
                        } else {
                          if (setActiveTab) setActiveTab('project');
                          alert("Esta resolución (" + item.label + ") requiere suscripción Premium. ¡Desbloquéala en la pestaña Proyecto!");
                        }
                      }}
                      className={`btn ${isSelected ? 'primary' : ''}`}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        fontSize: '0.8rem',
                        opacity: item.unlocked ? 1 : 0.65,
                        border: isSelected ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                        background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)'
                      }}
                    >
                      <span style={{ fontWeight: isSelected ? 'bold' : 'normal' }}>{item.label}</span>
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: item.unlocked ? (item.badge.includes('Premium') ? 'rgba(234, 179, 8, 0.2)' : 'rgba(16, 185, 129, 0.2)') : 'rgba(239, 68, 68, 0.2)',
                        color: item.unlocked ? (item.badge.includes('Premium') ? '#facc15' : '#34d399') : '#f87171'
                      }}>
                        {item.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="control-group">
              <h3>Grabación de Video</h3>
              <button className={`btn ${isRecording ? 'danger' : 'accent'} w-full`} onClick={handleRecordClick}>
                <Video size={18} />
                {isRecording ? 'Detener Grabación' : `Grabar en ${exportQuality.toUpperCase()}`}
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
                <User size={16} /> Iniciar Sesión / Registrarse
              </button>
            ) : (
              <Dashboard 
                isPremium={isPremium}
                session={session} 
                onLogout={onLogout} 
                currentPoints={currentPoints}
                onSaveProject={(pts) => onSavePoints(pts)}
                onLoadProject={onLoadProject}
                isDevUser={isDevUser}
                devPremiumToggle={devPremiumToggle}
                onToggleDevPremium={onToggleDevPremium}
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
      {/* DESKTOP FLOATING SIDEBAR */}
      <div className="desktop-toolbar glass-panel">
        <div className="toolbar-tabs-header">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => {
                  if (setActiveTab) setActiveTab(tab.id);
                }}
                title={tab.label}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        <div className="toolbar-body">
          {renderTabContent()}
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="mobile-bottom-nav glass-panel">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && mobileSheetOpen;
          return (
            <button
              key={tab.id}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleMobileTabClick(tab.id)}
            >
              <Icon size={20} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* MOBILE BOTTOM SHEET MODAL */}
      {mobileSheetOpen && (
        <div className="mobile-bottom-sheet glass-panel">
          <div className="sheet-handle" onClick={() => setMobileSheetOpen(false)}>
            <div className="handle-bar" />
          </div>
          <div className="sheet-header">
            <h3>{TABS.find(t => t.id === activeTab)?.label}</h3>
            <button className="sheet-close-btn" onClick={() => setMobileSheetOpen(false)}>✕</button>
          </div>
          <div className="sheet-content">
            {renderTabContent()}
          </div>
        </div>
      )}

      {/* CUSTOM ROTOR SHAPE DESIGNER MODAL */}
      {showCustomModal && (
        <CustomRotorModal
          onClose={() => setShowCustomModal(false)}
          currentCustomShape={customRotorShape}
          onSaveCustomShape={(relativePoints) => {
            if (setCustomRotorShape) setCustomRotorShape(relativePoints);
            if (setEpicycleShape) setEpicycleShape('custom');
          }}
        />
      )}

      {/* INTERSTITIAL AD MODAL */}
      {pendingDownload && (
        <AdInterstitialModal
          onSkip={executeDownload}
          title="Preparando tu descarga"
        />
      )}
    </>
  );
}
