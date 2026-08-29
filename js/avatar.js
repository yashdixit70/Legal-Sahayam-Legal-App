// ============================================================================
// LAWYER AVATAR (js/avatar.js)
// ----------------------------------------------------------------------------
// A hand-drawn inline SVG of the bot as a lawyer in robes (black gown, white
// collar bands, gold justice scale). Inline and dependency-free so the site
// needs no image assets and renders instantly. Solid fills only, no ids/defs,
// so every instance on the page is safe to duplicate.
// ============================================================================

export const LAWYER_SVG = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <!-- backdrop -->
  <circle cx="32" cy="32" r="32" fill="#1b2c52"/>

  <!-- hair -->
  <path d="M24.6 7.9c4.4-4.1 10.4-4.2 15-.2 2.3 2 3.6 4.7 3.6 7.5v1.4c0 1.5-1.2 2.7-2.7 2.7H38l-1.5.9c-2.9 1.9-6.1 1.9-9 0l-1.5-.9h-1.5c-1.5 0-2.7-1.2-2.7-2.7v-1.4c0-2.8 1.2-5.4 3.8-7.3z" fill="#23263a"/>

  <!-- head -->
  <circle cx="32" cy="21" r="8.4" fill="#e6bd92"/>

  <!-- robe bust (black gown) -->
  <path d="M18.6 57c-1.3-12.8 4.4-24.4 13.4-24.4S46.7 44.2 45.4 57c-1.8 2.1-3.3 3-4.2 3H22.8c-.9 0-2.4-.9-4.2-3z" fill="#20243b"/>

  <!-- white collar bands -->
  <path d="M27 31.6c1.6-2 3.3-3 5-3s3.4 1 5 3l-1.3 7.3c-1-.8-2.3-.9-3.7-.9s-2.7.1-3.7.9z" fill="#f3efe7"/>
  <circle cx="32" cy="36.2" r="1.1" fill="#f7c948"/>

  <!-- justice scale -->
  <g stroke="#f7c948" stroke-width="1.6" fill="none" stroke-linecap="round">
    <path d="M44 11.5v6.6"/>
    <path d="M37.5 12h13"/>
    <path d="M37.5 12l-2.7 4.4"/>
    <path d="M50.5 12l2.7 4.4"/>
  </g>
  <path d="M33.2 16.6h3.9v-1.5a1.95 1.95 0 0 0-3.9 0z" fill="#f7c948"/>
  <path d="M55 16.6h-3.9v-1.5a1.95 1.95 0 0 1 3.9 0z" fill="#f7c948"/>
</svg>`;

// HTML for a circular avatar wrapper around the SVG (sized by CSS).
export function lawyerAvatar() {
    return `<span class="lawyer-avatar" aria-hidden="true">${LAWYER_SVG}</span>`;
}