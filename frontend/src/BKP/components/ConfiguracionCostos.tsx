import { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  Plus, 
  Trash2, 
  Edit2, 
  PackageSearch, 
  HardHat, 
  Zap, 
  ScrollText, 
  TrendingUp, 
  Banknote 
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const ConfiguracionCostos = () => {
  const [config, setConfig] = useState<any>({ insumos: [], servicios: [], empleados: [], receta: [] });
  const [parametros, setParametros] = useState({ precio_paquete: 0, cajas_semana_objetivo: 90 });
  const [loading, setLoading] = useState(true);

  // Formularios de Creación
  const [formInsumo, setFormInsumo] = useState({ nombre: '', cantidad: '', unidad: 'Kg', costo: '', stock_actual: '' });
  const [formServicio, setFormServicio] = useState({ nombre: '' });
  const [formEmpleado, setFormEmpleado] = useState({ nombre: '', sueldo: '' });
  const [formReceta, setFormReceta] = useState({ insumo_id: '', cantidad_usada: '' });

  // Estado Edición
  const [editando, setEditando] = useState<{ tipo: string, id: number } | null>(null);
  const [formEdicion, setFormEdicion] = useState<any>({});

  const cargarDatos = async () => {
    try {
      const res = await fetch(`${API_URL}/configuracion/`);
      const data = await res.json();
      setConfig(data);
      setParametros(data.parametros);
      setLoading(false);
    } catch (error) { console.error(error); }
  };

  useEffect(() => { cargarDatos(); }, []);

  const agregarItem = async (tipo: string, payload: any, setter: any, defaultState: any) => {
    if (tipo !== 'receta' && !payload.nombre) return;
    if (tipo === 'receta' && (!payload.insumo_id || !payload.cantidad_usada)) return;
    
    await fetch(`${API_URL}/configuracion/${tipo}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    setter(defaultState);
    cargarDatos();
  };

  const borrarItem = async (tipo: string, id: number) => {
    if (!window.confirm("¿Estás seguro de borrar este registro?")) return;
    await fetch(`${API_URL}/configuracion/${tipo}/${id}`, { method: 'DELETE' });
    cargarDatos();
  };

  const iniciarEdicion = (tipo: string, item: any) => {
    setEditando({ tipo, id: item.id });
    setFormEdicion({ ...item });
  };

  const guardarEdicion = async (tipo: string, id: number) => {
    const payload = tipo === 'servicios'
      ? { nombre: formEdicion.nombre, valor: 0 }
      : formEdicion;

    await fetch(`${API_URL}/configuracion/${tipo}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    setEditando(null);
    setFormEdicion({});
    cargarDatos();
  };

  const guardarParametros = async () => {
    await fetch(`${API_URL}/configuracion/parametros/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parametros)
    });
    alert('✅ Parámetros maestros guardados');
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
      <Settings className="w-10 h-10 animate-spin mb-4 text-gray-300" />
      <p className="text-sm font-medium">Cargando central de costos...</p>
    </div>
  );

  const costoTotalReceta = config.receta.reduce((total: number, r: any) => {
    const unitPrice = r.insumo_costo / (r.insumo_cantidad || 1);
    return total + (unitPrice * r.cantidad_usada);
  }, 0);

  const paquetesProyectados = parametros.cajas_semana_objetivo * 12;
  const facturacionProyectada = paquetesProyectados * parametros.precio_paquete;
  const multiplicadorAmasijos = parametros.cajas_semana_objetivo / 30; 
  const costoMateriaPrimaProyectado = costoTotalReceta * multiplicadorAmasijos;

  // Clases compartidas
  const inputClass = "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all";
  const inputClassSm = "w-full px-2 py-1.5 bg-white border border-blue-300 rounded-md text-xs text-gray-900 focus:ring-2 focus:ring-blue-500/20 outline-none";

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 space-y-6 text-gray-900 font-sans">
      
      {/* SECCIÓN 1: PARÁMETROS MAESTROS */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border-b border-gray-100 bg-gray-50/50 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-xl text-slate-600"><Settings className="w-5 h-5" /></div>
            <h2 className="text-lg font-extrabold tracking-tight text-gray-900 uppercase">Parámetros Maestros</h2>
          </div>
          <button 
            onClick={guardarParametros} 
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-full hover:bg-slate-800 transition-all shadow-sm active:scale-95 w-full sm:w-auto justify-center"
          >
            <Save className="w-4 h-4" /> Guardar Cambios
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Precio Sugerido (por Paquete)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                <input 
                  type="number" 
                  className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  value={parametros.precio_paquete} 
                  onChange={e => setParametros({...parametros, precio_paquete: Number(e.target.value)})} 
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Objetivo Semanal (Cajas)</label>
              <div className="relative">
                <PackageSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="number" 
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  value={parametros.cajas_semana_objetivo} 
                  onChange={e => setParametros({...parametros, cajas_semana_objetivo: Number(e.target.value)})} 
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col justify-center p-5 bg-white border border-gray-100 rounded-xl shadow-sm">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                <TrendingUp className="w-3 h-3" /> Facturación Proyectada
              </span>
              <div className="text-2xl font-black text-gray-900 tracking-tight">
                ${facturacionProyectada.toLocaleString('es-AR', {minimumFractionDigits: 2})}
              </div>
              <span className="text-xs font-medium text-gray-400 mt-1">Ingreso bruto por {paquetesProyectados} paquetes</span>
            </div>
            
            <div className="flex flex-col justify-center p-5 bg-orange-50 border border-orange-100 rounded-xl shadow-sm">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-orange-600/80 uppercase tracking-wider mb-1">
                <Banknote className="w-3 h-3" /> Costo Materia Prima
              </span>
              <div className="text-2xl font-black text-orange-600 tracking-tight">
                ${costoMateriaPrimaProyectado.toLocaleString('es-AR', {minimumFractionDigits: 2})}
              </div>
              <span className="text-xs font-medium text-orange-400/80 mt-1">Inversión para {parametros.cajas_semana_objetivo} cajas</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 2: RECETA DIARIA */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden border-t-4 border-t-orange-500">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <ScrollText className="w-5 h-5 text-orange-500" />
            <h2 className="text-base font-extrabold text-gray-900 uppercase tracking-wide m-0">Receta del Amasijo <span className="text-gray-400 font-medium normal-case text-sm ml-2">(Rinde 38 Cajas)</span></h2>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 mb-6">
            <select 
              className={`${inputClass} flex-2 sm:min-w-[200px]`} 
              value={formReceta.insumo_id} 
              onChange={e => setFormReceta({...formReceta, insumo_id: e.target.value})}
            >
                <option value="">Seleccionar Insumo de BD...</option>
                {config.insumos.map((i: any) => <option key={i.id} value={i.id}>{i.nombre} (Miden en {i.unidad})</option>)}
            </select>
            <input 
              type="number" 
              placeholder="Cantidad que usás" 
              className={`${inputClass} flex-1`} 
              value={formReceta.cantidad_usada} 
              onChange={e => setFormReceta({...formReceta, cantidad_usada: e.target.value})} 
            />
            <button 
              className="flex-shrink-0 w-full sm:w-auto px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center" 
              onClick={() => agregarItem('receta', formReceta, setFormReceta, {insumo_id:'', cantidad_usada:''})}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Producto</th>
                  <th className="pb-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Cantidad Usada</th>
                  <th className="pb-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Costo Real</th>
                  <th className="pb-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {config.receta.map((r: any) => {
                  const costoUnitario = r.insumo_costo / (r.insumo_cantidad || 1);
                  const costoTotalLinea = costoUnitario * r.cantidad_usada;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="py-3 text-sm font-bold text-gray-800">{r.insumo_nombre}</td>
                      <td className="py-3 text-sm text-gray-600 text-right font-medium">{r.cantidad_usada} {r.insumo_unidad}</td>
                      <td className="py-3 text-sm font-bold text-orange-600 text-right">${costoTotalLinea.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                      <td className="py-3 text-right">
                        <button onClick={() => borrarItem('receta', r.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="pt-6 pb-2 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Total Materia Prima (Amasijo):</td>
                  <td className="pt-6 pb-2 text-right text-2xl font-black text-orange-600 tracking-tight">${costoTotalReceta.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* GRID INFERIOR: Insumos, Mano de Obra, Servicios */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* SECCIÓN 3: MATERIA PRIMA */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <PackageSearch className="w-5 h-5 text-slate-500" />
            <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide m-0">Insumos (Catálogo BD)</h2>
          </div>
          
          <div className="p-5 flex-1">
            <div className="flex flex-wrap gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100 mb-4">
              <input type="text" placeholder="Insumo..." className={`${inputClass} flex-[2_2_0%] min-w-[100px]`} value={formInsumo.nombre} onChange={e => setFormInsumo({...formInsumo, nombre: e.target.value})} />
              <div className="flex gap-2 flex-[3_3_0%] min-w-[150px]">
                <input type="number" placeholder="Cant." className={`${inputClass} w-16 px-2`} value={formInsumo.cantidad} onChange={e => setFormInsumo({...formInsumo, cantidad: e.target.value})} />
                <select className={`${inputClass} w-20 px-2`} value={formInsumo.unidad} onChange={e => setFormInsumo({...formInsumo, unidad: e.target.value})}>
                    <option value="Kg">Kg</option><option value="g">g</option><option value="L">L</option><option value="Un">Un</option>
                </select>
              </div>
              <div className="flex gap-2 w-full">
                <input type="number" placeholder="$ Costo" className={`${inputClass} flex-1`} value={formInsumo.costo} onChange={e => setFormInsumo({...formInsumo, costo: e.target.value})} />
                <input type="number" placeholder="Stock I." className={`${inputClass} flex-1 bg-amber-50 border-amber-200 focus:ring-amber-500/20 focus:border-amber-500`} value={formInsumo.stock_actual} onChange={e => setFormInsumo({...formInsumo, stock_actual: e.target.value})} />
                <button className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" onClick={() => agregarItem('insumos', formInsumo, setFormInsumo, {nombre:'', cantidad:'', unidad:'Kg', costo:'', stock_actual:''})}>
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-gray-100">
                        <th className="pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Detalle</th>
                        <th className="pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Costo</th>
                        <th className="pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right pr-2">Stock</th>
                        <th className="pb-2 w-14"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {config.insumos.map((i: any) => {
                    const c_unit = i.costo / (i.cantidad || 1);
                    return (
                      <tr key={i.id} className="hover:bg-gray-50/50 transition-colors group">
                        {editando?.tipo === 'insumos' && editando.id === i.id ? (
                          <>
                            <td className="py-2 pr-1">
                              <div className="flex flex-col gap-1">
                                <input className={inputClassSm} value={formEdicion.nombre} onChange={e => setFormEdicion({...formEdicion, nombre: e.target.value})} />
                                <div className="flex gap-1">
                                  <input type="number" className={`${inputClassSm} w-12`} value={formEdicion.cantidad} onChange={e => setFormEdicion({...formEdicion, cantidad: e.target.value})} />
                                  <span className="text-[10px] text-gray-400 self-center">{i.unidad}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-1 align-top"><input type="number" className={inputClassSm} value={formEdicion.costo} onChange={e => setFormEdicion({...formEdicion, costo: e.target.value})} /></td>
                            <td className="py-2 pl-1 align-top"><input type="number" className={`${inputClassSm} bg-amber-50`} value={formEdicion.stock_actual} onChange={e => setFormEdicion({...formEdicion, stock_actual: e.target.value})} /></td>
                            <td className="py-2 text-right align-top">
                              <button onClick={() => guardarEdicion('insumos', i.id)} className="p-1.5 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors"><Save className="w-3.5 h-3.5" /></button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2.5">
                              <span className="block text-sm font-bold text-gray-800">{i.nombre}</span>
                              <span className="text-[10px] text-gray-400 font-medium">({i.cantidad} {i.unit || i.unidad})</span>
                            </td>
                            <td className="py-2.5 text-right">
                              <span className="block text-sm font-bold text-gray-900">${i.costo.toLocaleString('es-AR')}</span>
                              <span className="text-[10px] text-gray-400 font-medium">${c_unit.toFixed(2)} / {i.unidad}</span>
                            </td>
                            <td className="py-2.5 text-right pr-2">
                                <span className={`text-sm font-black ${i.stock_actual <= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                  {i.stock_actual}
                                </span>
                                <span className="text-[10px] text-gray-400 ml-1">{i.unidad}</span>
                            </td>
                            <td className="py-2.5 text-right">
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => iniciarEdicion('insumos', i)} className="p-1 text-gray-400 hover:text-blue-600 bg-white rounded shadow-sm border border-gray-100"><Edit2 className="w-3 h-3" /></button>
                                <button onClick={() => borrarItem('insumos', i.id)} className="p-1 text-gray-400 hover:text-red-600 bg-white rounded shadow-sm border border-gray-100"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECCIÓN 4: MANO DE OBRA */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <HardHat className="w-5 h-5 text-blue-500" />
            <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide m-0">Mano de Obra</h2>
          </div>
          
          <div className="p-5 flex-1">
            <div className="flex gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100 mb-4">
              <input type="text" placeholder="Empleado..." className={`${inputClass} flex-2`} value={formEmpleado.nombre} onChange={e => setFormEmpleado({...formEmpleado, nombre: e.target.value})} />
              <input type="number" placeholder="$ Sueldo" className={`${inputClass} flex-1`} value={formEmpleado.sueldo} onChange={e => setFormEmpleado({...formEmpleado, sueldo: e.target.value})} />
              <button className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0" onClick={() => agregarItem('empleados', formEmpleado, setFormEmpleado, {nombre:'', sueldo:''})}>
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <tbody className="divide-y divide-gray-50">
                  {config.empleados.map((e: any) => (
                    <tr key={e.id} className="hover:bg-gray-50/50 transition-colors group">
                      {editando?.tipo === 'empleados' && editando.id === e.id ? (
                        <>
                          <td className="py-2 pr-1"><input className={inputClassSm} value={formEdicion.nombre} onChange={ev => setFormEdicion({...formEdicion, nombre: ev.target.value})} /></td>
                          <td className="py-2 px-1"><input type="number" className={inputClassSm} value={formEdicion.sueldo} onChange={ev => setFormEdicion({...formEdicion, sueldo: ev.target.value})} /></td>
                          <td className="py-2 text-right"><button onClick={() => guardarEdicion('empleados', e.id)} className="p-1.5 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors"><Save className="w-3.5 h-3.5" /></button></td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 text-sm font-bold text-gray-800">{e.nombre}</td>
                          <td className="py-3 text-sm font-bold text-gray-900 text-right">${e.sueldo.toLocaleString('es-AR')}</td>
                          <td className="py-3 text-right w-14">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => iniciarEdicion('empleados', e)} className="p-1 text-gray-400 hover:text-blue-600 bg-white rounded shadow-sm border border-gray-100"><Edit2 className="w-3 h-3" /></button>
                                <button onClick={() => borrarItem('empleados', e.id)} className="p-1 text-gray-400 hover:text-red-600 bg-white rounded shadow-sm border border-gray-100"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECCIÓN 5: SERVICIOS */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-500" />
            <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide m-0">ABM de Servicios</h2>
          </div>

          <div className="px-5 pt-4">
            <p className="text-xs text-gray-500 leading-relaxed bg-emerald-50 border border-emerald-100 rounded-xl p-3">
              Este catálogo solo define los tipos de servicios. El importe real se carga después desde Registrar Gasto / Compra, con su fecha correspondiente.
            </p>
          </div>

          <div className="p-5 flex-1">
            <div className="flex gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100 mb-4">
              <input
                type="text"
                placeholder="Luz, Gas, Agua, Internet..."
                className={`${inputClass} flex-1`}
                value={formServicio.nombre}
                onChange={e => setFormServicio({ ...formServicio, nombre: e.target.value })}
              />

              <button
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                onClick={() => agregarItem('servicios', { nombre: formServicio.nombre.trim(), valor: 0 }, setFormServicio, { nombre: '' })}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <tbody className="divide-y divide-gray-50">
                  {config.servicios.map((s: any) => (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors group">
                      {editando?.tipo === 'servicios' && editando.id === s.id ? (
                        <>
                          <td className="py-2 pr-1">
                            <input
                              className={inputClassSm}
                              value={formEdicion.nombre}
                              onChange={ev => setFormEdicion({ ...formEdicion, nombre: ev.target.value })}
                            />
                          </td>
                          <td className="py-2 text-right w-14">
                            <button
                              onClick={() => guardarEdicion('servicios', s.id)}
                              className="p-1.5 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 text-sm font-bold text-gray-800">{s.nombre}</td>
                          <td className="py-3 text-right w-14">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => iniciarEdicion('servicios', s)} className="p-1 text-gray-400 hover:text-blue-600 bg-white rounded shadow-sm border border-gray-100">
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button onClick={() => borrarItem('servicios', s.id)} className="p-1 text-gray-400 hover:text-red-600 bg-white rounded shadow-sm border border-gray-100">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};