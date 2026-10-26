from pathlib import Path
from xml.sax.saxutils import escape
import re
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs' / 'DOCUMENTO_TECNICO.md'
OUTPUT = ROOT / 'output' / 'pdf' / 'Documento_Tecnico_Network_Diagnostics_Suite.pdf'

regular = Path(r'C:\Windows\Fonts\arial.ttf')
bold = Path(r'C:\Windows\Fonts\arialbd.ttf')
if regular.exists():
    pdfmetrics.registerFont(TTFont('Academic', str(regular)))
    pdfmetrics.registerFont(TTFont('AcademicBold', str(bold)))
    base_font, bold_font = 'Academic', 'AcademicBold'
else:
    base_font, bold_font = 'Helvetica', 'Helvetica-Bold'

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='DocTitle', fontName=bold_font, fontSize=24, leading=29, textColor=colors.HexColor('#14232E'), spaceAfter=10))
styles.add(ParagraphStyle(name='DocSubtitle', fontName=base_font, fontSize=11, leading=16, textColor=colors.HexColor('#536773'), spaceAfter=18))
styles.add(ParagraphStyle(name='H1x', fontName=bold_font, fontSize=16, leading=20, textColor=colors.HexColor('#117452'), spaceBefore=14, spaceAfter=8))
styles.add(ParagraphStyle(name='H2x', fontName=bold_font, fontSize=12, leading=16, textColor=colors.HexColor('#14232E'), spaceBefore=10, spaceAfter=5))
styles.add(ParagraphStyle(name='Bodyx', fontName=base_font, fontSize=9.3, leading=14, textColor=colors.HexColor('#243640'), spaceAfter=7))
styles.add(ParagraphStyle(name='Bulletx', parent=styles['Bodyx'], leftIndent=12, firstLineIndent=-7, bulletIndent=3))
styles.add(ParagraphStyle(name='Codex', fontName='Courier', fontSize=7.5, leading=11, backColor=colors.HexColor('#EDF3F4'), borderPadding=7, spaceAfter=7))
styles.add(ParagraphStyle(name='Footerx', fontName=base_font, fontSize=8, textColor=colors.HexColor('#71818A'), alignment=TA_CENTER))

def clean(text):
    return text.replace('–','-').replace('—','-').replace('→','-&gt;').replace('“','"').replace('”','"')

def inline(text):
    value = escape(clean(text))
    value = re.sub(r'`([^`]+)`', r'<font name="Courier">\1</font>', value)
    value = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', value)
    return value

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor('#D8E2E6'))
    canvas.line(20*mm, 14*mm, 190*mm, 14*mm)
    canvas.setFont(base_font, 7.5)
    canvas.setFillColor(colors.HexColor('#6C7D86'))
    canvas.drawString(20*mm, 9*mm, 'Desarrollo de Aplicaciones Móviles - TP N.º 6')
    canvas.drawRightString(190*mm, 9*mm, f'Página {doc.page}')
    canvas.restoreState()

lines = SOURCE.read_text(encoding='utf-8').splitlines()
story = [Spacer(1, 14*mm), Paragraph('NETWORK DIAGNOSTICS SUITE', styles['DocTitle']), Paragraph('Documento técnico - Trabajo Práctico N.º 6<br/>Desarrollo de Aplicaciones Móviles 2026', styles['DocSubtitle']), Spacer(1, 6*mm), Paragraph('Suite Android offline-first para diagnóstico de infraestructura de telecomunicaciones, registro de evidencia georreferenciada y sincronización diferida.', styles['Bodyx']), Spacer(1, 115*mm), Paragraph('React Native · Android · SNMP · SSH · SQLite · Outbox', styles['Footerx']), PageBreak()]

i = 1
in_code = False
code_lines = []
while i < len(lines):
    line = lines[i].rstrip()
    if line.startswith('```'):
        if in_code:
            if code_lines:
                story.append(Paragraph('<br/>'.join(escape(clean(x)) for x in code_lines), styles['Codex']))
            code_lines = []
            in_code = False
        else:
            in_code = True
        i += 1
        continue
    if in_code:
        code_lines.append(line)
        i += 1
        continue
    if line.startswith('|') and i + 1 < len(lines) and lines[i+1].startswith('|---'):
        table_lines = [line]
        i += 2
        while i < len(lines) and lines[i].startswith('|'):
            table_lines.append(lines[i]); i += 1
        data = [[Paragraph(inline(cell.strip()), styles['Bodyx']) for cell in row.strip('|').split('|')] for row in table_lines]
        table = Table(data, repeatRows=1, hAlign='LEFT', colWidths=[55*mm, 112*mm] if len(data[0]) == 2 else None)
        table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#DDEEE8')),('TEXTCOLOR',(0,0),(-1,0),colors.HexColor('#11543D')),('FONTNAME',(0,0),(-1,0),bold_font),('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#C8D7DC')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5)]))
        story.extend([table, Spacer(1, 6)])
        continue
    if line.startswith('# '):
        i += 1; continue
    if line.startswith('## '):
        story.append(Paragraph(inline(line[3:]), styles['H1x']))
    elif line.startswith('### '):
        story.append(Paragraph(inline(line[4:]), styles['H2x']))
    elif line.startswith('- '):
        story.append(Paragraph('• ' + inline(line[2:]), styles['Bulletx']))
    elif re.match(r'^\d+\. ', line):
        story.append(Paragraph(inline(line), styles['Bulletx']))
    elif line.strip():
        story.append(Paragraph(inline(line), styles['Bodyx']))
    i += 1

doc = SimpleDocTemplate(str(OUTPUT), pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=18*mm, bottomMargin=19*mm, title='Documento Técnico - Network Diagnostics Suite', author='Desarrollo de Aplicaciones Móviles 2026')
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUTPUT)
