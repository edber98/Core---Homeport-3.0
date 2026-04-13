#!/usr/bin/env python3
"""
Build the unified Kinn simulator Excel file.
C4RBON GROUP - Kinn workflow automation platform.
"""

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, numbers
from openpyxl.utils import get_column_letter
from copy import copy

OUTPUT = "/Users/edouardbernier/Documents/Projets/i55/Projet/Core 2.0/Application/Homeport 1.0/Simulator consultant/simulateur-kinn-unifie.xlsx"

wb = openpyxl.Workbook()

# ── Styles ──────────────────────────────────────────────────────────────────
FONT_NAME = "Poppins"
header_font = Font(name=FONT_NAME, bold=True, color="FFFFFF", size=11)
header_fill = PatternFill(start_color="000000", end_color="000000", fill_type="solid")
alt_fill = PatternFill(start_color="F2F2F2", end_color="F2F2F2", fill_type="solid")
white_fill = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
input_font = Font(name=FONT_NAME, color="0000FF", size=11)
input_font_bold = Font(name=FONT_NAME, color="0000FF", size=11, bold=True)
normal_font = Font(name=FONT_NAME, color="000000", size=11)
bold_font = Font(name=FONT_NAME, color="000000", size=11, bold=True)
title_font = Font(name=FONT_NAME, bold=True, color="000000", size=14)
section_font = Font(name=FONT_NAME, bold=True, color="000000", size=12)
thin_border = Border(
    left=Side(style="thin", color="D0D0D0"),
    right=Side(style="thin", color="D0D0D0"),
    top=Side(style="thin", color="D0D0D0"),
    bottom=Side(style="thin", color="D0D0D0"),
)

EUR_FMT = '#,##0.00 "EUR"'
EUR_FMT4 = '#,##0.0000 "EUR"'
EUR_FMT6 = '#,##0.000000 "EUR"'
USD_FMT = '#,##0.00 "$"'
PCT_FMT = "0.0%"
INT_FMT = "#,##0"
NUM2_FMT = "#,##0.00"


def style_cell(ws, row, col, value=None, font=None, fill=None, fmt=None, alignment=None):
    cell = ws.cell(row=row, column=col, value=value)
    if font:
        cell.font = font
    else:
        cell.font = normal_font
    if fill:
        cell.fill = fill
    cell.border = thin_border
    if fmt:
        cell.number_format = fmt
    if alignment:
        cell.alignment = alignment
    return cell


def write_title(ws, last_col=8):
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=last_col)
    cell = ws.cell(row=1, column=1, value="C4RBON GROUP - Kinn")
    cell.font = title_font
    cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 30


def write_header_row(ws, row, headers, start_col=1):
    for i, h in enumerate(headers):
        c = ws.cell(row=row, column=start_col + i, value=h)
        c.font = header_font
        c.fill = header_fill
        c.border = thin_border
        c.alignment = Alignment(horizontal="center", wrap_text=True)


def write_data_row(ws, row, values, fonts=None, fmts=None, start_col=1):
    fill = alt_fill if row % 2 == 0 else white_fill
    for i, v in enumerate(values):
        col = start_col + i
        f = fonts[i] if fonts and i < len(fonts) else normal_font
        fmt = fmts[i] if fmts and i < len(fmts) else None
        style_cell(ws, row, col, v, font=f, fill=fill, fmt=fmt)


def write_section(ws, row, text, last_col=8):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=last_col)
    cell = ws.cell(row=row, column=1, value=text)
    cell.font = section_font
    cell.alignment = Alignment(horizontal="left")
    ws.row_dimensions[row].height = 24


def auto_width(ws, min_w=12, max_w=30):
    for col in ws.iter_cols(min_row=1, max_row=ws.max_row):
        mx = min_w
        letter = get_column_letter(col[0].column)
        for cell in col:
            if cell.value:
                mx = max(mx, min(len(str(cell.value)) + 2, max_w))
        ws.column_dimensions[letter].width = mx


# ============================================================================
# SHEET 1: Catalogue LLM
# ============================================================================
ws1 = wb.active
ws1.title = "Catalogue LLM"
ws1.sheet_properties.tabColor = "000000"
write_title(ws1, 8)

# Taux USD/EUR
style_cell(ws1, 2, 1, "Taux USD/EUR", font=bold_font)
style_cell(ws1, 2, 2, 1.08, font=input_font_bold, fmt=NUM2_FMT)

headers = ["Fournisseur", "Modele", "Input $/1M tokens", "Output $/1M tokens",
           "Input EUR/1M", "Output EUR/1M", "Context window", "Notes"]
write_header_row(ws1, 3, headers)

