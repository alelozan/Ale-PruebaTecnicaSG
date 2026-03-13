import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Función para manejar el registro o inicio de sesión según el estado actual
  const handleAuth = async (e) => {
    e.preventDefault();
    if (isRegistering) {
      // Intentar registrar al usuario con email y contraseña
      const { error } = await supabase.auth.signUp({ email, password });
      
      if (error) alert(error.message);
      else alert('¡Revisa tu correo de confirmación!');
    } else {
      // Intentar iniciar sesión con email y contraseña
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
  };

  return (
   <div className="d-flex justify-content-center align-items-center vh-100 w-100">
    <div className="card shadow-lg border-0" style={{ width: '450px', borderRadius: '15px' }}>
      <div className="card-body p-5">
        {/* Icono decorativo para darle un toque profesional */}
        <div className="text-center mb-4">
          <div className="bg-primary bg-opacity-10 d-inline-block p-3 rounded-circle mb-3">
            <i className="bi bi-rocket-takeoff-fill text-primary fs-1"></i>
          </div>
          <h2 className="fw-bold m-0">{isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}</h2>
          <p className="text-muted small">Gestiona tu inventario en Studiogenesis</p>
        </div>

        <form onSubmit={handleAuth}>
          <div className="mb-3">
            <label className="form-label fw-bold text-secondary small">Email</label>
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted">
                <i className="bi bi-envelope"></i>
              </span>
              <input 
                type="email" 
                className="form-control border-start-0 ps-0" 
                placeholder="nombre@ejemplo.com"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-bold text-secondary small">Contraseña</label>
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted">
                <i className="bi bi-lock"></i>
              </span>
              <input 
                type="password" 
                className="form-control border-start-0 ps-0" 
                placeholder="••••••••"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-100 py-2 mb-3 fw-bold shadow-sm">
            {isRegistering ? 'Registrarse' : 'Entrar al Panel'}
          </button>
        </form>

        <div className="text-center mt-3">
          <button 
            className="btn btn-link btn-sm text-decoration-none text-muted" 
            onClick={() => setIsRegistering(!isRegistering)}
          >
            {isRegistering 
              ? <span>¿Ya tienes cuenta? <strong className="text-primary">Inicia sesión</strong></span> 
              : <span>¿No tienes cuenta? <strong className="text-primary">Regístrate ahora</strong></span>
            }
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};

export default Login;