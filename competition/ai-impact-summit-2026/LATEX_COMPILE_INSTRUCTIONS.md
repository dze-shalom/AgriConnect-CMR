# How to Compile LaTeX Architecture Diagram to PDF

## Quick Instructions

### Method 1: Online LaTeX Compiler (EASIEST - No Installation)

**Overleaf (Recommended):**

1. Go to: https://www.overleaf.com/
2. Create free account (or login)
3. Click "New Project" → "Upload Project"
4. Upload `architecture-diagram.tex`
5. Click "Recompile" (or it auto-compiles)
6. Download PDF: Menu → Download → PDF

**Alternative Online Compilers:**
- https://latexbase.com/ (no signup required)
- https://www.latex4technics.com/
- https://latexeditor.lagrida.com/

**Time:** 2-5 minutes

---

### Method 2: Local Installation (If you have LaTeX installed)

**Requirements:**
- TeXLive (Linux) or MikTeX (Windows) or MacTeX (Mac)
- TikZ package (usually included)

**Compile:**
```bash
cd competition/ai-impact-summit-2026/

# Method A: pdflatex (standard)
pdflatex architecture-diagram.tex
pdflatex architecture-diagram.tex  # Run twice for proper layout

# Method B: latexmk (automated)
latexmk -pdf architecture-diagram.tex

# Result: architecture-diagram.pdf
```

**Time:** 30 seconds

---

### Method 3: Install LaTeX (If you don't have it)

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install texlive-full
# This is large (~4 GB), for smaller install:
sudo apt-get install texlive-latex-base texlive-latex-extra texlive-fonts-recommended
```

**Mac (with Homebrew):**
```bash
brew install --cask mactex
# Or smaller version:
brew install --cask basictex
```

**Windows:**
Download and install MikTeX: https://miktex.org/download

---

## Troubleshooting

### "Package tikz not found"
**Fix:** Install TikZ package
```bash
# Ubuntu/Debian
sudo apt-get install texlive-latex-extra

# MikTeX (Windows)
# Open MikTeX Console → Packages → Search "tikz" → Install
```

### "fontspec error" or "xelatex required"
**Fix:** The .tex file uses standard fonts, you can remove this line if needed:
```latex
% Comment out or remove this line:
% \usepackage{fontspec}
```

Then compile with regular `pdflatex`.

### Layout looks wrong
**Fix:** Compile twice (LaTeX needs two passes for positioning)
```bash
pdflatex architecture-diagram.tex
pdflatex architecture-diagram.tex
```

---

## Customization

### Change Colors
Edit these lines in the .tex file:
```latex
\definecolor{hardwaregreen}{RGB}{76,175,80}
\definecolor{gatewayorange}{RGB}{255,152,0}
\definecolor{cloudblue}{RGB}{33,150,243}
\definecolor{aipurple}{RGB}{156,39,176}
\definecolor{dashboardpink}{RGB}{233,30,99}
```

### Change Font Sizes
```latex
% Find and modify:
font=\Large\bfseries  % for titles
font=\small           % for details
font=\footnotesize    % for specifications
```

### Add Your Logo
```latex
% Add after \begin{tikzpicture}:
\node[above right] at (header.north west) {
    \includegraphics[width=2cm]{logo.png}
};
```

---

## Output Specifications

**The generated PDF will have:**
- **Size:** A4 landscape
- **Margins:** 1cm all sides
- **File size:** ~50-200 KB (very small)
- **Quality:** Vector graphics (scales perfectly)
- **Colors:** Full color (green, blue, purple, orange)

**Perfect for:**
- Application submission
- Printing
- Presentations
- Technical documentation

---

## Alternative: Use the HTML Version

If LaTeX is too complex, use the **HTML version** instead:
1. Open `architecture-diagram.html` in browser
2. Print to PDF (Ctrl+P / Cmd+P)
3. Same visual quality, easier process

**LaTeX advantages:**
- Cleaner, more professional typography
- Perfect alignment and spacing
- Easy to customize programmatically
- Academic/technical standard

**HTML advantages:**
- No installation required
- Instant preview
- Easier to customize visually

---

## Recommended Approach

**For quick submission:** Use HTML version (2 minutes)
**For maximum professionalism:** Use LaTeX + Overleaf (5 minutes, no installation)
**For repeated use:** Install LaTeX locally (one-time 30 min setup)

---

## Final Checklist

- [ ] Compiled PDF opens correctly
- [ ] All colors visible (green, blue, purple, orange, pink)
- [ ] Text is readable (minimum 8pt font)
- [ ] Layout fits on one page (landscape)
- [ ] File size <10 MB (LaTeX PDFs are typically <500 KB)
- [ ] File named: `AgriConnect_Architecture_Diagram.pdf`

---

**Good luck! The LaTeX version will give you a very professional-looking diagram.** 📐✨
