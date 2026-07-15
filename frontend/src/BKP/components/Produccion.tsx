import { useState, useEffect } from 'react';
import { ChefHat, Package, Plus, Trash2, Calendar, Search, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';


const primerDiaMesActual = () => {
  const hoy = new Date();
  const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  return primerDia.toISOString().slice(0, 10);
};

const ultimoDiaMesActual = () => {
  const hoy = new Date();
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  return ultimoDia.toISOString().slice(0, 10);
};

const convertirFechaProduccion = (fecha: string) => {
  if (!fecha) return null;

  // Si viene como DD/MM/YYYY
  if (fecha.includes('/')) {
    const [dia, mes, anio] = fecha.split('/');
    if (!dia || !mes || !anio) return null;
    return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }

  // Si ya viene como fecha ISO o datetime
  if (fecha.includes('-')) {
    return fecha.slice(0, 10);
  }

  return null;
};


export const Produccion = () => {
  const [productos, setProductos] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState(primerDiaMesActual());
  const [fechaHasta, setFechaHasta] = useState(ultimoDiaMesActual());
  
  // Estados del Formulario
  const [idProducto, setIdProducto] = useState('');
  const [cajas, setCajas] = useState('');
  const [paquetesSueltos, setPaquetesSueltos] = useState('');

  const cargarDatos = async () => {
    try {
      const [resProd, resHist] = await Promise.all([
        fetch(`${API_URL}/productos/`),
        fetch(`${API_URL}/produccion/`)
      ]);
      const dataProd = await resProd.json();
      const dataHist = await resHist.json();
      
      setProductos(dataProd.filter((p: any) => p.codigo !== '999' && !p.descripcion.toLowerCase().includes('envase')));
      setHistorial(dataHist);
    } catch (err) {
      console.error('Error cargando datos de producción', err);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Cálculo en tiempo real del formulario
  const totalPaquetesCalculados = (Number(cajas) * 12) + Number(paquetesSueltos);

  const historialFiltrado = historial.filter((h) => {
    const texto = `${h.fecha || ''} ${h.producto_desc || ''} ${h.producto_codigo || ''} ${h.cajas || ''} ${h.paquetes || ''} ${h.total_paquetes || ''}`.toLowerCase();
    const coincideBusqueda = texto.includes(busqueda.trim().toLowerCase());

    const fechaRegistro = convertirFechaProduccion(h.fecha || '');
    const coincideDesde = !fechaDesde || (fechaRegistro && fechaRegistro >= fechaDesde);
    const coincideHasta = !fechaHasta || (fechaRegistro && fechaRegistro <= fechaHasta);

    return coincideBusqueda && coincideDesde && coincideHasta;
  });

  const totalPaquetesFiltrado = historialFiltrado.reduce((acc, h) => {
    const cajasReg = Number(h.cajas || 0);
    const paquetesReg = Number(h.paquetes || 0);
    const totalReg = h.total_paquetes !== undefined && h.total_paquetes !== null
      ? Number(h.total_paquetes || 0)
      : (cajasReg * 12) + paquetesReg;

    return acc + totalReg;
  }, 0);

  const limpiarFiltros = () => {
    setBusqueda('');
    setFechaDesde(primerDiaMesActual());
    setFechaHasta(ultimoDiaMesActual());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idProducto) {
      alert('Por favor, selecciona un producto.');
      return;
    }
    if (Number(cajas) <= 0 && Number(paquetesSueltos) <= 0) {
      alert('Debes ingresar al menos 1 caja o 1 paquete suelto.');
      return;
    }

    // Buscamos el producto seleccionado para enviarle el código y la descripción al backend
    const prodSeleccionado = productos.find(p => String(p.codigo) === String(idProducto));

    try {
      const res = await fetch(`${API_URL}/produccion/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_codigo: prodSeleccionado?.codigo || '',
          producto_desc: prodSeleccionado?.descripcion || '',
          cajas: Number(cajas || 0),
          paquetes: Number(paquetesSueltos || 0),
          total_paquetes: totalPaquetesCalculados
        })
      });

      if (res.ok) {
        setIdProducto('');
        setCajas('');
        setPaquetesSueltos('');
        cargarDatos();
      } else {
        alert('Hubo un error al registrar la producción.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const eliminarRegistro = async (id: number) => {
    if (!window.confirm('¿Estás seguro de eliminar este registro de producción?\nSe descontará del stock actual.')) return;
    
    try {
      const res = await fetch(`${API_URL}/produccion/${id}`, { method: 'DELETE' });
      if (res.ok) cargarDatos();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <section className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-gray-900 font-sans">
      
      {/* CARD DE REGISTRO */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
        <div className="flex items-center gap-3.5 border-b border-gray-100 pb-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100/50 flex-shrink-0">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-0.5">Ingreso Manual</p>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 whitespace-nowrap">
              Registrar Producción Diaria
            </h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row items-end gap-4 w-full">
          <div className="w-full lg:flex-[2]">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Producto Fabricado</label>
            <select
              value={idProducto}
              onChange={e => setIdProducto(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
            >
              <option value="">Seleccionar grisín...</option>
              {productos.map(p => (
                <option key={p.codigo} value={p.codigo}>{p.descripcion}</option>
              ))}
            </select>
          </div>

          <div className="w-full lg:flex-1">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Cajas (x12)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Package className="w-4 h-4" /></span>
              <input
                type="number"
                placeholder="0"
                value={cajas}
                onChange={e => setCajas(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:bg-white focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="w-full lg:flex-1">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Paq. Sueltos</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Package className="w-4 h-4" /></span>
              <input
                type="number"
                placeholder="0"
                value={paquetesSueltos}
                onChange={e => setPaquetesSueltos(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:bg-white focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="w-full lg:w-44 bg-blue-50/60 border border-blue-100 rounded-xl p-2 text-center flex flex-col justify-center h-[38px] lg:h-[40px]">
            <span className="block text-[9px] font-bold text-blue-500 uppercase tracking-wider">Total Paquetes</span>
            <strong className="text-base font-black text-blue-700 font-mono">{totalPaquetesCalculados}</strong>
          </div>

          <button
            type="submit"
            className="w-full lg:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 h-[38px] lg:h-[40px]"
          >
            <Plus className="w-4 h-4" />
            Ingresar
          </button>
        </form>
      </div>

      {/* TABLA HISTÓRICA CON MAPEO DIRECTO DE BASE DE DATOS */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-0.5">Registro Histórico</p>
              <h3 className="text-base sm:text-lg font-black text-gray-900 tracking-tight m-0">Historial Reciente de Elaboración</h3>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 self-start lg:self-auto">
              <Package className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Total filtrado:</span>
              <strong className="text-sm font-black font-mono">{totalPaquetesFiltrado}</strong>
              <span className="text-[10px] font-bold text-blue-500 uppercase">paq.</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por producto, código o cantidad..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full lg:w-44 pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full lg:w-44 pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>

            <button
              type="button"
              onClick={limpiarFiltros}
              className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
            >
              <X className="w-4 h-4" />
              Limpiar
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200">
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-[20%]">Fecha / Hora</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-[35%]">Producto</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-[15%]">Cajas (x12)</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-[15%]">Paq. Sueltos</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right w-[10%]">Total Paquetes</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-[5%]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {historialFiltrado.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <Calendar className="w-10 h-10 mb-3 text-gray-300" />
                      <p className="text-xs font-medium text-gray-500">
                        {historial.length === 0 ? 'No hay registros de producción cargados.' : 'No se encontraron registros con los filtros aplicados.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                historialFiltrado.map(h => {
                  // Mapeo exacto de las columnas de tu base de datos Postgre
                  const fechaFinal = h.fecha || 'Sin Fecha';
                  const productoFinal = h.producto_desc || 'Grisín Desconocido';
                  const numCajas = h.cajas !== undefined ? h.cajas : 0;
                  const numSueltos = h.paquetes !== undefined ? h.paquetes : 0;
                  const totalUnidades = h.total_paquetes !== undefined ? h.total_paquetes : ((numCajas * 12) + numSueltos);

                  return (
                    <tr key={h.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-600">{fechaFinal}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-gray-900">{productoFinal}</span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className="text-sm font-bold font-mono text-gray-700">{numCajas}</span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className="text-sm font-bold font-mono text-gray-700">{numSueltos}</span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <span className="text-base font-black text-blue-600 font-mono">{totalUnidades}</span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => eliminarRegistro(h.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Eliminar Registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};