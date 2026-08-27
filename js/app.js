// ====== LEGAN SAHAYAM MAIN APP ======

document.addEventListener('DOMContentLoaded', function () {

    // ===== Mobile nav toggle =====
    const navToggle = document.getElementById('navToggle');
    const nav = document.getElementById('nav');
    navToggle.addEventListener('click', () => {
        nav.classList.toggle('active');
    });
    nav.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => nav.classList.remove('active'));
    });

    // ===== Chatbot =====
    const chatToggle = document.getElementById('chatToggle');
    const chatWidget = document.getElementById('chatWidget');
    const chatClose = document.getElementById('chatClose');
    const chatBody = document.getElementById('chatBody');
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');

    function toggleChat(open) {
        if (open) {
            chatWidget.classList.remove('closed');
            chatToggle.style.display = 'none';
            chatInput.focus();
        } else {
            chatWidget.classList.add('closed');
            chatToggle.style.display = 'block';
        }
    }

    chatToggle.addEventListener('click', () => toggleChat(true));
    chatClose.addEventListener('click', () => toggleChat(false));

    function addMessage(text, sender) {
        const div = document.createElement('div');
        div.className = sender === 'bot' ? 'bot-message' : 'user-message';
        if (sender === 'bot') {
            div.innerHTML = '<span class="avatar">⚖️</span><div class="bubble">' + formatBotText(text) + '</div>';
        } else {
            div.innerHTML = '<div class="bubble">' + text + '</div>';
        }
        chatBody.appendChild(div);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function formatBotText(text) {
        let t = text;
        t = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        // Bold
        t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // Italic
        t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
        // Markdown links [title](url)
        t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#2563eb;text-decoration:underline;">$1</a>');
        // Line breaks
        t = t.replace(/\n/g, '<br>');
        // Bullet conversion
        t = t.replace(/•/g, '&nbsp;•');
        return t;
    }

    function showTyping() {
        const div = document.createElement('div');
        div.className = 'bot-message';
        div.id = 'typingIndicator';
        div.innerHTML = '<span class="avatar">⚖️</span><div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div>';
        chatBody.appendChild(div);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function removeTyping() {
        const el = document.getElementById('typingIndicator');
        if (el) el.remove();
    }

    function handleSend() {
        const query = chatInput.value.trim();
        if (!query) return;

        // Add quick actions row
        const quickDiv = document.createElement('div');
        quickDiv.className = 'quick-actions';
        const hints = ['I\'m being threatened', 'Domestic violence', 'What is IPC 506?', 'Emergency numbers'];
        const chips = hints.map(h => `<button class="quick-btn" data-q="${encodeURIComponent(h)}">${h}</button>`).join('');
        quickDiv.innerHTML = chips;
        chatBody.appendChild(quickDiv);
        quickDiv.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                chatInput.value = decodeURIComponent(btn.dataset.q);
                handleSend();
            });
        });

        addMessage(query, 'user');
        chatInput.value = '';

        showTyping();

        setTimeout(async () => {
            removeTyping();
            let response = window.getBotResponse(query);

            const isDefault = response === window.LEGAL_KB.default.responses[0];
            if (isDefault) {
                const googleReply = await window.googleSearchReply(query);
                if (googleReply) {
                    response = googleReply;
                } else {
                    response = "I couldn't find a match in my legal database, and Google search isn't set up yet. 🤖\n\n" +
                        "To enable Google for any-question answers:\n1. Create a Programmable Search Engine at programmablesearchengine.google.com\n2. Get an API key at developers.google.com/custom-search\n3. Fill them into `GOOGLE_CONFIG` in js/bot.js and set `ENABLED: true`.\n\n" +
                        "Until then, I can help with: " +
                        "threatened 🛡️, blackmail 🔒, domestic violence 🏠, harassment 👤, arrest 🖐️, online fraud 💳, road accident 🚗, property dispute 🏢, IPC sections 📜, and emergency numbers 📞.";
                }
            }

            addMessage(response, 'bot');

            if (response.includes('IMMEDIATE ACTION') || response.includes('🚨')) {
                const emDiv = document.createElement('div');
                emDiv.className = 'bot-message';
                emDiv.innerHTML = '<span class="avatar">🚨</span><div class="bubble"><strong>Need help right now?</strong><br><br><a href="tel:112" style="display:inline-block;background:#e63946;color:#fff;padding:8px 16px;border-radius:8px;margin:4px;text-decoration:none;">📞 Call 112</a><a href="tel:100" style="display:inline-block;background:#1a3c6e;color:#fff;padding:8px 16px;border-radius:8px;margin:4px;text-decoration:none;">👮 Police 100</a><a href="tel:108" style="display:inline-block;background:#e53935;color:#fff;padding:8px 16px;border-radius:8px;margin:4px;text-decoration:none;">🚑 Ambulance 108</a></div>';
                chatBody.appendChild(emDiv);
                chatBody.scrollTop = chatBody.scrollHeight;
            }
        }, 700);
    }

    chatSend.addEventListener('click', handleSend);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    // ===== Scenario guidance =====
    const scenarioRules = {
        threat: {
            title: '🛡️ Being Threatened / Intimidated',
            content: `<p><strong>IMMEDIATE:</strong> Call <strong>112</strong> or <strong>100</strong> if you are in danger. Go to a safe place.</p>
            <p><strong>Applicable sections:</strong> IPC 506 (criminal intimidation), IPC 503, IPC 507.</p>
            <p><strong>Steps:</strong></p>
            <p>1. Save all evidence — messages, calls, screenshots, recordings.</p>
            <p>2. File an <strong>FIR</strong> at your nearest police station.</p>
            <p>3. Ask for a free copy of the FIR.</p>
            <p>4. If police refuse, approach the <strong>SP</strong> or Judicial Magistrate.</p>
            <p><strong>Your safety is priority. Reach out for help now.</strong></p>`
        },
        blackmail: {
            title: '🔒 Blackmail / Extortion',
            content: `<p><strong>IMMEDIATE:</strong> Do NOT pay. Save all evidence.</p>
            <p><strong>Report to:</strong> Cyber Crime — call <strong>1930</strong> or <a href="https://cybercrime.gov.in" target="_blank">cybercrime.gov.in</a>.</p>
            <p><strong>Applicable sections:</strong> IPC 384 (extortion), IPC 385, IPC 506, IT Act 66C, IT Act 67.</p>
            <p><strong>Steps:</strong></p>
            <p>1. Do NOT delete any messages or evidence.</p>
            <p>2. Block the person on all platforms.</p>
            <p>3. File a complaint at your city's cyber cell.</p>
            <p>4. Report promptly — it can help recover your situation.</p>
            <p><strong>Never give in to blackmailers — reporting is the right move.</strong></p>`
        },
        domestic: {
            title: '🏠 Domestic Violence',
            content: `<p><strong>IMMEDIATE:</strong> If in danger call <strong>112</strong> or Women Helpline <strong>1091</strong> / <strong>181</strong>.</p>
            <p><strong>Applicable sections:</strong> IPC 498A, Protection of Women from Domestic Violence Act 2005, IPC 354.</p>
            <p><strong>Your rights under DV Act:</strong></p>
            <p>1. <strong>Protection Order</strong> — stop the abuser from contacting you.</p>
            <p>2. <strong>Residence Order</strong> — you cannot be thrown out of your home.</p>
            <p>3. <strong>Monetary relief</strong> — maintenance & compensation.</p>
            <p>4. <strong>Custody</strong> — interim custody of children.</p>
            <p><strong>Help:</strong> One Stop Centre in every district, legal aid via NALSA (15100). You are not alone. 💪</p>`
        },
        harassment: {
            title: '👤 Harassment / Stalking',
            content: `<p><strong>Applicable sections:</strong> IPC 354, IPC 354A (sexual harassment), IPC 354D (stalking), IPC 509, IPC 506.</p>
            <p><strong>Steps:</strong></p>
            <p>1. Document everything — dates, times, places, messages.</p>
            <p>2. Do NOT engage with the harasser.</p>
            <p>3. File a complaint at the police station or online e-complaint portal.</p>
            <p>4. For online harassment, report to <strong>cybercrime.gov.in</strong> / <strong>1930</strong>.</p>
            <p>5. Consider a court-issued <strong>restraining order</strong>.</p>
            <p><strong>If in immediate danger, call 112.</strong></p>`
        },
        arrest: {
            title: '🖐️ Arrested / In Police Custody',
            content: `<p><strong>Your rights under Article 22:</strong></p>
            <p>1. Right to know the grounds of arrest.</p>
            <p>2. Right to remain silent.</p>
            <p>3. Right to a lawyer.</p>
            <p>4. Right to inform a friend/family member.</p>
            <p>5. Right to be produced before a magistrate within 24 hours.</p>
            <p>6. Right to bail for bailable offenses.</p>
            <p><strong>If someone you know is arrested:</strong> get the street/station name, officer, and contact a lawyer. Under <strong>Article 39A</strong> you have the right to free legal aid — call <strong>15100</strong> (NALSA).</p>`
        },
        fraud: {
            title: '💳 Online Fraud / Scam',
            content: `<p><strong>IMMEDIATE:</strong> Call <strong>1930</strong> (Cyber Crime) and inform your bank right away.</p>
            <p><strong>Report:</strong> <a href="https://cybercrime.gov.in" target="_blank">cybercrime.gov.in</a></p>
            <p><strong>Applicable sections:</strong> IPC 420, IT Act 66C (identity theft), IT Act 66D (cheating by personation).</p>
            <p><strong>Steps:</strong></p>
            <p>1. Save transaction details, chats, calls.</p>
            <p>2. Note amount, date, time, account details.</p>
            <p>3. File complaint on cybercrime.gov.in with evidence.</p>
            <p>4. Report to your bank for refund/chargeback.</p>
            <p><strong>⏱️ Act within the first few hours</strong> for the best chance to freeze & recover funds.</p>`
        },
        accident: {
            title: '🚗 Road Accident',
            content: `<p><strong>IMMEDIATE:</strong> Call <strong>112</strong> (emergency) & <strong>108</strong> (ambulance), <strong>100</strong> (police).</p>
            <p><strong>Applicable sections:</strong> IPC 279 (rash driving), IPC 304A (death by negligence), IPC 337/338, Motor Vehicles Act.</p>
            <p><strong>Steps:</strong></p>
            <p>1. Note the vehicle registration number.</p>
            <p>2. Take photos of the scene.</p>
            <p>3. Get witnesses' contact details.</p>
            <p>4. Do NOT flee — file an accident report / FIR.</p>
            <p>5. Claim motor insurance for compensation.</p>
            <p><strong>You have the right to compensation for injury & damage.</strong></p>`
        },
        land: {
            title: '🏢 Property / Land Dispute',
            content: `<p><strong>Applicable sections:</strong> IPC 447 (criminal trespass), IPC 379 (theft of property), IPC 420 (fraud).</p>
            <p><strong>Steps:</strong></p>
            <p>1. Collect ALL documents — sale deed, registry, tax receipts.</p>
            <p>2. Verify the title through a property lawyer.</p>
            <p>3. If someone has illegally taken physical possession, file a complaint (criminal trespass).</p>
            <p>4. For civil disputes, file a <strong>suit for declaration & injunction</strong>.</p>
            <p>5. Real estate/builder disputes — approach <strong>RERA</strong>.</p>
            <p><strong>Always do due diligence before purchasing property.</strong></p>`
        }
    };

    document.querySelectorAll('.scenario-card').forEach(card => {
        card.addEventListener('click', () => {
            const key = card.dataset.scenario;
            const rule = scenarioRules[key];
            const responseBox = document.getElementById('scenarioResponse');
            if (rule) {
                responseBox.innerHTML = `<div class="sr-inner"><h3 style="text-align:left;">${rule.title}</h3><div class="sr-content">${rule.content}</div>
                <div style="margin-top:15px;display:flex;gap:10px;flex-wrap:wrap;">
                <a href="tel:112" style="background:#e63946;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">📞 Call 112</a>
                <a href="tel:100" style="background:#1a3c6e;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">👮 Police 100</a>
                <a href="tel:108" style="background:#e53935;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">🚑 Ambulance 108</a>
                <a href="tel:1091" style="background:#d81b60;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">👩 Women 1091</a>
                </div></div>`;
            } else {
                responseBox.innerHTML = `<div class="sr-inner"><h3>ℹ️ Guidance coming soon for this situation</h3></div>`;
            }
            responseBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });

    // ===== Floating emergency speed dial =====
    const floatingEmerg = document.getElementById('floatingEmerg');
    const speedDial = document.getElementById('speedDial');

    floatingEmerg.addEventListener('click', () => {
        speedDial.classList.toggle('active');
    });

    // Close speed dial when clicking anywhere else
    document.addEventListener('click', (e) => {
        if (!floatingEmerg.contains(e.target) && !speedDial.contains(e.target)) {
            speedDial.classList.remove('active');
        }
    });

    // ===== SOS Alert buttons =====
    document.querySelectorAll('.btn-sos').forEach(btn => {
        btn.addEventListener('click', function () {
            const type = this.dataset.alert;
            sendSOSAlert(type);
        });
    });

    function sendSOSAlert(type) {
        const numbers = {
            police: { num: '112', name: 'Police' },
            ambulance: { num: '112', name: 'Ambulance' },
            fire: { num: '112', name: 'Fire & Rescue' },
            women: { num: '1091', name: 'Women Helpline' },
            child: { num: '1098', name: 'Child Helpline' },
            national: { num: '112', name: 'National Emergency' }
        };
        const info = numbers[type];

        let locationText = 'Location unavailable';
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    locationText = `Location: ${pos.coords.latitude}, ${pos.coords.longitude}`;
                    showAlert(type, info, locationText);
                },
                () => showAlert(type, info, 'Location unavailable (GPS denied)'),
                { enableHighAccuracy: true, timeout: 5000 }
            );
        } else {
            showAlert(type, info, locationText);
        }
    }

    function showAlert(type, info, location) {
        // Open a call to the emergency number
        const confirmed = confirm(`🚨 SOS ALERT!\n\nYou're about to call ${info.name}.\n\n${location}\n\nPress OK to call ${info.num} now.`);
        if (confirmed) {
            window.location.href = `tel:${info.num}`;
            alert(`Emergency call initiated to ${info.name} (${info.num}).\n\nStay safe. If you cannot speak, authorities are trained to help.`);
        }
    }

    // ===== Smooth scroll for footer links =====
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
