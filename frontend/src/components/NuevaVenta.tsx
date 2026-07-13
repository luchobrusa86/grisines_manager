import React, { useEffect, useState } from 'react';
import AfipStatus from './AfipStatus';
import {
  Plus,
  X,
  User,
  PackageSearch,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck2,
  BadgeCent
} from 'lucide-react';

type TipoOperacion = 'Venta' | 'Devolucion';
type Unidad = 'Cajas' | 'Paquetes';
type TipoAlerta = 'success' | 'error' | 'warning';

interface Cliente {
  id: string;
  razonSocial: string;
  cuit: string;
  condicionIva: string;
  domicilio: string;
  email: string;
}

interface ItemVenta {
  codigo: string;
  desc: string;
  cant: number;
  unidad: Unidad;
  precio: number;
  iva: string;
  retencion: string;
  tipoOperacion: TipoOperacion;
}

interface Alerta {
  mostrar: boolean;
  tipo: TipoAlerta;
  titulo: string;
  mensaje: string;
}

const clienteInicial: Cliente = {
  id: '',
  razonSocial: '',
  cuit: '',
  condicionIva: 'Consumidor Final',
  domicilio: '',
  email: ''
};

const crearItemInicial = (): ItemVenta => ({
  codigo: '',
  desc: '',
  cant: 1,
  unidad: 'Cajas',
  precio: 0,
  iva: '21',
  retencion: 'Ninguna',
  tipoOperacion: 'Venta'
});

