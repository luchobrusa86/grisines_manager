import { useState } from 'react';
import { Calculator, AlertTriangle, ArrowRight } from 'lucide-react';

interface BreakEvenProps {
  gastosTotales: number;
}

export const BreakEven = ({ gastosTotales }: BreakEvenProps) => {
  const [precioVenta, setPrecioVenta] = useState(11400); 
  const [costoVariable, setCostoVariable] = useState(5000);

  const margenContribucion = precioVenta - costoVariable;
  const cajasBreakEven = margenContribucion > 0 ? Math.ceil(gastosTotales / margenContribucion) : 0;
  const plataBreakEven = cajasBreakEven * precioVenta;

  const isProfitable = margenContribucion > 0;

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 text-gray-900 font-sans">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        
        {/* 1. Título y Costos Fijos */}
        <div className="flex items-center gap-3 min-w-[220px]">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100/50 flex-shrink-0">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-black tracking-tight text-gray-900">Punto de Equilibrio</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
              Gastos del Mes: <strong className="text-red-600 font-mono">${Number(gastosTotales).toLocaleString('es-AR')}</strong>
            </p>
          </div>
        </div>

        {/* 2. Controles / Inputs en formato compacto */}
        <div className="grid grid-cols-2 gap-4 flex-1 max-w-md w-full">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Precio Promedio Venta</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">$</span>
              <input 
                type="number" 
                value={precioVenta} 
                onChange={e => setPrecioVenta(Number(e.target.value))} 
                className="w-full pl-6 pr-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:bg-white focus:border-indigo-500 outline-none transition-all" 
              />
            </div>
          </div>
          
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Costo Variable Caja</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">$</span>
              <input 
                type="number" 
                value={costoVariable} 
                onChange={e => setCostoVariable(Number(e.target.value))} 
                className="w-full pl-6 pr-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:bg-white focus:border-indigo-500 outline-none transition-all" 
              />
            </div>
          </div>
        </div>

        {/* Flecha indicadora visual solo para escritorio */}
        <ArrowRight className="hidden lg:block w-4 h-4 text-gray-300" />

        {/* 3. Panel de Resultado Compacto */}
        <div className={`flex items-center justify-between gap-4 px-4 py-2.5 rounded-xl border transition-colors lg:w-72 w-full ${
          isProfitable 
            ? 'bg-blue-50/60 border-blue-100' 
            : 'bg-red-50/60 border-red-100'
        }`}>
          <div>
            <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Meta de Ventas</span>
            {isProfitable ? (
              <div className="flex items-baseline gap-1 mt-0.5">
                <strong className="text-xl font-black text-blue-700 font-mono tracking-tight">{cajasBreakEven}</strong>
                <span className="text-xs font-bold text-blue-600/80">Cajas</span>
              </div>
            ) : (
              <span className="text-xs font-black text-red-600 tracking-tight block mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Margen Negativo
              </span>
            )}
          </div>

          {isProfitable && (
            <div className="text-right border-l border-blue-200/60 pl-4">
              <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Eq. Facturación</span>
              <strong className="block text-xs font-extrabold text-blue-700 font-mono mt-1">
                ${plataBreakEven.toLocaleString('es-AR')}
              </strong>
            </div>
          )}
        </div>

      </div>
    </section>
  );
};