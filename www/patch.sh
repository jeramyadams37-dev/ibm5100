#!/data/data/com.termux/files/usr/bin/bash
# IBM 5100 — XLATE patch: read & translate old IBM code (APL, BASIC, assembler, FORTRAN)
cd ~/ibm5100 2>/dev/null || { echo "~/ibm5100 not found - run the installer first"; exit 1; }
command -v python3 >/dev/null || pkg install -y python
mkdir -p .bak && cp www/index.html .bak/index.html.$(date +%s)
grep -q '^\.bak' .gitignore 2>/dev/null || echo '.bak' >> .gitignore
cat > www/xlate.js <<'XEOF'
XEOF
cat > .bak/patch.py <<'PYEOF'
PYEOF
python3 .bak/patch.py www/index.html || exit 1
echo
echo "=== CHECKLIST (nothing from before should be missing) ==="
chk(){ if grep -q -- "$2" www/index.html; then echo "  [x] $1"; else echo "  [ ] $1   <-- MISSING"; fi; }
chk "BASIC interpreter"            'function BasicEngine'
chk "APL interpreter"              'function AplEngine'
chk "16x64 CRT screen"             'COLS=64'
chk "BASIC / APL switch"           'id="bB"'
chk "EXEC key"                     'data-a="exec"'
chk "ATTN key"                     'data-a="attn"'
chk "RECALL key"                   'data-a="up"'
chk "Key palettes (BASIC + APL glyphs)" 'const PAL='
chk "DEMO / HELP / SAVE / LOAD / CAT" "i5100:"
chk "Startup storage test"         'STORAGE TEST'
chk "Power + BUSY lamps, tape slot" 'class="tape"'
chk "NEXT I,J fix (new)"           'flatMap(x=>/^NEXT'
chk "XLATE button (new)"           'data-a="xl"'
chk "XLATE screen (new)"           'id="xl"'
[ -f www/xlate.js ] && echo "  [x] xlate.js translator (new)" || echo "  [ ] xlate.js   <-- MISSING"
[ -f .github/workflows/build.yml ] && echo "  [x] APK build workflow" || echo "  [ ] build workflow   <-- MISSING"
echo
git add -A && git -c user.name=Jeramy -c user.email=jeramyadams37@users.noreply.github.com commit -qm "Add XLATE: read and translate old IBM code" && echo "committed"
git push 2>&1 | tail -2 && echo "PUSHED. New APK in ~5 min under Releases (build-N)."
echo "Preview first: cd ~/ibm5100/www && python -m http.server 8100"
