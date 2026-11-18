"""
AegisFIM - Project Report Document Generator
Generates a DOCX report strictly adhering to the formatting, styles, page borders,
margins, fonts, and layout of the sample template.
"""

import os
import shutil
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

TEMPLATE_PATH = "/Users/mahanshgaur/Downloads/23ESKCY049_somyaroy_CSL-G40 (1).docx"
OUTPUT_PATH = "/Users/mahanshgaur/Documents/Btech/CyberSecurity_Project/23ESKCY302_MahanshGaur_CSL-G28.docx"
DOWNLOADS_OUTPUT = "/Users/mahanshgaur/Downloads/23ESKCY302_MahanshGaur_CSL-G28.docx"

LOGO_PATH = "/tmp/sample_docx_extract/image1.png"
SCREENSHOT_DIR = "/tmp/aegisfim_screenshots"


def set_cell_shading(cell, color_hex="D9E2F3"):
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading)


def set_cell_borders(cell, top="single", bottom="single", left="single", right="single", sz="4", color="auto"):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:top w:val="{top}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:left w:val="{left}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:bottom w:val="{bottom}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:right w:val="{right}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(tcBorders)


def format_table(table, col_widths, headers, data, header_bg="D9E2F3"):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    # Header row
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(3)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.0
        for r in p.runs:
            r.font.name = "Times New Roman"
            r.font.size = Pt(10)
            r.font.bold = True
        set_cell_shading(hdr_cells[i], header_bg)
        set_cell_borders(hdr_cells[i])

    # Data rows
    for row_idx, row_data in enumerate(data):
        row_cells = table.add_row().cells
        for col_idx, text in enumerate(row_data):
            row_cells[col_idx].text = str(text)
            p = row_cells[col_idx].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.0
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(9.5)
            set_cell_borders(row_cells[col_idx])

    # Widths
    for row in table.rows:
        for idx, width in enumerate(col_widths):
            row.cells[idx].width = width


def add_single_image_box(doc, img_path, caption_text, width=Inches(6.02)):
    # Table 1x1 with thin border
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    set_cell_borders(cell, sz="4", color="auto")
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(3)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.0
    run = p.add_run()
    run.add_picture(img_path, width=width)
    
    # Caption below table
    cap_p = doc.add_paragraph()
    cap_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap_p.paragraph_format.space_before = Pt(4)
    cap_p.paragraph_format.space_after = Pt(8)
    r_cap = cap_p.add_run(caption_text)
    r_cap.font.name = "Times New Roman"
    r_cap.font.size = Pt(10)
    r_cap.font.bold = True


def add_body_p(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.5
    r = p.add_run(text)
    r.font.name = "Times New Roman"
    r.font.size = Pt(12)
    return p


def add_bullet_p(doc, text):
    p = doc.add_paragraph(style='List Paragraph')
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.5
    r = p.add_run(text)
    r.font.name = "Times New Roman"
    r.font.size = Pt(12)
    return p


def add_heading1_p(doc, text):
    p = doc.add_heading(text, level=1)
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(6)
    for r in p.runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(16)
        r.font.bold = True
    return p


def add_heading2_p(doc, text):
    p = doc.add_heading(text, level=2)
    p.paragraph_format.space_before = Pt(9)
    p.paragraph_format.space_after = Pt(4)
    for r in p.runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(14)
        r.font.bold = True
    return p


def add_caption_p(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run(text)
    r.font.name = "Times New Roman"
    r.font.size = Pt(10)
    r.font.bold = True
    return p


def add_code_block(doc, code_str):
    for line in code_str.strip().split("\n"):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.line_spacing = 1.0
        r = p.add_run(line if line else " ")
        r.font.name = "Courier New"
        r.font.size = Pt(9.5)


print("Definitions loaded.")
