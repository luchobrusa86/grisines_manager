from fpdf import FPDF
import qrcode
import os
import base64
import json

class FacturaPDF(FPDF):
    def header(self):
        # 1. Obtenemos las variables dinámicas
        letra = getattr(self, 'letra_comprobante', 'X')
        nro_comp = getattr(self, 'nro_factura_formateado', '0000-00000000')
        fecha_emision = getattr(self, 'fecha_emision', '')

        # Marco exterior
        self.rect(5, 5, 200, 287)
        # Línea divisoria central superior (CORREGIDA: empieza en y=19, debajo del cuadro)
        self.line(105, 19, 105, 50)
        
        # Cuadro de la Letra del Comprobante
        self.set_font("Arial", "B", 20)
        self.rect(98, 5, 14, 14)
        self.set_xy(98, 7)
        self.cell(14, 10, letra, align="C")
        
        # Título y Datos del Emisor (Izquierda)
        self.set_xy(10, 10)
        self.set_font("Arial", "B", 16)
        self.cell(90, 10, "MARIA LUJAN", ln=True)
        self.set_font("Arial", "", 10)
        self.cell(90, 5, "Razón Social: Amasijo de Luján", ln=True)
        self.cell(90, 5, "Domicilio Comercial: 3 de febrero 4637 - Rosario", ln=True)
        self.cell(90, 5, "Condición IVA: Responsable Inscripto", ln=True)

        # Datos del Comprobante (Derecha)
        self.set_xy(110, 10)
        self.set_font("Arial", "B", 14)
        
        # Título dinámico
        titulo = "FACTURA" if letra in ["A", "B", "C"] else "DOCUMENTO INTERNO"
        self.cell(90, 10, titulo, align="R", ln=True)
        
        # Números dinámicos (CORREGIDO)
        self.set_font("Arial", "", 10)
        self.set_x(110)
        self.cell(90, 5, f"Comp. Nro: {nro_comp}", align="R", ln=True)
        self.set_x(110)
        self.cell(90, 5, f"Fecha: {fecha_emision}", align="R", ln=True)

    def footer(self):
        # Posición a 2.5 cm del final
        self.set_y(-25)
        self.set_font("Arial", "B", 10)
        
        cae = getattr(self, 'cae_nro', 'PROVISORIO')
        vto = getattr(self, 'cae_vto', '--')

        # Si tiene CAE real, lo mostramos. Si no, aclaramos que no es factura.
        if cae and cae != "PROVISORIO" and cae != "None":
            self.cell(0, 5, f"CAE Nro: {cae}", ln=True, align="R")
            self.cell(0, 5, f"Fecha de Vto. CAE: {vto}", ln=True, align="R")
        else:
            self.cell(0, 5, "DOCUMENTO NO VALIDO COMO FACTURA", ln=True, align="C")
        
        # Generar QR AFIP
        if hasattr(self, 'qr_data') and os.path.exists(self.qr_data):
            self.image(self.qr_data, 10, self.get_y() - 15, 25, 25)

def generar_pdf_venta(venta, detalles):
    pdf = FacturaPDF()
    
    # --- CONFIGURAMOS LOS DATOS ANTES DE CREAR LA PÁGINA ---
    pdf.fecha_emision = venta.fecha.strftime("%d/%m/%Y")
    pdf.cae_nro = str(venta.cae) if venta.cae else "PROVISORIO"
    pdf.cae_vto = str(venta.vto_cae) if venta.vto_cae else "--"
    
    # Formateamos el número dinámico
    pdf.nro_factura_formateado = f"{venta.punto_venta:04d}-{venta.nro_factura:08d}"
    
    # Lógica de la Letra (X para interno, A o B para oficial)
    if not venta.es_oficial:
        pdf.letra_comprobante = "X"
    else:
        if venta.condicion_iva == "Responsable Inscripto":
            pdf.letra_comprobante = "A"
        else:
            # Emisor Responsable Inscripto:
            # - Cliente Responsable Inscripto -> Factura A
            # - Resto de clientes -> Factura B
            pdf.letra_comprobante = "B"
    
    # Datos para el QR
    qr_json = {
        "ver": 1, "fecha": str(venta.fecha), "cuit": 30719387086, "ptoVta": venta.punto_venta,
        "tipoCbte": 1 if pdf.letra_comprobante == "A" else (6 if pdf.letra_comprobante == "B" else 0), "nroCbte": venta.nro_factura, 
        "importe": venta.total, "moneda": "PES", "ctz": 1,
        "tipoDocRec": 80, "nroDocRec": int(str(venta.cuit).replace('-', '').strip() if venta.cuit else 0), 
        "tipoCodAut": "E", "codAut": pdf.cae_nro
    }
    qr_content = f"https://www.afip.gob.ar/fe/qr/?p={base64.b64encode(json.dumps(qr_json).encode()).decode()}"
    qr_img = qrcode.make(qr_content)
    qr_path = f"qr_{venta.id}.png"
    qr_img.save(qr_path)
    pdf.qr_data = qr_path

    pdf.add_page()
    
    # Datos del Cliente
    pdf.set_y(55)
    pdf.set_font("Arial", "B", 10)
    pdf.cell(0, 10, "DATOS DEL CLIENTE", ln=True, border="B")
    pdf.set_font("Arial", "", 10)
    pdf.cell(0, 7, f"Apellido y Nombre / Razón Social: {venta.razon_social}", ln=True)
    pdf.cell(0, 7, f"CUIT: {venta.cuit}", ln=True)
    pdf.cell(0, 7, f"Condición IVA: {venta.condicion_iva}", ln=True)
    pdf.cell(0, 7, f"Domicilio: {venta.cliente_domicilio or 'N/C'}", ln=True)

    # Tabla de Ítems
    pdf.ln(5)
    pdf.set_font("Arial", "B", 10)
    pdf.set_fill_color(240, 240, 240)
    pdf.cell(30, 8, "Código", 1, 0, "C", True)
    pdf.cell(80, 8, "Descripción", 1, 0, "C", True)
    pdf.cell(20, 8, "Cant.", 1, 0, "C", True)
    pdf.cell(30, 8, "Precio U.", 1, 0, "C", True)
    pdf.cell(30, 8, "Subtotal", 1, 1, "C", True)
    
    pdf.set_font("Arial", "", 10)
    for d in detalles:
        pdf.cell(30, 7, str(d.codigo), 1)
        pdf.cell(80, 7, str(d.descripcion), 1)
        pdf.cell(20, 7, str(d.cantidad), 1, 0, "C")
        pdf.cell(30, 7, f"$ {d.precio_unitario:,.2f}", 1, 0, "R")
        pdf.cell(30, 7, f"$ {(d.cantidad * d.precio_unitario):,.2f}", 1, 1, "R")

    # Totales
    pdf.ln(5)
    pdf.set_font("Arial", "B", 12)
    pdf.cell(160, 10, "TOTAL COMPROBANTE:", 0, 0, "R")
    pdf.cell(30, 10, f"$ {venta.total:,.2f}", 1, 1, "R")

    path_pdf = f"factura_{venta.id}.pdf"
    pdf.output(path_pdf)
    if os.path.exists(qr_path): os.remove(qr_path) # Limpiar el QR temporal
    return path_pdf