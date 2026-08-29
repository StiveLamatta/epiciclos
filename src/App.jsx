import React, { useState, useEffect, useRef, useCallback } from 'react';
import Toolbar from './components/Toolbar';
import CanvasStage from './components/CanvasStage';
import { dft } from './utils/fourier';
import { resamplePath, getBarycenter, generateSpline } from './utils/math';
import { supabase } from './lib/supabase';
import AuthModal from './components/AuthModal';
import AdBanner from './components/AdBanner';
import TopQuickbar from './components/TopQuickbar';
import { isNative } from './services/platform';
import { showNativeBanner, hideNativeBanner } from './services/admob';
import { renderFourierVideoOffline } from './utils/videoRenderer';
import { downloadOrShareVideo } from './services/downloader';
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isPremium, setIsPremium] = useState(false);
  const [devPremiumToggle, setDevPremiumToggle] = useState(true); // Default ON for developer
  
  const isDevUser = session?.user?.email === 'jstivelamatta@gmail.com';
  const effectivePremium = isPremium || (isDevUser && devPremiumToggle);

  const checkPremium = async (currentSession) => {
    if (!currentSession) {
      setIsPremium(false);
      return;
    }
    const { data, error } = await supabase
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
  
  // History State for Undo/Redo
  const [pointsHistory, setPointsHistory] = useState([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const points = pointsHistory[historyIndex]; 

  const [origin, setOrigin] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [fourier, setFourier] = useState([]);
  const [time, setTime] = useState(0);
  const [path, setPath] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [manualOrigin, setManualOrigin] = useState(false);
  
  // Customization
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [epicycleColor, setEpicycleColor] = useState('#3b82f6');
  const [pathColor, setPathColor] = useState('#3b82f6');
  const [epicycleThickness, setEpicycleThickness] = useState(1);
  const [pathThickness, setPathThickness] = useState(3);
  const [pointSize, setPointSize] = useState(3);
  const [pathScale, setPathScale] = useState(1);
  const [snapRadius, setSnapRadius] = useState(15);
  const [epicycleShape, setEpicycleShape] = useState('circle');
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
  const animationRef = useRef(null);
  const isRecordingRef = useRef(isRecording);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Layout sizing
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

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

  // Update Barycenter when points change 
  useEffect(() => {
    if (points.length > 0 && !manualOrigin) {
      setOrigin(getBarycenter(points));
    }
  }, [points, manualOrigin]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setPath([]);
      setFourier([]);
      setIsAnimating(false);
    }
  }, [historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < pointsHistory.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setPath([]);
      setFourier([]);
      setIsAnimating(false);
    }
  }, [historyIndex, pointsHistory.length]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't override arrow keys if they are for panning (handled in CanvasStage)
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

  const commitPoints = (newPoints) => {
    const newHistory = pointsHistory.slice(0, historyIndex + 1);
    newHistory.push(newPoints);
    setPointsHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setPath([]);
    setFourier([]);
    setIsAnimating(false);
  };

  useEffect(() => {
    if (isAnimating) {
      if (points.length > 0) {
        let pathForDFT = points;
        if (mode === 'draw-curve') {
          pathForDFT = generateSpline(points, 20, false);
        }

        const spacing = 2; 
        const resampledPoints = resamplePath(pathForDFT, spacing);
        
        const complexPoints = resampledPoints.map(p => ({
          re: (p.x - origin.x) * pathScale,
          im: (p.y - origin.y) * pathScale
        }));
        
        const fourierData = dft(complexPoints);
        setFourier(fourierData);
        setPath([]);
        setTime(0);
      } else {
        setIsAnimating(false);
        alert("¡Por favor dibuja una ruta primero!");
      }
    }
  }, [isAnimating, points, origin, pathScale, mode]);

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  useEffect(() => {
    if (isAnimating && fourier.length > 0) {
      // Force start from 0 to fix restart bug when time state hasn't flushed yet
      let currentTime = 0; 
      
      const animate = () => {
        const dt = (2 * Math.PI) / fourier.length;
        // Total time increment for this frame
        let frameDelta = dt * animationSpeedRef.current;
        
        // If speed is very high, processing it in one go makes jagged lines.
        // We divide the frame into smaller substeps to preserve path resolution.
        const substeps = Math.ceil(frameDelta / (dt * 0.5));
        const subDelta = frameDelta / substeps;
        
        let newPathPoints = [];
        let newTime = currentTime;

        for (let step = 0; step < substeps; step++) {
          newTime += subDelta;
          
          let x = origin.x;
          let y = origin.y;
          for (let i = 0; i < fourier.length; i++) {
            let freq = fourier[i].freq;
            let radius = fourier[i].amp;
            let phase = fourier[i].phase;
            x += radius * Math.cos(freq * newTime + phase);
            y += radius * Math.sin(freq * newTime + phase);
          }
          newPathPoints.push({ x, y });
          
          // Stop exactly at 1 full cycle
          if (newTime >= Math.PI * 2) {
            newTime = Math.PI * 2;
            break;
          }
        }
        
        currentTime = newTime;
        setTime(currentTime);
        
        setPath(prevPath => {
          let updated = [...prevPath, ...newPathPoints];
          // We don't slice because it should exactly finish drawing the shape and stop
          return updated;
        });

        // Auto-stop logic
        if (currentTime >= Math.PI * 2) {
          setIsAnimating(false);
          if (isRecordingRef.current) {
            stopRecording();
          }
          return; // Stop animation loop
        }

        animationRef.current = requestAnimationFrame(animate);
      };
      
      animationRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationRef.current);
    }
  }, [isAnimating, fourier, origin]);

  const handleClear = () => {
    commitPoints([]);
    setManualOrigin(false);
  };

  const handleToggleAnimation = () => {
    setIsAnimating(!isAnimating);
  };

  const handleRecordToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      setRecordingUrl(null);
      setRecordingMp4Url(null);
      chunksRef.current = [];
      const canvas = stageRef.current.content.querySelector('canvas');
      
      if (!canvas) {
        alert("No se encontró el lienzo para grabar.");
        return;
      }
      
      const stream = canvas.captureStream(60);
      
      const BITRATES = {
        '480p': 2500000,
        '720p': 5000000,
        '1080p': 12000000,
        '2k': 24000000,
        '4k': 50000000
      };
      
      // Determine best available codec (some browsers support h264 for webm which converts better to mp4)
      let options = { 
        mimeType: 'video/webm',
        videoBitsPerSecond: BITRATES[exportQuality] || 5000000
      };
      if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
        options = { 
          mimeType: 'video/webm;codecs=h264',
          videoBitsPerSecond: BITRATES[exportQuality] || 5000000
        };
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        // WebM
        const blobWebM = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordingUrl(URL.createObjectURL(blobWebM));
        
        // MP4 (Container trick: works in many modern players when codec is h264 or generic)
        const blobMP4 = new Blob(chunksRef.current, { type: 'video/mp4' });
        setRecordingMp4Url(URL.createObjectURL(blobMP4));
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      
      // Auto-restart animation when recording starts
      if (points.length > 0) {
        setPath([]);
        setTime(0);
        setIsAnimating(true);
      }
    }
  };

  const handleSavePoints = () => {
    if (points.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(points));
    const jsonStr = JSON.stringify(points);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `epiciclos_${Date.now()}.json`;
    a.click();
  };

  const handleLoadPoints = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const loadedPoints = JSON.parse(e.target.result);
          if (Array.isArray(loadedPoints)) {
            commitPoints(loadedPoints);
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
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < pointsHistory.length - 1}
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
          points={points}
          commitPoints={commitPoints}
          origin={origin}
          setOrigin={(newOrigin) => {
            setOrigin(newOrigin);
            setManualOrigin(true);
          }}
          fourier={fourier}
          time={time}
          path={path}
          stageRef={stageRef}
          isRecording={isRecording}
          epicycleColor={epicycleColor}
          pathColor={pathColor}
          epicycleThickness={epicycleThickness}
          pathThickness={pathThickness}
          pointSize={pointSize}
          snapRadius={snapRadius}
          epicycleShape={epicycleShape}
          customRotorShape={customRotorShape}
          recordingBox={recordingBox}
          setRecordingBox={setRecordingBox}
          showRecordingBox={showRecordingBox}
        />
        
        {!isRecording && (
          <div className="status-bar">
            {activeTab !== 'draw' && 'Desplazamiento — Arrastra con el dedo para mover el lienzo'}
            {activeTab === 'draw' && mode === 'draw-pencil' && 'Lápiz — Arrastra para dibujar'}
            {activeTab === 'draw' && mode === 'draw-line' && 'Línea — Clic para crear puntos'}
            {activeTab === 'draw' && mode === 'draw-curve' && 'Curva — Clic para crear puntos suaves'}
            {activeTab === 'draw' && mode === 'edit' && 'Edición — Arrastra los puntos'}
            {activeTab === 'draw' && mode === 'moveOrigin' && 'Arrastra el punto verde (centro)'}
            {activeTab === 'draw' && mode === 'pan' && 'Arrastra para mover • Scroll para zoom'}
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
        currentPoints={points}
        onLoadProject={(pts) => { 
          setPath([]); 
          setFourier([]); 
          setIsAnimating(false);
          const newHistory = pointsHistory.slice(0, historyIndex + 1);
          newHistory.push(pts);
          setPointsHistory(newHistory);
          setHistoryIndex(newHistory.length - 1);
        }}
        mode={mode}
        setMode={setMode}
        onImageUpload={setBgImage}
        onClear={handleClear}
        onToggleAnimation={handleToggleAnimation}
        isAnimating={isAnimating}
        animationSpeed={animationSpeed}
        setAnimationSpeed={setAnimationSpeed}
        epicycleColor={epicycleColor}
        setEpicycleColor={setEpicycleColor}
        pathColor={pathColor}
        setPathColor={setPathColor}
        epicycleThickness={epicycleThickness}
        setEpicycleThickness={setEpicycleThickness}
        pathThickness={pathThickness}
        setPathThickness={setPathThickness}
        pathScale={pathScale}
        setPathScale={setPathScale}
        snapRadius={snapRadius}
        setSnapRadius={setSnapRadius}
        pointSize={pointSize}
        setPointSize={setPointSize}
        epicycleShape={epicycleShape}
        setEpicycleShape={setEpicycleShape}
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
        canRedo={historyIndex < pointsHistory.length - 1}
        onSavePoints={handleSavePoints}
        onLoadPoints={handleLoadPoints}
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
