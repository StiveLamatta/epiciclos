import React, { useState } from 'react';
import { 
  Upload, Play, Square, Trash2, Video, PenTool, Move, Download, 
  Undo2, Redo2, Save, MousePointer2, Minus, Palette, Pencil, 
  Spline, Crosshair, FolderOpen, User, Sparkles, Brush, Layers,
  Heart, Shapes, PlusCircle, Crop, Eye, EyeOff, Plus, Magnet, CircleDot,
  Sliders, ArrowDownNarrowWide, Split, Eraser
} from 'lucide-react';
import Dashboard from './Dashboard';
import AdInterstitialModal from './AdInterstitialModal';
import CustomRotorModal from './CustomRotorModal';
import { downloadOrShareVideo } from '../services/downloader';

const TABS = [
  { id: 'draw',      label: 'Dibujo',     icon: Pencil },
  { id: 'layers',    label: 'Trazas',     icon: Layers },
  { id: 'style',     label: 'Apariencia', icon: Brush },
  { id: 'animate',   label: 'Animación',  icon: Sparkles },
  { id: 'project',   label: 'Proyecto',   icon: FolderOpen },
];

const SPLIT_PRESETS = [
  { id: '3,2,1', label: '3k, 2k, 1k (Mayor a menor - Por defecto)' },
  { id: '1,2,3', label: '1k, 2k, 3k (Menor a mayor)' },
  { id: '1,1,1', label: '1k, 1k, 1k (Uniforme / 3 partes)' },
  { id: '4,2,1', label: '4k, 2k, 1k (Binario)' },
  { id: 'custom', label: 'Personalizado...' }
];

