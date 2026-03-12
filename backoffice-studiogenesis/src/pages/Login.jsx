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
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <div className="card shadow-lg" style={{ width: '400px' }}>
        <div className="card-body p-5">
          <h2 className="text-center mb-4">{isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}</h2>
          <form onSubmit={handleAuth}>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input 
                type="email" 
                className="form-control" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Contraseña</label>
              <input 
                type="password" 
                className="form-control" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>
            <button type="submit" className="btn btn-primary w-100 mb-3">
              {isRegistering ? 'Registrarse' : 'Entrar'}
            </button>
          </form>
          <div className="text-center">
            <button 
              className="btn btn-link btn-sm" 
              onClick={() => setIsRegistering(!isRegistering)}
            >
              {isRegistering ? '¿Ya tienes cuenta? Logueate' : '¿No tienes cuenta? Regístrate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;