#!/usr/bin/env python3
"""Generate a branded portfolio / case-study PDF of the ADAS Architecture website."""
import os, tempfile
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = A4  # 595 x 842 pt

# ── Brand palette ──────────────────────────────────────────────
INK      = (0x23/255, 0x1f/255, 0x20/255)
INK_850  = (0x2b/255, 0x26/255, 0x27/255)
BONE_50  = (0xfb/255, 0xf6/255, 0xec/255)
BONE_100 = (0xf4/255, 0xea/255, 0xda/255)
BONE_200 = (0xe8/255, 0xdc/255, 0xc4/255)
LIME     = (0x9b/255, 0xcc/255, 0x53/255)
LIME_600 = (0x6c/255, 0x9a/255, 0x30/255)
LILAC    = (0xca/255, 0xb8/255, 0xe8/255)
MUTE     = (0x78/255, 0x77/255, 0x77/255)
WHITE    = (1, 1, 1)

# ── Fonts: try the studio's Havelock Titling, fall back gracefully ─
DISPLAY = "Times-Bold"      # serif stand-in for the studio's Cormorant/Havelock titling
DISPLAY_L = "Times-Roman"
try:
    pdfmetrics.registerFont(TTFont("Havelock", os.path.join(HERE, "HavelockTitling-Bold.otf")))
    pdfmetrics.registerFont(TTFont("Havelock-Light", os.path.join(HERE, "HavelockTitling-Regular.otf")))
    DISPLAY = "Havelock"
    DISPLAY_L = "Havelock-Light"
except Exception as e:
    print("Havelock font not embeddable, using Helvetica:", e)

BODY = "Helvetica"
BODY_B = "Helvetica-Bold"

# ── Image helper: normalise to RGB jpeg, cover-crop to a box ──────
_tmp = []
def prep(path, box_w=None, box_h=None):
    im = Image.open(os.path.join(HERE, path)).convert("RGB")
    if box_w and box_h:
        tw, th = box_w, box_h
        sr, ir = tw/th, im.width/im.height
        if ir > sr:   # too wide -> crop sides
            nw = int(im.height*sr); x = (im.width-nw)//2
            im = im.crop((x, 0, x+nw, im.height))
        else:         # too tall -> crop top/bottom
            nh = int(im.width/sr); y = (im.height-nh)//2
            im = im.crop((0, y, im.width, y+nh))
    f = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    im.save(f.name, "JPEG", quality=90)
    _tmp.append(f.name)
    return ImageReader(f.name)

c = canvas.Canvas(os.path.join(HERE, "ADAS-Website-Portfolio.pdf"), pagesize=A4)
c.setTitle("ADAS Architecture — Website Project")
c.setAuthor("Walaa Adas")
c.setSubject("Website design & build case study")

def rect(x, y, w, h, fill):
    c.setFillColorRGB(*fill); c.rect(x, y, w, h, fill=1, stroke=0)

def _tw(s, font, size, ls):
    return sum(pdfmetrics.stringWidth(ch, font, size) for ch in s) + ls*max(len(s)-1, 0)

def text(x, y, s, font, size, color, ls=0, align="l"):
    # always draw via a text object with an explicit char-space so spacing never leaks
    total = _tw(s, font, size, ls)
    if align == "c":   sx = x - total/2
    elif align == "r": sx = x - total
    else:              sx = x
    to = c.beginText(sx, y)
    to.setFont(font, size); to.setFillColorRGB(*color); to.setCharSpace(ls)
    to.textOut(s)
    c.drawText(to)

def wrap(x, y, s, font, size, color, max_w, leading):
    words = s.split(); line = ""; yy = y
    for w in words:
        t = (line + " " + w).strip()
        if pdfmetrics.stringWidth(t, font, size) <= max_w:
            line = t
        else:
            text(x, yy, line, font, size, color); yy -= leading; line = w
    if line:
        text(x, yy, line, font, size, color); yy -= leading
    return yy

def stamp(x, y, s, color=LIME_600, align="l"):
    text(x, y, s.upper(), BODY_B, 8, color, ls=2.2, align=align)

MX = 22*mm  # margin

# ════════════════════════════════════════════════════════════════
# PAGE 1 — COVER
# ════════════════════════════════════════════════════════════════
rect(0, 0, W, H, INK)
# subtle blueprint grid
c.setStrokeColorRGB(*LIME); c.setLineWidth(0.3)
c.saveState(); c.setStrokeAlpha(0.10)
g = 60
xx = 0
while xx < W:
    c.line(xx, 0, xx, H); xx += g
yy = 0
while yy < H:
    c.line(0, yy, W, yy); yy += g
