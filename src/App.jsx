import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Toolbar from './components/Toolbar';
import CanvasStage from './components/CanvasStage';
import { dft, processFourierEpicycles } from './utils/fourier';
import { resamplePath, getBarycenter, renderMixedPoints } from './utils/math';
import { supabase } from './lib/supabase';
import AuthModal from './components/AuthModal';
import AdBanner from './components/AdBanner';
import TopQuickbar from './components/TopQuickbar';
import { isNative } from './services/platform';
import { showNativeBanner, hideNativeBanner } from './services/admob';
import { renderFourierVideoOffline } from './utils/videoRenderer';
import { downloadOrShareVideo } from './services/downloader';
import './App.css';

const createDefaultLayer = (id = 'layer-1', name = 'Trazo 1', color = '#38bdf8') => ({
  id,
  name,
  points: [],
  drawType: 'pencil', // 'pencil' | 'line' | 'curve'
  epicycleShape: 'circle',
  customRotorShape: null,
  strokeColor: '#f59e0b', // Color del trazo dibujado
  epicycleColor: '#3b82f6', // Color de los rotores y líneas de Fourier
  pathColor: color, // Color de la estela animada que dibuja Fourier
  epicycleThickness: 1,
  pathThickness: 3,
  numEpicycles: 0, // 0 = todos
  sortDesc: true, // Ordenar de mayor a menor radio
  splitCount: 0, // Cantidad de primeros epiciclos a partir
  splitSequence: '3,2,1', // Secuencia proporcional (3k, 2k, 1k...)
  visible: true,
  isClosed: false, // Si los puntos inicial y final están unidos
  origin: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
  manualOrigin: false
});

