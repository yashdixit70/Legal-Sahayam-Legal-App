// ============================================================================
// RENDER (js/render.js)
// ----------------------------------------------------------------------------
// Renders every content section from data/legalContent.js into the container
// elements defined in index.html. There is no hardcoded legal content in the
// HTML anymore — the data layer is the single source of truth, and CSS carries
// all the visual styling.
// ============================================================================

import { EMERGENCIES, RIGHTS, IPC_SECTIONS, SCENARIOS, CONTACTS, LEGAL_AID } from '../data/legalContent.js';

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function setHTML(selector, html) {
    const el = document.querySelector(selector);
    if (el) el.innerHTML = html;
}

export function renderEmergency() {
    setHTML('#emergencyGrid', EMERGENCIES.map(e => `
        <div class="emergency-card ${e.id}">
            <div class="ec-icon">${e.icon}</div>
            <h3>${escapeHtml(e.title)}</h3>
            <p>${escapeHtml(e.desc)}</p>
            <a href="tel:${e.phone}" class="btn btn-call">📞 Call ${e.phone}</a>
            <button class="btn btn-sos" data-alert="${e.id}">🚨 SOS Alert</button>
        </div>`).join(''));
}

export function renderRights() {
    setHTML('#rightsGrid', RIGHTS.map(r => `
        <div class="right-card">
            <span class="rc-num">${escapeHtml(r.article)}</span>
            <h3>${escapeHtml(r.title)}</h3>
            <p>${escapeHtml(r.desc)}</p>
        </div>`).join(''));
}

export function renderSections() {
    setHTML('#sectionsList', IPC_SECTIONS.map(s => `
        <div class="section-item">
            <span class="si-code">IPC ${escapeHtml(s.code)}</span>
            <div class="si-info">
                <h3>${escapeHtml(s.title)}</h3>
                <p>${escapeHtml(s.desc)}</p>
            </div>
        </div>`).join(''));
}

export function renderScenarios() {
    setHTML('#scenarioGrid', SCENARIOS.map(sc => `
        <button class="scenario-card" data-scenario="${sc.key}">
            <span>${sc.icon}</span>
            <h3>${escapeHtml(sc.title)}</h3>
        </button>`).join(''));
}

export function renderContacts() {
    setHTML('#contactsGrid', CONTACTS.map(c => `
        <a href="tel:${c.number}" class="contact-card">
            <span>${c.icon}</span>
            <h3>${escapeHtml(c.title)}</h3>
            <p>${escapeHtml(c.number)}</p>
        </a>`).join(''));
}

export function renderLegalAid() {
    // LEGAL_AID desc is curated static HTML (contains <strong>); safe by trust.
    setHTML('#legalAidGrid', LEGAL_AID.map(a => `
        <div class="aid-card">
            <span class="aid-icon">${a.icon}</span>
            <h3>${escapeHtml(a.title)}</h3>
            <p>${a.desc}</p>
        </div>`).join(''));
}

export function renderAll() {
    renderEmergency();
    renderRights();
    renderSections();
    renderScenarios();
    renderContacts();
    renderLegalAid();
}