models = [
    ("OpenAI", "gpt-5.4", 2.50, 15.00, "1M", "Flagship"),
    ("OpenAI", "gpt-5.4-pro", 30.00, 180.00, "1M", "Premium reasoning"),
    ("OpenAI", "gpt-5.4-mini", 0.75, 4.50, "1M", "Fast + cheap"),
    ("OpenAI", "gpt-5.4-nano", 0.20, 1.25, "1M", "Ultra low cost"),
    ("OpenAI", "gpt-5.3", 1.75, 14.00, "400K", "Instant"),
    ("OpenAI", "gpt-5.2", 1.75, 14.00, "400K", "Standard"),
    ("OpenAI", "gpt-5", 1.25, 10.00, "400K", "Base"),
    ("OpenAI", "gpt-5-mini", 0.25, 2.00, "400K", "Light"),
    ("OpenAI", "gpt-5-nano", 0.05, 0.40, "400K", "Micro"),
    ("OpenAI", "gpt-4.1", 2.00, 8.00, "1M", "Previous gen"),
    ("OpenAI", "gpt-4.1-mini", 0.40, 1.60, "1M", "Previous gen mini"),
    ("OpenAI", "gpt-4.1-nano", 0.10, 0.40, "1M", "Previous gen nano"),
    ("OpenAI", "gpt-4o", 2.50, 10.00, "128K", "Legacy"),
    ("OpenAI", "gpt-4o-mini", 0.15, 0.60, "128K", "Legacy mini"),
    ("OpenAI", "o3", 2.00, 8.00, "200K", "Reasoning"),
    ("OpenAI", "o4-mini", 1.10, 4.40, "200K", "Reasoning mini"),
    ("Anthropic", "claude-opus-4.6", 5.00, 25.00, "1M", "Flagship"),
    ("Anthropic", "claude-sonnet-4.6", 3.00, 15.00, "1M", "Standard"),
    ("Anthropic", "claude-opus-4.5", 5.00, 25.00, "200K", "Previous"),
    ("Anthropic", "claude-sonnet-4.5", 3.00, 15.00, "200K", "Previous"),
    ("Anthropic", "claude-haiku-4.5", 1.00, 5.00, "200K", "Fast"),
    ("Anthropic", "claude-haiku-3.5", 0.80, 4.00, "200K", "Legacy fast"),
    ("Google", "gemini-2.5-pro", 2.00, 12.00, "1M", "Standard"),
    ("Google", "gemini-2.5-flash", 0.15, 0.60, "1M", "Fast"),
]

for idx, (vendor, model, inp, out, ctx, notes) in enumerate(models):
    r = 4 + idx
    fill = alt_fill if r % 2 == 0 else white_fill
    style_cell(ws1, r, 1, vendor, font=normal_font, fill=fill)
    style_cell(ws1, r, 2, model, font=normal_font, fill=fill)
    style_cell(ws1, r, 3, inp, font=normal_font, fill=fill, fmt=USD_FMT)
    style_cell(ws1, r, 4, out, font=normal_font, fill=fill, fmt=USD_FMT)
    style_cell(ws1, r, 5, f"=C{r}/$B$2", font=normal_font, fill=fill, fmt=EUR_FMT)
    style_cell(ws1, r, 6, f"=D{r}/$B$2", font=normal_font, fill=fill, fmt=EUR_FMT)
    style_cell(ws1, r, 7, ctx, font=normal_font, fill=fill)
    style_cell(ws1, r, 8, notes, font=normal_font, fill=fill)

auto_width(ws1)

# ============================================================================
# SHEET 2: Benchmark Concurrents
# ============================================================================
ws2 = wb.create_sheet("Benchmark Concurrents")
ws2.sheet_properties.tabColor = "000000"
write_title(ws2, 8)

# Section A
write_section(ws2, 3, "A. Comparaison modeles de facturation", 5)
write_header_row(ws2, 4, ["Plateforme", "Unite de facturation", "Definition", "Penalite complexite"])
data_a = [
    ("n8n", "Execution", "1 run de workflow complet", "Non"),
    ("Make.com", "Credit (ex-operation)", "1 action/step = 1 credit", "Oui"),
    ("Zapier", "Task", "1 action step = 1 task", "Oui"),
    ("Kinn", "Credit Kinn", "Credit universel (IA + workflow)", "Non"),
]
for i, row_data in enumerate(data_a):
    write_data_row(ws2, 5 + i, row_data)

# Section B
write_section(ws2, 13, "B. Grilles tarifaires concurrents", 5)

# n8n
style_cell(ws2, 14, 1, "n8n", font=bold_font)
write_header_row(ws2, 15, ["Plan", "Prix/mois (EUR)", "Executions incluses", "Prix/exec supplementaire"])
n8n_data = [
    ("Community (self-hosted)", 0, "Illimite", "-"),
    ("Starter", 24, 2500, 0.0096),
    ("Pro", 60, 10000, 0.006),
]
for i, d in enumerate(n8n_data):
    fmts = [None, EUR_FMT, INT_FMT, EUR_FMT4 if isinstance(d[3], float) else None]
    write_data_row(ws2, 16 + i, d, fmts=fmts)

# Make.com
style_cell(ws2, 21, 1, "Make.com", font=bold_font)
write_header_row(ws2, 22, ["Plan", "Prix/mois (EUR)", "Credits inclus", "Prix/credit supplementaire"])
make_data = [
    ("Free", 0, 1000, "-"),
    ("Core", 10.59, 10000, 0.0009),
    ("Pro", 18.82, 10000, 0.0009),
]
for i, d in enumerate(make_data):
    fmts = [None, EUR_FMT, INT_FMT, EUR_FMT4 if isinstance(d[3], float) else None]
    write_data_row(ws2, 23 + i, d, fmts=fmts)
