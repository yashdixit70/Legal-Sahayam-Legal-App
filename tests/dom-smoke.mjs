// ============================================================================
// DOM SMOKE TEST — run with `npm test`
// ----------------------------------------------------------------------------
// Boots the real app.js with a minimal DOM stub (no browser) and asserts the
// page render + chatbot init paths execute without throwing and produce
// expected markup. This exists to catch runtime wiring errors (wrong ids,
// null element access, bad selectors) that the module-level smoke test can't.
// ============================================================================

import assert from 'node:assert/strict';

// ---- Minimal DOM stub ----------------------------------------------------
class FakeClassList {
    add() {} remove() {} toggle() {} contains() { return false; }
}
class FakeEl {
    constructor(tag) {
        this.tagName = tag;
        this.children = [];
        this.classList = new FakeClassList();
        this.dataset = {};
        this.style = {};
        this.scrollTop = 0;
        this.scrollHeight = 0;
        this.disabled = false;
        this.title = '';
        this.value = '';
        this.textContent = '';
        this.className = '';
        this._html = '';
    }
    addEventListener() {}
    appendChild(el) { this.children.push(el); return el; }
    remove() {}
    focus() {}
    scrollIntoView() {}
    setAttribute() {}
    set innerHTML(v) { this._html = String(v); }
    get innerHTML() { return this._html; }
    querySelector() { return new FakeEl('div'); }
    querySelectorAll() { return []; }
}

const registry = new Map();
function el(id) {
    if (!registry.has(id)) registry.set(id, new FakeEl('div'));
    return registry.get(id);
}

globalThis.localStorage = {
    _s: {},
    getItem(k) { return this._s[k] ?? null; },
    setItem(k, v) { this._s[k] = String(v); },
    removeItem(k) { delete this._s[k]; }
};
globalThis.document = {
    addEventListener() {},
    getElementById: (id) => el(id),
    querySelector: (sel) => sel.startsWith('#') ? el(sel.slice(1)) : new FakeEl('div'),
    querySelectorAll: () => [],
    createElement: (tag) => new FakeEl(tag),
    body: new FakeEl('body')
};
globalThis.window = globalThis;

// ---- Mock Web Speech APIs (drives the real js/voice.js) ------------------
let lastRec = null;
let lastUtter = null;
let synthCancelled = false;
class FakeRecognition {
    constructor() { lastRec = this; }
    start() {}
    stop() { if (this.onend) this.onend(); }
}
class FakeUtterance {
    constructor(text) { this.text = text; lastUtter = this; }
}
const synthMock = {
    getVoices() { return [{ lang: 'en-IN', name: 'Google हिंदी', localService: true }]; },
    speak(u) { synthCancelled = false; if (u.onend) u.onend(); },
    cancel() { synthCancelled = true; }
};
globalThis.SpeechRecognition = FakeRecognition;
globalThis.webkitSpeechRecognition = undefined;
globalThis.SpeechSynthesisUtterance = FakeUtterance;
globalThis.speechSynthesis = synthMock;

// ---- Boot the real modules ----------------------------------------------
const { renderAll } = await import('../js/render.js');
const { initChat } = await import('../js/chatbot.js');

renderAll();
const scenarioGrid = el('scenarioGrid').innerHTML;
assert.ok(scenarioGrid.includes('scenario-card'), 'scenario cards rendered from data');
assert.ok(el('emergencyGrid').innerHTML.includes('btn-sos'), 'emergency cards rendered');
assert.ok(el('contactsGrid').innerHTML.includes('tel:1930'), 'contacts rendered with tel: links');
assert.ok(el('rightsGrid').innerHTML.includes('Art. 14'), 'rights rendered from data');
assert.ok(el('sectionsList').innerHTML.includes('IPC 498A'), 'IPC sections rendered from data');
assert.ok(el('legalAidGrid').innerHTML.includes('aid-card'), 'legal aid cards rendered');
console.log('  ✓ all six sections render from the data layer');

initChat({
    toggle: el('chatToggle'),
    widget: el('chatWidget'),
    close: el('chatClose'),
    body: el('chatBody'),
    input: el('chatInput'),
    send: el('chatSend'),
    status: el('chatStatus')
});
assert.ok(el('chatBody').innerHTML.length > 0 || el('chatBody').children.length > 0, 'welcome messages appended');
assert.equal(el('chatMicBtn').disabled, false, 'mic enabled when SpeechRecognition is supported');
console.log('  ✓ chatbot init runs (welcome + chips + avatar injection)');

// ---- Voice (js/voice.js through the real Web Speech mocks) ---------------
const voice = await import('../js/voice.js');
assert.equal(voice.isVoiceOn(), true, 'voice defaults on');
voice.speak('**Comp** [section](uri) • hire \u{1F525} lawyer', { onend() {} });
assert.ok(lastUtter, 'speak() produced an utterance (no ReferenceError)');
assert.equal(lastUtter.text, 'Comp section . hire lawyer', 'stripForSpeech cleans markdown/emoji for voice');
assert.equal(lastUtter.lang, 'en-IN', 'en-IN voice picked');

const mic = voice.initMicrophone({ lang: 'en-IN', onResult() {} });
assert.ok(mic && typeof mic.start === 'function', 'mic controls returned when supported');
mic.start();
assert.ok(lastRec, 'recognition instance created on start');
let transcribed = null;
const mic2 = voice.initMicrophone({ lang: 'en-IN', onResult(r) { transcribed = r.final; } });
mic2.start();
lastRec.onresult({ resultIndex: 0, results: [{ 0: { transcript: 'harassment law' }, isFinal: true }] });
assert.equal(transcribed, 'harassment law', 'speech transcript arrives via onResult');

voice.setVoice(false);
assert.equal(voice.isVoiceOn(), false, 'toggle turns voice off');
const before = lastUtter;
voice.speak('ignored');
assert.equal(lastUtter, before, 'no utterance when voice is off');
voice.stopSpeaking();
assert.equal(synthCancelled, true, 'stopSpeaking cancels synthesis');
voice.setVoice(true);
console.log('  ✓ voice: speak/stop/mic/toggle all work through real module');

console.log('\nPASS — DOM boot.');