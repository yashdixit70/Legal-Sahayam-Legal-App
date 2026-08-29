// ============================================================================
// MAIN APP (js/app.js)
// ----------------------------------------------------------------------------
// Global wiring: renders content from the data layer, initialises the chatbot,
// and handles the interactive bits (nav, scenario cards, SOS, speed dial).
// ============================================================================

import { renderAll } from './render.js';
import { initChat } from './chatbot.js';
import { SCENARIOS } from '../data/legalContent.js';

document.addEventListener('DOMContentLoaded', function () {

    // ===== Render all content sections from the data layer =====
    try {
        renderAll();
    } catch (err) {
        console.error('Failed to render content sections:', err);
    }

    // ===== Mobile nav toggle =====
    const navToggle = document.getElementById('navToggle');
    const nav = document.getElementById('nav');
    navToggle.addEventListener('click', () => nav.classList.toggle('active'));
    nav.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => nav.classList.remove('active'));
    });

    // ===== Chatbot (AI + offline fallback orchestration lives here) =====
    initChat({
        toggle: document.getElementById('chatToggle'),
        widget: document.getElementById('chatWidget'),
        close: document.getElementById('chatClose'),
        body: document.getElementById('chatBody'),
        input: document.getElementById('chatInput'),
        send: document.getElementById('chatSend'),
        status: document.getElementById('chatStatus')
    });

    // ===== Scenario guidance =====
    const scenarioResponse = document.getElementById('scenarioResponse');
    const scenarioActions = `
        <div style="margin-top:15px;display:flex;gap:10px;flex-wrap:wrap;">
            <a href="tel:112" class="btn btn-danger" style="text-decoration:none;">📞 Call 112</a>
            <a href="tel:100" class="btn btn-primary" style="text-decoration:none;">👮 Police 100</a>
            <a href="tel:108" class="btn btn-danger" style="text-decoration:none;">🚑 Ambulance 108</a>
            <a href="tel:1091" class="btn btn-primary" style="text-decoration:none;">👩 Women 1091</a>
        </div>`;

    document.querySelectorAll('.scenario-card').forEach(card => {
        card.addEventListener('click', () => {
            const rule = SCENARIOS.find(s => s.key === card.dataset.scenario);
            if (rule) {
                scenarioResponse.innerHTML =
                    `<div class="sr-inner"><h3 style="text-align:left;">${rule.icon} ${rule.title}</h3>` +
                    `<div class="sr-content">${rule.guidance}</div>${scenarioActions}</div>`;
            } else {
                scenarioResponse.innerHTML = `<div class="sr-inner"><h3>ℹ️ Guidance coming soon for this situation</h3></div>`;
            }
            scenarioResponse.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });

    // ===== Floating emergency speed dial =====
    const floatingEmerg = document.getElementById('floatingEmerg');
    const speedDial = document.getElementById('speedDial');

    floatingEmerg.addEventListener('click', () => speedDial.classList.toggle('active'));
    document.addEventListener('click', (e) => {
        if (!floatingEmerg.contains(e.target) && !speedDial.contains(e.target)) {
            speedDial.classList.remove('active');
        }
    });

    // ===== SOS Alert buttons =====
    const SOS_NUMBERS = {
        police:    { num: '112', name: 'Police' },
        ambulance: { num: '112', name: 'Ambulance' },
        fire:      { num: '112', name: 'Fire & Rescue' },
        women:     { num: '1091', name: 'Women Helpline' },
        child:     { num: '1098', name: 'Child Helpline' },
        general:   { num: '112', name: 'National Emergency' }
    };

    document.querySelectorAll('.btn-sos').forEach(btn => {
        btn.addEventListener('click', function () {
            sendSOSAlert(this.dataset.alert);
        });
    });

    function sendSOSAlert(type) {
        const info = SOS_NUMBERS[type];
        if (!info) return;

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => showAlert(info, `Location: ${pos.coords.latitude}, ${pos.coords.longitude}`),
                () => showAlert(info, 'Location unavailable (GPS denied)'),
                { enableHighAccuracy: true, timeout: 5000 }
            );
        } else {
            showAlert(info, 'Location unavailable');
        }
    }

    function showAlert(info, location) {
        const confirmed = confirm(
            `🚨 SOS ALERT!\n\nYou're about to call ${info.name}.\n\n${location}\n\nPress OK to call ${info.num} now.`
        );
        if (confirmed) {
            window.location.href = `tel:${info.num}`;
            alert(`Emergency call initiated to ${info.name} (${info.num}).\n\nStay safe. If you cannot speak, authorities are trained to help.`);
        }
    }

    // ===== Smooth scroll for anchor links =====
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href.length > 1) {
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
});