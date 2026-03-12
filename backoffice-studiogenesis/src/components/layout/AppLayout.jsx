import React from 'react';
import { supabase } from '../../lib/supabase';
import { Outlet, NavLink } from 'react-router-dom'; // Importamos NavLink para gestionar la navegación activa
import { useAuth } from '../../context/AuthContext';

const AppLayout = ({ children }) => {
  const { user } = useAuth();

  // Función para cerrar la sesión de Supabase
  const handleLogout = () => supabase.auth.signOut();

  return (
   <div className="d-flex" style={{ minHeight: '100vh', width: '100vw' }}>
    
    {/* --- SIDEBAR (Barra Lateral) --- */}
    {/* Mantenemos el ancho fijo de 250px para el menú */}
    <div className="bg-dark text-white p-3 shadow flex-shrink-0" style={{ width: '250px' }}>
      <div className="text-center mb-4">
        <h4 className="fw-bold">Studiogenesis</h4>
      </div>
      
      <ul className="nav nav-pills flex-column mb-auto">
        <li className="nav-item mb-2">
          <NavLink to="/categorias" className={({ isActive }) => `nav-link text-white ${isActive ? 'active' : ''}`}>
            <i className="bi bi-tags me-2"></i> Categorías
          </NavLink>
        </li>
        <li className="nav-item mb-2">
          <NavLink to="/productos" className={({ isActive }) => `nav-link text-white ${isActive ? 'active' : ''}`}>
            <i className="bi bi-box-seam me-2"></i> Productos
          </NavLink>
        </li>
        <li className="nav-item mb-2">
          <NavLink to="/calendario" className={({ isActive }) => `nav-link text-white ${isActive ? 'active' : ''}`}>
            <i className="bi bi-calendar3 me-2"></i> Calendario
          </NavLink>
        </li>
      </ul>
    </div>

    {/* --- ÁREA DE CONTENIDO PRINCIPAL --- */}
    {/* flex-grow-1 asegura que ocupe todo el espacio restante a la derecha del sidebar */}
    <div className="flex-grow-1 bg-light d-flex flex-column" style={{ overflowX: 'hidden' }}>
      
      {/* --- HEADER (Cabecera Superior) --- */}
      <header className="navbar navbar-expand-lg navbar-light bg-white border-bottom px-4 py-2 shadow-sm w-100">
        <div className="container-fluid">
          {/* Izquierda: Icono y Nombre */}
          <div className="d-flex align-items-center">
            <i className="bi bi-rocket-takeoff-fill text-primary fs-3 me-2"></i>
            <span className="navbar-brand fw-bold mb-0">Mi App Panel</span>
          </div>

          {/* Derecha: Info Usuario y Botón Logout */}
          <div className="d-flex align-items-center">
            <span className="text-muted small me-3 d-none d-sm-inline">
              <i className="bi bi-person-circle me-1"></i> {user?.email}
            </span>
            <button 
              onClick={handleLogout} 
              className="btn btn-outline-danger btn-sm d-flex align-items-center"
            >
              <i className="bi bi-box-arrow-right me-1"></i> Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* --- RENDERIZADO DE VISTAS --- */}
      {/* container-fluid hace que el contenido dentro de Productos, Categorías, etc. ocupe todo el ancho disponible */}
      <main className="p-4 flex-grow-1 w-100">
        <div className="container-fluid p-0">
          {children}
          <Outlet /> 
        </div>
      </main>
    </div>
  </div>
  );
};

export default AppLayout;