export const NuevaVenta = () => {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [esBlanco, setEsBlanco] = useState(false);
  const [clientesBD, setClientesBD] = useState<any[]>([]);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [mostrarSugerenciasCliente, setMostrarSugerenciasCliente] = useState(false);
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<string | null>(null);

  const [productosBD, setProductosBD] = useState<any[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [alerta, setAlerta] = useState<Alerta>({
    mostrar: false,
    tipo: 'success',
    titulo: '',
    mensaje: ''
  });

  const [cliente, setCliente] = useState<Cliente>(clienteInicial);
  const [items, setItems] = useState<ItemVenta[]>([crearItemInicial()]);
  const [puntoVenta, setPuntoVenta] = useState(1);
  const [nroFactura, setNroFactura] = useState<number | string>('Calculando...');
  const [formaPago, setFormaPago] = useState('Contado');
  const [cae, setCae] = useState('');
  const [vtoCae, setVtoCae] = useState('');

  const limpiarFormulario = () => {
    setCliente(clienteInicial);
    setItems([crearItemInicial()]);
    setEsBlanco(false);
    setPuntoVenta(1);
    setNroFactura('Calculando...');
    setFormaPago('Contado');
    setCae('');
    setVtoCae('');
    setBusquedaCliente('');
    setClienteSeleccionadoId(null);
    setMostrarSugerenciasCliente(false);
  };

  const cerrarModal = () => {
    limpiarFormulario();
    setMostrarModal(false);
  };

  const manejarCierreAlerta = () => {
    if (alerta.tipo === 'success') {
      cerrarModal();
    }

    setAlerta(prev => ({ ...prev, mostrar: false }));
  };

  useEffect(() => {
    if (!mostrarModal) return;

    fetch('http://127.0.0.1:8000/clientes_mayoristas/')
      .then(res => res.json())
      .then(data => setClientesBD(data))
      .catch(err => console.error('Error cargando clientes', err));

    fetch('http://127.0.0.1:8000/productos/')
      .then(res => res.json())
      .then(data => setProductosBD(data))
      .catch(err => console.error('Error cargando productos', err));
  }, [mostrarModal]);

  useEffect(() => {
    const cargarNro = async () => {
      if (!mostrarModal) return;

      setNroFactura('Calculando...');

      try {
        if (esBlanco) {
          const condicionIva = encodeURIComponent(cliente.condicionIva);
          const res = await fetch(
            `http://127.0.0.1:8000/afip/proximo-numero/${puntoVenta}?condicion_iva=${condicionIva}`
          );

          if (!res.ok) throw new Error('Error en AFIP');

          const data = await res.json();
          setNroFactura(data.proximo);
        } else {
          const res = await fetch(
            `http://127.0.0.1:8000/ventas/proximo-numero-interno/${puntoVenta}`
          );

          if (!res.ok) throw new Error('Error en base local');

          const data = await res.json();
          setNroFactura(data.proximo);
        }
      } catch (err) {
        console.error('Fallo:', err);
        setNroFactura('Error');
      }
    };

    cargarNro();
  }, [esBlanco, puntoVenta, mostrarModal, cliente.condicionIva]);

  useEffect(() => {
    const apretarTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mostrarModal && !procesando) {
        cerrarModal();
      }
    };

    window.addEventListener('keydown', apretarTecla);
    return () => window.removeEventListener('keydown', apretarTecla);
  }, [mostrarModal, procesando]);

  const actualizarItem = (index: number, cambios: Partial<ItemVenta>) => {
    setItems(prevItems =>
      prevItems.map((item, i) => (i === index ? { ...item, ...cambios } : item))
    );
  };

  const agregarFila = () => {
    setItems(prevItems => [...prevItems, crearItemInicial()]);
  };

  const eliminarFila = (index: number) => {
    setItems(prevItems => {
      if (prevItems.length <= 1) return prevItems;
      return prevItems.filter((_, i) => i !== index);
    });
  };

  const cambiarTipoOperacion = (
    index: number,
    tipoOperacion: TipoOperacion
  ) => {
    if (tipoOperacion === 'Devolucion') {
      actualizarItem(index, {
        tipoOperacion: 'Devolucion',
        codigo: '998',
        desc: 'Devolución comercial',
        cant: 1,
        unidad: 'Paquetes',
        precio: 0
      });
      return;
    }

    actualizarItem(index, {
      tipoOperacion: 'Venta',
      codigo: '',
      desc: '',
      cant: 1,
      unidad: 'Cajas',
      precio: 0
    });
  };

  const { subtotalCalc, ivaCalc } = items.reduce(
    (acumulado, item) => {
      const multiplicador = item.tipoOperacion === 'Devolucion' ? -1 : 1;
      const monto = item.cant * item.precio * multiplicador;

      acumulado.subtotalCalc += monto;

      if (esBlanco && item.iva !== 'Exento') {
        acumulado.ivaCalc += monto * (Number(item.iva) / 100);
      }

      return acumulado;
    },
    { subtotalCalc: 0, ivaCalc: 0 }
  );

  const totalFinal = subtotalCalc + ivaCalc;

  const enviarFactura = async () => {
    if (!cliente.razonSocial) {
      setAlerta({
        mostrar: true,
        tipo: 'warning',
        titulo: 'Datos incompletos',
        mensaje: 'La razón social es obligatoria.'
      });
      return;
    }

    const itemConCantidadInvalida = items.some(
      item => !Number.isFinite(item.cant) || item.cant <= 0
    );

    if (itemConCantidadInvalida) {
      setAlerta({
        mostrar: true,
        tipo: 'warning',
        titulo: 'Cantidad inválida',
        mensaje: 'Todas las líneas deben tener una cantidad mayor que cero.'
      });
      return;
    }

    const itemConPrecioInvalido = items.some(
      item => !Number.isFinite(item.precio) || item.precio <= 0
    );

    if (itemConPrecioInvalido) {
      setAlerta({
        mostrar: true,
        tipo: 'warning',
        titulo: 'Precio inválido',
        mensaje: 'Todas las líneas deben tener un precio unitario mayor que cero.'
      });
      return;
    }

    const ventaInvalida = items.some(
      item =>
        item.tipoOperacion === 'Venta' &&
        (!item.codigo.trim() || !item.desc.trim())
    );

    if (ventaInvalida) {
      setAlerta({
        mostrar: true,
        tipo: 'warning',
        titulo: 'Producto incompleto',
        mensaje: 'Todas las líneas de venta deben tener código y descripción.'
      });
      return;
    }

    const hayVenta = items.some(item => item.tipoOperacion === 'Venta');

    if (!hayVenta) {
      setAlerta({
        mostrar: true,
        tipo: 'warning',
        titulo: 'Venta requerida',
        mensaje: 'Debe existir al menos una línea de venta.'
      });
      return;
    }

    const totalVentas = items
      .filter(item => item.tipoOperacion === 'Venta')
      .reduce((total, item) => total + item.cant * item.precio, 0);

    const totalDevoluciones = items
      .filter(item => item.tipoOperacion === 'Devolucion')
      .reduce((total, item) => total + item.cant * item.precio, 0);

    if (totalDevoluciones > totalVentas || totalFinal < 0) {
      setAlerta({
        mostrar: true,
        tipo: 'warning',
        titulo: 'Devolución inválida',
        mensaje: 'El importe de las devoluciones no puede superar el importe de las ventas.'
      });
      return;
    }

    if (esBlanco) {
      const seguro = window.confirm(
        'ATENCIÓN: Estás por generar una factura OFICIAL.\n\n' +
          'Esta acción enviará los datos a ARCA/AFIP para generar el CAE y no se puede deshacer.\n\n' +
          '¿Estás seguro de que los montos y el cliente son correctos?'
      );

      if (!seguro) return;
    }

    const payloadCliente = {
      razonSocial: cliente.razonSocial,
      cuit: cliente.cuit,
      condicionIva: cliente.condicionIva,
      domicilio: cliente.domicilio,
      email: cliente.email
    };

    const itemsNormalizados = items.map(item => {
      const esDevolucion = item.tipoOperacion === 'Devolucion';
      const esDevolucionEnvase = esDevolucion && item.codigo === '999';

      return {
        ...item,

        codigo: esDevolucion
          ? esDevolucionEnvase
            ? '999'
            : '998'
          : item.codigo,

        desc: esDevolucion
          ? esDevolucionEnvase
            ? 'Cajas Vacías (Envase)'
            : 'Devolución comercial'
          : item.desc,

        tipoOperacion: item.tipoOperacion,

        // Las ventas internas no llevan IVA discriminado.
        iva: esBlanco ? item.iva : '0'
      };
    });

    const payload = {
      cliente: payloadCliente,
      items: itemsNormalizados,
      es_oficial: esBlanco,
      total: totalFinal,
      punto_venta: puntoVenta,
      nro_factura: Number(nroFactura),
      forma_pago: formaPago
    };

    setProcesando(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/ventas/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        if (esBlanco && data.cae) {
          setCae(data.cae || '');
          setVtoCae(data.vto_cae || data.vtoCae || '');
          setAlerta({
            mostrar: true,
            tipo: 'success',
            titulo: '¡Factura autorizada!',
            mensaje:
              `Aprobada por ARCA.\nCAE: ${data.cae}\nNro: ` +
              `${payload.punto_venta.toString().padStart(4, '0')}-` +
              `${Number(nroFactura).toString().padStart(8, '0')}`
          });
        } else {
          setAlerta({
            mostrar: true,
            tipo: 'success',
            titulo: '¡Venta registrada!',
            mensaje: 'La operación interna se guardó con éxito.'
          });
        }
      } else {
        setAlerta({
          mostrar: true,
          tipo: 'error',
          titulo: 'Hubo un problema',
          mensaje: data.detail || 'Error en el servidor.'
        });
      }
    } catch (error) {
      console.error(error);
      setAlerta({
        mostrar: true,
        tipo: 'error',
        titulo: 'Error de conexión',
        mensaje: 'No se pudo conectar con el backend.'
      });
    } finally {
      setProcesando(false);
    }
  };

  const numeroValido = typeof nroFactura === 'number' && !Number.isNaN(nroFactura);

  const clientesFiltrados = clientesBD
    .filter((c: any) => {
      const texto = `${c.nombre || ''} ${c.cuit || ''}`.toLowerCase();
      return texto.includes(busquedaCliente.toLowerCase());
    })
    .slice(0, 8);

  const seleccionarClienteAgenda = (c: any) => {
    setCliente({
      id: c.id ? c.id.toString() : '',
      razonSocial: c.nombre || '',
      cuit: c.cuit || '',
      condicionIva:
        c.condicion_iva || c.condicionIva || 'Consumidor Final',
      domicilio: c.domicilio || '',
      email: c.email || ''
    });

    setBusquedaCliente(
      `${c.nombre || ''}${c.cuit ? ` - ${c.cuit}` : ''}`
    );
    setClienteSeleccionadoId(
      c.id ? c.id.toString() : c.cuit || c.nombre || null
    );
    setMostrarSugerenciasCliente(false);
  };

  const limpiarClienteSeleccionado = () => {
    setCliente(clienteInicial);
    setBusquedaCliente('');
    setClienteSeleccionadoId(null);
    setMostrarSugerenciasCliente(false);
  };

  return (
    <>
      <button
        onClick={() => setMostrarModal(true)}
        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold uppercase tracking-wide rounded-full hover:bg-emerald-100 transition-all shadow-sm active:scale-95 text-sm w-full sm:w-auto"
      >
        <Plus className="w-5 h-5 text-emerald-600" />
        Nueva Factura / Op.
      </button>

      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          {alerta.mostrar && (
            <div className="absolute inset-0 z-[60] flex items-center justify-center bg-white/80 backdrop-blur-md rounded-2xl">
              <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-center mb-4">
                  {alerta.tipo === 'success' && (
                    <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                  )}
                  {alerta.tipo === 'warning' && (
                    <AlertTriangle className="w-16 h-16 text-amber-500" />
                  )}
                  {alerta.tipo === 'error' && (
                    <XCircle className="w-16 h-16 text-red-500" />
                  )}
                </div>

                <h3 className="text-xl font-extrabold text-gray-900 mb-2">
                  {alerta.titulo}
                </h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap mb-6">
                  {alerta.mensaje}
                </p>
                <button
                  onClick={manejarCierreAlerta}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-white transition-all active:scale-95 ${
                    alerta.tipo === 'success'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : alerta.tipo === 'warning'
                        ? 'bg-amber-500 hover:bg-amber-600'
                        : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Aceptar
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden relative">
            <header className="flex justify-between items-center px-6 py-4 bg-slate-900 text-white flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-bold tracking-tight m-0">
                    Generador ARCA Ready
                  </h2>
                </div>
                <AfipStatus />
              </div>

              <button
                onClick={cerrarModal}
                className="text-slate-400 hover:text-white transition-colors p-1"
                disabled={procesando}
              >
                <X className="w-6 h-6" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-6">
              <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Tipo de Registro
                    </label>
                    <select
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                      value={esBlanco ? 'blanco' : 'negro'}
                      onChange={e => {
                        const blanco = e.target.value === 'blanco';
                        setEsBlanco(blanco);
                        setPuntoVenta(blanco ? 2 : 1);
                      }}
                    >
                      <option value="negro">Interno (X)</option>
                      <option value="blanco">Oficial (ARCA)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Punto Vta.
                    </label>
                    <input
                      className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500 font-mono outline-none cursor-not-allowed"
                      type="number"
                      value={puntoVenta}
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Nro. Comprobante
                    </label>
                    <input
                      className={`w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm font-mono outline-none cursor-not-allowed ${
                        numeroValido
                          ? 'text-gray-900'
                          : 'text-red-500 font-bold'
                      }`}
                      type="text"
                      value={nroFactura}
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Fecha
                    </label>
                    <input
                      className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500 font-medium outline-none cursor-not-allowed"
                      type="text"
                      value={new Date().toLocaleDateString('es-AR')}
                      readOnly
                    />
                  </div>
                </div>
              </section>

              <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                  <div className="flex items-center gap-2 text-gray-900">
                    <User className="w-5 h-5 text-blue-600" />
                    <h3 className="text-base font-extrabold m-0">
                      Datos del Cliente
                    </h3>
                  </div>

                  <div className="w-full sm:w-80 relative">
                    <div className="relative">
                      <input
                        type="text"
                        value={busquedaCliente}
                        placeholder="Buscar cliente por nombre o CUIT..."
                        onFocus={() => setMostrarSugerenciasCliente(true)}
                        onChange={e => {
                          setBusquedaCliente(e.target.value);
                          setMostrarSugerenciasCliente(true);

                          if (!e.target.value) {
                            setClienteSeleccionadoId(null);
                          }
                        }}
                        className="w-full px-4 py-2.5 text-sm font-semibold border border-blue-200 rounded-lg bg-blue-50/60 text-blue-900 placeholder:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      {clienteSeleccionadoId && (
                        <button
                          type="button"
                          onClick={limpiarClienteSeleccionado}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 hover:text-red-500"
                        >
                          Limpiar
                        </button>
                      )}

                      {mostrarSugerenciasCliente &&
                        busquedaCliente &&
                        clientesFiltrados.length > 0 && (
                          <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                            {clientesFiltrados.map((c: any) => (
                              <button
                                key={`${c.id || c.cuit || ''}-${c.nombre}`}
                                type="button"
                                onClick={() => seleccionarClienteAgenda(c)}
                                className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                              >
                                <p className="text-sm font-bold text-gray-900">
                                  {c.nombre}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {c.cuit || 'Sin CUIT cargado'}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}

                      {mostrarSugerenciasCliente &&
                        busquedaCliente &&
                        clientesFiltrados.length === 0 && (
                          <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl p-4">
                            <p className="text-xs text-gray-500">
                              No se encontraron clientes. Podés cargar los datos
                              manualmente.
                            </p>
                          </div>
                        )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Razón Social
                    </label>
                    <input
                      className="w-full px-4 py-2.5 border rounded-lg text-sm outline-none transition-all bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed opacity-75"
                      type="text"
                      value={cliente.razonSocial}
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      CUIT / DNI
                    </label>
                    <input
                      className="w-full px-4 py-2.5 border rounded-lg text-sm outline-none transition-all bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed opacity-75"
                      type="text"
                      value={cliente.cuit}
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Condición IVA
                    </label>
                    <select
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      value={cliente.condicionIva}
                      onChange={e =>
                        setCliente({
                          ...cliente,
                          condicionIva: e.target.value
                        })
                      }
                    >
                      <option>Consumidor Final</option>
                      <option>Responsable Inscripto</option>
                      <option>Monotributista</option>
                      <option>Exento</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Forma de Pago
                    </label>
                    <select
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      value={formaPago}
                      onChange={e => setFormaPago(e.target.value)}
                    >
                      <option>Contado</option>
                      <option>A Cuenta (Cta. Cte.)</option>
                      <option>Transferencia</option>
                      <option>Tarjeta</option>
                    </select>
                  </div>
                </div>
              </section>

              <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 text-gray-900 mb-4">
                  <PackageSearch className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-extrabold m-0">
                    Detalle de la Operación
                  </h3>
                </div>

                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold text-amber-800">
                    Las devoluciones descuentan únicamente del importe. No se
                    asignan a un sabor y no modifican el stock.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-gray-50 border-y border-gray-200">
                        <th className="px-3 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-[12%]">
                          Tipo
                        </th>
                        <th className="px-3 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-[12%]">
                          Cód.
                        </th>
                        <th className="px-3 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-[24%]">
                          Descripción
                        </th>
                        <th className="px-3 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center w-[8%]">
                          Cant.
                        </th>
                        <th className="px-3 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-[12%]">
                          Unidad
                        </th>
                        <th className="px-3 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right w-[12%]">
                          Precio U.
                        </th>
                        {esBlanco && (
                          <th className="px-3 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center w-[8%]">
                            IVA %
                          </th>
                        )}
                        <th className="px-3 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right w-[14%]">
                          Subtotal
                        </th>
                        <th className="px-3 py-3 w-[4%]"></th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {items.map((item, index) => {
                        const esDevolucion =
                          item.tipoOperacion === 'Devolucion';
                        const subtotalItem = item.cant * item.precio;

                        return (
                          <tr
                            key={index}
                            className="hover:bg-gray-50/50 transition-colors"
                          >
                            <td className="px-2 py-3">
                              <select
                                className={`w-full px-2 py-2 border rounded-md text-xs font-bold outline-none transition-colors ${
                                  esDevolucion
                                    ? 'bg-red-50 border-red-200 text-red-700'
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                }`}
                                value={item.tipoOperacion}
                                onChange={e =>
                                  cambiarTipoOperacion(
                                    index,
                                    e.target.value as TipoOperacion
                                  )
                                }
                              >
                                <option value="Venta">+ Venta</option>
                                <option value="Devolucion">
                                  - Devolución
                                </option>
                              </select>
                            </td>

                            <td className="px-2 py-3">
                              <input
                                className={`w-full px-2 py-2 border rounded-md text-xs outline-none ${
                                  esDevolucion
                                    ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                }`}
                                type="text"
                                list={
                                  esDevolucion ? undefined : 'lista-productos'
                                }
                                placeholder="Ej: 001"
                                value={item.codigo}
                                disabled={esDevolucion}
                                onChange={e => {
                                  const val = e.target.value;

                                  if (val === '999') {
                                    actualizarItem(index, {
                                      codigo: '999',
                                      desc: 'Cajas Vacías (Envase)',
                                      unidad: 'Cajas',
                                      tipoOperacion: 'Devolucion',
                                      precio: 0
                                    });
                                    return;
                                  }

                                  const prodEncontrado = productosBD.find(
                                    p => p.codigo === val
                                  );

                                  actualizarItem(index, {
                                    codigo: val,
                                    desc: prodEncontrado
                                      ? prodEncontrado.descripcion
                                      : item.desc
                                  });
                                }}
                              />
                            </td>

                            <td className="px-2 py-3">
                              <input
                                className={`w-full px-3 py-2 border rounded-md text-xs outline-none ${
                                  esDevolucion
                                    ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                }`}
                                type="text"
                                placeholder="Descripción..."
                                value={item.desc}
                                disabled={esDevolucion}
                                onChange={e =>
                                  actualizarItem(index, {
                                    desc: e.target.value
                                  })
                                }
                              />
                            </td>

                            <td className="px-2 py-3">
                              <input
                                className="w-full px-2 py-2 bg-white border border-gray-300 rounded-md text-xs text-gray-900 text-center font-semibold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                type="number"
                                min="1"
                                step="1"
                                value={item.cant}
                                onChange={e =>
                                  actualizarItem(index, {
                                    cant: Number(e.target.value)
                                  })
                                }
                              />
                            </td>

                            <td className="px-2 py-3">
                              <select
                                className={`w-full px-2 py-2 border rounded-md text-xs font-bold outline-none transition-colors ${
                                  item.unidad === 'Cajas'
                                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                                    : 'bg-orange-50 border-orange-200 text-orange-800'
                                }`}
                                value={item.unidad}
                                onChange={e =>
                                  actualizarItem(index, {
                                    unidad: e.target.value as Unidad
                                  })
                                }
                              >
                                <option value="Cajas">📦 Cajas</option>
                                <option value="Paquetes">🥖 Paquetes</option>
                              </select>
                            </td>

                            <td className="px-2 py-3">
                              <input
                                className="w-full px-2 py-2 bg-white border border-gray-300 rounded-md text-xs text-gray-900 text-right font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={item.precio}
                                onChange={e =>
                                  actualizarItem(index, {
                                    precio: Number(e.target.value)
                                  })
                                }
                              />
                            </td>

                            {esBlanco && (
                              <td className="px-2 py-3">
                                <select
                                  className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-600 outline-none"
                                  value={item.iva}
                                  onChange={e =>
                                    actualizarItem(index, {
                                      iva: e.target.value
                                    })
                                  }
                                >
                                  <option value="21">21%</option>
                                  <option value="10.5">10.5%</option>
                                  <option value="Exento">Exento</option>
                                </select>
                              </td>
                            )}

                            <td className="px-2 py-3 text-right whitespace-nowrap">
                              <span
                                className={`text-sm font-bold tracking-tight ${
                                  esDevolucion
                                    ? 'text-red-600'
                                    : 'text-gray-900'
                                }`}
                              >
                                {esDevolucion ? '-' : ''}$
                                {subtotalItem.toLocaleString('es-AR', {
                                  minimumFractionDigits: 2
                                })}
                              </span>
                            </td>

                            <td className="px-2 py-3 text-center">
                              <button
                                onClick={() => eliminarFila(index)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Eliminar fila"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3">
                  <button
                    onClick={agregarFila}
                    className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 rounded-md hover:bg-blue-50"
                  >
                    <Plus className="w-4 h-4" /> Agregar Ítem
                  </button>
                </div>
              </section>

              <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="w-full md:w-1/2 p-4 border border-blue-200 bg-blue-50/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <BadgeCent className="w-4 h-4 text-blue-500" />
                    <h4 className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest m-0">
                      Autorización ARCA
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                        CAE Nro.
                      </label>
                      <input
                        className="w-full px-3 py-2 bg-white/60 border border-blue-100 rounded-lg text-xs text-gray-500 font-mono outline-none cursor-not-allowed"
                        disabled
                        value={cae}
                        placeholder="Pendiente..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Vto. CAE
                      </label>
                      <input
                        className="w-full px-3 py-2 bg-white/60 border border-blue-100 rounded-lg text-xs text-gray-500 font-mono outline-none cursor-not-allowed"
                        disabled
                        value={vtoCae}
                        placeholder="--"
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-64">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-500">
                      Subtotal:
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        subtotalCalc < 0 ? 'text-red-500' : 'text-gray-900'
                      }`}
                    >
                      {subtotalCalc < 0 ? '-' : ''}$
                      {Math.abs(subtotalCalc).toLocaleString('es-AR', {
                        minimumFractionDigits: 2
                      })}
                    </span>
                  </div>

                  {esBlanco && (
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-500">
                        IVA Calc.:
                      </span>
                      <span className="text-sm font-semibold text-gray-600">
                        {ivaCalc < 0 ? '-' : ''}$
                        {Math.abs(ivaCalc).toLocaleString('es-AR', {
                          minimumFractionDigits: 2
                        })}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-base font-extrabold text-gray-900">
                      TOTAL:
                    </span>
                    <span
                      className={`text-2xl font-black tracking-tight ${
                        totalFinal < 0 ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      {totalFinal < 0 ? '-' : ''}$
                      {Math.abs(totalFinal).toLocaleString('es-AR', {
                        minimumFractionDigits: 2
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <footer className="flex justify-end items-center gap-3 px-6 py-4 bg-white border-t border-gray-200 flex-shrink-0">
              <button
                onClick={cerrarModal}
                className="px-6 py-2.5 rounded-full text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                disabled={procesando}
              >
                Cancelar
              </button>

              <button
                onClick={enviarFactura}
                className={`px-8 py-2.5 rounded-full text-sm font-bold text-white transition-all shadow-sm ${
                  procesando || !numeroValido
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-95 hover:shadow-md'
                }`}
                disabled={procesando || !numeroValido}
              >
                {procesando
                  ? '⏳ Procesando...'
                  : !numeroValido
                    ? '❌ Error Comprobante'
                    : 'Confirmar y Emitir'}
              </button>
            </footer>
          </div>
        </div>
      )}

      <datalist id="lista-productos">
        {productosBD.map((p, i) => (
          <option key={i} value={p.codigo}>
            {p.descripcion}
          </option>
        ))}
      </datalist>
    </>
  );
};
