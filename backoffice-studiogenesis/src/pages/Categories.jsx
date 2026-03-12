import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const Categorias = () => {
  const { user } = useAuth();

  // --- ESTADOS ---
  const [lista, setLista] = useState([]); // Datos reales de la DB
  const [listaFiltrada, setListaFiltrada] = useState([]); // Datos para mostrar al buscar
  const [busqueda, setBusqueda] = useState(''); // El texto del input
  
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false); // Almacena el ID si estamos editando
  const [loading, setLoading] = useState(false);
  
  const [nuevaCat, setNuevaCat] = useState({ 
    nombre: '', 
    descripcion: '', 
    id_padre: null 
  });

  // --- FUNCIONES DE DATOS ---
  const fetchDatos = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('user_id', user.id)
      .order('nombre', { ascending: true });
    
    if (!error) {
      setLista(data);
    }
  };

  useEffect(() => {
    fetchDatos();
  }, [user]);

  // --- LÓGICA DE FILTRADO EN TIEMPO REAL ---
  const handleBusqueda = (e) => {
    const valor = e.target.value;
    setBusqueda(valor);

    const query = valor.toLowerCase();
    const filtrados = lista.filter(cat => 
      cat.nombre.toLowerCase().includes(query) || 
      (cat.descripcion && cat.descripcion.toLowerCase().includes(query))
    );
    setListaFiltrada(filtrados);
  };

  // Determinar qué lista renderizar
  const datosAMostrar = busqueda ? listaFiltrada : lista;

  // --- ACCIONES ---
  const openEditForm = (cat) => {
    setEditMode(cat.id);
    setNuevaCat({
      nombre: cat.nombre,
      descripcion: cat.descripcion || '',
      id_padre: cat.id_padre
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditMode(false);
    setNuevaCat({ nombre: '', descripcion: '', id_padre: null });
  };

  const deleteCategoria = async (id) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar esta categoría y sus subcategorías?")) {
      const { error } = await supabase.from('categorias').delete().eq('id', id);
      if (!error) {
        fetchDatos();
      } else {
        alert("Error al eliminar: " + error.message);
      }
    }
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      nombre: nuevaCat.nombre,
      descripcion: nuevaCat.descripcion,
      id_padre: nuevaCat.id_padre === "" ? null : nuevaCat.id_padre,
      user_id: user.id
    };

    let result;
    if (editMode) {
      result = await supabase.from('categorias').update(payload).eq('id', editMode);
    } else {
      result = await supabase.from('categorias').insert([payload]);
    }

    if (result.error) {
      alert("Error al guardar: " + result.error.message);
    } else {
      closeForm();
      fetchDatos();
    }
    setLoading(false);
  };

  return (
    <div className="container-fluid mt-4">
      {/* CABECERA */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold">Categorías</h2>
          <p className="text-muted">Gestiona tu catálogo personal.</p>
        </div>
        <button className="btn btn-primary shadow-sm" onClick={() => setShowForm(true)}>
          <i className="bi bi-plus-lg me-2"></i> Nueva Categoría
        </button>
      </div>

      {/* FILTRO EN TIEMPO REAL */}
      <div className="mb-4">
        <div className="input-group shadow-sm" style={{ maxWidth: '400px' }}>
          <span className="input-group-text bg-white border-end-0">
            <i className="bi bi-search text-muted"></i>
          </span>
          <input
            type="text"
            className="form-control border-start-0"
            placeholder="Buscar por nombre o descripción..."
            value={busqueda}
            onChange={handleBusqueda}
          />
        </div>
      </div>

      {/* TABLA */}
      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="px-4">Nombre</th>
                  <th>Descripción</th>
                  <th>Categoría Padre</th>
                  <th className="text-end px-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {datosAMostrar.length > 0 ? (
                  datosAMostrar.map((cat) => (
                    <tr key={cat.id}>
                      <td className="px-4 fw-semibold">{cat.nombre}</td>
                      <td className="text-muted small">{cat.descripcion || '---'}</td>
                      <td>
                        <span className={`badge ${cat.id_padre ? 'bg-info text-dark' : 'bg-secondary'}`}>
                          {lista.find(item => item.id === cat.id_padre)?.nombre || 'Principal'}
                        </span>
                      </td>
                      <td className="text-end px-4">
                        <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openEditForm(cat)}>
                          <i className="bi bi-pencil">Editar</i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => deleteCategoria(cat.id)}>
                          <i className="bi bi-trash">Borrar</i>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-5 text-muted">
                      {busqueda ? "No hay resultados para tu búsqueda." : "No hay categorías creadas."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PANEL LATERAL (OFFCANVAS) */}
      <div className={`offcanvas offcanvas-end ${showForm ? 'show' : ''}`} 
           style={{ visibility: showForm ? 'visible' : 'hidden', width: '400px' }}
           tabIndex="-1">
        
        <div className="offcanvas-header border-bottom bg-light">
          <h5 className="offcanvas-title">{editMode ? 'Editar Categoría' : 'Nueva Categoría'}</h5>
          <button type="button" className="btn-close" onClick={closeForm}></button>
        </div>

        <div className="offcanvas-body">
          <form onSubmit={handleGuardar}>
            <div className="mb-3">
              <label className="form-label fw-bold">Nombre</label>
              <input 
                type="text" 
                className="form-control" 
                value={nuevaCat.nombre}
                onChange={(e) => setNuevaCat({...nuevaCat, nombre: e.target.value})}
                required 
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">Categoría Padre</label>
              <select 
                className="form-select"
                value={nuevaCat.id_padre || ""}
                onChange={(e) => setNuevaCat({...nuevaCat, id_padre: e.target.value})}
              >
                <option value="">Ninguna (Principal)</option>
                {lista
                  .filter(c => c.id !== editMode) // EXCLUIRSE A SÍ MISMA
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))
                }
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">Descripción</label>
              <textarea 
                className="form-control" 
                rows="4" 
                value={nuevaCat.descripcion}
                onChange={(e) => setNuevaCat({...nuevaCat, descripcion: e.target.value})}
              ></textarea>
            </div>

            <div className="d-grid gap-2 mt-4">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Procesando...' : (editMode ? 'Actualizar' : 'Guardar')}
              </button>
              <button type="button" className="btn btn-light" onClick={closeForm}>Cancelar</button>
            </div>
          </form>
        </div>
      </div>

      {showForm && <div className="offcanvas-backdrop fade show" onClick={closeForm}></div>}
    </div>
  );
};

export default Categorias;