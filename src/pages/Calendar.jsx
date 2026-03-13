import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const Calendar = () => {
  const { user } = useAuth();
  
  // --- ESTADOS ---
  const [eventos, setEventos] = useState([]);      
  const [productos, setProductos] = useState([]);  
  const [showForm, setShowForm] = useState(false); 
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(null); // ID de la cita si estamos editando

  // Estado para el registro (Cita de compra)
  const [nuevaCita, setNuevaCita] = useState({
    producto_id: '',
    fecha: '',
    unidades: 1,
    coste_total: 0
  });

  // --- CARGA DE DATOS ---
  const fetchDatos = async () => {
    if (!user) return;

    // 1. Cargar productos con sus tarifas para cálculos de coste
    const { data: prods } = await supabase
      .from('productos')
      .select('*, tarifas(*)')
      .eq('user_id', user.id);
    setProductos(prods || []);

    // 2. Cargar registros de la tabla calendario
    const { data: citas, error } = await supabase
      .from('calendario')
      .select(`
        *,
        productos ( nombre )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error("Error al cargar citas:", error.message);
      return;
    }

    // 3. Formatear para FullCalendar usando extendedProps para guardar los datos originales
    const eventosCalendario = citas.map(cita => ({
      title: `${cita.unidades}x ${cita.productos?.nombre} (${cita.coste_total}€)`,
      start: cita.fecha,
      allDay: true,
      backgroundColor: '#198754',
      borderColor: '#198754',
      extendedProps: { 
        id_db: cita.id,
        raw: cita 
      }
    }));

    setEventos(eventosCalendario);
  };

  useEffect(() => {
    fetchDatos();
  }, [user]);

  // --- LÓGICA DE NEGOCIO ---

  const calcularCosteAutomatico = (prodId, fechaSeleccionada, cantidad) => {
    const producto = productos.find(p => p.id === prodId);
    if (!producto || !fechaSeleccionada) return 0;

    // Busca la tarifa que coincida con la fecha
    const tarifaValida = producto.tarifas?.find(t => 
      fechaSeleccionada >= t.fecha_desde && fechaSeleccionada <= t.fecha_hasta
    );

    const precioAplicable = tarifaValida ? tarifaValida.precio : 0;
    return (precioAplicable * cantidad).toFixed(2);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const datosActualizados = { ...nuevaCita, [name]: value };

    const nuevoCoste = calcularCosteAutomatico(
      datosActualizados.producto_id, 
      datosActualizados.fecha, 
      datosActualizados.unidades
    );

    setNuevaCita({ ...datosActualizados, coste_total: nuevoCoste });
  };

  // Al hacer clic en un evento del calendario
  const handleEventClick = (info) => {
    const citaId = info.event.extendedProps.id_db;
    const datosCita = info.event.extendedProps.raw;

    setEditMode(citaId);
    setNuevaCita({
      producto_id: datosCita.producto_id,
      fecha: datosCita.fecha,
      unidades: datosCita.unidades,
      coste_total: datosCita.coste_total
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditMode(null);
    setNuevaCita({ producto_id: '', fecha: '', unidades: 1, coste_total: 0 });
  };

  // --- ACCIONES DE BASE DE DATOS ---

  const handleGuardarCita = async (e) => {
    e.preventDefault();
    setLoading(true);

    const objetoCita = {
      producto_id: nuevaCita.producto_id,
      fecha: nuevaCita.fecha,
      unidades: parseInt(nuevaCita.unidades),
      coste_total: parseFloat(nuevaCita.coste_total),
      user_id: user.id,
      usuario_id: user.id 
    };

    let error;
    if (editMode) {
      // Actualizar registro existente
      const { error: updateError } = await supabase
        .from('calendario')
        .update(objetoCita)
        .eq('id', editMode);
      error = updateError;
    } else {
      // Crear nuevo registro
      const { error: insertError } = await supabase
        .from('calendario')
        .insert([objetoCita]);
      error = insertError;
    }

    if (error) {
      alert("Error al procesar: " + error.message);
    } else {
      closeForm();
      fetchDatos();
    }
    setLoading(false);
  };

  const handleEliminarCita = async () => {
    if (!editMode) return;
    
    if (window.confirm("¿Deseas eliminar este recordatorio de compra?")) {
      const { error } = await supabase
        .from('calendario')
        .delete()
        .eq('id', editMode);

      if (!error) {
        closeForm();
        fetchDatos();
      } else {
        alert("Error al eliminar: " + error.message);
      }
    }
  };

  return (
    <div className="container-fluid mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold">Calendario de Compras</h2>
          <p className="text-muted">Gestión de pedidos con cálculo de tarifas automático.</p>
        </div>
        <button className="btn btn-primary shadow-sm" onClick={() => setShowForm(true)}>
          <i className="bi bi-calendar-plus me-2"></i> Nueva Cita
        </button>
      </div>

      <div className="card shadow-sm border-0 p-3">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={eventos}
          eventClick={handleEventClick}
          locale="es"
          height="700px"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek'
          }}
          buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana' }}
        />
      </div>

      {/* Menú Lateral (Offcanvas) */}
      <div className={`offcanvas offcanvas-end ${showForm ? 'show' : ''}`} 
           style={{ visibility: showForm ? 'visible' : 'hidden', width: '400px' }}>
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title fw-bold">
            {editMode ? 'Editar Cita' : 'Programar Compra'}
          </h5>
          <button type="button" className="btn-close" onClick={closeForm}></button>
        </div>
        <div className="offcanvas-body">
          <form onSubmit={handleGuardarCita}>
            <div className="mb-3">
              <label className="form-label fw-bold text-secondary">Producto</label>
              <select 
                className="form-select" 
                name="producto_id" 
                value={nuevaCita.producto_id}
                onChange={handleChange}
                required
              >
                <option value="">Selecciona un producto...</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold text-secondary">Fecha</label>
              <input 
                type="date" 
                className="form-control" 
                name="fecha"
                value={nuevaCita.fecha}
                onChange={handleChange}
                required 
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold text-secondary">Unidades</label>
              <input 
                type="number" 
                className="form-control" 
                name="unidades"
                min="1"
                value={nuevaCita.unidades}
                onChange={handleChange}
                required 
              />
            </div>

            <div className="card bg-light border-0 p-3 mb-4">
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">Coste Total:</span>
                <span className="h4 mb-0 fw-bold text-success">{nuevaCita.coste_total}€</span>
              </div>
            </div>

            <div className="d-grid gap-2">
              <button type="submit" className="btn btn-success py-2" disabled={loading}>
                {loading ? 'Procesando...' : editMode ? 'Guardar Cambios' : 'Confirmar Pedido'}
              </button>
              
              {editMode && (
                <button 
                  type="button" 
                  className="btn btn-outline-danger" 
                  onClick={handleEliminarCita}
                >
                  <i className="bi bi-trash me-2"></i>Eliminar Cita
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
      
      {showForm && <div className="offcanvas-backdrop fade show" onClick={closeForm}></div>}
    </div>
  );
};

export default Calendar;