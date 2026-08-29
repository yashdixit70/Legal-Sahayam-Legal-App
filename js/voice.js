// ============================================================================
// VOICE (js/voice.js)
// ----------------------------------------------------------------------------
// Voice input + voice output using browser-native Web Speech APIs only.
//
// Deliberate NOT-AI choice: neither component uses a generative voice model.
//  - Speech-to-text  uses the browser's SpeechRecognition engine (device-local
//    in most cases, works offline when the engine supports it).
//  - Text-to-speech  uses the OS speechSynthesis voices.
// This keeps voice working with NO API key and NO data leaving the machine —
// which matters here: people in crisis often can't type, and we do not want to
// add another cloud dependency on top of the LLM call. See README.
// ============================================================================

const RECOGNITION_SUPPORTED = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
const SYNTH_SUPPORTED = 'speechSynthesis' in window;

function voicePref() {
    try { return localStorage.getItem('legalSahayam.voice') !== 'off'; } catch (e) { return true; }
}
function setVoicePref(on) {
    try { localStorage.setItem('legalSahayam.voice', on ? 'on' : 'off'); } catch (e) { /* ignore */ }
}

// ---- OUTPUT: speak the bot's answer -------------------------------------
function stripForSpeech(text) {
    return String(text)
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/[#>*_`~]/g, '')
        .replace(/[•·]/g, '. ')
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function pickVoice() {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const preferred =
        voices.find(v => v.lang && v.lang.toLowerCase() === 'en-in') ||
        voices.find(v => v.lang && v.lang.startsWith('en') && /india/i.test(v.name)) ||
        voices.find(v => v.lang && v.lang.startsWith('en')) ||
        voices[0];
    return preferred || null;
}

export function speak(text, { onend } = {}) {
    if (!SYNTH_SUPPORTED || !voicePref()) { if (onend) onend(); return stopSpeaking; }
    window.speechSynthesis.cancel();
    const clean = stripForSpeech(text);
    if (!clean) { if (onend) onend(); return stopSpeaking; }
    const utter = new SpeechSynthesisUtterance(clean);
    const voice = pickVoice();
    if (voice) utter.voice = voice;
    utter.lang = (voice && voice.lang) || 'en-IN';
    utter.rate = 1.04;
    utter.pitch = 1;
    if (onend) utter.onend = onend;
    window.speechSynthesis.speak(utter);
    return stopSpeaking;
}

export function stopSpeaking() {
    if (SYNTH_SUPPORTED) window.speechSynthesis.cancel();
}

export function isVoiceOn() {
    return SYNTH_SUPPORTED && voicePref();
}

export function setVoice(on) {
    setVoicePref(on);
    if (!on) stopSpeaking();
}

// ---- INPUT: transcribe the user's voice into the chat --------------------
// Returns { start, stop } or null if unsupported.
export function initMicrophone({ lang = 'en-IN', onResult, onError }) {
    if (!RECOGNITION_SUPPORTED) return null;

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let rec = null;
    let running = false;

    function start() {
        if (running) return;
        try {
            rec = new Recognition();
            rec.lang = lang;
            rec.continuous = false;
            rec.interimResults = true;
            rec.maxAlternatives = 1;

            rec.onresult = (e) => {
                let interim = '';
                let final = '';
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    const t = e.results[i][0].transcript;
                    if (e.results[i].isFinal) final += t; else interim += t;
                }
                onResult && onResult({ interim, final });
            };
            rec.onerror = (e) => {
                running = false;
                onError && onError(e.error || 'recognition-error');
            };
            rec.onend = () => { running = false; };

            running = true;
            rec.start();
        } catch (err) {
            onError && onError('start-failed');
        }
    }

    function stop() {
        if (rec && running) {
            try { rec.stop(); } catch (e) { /* already stopped */ }
        }
        running = false;
    }

    return { start, stop };
}