c.restoreState()
# lime corner accents
rect(MX, H-150, 46, 3, LIME)
text(MX, H-140, "ADAS ARCHITECTURE STUDIO", BODY_B, 9, LIME, ls=3.5)
text(MX, H-185, "Website Design", DISPLAY, 46, WHITE)
text(MX, H-232, "& Build", DISPLAY, 46, LIME)
text(MX, H-300, "Spaces that inspire,", DISPLAY_L, 22, BONE_100)
text(MX, H-330, "lives that flourish.", DISPLAY_L, 22, BONE_100)
wrap(MX, H-375,
     "A cinematic, single-page brand experience for a premier architecture and "
     "interior design consultancy based in Jeddah, Saudi Arabia.",
     BODY, 11, (0.85,0.83,0.80), 150*mm, 16)
# hero image strip at the bottom
hb_h = 150
c.drawImage(prep("hero.jpg", int(W), hb_h), 0, 0, width=W, height=hb_h, mask=None)
rect(0, hb_h, W, 1, LIME)
text(MX, 26, "Prepared by  Walaa Adas  ·  Board Member, CMO", BODY, 9, WHITE)
text(W-MX, 26, "June 2026", BODY, 9, LIME, align="r")
c.showPage()

# ════════════════════════════════════════════════════════════════
# PAGE 2 — OVERVIEW / ABOUT
# ════════════════════════════════════════════════════════════════
rect(0, 0, W, H, BONE_50)
rect(0, H-70, W, 70, INK)
stamp(MX, H-42, "— Project Overview", LIME)
text(MX, H-30, "About the studio", DISPLAY, 16, WHITE)

y = H-110
stamp(MX, y, "The brief"); y -= 22
y = wrap(MX, y,
    "ADAS Architecture is a multidisciplinary consultancy specialising in architecture, "
    "interior design, supervision and design management. The website was designed to "
    "translate the studio's brand into a single, immersive scrolling experience — "
    "presenting the practice, its services, and a portfolio of eighty-plus projects "
    "across Saudi Arabia.", BODY, 11, INK_850, W-2*MX, 17)

y -= 18
stamp(MX, y, "Vision"); y -= 20
y = wrap(MX, y,
    "To become a leading architectural consultancy recognised for delivering innovative, "
    "human-centred and timeless design solutions that positively shape communities and "
    "the future of the built environment in Saudi Arabia and beyond.",
    BODY, 11, INK_850, W-2*MX, 17)
y -= 16
stamp(MX, y, "Mission"); y -= 20
y = wrap(MX, y,
    "To deliver high-quality architectural, interior design and consultancy services "
    "through creativity, technology and professional excellence — transforming clients' "
    "visions into functional, sustainable and visually distinctive spaces.",
    BODY, 11, INK_850, W-2*MX, 17)

# Stats band
y -= 30
band_y = y-70
rect(MX, band_y, W-2*MX, 70, INK)
stats = [("80+","Projects"),("6+","Years of Practice"),("10","Team Members"),("1","Country, Many Cities")]
cw = (W-2*MX)/4
for i,(v,l) in enumerate(stats):
    cx = MX + cw*i + cw/2
    text(cx, band_y+42, v, DISPLAY, 26, LIME, align="c")
    text(cx, band_y+20, l.upper(), BODY, 7.5, (0.9,0.88,0.85), ls=1.2, align="c")

# Office image
img_h = band_y - 40 - 24
if img_h > 120:
    iw = W-2*MX
    c.drawImage(prep("Office.jpeg", int(iw), int(img_h)), MX, 24, width=iw, height=img_h)
    rect(MX, 24, 4, img_h, LIME)
c.showPage()

# ════════════════════════════════════════════════════════════════
# PAGE 3 — SERVICES
# ════════════════════════════════════════════════════════════════
rect(0, 0, W, H, INK)
c.saveState(); c.setStrokeColorRGB(*LIME); c.setStrokeAlpha(0.08); c.setLineWidth(0.3)
xx=0
while xx<W: c.line(xx,0,xx,H); xx+=60
yy=0
while yy<H: c.line(0,yy,W,yy); yy+=60
c.restoreState()
stamp(MX, H-55, "— Services", LIME)
text(MX, H-92, "What we", DISPLAY, 34, WHITE)
text(MX+ pdfmetrics.stringWidth("What we ", DISPLAY,34), H-92, "do.", DISPLAY, 34, LIME)

services = [
    ("01","Architecture Design","Buildings drawn with precision and purpose."),
    ("02","Interior Design","Interiors that balance beauty with purpose."),
    ("03","Project Supervision","Design intent, protected on site."),
    ("04","Design Management","A single conductor for many drawing boards."),
    ("05","Revit / BIM Training","Professional and student BIM packages."),
    ("06","1-on-1 Consulting","A studio session, just for you."),
]
gx, gy = MX, H-150
cw2 = (W-2*MX-14)/2
ch2 = 105
for i,(no,name,blurb) in enumerate(services):
    col = i%2; row = i//2
    x = gx + col*(cw2+14)
    yb = gy - row*(ch2+14) - ch2
    rect(x, yb, cw2, ch2, INK_850)
    rect(x, yb, 3, ch2, LIME)
    text(x+16, yb+ch2-28, no, DISPLAY, 22, LIME)
    text(x+16, yb+ch2-58, name, BODY_B, 13, WHITE)
    wrap(x+16, yb+ch2-80, blurb, BODY, 10, (0.78,0.77,0.76), cw2-30, 14)