export default function Toolbar({
  isPremium, session, onLoginClick, onLogout,
  layers = [], activeLayerId, setActiveLayerId,
  onAddLayer, onDeleteLayer, onUpdateLayer,
  mode, setMode, onImageUpload, onClear, onToggleAnimation, isAnimating,
  animationSpeed, setAnimationSpeed,
  pathScale, setPathScale, pointSize, setPointSize,
  snapRadius, setSnapRadius,
  customRotorShape, setCustomRotorShape,
  exportQuality = '480p', setExportQuality,
  onRecord, isRecording, recordingUrl, recordingMp4Url, onUndo, onRedo, canUndo, canRedo,
  onSavePoints, onLoadPoints, onLoadProject,
  activeTab = 'draw', setActiveTab,
  isDevUser, devPremiumToggle, onToggleDevPremium,
  onStartRenderVideo, isRenderingVideo, showRecordingBox, setShowRecordingBox,
  showEpicyclesPreview, onToggleEpicyclesPreview, onToggleClosePath,
  onClearPaths
}) {
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [pendingDownload, setPendingDownload] = useState(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [isCustomPreset, setIsCustomPreset] = useState(false);

  // Capa activa
  const activeLayer = layers.find(l => l.id === activeLayerId) || layers[0] || {};
  const activeFourierLength = activeLayer.fourier?.length || 0;

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
    setMobileSheetOpen(false);
    onRecord();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'draw':
        return (
          <div className="toolbar-sections">
            <div className="control-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: 0 }}>Modo de Trazo ({activeLayer.name || 'Trazo 1'})</h3>
                <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 'bold' }}>
                  {activeLayer.points?.length || 0} puntos
                </span>
              </div>
              
              <div className="button-row">
                <button 
                  className={`btn icon-btn ${mode === 'draw-pencil' ? 'active' : ''}`} 
                  onClick={() => setMode('draw-pencil')} 
                  title="Lápiz Libre"
                >
                  <PenTool size={16} /> Lápiz
                </button>
                <button 
                  className={`btn icon-btn ${mode === 'draw-line' ? 'active' : ''}`} 
                  onClick={() => setMode('draw-line')} 
                  title="Línea Recta"
                >
                  <Minus size={16} /> Línea
                </button>
                <button 
                  className={`btn icon-btn ${mode === 'draw-curve' ? 'active' : ''}`} 
                  onClick={() => setMode('draw-curve')} 
                  title="Curva Suave (Spline)"
                >
                  <Spline size={16} /> Curva
                </button>
              </div>

              {/* Botón para Unir Punto Inicial con Final */}
              <div style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  className={`btn ${activeLayer.isClosed ? 'active' : ''} w-full`}
                  style={{ padding: '8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={() => onToggleClosePath && onToggleClosePath(activeLayer.id)}
                >
                  <CircleDot size={15} />
                  {activeLayer.isClosed ? 'Figura Cerrada (Puntos Unidos)' : 'Unir Punto Inicial y Final'}
                </button>
              </div>
            </div>

            {/* Control de Radio de Unión / Imán */}
            <div className="control-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                  <Magnet size={14} color="#38bdf8" /> Radio de Unión / Imán
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 'bold' }}>
                  {snapRadius > 0 ? `${snapRadius}px` : 'Off'}
                </span>
              </div>
              <input 
                type="range" min="0" max="40" step="2" 
                value={snapRadius} 
                onChange={(e) => setSnapRadius(parseInt(e.target.value))} 
              />
              <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Al tocar cerca del punto azul (inicio) o de otro punto, se unirá magnéticamente.
              </p>
            </div>

            {/* Vista Previa de Epiciclos */}
            <div className="control-group">
              <button
                type="button"
                className={`btn ${showEpicyclesPreview ? 'active' : ''} w-full`}
                style={{ padding: '8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={onToggleEpicyclesPreview}
              >
                {showEpicyclesPreview ? <Eye size={15} /> : <EyeOff size={15} />}
                {showEpicyclesPreview ? 'Ocultar Vista Previa de Epiciclos' : 'Mostrar Vista Previa de Epiciclos'}
              </button>
            </div>

            <div className="control-group">
              <h3>Herramientas</h3>
              <div className="button-row">
                <button className={`btn icon-btn ${mode === 'edit' ? 'active' : ''}`} onClick={() => setMode('edit')} title="Editar Puntos">
                  <MousePointer2 size={16} /> Editar
                </button>
                <button className={`btn icon-btn ${mode === 'pan' ? 'active' : ''}`} onClick={() => setMode('pan')} title="Mover Lienzo">
                  <Move size={16} /> Mover
                </button>
                <button className={`btn icon-btn ${mode === 'moveOrigin' ? 'active' : ''}`} onClick={() => setMode('moveOrigin')} title="Mover Centro">
                  <Crosshair size={16} /> Centro
                </button>
              </div>
              <div className="button-row" style={{ marginTop: '8px' }}>
                <button className="btn icon-btn" onClick={onUndo} disabled={!canUndo} title="Deshacer (Ctrl+Z)">
                  <Undo2 size={16} /> Deshacer
                </button>
                <button className="btn icon-btn" onClick={onRedo} disabled={!canRedo} title="Rehacer (Ctrl+Y)">
                  <Redo2 size={16} /> Rehacer
                </button>
                <button className="btn icon-btn danger" onClick={onClear} title="Borrar Todo">
                  <Trash2 size={16} /> Borrar
                </button>
              </div>
            </div>
          </div>
        );

      case 'layers':
        return (
          <div className="toolbar-sections">
            <div className="control-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: 0 }}>Trazas / Capas ({layers.length})</h3>
                <button 
                  type="button" 
                  className="btn primary" 
                  style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={onAddLayer}
                >
                  <Plus size={14} /> Nueva Traza
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                {layers.map((layer, idx) => {
                  const isActive = layer.id === activeLayer.id;
                  return (
                    <div 
                      key={layer.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: isActive ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${isActive ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)'}`,
                        cursor: 'pointer'
                      }}
                      onClick={() => setActiveLayerId(layer.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <div 
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: layer.strokeColor || '#f59e0b'
                          }} 
                        />
                        <span style={{ fontSize: '0.82rem', fontWeight: isActive ? 'bold' : 'normal', color: isActive ? '#38bdf8' : '#f1f5f9' }}>
                          {layer.name || `Trazo ${idx + 1}`}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                          {layer.points?.length || 0} pts
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          className="btn icon-btn"
                          style={{ padding: '3px', width: '26px', height: '26px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateLayer(layer.id, { visible: !layer.visible });
                          }}
                          title={layer.visible ? 'Ocultar' : 'Mostrar'}
                        >
                          {layer.visible ? <Eye size={13} /> : <EyeOff size={13} color="#64748b" />}
                        </button>
                        {layers.length > 1 && (
                          <button
                            type="button"
                            className="btn icon-btn danger"
                            style={{ padding: '3px', width: '26px', height: '26px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteLayer(layer.id);
                            }}
                            title="Eliminar Traza"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Configuración de Estructura de Fourier de la Capa */}
            <div className="control-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Epiciclos de {activeLayer.name}</h3>
                <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 'bold' }}>
                  {activeLayer.numEpicycles > 0 && activeLayer.numEpicycles < activeFourierLength 
                    ? `${activeLayer.numEpicycles} / ${activeFourierLength}` 
                    : `Todos (${activeFourierLength})`}
                </span>
              </div>
              <input 
                type="range" 
                min="1" 
                max={Math.max(1, activeFourierLength)} 
                value={activeLayer.numEpicycles > 0 ? activeLayer.numEpicycles : activeFourierLength}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  onUpdateLayer(activeLayer.id, { numEpicycles: val >= activeFourierLength ? 0 : val });
                }}
                disabled={activeFourierLength === 0}
              />

              {/* Botón Luminoso Verde para Ordenar Radios */}
              <button
                type="button"
                className="btn w-full"
                style={{
                  marginTop: '8px',
                  padding: '9px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: activeLayer.sortDesc !== false ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                  border: `1px solid ${activeLayer.sortDesc !== false ? '#10b981' : 'rgba(255, 255, 255, 0.12)'}`,
                  color: activeLayer.sortDesc !== false ? '#34d399' : '#cbd5e1',
                  boxShadow: activeLayer.sortDesc !== false ? '0 0 14px rgba(16, 185, 129, 0.45)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => onUpdateLayer(activeLayer.id, { sortDesc: activeLayer.sortDesc === false ? true : false })}
              >
                <ArrowDownNarrowWide size={16} />
                {activeLayer.sortDesc !== false ? '✓ Radios Ordenados: Mayor a Menor' : 'Ordenar Radios de Mayor a Menor'}
              </button>
            </div>
          </div>
        );

      case 'style':
        return (
          <div className="toolbar-sections">
            <div className="control-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: 0 }}>Forma de Rotores ({activeLayer.name})</h3>
                <button 
                  type="button" 
                  className="btn" 
                  style={{ padding: '3px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => setShowCustomModal(true)}
                >
                  <PlusCircle size={13} /> Personalizada
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {[
                  { id: 'circle', label: 'Círculo', icon: '⭕' },
                  { id: 'triangle', label: 'Triángulo', icon: '🔺' },
                  { id: 'square', label: 'Cuadrado', icon: '⬛' },
                  { id: 'heart', label: 'Corazón', icon: '💖' },
                  { id: 'pentagon', label: 'Pentágono', icon: '⬟' },
                  { id: 'hexagon', label: 'Hexágono', icon: '⬡' },
                  { id: 'star', label: 'Estrella', icon: '⭐' },
                  { id: 'custom', label: 'Libre', icon: '✏️' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={`btn ${activeLayer.epicycleShape === item.id ? 'active' : ''}`}
                    style={{
                      padding: '8px 4px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.7rem'
                    }}
                    onClick={() => {
                      if (item.id === 'custom' && !customRotorShape) {
                        setShowCustomModal(true);
                      } else {
                        onUpdateLayer(activeLayer.id, { epicycleShape: item.id });
                      }
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3 COLORES INDEPENDIENTES */}
            <div className="control-group">
              <h3>Colores Personalizados ({activeLayer.name})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#f1f5f9' }}>✏️ Trazo Dibujado:</span>
                  <input 
                    type="color" 
                    value={activeLayer.strokeColor || '#f59e0b'} 
                    onChange={(e) => onUpdateLayer(activeLayer.id, { strokeColor: e.target.value })} 
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#f1f5f9' }}>⭕ Epiciclos / Círculos:</span>
                  <input 
                    type="color" 
                    value={activeLayer.epicycleColor || '#3b82f6'} 
                    onChange={(e) => onUpdateLayer(activeLayer.id, { epicycleColor: e.target.value })} 
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#f1f5f9' }}>✨ Estela Animada:</span>
                  <input 
                    type="color" 
                    value={activeLayer.pathColor || '#38bdf8'} 
                    onChange={(e) => onUpdateLayer(activeLayer.id, { pathColor: e.target.value })} 
                  />
                </div>
              </div>
            </div>

            <div className="control-group">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3>Grosor de Epiciclos</h3>
                <span style={{ fontSize: '0.78rem', color: '#38bdf8' }}>{activeLayer.epicycleThickness || 1}px</span>
              </div>
              <input 
                type="range" min="0.5" max="5" step="0.5" 
                value={activeLayer.epicycleThickness || 1} 
                onChange={(e) => onUpdateLayer(activeLayer.id, { epicycleThickness: parseFloat(e.target.value) })} 
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                <h3>Grosor del Trazo</h3>
                <span style={{ fontSize: '0.78rem', color: '#38bdf8' }}>{activeLayer.pathThickness || 3}px</span>
              </div>
              <input 
                type="range" min="1" max="10" step="0.5" 
                value={activeLayer.pathThickness || 3} 
                onChange={(e) => onUpdateLayer(activeLayer.id, { pathThickness: parseFloat(e.target.value) })} 
              />
            </div>
          </div>
        );

      case 'animate':
        return (
          <div className="toolbar-sections">
            <div className="control-group">
              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  className={`btn ${isAnimating ? 'danger' : 'primary'}`} 
                  style={{ flex: 1, padding: '12px', fontSize: '0.88rem', fontWeight: 'bold' }}
                  onClick={onToggleAnimation}
                >
                  {isAnimating ? <Square size={16} /> : <Play size={16} />}
                  {isAnimating ? 'Pausar' : 'Iniciar'}
                </button>

                {/* Botón de Borrar Camino Trazado */}
                <button
                  type="button"
                  className="btn"
                  style={{ padding: '12px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                  onClick={onClearPaths}
                  title="Borrar Estela / Camino Trazado"
                >
                  <Eraser size={16} /> Limpiar Estela
                </button>
              </div>
            </div>

            <div className="control-group">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3>Velocidad de Animación</h3>
                <span style={{ fontSize: '0.78rem', color: '#38bdf8' }}>{animationSpeed}x</span>
              </div>
              <input 
                type="range" min="0.1" max="5" step="0.1" 
                value={animationSpeed} 
                onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))} 
              />
            </div>

            {/* Configuración de Estructura de Epiciclos */}
            <div className="control-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Cantidad de Epiciclos ({activeLayer.name})</h3>
                <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 'bold' }}>
                  {activeLayer.numEpicycles > 0 && activeLayer.numEpicycles < activeFourierLength 
                    ? `${activeLayer.numEpicycles} / ${activeFourierLength}` 
                    : `Todos (${activeFourierLength})`}
                </span>
              </div>
              <input 
                type="range" 
                min="1" 
                max={Math.max(1, activeFourierLength)} 
                value={activeLayer.numEpicycles > 0 ? activeLayer.numEpicycles : activeFourierLength}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  onUpdateLayer(activeLayer.id, { numEpicycles: val >= activeFourierLength ? 0 : val });
                }}
                disabled={activeFourierLength === 0}
              />

              {/* Botón Luminoso Verde para Ordenar Radios */}
              <button
                type="button"
                className="btn w-full"
                style={{
                  marginTop: '8px',
                  padding: '9px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: activeLayer.sortDesc !== false ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                  border: `1px solid ${activeLayer.sortDesc !== false ? '#10b981' : 'rgba(255, 255, 255, 0.12)'}`,
                  color: activeLayer.sortDesc !== false ? '#34d399' : '#cbd5e1',
                  boxShadow: activeLayer.sortDesc !== false ? '0 0 14px rgba(16, 185, 129, 0.45)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => onUpdateLayer(activeLayer.id, { sortDesc: activeLayer.sortDesc === false ? true : false })}
              >
                <ArrowDownNarrowWide size={16} />
                {activeLayer.sortDesc !== false ? '✓ Radios Ordenados: Mayor a Menor' : 'Ordenar Radios de Mayor a Menor'}
              </button>
            </div>

            {/* PARTICIÓN PROPORCIONAL DE LOS N PRIMEROS EPICICLOS */}
            <div className="control-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                  <Split size={14} color="#38bdf8" /> Partir N Primeros Epiciclos
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 'bold' }}>
                  {activeLayer.splitCount > 0 ? `${activeLayer.splitCount} epiciclos` : 'Desactivado'}
                </span>
              </div>
              <input 
                type="range" 
                min="0" 
                max={Math.max(1, activeFourierLength)} 
                step="1" 
                value={activeLayer.splitCount || 0}
                onChange={(e) => onUpdateLayer(activeLayer.id, { splitCount: parseInt(e.target.value) })}
              />
              <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '2px 0 6px 0' }}>
                Divide los radios grandes en sub-círculos proporcionales articulados.
              </p>

              {activeLayer.splitCount > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                  <label style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>Secuencia Proporcional de Radios:</label>
                  <select
                    value={SPLIT_PRESETS.some(p => p.id === activeLayer.splitSequence) ? activeLayer.splitSequence : 'custom'}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setIsCustomPreset(true);
                      } else {
                        setIsCustomPreset(false);
                        onUpdateLayer(activeLayer.id, { splitSequence: e.target.value });
                      }
                    }}
                  >
                    {SPLIT_PRESETS.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>

                  {(isCustomPreset || !SPLIT_PRESETS.some(p => p.id === activeLayer.splitSequence)) && (
                    <input
                      type="text"
                      placeholder="Ej: 3, 2, 1 o 5, 3, 2, 1"
                      value={activeLayer.splitSequence || '3,2,1'}
                      onChange={(e) => onUpdateLayer(activeLayer.id, { splitSequence: e.target.value })}
                      style={{ marginTop: '2px' }}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="control-group">
              <h3>Calidad de Exportación</h3>
              <div className="quality-grid">
                {[
                  { id: '480p', label: '480P', badge: 'Gratis', unlocked: true },
                  { id: '720p', label: '720P HD', badge: 'Con Cuenta', unlocked: !!session || isPremium },
                  { id: '1080p', label: '1080P FHD', badge: 'Premium', unlocked: isPremium },
                  { id: '2k', label: '2K QHD', badge: 'Premium', unlocked: isPremium },
                  { id: '4k', label: '4K UHD', badge: 'Premium', unlocked: isPremium },
                ].map((item) => {
                  const isSelected = exportQuality === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={!item.unlocked}
                      className={`quality-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => setExportQuality(item.id)}
                    >
                      <span style={{ fontWeight: isSelected ? 'bold' : 'normal' }}>{item.label}</span>
                      <span style={{
                        fontSize: '0.68rem',
                        padding: '2px 5px',
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
              <h3>Renderizado 60 FPS (Sin Lag)</h3>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0 0 8px 0', lineHeight: '1.35' }}>
                Genera un video a <b>60 FPS exactos y fluidos</b> en segundo plano con todas las trazas.
              </p>
              
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <button 
                  type="button" 
                  className={`btn ${showRecordingBox ? 'active' : ''}`}
                  style={{ flex: 1, padding: '7px', fontSize: '0.74rem' }}
                  onClick={() => setShowRecordingBox && setShowRecordingBox(prev => !prev)}
                >
                  <Crop size={14} /> {showRecordingBox ? 'Ocultar Marco' : 'Ajustar Marco'}
                </button>
              </div>

              <button 
                type="button"
                className={`btn ${isRenderingVideo ? 'danger' : 'accent'} w-full`}
                style={{ fontWeight: 'bold', padding: '10px' }}
                onClick={() => {
                  setMobileSheetOpen(false);
                  if (onStartRenderVideo) onStartRenderVideo();
                }}
              >
                <Sparkles size={15} />
                {isRenderingVideo ? 'Cancelar Renderizado' : `Renderizar Video 60 FPS (${exportQuality.toUpperCase()})`}
              </button>
            </div>

            <div className="control-group">
              <h3>Grabación en Tiempo Real</h3>
              <button className={`btn ${isRecording ? 'danger' : ''} w-full`} onClick={handleRecordClick}>
                <Video size={16} />
                {isRecording ? 'Detener Grabación' : `Grabar Pantalla`}
              </button>
              
              {(recordingUrl || recordingMp4Url) && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  {recordingMp4Url && (
                    <button onClick={() => handleDownloadClick(recordingMp4Url, 'mp4')} className="btn primary" style={{ flex: 1, padding: '7px', fontSize: '0.76rem' }}>
                      <Download size={13} /> .MP4
                    </button>
                  )}
                  {recordingUrl && (
                    <button onClick={() => handleDownloadClick(recordingUrl, 'webm')} className="btn" style={{ flex: 1, padding: '7px', fontSize: '0.76rem' }}>
                      <Download size={13} /> .WebM
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
                currentPoints={activeLayer.points || []} 
                onLoadProject={onLoadProject}
                isDevUser={isDevUser}
                devPremiumToggle={devPremiumToggle}
                onToggleDevPremium={onToggleDevPremium}
              />
            )}

            <div className="control-group" style={{ marginTop: '12px' }}>
              <h3>Archivos Locales</h3>
              <div className="button-row">
                <button className="btn icon-btn" onClick={onSavePoints} title="Guardar Proyecto (JSON)">
                  <Save size={16} /> Guardar
                </button>
                <label className="btn icon-btn" title="Cargar Proyecto (JSON)" style={{ cursor: 'pointer' }}>
                  <FolderOpen size={16} /> Cargar
                  <input type="file" accept=".json" onChange={onLoadPoints} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            <div className="control-group">
              <h3>Imagen de Fondo</h3>
              <label className="btn file-upload-label w-full">
                <Upload size={16} /> Subir Imagen Guía
                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* SIDEBAR PARA ESCRITORIO */}
      <div className="desktop-toolbar glass-panel">
        <div className="tab-headers">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        <div className="tab-body">
          {renderTabContent()}
        </div>
      </div>

      {/* NAVEGACIÓN INFERIOR PARA MÓVIL */}
      <nav className="mobile-bottom-nav">
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

      {/* BOTTOM SHEET DESLIZABLE PARA MÓVIL */}
      {mobileSheetOpen && (
        <div className="mobile-bottom-sheet glass-panel">
          <div className="sheet-handle" onClick={() => setMobileSheetOpen(false)}>
            <div className="handle-bar" />
          </div>
          <div className="sheet-content">
            {renderTabContent()}
          </div>
        </div>
      )}

      {/* Modal de Anuncio Intersticial */}
      {pendingDownload && (
        <AdInterstitialModal
          onClose={() => setPendingDownload(null)}
          onAdWatched={executeDownload}
        />
      )}

      {/* Modal de Diseñador de Formas Libres */}
      {showCustomModal && (
        <CustomRotorModal
          initialPoints={customRotorShape}
          onSave={(pts) => {
            setCustomRotorShape(pts);
            onUpdateLayer(activeLayer.id, { 
              epicycleShape: 'custom',
              customRotorShape: pts 
            });
            setShowCustomModal(false);
          }}
          onClose={() => setShowCustomModal(false)}
        />
      )}
    </>
  );
}