style_cell(ws2, 26, 1, "Add-on: 9 EUR / 10 000 credits supplementaires", font=Font(name=FONT_NAME, italic=True, size=10))

# Zapier
style_cell(ws2, 28, 1, "Zapier", font=bold_font)
write_header_row(ws2, 29, ["Plan", "Prix/mois (EUR)", "Tasks incluses", "Prix/task supplementaire"])
zapier_data = [
    ("Free", 0, 100, "-"),
    ("Professional", 19.99, 750, 0.027),
    ("Team", 103.50, 2000, 0.052),
]
for i, d in enumerate(zapier_data):
    fmts = [None, EUR_FMT, INT_FMT, EUR_FMT4 if isinstance(d[3], float) else None]
    write_data_row(ws2, 30 + i, d, fmts=fmts)

# Section C
write_section(ws2, 38, "C. Position Kinn", 5)
style_cell(ws2, 39, 1, "Prix execution workflow Kinn (EUR)", font=normal_font)
style_cell(ws2, 39, 2, 0.005, font=input_font, fmt=EUR_FMT4)
style_cell(ws2, 40, 1, "Prix credit IA Kinn standalone (EUR/50 credits)", font=normal_font)
style_cell(ws2, 40, 2, 0.10, font=input_font, fmt=EUR_FMT)
style_cell(ws2, 41, 1, "n8n execution price (Starter)", font=normal_font)
style_cell(ws2, 41, 2, "=B16", font=normal_font, fmt=EUR_FMT4)  # ref n8n Starter exec price
style_cell(ws2, 42, 1, "Ratio Kinn vs n8n (Starter exec)", font=normal_font)
style_cell(ws2, 42, 2, "=B39/B17", font=normal_font, fmt=PCT_FMT)  # B17 = n8n Starter price/exec supp
style_cell(ws2, 43, 1, "Ratio Kinn vs Make (Core credit)", font=normal_font)
style_cell(ws2, 43, 2, "=B39/B24", font=normal_font, fmt=NUM2_FMT)  # B24 = Make Core price/credit supp

auto_width(ws2)

# ============================================================================
# SHEET 3: Cout reel IA
# ============================================================================
ws3 = wb.create_sheet("Cout reel IA")
ws3.sheet_properties.tabColor = "000000"
write_title(ws3, 7)

# Section A
write_section(ws3, 3, "A. Parametres modele par defaut", 4)
labels_a = [
    ("Modele par defaut", "gpt-5-mini", input_font, None),
    ("Input $/1M tokens", 0.25, input_font, USD_FMT),
    ("Output $/1M tokens", 2.00, input_font, USD_FMT),
    ("Taux USD/EUR", "='Catalogue LLM'!B2", normal_font, NUM2_FMT),
    ("Input EUR/1M tokens", "=B5/B7", normal_font, EUR_FMT),
    ("Output EUR/1M tokens", "=B6/B7", normal_font, EUR_FMT),
]
for i, (label, val, fnt, fmt) in enumerate(labels_a):
    r = 4 + i
    style_cell(ws3, r, 1, label, font=normal_font)
    style_cell(ws3, r, 2, val, font=fnt, fmt=fmt)

# Section B
write_section(ws3, 14, "B. Cout par requete IA type", 7)
write_header_row(ws3, 15, ["Usage", "Tokens input", "Tokens output",
                            "Cout input (EUR)", "Cout output (EUR)", "Cout total (EUR)"])
usages = [
    ("Message simple", 500, 200),
    ("Message moyen", 2000, 500),
    ("Message long", 5000, 1500),
    ("Analyse document", 15000, 3000),
    ("Generation workflow (agent)", 50000, 5000),
    ("Workflow avec outils (5 calls)", 25000, 10000),
    ("Workflow complet (10 calls)", 50000, 20000),
]
for i, (usage, tin, tout) in enumerate(usages):
    r = 16 + i
    fill = alt_fill if r % 2 == 0 else white_fill
    style_cell(ws3, r, 1, usage, font=normal_font, fill=fill)
    style_cell(ws3, r, 2, tin, font=normal_font, fill=fill, fmt=INT_FMT)
    style_cell(ws3, r, 3, tout, font=normal_font, fill=fill, fmt=INT_FMT)
    style_cell(ws3, r, 4, f"=(B{r}/1000000)*$B$8", font=normal_font, fill=fill, fmt=EUR_FMT6)
    style_cell(ws3, r, 5, f"=(C{r}/1000000)*$B$9", font=normal_font, fill=fill, fmt=EUR_FMT6)
    style_cell(ws3, r, 6, f"=D{r}+E{r}", font=normal_font, fill=fill, fmt=EUR_FMT6)

# Section C
write_section(ws3, 31, "C. Cout moyen par session utilisateur", 4)
params_c = [
    (32, "Requetes IA moyennes par session", 5, input_font, INT_FMT),
    (33, "Tokens input moyens par session", 10000, input_font, INT_FMT),
    (34, "Tokens output moyens par session", 2500, input_font, INT_FMT),
    (35, "Cout reel par session (EUR)", "=(B33/1000000)*B8+(B34/1000000)*B9", normal_font, EUR_FMT4),
    (36, "", None, normal_font, None),
    (37, "Sessions par client par jour", 3, input_font, INT_FMT),
    (38, "Jours actifs par mois", 22, input_font, INT_FMT),
    (39, "Cout IA par client/mois (EUR)", "=B35*B37*B38", normal_font, EUR_FMT),
]
for r, label, val, fnt, fmt in params_c:
    style_cell(ws3, r, 1, label, font=normal_font)
    if val is not None:
        style_cell(ws3, r, 2, val, font=fnt, fmt=fmt)