function App() {
  const [session, setSession] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isPremium, setIsPremium] = useState(false);
  const [devPremiumToggle, setDevPremiumToggle] = useState(true);
  
  const isDevUser = session?.user?.email === 'jstivelamatta@gmail.com';
  const effectivePremium = isPremium || (isDevUser && devPremiumToggle);

  const checkPremium = async (currentSession) => {
    if (!currentSession) {
      setIsPremium(false);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', currentSession.user.id)
      .single();
      
    if (data && data.is_premium) {
      setIsPremium(true);
    } else {
      setIsPremium(false);
    }
  };

  useEffect(() => {
    if (isNative()) {
      if (!effectivePremium) {
        showNativeBanner();
      } else {
        hideNativeBanner();
      }
    }
  }, [effectivePremium]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      checkPremium(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      checkPremium(session);
    });

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [mode, setMode] = useState('draw-pencil'); 
  const [bgImage, setBgImage] = useState(null);
  
  // SISTEMA MULTICAPA / TRAZAS CON HISTORIAL (UNDO/REDO)
  const [layersHistory, setLayersHistory] = useState([[createDefaultLayer('layer-1', 'Trazo 1', '#38bdf8')]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const layers = layersHistory[historyIndex] || [];
  const [activeLayerId, setActiveLayerId] = useState('layer-1');

  // Capa activa
  const activeLayer = layers.find(l => l.id === activeLayerId) || layers[0] || createDefaultLayer();

  // Estados globales de reproducción y personalización
  const [time, setTime] = useState(0);
  const [layerPaths, setLayerPaths] = useState({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [showEpicyclesPreview, setShowEpicyclesPreview] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [pointSize, setPointSize] = useState(3);
  const [pathScale, setPathScale] = useState(1);
  const [snapRadius, setSnapRadius] = useState(15);
  const [customRotorShape, setCustomRotorShape] = useState(null);
  const [exportQuality, setExportQuality] = useState('480p');
  const [activeTab, setActiveTab] = useState('draw');
  
  const animationSpeedRef = useRef(animationSpeed);
  useEffect(() => {
    animationSpeedRef.current = animationSpeed;
  }, [animationSpeed]);
  
  // Video Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState(null);
  const [recordingMp4Url, setRecordingMp4Url] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const stageRef = useRef(null);
  const canvasStageRef = useRef(null);

  // Layout sizing
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Cuadro de Grabación Delimitado
  const [showRecordingBox, setShowRecordingBox] = useState(false);
  const [recordingBox, setRecordingBox] = useState({ 
    x: window.innerWidth / 2 - 160, 
    y: window.innerHeight / 2 - 160, 
    width: 320, 
    height: 320 
  });

  // Estado de Renderizado de Video Offline a 60 FPS
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // GESTIÓN DE CAPAS / TRAZAS
  const commitLayers = useCallback((newLayers) => {
    const newHistory = layersHistory.slice(0, historyIndex + 1);
    newHistory.push(newLayers);
    setLayersHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [layersHistory, historyIndex]);

  const handleAddLayer = () => {
    const newId = `layer-${Date.now()}`;
    const colors = ['#38bdf8', '#ec4899', '#f59e0b', '#10b981', '#a855f7', '#ef4444'];
    const color = colors[layers.length % colors.length];
    const newLayer = createDefaultLayer(newId, `Trazo ${layers.length + 1}`, color);
    commitLayers([...layers, newLayer]);
    setActiveLayerId(newId);
  };

  const handleDeleteLayer = (layerId) => {
    if (layers.length <= 1) return;
    const nextLayers = layers.filter(l => l.id !== layerId);
    commitLayers(nextLayers);
    if (activeLayerId === layerId) {
      setActiveLayerId(nextLayers[0].id);
    }
  };

  const handleUpdateLayer = (layerId, patch) => {
    const nextLayers = layers.map(l => l.id === layerId ? { ...l, ...patch } : l);
    commitLayers(nextLayers);
  };

  const handleToggleClosePath = (layerId) => {
    const targetLayer = layers.find(l => l.id === layerId);
    if (targetLayer) {
      handleUpdateLayer(layerId, { isClosed: !targetLayer.isClosed });
    }
  };

  const commitLayerPoints = (newPts) => {
    const nextLayers = layers.map(l => {
      if (l.id === activeLayerId) {
        return { ...l, points: newPts };
      }
      return l;
    });
    commitLayers(nextLayers);
  };

  const setLayerOrigin = (newOrigin) => {
    const nextLayers = layers.map(l => {
      if (l.id === activeLayerId) {
        return { ...l, origin: newOrigin, manualOrigin: true };
      }
      return l;
    });
    commitLayers(nextLayers);
  };

  // Limpiar solo la estela / caminos trazados de la simulación
  const handleClearPaths = () => {
    setLayerPaths({});
    setTime(0);
  };

  // CÁLCULO EXACTO DE FOURIER, ORDENAMIENTO Y PARTICIÓN PROPORCIONAL
  const computedLayers = useMemo(() => {
    return layers.map(layer => {
      if (!layer.visible || !layer.points || layer.points.length < 2) {
        return {
          ...layer,
          renderPoints: layer.points || [],
          fourier: [],
          effectiveFourier: [],
          path: layerPaths[layer.id] || []
        };
      }

      // Renderizar trazo con soporte mixto de líneas rectas y curvas suaves + cierre de loop
      const renderPoints = renderMixedPoints(layer.points, 16, layer.isClosed);

      const resampled = resamplePath(renderPoints, 2 * pathScale);
      const layerOrigin = layer.manualOrigin 
        ? layer.origin 
        : getBarycenter(renderPoints);

      // Convertir puntos a números complejos relativos al origen para la DFT
      const complexSignal = resampled.map(p => ({
        re: p.x - layerOrigin.x,
        im: p.y - layerOrigin.y
      }));

      const rawFourier = complexSignal.length > 1 ? dft(complexSignal) : [];

      // Aplicar partición proporcional y reordenar todos los radios resultantes de mayor a menor
      const fourier = processFourierEpicycles(rawFourier, {
        sortDesc: layer.sortDesc !== false,
        splitCount: layer.splitCount || 0,
        splitSequence: layer.splitSequence || '3,2,1'
      });

      // Si el usuario especificó cantidad de epiciclos/armónicos
      const effectiveFourier = (layer.numEpicycles > 0 && layer.numEpicycles < fourier.length)
        ? fourier.slice(0, layer.numEpicycles)
        : fourier;

      return {
        ...layer,
        renderPoints,
        origin: layerOrigin,
        fourier,
        effectiveFourier,
        path: layerPaths[layer.id] || []
      };
    });
  }, [layers, pathScale, layerPaths]);

  // Bucle de Animación Simultánea Multicapa
  useEffect(() => {
    let animId;
    const hasAnyFourier = computedLayers.some(l => l.effectiveFourier?.length > 0);

    if (isAnimating && hasAnyFourier) {
      const update = () => {
        setTime((prevTime) => {
          const maxTerms = Math.max(...computedLayers.map(l => l.effectiveFourier?.length || 1), 1);
          const dt = (2 * Math.PI) / maxTerms;
          const nextTime = prevTime + dt * animationSpeedRef.current;

          setLayerPaths((prevPaths) => {
            const nextPaths = { ...prevPaths };
            computedLayers.forEach(layer => {
              const fList = layer.effectiveFourier;
              if (fList && fList.length > 0 && layer.visible !== false) {
                let x = layer.origin.x;
                let y = layer.origin.y;
                for (let i = 0; i < fList.length; i++) {
                  x += fList[i].amp * Math.cos(fList[i].freq * prevTime + fList[i].phase);
                  y += fList[i].amp * Math.sin(fList[i].freq * prevTime + fList[i].phase);
                }
                const cur = nextPaths[layer.id] || [];
                nextPaths[layer.id] = [...cur, { x, y }];
              }
            });
            return nextPaths;
          });

          return nextTime;
        });
        animId = requestAnimationFrame(update);
      };
      animId = requestAnimationFrame(update);
    }
    return () => cancelAnimationFrame(animId);
  }, [isAnimating, computedLayers]);

  const handleToggleAnimation = () => {
    if (!isAnimating) {
      setLayerPaths({});
      setTime(0);
    }
    setIsAnimating(!isAnimating);
  };

  const handleClear = () => {
    setLayersHistory([[createDefaultLayer('layer-1', 'Trazo 1', '#38bdf8')]]);
    setHistoryIndex(0);
    setActiveLayerId('layer-1');
    setLayerPaths({});
    setTime(0);
    setIsAnimating(false);
    setShowEpicyclesPreview(false);
    setBgImage(null);
  };

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setLayerPaths({});
      setTime(0);
      setIsAnimating(false);
    }
  }, [historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < layersHistory.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setLayerPaths({});
      setTime(0);
      setIsAnimating(false);
    }
  }, [historyIndex, layersHistory.length]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Renderizado Offline de Video a 60 FPS con todas las capas
  const handleStartRenderVideo = async () => {
    if (isRenderingVideo) {
      setIsRenderingVideo(false);
      return;
    }

    const hasFourier = computedLayers.some(l => l.effectiveFourier?.length > 0);
    if (!hasFourier) {
      alert("Dibuja al menos una figura para generar los epiciclos.");
      return;
    }

    setIsRenderingVideo(true);
    setRenderProgress(0);

    try {
      const { blob, url, extension } = await renderFourierVideoOffline({
        layers: computedLayers,
        exportQuality,
        recordingBox: showRecordingBox ? recordingBox : null,
        onProgress: (p) => setRenderProgress(p)
      });

      setIsRenderingVideo(false);
      setRecordingUrl(url);
      
      downloadOrShareVideo(url, extension || 'mp4');
    } catch (err) {
      console.error(err);
      alert("Error al renderizar el video: " + (err.message || err));
      setIsRenderingVideo(false);
    }
  };

  // Grabación en Tiempo Real
  const handleRecordToggle = () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      if (!stageRef.current) return;
      
      const canvas = stageRef.current.toCanvas();
      const stream = canvas.captureStream(30);
      
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8000000 });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blobWebM = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordingUrl(URL.createObjectURL(blobWebM));
        const blobMP4 = new Blob(chunksRef.current, { type: 'video/mp4' });
        setRecordingMp4Url(URL.createObjectURL(blobMP4));
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      
      if (layers.some(l => l.points.length > 0)) {
        setLayerPaths({});
        setTime(0);
        setIsAnimating(true);
      }
    }
  };

  const handleSavePoints = () => {
    const projectData = {
      version: 2,
      layers: layers
    };
    const jsonStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `epiciclos_proyecto_${Date.now()}.json`;
    a.click();
  };

  const handleLoadPoints = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const loaded = JSON.parse(e.target.result);
          if (loaded && loaded.layers && Array.isArray(loaded.layers)) {
            commitLayers(loaded.layers);
            setActiveLayerId(loaded.layers[0]?.id || 'layer-1');
          } else if (Array.isArray(loaded)) {
            const newLayer = createDefaultLayer('layer-1', 'Trazo 1', '#38bdf8');
            newLayer.points = loaded;
            commitLayers([newLayer]);
            setActiveLayerId('layer-1');
          }
        } catch (err) {
          alert("Error al leer el archivo JSON.");
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div 
      className="app-container" 
      style={{ 
        position: 'relative', 
        paddingTop: isNative() && !effectivePremium ? '56px' : '0',
        height: '100dvh',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {/* TIRA DE ACCESOS RÁPIDOS SUPERIOR HORIZONTAL */}
      <TopQuickbar
        mode={mode}
        setMode={setMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        layers={layers}
        activeLayerId={activeLayerId}
        setActiveLayerId={setActiveLayerId}
        onAddLayer={handleAddLayer}
        onUpdateLayer={handleUpdateLayer}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < layersHistory.length - 1}
        onClear={handleClear}
        onZoomIn={() => canvasStageRef.current?.zoomIn()}
        onZoomOut={() => canvasStageRef.current?.zoomOut()}
        onResetView={() => canvasStageRef.current?.resetView()}
        isAnimating={isAnimating}
        onToggleAnimation={handleToggleAnimation}
        showRecordingBox={showRecordingBox}
        setShowRecordingBox={setShowRecordingBox}
        isRenderingVideo={isRenderingVideo}
        onStartRenderVideo={handleStartRenderVideo}
        showEpicyclesPreview={showEpicyclesPreview}
        onToggleEpicyclesPreview={() => setShowEpicyclesPreview(prev => !prev)}
        onToggleClosePath={handleToggleClosePath}
        onClearPaths={handleClearPaths}
        topOffset={isNative() && !effectivePremium ? 64 : 8}
      />

      <div className="canvas-area">
        {!effectivePremium && !isNative() && (
          <div style={{ position: 'absolute', top: '48px', left: '50%', transform: 'translateX(-50%)', zIndex: 5, width: '100%', maxWidth: '728px', padding: '0 12px' }}>
            <AdBanner type="top" />
          </div>
        )}
        <CanvasStage
          ref={canvasStageRef}
          width={windowSize.width}
          height={windowSize.height}
          mode={mode}
          activeTab={activeTab}
          bgImage={bgImage}
          layers={computedLayers}
          activeLayerId={activeLayerId}
          commitLayerPoints={commitLayerPoints}
          setLayerOrigin={setLayerOrigin}
          time={time}
          stageRef={stageRef}
          isRecording={isRecording}
          isAnimating={isAnimating}
          showEpicyclesPreview={showEpicyclesPreview}
          pointSize={pointSize}
          snapRadius={snapRadius}
          recordingBox={recordingBox}
          setRecordingBox={setRecordingBox}
          showRecordingBox={showRecordingBox}
        />
        
        {!isRecording && (
          <div className="status-bar">
            {activeTab !== 'draw' && 'Desplazamiento — Arrastra con el dedo para mover el lienzo'}
            {activeTab === 'draw' && mode === 'draw-pencil' && `Lápiz — Dibujando en ${activeLayer.name}`}
            {activeTab === 'draw' && mode === 'draw-line' && `Línea Recta — Clic para añadir puntos en ${activeLayer.name}`}
            {activeTab === 'draw' && mode === 'draw-curve' && `Curva Spline — Clic para añadir puntos curvos en ${activeLayer.name}`}
            {activeTab === 'draw' && mode === 'edit' && `Edición — Arrastra los puntos de ${activeLayer.name}`}
            {activeTab === 'draw' && mode === 'moveOrigin' && `Centro — Arrastra el punto de origen de ${activeLayer.name}`}
            {activeTab === 'draw' && mode === 'pan' && 'Arrastra para mover • Scroll/Pinch para zoom'}
          </div>
        )}
      </div>

      {/* TARJETA DE PROGRESO DE RENDERIZADO EN SEGUNDO PLANO */}
      {isRenderingVideo && (
        <div className="render-progress-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#38bdf8' }}>
              🎬 Renderizando 60 FPS ({exportQuality.toUpperCase()})
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#f1f5f9' }}>
              {renderProgress}%
            </span>
          </div>
          <div className="render-progress-bar-bg">
            <div className="render-progress-bar-fill" style={{ width: `${renderProgress}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <small style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              Generando animación fluida en segundo plano...
            </small>
            <button 
              className="btn danger" 
              style={{ padding: '3px 8px', fontSize: '0.7rem' }}
              onClick={() => setIsRenderingVideo(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <Toolbar 
        isPremium={effectivePremium}
        session={session}
        isDevUser={isDevUser}
        devPremiumToggle={devPremiumToggle}
        onToggleDevPremium={() => setDevPremiumToggle(prev => !prev)}
        onLoginClick={() => setShowAuth(true)}
        onLogout={() => supabase.auth.signOut()}
        layers={computedLayers}
        activeLayerId={activeLayerId}
        setActiveLayerId={setActiveLayerId}
        onAddLayer={handleAddLayer}
        onDeleteLayer={handleDeleteLayer}
        onUpdateLayer={handleUpdateLayer}
        onLoadProject={(loadedLayers) => { 
          setLayerPaths({}); 
          setIsAnimating(false);
          if (Array.isArray(loadedLayers)) {
            commitLayers(loadedLayers);
          }
        }}
        mode={mode}
        setMode={setMode}
        onImageUpload={setBgImage}
        onClear={handleClear}
        onToggleAnimation={handleToggleAnimation}
        isAnimating={isAnimating}
        animationSpeed={animationSpeed}
        setAnimationSpeed={setAnimationSpeed}
        pathScale={pathScale}
        setPathScale={setPathScale}
        snapRadius={snapRadius}
        setSnapRadius={setSnapRadius}
        pointSize={pointSize}
        setPointSize={setPointSize}
        customRotorShape={customRotorShape}
        setCustomRotorShape={setCustomRotorShape}
        exportQuality={exportQuality}
        setExportQuality={setExportQuality}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRecord={handleRecordToggle}
        isRecording={isRecording}
        recordingUrl={recordingUrl}
        recordingMp4Url={recordingMp4Url}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < layersHistory.length - 1}
        onSavePoints={handleSavePoints}
        onLoadPoints={handleLoadPoints}
        onStartRenderVideo={handleStartRenderVideo}
        isRenderingVideo={isRenderingVideo}
        showRecordingBox={showRecordingBox}
        setShowRecordingBox={setShowRecordingBox}
        showEpicyclesPreview={showEpicyclesPreview}
        onToggleEpicyclesPreview={() => setShowEpicyclesPreview(prev => !prev)}
        onToggleClosePath={handleToggleClosePath}
        onClearPaths={handleClearPaths}
      />
      
      {showAuth && (
        <AuthModal 
          onClose={() => setShowAuth(false)} 
          onAuthSuccess={() => setShowAuth(false)} 
        />
      )}

      {isOffline && (
        <div className="modal-overlay">
          <div className="auth-modal glass-panel" style={{ textAlign: 'center' }}>
            <h2 className="danger-text">Sin Conexión</h2>
            <p>Se requiere una conexión a internet para continuar utilizando las funciones de Epiciclos.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
