import React, { useEffect } from 'react';

export default function AdBanner({ type = 'top' }) {
  // En producción, aquí se inyectaría el código de Google AdSense
  // Por ejemplo:
  /*
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('Error cargando anuncio', err);
    }
  }, []);
  */

  const style = type === 'top' 
    ? { width: '728px', height: '90px', margin: '0 auto' } 
    : { width: '300px', height: '250px', margin: '20px' };

  return (
    <div className={`ad-banner ad-${type}`} style={{ ...style, background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center' }}>
      {/* 
        <ins className="adsbygoogle"
             style={{ display: 'block' }}
             data-ad-client="ca-pub-XXXXXXXXXXXXX"
             data-ad-slot="YYYYYYYYYY"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
      */}
      <p>Espacio Publicitario<br/><small>Google AdSense</small></p>
    </div>
  );
}