# Section D
write_section(ws3, 43, "D. Impact par modele", 7)
write_header_row(ws3, 44, ["Modele", "Input $/1M", "Output $/1M",
                            "Cout/session (EUR)", "Cout/client/mois (EUR)", "Ratio vs defaut"])

for i, (vendor, model, inp, out, ctx, notes) in enumerate(models):
    r = 45 + i
    cat_row = 4 + i  # corresponding row in Catalogue LLM
    fill = alt_fill if r % 2 == 0 else white_fill
    style_cell(ws3, r, 1, model, font=normal_font, fill=fill)
    style_cell(ws3, r, 2, f"='Catalogue LLM'!C{cat_row}", font=normal_font, fill=fill, fmt=USD_FMT)
    style_cell(ws3, r, 3, f"='Catalogue LLM'!D{cat_row}", font=normal_font, fill=fill, fmt=USD_FMT)
    # Cost/session = (input_tokens/1M * input_EUR) + (output_tokens/1M * output_EUR)
    # input_EUR = B{r_col2} / taux, but simpler: use Catalogue EUR directly
    style_cell(ws3, r, 4,
               f"=($B$33/1000000)*('Catalogue LLM'!E{cat_row})+($B$34/1000000)*('Catalogue LLM'!F{cat_row})",
               font=normal_font, fill=fill, fmt=EUR_FMT4)
    style_cell(ws3, r, 5, f"=D{r}*$B$37*$B$38", font=normal_font, fill=fill, fmt=EUR_FMT)
    style_cell(ws3, r, 6, f"=D{r}/$B$35", font=normal_font, fill=fill, fmt=NUM2_FMT)

auto_width(ws3)

# ============================================================================
# SHEET 4: Credits Kinn
# ============================================================================
ws4 = wb.create_sheet("Credits Kinn")
ws4.sheet_properties.tabColor = "000000"
write_title(ws4, 8)

# Section A
write_section(ws4, 3, "A. Definition du credit Kinn", 4)
defs = [
    (4, "Credits par dollar (reference)", 50, input_font, INT_FMT),
    (5, "Marge multiplicateur", 2.5, input_font, NUM2_FMT),
    (6, "Cout reel par credit (EUR)", "=1/(B4*'Catalogue LLM'!B2)", normal_font, EUR_FMT4),
    (7, "Prix de vente par credit (EUR)", "=B6*B5", normal_font, EUR_FMT4),
    (8, "Equivalent: 1 EUR = combien de credits", "=1/B7", normal_font, NUM2_FMT),
    (9, "Arrondi commercial: 1 EUR = credits", 20, input_font, INT_FMT),
    (10, "Prix effectif par credit (EUR)", "=1/B9", normal_font, EUR_FMT4),
]
for r, label, val, fnt, fmt in defs:
    style_cell(ws4, r, 1, label, font=normal_font)
    style_cell(ws4, r, 2, val, font=fnt, fmt=fmt)

# Section B - Standalone packs
write_section(ws4, 14, "B. Packs credits IA - Sans abonnement", 8)
write_header_row(ws4, 15, ["Pack", "Credits", "Prix EUR", "Prix/credit",
                            "Cout reel", "Marge brute", "Marge %"])
packs_b = [
    ("Decouverte", 100, 9.90),
    ("Standard", 500, 39.00),
    ("Pro", 1000, 69.00),
    ("Business", 2500, 149.00),
    ("Enterprise", 5000, 249.00),
]
for i, (name, credits, price) in enumerate(packs_b):
    r = 16 + i
    fill = alt_fill if r % 2 == 0 else white_fill
    style_cell(ws4, r, 1, name, font=normal_font, fill=fill)
    style_cell(ws4, r, 2, credits, font=normal_font, fill=fill, fmt=INT_FMT)
    style_cell(ws4, r, 3, price, font=normal_font, fill=fill, fmt=EUR_FMT)
    style_cell(ws4, r, 4, f"=C{r}/B{r}", font=normal_font, fill=fill, fmt=EUR_FMT4)
    style_cell(ws4, r, 5, f"=B{r}*$B$6", font=normal_font, fill=fill, fmt=EUR_FMT)
    style_cell(ws4, r, 6, f"=C{r}-E{r}", font=normal_font, fill=fill, fmt=EUR_FMT)
    style_cell(ws4, r, 7, f"=F{r}/C{r}", font=normal_font, fill=fill, fmt=PCT_FMT)

# Section C - Subscriber packs
write_section(ws4, 28, "C. Credits IA supplementaires - Avec abonnement", 9)
write_header_row(ws4, 29, ["Pack", "Credits", "Prix EUR", "Prix/credit",
                            "Cout reel", "Marge", "Marge %", "Remise vs standalone"])
