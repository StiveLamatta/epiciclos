import React, { useState, useEffect } from 'react';
import { X, Play, Download } from 'lucide-react';

export default function AdInterstitialModal({ onSkip, title = "Apoya a Epiciclos" }) {
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    if (timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft]);

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="auth-modal glass-panel" style={{ width: '500px', textAlign: 'center' }}>
        <h2>{title}</h2>
        <p className="text-muted" style={{ marginBottom: '20px' }}>Tu video estará listo para descargar en unos segundos...</p>
        
        {/* Aquí iría el bloque real de AdSense */}
        <div style={{ background: 'rgba(0,0,0,0.3)', width: '100%', height: '250px', border: '1px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', borderRadius: '8px' }}>
           <p className="text-muted">Espacio para Anuncio (Interstitial)</p>
        </div>

        <button 
          className={`btn ${timeLeft === 0 ? 'primary' : ''} w-full`} 
          onClick={onSkip}
          disabled={timeLeft > 0}
          style={{ height: '50px', fontSize: '1.1rem' }}
        >
          {timeLeft > 0 ? (
            `Espera ${timeLeft}s para descargar...`
          ) : (
            <><Download size={20} /> Saltar y Descargar</>
          )}
        </button>
      </div>
    </div>
  );
}
