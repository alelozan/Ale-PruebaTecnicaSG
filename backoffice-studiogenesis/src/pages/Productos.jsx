import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Multiselect from 'multiselect-react-dropdown';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
const Productos = () => {
  const { user } = useAuth();

  // --- ESTADOS ---
  const [listaProductos, setListaProductos] = useState([]);      // Todos los productos del usuario
  const [listaCategorias, setListaCategorias] = useState([]);    // Categorías disponibles para el select
  const [listaFiltrada, setListaFiltrada] = useState([]);       // Resultados de la búsqueda
  const [busqueda, setBusqueda] = useState('');                 // Texto del buscador
  
  const [showForm, setShowForm] = useState(false);              // Control del Offcanvas (menú lateral)
  const [editMode, setEditMode] = useState(false);              // Guarda el ID si estamos editando, false si es nuevo
  const [loading, setLoading] = useState(false);                // Estado de carga para el botón guardar
  const [archivo, setArchivo] = useState(null);                 // Archivo físico de la imagen seleccionada

  // Estado del formulario de producto
  const [nuevoProd, setNuevoProd] = useState({ 
    nombre: '', 
    descripcion: '', 
    id_categoria: [], // Array de IDs de categorías seleccionadas
    tarifas: [],      // Array de objetos de tarifas
    foto:'',
  });

  // Estado temporal para la tarifa que se está redactando en el formulario
  const [nuevaTarifa, setNuevaTarifa] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    precio: ''
  });

  // --- CARGA DE DATOS DESDE SUPABASE ---
  const fetchDatos = async () => {
    if (!user) return;
    
    // 1. Obtener productos con sus relaciones (tarifas y categorías)
    const { data, error } = await supabase
      .from('productos')
      .select(`
        *,
        tarifas (id, precio, fecha_desde, fecha_hasta),
        producto_categoria (
          categoria_id,
          categorias (nombre)
        )
      `)
      .eq('user_id', user.id)
      .order('nombre', { ascending: true });

    if (error) {
      console.error("Error al extraer productos:", error.message);
      return;
    }
    
    // 2. Obtener solo las categorías creadas por este usuario
    const { data: cats } = await supabase
      .from('categorias')
      .select('id, nombre')
      .eq('user_id', user.id);

    if (data) setListaProductos(data);
    if (cats) setListaCategorias(cats);
  };

  useEffect(() => {
    fetchDatos();
  }, [user]);

  // --- LÓGICA DE BÚSQUEDA ---
  const handleBusqueda = async (e) => {
    const valor = e.target.value;
    setBusqueda(valor);
    
    // Filtrado en servidor/DB (puedes ajustarlo a filtrado local si prefieres)
    const { data } = await supabase
      .from('productos')
      .select(`*, tarifas (*), producto_categoria (categorias (nombre))`)
      .ilike('nombre', `%${valor}%`) // Búsqueda parcial por nombre
      .eq('user_id', user.id);
      
    setListaFiltrada(data || []);
  };

  const datosAMostrar = busqueda ? listaFiltrada : listaProductos;

  // --- GESTIÓN DEL FORMULARIO (EDITAR / CREAR) ---
  
  /**
   * Abre el formulario lateral y precarga los datos del producto seleccionado
   */
  const openEditForm = (prod) => {
    setEditMode(prod.id); // Guardamos el ID para saber que es una edición
    
    // Mapeamos las categorías actuales del producto a un array de IDs sencillo
    const idsCategoriasActivas = prod.producto_categoria?.map(rel => rel.categoria_id) || [];
    
    // Mapeamos las tarifas de la DB al formato que espera nuestro estado del formulario
    const tarifasFormateadas = prod.tarifas?.map(t => ({
      fecha_inicio: t.fecha_desde,
      fecha_fin: t.fecha_hasta,
      precio: t.precio
    })) || [];

    setNuevoProd({
      nombre: prod.nombre,
      descripcion: prod.descripcion || '',
      id_categoria: idsCategoriasActivas,
      tarifas: tarifasFormateadas,
      foto: prod.foto || ''
    });
    
    setShowForm(true); // Abrir menú lateral
  };

  /**
   * Limpia el formulario y lo cierra
   */
  const closeForm = () => {
    setShowForm(false);
    setEditMode(false);
    setArchivo(null);
    setNuevoProd({ nombre: '', descripcion: '', id_categoria: [], tarifas: [], foto: '' });
  };

  // --- ACCIONES DE PERSISTENCIA ---

  const handleGuardar = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let urlImagen = nuevoProd.foto;

      // Subida de imagen a Supabase Storage si hay archivo nuevo
      if (archivo) {
        const fileExt = archivo.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('productos').upload(filePath, archivo);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('productos').getPublicUrl(filePath);
        urlImagen = urlData.publicUrl;
      }

      const datosProducto = {
        nombre: nuevoProd.nombre,
        descripcion: nuevoProd.descripcion,
        foto: urlImagen,
        user_id: user.id
      };

      let productoId = editMode;

      if (editMode) {
        // Actualizar producto existente
        const { error } = await supabase.from('productos').update(datosProducto).eq('id', editMode);
        if (error) throw error;
        
        // Limpiar relaciones antiguas de categorías y tarifas para re-insertar las nuevas
        await supabase.from('producto_categoria').delete().eq('producto_id', editMode);
        await supabase.from('tarifas').delete().eq('producto_id', editMode);
      } else {
        // Insertar nuevo producto
        const { data, error } = await supabase.from('productos').insert([datosProducto]).select().single();
        if (error) throw error;
        productoId = data.id;
      }

      // Guardar categorías seleccionadas en tabla intermedia
      if (nuevoProd.id_categoria.length > 0) {
        const relacionesCategorias = nuevoProd.id_categoria.map(catId => ({
          producto_id: productoId,
          categoria_id: catId
        }));
        await supabase.from('producto_categoria').insert(relacionesCategorias);
      }

      // Guardar tarifas asociadas
      if (nuevoProd.tarifas.length > 0) {
        const insercionTarifas = nuevoProd.tarifas.map(t => ({
          producto_id: productoId,
          precio: t.precio,
          fecha_desde: t.fecha_inicio,
          fecha_hasta: t.fecha_fin,
          user_id: user.id
        }));
        await supabase.from('tarifas').insert(insercionTarifas);
      }

      alert("¡Guardado correctamente!");
      closeForm();
      fetchDatos();

    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteProducto = async (id) => {
    if (window.confirm("¿Eliminar este producto?")) {
      const { error } = await supabase.from('productos').delete().eq('id', id);
      if (!error) fetchDatos();
    }
  };

  // --- GESTIÓN LOCAL DE TARIFAS (Antes de guardar en DB) ---
  const agregarTarifa = () => {
    if (!nuevaTarifa.fecha_inicio || !nuevaTarifa.fecha_fin || !nuevaTarifa.precio) {
      alert("Rellena todos los campos de la tarifa");
      return;
    }
    setNuevoProd({
      ...nuevoProd,
      tarifas: [...nuevoProd.tarifas, nuevaTarifa]
    });
    setNuevaTarifa({ fecha_inicio: '', fecha_fin: '', precio: '' });
  };

  const eliminarTarifa = (index) => {
    const filtradas = nuevoProd.tarifas.filter((_, i) => i !== index);
    setNuevoProd({ ...nuevoProd, tarifas: filtradas });
  };
  const exportarExcel = () => {
  // Preparamos los datos: aplanamos las categorías para que sean legibles en una celda
  const datosParaExcel = datosAMostrar.map(prod => ({
    Nombre: prod.nombre,
    Descripción: prod.descripcion || 'Sin descripción',
    Categorías: prod.producto_categoria?.map(rel => rel.categorias?.nombre).join(', '),
    'Nº de Tarifas': prod.tarifas?.length || 0,
    'Creado el': new Date(prod.created_at).toLocaleDateString()
  }));

  const worksheet = XLSX.utils.json_to_sheet(datosParaExcel);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");
  
  // Genera el archivo y lo descarga
  XLSX.writeFile(workbook, "Listado_Productos.xlsx");
};

