import React, { useEffect } from 'react';
import { isNative } from '../services/platform';
import { showNativeBanner, hideNativeBanner } from '../services/admob';

export default function AdBanner({ type = 'top' }) {
  useEffect(() => {
    if (isNative()) {
      showNativeBanner();
      return () => {
        hideNativeBanner();
      };
    }
  }, []);

  // Si corre en Android nativo, AdMob superpone el banner del sistema
  if (isNative()) {
    return null;
  }

  return (
    <div className="ad-banner-container">
      <div 
        className={`ad-banner ad-${type}`} 
        style={{ 
          width: '100%',
          maxWidth: type === 'top' ? '728px' : '300px', 
          height: type === 'top' ? '90px' : '250px', 
          background: 'rgba(255,255,255,0.03)', 
          border: '1px dashed rgba(255,255,255,0.12)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: '#64748b', 
          fontSize: '0.75rem', 
          textAlign: 'center',
          borderRadius: '8px',
        }}
      >
        <p>Espacio Publicitario</p>
      </div>
    </div>
  );
}
