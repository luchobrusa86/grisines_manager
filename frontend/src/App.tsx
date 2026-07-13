import React, { useState, useEffect } from 'react';
import { NuevaVenta } from './components/NuevaVenta';
import { ListadoVentas } from './components/ListadoVentas';
import { NuevoGasto } from './components/NuevoGasto'; 
import { ListadoGastos } from './components/ListadoGastos';
import { Produccion } from './components/Produccion';
import { Clientes } from './components/Clientes';
import { Proveedores } from './components/Proveedores';
import { BreakEven } from './components/BreakEven'; 
import { ConfiguracionCostos } from './components/ConfiguracionCostos';
import { TareasPendientes } from './components/TareasPendientes';
import logoEmpresa from './assets/images/logo_maria_lujan.png';
import { 
  BarChart3, 
  CircleDollarSign, 
  TrendingDown, 
  Banknote, 
  Wheat, 
  HardHat, 
  Gem, 
  Landmark, 
  Package, 
  TrendingUp, 
  Scale, 
  Target,
  AlertCircle,
  ReceiptText,
  CreditCard,
  Factory,
  ChefHat,
  Users,
  BookUser,
  Settings,
  ListChecks,
  ArrowRight,
  Gauge,
  AlertTriangle,
  Info
} from 'lucide-react';

const MESES = [
  { val: 1, nombre: 'Enero' }, { val: 2, nombre: 'Febrero' }, { val: 3, nombre: 'Marzo' },
  { val: 4, nombre: 'Abril' }, { val: 5, nombre: 'Mayo' }, { val: 6, nombre: 'Junio' },
  { val: 7, nombre: 'Julio' }, { val: 8, nombre: 'Agosto' }, { val: 9, nombre: 'Septiembre' },
  { val: 10, nombre: 'Octubre' }, { val: 11, nombre: 'Noviembre' }, { val: 12, nombre: 'Diciembre' }
];

