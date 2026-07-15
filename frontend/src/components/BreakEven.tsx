import { useState } from 'react';
import { Calculator, AlertTriangle } from 'lucide-react';

interface BreakEvenProps {
  gastosTotales: number;
}

const formatearPesos = (valor: number) =>
  Number(valor || 0).toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

export const BreakEven = ({ gastosTotales }: BreakEvenProps) => {
  const [precioVenta, setPrecioVenta] = useState(11400);
  const [costoVariable, setCostoVariable] = useState(5000);

  const margenContribucion = precioVenta - costoVariable;
  const isProfitable = margenContribucion > 0;
  const cajasBreakEven = isProfitable ? Math.ceil(gastosTotales / margenContribucion) : 0;
  const plataBreakEven = cajasBreakEven * precioVenta;

  return (
    <section className="h-full rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
            <Calculator className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="m-0 text-sm font-black tracking-tight text-slate-950">
              Punto de Equilibrio
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                Gastos del mes
              </span>
              <span className="font-mono text-xs font-black text-rose-600">
                ${formatearPesos(gastosTotales)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
              Precio venta
            </span>
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                $
              </span>
              <input
                type="number"
                value={precioVenta}
                onChange={e => setPrecioVenta(Number(e.target.value))}
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-6 pr-2 text-xs font-black text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
              Costo caja
            </span>
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                $
              </span>
              <input
                type="number"
                value={costoVariable}
                onChange={e => setCostoVariable(Number(e.target.value))}
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-6 pr-2 text-xs font-black text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              />
            </div>
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                Meta
              </span>

              {isProfitable ? (
                <div className="mt-1 flex items-baseline gap-1">
                  <strong className="font-mono text-2xl font-black text-indigo-700">
                    {cajasBreakEven}
                  </strong>
                  <span className="text-xs font-black text-indigo-600">
                    cajas
                  </span>
                </div>
              ) : (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1.5 text-[10px] font-black text-red-700 ring-1 ring-red-100">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Margen negativo
                </div>
              )}
            </div>

            {isProfitable && (
              <div className="rounded-xl bg-white px-3 py-2 text-right ring-1 ring-slate-200">
                <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Facturación
                </span>
                <strong className="mt-1 block font-mono text-sm font-black text-slate-900">
                  ${formatearPesos(plataBreakEven)}
                </strong>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
