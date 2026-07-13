import os
import inspect
import configparser
import subprocess
import hashlib
import builtins
import ssl
import http.client
import httplib2
import traceback
from datetime import datetime

# Carga opcional de variables desde archivo .env en desarrollo local.
# Si python-dotenv no está instalado, el sistema igual funciona usando variables de entorno del sistema.
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ============================================================
# 1. 🛡️ SALVAMOS EL MOTOR MODERNO DE RED (El Antivirus)
# ============================================================
_motor_https_original = http.client.HTTPSConnection.__init__
_httplib2_https_original = httplib2.HTTPSConnectionWithTimeout.__init__

# Parches básicos
builtins.basestring = str
if not hasattr(inspect, "getargspec"): inspect.getargspec = inspect.getfullargspec
if not hasattr(configparser, "SafeConfigParser"): configparser.SafeConfigParser = configparser.ConfigParser

# Parche UTF-8 (Más inteligente para no chocar con PostgreSQL)
_orig_open = builtins.open
def _patched_open(file, mode='r', buffering=-1, encoding=None, errors=None, newline=None, closefd=True, opener=None):
    # Solo forzamos UTF-8 si estamos leyendo un archivo de texto común (como un XML o un certificado)
    # y evitamos tocar si viene de librerías internas o si el 'file' es un número de conexión
    if isinstance(file, str) and 'b' not in mode and encoding is None:
        encoding = 'utf-8'
        errors = 'replace'
    return _orig_open(file, mode, buffering, encoding, errors, newline, closefd, opener)
builtins.open = _patched_open

# Parche MD5
_old_md5 = hashlib.md5
def _patched_md5(data=b"", *args, **kwargs):
    if isinstance(data, str): data = data.encode("utf-8")
    return _old_md5(data, *args, **kwargs)
hashlib.md5 = _patched_md5

# Parche OpenSSL Popen
OPENSSL_EXE = os.getenv("OPENSSL_EXE", r"C:\Program Files\OpenSSL-Win64\bin\openssl.exe")
_orig_popen = subprocess.Popen
def _patched_popen(cmds, *args, **kwargs):
    if isinstance(cmds, list) and len(cmds) > 0:
        if "smime" in cmds or str(cmds[0]).lower() in ["openssl", "openssl.exe"]:
            cmds[0] = OPENSSL_EXE
    return _orig_popen(cmds, *args, **kwargs)
subprocess.Popen = _patched_popen

# ============================================================
# 2. IMPORTAMOS LA LIBRERÍA DE AFIP (Dejamos que rompa todo)
# ============================================================
from pyafipws.wsaa import WSAA
from pyafipws.wsfev1 import WSFEv1
import pyafipws.wsaa
from pysimplesoap.simplexml import SimpleXMLElement
from pysimplesoap.client import SoapClient

# ============================================================
# 3. 🪄 LIMPIEZA TOTAL: DESHACEMOS EL SABOTAJE DE AFIP
# ============================================================

# A) Restauramos los motores de red originales y limpios
http.client.HTTPSConnection.__init__ = _motor_https_original
httplib2.HTTPSConnectionWithTimeout.__init__ = _httplib2_https_original

def _fixed_https_init(self, *args, **kwargs):
    host = args[0] if len(args) > 0 else kwargs.get("host")
    port = args[1] if len(args) > 1 else kwargs.get("port")
    timeout = kwargs.get("timeout", None)

    proxy_info = kwargs.get("proxy_info", None)
    if callable(proxy_info):
        proxy_info = proxy_info(host)

    self.proxy_info = proxy_info
    self.ca_certs = kwargs.get("ca_certs", None)
    self.disable_ssl_certificate_validation = True
    self.tls_maximum_version = kwargs.get("tls_maximum_version", None)
    self.tls_minimum_version = kwargs.get("tls_minimum_version", None)

    context = ssl._create_unverified_context()

    try:
        context.set_ciphers("DEFAULT:@SECLEVEL=1")
    except Exception:
        pass

    _motor_https_original(
        self,
        host,
        port=port,
        timeout=timeout,
        context=context
    )

httplib2.HTTPSConnectionWithTimeout.__init__ = _fixed_https_init

# B) Apagamos la validación de certificados globalmente
ssl._create_default_https_context = ssl._create_unverified_context
if hasattr(ssl, 'create_default_context'):
    ssl.create_default_context = lambda *args, **kwargs: ssl._create_unverified_context()

_orig_httplib2_init = httplib2.Http.__init__
def _patched_http_init(self, *args, **kwargs):
    kwargs['disable_ssl_certificate_validation'] = True
    _orig_httplib2_init(self, *args, **kwargs)
