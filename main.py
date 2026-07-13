from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, ForeignKey, func, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
from typing import Optional

# Carga opcional de variables desde archivo .env en desarrollo local.
# Si python-dotenv no está instalado, el sistema igual funciona usando variables de entorno del sistema.
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# --- IMPORTAMOS LOS CONTROLADORES ---
# AFIP/ARCA queda como opcional para que el sistema pueda iniciar en la nube
# aunque Render no tenga instaladas/configuradas las librerías locales de AFIP.
AFIP_IMPORT_ERROR = None

try:
    from afip_controller import (
        obtener_estado_afip,
        obtener_ultimo_comprobante,
        emitir_factura_afip
    )
except Exception as exc:
    AFIP_IMPORT_ERROR = str(exc)

    def obtener_estado_afip():
        return {
            "status": "offline",
            "error": f"AFIP/ARCA no disponible en este entorno: {AFIP_IMPORT_ERROR}"
        }

    def obtener_ultimo_comprobante(*_args, **_kwargs):
        return None

    def emitir_factura_afip(*_args, **_kwargs):
        raise RuntimeError(
            "AFIP/ARCA no está disponible en este entorno. "
            f"Detalle: {AFIP_IMPORT_ERROR}"
        )

from pdf_generator import generar_pdf_venta

# --- CONFIGURACIÓN BASE DE DATOS ---
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "Falta configurar DATABASE_URL. Creá un archivo .env o definí la variable de entorno DATABASE_URL."
    )

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- MODELOS DE LA TABLA ---
class VentaCabeceraDB(Base):
    __tablename__ = "ventas_cabecera"
    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(DateTime, default=datetime.now)
    razon_social = Column(String)
    cuit = Column(String)
    condicion_iva = Column(String)
    cliente_email = Column(String)
    cliente_domicilio = Column(String)
    punto_venta = Column(Integer)
    nro_factura = Column(Integer)
    forma_pago = Column(String)
    total = Column(Float)
    es_oficial = Column(Boolean)
    cae = Column(String, nullable=True) 
    vto_cae = Column(String, nullable=True) 
    detalles = relationship("VentaDetalleDB", back_populates="venta")

class VentaDetalleDB(Base):
    __tablename__ = "ventas_detalle"
    id = Column(Integer, primary_key=True, index=True)
    venta_id = Column(Integer, ForeignKey("ventas_cabecera.id", ondelete="CASCADE")) 
    codigo = Column(String)
    descripcion = Column(String)
    cantidad = Column(Integer)
    unidad = Column(String, default="Cajas")
    precio_unitario = Column(Float)
    iva = Column(String) 
    retencion = Column(String) 
    venta = relationship("VentaCabeceraDB", back_populates="detalles")

class GastoDB(Base):
    __tablename__ = "gastos"
    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(String, default=lambda: datetime.now().strftime("%d/%m/%Y"))
    categoria = Column(String)
    proveedor = Column(String, nullable=True) 
    descripcion = Column(String)
    monto = Column(Float)
    medio_pago = Column(String)

class ProduccionDB(Base):
    __tablename__ = "produccion"
    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(String, default=lambda: datetime.now().strftime("%d/%m/%Y"))
    producto_codigo = Column(String)
    producto_desc = Column(String)
    paquetes = Column(Integer, default=0)
    cajas = Column(Integer, default=0)
    total_paquetes = Column(Integer, default=0)
    # --- NUEVO: COLUMNAS PARA FOTOGRAFÍA DE COSTOS (INFLACIÓN) ---
    costo_mp_unitario = Column(Float, default=0.0)
    costo_mo_unitario = Column(Float, default=0.0)

class ProductoDB(Base):
    __tablename__ = "productos"
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, unique=True, index=True)
    descripcion = Column(String)

class StockInicialDB(Base):
    __tablename__ = "stock_inicial"
    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(String)
    producto_codigo = Column(String, index=True)
    producto_desc = Column(String)
    cajas = Column(Integer, default=0)
    paquetes = Column(Integer, default=0)
    total_paquetes = Column(Integer, default=0)

# --- PROVEEDORES (Cuentas por Pagar) ---
class ProveedorDB(Base):
    __tablename__ = "proveedores"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    cuit = Column(String, nullable=True)
    telefono = Column(String, nullable=True)
    saldo = Column(Float, default=0.0)

class MovimientoCCDB(Base):
    __tablename__ = "movimientos_cc"
    id = Column(Integer, primary_key=True, index=True)
    proveedor_id = Column(Integer, ForeignKey("proveedores.id", ondelete="CASCADE"))
    fecha = Column(DateTime, default=datetime.now)
    tipo = Column(String)
    monto = Column(Float)
    detalle = Column(String)
    saldo_historico = Column(Float)

class MovimientoCCDetalleDB(Base):
    __tablename__ = "movimientos_cc_detalle"
    id = Column(Integer, primary_key=True, index=True)
    movimiento_id = Column(Integer, ForeignKey("movimientos_cc.id", ondelete="CASCADE"))
    codigo = Column(String)
    descripcion = Column(String)
    cantidad = Column(Integer)
    unidad = Column(String) 
    tipo_item = Column(String, default="venta")

# --- CLIENTES MAYORISTAS (Cuentas por Cobrar) ---
class ClienteMayoristaDB(Base):
    __tablename__ = "clientes_mayoristas"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    cuit = Column(String, nullable=True)
    telefono = Column(String, nullable=True)
    saldo = Column(Float, default=0.0)

class MovimientoClienteDB(Base):
    __tablename__ = "movimientos_cliente"
    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes_mayoristas.id", ondelete="CASCADE"))
    fecha = Column(DateTime, default=datetime.now)
    tipo = Column(String)
    monto = Column(Float)
    detalle = Column(String)
    saldo_historico = Column(Float)

class MovimientoClienteDetalleDB(Base):
    __tablename__ = "movimientos_cliente_detalle"
    id = Column(Integer, primary_key=True, index=True)
    movimiento_id = Column(Integer, ForeignKey("movimientos_cliente.id", ondelete="CASCADE"))
    codigo = Column(String)
    descripcion = Column(String)
    cantidad = Column(Integer)
    unidad = Column(String) 

# ==========================================
# MODELOS DE CONFIGURACIÓN Y MATERIA PRIMA
# ==========================================
class InsumoDB(Base):
    __tablename__ = "insumos"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    presentacion = Column(String, nullable=True) 
    cantidad = Column(Float, default=1.0)        
    unidad = Column(String, default="Kg")        
    costo = Column(Float, default=0.0)           
    stock_actual = Column(Float, default=0.0)

class RecetaAmasijoDB(Base):
    __tablename__ = "receta_amasijo"
    id = Column(Integer, primary_key=True, index=True)
    insumo_id = Column(Integer, ForeignKey("insumos.id", ondelete="CASCADE"))
    cantidad_usada = Column(Float, default=0.0)  
    insumo = relationship("InsumoDB")

class ServicioDB(Base):
    __tablename__ = "servicios"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    valor = Column(Float, default=0.0)

class EmpleadoDB(Base):
    __tablename__ = "empleados"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    sueldo = Column(Float, default=0.0)

