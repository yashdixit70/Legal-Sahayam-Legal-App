// ============================================================================
// CHATBOT ORCHESTRATOR (js/chatbot.js)
// ----------------------------------------------------------------------------
// Wires the chat widget UI to the answer pipeline:
//
//   user query
//     ├─ safety (crisis) keywords          → curated crisis response
//     ├─ if Gemini key present:
//     │     streamRagAnswer()  (embeddings → top-k → grounded SSE stream)
//     │        ├─ AnswerBoundError → "outside knowledge base" guidance
//     │        ├─ mid-stream failure → keep partial, mark cut off
//     │        └─ pre-token failure   → offlineReply() fallback
//     └─ no key / offline              → offlineReply() keyword engine
//
// The active path is surfaced in the header (● AI / ● Offline), answers stream
// in live, and the bot wears a lawyer avatar. Voice output (TTS) reads answers
// aloud; a mic button (SpeechRecognition) lets users speak instead of typing.
// ============================================================================

import { offlineReply, OFFLINE_SUGGESTIONS } from './bot.js';
import { streamRagAnswer, AnswerBoundError, lastFailure } from './rag.js';
import { getApiKey, setApiKey, DISCLAIMER } from './config.js';
import { lawyerAvatar, LAWYER_SVG } from './avatar.js';
import { initMicrophone, speak, stopSpeaking, isVoiceOn, setVoice } from './voice.js';

// ---------------------------------------------------------------------------
// Lightweight markdown → HTML (bold, italic, links, line breaks, bullets)
// ---------------------------------------------------------------------------
function formatBotText(text) {
    let t = String(text);
    t = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener" class="chat-link">$1</a>');
    t = t.replace(/\n/g, '<br>');
    t = t.replace(/•/g, '&nbsp;•');
    return t;
}

