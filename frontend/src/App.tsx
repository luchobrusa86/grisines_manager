import { useEffect, useMemo, useState } from 'react';
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
import { API_URL } from './lib/api';
import {
  AlertCircle,
  Banknote,
  Boxes,
  BookUser,
  ChefHat,
  CreditCard,
  Factory,
  Gauge,
  HardHat,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Menu,
  Package,
  ReceiptText,
  Settings,
  Users,
  Wheat,
  X
} from 'lucide-react';

const MESES = [
  { val: 1, nombre: 'Enero' },
  { val: 2, nombre: 'Febrero' },
  { val: 3, nombre: 'Marzo' },
  { val: 4, nombre: 'Abril' },
  { val: 5, nombre: 'Mayo' },
  { val: 6, nombre: 'Junio' },
  { val: 7, nombre: 'Julio' },
  { val: 8, nombre: 'Agosto' },
  { val: 9, nombre: 'Septiembre' },
  { val: 10, nombre: 'Octubre' },
  { val: 11, nombre: 'Noviembre' },
  { val: 12, nombre: 'Diciembre' }
];

type TabId =
  | 'ventas'
  | 'gastos'
  | 'produccion'
  | 'clientes'
  | 'proveedores'
  | 'configuracion'
  | 'tareas';

const TABS: Array<{ id: TabId; label: string; short: string; icon: typeof ReceiptText }> = [
  { id: 'ventas', label: 'Comprobantes', short: 'Ventas', icon: ReceiptText },
  { id: 'gastos', label: 'Gastos', short: 'Gastos', icon: CreditCard },
  { id: 'produccion', label: 'Producción', short: 'Prod.', icon: ChefHat },
  { id: 'clientes', label: 'Clientes', short: 'Clientes', icon: Users },
  { id: 'proveedores', label: 'Proveedores', short: 'Prov.', icon: BookUser },
  { id: 'configuracion', label: 'Costos', short: 'Costos', icon: Settings },
  { id: 'tareas', label: 'Pendientes', short: 'Tareas', icon: ListChecks }
];