class ParametrosVentaDB(Base):
    __tablename__ = "parametros_venta"
    id = Column(Integer, primary_key=True, index=True)
    producto_base = Column(String, default="Lengüitas")
    precio_paquete = Column(Float, default=950.00)
    cajas_semana_objetivo = Column(Integer, default=90)
    paquetes_por_caja = Column(Integer, default=12)

class TareaPendienteDB(Base):
    __tablename__ = "tareas_pendientes"
    id = Column(Integer, primary_key=True, index=True)
    descripcion = Column(String, nullable=False)
    fecha_creacion = Column(String, default=lambda: datetime.now().strftime("%d/%m/%Y"))
    completada = Column(Boolean, default=False)
    fecha_completada = Column(String, nullable=True)

Base.metadata.create_all(bind=engine)

def inicializar_y_actualizar_db():
    db = SessionLocal()
    if db.query(ProductoDB).count() == 0:
        productos = [
            {"codigo": "001", "descripcion": "Natural"},
            {"codigo": "002", "descripcion": "Queso"},
            {"codigo": "003", "descripcion": "Pizza"},
            {"codigo": "004", "descripcion": "Orégano"},
            {"codigo": "005", "descripcion": "Cebolla"}
        ]
        for p in productos:
            db.add(ProductoDB(**p))
        db.commit()
        
    # --- MIGRACIÓN: AGREGAR COLUMNAS DE FOTOGRAFÍA DE COSTOS ---
    try:
        db.execute(text("ALTER TABLE produccion ADD COLUMN costo_mp_unitario FLOAT DEFAULT 0.0;"))
        db.execute(text("ALTER TABLE produccion ADD COLUMN costo_mo_unitario FLOAT DEFAULT 0.0;"))
        db.commit()
    except Exception: db.rollback()
    
    db.close()

inicializar_y_actualizar_db()

def parse_fecha_ddmmyyyy(fecha):
    """
    Convierte fechas string dd/mm/YYYY a datetime.
    Devuelve None si la fecha no es válida.
    """
    if not fecha:
        return None

    if isinstance(fecha, datetime):
        return fecha

    try:
        return datetime.strptime(str(fecha), "%d/%m/%Y")
    except Exception:
        return None

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# --- SCHEMAS PYDANTIC ---
class Cliente(BaseModel):
    razonSocial: str
    cuit: str
    condicionIva: str = "Consumidor Final"
    domicilio: str = ""
    email: str = ""

class Item(BaseModel):
    codigo: str
    desc: str
    cant: int
    unidad: str = "Cajas"
    precio: float
    iva: str = "21"
    retencion: str = "Ninguna"

class VentaCreate(BaseModel):
    cliente: Cliente
    items: list[Item]
    total: float
    es_oficial: bool
    punto_venta: int = 1
    nro_factura: int = 1
    forma_pago: str = "Contado"

class GastoSchema(BaseModel):
    categoria: str
    proveedor: str = ""
    descripcion: str
    monto: float
    medio_pago: str
    insumo_id: Optional[int] = None
    cantidad_insumo: Optional[float] = None

class ProduccionSchema(BaseModel):
    producto_codigo: str
    producto_desc: str
    paquetes: int
    cajas: int

class ProveedorCreate(BaseModel):
    nombre: str
    cuit: str = ""
    telefono: str = ""

class ClienteMayoristaCreate(BaseModel):
    nombre: str
    cuit: str = ""
    telefono: str = ""

class ItemCC(BaseModel):
    codigo: str
    desc: str
    cant: int
    unidad: str = "Cajas"
    tipo: str = "venta"

class MovimientoCreate(BaseModel):
    tipo: str
    monto: float
    detalle: str
    items: list[ItemCC] = []

class TareaPendienteCreate(BaseModel):
    descripcion: str


def determinar_tipo_comprobante(condicion_iva: str) -> int:
    """
    Determina el tipo de comprobante ARCA/AFIP según la condición IVA del cliente.

    Emisor Responsable Inscripto:
    - Cliente Responsable Inscripto -> Factura A = 1
    - Resto de clientes -> Factura B = 6
    """
    condicion = (condicion_iva or "").strip().lower()

    if condicion == "responsable inscripto":
        return 1

    return 6

# --- RUTAS DE VENTAS ---
@app.post("/ventas/")
async def crear_venta(venta: VentaCreate):
    db = SessionLocal()
    cae_nro, vto_cae, nro_final = None, None, venta.nro_factura
    if venta.es_oficial:
        try:
            neto = round(venta.total / 1.21, 2)
            iva_total = round(venta.total - neto, 2)
            tipo_cbte = determinar_tipo_comprobante(venta.cliente.condicionIva)

            resultado = emitir_factura_afip({
                "cliente": venta.cliente.dict(),
                "punto_venta": venta.punto_venta,
                "tipo_cbte": tipo_cbte,
                "tipo_doc": 80,
                "cuit_cliente": venta.cliente.cuit.replace("-", "").strip(),
                "total": venta.total,
                "neto": neto,
                "iva_total": iva_total
            })
            if resultado and resultado.get("cae"):
                cae_nro, vto_cae, nro_final = resultado["cae"], resultado["vto"], resultado["nro"]
            else:
                db.close()
                raise HTTPException(status_code=400, detail=resultado.get("error", "Error ARCA."))
        except Exception as e:
            db.close()
            raise HTTPException(status_code=500, detail=f"Error ARCA: {str(e)}")
    try:
        nueva_cabecera = VentaCabeceraDB(
            razon_social=venta.cliente.razonSocial, cuit=venta.cliente.cuit, condicion_iva=venta.cliente.condicionIva,
            cliente_email=venta.cliente.email, cliente_domicilio=venta.cliente.domicilio, punto_venta=venta.punto_venta,
            nro_factura=nro_final, forma_pago=venta.forma_pago, total=venta.total, es_oficial=venta.es_oficial, cae=cae_nro, vto_cae=vto_cae
        )
        db.add(nueva_cabecera)
        db.commit()
        db.refresh(nueva_cabecera) 
        for item in venta.items:
            db.add(VentaDetalleDB(
                venta_id=nueva_cabecera.id, codigo=item.codigo, descripcion=item.desc, cantidad=item.cant,
                unidad=item.unidad, precio_unitario=item.precio, iva=item.iva, retencion=item.retencion
            ))
        db.commit()
        return {"status": "ok", "id": nueva_cabecera.id, "cae": cae_nro}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error DB: {str(e)}")
    finally: db.close()

@app.get("/ventas/proximo-numero-interno/{punto_venta}")
async def proximo_numero_interno(punto_venta: int):
    db = SessionLocal()
    ultimo = db.query(func.max(VentaCabeceraDB.nro_factura)).filter(VentaCabeceraDB.es_oficial == False, VentaCabeceraDB.punto_venta == punto_venta).scalar()
    db.close()
    return {"proximo": (ultimo or 0) + 1}

@app.get("/clientes/historial")
async def obtener_historial_clientes():
    db = SessionLocal()
    clientes_db = db.query(VentaCabeceraDB.cuit, VentaCabeceraDB.razon_social, VentaCabeceraDB.cliente_email, VentaCabeceraDB.cliente_domicilio).distinct().all()
    db.close()
    return [{"cuit": c.cuit, "razonSocial": c.razon_social, "email": c.cliente_email, "domicilio": c.cliente_domicilio} for c in clientes_db if c.cuit]

