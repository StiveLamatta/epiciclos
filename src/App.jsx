import React, { useState, useEffect, useRef, useCallback } from 'react';
import Toolbar from './components/Toolbar';
import CanvasStage from './components/CanvasStage';
import { dft } from './utils/fourier';
import { resamplePath, getBarycenter, generateSpline } from './utils/math';
import { supabase } from './lib/supabase';
import AuthModal from './components/AuthModal';
import Dashboard from './components/Dashboard';
import AdBanner from './components/AdBanner';
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isPremium, setIsPremium] = useState(false);
  
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
      
      // Determine best available codec (some browsers support h264 for webm which converts better to mp4)
      let options = { mimeType: 'video/webm' };
      if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
        options = { mimeType: 'video/webm;codecs=h264' };
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
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "epiciclos_puntos.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
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
    <div className="app-container" style={{ position: 'relative' }}>
      <div className="canvas-area">
        {!isPremium && (
          <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 5 }}>
            <AdBanner type="top" />
          </div>
        )}
        <CanvasStage
          width={windowSize.width}
          height={windowSize.height}
          mode={mode}
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
        />
        
        {!isRecording && (
          <div className="status-bar glass-panel">
            {mode === 'draw-pencil' && 'Lápiz - Mantén presionado y arrastra para dibujar libremente'}
            {mode === 'draw-line' && 'Línea - Haz clics para crear puntos (se unen con rectas). Haz clic cerca de uno para unirlo.'}
            {mode === 'draw-curve' && 'Curva - Haz clics para crear puntos (se unen suavemente). Haz clic cerca de uno para unirlo.'}
            {mode === 'edit' && 'Modo Edición - Arrastra los puntos para modificarlos'}
            {mode === 'moveOrigin' && 'Mover Centro - Arrastra el punto verde para cambiar el centro'}
            {mode === 'pan' && 'Mover Lienzo - Arrastra el fondo o usa las Flechas para moverte. Rueda del ratón para Zoom.'}
          </div>
        )}
      </div>

      <Toolbar 
      isPremium={isPremium}
      session={session}
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
