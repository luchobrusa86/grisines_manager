import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit2, 
  Trash2, 
  Save, 
  BookUser, 
  Receipt, 
  Package, 
  Plus, 
  X, 
  ChevronDown, 
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCcw
} from 'lucide-react';

export const Clientes = () => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [cliActivo, setCliActivo] = useState<any>(null);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [estado, setEstado] = useState('idle');
  
  const [expandida, setExpandida] = useState<number | null>(null);

  const [formCli, setFormCli] = useState({ nombre: '', cuit: '', telefono: '' });
  
  const [formMov, setFormMov] = useState({ 
    tipo: 'cargo', 
    monto: '', 
    detalle: '',
    cantidadCajas: '',
    precioUnitario: ''
  });
  
  const [items, setItems] = useState<any[]>([]);

  // Estado para edición de cliente
  const [editandoCliId, setEditandoCliId] = useState<number | null>(null);
  const [nombreEditado, setNombreEditado] = useState('');

  const cargarDatosIniciales = async () => {
    try {
      const resCli = await fetch('http://127.0.0.1:8000/clientes_mayoristas/');
      setClientes(await resCli.json());

      const resProd = await fetch('http://127.0.0.1:8000/productos/');
      setProductos(await resProd.json());
    } catch (err) { console.error(err); }
  };

  const cargarMovimientos = async (id: number) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/clientes_mayoristas/${id}/movimientos/`);
      setMovimientos(await res.json());
      setExpandida(null); 
    } catch (err) { console.error(err); }
  };

  useEffect(() => { cargarDatosIniciales(); }, []);

  const seleccionarCli = (cli: any) => {
    if (editandoCliId === cli.id) return; 
    setCliActivo(cli);
    cargarMovimientos(cli.id);
  };

  const crearCliente = async () => {
    if (!formCli.nombre) return;
    setEstado('loading_cli');
    await fetch('http://127.0.0.1:8000/clientes_mayoristas/', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: formCli.nombre, cuit: formCli.cuit, telefono: formCli.telefono || '' })
    });
    setFormCli({ nombre: '', cuit: '', telefono: '' });
    
    const resCli = await fetch('http://127.0.0.1:8000/clientes_mayoristas/');
    setClientes(await resCli.json());
    setEstado('idle');
  };

  const eliminarCliente = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); 
    if (!window.confirm("ATENCIÓN: ¿Estás seguro de borrar este cliente? Se borrará todo su historial.")) return;
    
    try {
      await fetch(`http://127.0.0.1:8000/clientes_mayoristas/${id}`, { method: 'DELETE' });
      if (cliActivo?.id === id) setCliActivo(null); 
      cargarDatosIniciales();
    } catch (err) { console.error(err); }
  };

  const iniciarEdicionCliente = (e: React.MouseEvent, cli: any) => {
    e.stopPropagation();
    setEditandoCliId(cli.id);
    setNombreEditado(cli.nombre);
  };

  const guardarEdicionCliente = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await fetch(`http://127.0.0.1:8000/clientes_mayoristas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombreEditado })
      });
      setEditandoCliId(null);
      cargarDatosIniciales();
      if (cliActivo?.id === id) {
          setCliActivo({...cliActivo, nombre: nombreEditado});
      }
    } catch (err) { console.error(err); }
  };

  const agregarItem = () => {
    setItems([...items, { codigo: '', desc: '', cant: 1, unidad: 'Cajas' }]);
  };

  const eliminarItem = (index: number) => {
    const nuevos = [...items];
    nuevos.splice(index, 1);
    setItems(nuevos);
  };

  const actualizarItem = (index: number, campo: string, valor: any) => {
    const nuevos = [...items];
    if (campo === 'codigo') {
      const prod = productos.find(p => p.codigo === valor);
      nuevos[index].codigo = valor;
      nuevos[index].desc = prod ? prod.descripcion : '';
    } else {
      nuevos[index][campo] = valor;
    }
    setItems(nuevos);
  };

  const registrarMovimiento = async () => {
    if (!cliActivo || formMov.monto === '' || !formMov.detalle) return;
    
    const itemsValidos = items.filter(it => it.codigo && it.cant > 0);
    const tipoRealParaBD = formMov.tipo === 'devolucion_cajas' ? 'abono' : formMov.tipo;
    
    setEstado('loading_mov');
    try {
      const res = await fetch(`http://127.0.0.1:8000/clientes_mayoristas/${cliActivo.id}/movimientos/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          tipo: tipoRealParaBD,
          monto: Number(formMov.monto) || 0,
          detalle: formMov.detalle,
          items: itemsValidos
        })
      });

      if (!res.ok) {
        const errorInfo = await res.json();
        alert("Hubo un error al guardar: " + JSON.stringify(errorInfo));
        setEstado('idle');
        return;
      }
      
      setFormMov({ tipo: 'cargo', monto: '', detalle: '', cantidadCajas: '', precioUnitario: '' });
      setItems([]);
      
      const resCli = await fetch('http://127.0.0.1:8000/clientes_mayoristas/');
      const dataCli = await resCli.json();
      setClientes(dataCli);
      setCliActivo(dataCli.find((c: any) => c.id === cliActivo.id));
      await cargarMovimientos(cliActivo.id);
      
      setEstado('idle');
    } catch (e) {
      alert("Error de conexión con el servidor.");
      setEstado('idle');
    }
  };

  const anularMovimiento = async (movId: number) => {
    if (!window.confirm("ATENCIÓN: ¿Estás seguro de anular esta operación? El saldo del cliente y el stock se recalcularán automáticamente.")) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/clientes_mayoristas/${cliActivo.id}/movimientos/${movId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        const resCli = await fetch('http://127.0.0.1:8000/clientes_mayoristas/');
        const dataCli = await resCli.json();
        setClientes(dataCli);
        setCliActivo(dataCli.find((c: any) => c.id === cliActivo.id));
        await cargarMovimientos(cliActivo.id);
      } else {
        alert("Hubo un problema al anular el movimiento.");
      }
    } catch (e) {
      alert("Error de conexión al intentar anular.");
    }
  };

  const toggleDetalle = (id: number) => {
    setExpandida(expandida === id ? null : id);
  };

  const handleTipoOperacionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevoTipo = e.target.value;
    
    if (nuevoTipo === 'devolucion_cajas') {
      setFormMov(prev => ({
        ...prev, 
        tipo: nuevoTipo, 
        detalle: 'Devolución de cajas vacías',
        cantidadCajas: '',
        precioUnitario: '',
        monto: '' 
      }));
    } else {
      setFormMov(prev => ({...prev, tipo: nuevoTipo, cantidadCajas: '', precioUnitario: ''}));
    }
  };

  const handleCajasChange = (campo: 'cantidadCajas' | 'precioUnitario', valor: string) => {
    setFormMov(prev => {
      const nuevoEstado = { ...prev, [campo]: valor };
      const cant = Number(nuevoEstado.cantidadCajas) || 0;
      const precio = Number(nuevoEstado.precioUnitario) || 0;
      
      nuevoEstado.monto = cant > 0 && precio > 0 ? (cant * precio).toString() : '';
      
      if (cant > 0 || precio > 0) {
        nuevoEstado.detalle = `Devolución de ${cant} cajas vacías ($${precio} c/u)`;
      } else {
        nuevoEstado.detalle = 'Devolución de cajas vacías';
      }
      
      return nuevoEstado;
    });
  };

  const inputClass = "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all";
  const labelClass = "block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5";

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-[1600px] mx-auto p-4 sm:p-6 text-gray-900 font-sans">
      
      {/* PANEL IZQUIERDO: DIRECTORIO */}
      <section className="w-full lg:w-1/3 xl:w-1/4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50 rounded-t-2xl">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><Users className="w-5 h-5" /></div>
          <div>
            <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase m-0">Directorio</p>
            <h2 className="text-lg font-extrabold tracking-tight text-gray-900 m-0">Clientes</h2>
          </div>
        </div>
        
        <div className="p-5 border-b border-gray-100 bg-gray-50/30">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="w-4 h-4 text-gray-400" />
            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide m-0">Nuevo Cliente</h4>
          </div>
          <input 
            type="text" 
            placeholder="Razón Social o Nombre..." 
            value={formCli.nombre} 
            onChange={e => setFormCli({...formCli, nombre: e.target.value})} 
            className={`${inputClass} mb-3`} 
          />

                <input
                  type="text"
                  placeholder="CUIT / DNI"
                  value={formCli.cuit}
                  onChange={e => setFormCli({ ...formCli, cuit: e.target.value })}
                  className={`${inputClass} mb-3`}
                />
          <button 
            onClick={crearCliente} 
            disabled={!formCli.nombre || estado === 'loading_cli'} 
            className="w-full py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {estado === 'loading_cli' ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {estado === 'loading_cli' ? 'Guardando...' : 'Crear Cliente'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {clientes.map(c => {
            const isActive = cliActivo?.id === c.id;
            return (
              <div 
                key={c.id} 
                onClick={() => seleccionarCli(c)}
                className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-200 border 
                  ${isActive 
                    ? 'border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-500/20' 
                    : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
              >
                <div className="flex justify-between items-center mb-2">
                  {editandoCliId === c.id ? (
                      <div className="flex gap-2 w-full">
                          <input 
                              type="text" 
                              value={nombreEditado} 
                              onChange={(e) => setNombreEditado(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                              autoFocus
                          />
                          <button onClick={(e) => guardarEdicionCliente(e, c.id)} className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors">
                            <Save className="w-4 h-4" />
                          </button>
                      </div>
                  ) : (
                      <>
                          <div className="pr-8">
                            <strong className="block text-sm font-extrabold text-gray-900 truncate">{c.nombre}</strong>
                            {c.cuit && (
                              <p className="text-xs text-gray-500 mt-1 mb-0">
                                CUIT: {c.cuit}
                              </p>
                            )}
                          </div>
                          <div className={`absolute top-4 right-4 flex gap-1 transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                              <button onClick={(e) => iniciarEdicionCliente(e, c)} className="p-1 text-gray-400 hover:text-blue-600 bg-white rounded shadow-sm border border-gray-100"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={(e) => eliminarCliente(e, c.id)} className="p-1 text-gray-400 hover:text-red-600 bg-white rounded shadow-sm border border-gray-100"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                      </>
                  )}
                </div>

                <div className="flex justify-between items-center text-xs mt-3 pt-3 border-t border-gray-100/50">
                  <span className="text-gray-500 font-medium">Saldo:</span>
                  <strong className={`text-sm tracking-tight ${c.saldo > 0 ? 'text-red-600' : c.saldo < 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                    {c.saldo > 0 ? 'Nos deben: ' : c.saldo < 0 ? 'A favor: ' : ''}
                    ${Math.abs(c.saldo).toLocaleString('es-AR', {minimumFractionDigits: 2})}
                  </strong>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* PANEL DERECHO: CUENTA CORRIENTE */}
      <section className="w-full lg:w-2/3 xl:w-3/4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden min-h-[600px]">
        {!cliActivo ? (
          <div className="flex flex-col items-center justify-center flex-1 text-gray-400 p-10 text-center">
            <BookUser className="w-16 h-16 mb-4 text-gray-200" />
            <h3 className="text-lg font-bold text-gray-500 mb-1">Ningún cliente seleccionado</h3>
            <p className="text-sm">Seleccioná un cliente del directorio para ver su cuenta corriente o registrar operaciones.</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Cabecera CC */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border-b border-gray-100 bg-gray-50/30 gap-4">
              <div>
                <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase m-0 mb-1">Cuenta Corriente Activa</p>
                <h2 className="text-2xl font-black tracking-tight text-gray-900 m-0">{cliActivo.nombre}</h2>
              </div>
              <div className="text-left sm:text-right bg-white px-5 py-3 rounded-xl border border-gray-200 shadow-sm">
                <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Saldo Total</span>
                <strong className={`text-2xl font-black tracking-tight ${cliActivo.saldo > 0 ? 'text-red-600' : cliActivo.saldo < 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                  ${Math.abs(cliActivo.saldo).toLocaleString('es-AR', {minimumFractionDigits: 2})}
                </strong>
              </div>
            </div>

            {/* Formulario Nueva Operación */}
            <div className="p-6 border-b border-gray-100 bg-white">
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-5">
                  <div className="md:col-span-4">
                    <label className={labelClass}>Tipo de Operación</label>
                    <select 
                      value={formMov.tipo} 
                      onChange={handleTipoOperacionChange} 
                      className={`${inputClass} ${formMov.tipo === 'devolucion_cajas' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : ''} font-semibold`}
                    >
                      <option value="cargo">+ Entregar Mercadería (Aumenta deuda)</option>
                      <option value="abono">- Pago Recibido (Resta deuda)</option>
                      <option value="devolucion_cajas">♻️ Devolución de Cajas</option>
                    </select>
                  </div>
                  
                  {formMov.tipo === 'devolucion_cajas' ? (
                    <>
                      <div className="md:col-span-2">
                        <label className={`${labelClass} text-emerald-600`}>Cant. Cajas</label>
                        <input type="number" min="1" placeholder="Ej: 10" value={formMov.cantidadCajas} onChange={e => handleCajasChange('cantidadCajas', e.target.value)} className={`${inputClass} bg-emerald-50 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500/20`} />
                      </div>
                      <div className="md:col-span-3">
                        <label className={`${labelClass} text-emerald-600`}>Precio C/U $</label>
                        <input type="number" min="0" placeholder="Ej: 50" value={formMov.precioUnitario} onChange={e => handleCajasChange('precioUnitario', e.target.value)} className={`${inputClass} bg-emerald-50 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500/20`} />
                      </div>
                      <div className="md:col-span-3">
                        <label className={labelClass}>Total a Reconocer $</label>
                        <input type="number" disabled placeholder="0.00" value={formMov.monto} className="w-full px-4 py-2.5 bg-gray-200/50 border border-gray-200 rounded-lg text-sm text-gray-500 font-black outline-none cursor-not-allowed" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="md:col-span-5">
                        <label className={labelClass}>Detalle (Obligatorio)</label>
                        <input type="text" placeholder={formMov.tipo === 'cargo' ? "Ej: 15 cajas fiadas..." : "Ej: Pago en efectivo al repartidor..."} value={formMov.detalle} onChange={e => setFormMov({...formMov, detalle: e.target.value})} className={inputClass} />
                      </div>
                      <div className="md:col-span-3">
                        <label className={labelClass}>Monto $</label>
                        <input type="number" min="0" placeholder="0.00" value={formMov.monto} onChange={e => setFormMov({...formMov, monto: e.target.value})} className={`${inputClass} font-bold`} />
                      </div>
                    </>
                  )}
                </div>

                {/* Sub-Grilla Items Múltiples */}
                <div className="pt-5 border-t border-gray-200 border-dashed">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-4 h-4 text-gray-400" />
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider m-0">Mercadería Entregada (Resta stock físico)</label>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    {items.map((it, idx) => (
                      <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
                        <select value={it.codigo} onChange={e => actualizarItem(idx, 'codigo', e.target.value)} className={`${inputClass} flex-[3_3_0%] min-w-[150px]`}>
                          <option value="">Seleccionar producto...</option>
                          {productos.map(p => <option key={p.codigo} value={p.codigo}>{p.descripcion}</option>)}
                        </select>
                        <input type="number" min="1" placeholder="Cant." value={it.cant} onChange={e => actualizarItem(idx, 'cant', Number(e.target.value))} className={`${inputClass} w-20 px-2 text-center`} />
                        <select value={it.unidad} onChange={e => actualizarItem(idx, 'unidad', e.target.value)} className={`${inputClass} flex-1 min-w-[120px] ${it.unidad === 'Cajas' ? 'bg-blue-50 text-blue-800' : 'bg-orange-50 text-orange-800'} font-semibold`}>
                          <option value="Cajas">📦 Cajas</option>
                          <option value="Paquetes">🥖 Paquetes</option>
                        </select>
                        <button onClick={() => eliminarItem(idx)} className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
                    <button onClick={agregarItem} className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50 w-full sm:w-auto justify-center">
                      <Plus className="w-4 h-4" /> Agregar Ítem
                    </button>
                    
                    <button 
                      onClick={registrarMovimiento} 
                      disabled={estado === 'loading_mov' || formMov.monto === '' || !formMov.detalle} 
                      className="w-full sm:w-auto px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-full hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {estado === 'loading_mov' ? 'Procesando...' : 'Asentar Operación'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla Historial */}
            <div className="flex-1 overflow-x-auto bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-[15%]">Fecha</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-[35%]">Detalle</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right w-[15%]">Debe (+)</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right w-[10%]">Haber (-)</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right w-[15%]">Saldo</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center w-[10%]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {movimientos.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        <Receipt className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm font-medium">No hay movimientos registrados.</p>
                      </td>
                    </tr>
                  ) : (
                    movimientos.map(m => {
                      const isExpanded = expandida === m.id;
                      const hasItems = m.items && m.items.length > 0;
                      
                      return (
                        <React.Fragment key={m.id}>
                          <tr className={`group transition-colors duration-150 ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-gray-500">
                              {new Date(m.fecha).toLocaleDateString('es-AR')}
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-gray-800">
                              {m.detalle}
                            </td>
                            
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              {m.tipo === 'cargo' && (
                                <span className="flex items-center justify-end gap-1 text-sm font-bold text-red-600">
                                  <ArrowUpRight className="w-3 h-3" />
                                  ${Number(m.monto).toLocaleString('es-AR', {minimumFractionDigits:2})}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              {m.tipo === 'abono' && (
                                <span className="flex items-center justify-end gap-1 text-sm font-bold text-emerald-600">
                                  <ArrowDownRight className="w-3 h-3" />
                                  ${Number(m.monto).toLocaleString('es-AR', {minimumFractionDigits:2})}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <span className="text-base font-black tracking-tight text-gray-900">
                                ${Number(m.saldo_historico).toLocaleString('es-AR', {minimumFractionDigits:2})}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-2">
                                {hasItems ? (
                                  <button 
                                    onClick={() => toggleDetalle(m.id)} 
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-bold transition-colors ${isExpanded ? 'bg-gray-800 text-white hover:bg-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                  >
                                    {isExpanded ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                                    {isExpanded ? 'Cerrar' : 'Detalle'}
                                  </button>
                                ) : (
                                  <span className="w-20"></span>
                                )}
                                <button 
                                  onClick={() => anularMovimiento(m.id)} 
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100" 
                                  title="Anular Operación"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Fila Detalle Expandible */}
                          {isExpanded && hasItems && (
                            <tr>
                              <td colSpan={6} className="px-6 py-4 bg-gray-50/80 border-b border-gray-100">
                                <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-sm max-w-2xl">
                                  <table className="w-full text-left border-collapse">
                                    <thead>
                                      <tr className="border-b border-gray-100">
                                        <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[20%]">Cód.</th>
                                        <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[50%]">Descripción</th>
                                        <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center w-[30%]">Cant. / Unidad</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                      {m.items.map((it:any, i:number) => (
                                        <tr key={i} className="hover:bg-gray-50/50">
                                          <td className="px-4 py-2 text-xs font-medium text-gray-500">{it.codigo}</td>
                                          <td className="px-4 py-2 text-xs font-bold text-gray-800">{it.desc}</td>
                                          <td className="px-4 py-2 text-center">
                                            <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold ${it.unidad === 'Cajas' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                                              {it.cant} {it.unidad}
                                            </span>
                                          </td>
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
        )}
      </section>
    </div>
  );
};