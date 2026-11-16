#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
# IBM 5100 — XLATE patch: read & translate old IBM code (APL, BASIC, assembler, FORTRAN)
cd ~/ibm5100 2>/dev/null || { echo "~/ibm5100 not found - run the installer first"; exit 1; }
command -v python3 >/dev/null || pkg install -y python

mkdir -p .bak && cp www/index.html .bak/index.html.$(date +%s)
grep -q '^\.bak' .gitignore 2>/dev/null || echo '.bak' >> .gitignore

# Ensure xlate.js is in place under www/
if [ ! -f www/xlate.js ]; then
    echo "Error: www/xlate.js missing. Please ensure xlate.js is inside www/"
    exit 1
fi

# Write Python patcher script
cat > .bak/patch.py << 'PYEOF'
import re, sys
p = sys.argv[1]
h = open(p).read()
if 'id="xl"' in h:
    print('already patched'); sys.exit(0)
def sub(pat, fn, s, label):
    s2, n = re.subn(pat, fn, s, count=1, flags=re.S)
    if n != 1: print('!! anchor not found:', label); sys.exit(1)
    return s2

h = sub(r'(<button class="k" data-a="kbd">[^<]*</button>)', lambda m: m.group(1) + '<button class="k big" data-a="xl">XLATE</button>', h, 'kbd button')
css = '''#xl{display:none;position:fixed;inset:0;z-index:20;overflow:auto;background:linear-gradient(#d6cfb8,#bcb49b);padding:max(10px,env(safe-area-inset-top)) 10px 18px;color:#222}
#xl,#xl *{-webkit-user-select:text;user-select:text}
#xl .xh{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font:700 16px system-ui;letter-spacing:1px}
#xi{width:100%;height:30vh;background:#021a06;color:#52ff80;border:0;border-radius:10px;padding:8px;font:12px 'Courier New',monospace;resize:vertical}
#xl .xr{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:8px 0;font-size:13px}
#xk{flex:1;min-width:120px;padding:9px;border-radius:6px;border:1px solid #888}
#xo{white-space:pre-wrap;word-break:break-word;background:#021a06;color:#52ff80;padding:8px;border-radius:10px;min-height:90px;max-height:42vh;overflow:auto;font:12px 'Courier New',monospace;margin:6px 0}
'''
h = sub(r'</style>', lambda m: css + '</style>', h, 'style end')
markup = '''<div id="xl">
 <div class="xh"><span>XLATE &mdash; OLD IBM CODE</span><button class="k red" id="xc">CLOSE</button></div>
 <textarea id="xi" placeholder="Paste old IBM code here: APL, BASIC, assembler (S/370, 1130), FORTRAN. Or load a file or a photo of a listing." spellcheck="false" autocapitalize="none" autocorrect="off"></textarea>
 <div class="xr"><input type="file" id="xf" accept="text/*,image/*,.apl,.bas,.f,.for,.asm,.txt"><b id="xd"></b></div>
 <div class="xr"><button class="k" id="xe">EXPLAIN</button><button class="k" id="xj">&rarr; JS</button><button class="k" id="xp">&rarr; PYTHON</button><button class="k big" id="xrn">RUN IN 5100</button></div>
 <div class="xr"><label><input type="checkbox" id="xa"> Use AI (Gemini)</label><input id="xk" type="password" placeholder="Gemini API key (stays on this phone)"><button class="k" id="xs">SAVE KEY</button></div>
 <pre id="xo"></pre>
 <div class="xr"><button class="k" id="xcp">COPY</button><button class="k" id="xx">CLEAR</button></div>
</div>
'''
h = sub(r'<input id="kb"', lambda m: markup + '<input id="kb"', h, 'kb input')
h = sub(r'</body>', lambda m: '<script src="xlate.js"></script>\n</body>', h, 'body end')
new = "return r.filter(x=>x).flatMap(x=>/^NEXT\\s*\\w+\\$?\\s*,/.test(x)?x.slice(4).split(',').map(v=>'NEXT '+v.trim()):[x])}"
if 'flatMap(x=>/^NEXT' not in h:
    h = sub(r'return r\.filter\(x=>x\)\}', lambda m: new, h, 'splitStmts')
open(p, 'w').write(h)
print('patched successfully')
PYEOF

python3 .bak/patch.py www/index.html || exit 1

echo
echo "=== CHECKLIST ==="
chk(){ if grep -q -- "$2" www/index.html; then echo "  [x] $1"; else echo "  [ ] $1   <-- MISSING"; fi; }
chk "XLATE button" 'data-a="xl"'
chk "XLATE screen" 'id="xl"'
[ -f www/xlate.js ] && echo "  [x] xlate.js translator" || echo "  [ ] xlate.js <-- MISSING"

git add -A
git -c user.name=Jeramy -c user.email=jeramyadams37@users.noreply.github.com commit -qm "Apply XLATE patch and verification checklist"
git push 2>&1 | tail -2
echo "SUCCESS. Preview: cd ~/ibm5100/www && python3 -m http.server 8100"
