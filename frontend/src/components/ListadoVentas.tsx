import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Calendar, 
  RefreshCw, 
  FileText, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  FileDigit, 
  ReceiptText,
  Package
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const ListadoVentas = () => {
  const [ventas, setVentas] = useState<any[]>([]);
  const [filtro, setFiltro] = useState('');
  const [detallesCargados, setDetallesCargados] = useState<{ [key: number]: any[] }>({});
  const [expandida, setExpandida] = useState<number | null>(null);
  const [totalPaquetesVendidos, setTotalPaquetesVendidos] = useState(0);
  const [cargandoTotalPaquetes, setCargandoTotalPaquetes] = useState(false);

  // --- LÓGICA DE FECHAS AUTOMÁTICAS PARA EL MES EN CURSO ---
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const ultimoDiaMes = new Date(anio, hoy.getMonth() + 1, 0).getDate();

  const fechaInicioMes = `${anio}-${mes}-01`;
  const fechaFinMes = `${anio}-${mes}-${String(ultimoDiaMes).padStart(2, '0')}`;

  const [fechaDesde, setFechaDesde] = useState(fechaInicioMes);
  const [fechaHasta, setFechaHasta] = useState(fechaFinMes);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const cargarVentas = async () => {
    try {
      const res = await fetch(`${API_URL}/ventas/`);
      const data = await res.json();
      setVentas(data);
    } catch (err) {
      console.error('Error cargando ventas', err);
    }
  };


  const cargarTotalPaquetesVendidos = async () => {
    setCargandoTotalPaquetes(true);

    try {
      const params = new URLSearchParams();

      if (fechaDesde) params.set('desde', fechaDesde);
      if (fechaHasta) params.set('hasta', fechaHasta);
      if (filtro.trim()) params.set('buscar', filtro.trim());

      const res = await fetch(
        `${API_URL}/ventas/resumen-filtrado?${params.toString()}`
      );

      if (!res.ok) {
        throw new Error('No se pudo calcular el total de paquetes vendidos');
      }

      const data = await res.json();
      setTotalPaquetesVendidos(
        Number(data.total_paquetes_vendidos || 0)
      );
    } catch (err) {
      console.error('Error cargando total de paquetes vendidos', err);
      setTotalPaquetesVendidos(0);
    } finally {
      setCargandoTotalPaquetes(false);
    }
  };

  const actualizarTodo = async () => {
    await Promise.all([
      cargarVentas(),
      cargarTotalPaquetesVendidos()
    ]);
  };

  useEffect(() => {
    cargarVentas();
  }, []);

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      void cargarTotalPaquetesVendidos();
    }, 250);

    return () => window.clearTimeout(temporizador);
  }, [fechaDesde, fechaHasta, filtro]);

  const verDetalles = async (id: number) => {
    if (expandida === id) {
      setExpandida(null);
      return;
    }
    if (!detallesCargados[id]) {
      try {
        const res = await fetch(`${API_URL}/ventas/${id}/detalles`);
        const data = await res.json();
        setDetallesCargados({ ...detallesCargados, [id]: data });
      } catch (err) {
        console.error('Error cargando detalles', err);
      }
    }
    setExpandida(id);
  };

  const descargarPDF = (id: number) => {
    window.open(`${API_URL}/ventas/${id}/pdf`, '_blank');
  };

  const anularVenta = async (id: number) => {
    if (!window.confirm("ATENCIÓN: ¿Estás seguro de anular esta venta interna?\n\nSe borrará del historial, se descontará la plata de la caja y la mercadería volverá automáticamente al stock.")) return;

    try {
      const res = await fetch(`${API_URL}/ventas/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await actualizarTodo();
      } else {
        const errorData = await res.json();
        alert(`No se pudo anular: ${errorData.detail || 'Error desconocido'}`);
      }
    } catch (e) {
      alert("Error de conexión al intentar anular la operación.");
    }
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ChevronDown className="w-4 h-4 text-gray-300 ml-1 inline-block" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-blue-600 ml-1 inline-block" /> 
      : <ChevronDown className="w-4 h-4 text-blue-600 ml-1 inline-block" />;
  };

  const ventasProcesadas = useMemo(() => {
    let filtradas = ventas.filter(v => {
      const razon = v.razon_social?.toLowerCase() || '';
      const cuit = v.cuit || '';
      const matchTexto = razon.includes(filtro.toLowerCase()) || cuit.includes(filtro);

      let matchFecha = true;
      const fechaVenta = new Date(v.fecha);
      
      if (fechaDesde) {
        const desde = new Date(fechaDesde + 'T00:00:00');
        if (fechaVenta < desde) matchFecha = false;
      }
      if (fechaHasta) {
        const hasta = new Date(fechaHasta + 'T23:59:59');
        if (fechaVenta > hasta) matchFecha = false;
      }

      return matchTexto && matchFecha;
    });

    if (sortConfig !== null) {
      filtradas.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === 'fecha') {
          valA = new Date(a.fecha).getTime();
          valB = new Date(b.fecha).getTime();
        } else if (sortConfig.key === 'razon_social') {
          valA = valA?.toLowerCase() || '';
          valB = valB?.toLowerCase() || '';
        } else if (sortConfig.key === 'nro_factura') {
          valA = Number(valA || 0);
          valB = Number(valB || 0);
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtradas;
  }, [ventas, filtro, fechaDesde, fechaHasta, sortConfig]);

  const { totalOficial, totalInterno } = useMemo(() => {
    let oficial = 0;
    let interno = 0;
    ventasProcesadas.forEach(v => {
      const esOficial = v.es_oficial ?? v.es_blanco ?? false;
      if (esOficial) {
        oficial += Number(v.total || 0);
      } else {
        interno += Number(v.total || 0);
      }
    });
    return { totalOficial: oficial, totalInterno: interno };
  }, [ventasProcesadas]);

  return (
    <section className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-gray-900 font-sans">
      
      {/* Contenedor Unificado e Idéntico al de Gastos */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
        
        {/* Fila Superior */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100/50 flex-shrink-0">
              <ReceiptText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-0.5">Registro Histórico</p>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 whitespace-nowrap">
                Comprobantes Emitidos
              </h2>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 self-end md:self-auto">
            <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 shadow-sm whitespace-nowrap">
              <Package className="w-4 h-4 text-blue-600" />
              <span className="text-[10px] font-black uppercase tracking-wider">
                Total filtrado:
              </span>
              <strong className="text-sm font-black font-mono">
                {cargandoTotalPaquetes
                  ? '...'
                  : totalPaquetesVendidos.toLocaleString('es-AR')}
              </strong>
              <span className="text-[10px] font-black uppercase">
                paq.
              </span>
            </div>

            <button 
              onClick={actualizarTodo} 
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
              Actualizar
            </button>
          </div>
        </div>

        {/* Fila Inferior */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="relative w-full lg:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por cliente o CUIT..."
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center justify-between sm:justify-start gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-bold text-gray-400 uppercase">Desde</span>
              </div>
              <input 
                type="date" 
                value={fechaDesde} 
                onChange={e => setFechaDesde(e.target.value)} 
                className="bg-transparent border-none text-sm font-semibold text-gray-800 outline-none focus:ring-0 p-0 ml-2 cursor-pointer" 
              />
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-bold text-gray-400 uppercase">Hasta</span>
              </div>
              <input 
                type="date" 
                value={fechaHasta} 
                onChange={e => setFechaHasta(e.target.value)} 
                className="bg-transparent border-none text-sm font-semibold text-gray-800 outline-none focus:ring-0 p-0 ml-2 cursor-pointer" 
              />
            </div>
          </div>
        </div>

      </div>

      {/* Tarjetas de Totales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center justify-between p-5 bg-emerald-50 border border-emerald-100 rounded-2xl">
          <div><span className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Total Oficial</span><h3 className="text-2xl font-black text-emerald-900 tracking-tight">${totalOficial.toLocaleString('es-AR', {minimumFractionDigits: 2})}</h3></div>
        </div>
        <div className="flex items-center justify-between p-5 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <div><span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Interno</span><h3 className="text-2xl font-black text-gray-900 tracking-tight">${totalInterno.toLocaleString('es-AR', {minimumFractionDigits: 2})}</h3></div>
        </div>
        <div className="flex items-center justify-between p-5 bg-blue-50 border border-blue-100 rounded-2xl">
          <div><span className="block text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Facturación Total</span><h3 className="text-2xl font-black text-blue-900 tracking-tight">${(totalOficial + totalInterno).toLocaleString('es-AR', {minimumFractionDigits: 2})}</h3></div>
        </div>
      </div>

      {/* Tabla de Comprobantes */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200">
                <th onClick={() => requestSort('fecha')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">Fecha <SortIcon columnKey="fecha" /></th>
                <th onClick={() => requestSort('nro_factura')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">Comprobante <SortIcon columnKey="nro_factura" /></th>
                <th onClick={() => requestSort('razon_social')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">Cliente / Razón Social <SortIcon columnKey="razon_social" /></th>
                <th onClick={() => requestSort('es_oficial')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">Tipo <SortIcon columnKey="es_oficial" /></th>
                <th onClick={() => requestSort('total')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none text-right">Total <SortIcon columnKey="total" /></th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ventasProcesadas.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                      <FileDigit className="w-12 h-12 mb-4 text-gray-300" />
                      <p className="text-sm font-medium text-gray-500">No se encontraron comprobantes en estas fechas.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                ventasProcesadas.map(v => {
                  const esOficial = v.es_oficial ?? v.es_blanco ?? false;
                  const comprobante = `${String(v.punto_venta || 0).padStart(4, '0')}-${String(v.nro_factura || 0).padStart(8, '0')}`;
                  const isExpanded = expandida === v.id;
                  return (
                    <React.Fragment key={v.id}>
                      <tr className={`group transition-colors duration-150 ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}>
                        <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm font-semibold text-gray-600">{new Date(v.fecha).toLocaleDateString('es-AR')}</span></td>
                        <td className="px-6 py-4 whitespace-nowrap"><span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-gray-100 text-gray-700 border border-gray-200">{comprobante}</span></td>
                        <td className="px-6 py-4"><div className="flex flex-col"><span className="text-sm font-bold text-gray-900">{v.razon_social}</span><span className="text-xs font-medium text-gray-500">CUIT: {v.cuit}</span></div></td>
                        <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase ${esOficial ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>{esOficial ? 'Oficial ARCA' : 'Interno'}</span></td>
                        <td className="px-6 py-4 whitespace-nowrap text-right"><span className={`text-base font-extrabold ${Number(v.total) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>${Number(v.total || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</span></td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => verDetalles(v.id)} className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${isExpanded ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{isExpanded ? 'Cerrar' : 'Ver detalle'}</button>
                            <button onClick={() => descargarPDF(v.id)} className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"><FileText className="w-4 h-4" /></button>
                            {!esOficial && <button onClick={() => anularVenta(v.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 bg-gray-50/50">
                            <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-sm">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-gray-100">
                                    <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cód.</th>
                                    <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Descripción</th>
                                    <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Cant. / Unidad</th>
                                    <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Precio U.</th>
                                    <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">IVA</th>
                                    <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                  {detallesCargados[v.id]?.map((d, i) => (
                                    <tr key={i}>
                                      <td className="px-4 py-2 text-xs text-gray-500">{d.grid}</td>
                                      <td className="px-4 py-2 text-xs font-bold text-gray-800">{d.descripcion}</td>
                                      <td className="px-4 py-2 text-center"><span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-bold">{d.cantidad} {d.unidad}</span></td>
                                      <td className="px-4 py-2 text-xs text-right">${d.precio_unitario}</td>
                                      <td className="px-4 py-2 text-center text-xs">{d.iva}%</td>
                                      <td className="px-4 py-2 text-sm font-bold text-right">${d.cantidad * d.precio_unitario}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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