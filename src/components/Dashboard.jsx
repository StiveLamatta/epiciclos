import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Folder, LogOut, Trash2, Cloud, AlertCircle, ShoppingBag, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react';
import { isNative } from '../services/platform';

export default function Dashboard({ 
  isPremium, 
  session, 
  onLogout, 
  onLoadProject, 
  onSaveProject, 
  currentPoints,
  isDevUser,
  devPremiumToggle,
  onToggleDevPremium
}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [error, setError] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const isDev = isDevUser || session?.user?.email === 'jstivelamatta@gmail.com';

  const handleMercadoPagoClick = async (e) => {
    e.preventDefault();
    setIsRedirecting(true);
    try {
      const res = await fetch('/api/create-mp-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id, email: session.user.email })
      });
      const data = await res.json();
      
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        alert('Error al conectar con Mercado Pago. Intenta más tarde.');
      }
    } catch (err) {
      console.error(err);
      alert('Error en la conexión. Intenta más tarde.');
    } finally {
      setIsRedirecting(false);
    }
  };

  const handleGooglePlayPurchase = () => {
    alert('Iniciando Google Play Billing... (Conecta tu cuenta de Google Play Console para compras reales en producción)');
  };

  useEffect(() => {
    if (session) {
      fetchProjects();
    }
  }, [session]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    if (currentPoints.length === 0) {
      setError('No hay puntos en el lienzo para guardar.');
      return;
    }

    if (!isPremium && projects.length >= 5) {
      setError('Límite de 5 proyectos alcanzado para usuarios gratuitos. ¡Hazte Premium para proyectos ilimitados!');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([
          {
            user_id: session.user.id,
            name: projectName.trim(),
            data_json: { points: currentPoints },
          }
        ])
        .select();

      if (error) throw error;
      
      setProjectName('');
      fetchProjects();
    } catch (err) {
      console.error('Error saving project:', err);
      setError('Error al guardar el proyecto en la nube.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este proyecto?')) return;
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setProjects(projects.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting project:', err);
      alert('No se pudo eliminar el proyecto.');
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="user-badge">
          <Cloud size={16} />
          <span className="user-email">{session.user.email}</span>
          {isPremium ? (
            <span className="premium-badge">⭐ VIP</span>
          ) : (
            <span className="free-badge">Gratis</span>
          )}
        </div>
        <button onClick={onLogout} className="btn icon-btn" title="Cerrar Sesión">
          <LogOut size={16} />
        </button>
      </div>

      {/* TARJETA VIP EXCLUSIVA PARA EL DESARROLLADOR (jstivelamatta@gmail.com) */}
      {isDev && (
        <div style={{ margin: '12px 0', padding: '12px', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ShieldCheck size={16} color="#38bdf8" />
                <h4 style={{ margin: 0, color: '#38bdf8', fontSize: '0.82rem' }}>Modo Desarrollador</h4>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: '#94a3b8' }}>Alternar modo para pruebas</p>
            </div>
            <button 
              type="button"
              className={`btn ${devPremiumToggle ? 'primary' : 'danger'}`}
              style={{ padding: '6px 10px', fontSize: '0.72rem', fontWeight: 'bold' }}
              onClick={onToggleDevPremium}
            >
              {devPremiumToggle ? '⭐ Premium: ON' : '🔓 Gratis (Ads): ON'}
            </button>
          </div>
        </div>
      )}

      <div className="dashboard-save-form">
        <h4>Guardar Proyecto Actual</h4>
        <form onSubmit={handleSave}>
          <input 
            type="text" 
            placeholder="Nombre del proyecto..." 
            value={projectName} 
            onChange={(e) => setProjectName(e.target.value)}
            disabled={saving}
          />
          <button type="submit" className="btn primary" disabled={saving || currentPoints.length === 0}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
        {currentPoints.length === 0 && <small className="text-muted">Dibuja algo primero para guardar.</small>}
        {error && (
          <div className="error-alert">
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      <div className="dashboard-projects">
        <h4>Tus Proyectos ({projects.length}{isPremium ? '' : '/5'})</h4>
        {loading ? (
          <p className="text-muted text-center">Cargando proyectos...</p>
        ) : projects.length === 0 ? (
          <p className="text-muted text-center">No tienes proyectos guardados aún.</p>
        ) : (
          <ul className="project-list">
            {projects.map((proj) => (
              <li key={proj.id} className="project-item">
                <div className="project-info" onClick={() => onLoadProject(proj.data_json.points)}>
                  <Folder size={16} />
                  <span>{proj.name}</span>
                </div>
                <button onClick={() => handleDelete(proj.id)} className="btn icon-btn danger-text">
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!isPremium && (
        <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '8px', textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#facc15' }}>🚀 Desbloquea Premium</h4>
          <p style={{ fontSize: '0.8rem', marginBottom: '15px', color: '#fef08a' }}>Sin anuncios, sin esperas y proyectos ilimitados.</p>
          
          {isNative() ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={handleGooglePlayPurchase}
                className="btn w-full" 
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 'bold' }}
              >
                <ShoppingBag size={18} /> Comprar con Google Play ($2.99)
              </button>
              <small style={{ display: 'block', fontSize: '0.72rem', color: '#9ca3af' }}>
                Procesado de forma segura a través de Google Play Store.
              </small>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={handleMercadoPagoClick}
                disabled={isRedirecting}
                className="btn w-full" 
                style={{ background: '#009ee3', color: '#fff', fontWeight: 'bold' }}
              >
                {isRedirecting ? 'Conectando...' : 'Pagar con Yape / Tarjeta (Perú)'}
              </button>
              
              <a 
                href={`https://paypal.me/tu_usuario/5usd`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn w-full" 
                style={{ background: '#003087', color: '#fff', fontWeight: 'bold' }}
              >
                Pagar con PayPal (Internacional)
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