function App() {
  const [metricas, setMetricas] = useState<any>(null);
  const [mostrarIndicadores, setMostrarIndicadores] = useState(true);
  const [pestañaActiva, setPestañaActiva] = useState<TabId>('ventas');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cargandoMetricas, setCargandoMetricas] = useState(false);

  const fechaActual = new Date();
  const [mesFiltro, setMesFiltro] = useState(fechaActual.getMonth() + 1);
  const [anioFiltro, setAnioFiltro] = useState(fechaActual.getFullYear());

  const actualizarMetricas = async () => {
    setCargandoMetricas(true);

    try {
      const res = await fetch(
        `${API_URL}/dashboard/metricas?mes=${mesFiltro}&anio=${anioFiltro}`
      );
      const data = await res.json();
      setMetricas(data);
    } catch (e) {
      console.error('Error cargando métricas', e);
    } finally {
      setCargandoMetricas(false);
    }
  };

  useEffect(() => {
    void actualizarMetricas();
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

  const ventaTotal = Number(metricas?.caja_real_total || 0);
  const ventaNetaOperativa = ventaTotal - gastosTotalesReales;

  const margenRentabilidadNeto = ventaTotal > 0
    ? ((Number(metricas?.balance_neto || 0) / ventaTotal) * 100).toFixed(2)
    : '0.00';

  const paquetesProducidos = Number(metricas?.paquetes_producidos || 0);

  const costoTotalPorPaquete =
    Number(metricas?.costo_total_por_paquete || 0) ||
    (
      paquetesProducidos > 0
        ? Number(metricas?.costo_produccion_total || 0) / paquetesProducidos
        : 0
    );

  const costoOperativoPorPaquete =
    paquetesProducidos > 0
      ? (
          Number(metricas?.costo_produccion_total || 0) +
          gastosOperativosSinDuplicar
        ) / paquetesProducidos
      : 0;

  const stockProductos = useMemo(() => {
    if (!metricas?.stock_productos) return [];

    return [...metricas.stock_productos]
      .filter((prod: any) =>
        prod.codigo !== '999' &&
        !String(prod.descripcion || '').toLowerCase().includes('envase') &&
        !String(prod.descripcion || '').toLowerCase().includes('caja')
      )
      .sort((a: any, b: any) =>
        String(a.codigo).localeCompare(
          String(b.codigo),
          undefined,
          { numeric: true }
        )
      );
  }, [metricas?.stock_productos]);

  const stockTotal = useMemo(() => {
    const totalPaquetes = stockProductos.reduce(
      (total: number, prod: any) => total + Number(prod.stock_paquetes || 0),
      0
    );

    const esNegativo = totalPaquetes < 0;
    const paquetesAbs = Math.abs(totalPaquetes);
    const cajas = Math.floor(paquetesAbs / 12);
    const paquetesSueltos = paquetesAbs % 12;

    const textoCajas = totalPaquetes === 0
      ? '0 cajas'
      : paquetesSueltos === 0
        ? `${esNegativo ? '-' : ''}${cajas} cajas`
        : `${esNegativo ? '-' : ''}${cajas} cajas + ${paquetesSueltos} paq.`;

    return {
      totalPaquetes,
      esNegativo,
      textoCajas
    };
  }, [stockProductos]);

  const getColorSaborStock = (descripcion: string) => {
    const sabor = (descripcion || '').toLowerCase();

    if (sabor.includes('natural')) return 'gm-stock-natural';
    if (sabor.includes('queso')) return 'gm-stock-queso';
    if (sabor.includes('pizza')) return 'gm-stock-pizza';
    if (sabor.includes('orégano') || sabor.includes('oregano')) return 'gm-stock-oregano';
    if (sabor.includes('cebolla')) return 'gm-stock-cebolla';
    if (sabor.includes('provenzal')) return 'gm-stock-provenzal';
    if (sabor.includes('oliva')) return 'gm-stock-oliva';
    if (sabor.includes('pan rallado')) return 'gm-stock-pan';

    return 'gm-stock-default';
  };

  const activeTab = TABS.find((tab) => tab.id === pestañaActiva) || TABS[0];

  const renderContenido = () => {
    if (pestañaActiva === 'ventas') return <ListadoVentas />;
    if (pestañaActiva === 'gastos') return <ListadoGastos />;
    if (pestañaActiva === 'produccion') return <Produccion />;
    if (pestañaActiva === 'clientes') return <Clientes />;
    if (pestañaActiva === 'proveedores') return <Proveedores />;
    if (pestañaActiva === 'configuracion') return <ConfiguracionCostos />;
    return <TareasPendientes />;
  };

  return (
    <div className="gm-app">
      <aside className={`gm-sidebar ${menuAbierto ? 'gm-sidebar-open' : ''}`}>
        <div className="gm-sidebar-top">
          <div className="gm-brand-mini">
            <img
			  src={logoEmpresa}
			  alt="Logo María Luján"
			  className="gm-logo"
			/>
          </div>

          <button
            className="gm-icon-button gm-mobile-only"
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="gm-side-nav">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const activo = pestañaActiva === tab.id;

            return (
              <button
                key={tab.id}
                className={`gm-side-link ${activo ? 'gm-side-link-active' : ''}`}
                onClick={() => {
                  setPestañaActiva(tab.id);
                  setMenuAbierto(false);
                }}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="gm-sidebar-card">
          <span>API</span>
          <strong>{API_URL.replace('https://', '').replace('http://', '')}</strong>
        </div>
      </aside>

      {menuAbierto && (
        <button
          className="gm-mobile-backdrop"
          aria-label="Cerrar menú"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      <main className="gm-main">
        <header className="gm-topbar">
          <div className="gm-topbar-left">
            <button
              className="gm-icon-button gm-mobile-only"
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <span className="gm-eyebrow">María Luján</span>
              <h1>{activeTab.label}</h1>
            </div>
          </div>

          <div className="gm-topbar-actions">
            <button
              onClick={() => {
                setMostrarIndicadores(!mostrarIndicadores);
                void actualizarMetricas();
              }}
              className="gm-secondary-button"
            >
              <LayoutDashboard className="w-4 h-4" />
              {mostrarIndicadores ? 'Ocultar tablero' : 'Ver tablero'}
            </button>

            <NuevaVenta />

            <NuevoGasto
              onGastoCreado={() => {
                void actualizarMetricas();
                setPestañaActiva('gastos');
              }}
            />
          </div>
        </header>

        {metricas?.errores_cae > 0 && (
          <div className="gm-alert">
            <AlertCircle className="w-5 h-5" />
            <span>
              Tenés {metricas.errores_cae} comprobante(s) oficial(es) pendiente(s) de autorización ante ARCA.
            </span>
          </div>
        )}

        {mostrarIndicadores && (
          <section className="gm-dashboard">
            <div className="gm-dashboard-header">
              <div>
                <span className="gm-eyebrow">Tablero</span>
                <h2>Rendimiento del período</h2>
              </div>

              <div className="gm-filter-group">
                <select
                  value={mesFiltro}
                  onChange={(e) => setMesFiltro(Number(e.target.value))}
                >
                  {MESES.map((mes) => (
                    <option key={mes.val} value={mes.val}>{mes.nombre}</option>
                  ))}
                </select>

                <select
                  value={anioFiltro}
                  onChange={(e) => setAnioFiltro(Number(e.target.value))}
                >
                  {[2024, 2025, 2026, 2027, 2028].map((anio) => (
                    <option key={anio} value={anio}>{anio}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="gm-kpi-grid">
              <article className="gm-kpi-card gm-kpi-primary">
                <span>Venta total</span>
                <strong>${formatCurrency(ventaTotal)}</strong>
                <p>Facturación directa + cuenta corriente</p>
              </article>

              <article className="gm-kpi-card gm-kpi-danger">
                <span>Gastos del período</span>
                <strong>-${formatCurrency(gastosTotalesReales)}</strong>
                <p>Total cargado en gastos y compras</p>
              </article>

              <article className={`gm-kpi-card ${ventaNetaOperativa >= 0 ? 'gm-kpi-success' : 'gm-kpi-warning'}`}>
                <span>Venta neta</span>
                <strong>${formatCurrency(ventaNetaOperativa)}</strong>
                <p>Venta total - gastos del período</p>
              </article>

              <article className="gm-kpi-card gm-kpi-muted">
                <span>Rentabilidad limpia</span>
                <strong>${formatCurrency(metricas?.balance_neto)}</strong>
                <p>Margen neto: {margenRentabilidadNeto}%</p>
              </article>
            </div>

            <div className="gm-analytics-grid">
              <div className="gm-panel">
                <div className="gm-panel-title">
                  <Factory className="w-4 h-4" />
                  <h3>Costo fábrica</h3>
                </div>

                <div className="gm-data-list">
                  <div><span>Costo total</span><strong>${formatCurrency(metricas?.costo_produccion_total)}</strong></div>
                  <div><span>Paquetes producidos</span><strong>{paquetesProducidos.toLocaleString('es-AR')}</strong></div>
                  <div><span>Costo fábrica / paq.</span><strong>${formatCurrency(costoTotalPorPaquete)}</strong></div>
                  <div><span>Costo operativo / paq.</span><strong>${formatCurrency(costoOperativoPorPaquete)}</strong></div>
                </div>
              </div>

              <div className="gm-panel">
                <div className="gm-panel-title">
                  <Gauge className="w-4 h-4" />
                  <h3>Desglose técnico</h3>
                </div>

                <div className="gm-data-list">
                  <div><span><HardHat className="w-3.5 h-3.5" /> Mano de obra</span><strong>${formatCurrency(metricas?.costo_mano_obra)}</strong></div>
                  <div><span><Wheat className="w-3.5 h-3.5" /> Materia prima</span><strong>${formatCurrency(metricas?.costo_materia_prima || metricas?.gastos_materia_prima_total || 0)}</strong></div>
                  <div><span><Landmark className="w-3.5 h-3.5" /> IVA estimado</span><strong>${formatCurrency(metricas?.iva_a_pagar_estimado)}</strong></div>
                  <div><span><Banknote className="w-3.5 h-3.5" /> Cobranzas CC</span><strong>${formatCurrency(metricas?.cobranzas_efectivo)}</strong></div>
                </div>
              </div>

              <div className="gm-panel gm-break-even-panel">
                <BreakEven gastosTotales={gastosTotalesReales || 0} />
              </div>
            </div>

            {stockProductos.length > 0 && (
              <div className="gm-panel gm-stock-panel">
                <div className="gm-panel-title gm-panel-title-between">
                  <div>
                    <div className="gm-panel-heading">
                      <Package className="w-4 h-4" />
                      <h3>Stock físico</h3>
                    </div>
                    <p>Paquetes en depósito y equivalencia en cajas x12</p>
                  </div>
                  {cargandoMetricas && <span className="gm-loading-pill">Actualizando...</span>}
                </div>

                <div className="gm-stock-grid">
                  {stockProductos.map((prod: any) => {
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
                      <article key={prod.codigo} className="gm-stock-card">
                        <div className="gm-stock-card-top">
                          <span className={`gm-stock-name ${getColorSaborStock(prod.descripcion)}`}>
                            {prod.descripcion}
                          </span>

                          {esNegativo && (
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                          )}
                        </div>

                        <strong className={esNegativo ? 'gm-stock-negative' : ''}>
                          {paquetes}
                        </strong>

                        <p>{textoCajas}</p>
                      </article>
                    );
                  })}

                  <article className="gm-stock-card gm-stock-total-card">
                    <div className="gm-stock-card-top">
                      <span className="gm-stock-name gm-stock-total-name">
                        Total stock
                      </span>
                      <Boxes className="w-4 h-4" />
                    </div>

                    <strong className={stockTotal.esNegativo ? 'gm-stock-negative' : ''}>
                      {stockTotal.totalPaquetes}
                    </strong>

                    <p>{stockTotal.textoCajas}</p>
                  </article>
                </div>
              </div>
            )}
          </section>
        )}

        <section className="gm-content-card">
          {renderContenido()}
        </section>
      </main>

      <nav className="gm-bottom-nav">
        {TABS.slice(0, 5).map((tab) => {
          const Icon = tab.icon;
          const activo = pestañaActiva === tab.id;

          return (
            <button
              key={tab.id}
              className={activo ? 'gm-bottom-link gm-bottom-link-active' : 'gm-bottom-link'}
              onClick={() => setPestañaActiva(tab.id)}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.short}</span>
            </button>
          );
        })}

        <button
          className={pestañaActiva === 'tareas' || pestañaActiva === 'configuracion' ? 'gm-bottom-link gm-bottom-link-active' : 'gm-bottom-link'}
          onClick={() => setMenuAbierto(true)}
        >
          <Menu className="w-5 h-5" />
          <span>Más</span>
        </button>
      </nav>
    </div>
  );
}

export default App;