import os
import inspect
import configparser
import traceback
import subprocess
import hashlib
import builtins
import ssl
import http.client

REAL_HTTPS_INIT = http.client.HTTPSConnection.__init__

import httplib2

# ============================================================
# 1. CONFIGURACIÓN OPENSSL
# ============================================================

OPENSSL_DIR = r"C:\Program Files\OpenSSL-Win64\bin"
OPENSSL_EXE = os.path.join(OPENSSL_DIR, "openssl.exe")

if not os.path.exists(OPENSSL_EXE):
    raise FileNotFoundError(f"No se encontró OpenSSL en: {OPENSSL_EXE}")

os.environ["PATH"] = OPENSSL_DIR + os.pathsep + os.environ.get("PATH", "")

original_popen = subprocess.Popen

def patched_popen(cmds, *args, **kwargs):
    print("DEBUG Popen recibe:", cmds)

    if isinstance(cmds, list) and len(cmds) > 0:
        # Si es un llamado de firma OpenSSL de pyafipws, fuerzo el ejecutable
        if "smime" in cmds or str(cmds[0]).lower() in ["openssl", "openssl.exe"]:
            cmds[0] = OPENSSL_EXE
            kwargs["executable"] = OPENSSL_EXE

    print("DEBUG Popen ejecuta:", cmds)

    return original_popen(cmds, *args, **kwargs)

subprocess.Popen = patched_popen


# ============================================================
# 2. PARCHES COMPATIBILIDAD PYTHON 3.13 / LIBS ANTIGUAS
# ============================================================

builtins.basestring = str

if not hasattr(inspect, "getargspec"):
    inspect.getargspec = inspect.getfullargspec

if not hasattr(configparser, "SafeConfigParser"):
    configparser.SafeConfigParser = configparser.ConfigParser

original_md5 = hashlib.md5

def patched_md5(data=b"", *args, **kwargs):
    if isinstance(data, str):
        data = data.encode("utf-8")
    return original_md5(data, *args, **kwargs)

hashlib.md5 = patched_md5


# ============================================================
# 3. PARCHE HTTPS / HTTPLIB2
# ============================================================

def fixed_https_init(self, *args, **kwargs):
    host = args[0] if len(args) > 0 else kwargs.get("host")
    port = args[1] if len(args) > 1 else kwargs.get("port")
    timeout = kwargs.get("timeout", None)

    proxy_info = kwargs.get("proxy_info", None)

    # Si viene como función, la ejecutamos para obtener el proxy real
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

    REAL_HTTPS_INIT(
        self,
        host,
        port=port,
        timeout=timeout,
        context=context
    )

httplib2.HTTPSConnectionWithTimeout.__init__ = fixed_https_init


# ============================================================
# 4. PARCHE XML
# ============================================================

from pysimplesoap.simplexml import SimpleXMLElement

original_as_xml = SimpleXMLElement.as_xml

def patched_as_xml(self, *args, **kwargs):
    res = original_as_xml(self, *args, **kwargs)
    return res.decode("utf-8", "ignore") if isinstance(res, bytes) else res

SimpleXMLElement.as_xml = patched_as_xml

# ============================================================
# 4.1 PARCHE FETCH WSDL / PYSIMPLESOAP
# Evita error: write() argument must be str, not bytes
# ============================================================

import pysimplesoap.helpers
import pysimplesoap.client

def patched_fetch(url, http, cache=None, force_download=False, wsdl_basedir="", http_headers=None):
    if http_headers is None:
        http_headers = {}

    response, content = http.request(url, "GET", None, http_headers)

    if isinstance(content, bytes):
        content = content.decode("utf-8", errors="ignore")

    # ❗ Validación: contenido vacío
    if not content.strip():
        raise Exception(f"El WSDL vino vacío desde: {url}")

    # ❗ Validación: AFIP devolviendo HTML en lugar de XML
    content_lower = content.lstrip().lower()
    if content_lower.startswith("<html") or "<h1>logincms</h1>" in content_lower:
        raise Exception(f"❌ La URL no devolvió WSDL válido. Revisar endpoint: {url}")

    return content

pysimplesoap.helpers.fetch = patched_fetch
pysimplesoap.client.fetch = patched_fetch

# ============================================================
# 5. LIBRERÍA ARCA / AFIP
# ============================================================

from pyafipws.wsaa import WSAA
from pyafipws.wsfev1 import WSFEv1
import pyafipws.wsaa

# Forzamos a pyafipws a usar el OpenSSL correcto
pyafipws.wsaa.openssl = OPENSSL_EXE
pyafipws.wsaa.Popen = patched_popen


# ============================================================
# 6. DATOS
# ============================================================

cuit = "30719387086"

path_cert = r"C:\CERTIFICADO\certificado.crt"
path_key = r"C:\CERTIFICADO\privada.key"

if not os.path.exists(path_cert):
    raise FileNotFoundError(f"No se encontró el certificado: {path_cert}")

if not os.path.exists(path_key):
    raise FileNotFoundError(f"No se encontró la clave privada: {path_key}")


# ============================================================
# 7. EJECUCIÓN
# ============================================================

if __name__ == "__main__":
    try:
        print(f"✅ OpenSSL encontrado en: {OPENSSL_EXE}")

        result = subprocess.run(
            [OPENSSL_EXE, "version"],
            capture_output=True,
            text=True
        )
        print(f"✅ Versión OpenSSL: {result.stdout.strip()}")

        print("⏳ 1. Solicitando Ticket a ARCA / AFIP WSAA...")

        print("OpenSSL usado por pyafipws:", pyafipws.wsaa.openssl)

        wsaa = WSAA()
        tra = wsaa.CreateTRA("wsfe")

        cms = wsaa.SignTRA(tra, path_cert, path_key)

        wsaa.Conectar(
            wsdl="https://wsaa.afip.gov.ar/ws/services/LoginCms?wsdl",
            cache=None
        )

        wsaa.LoginCMS(cms)

        print("✅ Ticket de Acceso obtenido correctamente")

        print("⏳ 2. Conectando al servicio WSFEv1...")

        wsfe = WSFEv1()
        wsfe.Token = wsaa.Token
        wsfe.Sign = wsaa.Sign
        wsfe.Cuit = cuit

        wsfe.Conectar(
            wsdl="https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL",
            cache=None
        )

        wsfe.Dummy()

        print("\n🎉 CONEXIÓN EXITOSA CON ARCA / AFIP")
        print(f"AppServerStatus: {wsfe.AppServerStatus}")
        print(f"DbServerStatus: {wsfe.DbServerStatus}")
        print(f"AuthServerStatus: {wsfe.AuthServerStatus}")

    except Exception:
        print("\n❌ Error:")
        traceback.print_exc()