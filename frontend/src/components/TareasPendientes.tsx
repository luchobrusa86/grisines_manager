import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  ClipboardList,
  Plus,
  Trash2,
  CalendarCheck,
  RefreshCw
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

type Tarea = {
  id: number;
  descripcion: string;
  fecha_creacion: string;
  completada: boolean;
  fecha_completada?: string | null;
};

export function TareasPendientes() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [descripcion, setDescripcion] = useState('');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [filtro, setFiltro] = useState<'todas' | 'pendientes' | 'hechas'>('pendientes');

  const cargarTareas = async () => {
    setCargando(true);

    try {
      const res = await fetch(`${API_URL}/tareas/`);

      if (!res.ok) {
        throw new Error('No se pudieron cargar las tareas.');
      }

      const data = await res.json();
      setTareas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert('No se pudieron cargar los pendientes.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTareas();
  }, []);

  const crearTarea = async (e: React.FormEvent) => {
    e.preventDefault();

    const texto = descripcion.trim();

    if (!texto) {
      return;
    }

    setGuardando(true);

    try {
      const res = await fetch(`${API_URL}/tareas/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          descripcion: texto
        })
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.detail || 'No se pudo crear la tarea.');
      }

      setDescripcion('');
      await cargarTareas();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'No se pudo crear la tarea.');
    } finally {
      setGuardando(false);
    }
  };

  const alternarTarea = async (tarea: Tarea) => {
    try {
      const res = await fetch(`${API_URL}/tareas/${tarea.id}/toggle`, {
        method: 'PUT'
      });

      if (!res.ok) {
        throw new Error('No se pudo actualizar la tarea.');
      }

      const actualizada = await res.json();

      setTareas((actuales) =>
        actuales.map((t) => (t.id === tarea.id ? actualizada : t))
      );
    } catch (error) {
      console.error(error);
      alert('No se pudo actualizar el pendiente.');
    }
  };

  const eliminarTarea = async (tarea: Tarea) => {
    const confirmar = window.confirm(`¿Eliminar este pendiente?\n\n${tarea.descripcion}`);

    if (!confirmar) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/tareas/${tarea.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error('No se pudo eliminar la tarea.');
      }

      setTareas((actuales) => actuales.filter((t) => t.id !== tarea.id));
    } catch (error) {
      console.error(error);
      alert('No se pudo eliminar el pendiente.');
    }
  };

  const tareasFiltradas = useMemo(() => {
    if (filtro === 'pendientes') {
      return tareas.filter((t) => !t.completada);
    }

    if (filtro === 'hechas') {
      return tareas.filter((t) => t.completada);
    }

    return tareas;
  }, [tareas, filtro]);

  const totalPendientes = tareas.filter((t) => !t.completada).length;
  const totalHechas = tareas.filter((t) => t.completada).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <ClipboardList className="w-4 h-4" />
            Organización interna
          </span>
          <h2 className="text-xl font-black text-slate-900 mt-1 mb-0">
            Pendientes de hacer
          </h2>
          <p className="text-xs font-semibold text-slate-400 mt-1 mb-0">
            Cargá tareas, marcalas como hechas y guardá automáticamente la fecha de finalización.
          </p>
        </div>

        <button
          type="button"
          onClick={cargarTareas}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-xs font-black uppercase tracking-wide text-slate-500 hover:bg-gray-50 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      <div className="p-6 border-b border-gray-100">
        <form onSubmit={crearTarea} className="flex flex-col md:flex-row gap-3">
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: Comprar bolsas, llamar al proveedor, revisar stock..."
            className="flex-1 h-11 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all"
          />

          <button
            type="submit"
            disabled={guardando || !descripcion.trim()}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-wide hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
          >
            <Plus className="w-4 h-4" />
            Agregar pendiente
          </button>
        </form>
      </div>

      <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFiltro('pendientes')}
            className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wide border transition-all ${
              filtro === 'pendientes'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-white text-slate-400 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Pendientes ({totalPendientes})
          </button>

          <button
            onClick={() => setFiltro('hechas')}
            className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wide border transition-all ${
              filtro === 'hechas'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-white text-slate-400 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Hechas ({totalHechas})
          </button>

          <button
            onClick={() => setFiltro('todas')}
            className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wide border transition-all ${
              filtro === 'todas'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-400 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Todas ({tareas.length})
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {tareasFiltradas.length === 0 ? (
          <div className="p-10 text-center">
            <ClipboardList className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-500 mb-1">
              No hay pendientes para mostrar.
            </p>
            <p className="text-xs text-slate-400 mb-0">
              Agregá una tarea nueva desde el campo superior.
            </p>
          </div>
        ) : (
          tareasFiltradas.map((tarea) => (
            <div
              key={tarea.id}
              className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                tarea.completada ? 'bg-emerald-50/30' : 'bg-white hover:bg-gray-50'
              }`}
            >
              <button
                type="button"
                onClick={() => alternarTarea(tarea)}
                className="flex items-start gap-3 text-left group flex-1"
              >
                {tarea.completada ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-6 h-6 text-slate-300 group-hover:text-amber-500 flex-shrink-0 mt-0.5" />
                )}

                <div>
                  <p
                    className={`text-sm font-black mb-1 ${
                      tarea.completada
                        ? 'text-slate-400 line-through'
                        : 'text-slate-800'
                    }`}
                  >
                    {tarea.descripcion}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-400">
                    <span>Creada: {tarea.fecha_creacion || '-'}</span>

                    {tarea.completada && (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <CalendarCheck className="w-3.5 h-3.5" />
                        Hecha: {tarea.fecha_completada || '-'}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => eliminarTarea(tarea)}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-black text-red-500 hover:bg-red-50 transition-all"
                title="Eliminar pendiente"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
