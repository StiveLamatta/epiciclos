import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Folder, LogOut, Trash2, Play, Cloud, AlertCircle } from 'lucide-react';

export default function Dashboard({ isPremium, session, onLogout, onLoadProject, onSaveProject, currentPoints }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [error, setError] = useState(null);

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
    if (!projectName.trim() || currentPoints.length === 0) return;
    
    if (!isPremium && projects.length >= 5) {
      setError('Límite del plan gratuito alcanzado. Sólo puedes guardar 5 proyectos. ¡Mejora a Premium para almacenamiento ilimitado!');
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
            name: projectName, 
            data_json: { points: currentPoints } 
          }
        ])
        .select();

      if (error) throw error;
      setProjectName('');
      setProjects([data[0], ...projects]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este proyecto?')) return;
    
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      setProjects(projects.filter(p => p.id !== id));
      setError(null); // Clear any limit errors since we freed space
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };

  return (
    <div className="dashboard-panel glass-panel">
      <div className="dashboard-header">
        <div className="user-info">
          <Cloud size={20} className="text-primary" />
          <span>{session.user.email}</span>
        </div>
        <button onClick={onLogout} className="btn icon-btn" title="Cerrar sesión">
          <LogOut size={16} />
        </button>
      </div>

      <div className="dashboard-save-section">
        <h4>Guardar Proyecto Actual</h4>
        <form onSubmit={handleSave} className="save-form">
          <input 
            type="text" 
            placeholder="Nombre del proyecto" 
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            disabled={saving || currentPoints.length === 0}
            required
            maxLength={30}
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
          <a 
            href={`https://buy.stripe.com/test_placeholder?client_reference_id=${session.user.id}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn w-full" 
            style={{ background: '#facc15', color: '#000', fontWeight: 'bold' }}
          >
            Mejorar ahora
          </a>
        </div>
      )}
    </div>
  );
}