@app.get("/productos/")
async def obtener_productos():
    db = SessionLocal()

    try:
        productos = (
            db.query(ProductoDB)
            .order_by(ProductoDB.codigo.asc())
            .all()
        )

        return [
            {
                "codigo": p.codigo,
                "descripcion": p.descripcion
            }
            for p in productos
        ]
    finally:
        db.close()

@app.get("/afip/status")
async def check_afip_status():
    return obtener_estado_afip()

@app.get("/afip/proximo-numero/{punto_venta}")
async def proximo_numero(punto_venta: int, condicion_iva: str = "Consumidor Final"):
    tipo_cbte = determinar_tipo_comprobante(condicion_iva)
    ultimo = obtener_ultimo_comprobante(punto_venta, tipo_cbte)

    if ultimo is None:
        raise HTTPException(status_code=500, detail="No se pudo obtener el último comprobante desde ARCA/AFIP.")

    return {
        "proximo": ultimo + 1,
        "tipo_cbte": tipo_cbte
    }

# --- ENDPOINT METRICAS DINAMICAS CON CONGELAMIENTO DE PRECIOS ---
@app.get("/dashboard/metricas")
async def obtener_metricas(mes: int = None, anio: int = None):
    db = SessionLocal()
    ventas = db.query(VentaCabeceraDB).all()
    gastos = db.query(GastoDB).all() 
    
    movimientos_proveedores = db.query(MovimientoCCDB).all()
    movimientos_clientes = db.query(MovimientoClienteDB).all()
    
    produccion_registros = db.query(ProduccionDB).all()
    
    receta_db = db.query(RecetaAmasijoDB).all()
    empleados_db = db.query(EmpleadoDB).all()
    servicios_db = db.query(ServicioDB).all()
    parametros_maestros = db.query(ParametrosVentaDB).first()

    cajas_objetivo_semana = parametros_maestros.cajas_semana_objetivo if parametros_maestros else 90
    paquetes_por_caja = parametros_maestros.paquetes_por_caja if parametros_maestros else 12
    
    hoy = datetime.now()
    target_mes, target_anio = mes if mes else hoy.month, anio if anio else hoy.year

    fecha_inicio_periodo = datetime(target_anio, target_mes, 1)
    if target_mes == 12:
        fecha_fin_periodo = datetime(target_anio + 1, 1, 1)
    else:
        fecha_fin_periodo = datetime(target_anio, target_mes + 1, 1)

    ventas_mes = []
    ventas_mes_pasado_total = 0
    mes_ant = 12 if target_mes == 1 else target_mes - 1
    anio_ant = target_anio - 1 if target_mes == 1 else target_anio

    for v in ventas:
        try:
            v_mes, v_anio = (v.fecha.month, v.fecha.year) if hasattr(v.fecha, 'month') else (0, 0)
            if v_mes == target_mes and v_anio == target_anio:
                ventas_mes.append(v)
            elif v_mes == mes_ant and v_anio == anio_ant:
                ventas_mes_pasado_total += v.total
        except Exception:
            pass

    gastos_mes = []
    for g in gastos:
        try:
            # Los gastos se guardan como string: "dd/mm/YYYY"
            if g.fecha and "/" in g.fecha:
                partes = g.fecha.split("/")
                g_mes = int(partes[1])
                g_anio = int(partes[2])

                if g_mes == target_mes and g_anio == target_anio:
                    gastos_mes.append(g)
        except Exception:
            pass

    # Calculamos el costo ACTUAL (Solo sirve por si hay registros viejos sin foto)
    costo_materia_prima_amasijo = 0.0
    for r in receta_db:
        if r.insumo:
            precio_unitario_insumo = r.insumo.costo / (r.insumo.cantidad or 1)
            costo_materia_prima_amasijo += (precio_unitario_insumo * r.cantidad_usada)

    paquetes_por_amasijo = 30 * paquetes_por_caja
    costo_materia_prima_por_paquete_HOY = costo_materia_prima_amasijo / (paquetes_por_amasijo or 1)

    def es_gasto_sueldo(g):
        texto = f"{g.categoria or ''} {g.descripcion or ''}".lower()
        return (
            "sueldo" in texto
            or "sueldos" in texto
            or "adelanto" in texto
            or "adelantos" in texto
            or "jornal" in texto
            or "mano de obra" in texto
            or "almuerzo" in texto
        )

    def es_gasto_materia_prima(g):
        texto = f"{g.categoria or ''} {g.descripcion or ''}".lower()
        return (
            "materia prima" in texto
            or "insumo" in texto
            or "insumos" in texto
            or "harina" in texto
            or "levadura" in texto
            or "grasa" in texto
            or "sal" in texto
            or "condimento" in texto
            or "orégano" in texto
            or "oregano" in texto
            or "queso" in texto
            or "cebolla" in texto
            or "provenzal" in texto
            or "oliva" in texto
        )

    # Total real cargado en gastos, solo como referencia.
    # Incluye sueldos, materia prima, insumos y gastos operativos.
    gastos_totales_reales = sum(
        (g.monto or 0)
        for g in gastos_mes
    )

    # Gastos Operativos reales:
    # excluye sueldos/mano de obra y materia prima/insumos porque esos conceptos
    # ya están contemplados dentro de Costo Total Fábrica.
    gastos_operativos_total = sum(
        (g.monto or 0)
        for g in gastos_mes
        if not es_gasto_sueldo(g)
        and not es_gasto_materia_prima(g)
    )

    # Mano de obra REAL del mes:
    # sale de los gastos cargados en el período, no de la foto de producción.
    mano_obra_total = sum(
        (g.monto or 0)
        for g in gastos_mes
        if es_gasto_sueldo(g)
    )

    # Producción del período + materia prima estimada por producción.
    # La mano de obra ya NO se prorratea por paquetes.
    total_paquetes_producidos = 0
    materia_prima_total = 0.0

    for p in produccion_registros:
        try:
            fecha_prod = parse_fecha_ddmmyyyy(p.fecha)

            if not fecha_prod:
                continue

            if fecha_prod >= fecha_inicio_periodo and fecha_prod < fecha_fin_periodo:
                total_paq = p.total_paquetes
                if total_paq is None:
                    total_paq = ((p.cajas or 0) * paquetes_por_caja) + (p.paquetes or 0)

                total_paq = int(total_paq or 0)
                total_paquetes_producidos += total_paq

                # Materia prima: mantiene la foto histórica del costo.
                mp_congelada = (
                    p.costo_mp_unitario
                    if (p.costo_mp_unitario or 0) > 0
                    else costo_materia_prima_por_paquete_HOY
                )

                materia_prima_total += total_paq * mp_congelada

        except Exception:
            pass

    # Costo Total Fábrica = Materia Prima estimada + Mano de Obra real del mes.
    costo_produccion_total = materia_prima_total + mano_obra_total

    total_servicios_mensual = sum(s.valor for s in servicios_db)

    # Ventas directas del período
    total_ventas_facturas = sum((v.total or 0) for v in ventas_mes)

    # Ventas cargadas en Cta Cte.
    # Solo suman como venta los movimientos tipo cargo que tienen mercadería asociada.
    # Esto evita que una Deuda inicial o Ajuste de saldo se tome como venta.
    def movimiento_proveedor_tiene_items(movimiento_id: int) -> bool:
        return db.query(MovimientoCCDetalleDB).filter(
            MovimientoCCDetalleDB.movimiento_id == movimiento_id
        ).count() > 0

    def movimiento_cliente_tiene_items(movimiento_id: int) -> bool:
        return db.query(MovimientoClienteDetalleDB).filter(
            MovimientoClienteDetalleDB.movimiento_id == movimiento_id
        ).count() > 0

    ventas_cc_proveedores_mes = []
    ventas_cc_clientes_mes = []
    ventas_cc_proveedores_mes_pasado = []
    ventas_cc_clientes_mes_pasado = []

    for m in movimientos_proveedores:
        try:
            if m.tipo and m.tipo.lower() == 'cargo' and movimiento_proveedor_tiene_items(m.id):
                if m.fecha.month == target_mes and m.fecha.year == target_anio:
                    ventas_cc_proveedores_mes.append(m)
                elif m.fecha.month == mes_ant and m.fecha.year == anio_ant:
                    ventas_cc_proveedores_mes_pasado.append(m)
        except Exception:
            pass

    for m in movimientos_clientes:
        try:
            if m.tipo and m.tipo.lower() == 'cargo' and movimiento_cliente_tiene_items(m.id):
                if m.fecha.month == target_mes and m.fecha.year == target_anio:
                    ventas_cc_clientes_mes.append(m)
                elif m.fecha.month == mes_ant and m.fecha.year == anio_ant:
                    ventas_cc_clientes_mes_pasado.append(m)
        except Exception:
            pass

    total_ventas_cc_proveedores = sum((m.monto or 0) for m in ventas_cc_proveedores_mes)
    total_ventas_cc_clientes = sum((m.monto or 0) for m in ventas_cc_clientes_mes)
    total_ventas_cc = total_ventas_cc_proveedores + total_ventas_cc_clientes

    total_ventas_cc_mes_pasado = (
        sum((m.monto or 0) for m in ventas_cc_proveedores_mes_pasado) +
        sum((m.monto or 0) for m in ventas_cc_clientes_mes_pasado)
    )

    total_ventas = total_ventas_facturas + total_ventas_cc
    ventas_mes_pasado_total = ventas_mes_pasado_total + total_ventas_cc_mes_pasado
    
    cobranzas = sum((m.monto or 0) for m in movimientos_proveedores if m.tipo and m.tipo.lower() == 'abono') + \
                sum((m.monto or 0) for m in movimientos_clientes if m.tipo and m.tipo.lower() == 'abono')

    productos_db = db.query(ProductoDB).all()
    stock_inicial_registros = db.query(StockInicialDB).all()
    stock_list = []

    # Stock por período:
    # - Si existe stock inicial, se toma como base del período.
    # - Solo se suman/restan movimientos desde el corte y dentro del mes seleccionado.
    # - Esto evita que ventas o producciones de meses anteriores afecten el stock del mes actual.
    fecha_corte_general = None
    for si in stock_inicial_registros:
        fecha_si = parse_fecha_ddmmyyyy(si.fecha)
        if not fecha_si:
            continue
        if fecha_si < fecha_fin_periodo:
            if fecha_corte_general is None or fecha_si > fecha_corte_general:
                fecha_corte_general = fecha_si

    for p in productos_db:
        stock_inicial_producto = None
        fecha_stock_inicial = None

        for si in stock_inicial_registros:
            if si.producto_codigo != p.codigo:
                continue

            fecha_si = parse_fecha_ddmmyyyy(si.fecha)
            if not fecha_si:
                continue

            if fecha_si < fecha_fin_periodo:
                if fecha_stock_inicial is None or fecha_si > fecha_stock_inicial:
                    fecha_stock_inicial = fecha_si
                    stock_inicial_producto = si

        if stock_inicial_producto:
            stock_base = stock_inicial_producto.total_paquetes or 0
            fecha_inicio_movimientos = fecha_stock_inicial
        else:
            stock_base = 0
            fecha_inicio_movimientos = fecha_corte_general

        fecha_desde_stock = fecha_inicio_movimientos or fecha_inicio_periodo
        fecha_desde_periodo = max(fecha_desde_stock, fecha_inicio_periodo)

        prod = 0
        producciones_producto = db.query(ProduccionDB).filter(
            ProduccionDB.producto_codigo == p.codigo
        ).all()

        for pr in producciones_producto:
            fecha_pr = parse_fecha_ddmmyyyy(pr.fecha)
            if fecha_pr and fecha_pr >= fecha_desde_periodo and fecha_pr < fecha_fin_periodo:
                prod += pr.total_paquetes or 0

        ventas_query = db.query(VentaDetalleDB, VentaCabeceraDB).join(
            VentaCabeceraDB,
            VentaDetalleDB.venta_id == VentaCabeceraDB.id
        ).filter(
            VentaDetalleDB.codigo == p.codigo,
            VentaCabeceraDB.fecha >= fecha_desde_periodo,
            VentaCabeceraDB.fecha < fecha_fin_periodo
        )

        vent_cajas = 0
        vent_paquetes = 0

        for detalle, venta_cab in ventas_query.all():
            if detalle.unidad == 'Cajas':
                vent_cajas += detalle.cantidad or 0
            elif detalle.unidad == 'Paquetes':
                vent_paquetes += detalle.cantidad or 0

        cc_prov_query = db.query(MovimientoCCDetalleDB, MovimientoCCDB).join(
            MovimientoCCDB,
            MovimientoCCDetalleDB.movimiento_id == MovimientoCCDB.id
        ).filter(
            MovimientoCCDetalleDB.codigo == p.codigo,
            MovimientoCCDB.tipo == 'cargo',
            MovimientoCCDB.fecha >= fecha_desde_periodo,
            MovimientoCCDB.fecha < fecha_fin_periodo
        )

        cc_cajas_prov = 0
        cc_paq_prov = 0

        for detalle, mov in cc_prov_query.all():
            if (detalle.tipo_item or "venta") == "devolucion":
                continue

            if detalle.unidad == "Cajas":
                cc_cajas_prov += detalle.cantidad or 0
            elif detalle.unidad == "Paquetes":
                cc_paq_prov += detalle.cantidad or 0

        cc_cli_query = db.query(MovimientoClienteDetalleDB, MovimientoClienteDB).join(
            MovimientoClienteDB,
            MovimientoClienteDetalleDB.movimiento_id == MovimientoClienteDB.id
        ).filter(
            MovimientoClienteDetalleDB.codigo == p.codigo,
            MovimientoClienteDB.tipo == 'cargo',
            MovimientoClienteDB.fecha >= fecha_desde_periodo,
            MovimientoClienteDB.fecha < fecha_fin_periodo
        )

        cc_cajas_cli = 0
        cc_paq_cli = 0

        for detalle, mov in cc_cli_query.all():
            if detalle.unidad == 'Cajas':
                cc_cajas_cli += detalle.cantidad or 0
            elif detalle.unidad == 'Paquetes':
                cc_paq_cli += detalle.cantidad or 0

        total_vent_paquetes = (vent_cajas * paquetes_por_caja) + vent_paquetes
        total_cc_paquetes = ((cc_cajas_prov + cc_cajas_cli) * paquetes_por_caja) + (cc_paq_prov + cc_paq_cli)

        stock_actual = stock_base + prod - total_vent_paquetes - total_cc_paquetes

        stock_list.append({
            "codigo": p.codigo,
            "descripcion": p.descripcion,
            "stock_paquetes": stock_actual,
            "stock_inicial_paquetes": stock_base,
            "fecha_stock_inicial": fecha_inicio_movimientos.strftime("%d/%m/%Y") if fecha_inicio_movimientos else None
        })

    db.close() 

    # Rentabilidad limpia:
    # Venta Total - Gastos Operativos - Costo Total Fábrica.
    # No se resta gastos_totales_reales porque allí ya están incluidos sueldos
    # y materia prima, que se contemplan en costo_produccion_total.
    balance_limpio = total_ventas - gastos_operativos_total - costo_produccion_total
    iva_estimado = round(sum(v.total for v in ventas_mes if v.es_oficial) * 0.1735, 2)
    ventas_sin_cae = [v.id for v in ventas_mes if v.es_oficial and (not v.cae or v.cae == "None")]
    crecimiento = round(((total_ventas - ventas_mes_pasado_total) / ventas_mes_pasado_total) * 100, 2) if ventas_mes_pasado_total > 0 else 100.0

    costo_total_por_paquete = (
        costo_produccion_total / total_paquetes_producidos
        if total_paquetes_producidos > 0
        else 0
    )

    costo_mano_obra_por_paquete = (
        mano_obra_total / total_paquetes_producidos
        if total_paquetes_producidos > 0
        else 0
    )

    costo_materia_prima_por_paquete = (
        (costo_produccion_total - mano_obra_total) / total_paquetes_producidos
        if total_paquetes_producidos > 0
        else 0
    )

    return {
        "caja_real_total": total_ventas, "ventas_oficial": sum((v.total or 0) for v in ventas_mes if v.es_oficial),
        "ventas_interno": sum((v.total or 0) for v in ventas_mes if not v.es_oficial) + total_ventas_cc,
        "ventas_cc_proveedores": total_ventas_cc_proveedores,
        "ventas_cc_clientes": total_ventas_cc_clientes,
        "ventas_cc_total": total_ventas_cc,
        "iva_a_pagar_estimado": iva_estimado,
        "errores_cae": len(ventas_sin_cae), "crecimiento_mes": crecimiento,
        # Total de todos los gastos cargados en el período.
        # Este valor se muestra en el indicador principal de gastos.
        "total_gastos": gastos_totales_reales,
        # Gastos sin sueldos ni materia prima.
        # Este valor se usa para la rentabilidad limpia y evita duplicar costos.
        "gastos_operativos_total": gastos_operativos_total,
        # Alias de referencia para consultas futuras.
        "gastos_totales_reales": gastos_totales_reales,
        "balance_neto": balance_limpio, "cobranzas_efectivo": cobranzas, "costo_produccion_total": costo_produccion_total,
        "costo_mano_obra": mano_obra_total,
        "costo_total_por_paquete": costo_total_por_paquete,
        "costo_mano_obra_por_paquete": costo_mano_obra_por_paquete,
        "costo_materia_prima_por_paquete": costo_materia_prima_por_paquete,
        "paquetes_producidos": total_paquetes_producidos, "rentabilidad_neta_real": balance_limpio,
        "stock_productos": stock_list
    }