const exportarPDF = () => {
  try {
    const doc = new jsPDF();

    // Título e información de cabecera
    doc.setFontSize(18);
    doc.text("Informe de Inventario de Productos", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado por: ${user?.email}`, 14, 30);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 36);

    // Definición de columnas
    const columnas = ["Nombre", "Categorías", "Descripción", "Nº Tarifas"];

    // Preparación de filas (aplanando las categorías para que entren en la celda)
    const filas = datosAMostrar.map(prod => [
      prod.nombre,
      prod.producto_categoria?.map(rel => rel.categorias?.nombre).join(', ') || 'Sin categoría',
      prod.descripcion || 'Sin descripción',
      prod.tarifas?.length || 0
    ]);

    // LLAMADA CORREGIDA: Usamos autoTable(doc, {...})
    autoTable(doc, {
      startY: 45,
      head: [columnas],
      body: filas,
      theme: 'grid',
      headStyles: { fillColor: [13, 110, 253] }, // Azul Bootstrap
      styles: { fontSize: 9 },
      columnStyles: {
        2: { cellWidth: 70 } // Damos más espacio a la descripción
      }
    });

    // Descarga del archivo
    doc.save(`Productos_Inventario_${new Date().getTime()}.pdf`);

  } catch (error) {
    console.error("Error al exportar PDF:", error);
    alert("No se pudo generar el PDF. Revisa la consola para más detalles.");
  }
};

  return (
    <div className="container-fluid mt-4">
      {/* Cabecera */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold">Productos</h2>
          <p className="text-muted">Gestiona el inventario de tu tienda.</p>
        </div>
        <button className="btn btn-success shadow-sm" onClick={() => setShowForm(true)}>
          <i className="bi bi-box-seam me-2"></i> Nuevo Producto
        </button>
      </div>

      {/* Buscador */}
      <div className="mb-4">
        <input
          type="text"
          className="form-control shadow-sm"
          style={{ maxWidth: '400px' }}
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={handleBusqueda}
        />
      </div>

      {/* Listado de Tarjetas de Producto */}
      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
        {datosAMostrar.map((prod) => (
          <div className="col" key={prod.id}>
            <div className="card h-100 shadow-sm border-0 overflow-hidden">
              <div className="position-relative">
                <img 
                  src={prod.foto || 'https://via.placeholder.com/300x200?text=Sin+Imagen'} 
                  className="card-img-top" 
                  alt={prod.nombre}
                  style={{ height: '200px', objectFit: 'cover' }}
                />
                <div className="position-absolute bottom-0 start-0 w-100 p-3 bg-dark bg-opacity-50">
                  <h5 className="card-title text-white mb-0">{prod.nombre}</h5>
                </div>
              </div>

              <div className="card-body">
                {/* Visualización de Categorías */}
                <div className="mb-3">
                  {prod.producto_categoria?.map((rel, idx) => (
                    <span key={idx} className="badge bg-primary me-1 fw-normal">
                      {rel.categorias?.nombre}
                    </span>
                  ))}
                </div>

                <p className="card-text text-muted small mb-3">
                  {prod.descripcion || 'Sin descripción disponible.'}
                </p>

                <hr className="my-3 opacity-25" />

                {/* Listado de Tarifas del Producto */}
                <div className="tarifas-section">
                  <h6 className="fw-bold mb-2 small"><i className="bi bi-tag-fill me-2"></i>Tarifas:</h6>
                  <div className="list-group list-group-flush border rounded">
                    {prod.tarifas?.length > 0 ? (
                      prod.tarifas.map((t, idx) => (
                        <div key={idx} className="list-group-item d-flex justify-content-between align-items-center py-1 px-2 border-0">
                          <span className="small text-secondary" style={{ fontSize: '0.75rem' }}>
                            {t.fecha_desde} - {t.fecha_hasta}
                          </span>
                          <span className="fw-bold text-success">{t.precio}€</span>
                        </div>
                      ))
                    ) : (
                      <div className="list-group-item text-muted small py-1">Sin tarifas</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="card-footer bg-white border-top-0 d-flex gap-2 pb-3">
                <button className="btn btn-outline-primary btn-sm w-100" onClick={() => openEditForm(prod)}>
                  <i className="bi bi-pencil me-1"></i> Editar
                </button>
                <button className="btn btn-outline-danger btn-sm" onClick={() => deleteProducto(prod.id)}>
                  <i className="bi bi-trash"></i>Borrar
                </button>
              </div>
            </div>
          </div>
        ))}
        <div className="d-flex justify-content-between align-items-center mb-4">
  <div>
    <h2 className="fw-bold">Productos</h2>
    <p className="text-muted">Gestiona el inventario de tu tienda.</p>
  </div>
  <div className="d-flex gap-2">
    {/* Botón Excel */}
    <button className="btn btn-outline-success shadow-sm" onClick={exportarExcel}>
      <i className="bi bi-file-earmark-excel me-2"></i> Excel
    </button>
    
    {/* Botón PDF */}
    <button className="btn btn-outline-danger shadow-sm" onClick={exportarPDF}>
      <i className="bi bi-file-earmark-pdf me-2"></i> PDF
    </button>

    {/* Botón Nuevo (el que ya tenías) */}
    <button className="btn btn-success shadow-sm" onClick={() => setShowForm(true)}>
      <i className="bi bi-box-seam me-2"></i> Nuevo Producto
    </button>
  </div>
</div>
      </div>

      {/* MENÚ LATERAL (OFFCANVAS) */}
      <div className={`offcanvas offcanvas-end ${showForm ? 'show' : ''}`} style={{ visibility: showForm ? 'visible' : 'hidden', width: '400px' }}>
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title">{editMode ? 'Editar Producto' : 'Añadir Producto'}</h5>
          <button type="button" className="btn-close" onClick={closeForm}></button>
        </div>
        <div className="offcanvas-body">
          <form onSubmit={handleGuardar}>
            {/* Campo Nombre */}
            <div className="mb-3">
              <label className="form-label fw-bold">Nombre</label>
              <input 
                type="text" 
                className="form-control" 
                value={nuevoProd.nombre} 
                onChange={(e) => setNuevoProd({...nuevoProd, nombre: e.target.value})} 
                required 
              />
            </div>

            {/* Selector de Categorías Multi-selección */}
            <div className="mb-3">
              <label className="form-label fw-bold text-secondary">Categorías</label>
              <Multiselect
                options={listaCategorias}
                selectedValues={listaCategorias.filter(c => nuevoProd.id_categoria?.includes(c.id))}
                onSelect={(selectedList) => {
                  const ids = selectedList.map(item => item.id);
                  setNuevoProd({ ...nuevoProd, id_categoria: ids });
                }}
                onRemove={(selectedList) => {
                  const ids = selectedList.map(item => item.id);
                  setNuevoProd({ ...nuevoProd, id_categoria: ids });
                }}
                displayValue="nombre"
                placeholder="Seleccionar..."
                style={{
                  chips: { background: '#0d6efd' },
                  searchBox: { borderRadius: '0.375rem' }
                }}
              />
            </div>

            {/* Subida de Imagen */}
            <div className="mb-3">
                <label className="form-label fw-bold">Imagen del producto</label>
                <input 
                  type="file" 
                  className="form-control" 
                  accept="image/*" 
                  onChange={(e) => setArchivo(e.target.files[0])} 
                />
            </div>

            <hr className="my-4" />
            
            {/* Sección de Tarifas */}
            <h6 className="fw-bold mb-3">Gestión de Tarifas</h6>
            <div className="card bg-light border-0 p-3 mb-3">
              <div className="row g-2">
                <div className="col-6">
                  <label className="small fw-bold">Inicio</label>
                  <input 
                    type="date" 
                    className="form-control form-control-sm" 
                    value={nuevaTarifa.fecha_inicio}
                    onChange={(e) => setNuevaTarifa({...nuevaTarifa, fecha_inicio: e.target.value})}
                  />
                </div>
                <div className="col-6">
                  <label className="small fw-bold">Fin</label>
                  <input 
                    type="date" 
                    className="form-control form-control-sm" 
                    value={nuevaTarifa.fecha_fin}
                    onChange={(e) => setNuevaTarifa({...nuevaTarifa, fecha_fin: e.target.value})}
                    min={nuevaTarifa.fecha_inicio}
                  />
                </div>
                <div className="col-8">
                  <label className="small fw-bold">Precio (€)</label>
                  <input 
                    type="number" 
                    className="form-control form-control-sm" 
                    value={nuevaTarifa.precio}
                    onChange={(e) => setNuevaTarifa({...nuevaTarifa, precio: e.target.value})}
                  />
                </div>
                <div className="col-4 d-flex align-items-end">
                  <button type="button" className="btn btn-primary btn-sm w-100" onClick={agregarTarifa}>
                    Añadir
                  </button>
                </div>
              </div>
            </div>

            {/* Tabla resumida de tarifas en el formulario */}
            <div className="table-responsive mb-3">
              <table className="table table-sm table-bordered bg-white">
                <thead className="table-light small">
                  <tr>
                    <th>Rango</th>
                    <th>Precio</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="small">
                  {nuevoProd.tarifas.map((t, index) => (
                    <tr key={index}>
                      <td>{t.fecha_inicio} / {t.fecha_fin}</td>
                      <td>{t.precio}€</td>
                      <td className="text-center">
                        <button type="button" className="btn btn-link text-danger p-0" onClick={() => eliminarTarifa(index)}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
           
            <div className="mb-3">
              <label className="form-label fw-bold">Descripción</label>
              <textarea 
                className="form-control" 
                rows="3" 
                value={nuevoProd.descripcion} 
                onChange={(e) => setNuevoProd({...nuevoProd, descripcion: e.target.value})}
              ></textarea>
            </div>

            <button type="submit" className="btn btn-success w-100 py-2" disabled={loading}>
              {loading ? 'Guardando...' : editMode ? 'Actualizar Producto' : 'Guardar Producto'}
            </button>
          </form>
        </div>
      </div>
      
      {/* Fondo oscuro cuando el menú está abierto */}
      {showForm && <div className="offcanvas-backdrop fade show" onClick={closeForm}></div>}
    </div>
  );
};

export default Productos;