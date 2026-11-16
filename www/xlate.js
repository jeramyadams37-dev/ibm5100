/* ==========================================================================
   IBM 5100 XLATE Translator & Interpreter Bridge
   Supports: APL, BASIC, S/370 Assembler, FORTRAN
   Features: Local heuristics, File ingestion, Image OCR/Preview, Gemini API,
             and direct injection into the 5100 emulator engines.
   ========================================================================== */

(function() {
    'use strict';

    // DOM Element References
    const modal  = document.getElementById('xl');
    const closeBtn = document.getElementById('xc');
    const inputArea = document.getElementById('xi');
    const fileInput = document.getElementById('xf');
    const fileLabel = document.getElementById('xd');
    const explainBtn = document.getElementById('xe');
    const toJsBtn    = document.getElementById('xj');
    const toPyBtn    = document.getElementById('xp');
    const runBtn     = document.getElementById('xrn');
    const aiToggle   = document.getElementById('xa');
    const apiKeyInput = document.getElementById('xk');
    const saveKeyBtn = document.getElementById('xs');
    const outputPre  = document.getElementById('xo');
    const copyBtn    = document.getElementById('xcp');
    const clearBtn   = document.getElementById('xx');

    // Hook XLATE button in main toolbar
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-a="xl"]');
        if (btn) {
            modal.style.display = 'block';
            loadSavedKey();
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    // Load saved API key from localStorage
    function loadSavedKey() {
        const saved = localStorage.getItem('i5100_gemini_key');
        if (saved && apiKeyInput) {
            apiKeyInput.value = saved;
            if (aiToggle) aiToggle.checked = true;
        }
    }

    if (saveKeyBtn) {
        saveKeyBtn.addEventListener('click', () => {
            const key = apiKeyInput.value.trim();
            if (key) {
                localStorage.setItem('i5100_gemini_key', key);
                outputPre.textContent = 'API Key saved successfully to local storage.';
            } else {
                localStorage.removeItem('i5100_gemini_key');
                outputPre.textContent = 'API Key removed from local storage.';
            }
        });
    }

    // File Ingestion (Text & Images)
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            fileLabel.textContent = file.name;

            const reader = new FileReader();
            if (file.type.startsWith('image/')) {
                reader.onload = function(evt) {
                    const base64Data = evt.target.result;
                    inputArea.value = `[IMAGE LOADED: ${file.name}]\n`;
                    inputArea.dataset.pendingImage = base64Data;
                    outputPre.textContent = `Loaded image ${file.name} (${Math.round(file.size/1024)} KB). Ready for Gemini Vision OCR & Translation.`;
                };
                reader.readAsDataURL(file);
            } else {
                reader.onload = function(evt) {
                    inputArea.value = evt.target.result;
                    delete inputArea.dataset.pendingImage;
                    outputPre.textContent = `Loaded text file ${file.name} (${file.size} bytes).`;
                };
                reader.readAsText(file);
            }
        });
    }

    // Clear and Copy controls
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            inputArea.value = '';
            delete inputArea.dataset.pendingImage;
            fileInput.value = '';
            fileLabel.textContent = '';
            outputPre.textContent = '';
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(outputPre.textContent).then(() => {
                const oldText = copyBtn.textContent;
                copyBtn.textContent = 'COPIED!';
                setTimeout(() => copyBtn.textContent = oldText, 1500);
            });
        });
    }

    // Language Heuristics Detector
    function detectLanguage(code) {
        if (/[\u2336\u2337\u2338\u2339\u233A\u233B\u2348\u2353\u235f\u2370\u2374\u2375\u233f\u237d\u2358\u2349\u234a\u233c\u2368\u2378\u233d\u233e\u2373\u2335\u2332\u2352\u233e\u233d\u234c\u234e\u2350\u2364\u2365\u2351\u234b\u235b\u235c\u235d\u235e\u2360\u2362\u2363\u2367\u2369\u236b\u236c\u236f\u2371\u2372\u2379\u237a\u237b\u237c]/.test(code) || /\b(rho|iota|ravel|+/g|reduc)/i.test(code)) {
            return 'APL';
        }
        if (/^\s*\d+\s+(REM|PRINT|GOTO|GOSUB|FOR|NEXT|IF|INPUT|DIM|LET|STOP|END)\b/im.test(code) || /\bPRINT\s+/i.test(code)) {
            return 'BASIC';
        }
        if (/^\s*([A-Z0-9$_]+\s+)?(CSECT|DSECT|USING|BALR|BCR|L|ST|AR|SR|LA|BCTR|WTO)\b/im.test(code)) {
            return 'Assembler S/370';
        }
        if (/^\s*([A-Z0-9$_]+\s+)?(INTEGER|REAL|DIMENSION|DO|WRITE|READ|STOP|END|COMMON)\b/im.test(code) || /\bFORMAT\s*\(/i.test(code)) {
            return 'FORTRAN';
        }
        return 'UNKNOWN';
    }

    // Local Fallback Transpiler / Explainer
    function localHeuristicProcess(code, mode) {
        const lang = detectLanguage(code);
        if (mode === 'explain') {
            return `=== LOCAL HEURISTIC ANALYSIS ===\nDetected Language: ${lang}\n\nThis snippet appears to be written in ${lang} for the IBM 5100 portable computer system. ` +
                   (lang === 'APL' ? 'It utilizes APL array primitives and workspace variables characteristic of the 5100 APL interactive environment.' :
                    lang === 'BASIC' ? 'It utilizes standard line-numbered statements designed for the 5100 BASIC interpreter.' :
                    lang === 'Assembler S/370' ? 'It contains IBM System/370 assembly instructions executed via the 5100 dual emulation processor.' :
                    'It consists of scientific/mathematical procedural statements typical of IBM 5100 FORTRAN IV.');
        }
        if (mode === 'js') {
            if (lang === 'BASIC') {
                return `// Transpiled from IBM 5100 BASIC to JavaScript\n` +
                       code.split('\n').map(line => {
                           const m = line.match(/^\s*(\d+)\s+(.+)$/);
                           if (!m) return `// ${line}`;
                           let stmt = m[2].trim();
                           stmt = stmt.replace(/^PRINT\s+(.+)$/i, 'console.log($1);');
                           stmt = stmt.replace(/^LET\s+/i, '');
                           return `/* line ${m[1]} */ ${stmt}`;
                       .join('\n');
            }
            return `// Transpilation for ${lang} not fully mapped in local mode. Enable Gemini AI for full parsing.`;
        }
        if (mode === 'python') {
            if (lang === 'BASIC') {
                return `# Transpiled from IBM 5100 BASIC to Python\n` +
                       code.split('\n').map(line => {
                           const m = line.match(/^\s*(\d+)\s+(.+)$/);
                           if (!m) return `# ${line}`;
                           let stmt = m[2].trim();
                           stmt = stmt.replace(/^PRINT\s+(.+)$/i, 'print($1)');
                           stmt = stmt.replace(/^LET\s+/i, '');
                           return `# line ${m[1]}\n${stmt}`;
                       }).join('\n');
            }
            return `# Transpilation for ${lang} not fully mapped in local mode. Enable Gemini AI for full parsing.`;
        }
        return code;
    }

    // Gemini API Request Dispatcher
    async function callGemini(code, promptTask, base64Image) {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            throw new Error('Gemini API key is required when "Use AI (Gemini)" is checked. Enter your key above.');
        }

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        let contents = [];
        let parts = [];

        if (base64Image) {
            const matches = base64Image.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
                parts.push({
                    inlineData: {
                        mimeType: matches[1],
                        data: matches[2]
                    }
                });
            }
        }

        const systemPrompt = "You are an expert IBM 5100 computer historian and principal software engineer specializing in vintage APL, Microsoft/IBM BASIC, System/370 Assembler, and FORTRAN IV.";
        let userPrompt = `Task: ${promptTask}\n\n`;
        if (code && !code.startsWith('[IMAGE LOADED')) {
            userPrompt += `Source Code:\n${code}`;
        } else {
            userPrompt += `Extract all code from the attached image/listing and perform the requested task.`;
        }

        contents = [
            { role: "user", parts: [...parts, { text: userPrompt }] }
        ];

        const payload = {
            contents: contents,
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            generationConfig: {
                temperature: 0.2
            }
        };

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(`Gemini API Error (${res.status}): ${errJson.error?.message || res.statusText}`);
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Received empty response from Gemini API.');
        return text;
    }

    // Unified Action Handler
    async function handleAction(mode) {
        const code = inputArea.value.trim();
        const useAi = aiToggle && aiToggle.checked;
        const pendingImg = inputArea.dataset.pendingImage;

        if (!code && !pendingImg) {
            outputPre.textContent = 'Please enter code, load a file, or upload an image/listing first.';
            return;
        }

        outputPre.textContent = 'Processing request...';

        let promptTask = '';
        if (mode === 'explain') promptTask = 'Explain this vintage IBM 5100 code in detail, breaking down its syntax, data structures, and purpose.';
        else if (mode === 'js') promptTask = 'Transpile this IBM 5100 code into clean, modern JavaScript.';
        else if (mode === 'python') promptTask = 'Transpile this IBM 5100 code into clean, modern Python 3.';
        else if (mode === 'run') promptTask = 'Convert this code into clean, executable IBM 5100 BASIC or APL source statements suitable for running on the 5100 emulator.';

        try {
            if (useAi) {
                const result = await callGemini(code, promptTask, pendingImg);
                outputPre.textContent = result;
            } else {
                if (pendingImg) {
                    throw new Error('Image OCR requires "Use AI (Gemini)" enabled with a valid API key.');
                }
                const result = localHeuristicProcess(code, mode);
                outputPre.textContent = result;
            }
        } catch (err) {
            outputPre.textContent = `ERROR: ${err.message}\n\nFalling back to local heuristic analysis...\n\n` + localHeuristicProcess(code, mode);
        }
    }

    // Event Listeners for Action Buttons
    if (explainBtn) explainBtn.addEventListener('click', () => handleAction('explain'));
    if (toJsBtn)    toJsBtn.addEventListener('click', () => handleAction('js'));
    if (toPyBtn)    toPyBtn.addEventListener('click', () => handleAction('python'));

    // Run in 5100: Transpile/Extract & Inject into Emulator Prompt / Editor
    if (runBtn) {
        runBtn.addEventListener('click', async () => {
            const useAi = aiToggle && aiToggle.checked;
            const code = inputArea.value.trim();
            const pendingImg = inputArea.dataset.pendingImage;

            if (!code && !pendingImg) {
                outputPre.textContent = 'No code or image provided to run.';
                return;
            }

            outputPre.textContent = 'Preparing code for IBM 5100 execution...';
            
            try {
                let executableCode = code;
                if (useAi) {
                    executableCode = await callGemini(code, 'Extract or convert this code strictly into valid IBM 5100 BASIC statements (with line numbers like 10, 20...) or APL workspace commands. Return ONLY the executable code without markdown code fences if possible, or clean plain text.', pendingImg);
                    // Strip markdown fences if present
                    executableCode = executableCode.replace(/^```[a-z]*\n?/gm, '').replace(/```$/gm, '').trim();
                }

                // Inject into 5100 keyboard input or prompt if available
                const kbInput = document.getElementById('kb');
                if (kbInput) {
                    kbInput.value = executableCode;
                    modal.style.display = 'none';
                    outputPre.textContent = 'Injected successfully into 5100 console input!';
                } else {
                    outputPre.textContent = 'Code prepared:\n\n' + executableCode;
                }
            } catch (err) {
                outputPre.textContent = `RUN ERROR: ${err.message}`;
            }
        });
    }

    console.log('IBM 5100 XLATE script loaded successfully.');
})();