@app.get("/ventas/")
async def listar_ventas():
    db = SessionLocal()
    ventas = db.query(VentaCabeceraDB).order_by(VentaCabeceraDB.fecha.desc()).all()
    db.close()
    return ventas


@app.get("/ventas/resumen-filtrado")
async def obtener_resumen_ventas_filtrado(
    desde: Optional[str] = None,
    hasta: Optional[str] = None,
    buscar: Optional[str] = None
):
    """
    Calcula la cantidad total de paquetes vendidos según los filtros
    aplicados en Comprobantes Emitidos.

    Fechas esperadas: YYYY-MM-DD.
    """
    db = SessionLocal()

    try:
        parametros = db.query(ParametrosVentaDB).first()
        paquetes_por_caja = (
            int(parametros.paquetes_por_caja)
            if parametros and parametros.paquetes_por_caja
            else 12
        )

        consulta = (
            db.query(VentaDetalleDB, VentaCabeceraDB)
            .join(
                VentaCabeceraDB,
                VentaDetalleDB.venta_id == VentaCabeceraDB.id
            )
        )

        if desde:
            fecha_desde = datetime.strptime(desde, "%Y-%m-%d")
            consulta = consulta.filter(
                VentaCabeceraDB.fecha >= fecha_desde
            )

        if hasta:
            fecha_hasta = datetime.strptime(
                hasta,
                "%Y-%m-%d"
            ).replace(
                hour=23,
                minute=59,
                second=59,
                microsecond=999999
            )

            consulta = consulta.filter(
                VentaCabeceraDB.fecha <= fecha_hasta
            )

        texto_busqueda = str(buscar or "").strip()

        if texto_busqueda:
            patron = f"%{texto_busqueda}%"

            consulta = consulta.filter(
                func.coalesce(
                    VentaCabeceraDB.razon_social,
                    ""
                ).ilike(patron)
                |
                func.coalesce(
                    VentaCabeceraDB.cuit,
                    ""
                ).ilike(patron)
            )

        total_paquetes = 0
        detalles_contabilizados = 0

        for detalle, _venta in consulta.all():
            codigo = str(detalle.codigo or "").strip()
            descripcion = str(
                detalle.descripcion or ""
            ).strip().lower()

            unidad = str(
                detalle.unidad or ""
            ).strip().lower()

            cantidad = float(detalle.cantidad or 0)

            # No contabilizar envases ni cajas vacías.
            if (
                codigo == "999"
                or "envase" in descripcion
                or "caja vac" in descripcion
            ):
                continue

            # Admite variantes como Caja, Cajas, 📦 Cajas.
            if "caja" in unidad:
                total_paquetes += cantidad * paquetes_por_caja
                detalles_contabilizados += 1

            # Admite Paquete, Paquetes, paq., etc.
            elif "paquete" in unidad or "paq" in unidad:
                total_paquetes += cantidad
                detalles_contabilizados += 1

        return {
            "total_paquetes_vendidos": int(total_paquetes),
            "paquetes_por_caja": paquetes_por_caja,
            "detalles_contabilizados": detalles_contabilizados
        }

    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Las fechas deben tener formato YYYY-MM-DD."
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"No se pudo calcular el total vendido: {exc}"
        )

    finally:
        db.close()