packs_c = [
    ("+500", 500, 29.00, 17),    # standalone row ref for 500 = row 17
    ("+1000", 1000, 49.00, 18),
    ("+2500", 2500, 99.00, 19),
    ("+5000", 5000, 179.00, 20),
    ("+10000", 10000, 299.00, None),
]
for i, (name, credits, price, standalone_row) in enumerate(packs_c):
    r = 30 + i
    fill = alt_fill if r % 2 == 0 else white_fill
    style_cell(ws4, r, 1, name, font=normal_font, fill=fill)
    style_cell(ws4, r, 2, credits, font=normal_font, fill=fill, fmt=INT_FMT)
    style_cell(ws4, r, 3, price, font=normal_font, fill=fill, fmt=EUR_FMT)
    style_cell(ws4, r, 4, f"=C{r}/B{r}", font=normal_font, fill=fill, fmt=EUR_FMT4)
    style_cell(ws4, r, 5, f"=B{r}*$B$6", font=normal_font, fill=fill, fmt=EUR_FMT)
    style_cell(ws4, r, 6, f"=C{r}-E{r}", font=normal_font, fill=fill, fmt=EUR_FMT)
    style_cell(ws4, r, 7, f"=F{r}/C{r}", font=normal_font, fill=fill, fmt=PCT_FMT)
    if standalone_row:
        # Remise = 1 - (prix/credit abo / prix/credit standalone)
        style_cell(ws4, r, 8, f"=1-(D{r}/D{standalone_row})", font=normal_font, fill=fill, fmt=PCT_FMT)
    else:
        # No direct standalone equivalent for 10000
        style_cell(ws4, r, 8, "N/A", font=normal_font, fill=fill)

# Section D - Subscriptions
write_section(ws4, 41, "D. Abonnements Kinn", 8)
write_header_row(ws4, 42, ["Abonnement", "Prix/mois EUR", "Credits IA inclus",
                            "Exec workflow incluses", "Valeur credits (cout reel)",
                            "Valeur plateforme", "Credits supplementaires"])
subs = [
    ("Free", 0, 50, 100, "Non"),
    ("Starter", 29, 200, 1000, "Pack +500 = 29 EUR"),
    ("Pro", 79, 600, 5000, "Pack +1000 = 49 EUR"),
    ("Business", 199, 2000, 25000, "Pack +2500 = 99 EUR"),
    ("Enterprise", 499, 6000, 100000, "Pack +5000 = 179 EUR"),
]
for i, (name, price, credits, execs, supp) in enumerate(subs):
    r = 43 + i
    fill = alt_fill if r % 2 == 0 else white_fill
    style_cell(ws4, r, 1, name, font=normal_font, fill=fill)
    style_cell(ws4, r, 2, price, font=normal_font, fill=fill, fmt=EUR_FMT)
    style_cell(ws4, r, 3, credits, font=normal_font, fill=fill, fmt=INT_FMT)
    style_cell(ws4, r, 4, execs, font=normal_font, fill=fill, fmt=INT_FMT)
    style_cell(ws4, r, 5, f"=C{r}*$B$6", font=normal_font, fill=fill, fmt=EUR_FMT)
    if price > 0:
        style_cell(ws4, r, 6, f"=B{r}-E{r}", font=normal_font, fill=fill, fmt=EUR_FMT)
    else:
        style_cell(ws4, r, 6, "-", font=normal_font, fill=fill)
    style_cell(ws4, r, 7, supp, font=normal_font, fill=fill)

auto_width(ws4)

# ============================================================================
# SHEET 5: AWS Infrastructure
# ============================================================================
ws5 = wb.create_sheet("AWS Infrastructure")
ws5.sheet_properties.tabColor = "000000"
write_title(ws5, 6)

# Section A
write_section(ws5, 3, "A. Cout infrastructure par palier", 6)
write_header_row(ws5, 4, ["Clients", "Instance", "Workers", "Cout AWS/mois (EUR)", "Cout AWS/client/mois (EUR)"])
aws_data = [
    (10, "t4g.medium", 3, 280, "=D5/A5"),
    (25, "t4g.medium", 6, 400, "=D6/A6"),
    (50, "t4g.medium", 11, 555, "=D7/A7"),
    (100, "t4g.large", 22, 1400, "=D8/A8"),
    (200, "m7g.large", 44, 3100, "=D9/A9"),
    (500, "m7g.xlarge", 51, 6800, "=D10/A10"),
]
for i, (clients, inst, workers, cost, per_client) in enumerate(aws_data):
    r = 5 + i
    fill = alt_fill if r % 2 == 0 else white_fill
    style_cell(ws5, r, 1, clients, font=input_font, fill=fill, fmt=INT_FMT)
    style_cell(ws5, r, 2, inst, font=input_font, fill=fill)
    style_cell(ws5, r, 3, workers, font=input_font, fill=fill, fmt=INT_FMT)
    style_cell(ws5, r, 4, cost, font=input_font, fill=fill, fmt=EUR_FMT)
    style_cell(ws5, r, 5, per_client, font=normal_font, fill=fill, fmt=EUR_FMT)

