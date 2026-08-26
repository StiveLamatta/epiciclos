import React from 'react';

export default function AdBanner({ type = 'top' }) {
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
        {/* 
          <ins className="adsbygoogle"
               style={{ display: 'block' }}
               data-ad-client="ca-pub-XXXXXXXXXXXXX"
               data-ad-slot="YYYYYYYYYY"
               data-ad-format="auto"
               data-full-width-responsive="true"></ins>
        */}
        <p>Espacio Publicitario</p>
      </div>
    </div>
  );
}