text(MX, 40, "Six core disciplines, delivered end-to-end from concept to handover.", BODY, 10, LILAC)
c.showPage()

# ════════════════════════════════════════════════════════════════
# PAGE 4 — SELECTED PROJECTS
# ════════════════════════════════════════════════════════════════
rect(0, 0, W, H, BONE_50)
rect(0, H-70, W, 70, INK)
stamp(MX, H-42, "— Selected Projects", LIME)
text(MX, H-30, "Eighty-plus, across Saudi Arabia", DISPLAY, 16, WHITE)

projects = [
    ("Private Palace","Residential","Jeddah · 2024"),
    ("Lulu's Recipe — Obhur","Commercial","Obhur, Jeddah · 2023"),
    ("Lulu's Recipe — Naeem","Commercial","Naeem, Jeddah · 2024"),
    ("Sub & Ship","F&B Interior","Jeddah · 2024"),
    ("Al Ula Resort","Hospitality","Al Ula · 2024"),
    ("Private House","Residential","Jeddah · 2023"),
    ("Private Villa","Residential","Jeddah · 2023"),
    ("Gamekom Event","Experiential","Jeddah · 2024"),
    ("Magadeer Restaurant","F&B Interior","Madina · 2023"),
    ("SNB Dammam HQ","Corporate","Dammam · 2024"),
    ("Knowledge City Park","Masterplan","Riyadh · 2024"),
    ("Retail Park","Mixed-use","Jeddah · 2024"),
    ("Makkiyon Sales Office","Workplace","Jeddah · 2024"),
    ("Private Palace 2","Residential","Jeddah · 2023"),
    ("Delta Coffee","Café Interior","Jeddah · 2023"),
    ("Private House 2","Residential","Jeddah · 2022"),
]
y = H-100
rowh = 40
for i,(name,cat,loc) in enumerate(projects):
    yb = y - i*rowh
    if i%2==0: rect(MX, yb-rowh+8, W-2*MX, rowh-6, BONE_100)
    text(MX+12, yb-14, f"{i+1:02d}", DISPLAY, 13, LIME_600)
    text(MX+44, yb-14, name, BODY_B, 12, INK)
    text(MX+44, yb-27, cat.upper(), BODY, 7.5, MUTE, ls=1.5)
    text(W-MX-12, yb-18, loc, BODY, 9.5, INK_850, align="r")
c.showPage()

# ════════════════════════════════════════════════════════════════
# PAGE 5 — TEAM + CONTACT
# ════════════════════════════════════════════════════════════════
rect(0, 0, W, H, INK)
stamp(MX, H-55, "— Leadership", LIME)
text(MX, H-90, "The people behind ADAS", DISPLAY, 26, WHITE)

leaders = [
    ("Dr. Abdulmohsin Adas","Vice Chairman · CEO","Dr.Abdulmohsin-Adas.jpeg"),
    ("Abdulkareem Adas","Chairman · CPO","Abdulkareem-Adas.jpeg"),
]
pw = (W-2*MX-16)/2
ph = 230
for i,(name,role,img) in enumerate(leaders):
    x = MX + i*(pw+16)
    yb = H-110-ph
    c.drawImage(prep(img, int(pw), int(ph-46)), x, yb+46, width=pw, height=ph-46)
    rect(x, yb, pw, 46, INK_850)
    rect(x, yb, 3, 46, LIME)
    text(x+12, yb+27, name, BODY_B, 12, WHITE)
    text(x+12, yb+12, role.upper(), BODY, 7.5, LIME, ls=1)

# other team note
ty = H-110-ph-30
wrap(MX, ty, "Supported by a studio of architects, interior designers, draftsmen and "
     "structural & electrical engineering leads — including Walaa Adas (Board Member, CMO).",
     BODY, 10, (0.8,0.79,0.78), W-2*MX, 15)

# Contact band
cb_h = 150
rect(0, 0, W, cb_h, INK_850)
rect(0, cb_h, W, 1, LIME)
stamp(MX, cb_h-26, "— Get in touch", LIME)
text(MX, cb_h-58, "office@adas.com.sa", DISPLAY, 22, WHITE)
text(MX, cb_h-82, "+966 55 859 3937", BODY, 13, BONE_100)
text(MX, cb_h-104, "Jeddah, Saudi Arabia", BODY, 11, MUTE)
text(W-MX, cb_h-58, "Instagram  @adas.architecture", BODY, 10, LILAC, align="r")
text(W-MX, cb_h-78, "X  @adas_ksa", BODY, 10, LILAC, align="r")
text(W-MX, cb_h-98, "WhatsApp  +966 55 859 3937", BODY, 10, LILAC, align="r")
text(W-MX, 22, "ADAS Architecture Studio  ·  Website project", BODY, 8, MUTE, align="r")
c.showPage()

c.save()
for t in _tmp:
    try: os.unlink(t)
    except OSError: pass
print("Wrote ADAS-Website-Portfolio.pdf")
