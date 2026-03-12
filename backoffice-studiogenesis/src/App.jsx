import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import AppLayout from './components/layout/AppLayout';
// import Dashboard from './pages/Dashboard';
import Categorias from '../src/pages/Categories';
import Productos from './pages/Productos';
import Calendar from './pages/Calendar';
import { useAuth } from './context/AuthContext';
function App() {
// Estado para almacenar la sesión del usuario
  const [session, setSession] = useState(null);
  const { user } = useAuth();
  useEffect(() => {// Verificar sesión actual al cargar la app
    // Escuchar cambios en la sesión (login/logout)
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    // Suscribirse a cambios de autenticación para actualizar la sesión en tiempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    // Limpiar la suscripción al desmontar el componente
    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    // Si no hay sesión, mostrar el formulario de login
    return <Login />;
  }

  return ( // Si hay sesión, mostrar el layout principal del gestor con el contenido dentro de AppLayout 
    
   <Routes>
    {/* <p>Cargando categorías...</p> */}
      {/* RUTA PÚBLICA */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />

      {/* RUTAS PRIVADAS (Dentro del Layout) */}
      /* El layout se muestra solo si hay usuario autenticado, de lo contrario redirige a categorías (o login) */
      <Route path="/" element={user ? <AppLayout /> : <Login to="/login" />}>
      {console.log("Usuario autenticado:", user)}
        {/* <Route index element={<Dashboard />} /> */}
        <Route path="categorias" element={<Categorias />} />
        <Route path="productos" element={<Productos />} />
        <Route path="calendario" element={<Calendar />} /> 
      </Route>

      {/* 404 - No encontrado */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;