# Section B
write_section(ws5, 23, "B. Cout fixe mensuel plateforme", 3)
fixed_costs = [
    (24, "Hebergement / DevOps", 500),
    (25, "Monitoring / Logging", 100),
    (26, "Domaines / DNS", 50),
    (27, "Backup / Securite", 200),
]
for r, label, val in fixed_costs:
    style_cell(ws5, r, 1, label, font=normal_font)
    style_cell(ws5, r, 2, val, font=input_font, fmt=EUR_FMT)

style_cell(ws5, 28, 1, "Total fixe/mois", font=bold_font)
style_cell(ws5, 28, 2, "=SUM(B24:B27)", font=bold_font, fmt=EUR_FMT)

auto_width(ws5)

# ============================================================================
# SHEET 6: Simulateur Offres
# ============================================================================
ws6 = wb.create_sheet("Simulateur Offres")
ws6.sheet_properties.tabColor = "000000"
write_title(ws6, 4)

# Section A - Configuration
write_section(ws6, 3, "A. Configuration", 4)
config_rows = [
    (4, "Nombre de clients", 50, input_font, INT_FMT),
    (5, "Abonnement choisi", "Pro", input_font, None),
    (6, "Prix abonnement/mois (EUR)", 79, input_font, EUR_FMT),
    (7, "Credits IA inclus dans abo", 600, input_font, INT_FMT),
    (8, "Executions workflow incluses", 5000, input_font, INT_FMT),
    (9, "", None, None, None),
    (10, "% clients achetant credits supplementaires", 0.35, input_font, PCT_FMT),
    (11, "Pack moyen credits supplementaires (EUR)", 49, input_font, EUR_FMT),
    (12, "Credits supplementaires moyens", 1000, input_font, INT_FMT),
    (13, "", None, None, None),
    (14, "Sessions IA par client/mois", "='Cout reel IA'!B37*'Cout reel IA'!B38", normal_font, INT_FMT),
    (15, "Credits IA consommes/client/mois (estime)", 500, input_font, INT_FMT),
]
for r, label, val, fnt, fmt in config_rows:
    if label:
        style_cell(ws6, r, 1, label, font=normal_font)
    if val is not None:
        style_cell(ws6, r, 2, val, font=fnt, fmt=fmt)

# Section B - Revenus
write_section(ws6, 18, "B. Revenus mensuels", 4)
rev_rows = [
    (19, "Revenus abonnements", "=B4*B6", EUR_FMT),
    (20, "Revenus credits supplementaires", "=B4*B10*B11", EUR_FMT),
    (21, "Total revenus mensuels", "=B19+B20", EUR_FMT),
    (22, "Revenu par client/mois", "=B21/B4", EUR_FMT),
]
for r, label, formula, fmt in rev_rows:
    fnt = bold_font if r == 21 else normal_font
    style_cell(ws6, r, 1, label, font=fnt)
    style_cell(ws6, r, 2, formula, font=fnt, fmt=fmt)

# Section C - Couts
write_section(ws6, 31, "C. Couts mensuels", 4)
cost_rows = [
    (32, "Cout IA - credits inclus", "=(B4*B7)*'Credits Kinn'!B6", normal_font, EUR_FMT),
    (33, "Cout IA - credits supplementaires", "=(B4*B10*B12)*'Credits Kinn'!B6", normal_font, EUR_FMT),
    (34, "Total cout IA", "=B32+B33", normal_font, EUR_FMT),
    (35, "", None, None, None),
    (36, "Cout AWS infrastructure", 555, input_font, EUR_FMT),
    (37, "Cout fixe plateforme", "='AWS Infrastructure'!B28", normal_font, EUR_FMT),
    (38, "Total couts mensuels", "=B34+B36+B37", bold_font, EUR_FMT),
]
for r, label, val, fnt, fmt in cost_rows:
    if label:
        style_cell(ws6, r, 1, label, font=fnt if fnt else normal_font)
    if val is not None:
        style_cell(ws6, r, 2, val, font=fnt if fnt else normal_font, fmt=fmt)

# Section D - Marge
write_section(ws6, 48, "D. Marge", 4)
margin_rows = [
    (49, "MARGE BRUTE MENSUELLE", "=B21-B38", bold_font, EUR_FMT),
    (50, "MARGE BRUTE %", "=B49/B21", bold_font, PCT_FMT),
    (51, "Marge par client/mois", "=B49/B4", normal_font, EUR_FMT),
    (52, "", None, None, None),
    (53, "MARGE BRUTE ANNUELLE", "=B49*12", bold_font, EUR_FMT),
    (54, "", None, None, None),
    (55, "Marge sur abonnements seuls", "=B19-(B36+B37)", normal_font, EUR_FMT),
    (56, "Marge sur credits IA", "=B20-B34", normal_font, EUR_FMT),
    (57, "% revenu venant des abonnements", "=B19/B21", normal_font, PCT_FMT),
    (58, "% revenu venant des credits", "=B20/B21", normal_font, PCT_FMT),
]
for r, label, val, fnt, fmt in margin_rows:
    if label:
        style_cell(ws6, r, 1, label, font=fnt if fnt else normal_font)
    if val is not None:
        style_cell(ws6, r, 2, val, font=fnt if fnt else normal_font, fmt=fmt)