httplib2.Http.__init__ = _patched_http_init

# C) Matamos la caché para que no lea archivos viejos
_orig_wsdl_parse = SoapClient.wsdl_parse
def _patched_wsdl_parse(self, wsdl, *args, **kwargs):
    kwargs['cache'] = False  # Forzamos que nunca use caché
    return _orig_wsdl_parse(self, wsdl, *args, **kwargs)
SoapClient.wsdl_parse = _patched_wsdl_parse

# Parche XML
_old_as_xml = SimpleXMLElement.as_xml
def _patched_as_xml(self, *args, **kwargs):
    res = _old_as_xml(self, *args, **kwargs)
    return res.decode("utf-8", "ignore") if isinstance(res, bytes) else res
SimpleXMLElement.as_xml = _patched_as_xml

pyafipws.wsaa.openssl = OPENSSL_EXE

# ============================================================
# CONFIGURACIÓN GLOBAL
# ============================================================
CUIT = os.getenv("AFIP_CUIT")
CERT = os.getenv("AFIP_CERT_PATH")
KEY = os.getenv("AFIP_KEY_PATH")


def validar_configuracion_afip():
    faltantes = []

    if not CUIT:
        faltantes.append("AFIP_CUIT")
    if not CERT:
        faltantes.append("AFIP_CERT_PATH")
    if not KEY:
        faltantes.append("AFIP_KEY_PATH")
    if not OPENSSL_EXE:
        faltantes.append("OPENSSL_EXE")

    if faltantes:
        raise RuntimeError(
            "Faltan variables de entorno requeridas para ARCA/AFIP: " + ", ".join(faltantes)
        )

    if not os.path.exists(CERT):
        raise FileNotFoundError(f"No se encontró el certificado configurado en AFIP_CERT_PATH: {CERT}")

    if not os.path.exists(KEY):
        raise FileNotFoundError(f"No se encontró la clave privada configurada en AFIP_KEY_PATH: {KEY}")

    if OPENSSL_EXE and not os.path.exists(OPENSSL_EXE):
        raise FileNotFoundError(f"No se encontró OpenSSL configurado en OPENSSL_EXE: {OPENSSL_EXE}")

def obtener_estado_afip():
    try:
        wsfe = WSFEv1()
        wsfe.Conectar(wsdl="https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL", cache=False)
        wsfe.Dummy()
        return {
            "status": "online",
            "app": wsfe.AppServerStatus,
            "db": wsfe.DbServerStatus,
            "auth": wsfe.AuthServerStatus
        }
    except Exception as e:
        # --- ACÁ ESTÁ LA TRAMPA: AHORA GRITA EL ERROR ---
        print("\n" + "🔴"*20)
        print("🚨 ATENCIÓN: FALLÓ EL PING A LA AFIP 🚨")
        print(f"Motivo exacto: {str(e)}")
        traceback.print_exc()
        print("🔴"*20 + "\n")
        return {"status": "offline", "error": str(e)}

def obtener_ultimo_comprobante(punto_venta, tipo_cbte):
    try:
        validar_configuracion_afip()
        wsaa = WSAA()
        tra = wsaa.CreateTRA("wsfe")
        cms = wsaa.SignTRA(tra, CERT, KEY)

        wsaa.Conectar(
            wsdl="https://wsaa.afip.gov.ar/ws/services/LoginCms?wsdl",
            cache=None
        )
        wsaa.LoginCMS(cms)

        wsfe = WSFEv1()
        wsfe.Token = wsaa.Token
        wsfe.Sign = wsaa.Sign
        wsfe.Cuit = CUIT

        wsfe.Conectar(
            wsdl="https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL",
            cache=None
        )

        result = wsfe.client.FECompUltimoAutorizado(
            Auth={
                "Token": wsfe.Token,
                "Sign": wsfe.Sign,
                "Cuit": wsfe.Cuit,
            },
            PtoVta=int(punto_venta),
            CbteTipo=int(tipo_cbte)
        )

        print("RESPUESTA AFIP ULTIMO COMPROBANTE:", result)

        result_data = result.get("FECompUltimoAutorizadoResult", {})

        if result_data.get("Errors"):
            print("ERRORES AFIP:", result_data.get("Errors"))
            return None

        ultimo = result_data.get("CbteNro", 0)
        return int(ultimo) if ultimo else 0

    except Exception:
        print("\n--- ERROR REAL DE AFIP ---")
        traceback.print_exc()
        print("--------------------------\n")
        return None

