import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Mail, Lock, LogIn, UserPlus } from 'lucide-react';

export default function AuthModal({ onClose, onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data?.user) onAuthSuccess(data.user);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data?.user) {
          alert('¡Registro exitoso! Por favor, verifica tu correo electrónico.');
          setIsLogin(true);
        }
      }
    } catch (err) {
      setError(err.message || 'Error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="auth-modal glass-panel">
        <button className="close-btn" onClick={onClose}><X size={20} /></button>
        
        <h2>{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleAuth}>
          <div className="input-group">
            <Mail size={16} />
            <input 
              type="email" 
              placeholder="Correo electrónico" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div className="input-group">
            <Lock size={16} />
            <input 
              type="password" 
              placeholder="Contraseña" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          
          <button type="submit" className="btn primary w-full" disabled={loading}>
            {loading ? 'Cargando...' : isLogin ? <><LogIn size={18} /> Entrar</> : <><UserPlus size={18} /> Registrarse</>}
          </button>
        </form>
        
        <div className="divider">
          <span>O</span>
        </div>
        
        <button type="button" className="btn google-btn w-full" onClick={handleGoogleLogin}>
          Continuar con Google
        </button>
        
        <p className="toggle-auth">
          {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
          <span onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
          </span>
        </p>
      </div>
    </div>
  );
}