# Section E - Comparaison
write_section(ws6, 61, "E. Comparaison avec concurrents", 5)
write_header_row(ws6, 62, ["Metrique", "Kinn", "n8n equivalent", "Make.com equivalent"])
# Row 63: Prix/mois for similar usage
style_cell(ws6, 63, 1, "Prix/mois (EUR) usage similaire", font=normal_font)
style_cell(ws6, 63, 2, "=B6", font=normal_font, fmt=EUR_FMT)
style_cell(ws6, 63, 3, 60, font=input_font, fmt=EUR_FMT)  # n8n Pro
style_cell(ws6, 63, 4, 18.82, font=input_font, fmt=EUR_FMT)  # Make Pro
# Row 64: Cost per execution
style_cell(ws6, 64, 1, "Cout par execution", font=normal_font)
style_cell(ws6, 64, 2, "='Benchmark Concurrents'!B39", font=normal_font, fmt=EUR_FMT4)
style_cell(ws6, 64, 3, "='Benchmark Concurrents'!D17", font=normal_font, fmt=EUR_FMT4)  # n8n Starter exec price
style_cell(ws6, 64, 4, "='Benchmark Concurrents'!D24", font=normal_font, fmt=EUR_FMT4)  # Make Core credit price
# Row 65: Avantage Kinn
style_cell(ws6, 65, 1, "Avantage Kinn (%)", font=normal_font)
style_cell(ws6, 65, 2, "-", font=normal_font)
style_cell(ws6, 65, 3, "=1-(B64/C64)", font=normal_font, fmt=PCT_FMT)
style_cell(ws6, 65, 4, "=1-(B64/D64)", font=normal_font, fmt=PCT_FMT)

auto_width(ws6)

# ============================================================================
# SHEET 7: Projection 12 mois
# ============================================================================
ws7 = wb.create_sheet("Projection 12 mois")
ws7.sheet_properties.tabColor = "000000"
write_title(ws7, 17)

# Inputs row 3
input_labels = [
    (1, "Clients mois 1"),
    (2, ""),  # value
    (3, "Croissance mensuelle"),
    (4, ""),
    (5, "Churn mensuel"),
    (6, ""),
    (7, "% clients Pro"),
    (8, ""),
    (9, "% clients Business"),
    (10, ""),
    (11, "% clients Enterprise"),
    (12, ""),
    (13, "% clients Starter"),
    (14, ""),
]
# Actually, let's place them nicely in row 3-4
style_cell(ws7, 3, 1, "Clients mois 1", font=normal_font)
style_cell(ws7, 3, 2, 20, font=input_font, fmt=INT_FMT)
style_cell(ws7, 3, 4, "Croissance mensuelle", font=normal_font)
style_cell(ws7, 3, 5, 0.15, font=input_font, fmt=PCT_FMT)
style_cell(ws7, 3, 7, "Churn mensuel", font=normal_font)
style_cell(ws7, 3, 8, 0.03, font=input_font, fmt=PCT_FMT)
style_cell(ws7, 4, 1, "% Starter", font=normal_font)
style_cell(ws7, 4, 2, 0.20, font=input_font, fmt=PCT_FMT)
style_cell(ws7, 4, 4, "% Pro", font=normal_font)
style_cell(ws7, 4, 5, 0.45, font=input_font, fmt=PCT_FMT)
style_cell(ws7, 4, 7, "% Business", font=normal_font)
style_cell(ws7, 4, 8, 0.30, font=input_font, fmt=PCT_FMT)
style_cell(ws7, 4, 10, "% Enterprise", font=normal_font)
style_cell(ws7, 4, 11, 0.05, font=input_font, fmt=PCT_FMT)

# Table headers row 6
proj_headers = ["Mois", "Clients", "Nvx clients", "Churn", "Starter", "Pro", "Business",
                "Enterprise", "Rev Abo (EUR)", "Rev Credits (EUR)", "Rev Total (EUR)",
                "Cout IA (EUR)", "Cout AWS (EUR)", "Cout Fixe (EUR)", "Total Couts (EUR)",
                "Marge (EUR)", "Marge %"]
write_header_row(ws7, 6, proj_headers)

# Subscription prices for reference (using Credits Kinn sheet)
# Starter=29, Pro=79, Business=199, Enterprise=499
# Credits included: Starter=200, Pro=600, Business=2000, Enterprise=6000
# % buying extra credits: 35%, avg pack: 49 EUR, avg extra credits: 1000