def emitir_factura_afip(datos_venta):
    try:
        validar_configuracion_afip()
        # IMPORTANTE:
        # El tipo de comprobante y el punto de venta deben venir definidos desde main.py.
        # Este controlador NO debe pisarlos, porque si no se generan diferencias entre:
        # frontend, backend, ARCA/AFIP, numeración y PDF.
        tipo_cbte = int(datos_venta["tipo_cbte"])
        punto_venta = int(datos_venta["punto_venta"])
        tipo_doc = int(datos_venta.get("tipo_doc", 80))

        print("TIPO CBTE RECIBIDO:", tipo_cbte)
        print("PUNTO VENTA RECIBIDO:", punto_venta)
        print("TIPO DOC RECIBIDO:", tipo_doc)

        wsaa = WSAA()
        tra = wsaa.CreateTRA("wsfe")
        cms = wsaa.SignTRA(tra, CERT, KEY)

        wsaa.Conectar(
            wsdl="https://wsaa.afip.gov.ar/ws/services/LoginCms?wsdl",
            cache=None
        )
        wsaa.LoginCMS(cms)

        wsfe = WSFEv1()
        wsfe.Token = wsaa.Token
        wsfe.Sign = wsaa.Sign
        wsfe.Cuit = CUIT

        wsfe.Conectar(
            wsdl="https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL",
            cache=None
        )

        result = wsfe.client.FECompUltimoAutorizado(
            Auth={
                "Token": wsfe.Token,
                "Sign": wsfe.Sign,
                "Cuit": wsfe.Cuit,
            },
            PtoVta=punto_venta,
            CbteTipo=tipo_cbte
        )

        print("RESPUESTA AFIP ULTIMO COMPROBANTE:", result)

        result_data = result.get("FECompUltimoAutorizadoResult", {})

        if result_data.get("Errors"):
            return {
                "error": str(result_data.get("Errors"))
            }

        ultimo = result_data.get("CbteNro", 0)
        proximo = int(ultimo) + 1 if ultimo else 1
        fecha = datetime.now().strftime("%Y%m%d")

        print("DATOS VENTA RECIBIDOS:", datos_venta)
        print("ULTIMO:", ultimo)
        print("PROXIMO:", proximo)
        print("FECHA:", fecha)

        result_cae = wsfe.client.FECAESolicitar(
            Auth={
                "Token": wsfe.Token,
                "Sign": wsfe.Sign,
                "Cuit": wsfe.Cuit,
            },
            FeCAEReq={
                "FeCabReq": {
                    "CantReg": 1,
                    "PtoVta": punto_venta,
                    "CbteTipo": tipo_cbte,
                },
                "FeDetReq": {
                    "FECAEDetRequest": [{
                        "Concepto": 1,
                        "DocTipo": tipo_doc,
                        "DocNro": int(str(datos_venta["cuit_cliente"]).replace("-", "").strip()),
                        "CbteDesde": proximo,
                        "CbteHasta": proximo,
                        "CbteFch": fecha,
                        "ImpTotal": round(float(datos_venta["total"]), 2),
                        "ImpTotConc": 0.00,
                        "ImpNeto": round(float(datos_venta["neto"]), 2),
                        "ImpOpEx": 0.00,
                        "ImpTrib": 0.00,
                        "ImpIVA": round(float(datos_venta["iva_total"]), 2),
                        "MonId": "PES",
                        "MonCotiz": 1.00,
                        "Iva": {
                            "AlicIva": [{
                                "Id": 5,
                                "BaseImp": round(float(datos_venta["neto"]), 2),
                                "Importe": round(float(datos_venta["iva_total"]), 2),
                            }]
                        }
                    }]
                }
            }
        )

        print("RESPUESTA CAE:", result_cae)

        cae_result = result_cae.get("FECAESolicitarResult", {})
        detalle = cae_result.get("FeDetResp", {}).get("FECAEDetResponse", [])

        if isinstance(detalle, list):
            detalle = detalle[0] if detalle else {}
        elif isinstance(detalle, dict):
            pass
        else:
            detalle = {}

        if detalle.get("Resultado") != "A":
            return {
                "error": str(detalle.get("Observaciones") or cae_result.get("Errors") or "ARCA rechazó la solicitud."),
                "resultado": detalle.get("Resultado"),
                "obs": detalle.get("Observaciones")
            }

        return {
            "cae": detalle.get("CAE"),
            "vto": detalle.get("CAEFchVto"),
            "nro": proximo,
            "resultado": detalle.get("Resultado"),
            "obs": detalle.get("Observaciones")
        }

    except Exception as e:
        print("\n--- ERROR REAL DE AFIP AL EMITIR ---")
        traceback.print_exc()
        print("------------------------------------\n")
        return {"error": str(e)}