import { useState, useEffect } from 'react';
import { 
  Minus, 
  X, 
  TrendingDown, 
  CheckCircle2, 
  AlertCircle,
  Store,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export function NuevoGasto({ onGastoCreado }: { onGastoCreado: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [insumos, setInsumos] = useState<any[]>([]);
  const [proveedoresBD, setProveedoresBD] = useState<any[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);
  
  const [form, setForm] = useState({ 
    categoria: 'Materia Prima', 
    proveedor: '', 
    descripcion: '', 
    monto: '', 
    medio_pago: 'Efectivo',
    insumo_id: '',
    cantidad_insumo: '',
    servicio_id: ''
  });

  const [estado, setEstado] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [mensajeError, setMensajeError] = useState('');

  useEffect(() => {
    if (abierto) {
      fetch(`${API_URL}/configuracion/`)
        .then(res => res.json())
        .then(data => {
          setInsumos(data.insumos || []);
          setServicios(data.servicios || []);
        })
        .catch(err => console.error("Error cargando configuración:", err));
        
      fetch(`${API_URL}/proveedores/`)
        .then(res => res.json())
        .then(data => setProveedoresBD(data || []))
        .catch(err => console.error("Error cargando proveedores:", err));
    }
  }, [abierto]);

  const guardar = async () => {
    setEstado('loading');
    setMensajeError('');

    try {
      const esMateriaPrima = form.categoria === 'Materia Prima';
      const esServicio = form.categoria === 'Servicios';
      const servicioSeleccionado = servicios.find(s => s.id.toString() === form.servicio_id);
      const insumoSeleccionadoPayload = insumos.find(i => i.id.toString() === form.insumo_id);

      const payload = {
        categoria: form.categoria,
        proveedor: esServicio && servicioSeleccionado ? servicioSeleccionado.nombre : form.proveedor,
        descripcion:
          form.descripcion ||
          (esMateriaPrima && insumoSeleccionadoPayload
            ? `Compra de ${insumoSeleccionadoPayload.nombre}`
            : esServicio && servicioSeleccionado
              ? `${servicioSeleccionado.nombre} - período correspondiente`
              : 'Sin descripción'),
        monto: Number(form.monto) || 0,
        medio_pago: form.medio_pago,
        insumo_id: esMateriaPrima && form.insumo_id ? Number(form.insumo_id) : null,
        cantidad_insumo: esMateriaPrima && form.cantidad_insumo ? Number(form.cantidad_insumo) : null
      };

      const res = await fetch(`${API_URL}/gastos/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('El servidor rechazó la solicitud.');
      }

      setEstado('success');
      
      setTimeout(() => {
        setForm({ categoria: 'Materia Prima', proveedor: '', descripcion: '', monto: '', medio_pago: 'Efectivo', insumo_id: '', cantidad_insumo: '', servicio_id: '' });
        setEstado('idle');
        setAbierto(false);
        onGastoCreado();
      }, 1500);

    } catch (error: any) {
      setEstado('error');
      setMensajeError('Hubo un error al guardar. Revisá la conexión e intentá de nuevo.');
      console.error(error);
    }
  };

  const cerrarModal = () => {
    setAbierto(false);
    setEstado('idle');
    setMensajeError('');
  };

  useEffect(() => {
    const apretarTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && abierto && estado !== 'loading' && estado !== 'success') {
        cerrarModal();
      }
    };
    window.addEventListener('keydown', apretarTecla);
    return () => window.removeEventListener('keydown', apretarTecla);
  }, [abierto, estado]);

  // Clases CSS reutilizables para inputs
  const inputBaseClass = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all";
  const labelBaseClass = "block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5";

  return (
    <>
      <button 
        onClick={() => setAbierto(true)} 
        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-50 text-rose-700 border border-rose-200 font-bold uppercase tracking-wide rounded-full hover:bg-rose-100 transition-all shadow-sm active:scale-95 text-sm w-full sm:w-auto"
      >
        <Minus className="w-5 h-5 text-rose-600" />
        Registrar Gasto / Compra
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200">
            
            {/* Cabecera del Modal */}
            <header className="flex justify-between items-center px-6 py-4 bg-slate-900 text-white flex-shrink-0">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-400" />
                <h2 className="text-lg font-bold tracking-tight m-0">Registrar Salida</h2>
              </div>
              <button 
                onClick={cerrarModal} 
                className="text-slate-400 hover:text-white transition-colors p-1"
                disabled={estado === 'loading' || estado === 'success'}
              >
                <X className="w-6 h-6" />
              </button>
            </header>

            {/* Cuerpo del Formulario */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
              
              {/* Alertas */}
              {estado === 'success' && (
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 p-3 rounded-xl text-sm font-bold animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ¡Los datos se guardaron correctamente!
                </div>
              )}

              {estado === 'error' && (
                <div className="flex items-center gap-2 bg-red-50 text-red-800 border border-red-200 p-3 rounded-xl text-sm font-bold animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  {mensajeError}
                </div>
              )}

              {/* Categoría */}
              <div>
                <label className={labelBaseClass}>Categoría</label>
                <select 
                  className={inputBaseClass} 
                  value={form.categoria}
                  onChange={e => setForm({...form, categoria: e.target.value, proveedor: '', insumo_id: '', cantidad_insumo: '', servicio_id: ''})}
                  disabled={estado === 'loading' || estado === 'success'}
                >
                  <option>Materia Prima</option>
                  <option>Servicios</option>
                  <option>Alquiler</option>
                  <option>Sueldos / Adelantos</option>
                  <option>Impuestos</option>
                  <option>Banco / Comisiones</option>
                  <option>Mantenimiento / Equipos</option>
                  <option>Logística</option>
                  <option>Otros</option>
                </select>
              </div>

              {/* Sub-Panel Servicios */}
              {form.categoria === 'Servicios' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <Store className="w-4 h-4" />
                    <h3 className="text-sm font-bold">Servicio</h3>
                  </div>

                  <div>
                    <label className={labelBaseClass}>¿Qué servicio estás pagando?</label>
                    <select
                      className={inputBaseClass}
                      value={form.servicio_id}
                      onChange={e => setForm({ ...form, servicio_id: e.target.value })}
                      disabled={estado === 'loading' || estado === 'success'}
                    >
                      <option value="">Seleccioná del catálogo...</option>
                      {servicios.map((s) => (
                        <option key={s.id} value={s.id}>{s.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <p className="text-[10px] text-emerald-700 font-medium leading-relaxed">
                    El servicio se usa solo como catálogo. No hace falta seleccionar proveedor. El importe real se registra en este gasto con su fecha, para poder analizar aumentos mes a mes.
                  </p>
                </div>
              )}

              {/* Proveedor - no aplica para Servicios */}
              {form.categoria !== 'Servicios' && (
                <div>
                  <label className={labelBaseClass}>
                    {form.categoria === 'Materia Prima' ? 'Proveedor' : 'Proveedor / Entidad (Opcional)'}
                  </label>

                  <div className="relative">
                    <Store className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />

                    <select
                      className={`${inputBaseClass} pl-10 appearance-none`}
                      value={form.proveedor}
                      onChange={e => setForm({ ...form, proveedor: e.target.value })}
                      disabled={estado === 'loading' || estado === 'success'}
                    >
                      <option value="">
                        {form.categoria === 'Materia Prima'
                          ? '-- Seleccionar Proveedor --'
                          : '-- Ninguno --'}
                      </option>

                      {proveedoresBD.map((p) => (
                        <option key={p.id} value={p.nombre}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Sub-Panel Materia Prima */}
              {form.categoria === 'Materia Prima' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                  <h3 className="text-sm font-bold text-amber-800">
                    Datos de Materia Prima
                  </h3>

                  <div>
                    <label className={labelBaseClass}>Insumo comprado</label>
                    <select
                      className={inputBaseClass}
                      value={form.insumo_id}
                      onChange={e => {
                        const insumoSeleccionado = insumos.find(
                          (i) => i.id.toString() === e.target.value
                        );

                        setForm({
                          ...form,
                          insumo_id: e.target.value,
                          descripcion: insumoSeleccionado ? insumoSeleccionado.nombre : ''
                        });
                      }}
                      disabled={estado === 'loading' || estado === 'success'}
                    >
                      <option value="">Seleccionar insumo...</option>
                      {insumos.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.nombre} ({i.unidad})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelBaseClass}>Cantidad comprada</label>
                    <input
                      type="number"
                      className={inputBaseClass}
                      placeholder="Ej: 25"
                      value={form.cantidad_insumo}
                      onChange={e => setForm({ ...form, cantidad_insumo: e.target.value })}
                      disabled={estado === 'loading' || estado === 'success'}
                    />
                  </div>

                  <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                    La cantidad comprada actualiza el stock del insumo y el costo unitario según el monto total ingresado.
                  </p>
                </div>
              )}

              {/* Detalle del Gasto / Factura - visible para todas las categorías */}
              <div>
                <label className={labelBaseClass}>Detalle del gasto / factura N°</label>
                <input
                  type="text"
                  className={inputBaseClass}
                  placeholder="Ej: Factura harina 01/06, Remito 1234..."
                  value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  disabled={estado === 'loading' || estado === 'success'}
                />
              </div>

              {/* Monto Total */}
              <div>
                <label className={labelBaseClass}>Monto Total ($)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">$</span>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-black text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    value={form.monto}
                    onChange={e => setForm({...form, monto: e.target.value})} 
                    disabled={estado === 'loading' || estado === 'success'}
                  />
                </div>
              </div>

            </div>

            {/* Footer / Acciones */}
            <footer className="flex justify-end items-center gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
              <button 
                onClick={cerrarModal} 
                disabled={estado === 'loading' || estado === 'success'}
                className="px-6 py-2.5 rounded-full text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button 
                onClick={guardar} 
                disabled={!form.monto || Number(form.monto) <= 0 || (form.categoria === 'Materia Prima' && (!form.insumo_id || !form.cantidad_insumo || !form.proveedor)) || (form.categoria === 'Servicios' && !form.servicio_id) || estado === 'loading' || estado === 'success'}
                className={`px-8 py-2.5 rounded-full text-sm font-bold text-white transition-all shadow-sm flex items-center justify-center
                  ${estado === 'success' ? 'bg-emerald-600' : 'bg-rose-600 hover:bg-rose-700 active:scale-95 hover:shadow-md'}
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none
                `}
              >
                {estado === 'loading' ? '⏳ Guardando...' : estado === 'success' ? '¡Guardado!' : 'Confirmar Gasto'}
              </button>
            </footer>

          </div>
        </div>
      )}
    </>
  );
}