for m in range(1, 13):
    r = 6 + m  # rows 7-18
    fill = alt_fill if r % 2 == 0 else white_fill

    # Col A: Mois
    style_cell(ws7, r, 1, m, font=normal_font, fill=fill, fmt=INT_FMT)

    # Col B: Clients
    if m == 1:
        style_cell(ws7, r, 2, "=$B$3", font=normal_font, fill=fill, fmt=INT_FMT)
    else:
        style_cell(ws7, r, 2, f"=ROUND(B{r-1}*(1+$E$3)*(1-$H$3),0)", font=normal_font, fill=fill, fmt=INT_FMT)

    # Col C: New clients
    if m == 1:
        style_cell(ws7, r, 3, "=B7", font=normal_font, fill=fill, fmt=INT_FMT)
    else:
        style_cell(ws7, r, 3, f"=B{r}-B{r-1}+D{r}", font=normal_font, fill=fill, fmt=INT_FMT)

    # Col D: Churn
    if m == 1:
        style_cell(ws7, r, 4, 0, font=normal_font, fill=fill, fmt=INT_FMT)
    else:
        style_cell(ws7, r, 4, f"=ROUND(B{r-1}*$H$3,0)", font=normal_font, fill=fill, fmt=INT_FMT)

    # Col E-H: Distribution by plan
    style_cell(ws7, r, 5, f"=ROUND(B{r}*$B$4,0)", font=normal_font, fill=fill, fmt=INT_FMT)  # Starter
    style_cell(ws7, r, 6, f"=ROUND(B{r}*$E$4,0)", font=normal_font, fill=fill, fmt=INT_FMT)  # Pro
    style_cell(ws7, r, 7, f"=ROUND(B{r}*$H$4,0)", font=normal_font, fill=fill, fmt=INT_FMT)  # Business
    style_cell(ws7, r, 8, f"=ROUND(B{r}*$K$4,0)", font=normal_font, fill=fill, fmt=INT_FMT)  # Enterprise

    # Col I: Rev Abo = Starter*29 + Pro*79 + Business*199 + Enterprise*499
    style_cell(ws7, r, 9, f"=E{r}*29+F{r}*79+G{r}*199+H{r}*499", font=normal_font, fill=fill, fmt=EUR_FMT)

    # Col J: Rev Credits = 35% of clients buy avg 49 EUR pack
    style_cell(ws7, r, 10, f"=B{r}*0.35*49", font=normal_font, fill=fill, fmt=EUR_FMT)

    # Col K: Rev Total
    style_cell(ws7, r, 11, f"=I{r}+J{r}", font=normal_font, fill=fill, fmt=EUR_FMT)

    # Col L: Cout IA = all included credits + extra credits at real cost
    # Included: Starter*200 + Pro*600 + Business*2000 + Enterprise*6000
    # Extra: 35% * clients * 1000 credits
    style_cell(ws7, r, 12,
               f"=(E{r}*200+F{r}*600+G{r}*2000+H{r}*6000+B{r}*0.35*1000)*'Credits Kinn'!$B$6",
               font=normal_font, fill=fill, fmt=EUR_FMT)

    # Col M: Cout AWS - interpolate from AWS sheet based on client count
    # Simplified: use VLOOKUP-like approach or just a formula
    # We'll use a simple interpolation: cost ~= 280 + (clients-10) * (6800-280)/(500-10)
    style_cell(ws7, r, 13, f"=280+(B{r}-10)*(6800-280)/(500-10)", font=normal_font, fill=fill, fmt=EUR_FMT)

    # Col N: Cout Fixe
    style_cell(ws7, r, 14, "='AWS Infrastructure'!B28", font=normal_font, fill=fill, fmt=EUR_FMT)

    # Col O: Total Couts
    style_cell(ws7, r, 15, f"=L{r}+M{r}+N{r}", font=normal_font, fill=fill, fmt=EUR_FMT)

    # Col P: Marge
    style_cell(ws7, r, 16, f"=K{r}-O{r}", font=normal_font, fill=fill, fmt=EUR_FMT)

    # Col Q: Marge %
    style_cell(ws7, r, 17, f"=IF(K{r}>0,P{r}/K{r},0)", font=normal_font, fill=fill, fmt=PCT_FMT)

# Row 19: TOTAL
r_total = 19
write_header_row(ws7, r_total, ["TOTAL"] + [""] * 16)
for col_idx in range(2, 18):
    letter = get_column_letter(col_idx)
    if col_idx == 17:  # Marge %: average not sum
        style_cell(ws7, r_total, col_idx, f"=IF(K{r_total}>0,P{r_total}/K{r_total},0)",
                   font=bold_font, fmt=PCT_FMT)
    elif col_idx == 1:
        pass
    else:
        style_cell(ws7, r_total, col_idx, f"=SUM({letter}7:{letter}18)",
                   font=bold_font, fmt=EUR_FMT if col_idx >= 9 else INT_FMT)

# Row 20: MOYENNE
r_avg = 20
style_cell(ws7, r_avg, 1, "MOYENNE", font=bold_font)
for col_idx in range(2, 18):
    letter = get_column_letter(col_idx)
    if col_idx == 17:
        style_cell(ws7, r_avg, col_idx, f"=AVERAGE(Q7:Q18)", font=bold_font, fmt=PCT_FMT)
    else:
        style_cell(ws7, r_avg, col_idx, f"=AVERAGE({letter}7:{letter}18)",
                   font=bold_font, fmt=EUR_FMT if col_idx >= 9 else INT_FMT)

auto_width(ws7, min_w=14, max_w=22)

# ── Save ────────────────────────────────────────────────────────────────────
wb.save(OUTPUT)
print(f"Saved: {OUTPUT}")

# Count formulas
formula_count = 0
for sheet in wb.sheetnames:
    ws = wb[sheet]
    for row in ws.iter_rows():
        for cell in row:
            if cell.value and isinstance(cell.value, str) and cell.value.startswith("="):
                formula_count += 1
print(f"Total formulas: {formula_count}")
print("Done.")