// ---------------------------------------------------------------------------
// Chat widget state machine
// ---------------------------------------------------------------------------
export function initChat(els) {
    const { toggle, widget, close, body, input, send, status } = els;

    const keyBtn = document.getElementById('chatKeyBtn');
    const voiceBtn = document.getElementById('chatVoiceBtn');
    const micBtn = document.getElementById('chatMicBtn');
    let busy = false;
    let listening = false;

    // Bot wears lawyer robes: inject the custom SVG avatar into the header.
    const headerAvatar = widget.querySelector('.chat-avatar');
    if (headerAvatar) headerAvatar.innerHTML = LAWYER_SVG;

    const mic = initMicrophone({
        lang: 'en-IN',
        onResult: ({ interim, final }) => {
            if (final) {
                input.value = final.trim();
                stopListening();
                handleSend();
            } else {
                input.value = interim;
            }
        },
        onError: (code) => {
            stopListening();
            addMessage(
                `I can't hear you — speech recognition ${code === 'not-allowed' ? 'needs microphone permission' : `failed (${code})`}. You can still type your question below. 🙏`,
                'bot', { modeLabel: 'voice input' }
            );
        }
    });
    if (!mic) {
        micBtn.disabled = true;
        micBtn.title = 'Voice input not supported in this browser';
    }

    function toggleChat(open) {
        if (open) {
            widget.classList.remove('closed');
            toggle.style.display = 'none';
            input.focus();
        } else {
            widget.classList.add('closed');
            toggle.style.display = 'block';
            stopListening();
            stopSpeaking();
        }
    }

    function setStatus(state) {
        if (!status) return;
        status.className = 'online-status ' + state.cls;
        status.textContent = state.label;
    }

    function scrollBottom() {
        body.scrollTop = body.scrollHeight;
    }

    function addMessage(text, sender, extra) {
        const div = document.createElement('div');
        div.className = sender === 'bot' ? 'bot-message' : 'user-message';
        if (sender === 'user') {
            div.innerHTML = '<div class="bubble">' + formatBotText(text) + '</div>';
        } else {
            let html = lawyerAvatar() + '<div class="bubble">' + formatBotText(text);
            if (extra && extra.modeLabel) html += `<div class="mode-chip">${extra.modeLabel}</div>`;
            if (extra && extra.sources && extra.sources.length) {
                html += '<div class="source-row"><span class="source-label">Based on:</span>' +
                    extra.sources.map(s => `<span class="source-chip" title="relevance ${(s.score * 100).toFixed(0)}%">${s.title}</span>`).join('') +
                    '</div>';
            }
            if (/IMMEDIATE|📞/.test(text)) {
                html += '<div class="chat-emergency"><a href="tel:112">📞 112</a><a href="tel:100">👮 100</a><a href="tel:108">🚑 108</a></div>';
            }
            html += '</div>';
            div.innerHTML = html;
        }
        body.appendChild(div);
        scrollBottom();
    }

    function addSuggestionChips() {
        const bar = document.createElement('div');
        bar.className = 'quick-actions static';
        bar.innerHTML = OFFLINE_SUGGESTIONS.map(q => `<button class="quick-btn">${q}</button>`).join('');
        bar.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                input.value = btn.textContent;
                handleSend();
            });
        });
        body.appendChild(bar);
    }

    function refreshStatus() {
        setStatus(getApiKey()
            ? { cls: 'status-ai', label: '● AI assistant · live voice' }
            : { cls: 'status-offline', label: '● Offline guide (tap 🔑 to enable AI)' });
        renderVoiceIcon();
    }

    function renderVoiceIcon() {
        if (!voiceBtn) return;
        voiceBtn.textContent = isVoiceOn() ? '🔊' : '🔇';
        voiceBtn.title = isVoiceOn() ? 'Voice answers on — click to mute' : 'Voice answers off — click to enable';
    }

    // ---- answer pipeline (returns a normalized result object) ------------
    function offlineResult(query) {
        return {
            text: offlineReply(query),
            modeLabel: getApiKey() ? '⚠️ AI unavailable — offline guide' : 'Offline mode — add your Gemini key in 🔑 for AI answers',
            sources: []
        };
    }

    async function respondStream(query, onToken) {
        if (!getApiKey()) return offlineResult(query);

        let received = false;
        try {
            const r = await streamRagAnswer(query, (frag) => { received = true; onToken(frag); });
            return {
                text: r.text,
                modeLabel: 'AI · grounded in site guide',
                sources: r.sources
            };
        } catch (err) {
            if (err instanceof AnswerBoundError) {
                return {
                    text: `I looked through our legal guide, but I don't have anything reliable about that specifically, and I won't guess — in legal matters a wrong answer can hurt.\n\nI can help with: threats 🛡️, blackmail 🔒, domestic violence 🏠, harassment 👤, arrest 🖐️, online fraud 💳, road accidents 🚗, property disputes 🏢, IPC sections 📖, and helplines 📞.\n\n${DISCLAIMER}`,
                    modeLabel: 'AI · not in knowledge base',
                    sources: []
                };
            }
            const reason = lastFailure() || (err && err.message) || 'unknown error';
            if (received) {
                return { text: null, interrupted: reason, modeLabel: '⚠️ live answer cut off', sources: [] };
            }
            return { text: offlineReply(query), modeLabel: `⚠️ AI unavailable (${reason}) — offline guide`, sources: [] };
        }
    }

    // ---- voice input ------------------------------------------------------
    function startListening() {
        if (!mic || busy) return;
        listening = true;
        micBtn.classList.add('active');
        micBtn.title = 'Listening… click again to stop';
        mic.start();
    }

    function stopListening() {
        listening = false;
        if (micBtn) micBtn.classList.remove('active');
        if (mic && mic.stop) mic.stop();
    }

    if (micBtn) {
        micBtn.addEventListener('click', () => {
            if (listening) stopListening();
            else startListening();
        });
    }

    if (voiceBtn) {
        voiceBtn.addEventListener('click', () => {
            setVoice(!isVoiceOn());
            renderVoiceIcon();
        });
    }

    // ---- sending ----------------------------------------------------------
    async function handleSend() {
        const query = input.value.trim();
        if (!query || busy) return;
        busy = true;
        stopSpeaking();

        addMessage(query, 'user');
        input.value = '';
        stopListening();

        // Live streaming bubble.
        const live = document.createElement('div');
        live.className = 'bot-message';
        live.innerHTML = lawyerAvatar() + '<div class="bubble"><span class="stream-caret"></span></div>';
        body.appendChild(live);
        scrollBottom();
        const bubble = live.querySelector('.bubble');

        let streamed = '';
        const render = () => {
            bubble.innerHTML = formatBotText(streamed) + (streamed ? '' : '<span class="stream-caret"></span>');
            scrollBottom();
        };

        let result;
        try {
            result = await respondStream(query, (frag) => { streamed += frag; render(); });
        } catch (err) {
            result = offlineResult(query);
        }

        if (result.interrupted) {
            // Partial answer already on screen — keep it, mark cut off, don't speak.
            bubble.innerHTML = formatBotText(streamed) + '<span class="mode-chip">⚠️ live answer cut off (connection) — please retry</span>';
        } else {
            bubble.innerHTML = formatBotText(result.text);
            if (result.modeLabel) {
                const chip = document.createElement('div');
                chip.className = 'mode-chip';
                chip.textContent = result.modeLabel;
                bubble.appendChild(chip);
            }
            if (result.sources && result.sources.length) {
                const row = document.createElement('div');
                row.className = 'source-row';
                row.innerHTML = '<span class="source-label">Based on:</span>' +
                    result.sources.map(s => `<span class="source-chip" title="relevance ${(s.score * 100).toFixed(0)}%">${s.title}</span>`).join('');
                bubble.appendChild(row);
            }
            if (/IMMEDIATE|📞/.test(result.text)) {
                const em = document.createElement('div');
                em.className = 'chat-emergency';
                em.innerHTML = '<a href="tel:112">📞 112</a><a href="tel:100">👮 100</a><a href="tel:108">🚑 108</a>';
                bubble.appendChild(em);
            }
            if (isVoiceOn()) speak(result.text);
        }
        scrollBottom();

        busy = false;
        refreshStatus();
    }

    // ---- wiring ----
    toggle.addEventListener('click', () => toggleChat(true));
    close.addEventListener('click', () => toggleChat(false));
    send.addEventListener('click', handleSend);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    if (keyBtn) {
        keyBtn.addEventListener('click', () => {
            const current = getApiKey();
            const entered = prompt(
                'Enter your Google Gemini API key (kept only in this browser via localStorage).\nLeave blank to remove it.',
                current ? '••••••••' : ''
            );
            if (entered === null) return;
            const value = entered.trim() === '••••••••' ? current : entered.trim();
            setApiKey(value);
            refreshStatus();
        });
    }

    // Welcome message + status.
    addMessage(
        `Namaste! 🙏 I'm **Legal Sahayam**, your AI legal assistant.`,
        'bot'
    );
    addMessage(
        `I answer questions on your legal rights, IPC/BNS sections, and what to do in situations like threats, domestic violence, harassment, arrest, online fraud, accidents, and property disputes.\n\nTry asking: "I'm being threatened", "domestic violence", "what is IPC 506", "online fraud". Speak into the 🎙️ or just type.`,
        'bot'
    );
    addSuggestionChips();
    refreshStatus();
}

export { formatBotText };