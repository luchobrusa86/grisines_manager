import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Calendar, 
  RefreshCw, 
  Trash2, 
  Receipt,
  CircleDollarSign
} from 'lucide-react';

export const ListadoGastos = () => {
  const [gastos, setGastos] = useState<any[]>([]);
  const [filtro, setFiltro] = useState('');

  // --- LÓGICA DE FECHAS AUTOMÁTICAS PARA EL MES EN CURSO ---
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const ultimoDiaMes = new Date(anio, hoy.getMonth() + 1, 0).getDate();

  const fechaInicioMes = `${anio}-${mes}-01`;
  const fechaFinMes = `${anio}-${mes}-${String(ultimoDiaMes).padStart(2, '0')}`;

  const [fechaDesde, setFechaDesde] = useState(fechaInicioMes);
  const [fechaHasta, setFechaHasta] = useState(fechaFinMes);

  const cargarGastos = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/gastos/');
      const data = await res.json();
      setGastos(data);
    } catch (err) {
      console.error('Error cargando gastos', err);
    }
  };

  useEffect(() => {
    cargarGastos();
  }, []);

  const anularGasto = async (gastoId: number) => {
    if (!window.confirm("ATENCIÓN: ¿Estás seguro de que querés anular este gasto?\nSe eliminará del historial y de los cálculos del tablero.")) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/gastos/${gastoId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        cargarGastos(); 
      } else {
        alert("Hubo un problema al anular el gasto.");
      }
    } catch (e) {
      alert("Error de conexión al intentar anular el gasto.");
    }
  };

  // --- FILTRO COMBINADO (TEXTO + FECHAS) ---
  const gastosFiltrados = useMemo(() => {
    return gastos.filter(g => {
      const desc = g.descripcion || '';
      const prov = g.proveedor || '';
      const cat = g.categoria || '';
      const matchTexto = 
        desc.toLowerCase().includes(filtro.toLowerCase()) ||
        prov.toLowerCase().includes(filtro.toLowerCase()) ||
        cat.toLowerCase().includes(filtro.toLowerCase());

      let matchFecha = true;
      let fechaGastoObj = new Date();
      
      if (g.fecha && g.fecha.includes('/')) {
        const partes = g.fecha.split('/');
        if (partes.length === 3) {
           fechaGastoObj = new Date(`${partes[2]}-${partes[1]}-${partes[0]}T12:00:00`);
        }
      }

      if (fechaDesde) {
        const desde = new Date(fechaDesde + 'T00:00:00');
        if (fechaGastoObj < desde) matchFecha = false;
      }
      if (fechaHasta) {
        const hasta = new Date(fechaHasta + 'T23:59:59');
        if (fechaGastoObj > hasta) matchFecha = false;
      }

      return matchTexto && matchFecha;
    });
  }, [gastos, filtro, fechaDesde, fechaHasta]);

  // --- CÁLCULO DEL TOTAL DINÁMICO ---
  const totalGastos = useMemo(() => {
    return gastosFiltrados.reduce((acc, curr) => acc + Number(curr.monto || 0), 0);
  }, [gastosFiltrados]);

  return (
    <section className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-gray-900 font-sans">
      
      {/* Caja Contenedora con espaciado optimizado */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
        
        {/* Fila Superior */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100/50 flex-shrink-0">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-0.5">Registro Histórico</p>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 whitespace-nowrap">
                Listado de Gastos y Compras
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 px-4 py-2 rounded-full">
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Total:</span>
              <span className="text-base font-black text-rose-700 tracking-tight">
                ${totalGastos.toLocaleString('es-AR', {minimumFractionDigits: 2})}
              </span>
            </div>

            <button 
              onClick={cargarGastos} 
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 shadow-sm"
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
              placeholder="Buscar por categoría, proveedor o descripción..."
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

      {/* Tabla Principal */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[10%]">Fecha</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[15%]">Categoría</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[20%]">Proveedor</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[25%]">Descripción</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[15%]">Medio de Pago</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right w-[10%]">Monto</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-[5%]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {gastosFiltrados.map(g => (
                <tr key={g.id} className="hover:bg-gray-50 transition-colors duration-150 group">
                  <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm font-semibold text-gray-600">{g.fecha}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">{g.categoria}</span></td>
                  <td className="px-6 py-4"><span className="text-sm font-bold text-gray-900">{g.proveedor || '-'}</span></td>
                  <td className="px-6 py-4"><span className="text-sm font-medium text-gray-600">{g.descripcion}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm font-semibold text-gray-500">{g.medio_pago}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right"><span className="text-base font-extrabold tracking-tight text-red-600">${Number(g.monto || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button onClick={() => anularGasto(g.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};