@app.get("/ventas/{venta_id}/detalles")
async def obtener_detalles(venta_id: int):
    db = SessionLocal()
    detalles = db.query(VentaDetalleDB).filter(VentaDetalleDB.venta_id == venta_id).all()
    db.close()
    return detalles

@app.post("/gastos/")
async def crear_gasto(gasto: GastoSchema):
    db = SessionLocal()
    try:
        nuevo = GastoDB(
            categoria=gasto.categoria, 
            proveedor=gasto.proveedor, 
            descripcion=gasto.descripcion, 
            monto=gasto.monto, 
            medio_pago=gasto.medio_pago
        )
        db.add(nuevo)
        
        if gasto.categoria.strip().upper() == 'MATERIA PRIMA' and gasto.insumo_id and gasto.cantidad_insumo and gasto.cantidad_insumo > 0:
            insumo = db.query(InsumoDB).filter(InsumoDB.id == gasto.insumo_id).first()
            if insumo:
                insumo.stock_actual = (insumo.stock_actual or 0.0) + gasto.cantidad_insumo
                precio_por_unidad = gasto.monto / gasto.cantidad_insumo
                insumo.costo = precio_por_unidad * (insumo.cantidad or 1.0)
                
        db.commit()
        return {"status": "ok"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.get("/gastos/")
async def obtener_gastos():
    db = SessionLocal()
    gastos = db.query(GastoDB).order_by(GastoDB.id.desc()).all()
    db.close()
    return gastos

@app.get("/ventas/{venta_id}/pdf")
async def descargar_pdf(venta_id: int):
    db = SessionLocal()
    try:
        venta = db.query(VentaCabeceraDB).filter(VentaCabeceraDB.id == venta_id).first()
        detalles = db.query(VentaDetalleDB).filter(VentaDetalleDB.venta_id == venta_id).all()
        archivo_path = generar_pdf_venta(venta, detalles)
        return FileResponse(path=archivo_path, media_type='application/pdf', filename=f"Factura_{venta.nro_factura}.pdf")
    finally: db.close()

# --- LÓGICA DE PRODUCCIÓN Y TOMA DE FOTOGRAFÍA DE COSTOS ---
@app.post("/produccion/")
async def registrar_produccion(prod: ProduccionSchema):
    db = SessionLocal()
    try:
        total = (prod.cajas * 12) + prod.paquetes
        
        # 1. Traemos los datos actuales
        receta_db = db.query(RecetaAmasijoDB).all()
        empleados_db = db.query(EmpleadoDB).all()
        parametros_maestros = db.query(ParametrosVentaDB).first()

        cajas_semana_objetivo = parametros_maestros.cajas_semana_objetivo if parametros_maestros else 90
        paquetes_por_caja = parametros_maestros.paquetes_por_caja if parametros_maestros else 12

        # 2. Calculamos los costos VIVOS EN ESTE EXACTO SEGUNDO
        costo_materia_prima_amasijo = 0.0
        for r in receta_db:
            if r.insumo:
                precio_unitario_insumo = r.insumo.costo / (r.insumo.cantidad or 1)
                costo_materia_prima_amasijo += (precio_unitario_insumo * r.cantidad_usada)

        paquetes_por_amasijo = 30 * paquetes_por_caja
        costo_mp_vivo = costo_materia_prima_amasijo / (paquetes_por_amasijo or 1)

        total_sueldos_mensual = sum(e.sueldo for e in empleados_db)
        paquetes_objetivo_mensual = (cajas_semana_objetivo * 4.34) * paquetes_por_caja
        costo_mo_vivo = total_sueldos_mensual / (paquetes_objetivo_mensual or 1)

        # 3. Guardamos la producción clavándole la "Foto" del costo en las nuevas columnas
        nueva_prod = ProduccionDB(
            producto_codigo=prod.producto_codigo, producto_desc=prod.producto_desc,
            paquetes=prod.paquetes, cajas=prod.cajas, total_paquetes=total,
            costo_mp_unitario=costo_mp_vivo, costo_mo_unitario=costo_mo_vivo
        )
        db.add(nueva_prod)
        
        # 4. Descuento Automático de Stock del Depósito
        factor_receta = total / 360.0
        for r in receta_db:
            insumo = db.query(InsumoDB).filter(InsumoDB.id == r.insumo_id).first()
            if insumo:
                descuento = r.cantidad_usada * factor_receta
                insumo.stock_actual = round((insumo.stock_actual or 0.0) - descuento, 2)
                
        db.commit()
        return {"status": "ok"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally: db.close()

@app.get("/produccion/")
async def listar_produccion():
    db = SessionLocal()
    lista = db.query(ProduccionDB).order_by(ProduccionDB.id.desc()).all()
    db.close()
    return lista

@app.delete("/produccion/{prod_id}")
async def eliminar_produccion(prod_id: int):
    db = SessionLocal()
    try:
        produccion = db.query(ProduccionDB).filter(ProduccionDB.id == prod_id).first()

        if not produccion:
            raise HTTPException(status_code=404, detail="Registro de producción no encontrado.")

        receta_db = db.query(RecetaAmasijoDB).all()

        # Al registrar producción se descontaba según total / 360.
        # Al eliminar, devolvemos esos insumos al stock.
        factor_receta = (produccion.total_paquetes or 0) / 360.0

        for r in receta_db:
            insumo = db.query(InsumoDB).filter(InsumoDB.id == r.insumo_id).first()
            if insumo:
                devolucion = r.cantidad_usada * factor_receta
                insumo.stock_actual = round((insumo.stock_actual or 0.0) + devolucion, 2)

        db.delete(produccion)
        db.commit()

        return {
            "status": "ok",
            "message": "Producción eliminada correctamente y stock de insumos restaurado."
        }

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar producción: {str(e)}")

    finally:
        db.close()

# --- RUTAS DE PROVEEDORES ---
@app.post("/proveedores/")
async def crear_proveedor(prov: ProveedorCreate):
    db = SessionLocal()
    db.add(ProveedorDB(nombre=prov.nombre, cuit=prov.cuit, telefono=prov.telefono))
    db.commit()
    db.close()
    return {"status": "ok"}

@app.get("/proveedores/")
async def listar_proveedores():
    db = SessionLocal()
    lista = db.query(ProveedorDB).order_by(ProveedorDB.nombre).all()
    db.close()
    return lista

@app.put("/proveedores/{prov_id}")
async def actualizar_proveedor(prov_id: int, prov_data: dict):
    db = SessionLocal()
    prov = db.query(ProveedorDB).filter(ProveedorDB.id == prov_id).first()
    if prov:
        prov.nombre = prov_data.get('nombre', prov.nombre)
        db.commit()
    db.close()
    return {"status": "ok"}

@app.delete("/proveedores/{prov_id}")
async def eliminar_proveedor(prov_id: int):
    db = SessionLocal()
    db.query(ProveedorDB).filter(ProveedorDB.id == prov_id).delete()
    db.commit()
    db.close()
    return {"status": "ok"}

@app.post("/proveedores/{prov_id}/movimientos/")
async def registrar_movimiento(prov_id: int, mov: MovimientoCreate):
    db = SessionLocal()
    prov = db.query(ProveedorDB).filter(ProveedorDB.id == prov_id).first()
    if mov.tipo == 'cargo': prov.saldo += mov.monto
    else: prov.saldo -= mov.monto
    nuevo_mov = MovimientoCCDB(proveedor_id=prov_id, tipo=mov.tipo, monto=mov.monto, detalle=mov.detalle, saldo_historico=prov.saldo)
    db.add(nuevo_mov)
    db.commit()
    db.refresh(nuevo_mov)
    for item in mov.items:
        db.add(MovimientoCCDetalleDB(movimiento_id=nuevo_mov.id, codigo=item.codigo, descripcion=item.desc, cantidad=item.cant, unidad=item.unidad, tipo_item=item.tipo))
    db.commit()
    db.close()
    return {"status": "ok"}

@app.get("/proveedores/{prov_id}/movimientos/")
async def listar_movimientos(prov_id: int):
    db = SessionLocal()
    movs = db.query(MovimientoCCDB).filter(MovimientoCCDB.proveedor_id == prov_id).order_by(MovimientoCCDB.fecha.desc()).all()
    resultado = []
    for m in movs:
        detalles = db.query(MovimientoCCDetalleDB).filter(MovimientoCCDetalleDB.movimiento_id == m.id).all()
        resultado.append({
            "id": m.id, "fecha": m.fecha, "tipo": m.tipo, "monto": m.monto, "detalle": m.detalle, "saldo_historico": m.saldo_historico,
            "items": [{"codigo": d.codigo, "desc": d.descripcion, "cant": d.cantidad, "unidad": d.unidad} for d in detalles]
        })
    db.close()
    return resultado

@app.delete("/proveedores/{prov_id}/movimientos/{mov_id}")
async def anular_movimiento_cc(prov_id: int, mov_id: int):
    db = SessionLocal()
    mov = db.query(MovimientoCCDB).filter(MovimientoCCDB.id == mov_id, MovimientoCCDB.proveedor_id == prov_id).first()
    prov = db.query(ProveedorDB).filter(ProveedorDB.id == prov_id).first()
    if mov.tipo == 'cargo': prov.saldo -= mov.monto  
    else: prov.saldo += mov.monto  
    db.query(MovimientoCCDetalleDB).filter(MovimientoCCDetalleDB.movimiento_id == mov_id).delete()
    db.delete(mov) 
    db.commit()
    db.close()
    return {"status": "ok"}


# --- NUEVAS RUTAS DE CLIENTES MAYORISTAS ---
@app.post("/clientes_mayoristas/")
async def crear_cliente_mayorista(cliente: ClienteMayoristaCreate):
    db = SessionLocal()
    db.add(ClienteMayoristaDB(nombre=cliente.nombre, cuit=cliente.cuit, telefono=cliente.telefono))
    db.commit()
    db.close()
    return {"status": "ok"}

@app.get("/clientes_mayoristas/")
async def listar_clientes_mayoristas():
    db = SessionLocal()
    lista = db.query(ClienteMayoristaDB).order_by(ClienteMayoristaDB.nombre).all()
    db.close()
    return lista

@app.put("/clientes_mayoristas/{cliente_id}")
async def actualizar_cliente(cliente_id: int, cli_data: dict):
    db = SessionLocal()
    cli = db.query(ClienteMayoristaDB).filter(ClienteMayoristaDB.id == cliente_id).first()
    if cli:
        cli.nombre = cli_data.get('nombre', cli.nombre)
        db.commit()
    db.close()
    return {"status": "ok"}

@app.delete("/clientes_mayoristas/{cliente_id}")
async def eliminar_cliente(cliente_id: int):
    db = SessionLocal()
    db.query(ClienteMayoristaDB).filter(ClienteMayoristaDB.id == cliente_id).delete()
    db.commit()
    db.close()
    return {"status": "ok"}

@app.post("/clientes_mayoristas/{cliente_id}/movimientos/")
async def registrar_movimiento_cliente(cliente_id: int, mov: MovimientoCreate):
    db = SessionLocal()
    cli = db.query(ClienteMayoristaDB).filter(ClienteMayoristaDB.id == cliente_id).first()
    
    if mov.tipo == 'cargo': cli.saldo += mov.monto
    else: cli.saldo -= mov.monto
        
    nuevo_mov = MovimientoClienteDB(cliente_id=cliente_id, tipo=mov.tipo, monto=mov.monto, detalle=mov.detalle, saldo_historico=cli.saldo)
    db.add(nuevo_mov)
    db.commit()
    db.refresh(nuevo_mov)
    
    for item in mov.items:
        db.add(MovimientoClienteDetalleDB(movimiento_id=nuevo_mov.id, codigo=item.codigo, descripcion=item.desc, cantidad=item.cant, unidad=item.unidad))
    
    db.commit()
    db.close()
    return {"status": "ok"}

@app.get("/clientes_mayoristas/{cliente_id}/movimientos/")
async def listar_movimientos_cliente(cliente_id: int):
    db = SessionLocal()
    movs = db.query(MovimientoClienteDB).filter(MovimientoClienteDB.cliente_id == cliente_id).order_by(MovimientoClienteDB.fecha.desc()).all()
    resultado = []
    for m in movs:
        detalles = db.query(MovimientoClienteDetalleDB).filter(MovimientoClienteDetalleDB.movimiento_id == m.id).all()
        resultado.append({
            "id": m.id, "fecha": m.fecha, "tipo": m.tipo, "monto": m.monto, "detalle": m.detalle, "saldo_historico": m.saldo_historico,
            "items": [{"codigo": d.codigo, "desc": d.descripcion, "cant": d.cantidad, "unidad": d.unidad} for d in detalles]
        })
    db.close()
    return resultado

@app.delete("/clientes_mayoristas/{cliente_id}/movimientos/{mov_id}")
async def anular_movimiento_cliente(cliente_id: int, mov_id: int):
    db = SessionLocal()
    mov = db.query(MovimientoClienteDB).filter(MovimientoClienteDB.id == mov_id, MovimientoClienteDB.cliente_id == cliente_id).first()
    cli = db.query(ClienteMayoristaDB).filter(ClienteMayoristaDB.id == cliente_id).first()
    
    if mov.tipo == 'cargo': cli.saldo -= mov.monto  
    else: cli.saldo += mov.monto  
        
    db.query(MovimientoClienteDetalleDB).filter(MovimientoClienteDetalleDB.movimiento_id == mov_id).delete()
    db.delete(mov) 
    db.commit()
    db.close()
    return {"status": "ok"}

@app.delete("/gastos/{gasto_id}")
async def anular_gasto(gasto_id: int):
    db = SessionLocal()
    db.query(GastoDB).filter(GastoDB.id == gasto_id).delete()
    db.commit()
    db.close()
    return {"status": "ok"}

@app.delete("/ventas/{venta_id}")
async def anular_venta_interna(venta_id: int):
    db = SessionLocal()
    venta = db.query(VentaCabeceraDB).filter(VentaCabeceraDB.id == venta_id).first()
    if venta.es_oficial:
        db.close()
        raise HTTPException(status_code=400, detail="Las facturas oficiales no se pueden borrar.")
    db.query(VentaDetalleDB).filter(VentaDetalleDB.venta_id == venta_id).delete()
    db.delete(venta)
    db.commit()
    db.close()
    return {"status": "ok"}


# --- RUTAS DE TAREAS PENDIENTES ---
@app.get("/tareas/")
async def listar_tareas():
    db = SessionLocal()
    try:
        tareas = (
            db.query(TareaPendienteDB)
            .order_by(TareaPendienteDB.completada.asc(), TareaPendienteDB.id.desc())
            .all()
        )

        return [
            {
                "id": t.id,
                "descripcion": t.descripcion,
                "fecha_creacion": t.fecha_creacion,
                "completada": bool(t.completada),
                "fecha_completada": t.fecha_completada
            }
            for t in tareas
        ]
    finally:
        db.close()


@app.post("/tareas/")
async def crear_tarea(tarea: TareaPendienteCreate):
    descripcion = str(tarea.descripcion or "").strip()

    if not descripcion:
        raise HTTPException(status_code=400, detail="La descripción de la tarea es obligatoria.")

    db = SessionLocal()
    try:
        nueva = TareaPendienteDB(
            descripcion=descripcion,
            fecha_creacion=datetime.now().strftime("%d/%m/%Y"),
            completada=False,
            fecha_completada=None
        )
        db.add(nueva)
        db.commit()
        db.refresh(nueva)

        return {
            "id": nueva.id,
            "descripcion": nueva.descripcion,
            "fecha_creacion": nueva.fecha_creacion,
            "completada": bool(nueva.completada),
            "fecha_completada": nueva.fecha_completada
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo crear la tarea: {str(e)}")
    finally:
        db.close()


@app.put("/tareas/{tarea_id}/toggle")
async def alternar_tarea(tarea_id: int):
    db = SessionLocal()
    try:
        tarea = db.query(TareaPendienteDB).filter(TareaPendienteDB.id == tarea_id).first()

        if not tarea:
            raise HTTPException(status_code=404, detail="Tarea no encontrada.")

        tarea.completada = not bool(tarea.completada)
        tarea.fecha_completada = (
            datetime.now().strftime("%d/%m/%Y")
            if tarea.completada
            else None
        )

        db.commit()
        db.refresh(tarea)

        return {
            "id": tarea.id,
            "descripcion": tarea.descripcion,
            "fecha_creacion": tarea.fecha_creacion,
            "completada": bool(tarea.completada),
            "fecha_completada": tarea.fecha_completada
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo actualizar la tarea: {str(e)}")
    finally:
        db.close()


@app.delete("/tareas/{tarea_id}")
async def eliminar_tarea(tarea_id: int):
    db = SessionLocal()
    try:
        tarea = db.query(TareaPendienteDB).filter(TareaPendienteDB.id == tarea_id).first()

        if not tarea:
            raise HTTPException(status_code=404, detail="Tarea no encontrada.")

        db.delete(tarea)
        db.commit()

        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo eliminar la tarea: {str(e)}")
    finally:
        db.close()


# --- ABM CONFIGURACIÓN EDITAR ---
class ParametrosUpdate(BaseModel):
    precio_paquete: float
    cajas_semana_objetivo: int
    paquetes_por_caja: Optional[int] = None

@app.get("/configuracion/")
async def obtener_configuracion():
    db = SessionLocal()
    insumos = db.query(InsumoDB).order_by(InsumoDB.id.asc()).all()
    servicios = db.query(ServicioDB).order_by(ServicioDB.id.asc()).all()
    empleados = db.query(EmpleadoDB).order_by(EmpleadoDB.id.asc()).all()
    recetas = db.query(RecetaAmasijoDB).all()
    parametros = db.query(ParametrosVentaDB).first()
    if not parametros:
        parametros = ParametrosVentaDB()
        db.add(parametros); db.commit(); db.refresh(parametros)
    res = {
        "insumos": [{"id": i.id, "nombre": i.nombre, "cantidad": i.cantidad, "unidad": i.unidad, "costo": i.costo, "stock_actual": i.stock_actual} for i in insumos],
        "servicios": [{"id": s.id, "nombre": s.nombre, "valor": s.valor} for s in servicios],
        "empleados": [{"id": e.id, "nombre": e.nombre, "sueldo": e.sueldo} for e in empleados],
        "receta": [{"id": r.id, "insumo_id": r.insumo_id, "cantidad_usada": r.cantidad_usada, "insumo_nombre": r.insumo.nombre, "insumo_unidad": r.insumo.unidad, "insumo_costo": r.insumo.costo, "insumo_cantidad": r.insumo.cantidad} for r in recetas if r.insumo],
        "parametros": {"precio_paquete": parametros.precio_paquete, "cajas_semana_objetivo": parametros.cajas_semana_objetivo, "paquetes_por_caja": parametros.paquetes_por_caja}
    }
    db.close()
    return res

@app.post("/configuracion/{tipo}/")
async def agregar_item_config(tipo: str, item: dict):
    db = SessionLocal()
    try:
        if tipo == "insumos":
            nuevo = InsumoDB(nombre=item.get('nombre',''), cantidad=float(item.get('cantidad', 1)), unidad=item.get('unidad', 'Kg'), costo=float(item.get('costo',0)), stock_actual=float(item.get('stock_actual', 0)))
        elif tipo == "servicios": nuevo = ServicioDB(nombre=item.get('nombre',''), valor=float(item.get('valor') or 0))
        elif tipo == "empleados": nuevo = EmpleadoDB(nombre=item.get('nombre',''), sueldo=float(item.get('sueldo',0)))
        elif tipo == "receta": nuevo = RecetaAmasijoDB(insumo_id=int(item.get('insumo_id')), cantidad_usada=float(item.get('cantidad_usada', 0)))
        db.add(nuevo); db.commit()
    except Exception as e:
        db.rollback(); raise HTTPException(status_code=500, detail=str(e))
    finally: db.close()
    return {"status": "ok"}

@app.delete("/configuracion/{tipo}/{item_id}")
async def borrar_item_config(tipo: str, item_id: int):
    db = SessionLocal()
    if tipo == "insumos": db.query(InsumoDB).filter(InsumoDB.id == item_id).delete()
    elif tipo == "servicios": db.query(ServicioDB).filter(ServicioDB.id == item_id).delete()
    elif tipo == "empleados": db.query(EmpleadoDB).filter(EmpleadoDB.id == item_id).delete()
    elif tipo == "receta": db.query(RecetaAmasijoDB).filter(RecetaAmasijoDB.id == item_id).delete()
    db.commit(); db.close()
    return {"status": "ok"}

@app.put("/configuracion/{tipo}/{item_id}")
async def actualizar_item_config(tipo: str, item_id: int, item: dict):
    db = SessionLocal()
    try:
        if tipo == "insumos":
            obj = db.query(InsumoDB).filter(InsumoDB.id == item_id).first()
            if obj:
                obj.nombre = item.get('nombre', obj.nombre)
                obj.cantidad = float(item.get('cantidad', obj.cantidad))
                obj.unidad = item.get('unidad', obj.unidad)
                obj.costo = float(item.get('costo', obj.costo))
                obj.stock_actual = float(item.get('stock_actual', obj.stock_actual))
        elif tipo == "servicios":
            obj = db.query(ServicioDB).filter(ServicioDB.id == item_id).first()
            if obj: obj.nombre, obj.valor = item.get('nombre', obj.nombre), float(item.get('valor') or 0)
        elif tipo == "empleados":
            obj = db.query(EmpleadoDB).filter(EmpleadoDB.id == item_id).first()
            if obj: obj.nombre, obj.sueldo = item.get('nombre', obj.nombre), float(item.get('sueldo', obj.sueldo))
        db.commit()
    except Exception as e:
        db.rollback(); raise HTTPException(status_code=500, detail=str(e))
    finally: db.close()
    return {"status": "ok"}

@app.put("/configuracion/parametros/")
async def actualizar_parametros(params: ParametrosUpdate):
    db = SessionLocal()
    p = db.query(ParametrosVentaDB).first()
    p.precio_paquete = params.precio_paquete
    p.cajas_semana_objetivo = params.cajas_semana_objetivo
    if params.paquetes_por_caja is not None:
        p.paquetes_por_caja = params.paquetes_por_caja
    db.commit(); db.close()
    return {"status": "ok"}