function App() {
  const [metricas, setMetricas] = useState<any>(null);
  const [mostrarIndicadores, setMostrarIndicadores] = useState(false);
  const [pestañaActiva, setPestañaActiva] = useState<string>('ventas');

  const fechaActual = new Date();
  const [mesFiltro, setMesFiltro] = useState(fechaActual.getMonth() + 1);
  const [anioFiltro, setAnioFiltro] = useState(fechaActual.getFullYear());

  const actualizarMetricas = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/dashboard/metricas?mes=${mesFiltro}&anio=${anioFiltro}`);
      const data = await res.json();
      setMetricas(data);
    } catch (e) {
      console.error('Error cargando métricas', e);
    }
  };

  useEffect(() => {
    actualizarMetricas();
  }, [mesFiltro, anioFiltro]);

  const formatCurrency = (val: number | string) => {
    return Number(val || 0).toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const gastosTotalesReales = Number(
    metricas?.gastos_totales_reales ?? metricas?.total_gastos ?? 0
  );

  const gastosOperativosSinDuplicar = Number(
    metricas?.gastos_operativos_total ?? metricas?.total_gastos ?? 0
  );

  const getColorSaborStock = (descripcion: string) => {
    const sabor = (descripcion || '').toLowerCase();

    if (sabor.includes('natural')) return 'text-blue-900';
    if (sabor.includes('queso')) return 'text-sky-500';
    if (sabor.includes('pizza')) return 'text-red-600';
    if (sabor.includes('orégano') || sabor.includes('oregano')) return 'text-green-600';
    if (sabor.includes('cebolla')) return 'text-pink-500';
    if (sabor.includes('provenzal')) return 'text-green-900';
    if (sabor.includes('oliva')) return 'text-lime-600';
    if (sabor.includes('pan rallado')) return 'text-black';

    return 'text-slate-500';
  };


  const ventasOficial = Number(metricas?.ventas_oficial || 0);
  const ventasInterno = Number(metricas?.ventas_interno || 0);
  const totalFiscal = ventasOficial + ventasInterno;

  const porcentajeOficial = totalFiscal > 0 ? (ventasOficial / totalFiscal) * 100 : 0;
  const porcentajeInterno = totalFiscal > 0 ? (ventasInterno / totalFiscal) * 100 : 0;
  const porcentajeOficialVisual = porcentajeOficial > 0 && porcentajeOficial < 1 ? 1 : porcentajeOficial;

  const textoPorcentajeOficial = porcentajeOficial > 0 && porcentajeOficial < 0.01
      ? '<0.01%'
      : `${porcentajeOficial.toFixed(2)}%`;

  const margenRentabilidadNeto = metricas?.caja_real_total > 0
    ? ((metricas.balance_neto / metricas.caja_real_total) * 100).toFixed(2)
    : "0.00";

  const costoTotalPorPaquete =
    Number(metricas?.costo_total_por_paquete || 0) ||
    (
      Number(metricas?.paquetes_producidos || 0) > 0
        ? Number(metricas?.costo_produccion_total || 0) / Number(metricas?.paquetes_producidos || 1)
        : 0
    );

  const costoManoObraPorPaquete =
    Number(metricas?.costo_mano_obra_por_paquete || 0) ||
    (
      Number(metricas?.paquetes_producidos || 0) > 0
        ? Number(metricas?.costo_mano_obra || 0) / Number(metricas?.paquetes_producidos || 1)
        : 0
    );

  const costoMateriaPrimaPorPaquete =
    Number(metricas?.costo_materia_prima_por_paquete || 0) ||
    (
      Number(metricas?.paquetes_producidos || 0) > 0
        ? (
            Number(metricas?.costo_materia_prima || 0) ||
            Math.max(0, Number(metricas?.costo_produccion_total || 0) - Number(metricas?.costo_mano_obra || 0))
          ) / Number(metricas?.paquetes_producidos || 1)
        : 0
    );

  const costoOperativoPorPaquete =
    Number(metricas?.paquetes_producidos || 0) > 0
      ? (
          Number(metricas?.costo_produccion_total || 0) +
          Number(metricas?.gastos_operativos_total || 0)
        ) / Number(metricas?.paquetes_producidos || 1)
      : 0;

  const ventaNetaOperativa =
    Number(metricas?.caja_real_total || 0) - gastosTotalesReales;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 pt-4">
          <div className="flex-shrink-0">
            <img
              src={logoEmpresa}
              alt="Logo María Luján"
              className="h-auto max-h-24 object-contain drop-shadow-sm mix-blend-multiply"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button 
              onClick={() => {
                setMostrarIndicadores(!mostrarIndicadores);
                actualizarMetricas();
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold uppercase tracking-wide rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95 w-full sm:w-auto justify-center"
            >
              <BarChart3 className="w-4 h-4 text-gray-500" />
              {mostrarIndicadores ? 'Ocultar Tablero' : 'Ver Tablero'}
            </button>

            <div className="w-full sm:w-auto">
              <NuevaVenta /> 
            </div>
            
            <div className="w-full sm:w-auto">
              <NuevoGasto onGastoCreado={() => { actualizarMetricas(); setPestañaActiva('gastos'); }} />
            </div>
          </div>
        </header>

        {/* Alerta Errores AFIP */}
        {metricas?.errores_cae > 0 && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 mb-6 shadow-sm animate-in fade-in slide-in-from-top-4">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Atención:</strong> Tienes {metricas.errores_cae} comprobante(s) oficial(es) pendiente(s) de autorización ante ARCA.
            </div>
          </div>
        )}

        {/* Tablero de Indicadores */}
        {mostrarIndicadores && (
          <div className="space-y-6 mb-10 animate-in fade-in slide-in-from-top-4 duration-300">
            
            {/* Filtros Dashboard */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-slate-800" />
                <h2 className="text-xl font-extrabold tracking-tight text-slate-800">Rendimiento del período</h2>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <select 
                  className="w-full sm:w-auto bg-white border border-gray-200 text-gray-800 text-sm font-semibold rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm cursor-pointer"
                  value={mesFiltro} 
                  onChange={(e) => setMesFiltro(Number(e.target.value))}
                >
                  {MESES.map(m => (
                    <option key={m.val} value={m.val}>{m.nombre}</option>
                  ))}
                </select>
                
                <select 
                  className="w-full sm:w-auto bg-white border border-gray-200 text-gray-800 text-sm font-semibold rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm cursor-pointer"
                  value={anioFiltro} 
                  onChange={(e) => setAnioFiltro(Number(e.target.value))}
                >
                  {[2024, 2025, 2026, 2027, 2028].map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* BLOQUE MAESTRO DE FLUJO FINANCIERO CON TOOLTIPS INTEGRADOS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Bloque Izquierdo: Indicadores principales */}
              <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col gap-5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Indicadores principales</h3>
                  <span className="text-xs font-bold text-slate-400">Valores de Período</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Venta Total */}
                  <div className="p-5 bg-slate-50/70 border border-slate-100 rounded-2xl relative group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Venta Total</span>
                      <Info className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors cursor-help" />
                    </div>

                    <strong className="block text-2xl font-black text-slate-900 font-mono">
                      ${formatCurrency(metricas?.caja_real_total)}
                    </strong>

                    <p className="text-[11px] font-semibold text-slate-400 mt-2 mb-0">
                      Facturación directa + ventas por cuenta corriente
                    </p>

                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 transition-all">
                      <div className="bg-slate-900 text-white text-[11px] rounded-xl p-3 shadow-xl border border-slate-800 w-64 space-y-1.5 leading-normal">
                        <p className="font-bold border-b border-slate-800 pb-1 text-slate-400">Composición de Venta Total</p>
                        <div className="flex justify-between"><span>Oficial:</span><span className="font-mono">${formatCurrency(metricas?.ventas_oficial)}</span></div>
                        <div className="flex justify-between"><span>Interno + Cta Cte:</span><span className="font-mono">${formatCurrency(metricas?.ventas_interno)}</span></div>
                      </div>
                      <div className="w-2.5 h-2.5 bg-slate-900 rotate-45 -mt-1.5 border-r border-b border-slate-800"></div>
                    </div>
                  </div>

                  {/* Gastos Operativos */}
                  <div className="p-5 bg-rose-50/60 border border-rose-100 rounded-2xl relative group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="block text-[11px] font-extrabold text-rose-400 uppercase tracking-wider">Gastos Operativos</span>
                      <Info className="w-3.5 h-3.5 text-rose-300 group-hover:text-rose-500 transition-colors cursor-help" />
                    </div>

                    <strong className="block text-2xl font-black text-rose-600 font-mono">
                      -${formatCurrency(gastosTotalesReales)}
                    </strong>

                    <p className="text-[11px] font-semibold text-rose-400/80 mt-2 mb-0">
                      Total de gastos cargados en el período
                    </p>

                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 transition-all">
                      <div className="bg-slate-900 text-white text-[11px] rounded-xl p-3 shadow-xl border border-slate-800 w-64 space-y-1.5 leading-normal">
                        <p className="font-bold border-b border-slate-800 pb-1 text-slate-400">Gastos del período</p>
                        <p className="text-slate-400">Suma total de gastos registrados para el mes seleccionado. La rentabilidad limpia usa gastos operativos sin sueldos ni materia prima para no duplicar Costo Total Fábrica.</p>
                      </div>
                      <div className="w-2.5 h-2.5 bg-slate-900 rotate-45 -mt-1.5 border-r border-b border-slate-800"></div>
                    </div>
                  </div>

                  {/* Venta Neta */}
                  <div className={`p-5 border rounded-2xl relative group ${ventaNetaOperativa >= 0 ? 'bg-emerald-50/70 border-emerald-100' : 'bg-orange-50/70 border-orange-100'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`block text-[11px] font-extrabold uppercase tracking-wider ${ventaNetaOperativa >= 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
                        Venta Neta
                      </span>
                      <Info className={`w-3.5 h-3.5 transition-colors cursor-help ${ventaNetaOperativa >= 0 ? 'text-emerald-300 group-hover:text-emerald-500' : 'text-orange-300 group-hover:text-orange-500'}`} />
                    </div>

                    <strong className={`block text-2xl font-black font-mono ${ventaNetaOperativa >= 0 ? 'text-emerald-700' : 'text-orange-600'}`}>
                      ${formatCurrency(ventaNetaOperativa)}
                    </strong>

                    <p className={`text-[11px] font-semibold mt-2 mb-0 ${ventaNetaOperativa >= 0 ? 'text-emerald-500/80' : 'text-orange-500/80'}`}>
                      Venta Total - Gastos del período
                    </p>

                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 transition-all">
                      <div className="bg-slate-900 text-white text-[11px] rounded-xl p-3 shadow-xl border border-slate-800 w-64 space-y-1.5 leading-normal">
                        <p className="font-bold border-b border-slate-800 pb-1 text-emerald-400">Cálculo de Venta Neta</p>
                        <div className="flex justify-between text-slate-400"><span>(+) Venta Total:</span><span className="font-mono text-white">${formatCurrency(metricas?.caja_real_total)}</span></div>
                        <div className="flex justify-between text-slate-400"><span>(-) Gastos del período:</span><span className="font-mono text-white">-${formatCurrency(gastosTotalesReales)}</span></div>
                        <div className="border-t border-slate-800 my-1"></div>
                        <div className="flex justify-between text-emerald-400 font-bold"><span>(=) Venta Neta:</span><span className="font-mono">${formatCurrency(ventaNetaOperativa)}</span></div>
                      </div>
                      <div className="w-2.5 h-2.5 bg-slate-900 rotate-45 -mt-1.5 border-r border-b border-slate-800"></div>
                    </div>
                  </div>
                </div>

                {/* Indicadores secundarios: Costo Total Fábrica + Rentabilidad Mensual Limpia */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Costo Total Fábrica */}
                  <div className="bg-slate-300 border border-slate-200 rounded-2xl p-4 shadow-sm relative group">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                          <Factory className="w-3.5 h-3.5" /> Costo Total Fábrica
                        </span>
                        <h3 className="text-xl font-black tracking-tight font-mono text-slate-800">
                          -${formatCurrency(metricas?.costo_produccion_total)}
                        </h3>
                      </div>

                      <Info className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors cursor-help mt-1" />
                    </div>

                    <p className="text-[11px] font-semibold text-slate-500 mt-2 mb-0">
                      Fábrica: ${formatCurrency(costoTotalPorPaquete)} / Operativo: ${formatCurrency(costoOperativoPorPaquete)} por paq.
                    </p>

                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 transition-all">
                      <div className="bg-slate-900 text-white text-[11px] rounded-xl p-3 shadow-xl border border-slate-800 w-72 space-y-1.5 leading-normal font-normal">
                        <p className="font-bold border-b border-slate-800 pb-1 text-orange-400">Costo Total Fábrica</p>
                        <div className="flex justify-between text-slate-400"><span>Paquetes Producidos:</span><span className="font-mono text-white">{metricas?.paquetes_producidos || 0}</span></div>
                        <div className="flex justify-between text-slate-400"><span>Mano de Obra:</span><span className="font-mono text-white">${formatCurrency(metricas?.costo_mano_obra)}</span></div>
                        <div className="flex justify-between text-slate-400"><span>Materia Prima/Insumos:</span><span className="font-mono text-white">${formatCurrency(metricas?.costo_materia_prima || metricas?.gastos_materia_prima_total || Math.max(0, Number(metricas?.costo_produccion_total || 0) - Number(metricas?.costo_mano_obra || 0)))}</span></div>
                        <div className="border-t border-slate-800 my-1"></div>
                        <div className="flex justify-between text-orange-300 font-bold"><span>Costo Fábrica / Paq.:</span><span className="font-mono">${formatCurrency(costoTotalPorPaquete)}</span></div>
                        <div className="flex justify-between text-emerald-300 font-bold"><span>Costo Operativo / Paq.:</span><span className="font-mono">${formatCurrency(costoOperativoPorPaquete)}</span></div>
                        <div className="flex justify-between text-slate-500 text-[10px]"><span>MO / Paq.:</span><span className="font-mono">${formatCurrency(costoManoObraPorPaquete)}</span></div>
                        <div className="flex justify-between text-slate-500 text-[10px]"><span>MP / Paq.:</span><span className="font-mono">${formatCurrency(costoMateriaPrimaPorPaquete)}</span></div>
                      </div>
                      <div className="w-2.5 h-2.5 bg-slate-900 rotate-45 -mt-1.5 border-r border-b border-slate-800"></div>
                    </div>
                  </div>

                  {/* Rentabilidad Mensual Limpia */}
                  <div className="bg-slate-300 border border-slate-200 rounded-2xl p-4 shadow-sm relative group">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-500">
                          <Gem className="w-3.5 h-3.5" /> Rentabilidad Mensual Limpia
                        </span>
                        <h3 className={`text-xl font-black tracking-tight font-mono ${Number(metricas?.balance_neto || 0) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          ${formatCurrency(metricas?.balance_neto)}
                        </h3>
                      </div>

                      <div className="text-right bg-slate-200 px-3 py-2 rounded-xl border border-slate-200">
                        <span className="block text-[9px] font-bold uppercase text-slate-400 tracking-wider">Margen Neto</span>
                        <strong className={`text-base font-extrabold font-mono ${Number(metricas?.balance_neto || 0) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {margenRentabilidadNeto}%
                        </strong>
                      </div>
                    </div>

                    <p className="text-[11px] font-semibold mt-2 mb-0 text-slate-500">
                      Venta Total - Gastos Operativos - Costo Total Fábrica
                    </p>

                    <div className="absolute bottom-full right-6 mb-2 hidden group-hover:flex flex-col items-center z-30 transition-all">
                      <div className="bg-slate-900 text-white text-[11px] rounded-xl p-3 shadow-xl border border-slate-800 w-72 space-y-1.5 leading-normal font-normal">
                        <p className="font-bold border-b border-slate-800 pb-1 text-emerald-400">Rentabilidad Mensual Limpia</p>
                        <div className="flex justify-between text-slate-400"><span>(+) Venta Total:</span><span className="font-mono text-white">${formatCurrency(metricas?.caja_real_total)}</span></div>
                        <div className="flex justify-between text-slate-400"><span>(-) Gastos operativos sin MP/MO:</span><span className="font-mono text-white">-${formatCurrency(gastosOperativosSinDuplicar)}</span></div>
                        <div className="flex justify-between text-slate-400"><span>(-) Costo Total Fábrica:</span><span className="font-mono text-white">-${formatCurrency(metricas?.costo_produccion_total)}</span></div>
                        <div className="border-t border-slate-800 my-1"></div>
                        <div className="flex justify-between text-emerald-400 font-bold"><span>(=) Rentabilidad:</span><span className="font-mono">${formatCurrency(metricas?.balance_neto)}</span></div>
                      </div>
                      <div className="w-2.5 h-2.5 bg-slate-900 rotate-45 -mt-1.5 border-r border-b border-slate-800"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloque Derecho: Desglose Analítico */}
              <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between gap-5">
                <div className="border-b border-gray-100 pb-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Desglose Técnico</h3>
                </div>

                <div className="space-y-4 flex-1 flex flex-col justify-center">
                  {/* Mano de Obra */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="flex items-center gap-1 text-gray-500 font-bold"><HardHat className="w-3.5 h-3.5 text-slate-400" /> Mano de Obra</span>
                      <strong className="font-mono text-gray-800">${formatCurrency(metricas?.costo_mano_obra)}</strong>
                    </div>
                    <span className="block text-[10px] text-gray-400 font-medium">
                      Proporcional: ${metricas?.paquetes_producidos > 0 ? (metricas.costo_mano_obra / metricas.paquetes_producidos).toLocaleString('es-AR', {maximumFractionDigits: 2}) : "0"} x paq.
                    </span>
                  </div>

                  {/* Materia Prima */}
                  <div className="pt-2 border-t border-gray-50">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="flex items-center gap-1 text-gray-500 font-bold"><Wheat className="w-3.5 h-3.5 text-orange-400" /> Materia Prima</span>
                      <strong className="font-mono text-gray-800">${formatCurrency(Number(metricas?.costo_produccion_total) - Number(metricas?.costo_mano_obra))}</strong>
                    </div>
                    <span className="block text-[10px] text-gray-400 font-medium">
                      Proporcional: ${metricas?.paquetes_producidos > 0 ? ((Number(metricas.costo_produccion_total) - Number(metricas.costo_mano_obra)) / metricas.paquetes_producidos).toLocaleString('es-AR', {maximumFractionDigits: 2}) : "0"} x paq.
                    </span>
                  </div>

                  {/* IVA Estimado */}
                  <div className="pt-3 border-t border-gray-100 border-dashed relative group">
                    <div className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-1 text-gray-500 font-bold cursor-help"><Landmark className="w-3.5 h-3.5 text-amber-500" /> IVA Estimado a Pagar <Info className="w-3 h-3 text-slate-300" /></span>
                      <strong className="font-mono text-amber-600">${formatCurrency(metricas?.iva_a_pagar_estimado)}</strong>
                    </div>
                    
                    {/* Tooltip Box */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 transition-all">
                      <div className="bg-slate-900 text-white text-[11px] rounded-xl p-3 shadow-xl border border-slate-800 w-56 space-y-1.5 leading-normal font-normal">
                        <p className="font-bold border-b border-slate-800 pb-1 text-amber-400">Cálculo de IVA Débito</p>
                        <p className="text-slate-400">Es el 21% acumulado de la facturación oficial del período. No deduce IVA crédito de compras.</p>
                      </div>
                      <div className="w-2.5 h-2.5 bg-slate-900 rotate-45 -mt-1.5 border-r border-b border-slate-800"></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl relative group">
                  <Banknote className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div className="flex-1 flex justify-between items-center text-xs">
                    <span className="text-emerald-800 font-bold cursor-help flex items-center gap-1">Cobranzas Cta Cte <Info className="w-3 h-3 text-emerald-300" /></span>
                    <strong className="font-mono text-emerald-700 font-black">${formatCurrency(metricas?.cobranzas_efectivo)}</strong>
                  </div>

                  {/* Tooltip Box */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 transition-all">
                    <div className="bg-slate-900 text-white text-[11px] rounded-xl p-3 shadow-xl border border-slate-800 w-56 space-y-1.5 leading-normal font-normal">
                      <p className="font-bold border-b border-slate-800 pb-1 text-emerald-400">Ingresos por Cuenta Corriente</p>
                      <p className="text-slate-400">Efectivo real que entró a caja este mes por clientes que cancelaron deudas de ventas pasadas.</p>
                    </div>
                    <div className="w-2.5 h-2.5 bg-slate-900 rotate-45 -mt-1.5 border-r border-b border-slate-800"></div>
                  </div>
                </div>

              </div>
            </div>

            {/* PANEL DE STOCK INTEGRADO */}
            {metricas?.stock_productos && (
              <div className="bg-slate-300 rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
                  <Package className="w-4 h-4 text-slate-400" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest m-0">
                    Auditoría Física de Stock (Paquetes en Depósito)
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  {[...metricas.stock_productos]
                    .filter((prod: any) =>
                      prod.codigo !== '999' &&
                      !prod.descripcion.toLowerCase().includes('envase') &&
                      !prod.descripcion.toLowerCase().includes('caja')
                    )
                    .sort((a: any, b: any) =>
                      String(a.codigo).localeCompare(
                        String(b.codigo),
                        undefined,
                        { numeric: true }
                      )
                    )
                    .map((prod: any) => {
                      const paquetes = Number(prod.stock_paquetes || 0);
                      const esNegativo = paquetes < 0;

                      const paquetesAbs = Math.abs(paquetes);
                      const cajas = Math.floor(paquetesAbs / 12);
                      const paquetesSueltos = paquetesAbs % 12;

                      const textoCajas = paquetes === 0
                        ? '0 cajas'
                        : paquetesSueltos === 0
                          ? `${esNegativo ? '-' : ''}${cajas} cajas`
                          : `${esNegativo ? '-' : ''}${cajas} cajas + ${paquetesSueltos} paq.`;

                      return (
                        <div key={prod.codigo} className="bg-gray-50 border border-gray-200/60 rounded-xl p-3 flex flex-col justify-between min-h-[105px] transition-colors hover:bg-gray-100/50">
                          <span className={`text-[10px] font-extrabold uppercase truncate block mb-1 ${getColorSaborStock(prod.descripcion)}`}>
                            {prod.descripcion}
                          </span>
                          <div className="flex items-center justify-between mt-auto">
                            <div className="mt-auto">
                              <div className="flex items-center justify-between">
                                <strong className={`text-xl font-black font-mono tracking-tight ${esNegativo ? 'text-amber-600' : 'text-slate-900'}`}>
                                  {paquetes}
                                </strong>

                                {esNegativo && (
                                  <span className="inline-flex items-center p-1 bg-amber-50 text-amber-700 rounded-md" title="Ventas pendientes de producción">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                  </span>
                                )}
                              </div>

                              <div className="mt-2 pt-2 border-t border-gray-200/70">
                                <p className={`text-sm font-black leading-none mb-0 ${esNegativo ? 'text-amber-600' : 'text-slate-700'}`}>
                                  {textoCajas}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1 mb-0">
                                  de 12 paquetes
                                </p>
                              </div>
                            </div>
                            {esNegativo && (
                              <span className="inline-flex items-center p-1 bg-amber-50 text-amber-700 rounded-md" title="Ventas pendientes de producción">
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* SECCIÓN INFERIOR DE KPIS SECUNDARIOS */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Crecimiento */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between min-h-[110px]">
                <div className="flex justify-between items-start">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Crecimiento del mes</h3>
                  <div className="p-1 bg-slate-50 border border-slate-100 rounded text-slate-400"><TrendingUp className="w-3.5 h-3.5" /></div>
                </div>
                <div>
                  <strong className={`block text-xl font-black font-mono tracking-tight ${metricas?.crecimiento_mes >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {metricas?.crecimiento_mes > 0 ? '↗ ' : metricas?.crecimiento_mes < 0 ? '↘ ' : ''}
                    {Number(Math.abs(metricas?.crecimiento_mes ?? 0)) > 100000 
                      ? 'Excedido' 
                      : `${Number(Math.abs(metricas?.crecimiento_mes ?? 0)).toLocaleString('es-AR', { maximumFractionDigits: 2 })}%`}
                  </strong>
                  <span className="block text-[10px] font-medium text-slate-400 mt-0.5">vs. mes anterior</span>
                </div>
              </div>

              {/* Termómetro Fiscal */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between min-h-[110px]">
                <div className="flex justify-between items-start">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Termómetro Fiscal</h3>
                  <div className="p-1 bg-blue-50 text-blue-500 rounded"><Scale className="w-3.5 h-3.5" /></div>
                </div>
                <div className="w-full">
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-1000 ease-out rounded-full" 
                      style={{ width: `${porcentajeOficialVisual}%` }} 
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>Blanco: <strong className="text-slate-700 font-mono">{textoPorcentajeOficial}</strong></span>
                    <span>Interno: <strong className="text-slate-700 font-mono">{porcentajeInterno.toFixed(2)}%</strong></span>
                  </div>
                </div>
              </div>

              {/* Margen Operativo */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between min-h-[110px]">
                <div className="flex justify-between items-start">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Margen de Contribución</h3>
                  <div className="p-1 bg-emerald-50 text-emerald-600 rounded"><Target className="w-3.5 h-3.5" /></div>
                </div>
                <div>
                  <strong className="block text-xl font-black font-mono tracking-tight text-emerald-600">
                    {((metricas?.caja_real_total - metricas?.total_gastos) / (metricas?.caja_real_total || 1) * 100).toFixed(2)}%
                  </strong>
                  <span className="block text-[10px] font-medium text-slate-400 mt-0.5">Bruto de operación operativa</span>
                </div>
              </div>
            </section>

            <div className="pt-2">
              <BreakEven gastosTotales={gastosTotalesReales || 0} />
            </div>

          </div>
        )}

        {/* Pestañas de Navegación */}
        <div className="flex justify-start overflow-x-auto pb-4 mb-4 scrollbar-hide">
          <div className="inline-flex bg-gray-200/60 p-1.5 rounded-full whitespace-nowrap">
            <button 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${pestañaActiva === 'ventas' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`} 
              onClick={() => setPestañaActiva('ventas')}
            >
              <ReceiptText className="w-4 h-4" /> Comprobantes Emitidos
            </button>
            <button 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${pestañaActiva === 'gastos' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`} 
              onClick={() => setPestañaActiva('gastos')}
            >
              <CreditCard className="w-4 h-4" /> Listado de Gastos
            </button>
            <button 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${pestañaActiva === 'produccion' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`} 
              onClick={() => setPestañaActiva('produccion')}
            >
              <ChefHat className="w-4 h-4" /> Producción Diaria
            </button>
            <button 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${pestañaActiva === 'clientes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`} 
              onClick={() => setPestañaActiva('clientes')}
            >
              <Users className="w-4 h-4" /> Cta Cte Clientes
            </button>
            <button 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${pestañaActiva === 'proveedores' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`} 
              onClick={() => setPestañaActiva('proveedores')}
            >
              <BookUser className="w-4 h-4" /> Cta Cte Proveedores
            </button>
            <button 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${pestañaActiva === 'configuracion' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`} 
              onClick={() => setPestañaActiva('configuracion')}
            >
              <Settings className="w-4 h-4" /> Costos y Parámetros
            </button>
            <button 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${pestañaActiva === 'tareas' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`} 
              onClick={() => setPestañaActiva('tareas')}
            >
              <ListChecks className="w-4 h-4" /> Pendientes
            </button>
          </div>
        </div>

        {/* Sección Contenido Activo */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          {pestañaActiva === 'ventas' && <ListadoVentas />}
          {pestañaActiva === 'gastos' && <ListadoGastos />}
          {pestañaActiva === 'produccion' && <Produccion />}
          {pestañaActiva === 'clientes' && <Clientes />}
          {pestañaActiva === 'proveedores' && <Proveedores />}
          {pestañaActiva === 'configuracion' && <ConfiguracionCostos />}
          {pestañaActiva === 'tareas' && <TareasPendientes />}
        </section>

      </div>
    </div>
  );
}

export default App;