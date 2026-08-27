// ====== Legal SAHAYAM LEGAL KNOWLEDGE BASE ======

const BOT_NAME = 'Legal Sahayam';

// ====== GOOGLE SEARCH (Programmable Search Engine) ======
// Set up a free Google Programmable Search Engine at https://programmablesearchengine.google.com
// 1. Create a search engine, note its "Search engine ID" (cx)
// 2. Get an API key at https://developers.google.com/custom-search/v1/introduction
const GOOGLE_CONFIG = {
    // TODO: Replace with your own values (https://programmablesearchengine.google.com)
    API_KEY: '',
    SEARCH_ENGINE_ID: '',
    ENABLED: false   // set to true once API_KEY and SEARCH_ENGINE_ID are filled in
};

// Searches Google and returns a formatted reply string, or null on any failure.
async function googleSearchReply(query) {
    if (!GOOGLE_CONFIG.ENABLED || !GOOGLE_CONFIG.API_KEY || !GOOGLE_CONFIG.SEARCH_ENGINE_ID) {
        return null;
    }
    try {
        const url = 'https://www.googleapis.com/customsearch/v1?' +
            'key=' + encodeURIComponent(GOOGLE_CONFIG.API_KEY) +
            '&cx=' + encodeURIComponent(GOOGLE_CONFIG.SEARCH_ENGINE_ID) +
            '&q=' + encodeURIComponent(query) +
            '&num=3';
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        const items = data.items || [];
        if (!items.length) return null;

        const list = items.map((item, i) =>
            `${i + 1}. **[${item.title}](${item.link})**\n${item.snippet || ''}`
        ).join('\n\n');

        return "🔍 I searched Google for you. Here's what I found:\n\n" + list +
            "\n\n⚠️ *Note: Please verify information with a qualified legal professional. I'm here to help, but I'm not a substitute for a lawyer.*";
    } catch (err) {
        return null;
    }
}


// Legal knowledge base for the chatbot
const LEGAL_KB = {
    greeting: {
        patterns: ['hi', 'hello', 'hey', 'namaste', 'good morning', 'good evening', 'good afternoon', 'salaam'],
        responses: [
            "Namaste! 🙏 I'm Legal Sahayam, your legal assistant. I'm here to help you understand your legal rights and sections.\n\nI can help you with:\n• 🛡️ Being threatened or blackmailed\n• 🏠 Domestic violence\n• 👤 Harassment or stalking\n• 🖐️ You or someone got arrested\n• 💳 Online fraud\n• 📜 Understanding IPC sections\n• 📞 Emergency numbers\n\nHow can I help you today?"
        ]
    },
    threat: {
        patterns: ['threat', 'threaten', 'threatening', 'intimidat', 'scared', 'afraid', 'danger', 'fear for life', 'kill me'],
        responses: [
            "😟 I'm sorry you're going through this. You are NOT alone, and you have legal rights:\n\n🚨 **IMMEDIATE ACTION:**\n• Call **112** (National Emergency) or **100** (Police) RIGHT NOW.\n• If you fear for your safety, go to a safe place immediately.\n\n⚖️ **LEGAL SECTION:** This may fall under:\n• **IPC 506** – Criminal Intimidation (threatening with injury)\n• **IPC 507** – Criminal intimidation by anonymous communication\n• **IPC 503** – Definition of criminal intimidation\n\n📝 **WHAT TO DO:**\n1. Save evidence – call logs, messages, screenshots, recordings\n2. File an FIR at your nearest police station\n3. Ask for a copy of the FIR (free of charge)\n4. If police refuse, approach the SP or file a complaint with the magistrate\n\n🔐 Your safety is the top priority. Please reach out for help immediately."
        ]
    },
    blackmail: {
        patterns: ['blackmail', 'extort', 'blackmailing', 'leaked', 'photos', 'video', 'mms', 'compromising'],
        responses: [
            "🔒 **BLACKMAIL / EXTORTION** – This is a serious crime. Do not panic, and DO NOT pay them.\n\n🚨 **IMMEDIATE ACTION:**\n• **Save all evidence** – screenshots, chats, emails\n• **Report to Cyber Crime:** Call **1930** or visit cybercrime.gov.in\n• **Block** the person immediately on all platforms\n\n⚖️ **LEGAL SECTIONS:**\n• **IPC 384** – Extortion\n• **IPC 385** – Putting person in fear of injury to commit extortion\n• **IPC 506** – Criminal intimidation\n• **IT Act 66E** – Violation of privacy (leaking private photos)\n• **IT Act 67** – Publishing obscene material\n\n📝 **WHAT TO DO:**\n1. Do NOT delete any messages or evidence\n2. Report on the Cyber Crime portal (cybercrime.gov.in)\n3. File a complaint at the cyber cell of your city police\n4. Take a printout of all evidence\n\n🛡️ You have strong legal protection. Never give in to blackmailers – reporting them is the right move."
        ]
    },
    domestic: {
        patterns: ['domestic', 'violence', 'abuse', 'husband', 'marital', 'beaten', 'physical abuse', 'dowry', 'married', 'mother in law', 'mother-in-law'],
        responses: [
            "🏠 **DOMESTIC VIOLENCE** – You have strong legal protection. This is a serious crime.\n\n🚨 **IMMEDIATE ACTION:**\n• If in immediate danger, call **112** or **1091** (Women Helpline)\n• **181** – Women in Distress Helpline\n\n⚖️ **YOUR LEGAL PROTECTIONS:**\n• **IPC 498A** – Cruelty by husband or relatives\n• **Protection of Women from Domestic Violence Act, 2005** – Covers physical, emotional, sexual, and economic abuse\n• **IPC 354** – Assault with intent to outrage modesty\n• **Dowry Prohibition Act** – If dowry demands\n\n📝 **WHAT TO DO (rights under DV Act):**\n1. **Protection Order** – Police can stop the abuser from contacting you\n2. **Residence Order** – You can't be thrown out of your home\n3. **Monetary Relief** – Maintenance/compensation\n4. **Custody** – Interim custody of children\n\n👩 **HELP AVAILABLE:**\n• 1091 – Women Helpline\n• 181 – Domestic Abuse Helpline\n• One Stop Centre (OSC) – in every district\n• Legal Aid – www.nalasa.gov.in\n\n💪 You have every right to live free from violence. Reach out — you are not alone."
        ]
    },
    harassment: {
        patterns: ['harass', 'stalking', 'stalk', 'follow', 'eve teasing', 'eve-teasing', 'booking', 'molest', 'molestation', 'lewd'],
        responses: [
            "👤 **HARASSMENT / STALKING** – This is illegal and you are protected by law.\n\n⚖️ **LEGAL SECTIONS:**\n• **IPC 354** – Assault or use of criminal force on a woman\n• **IPC 354A** – Sexual harassment\n• **IPC 354D** – Stalking (following or contacting despite objection)\n• **IPC 509** – Insulting modesty by words/gestures\n• **IPC 506** – Criminal intimidation\n\n🚨 **IN CASE OF DANGER:** Call **112** immediately.\n\n📝 **WHAT TO DO:**\n1. **Document everything** – dates, times, places, messages, photos\n2. **Do not respond or engage** with the harasser\n3. File a **complaint at the police station** (or online via your state's e-complaint portal)\n4. In case of online harassment, report on **cybercrime.gov.in** or call **1930**\n5. Consider a **Restraining Order / Protection Order** through court\n\n🛡️ Your dignity is protected by law. Do not stay silent."
        ]
    },
    arrest: {
        patterns: ['arrested', 'arrest', 'police custody', 'fir', 'jail', 'detention', 'police took'],
        responses: [
            "🖐️ **ARRESTED / IN POLICE CUSTODY** – You have important constitutional rights under **Article 22**.\n\n⚖️ **YOUR RIGHTS WHEN ARRESTED:**\n1. **Right to know the grounds of arrest** – the police MUST tell you why you're arrested\n2. **Right to remain silent** – you are NOT obligated to answer leading questions\n3. **Right to a lawyer** – you can consult AND be defended by a lawyer of your choice\n4. **Right to inform someone** – a friend or family member must be informed\n5. **Right to be produced before a magistrate** within 24 hours\n6. **Right to bail** – for bailable offenses\n\n📝 **IF SOMEONE YOU KNOW IS ARRESTED:**\n• Ask to see the **arrest memo / warrant**\n• Get the name of the police station and officer\n• Contact a **lawyer** immediately\n• If treatment is abusive, it's a violation of **IPC 220** (wrongful confinement) and fundamental rights\n\n🛡️ **FREE LEGAL AID:** Article 39A guarantees free legal aid. If you can't afford a lawyer, request one through the **Legal Services Authority**. Call **15100**."
        ]
    },
    fraud: {
        patterns: ['fraud', 'scam', 'cheated', 'cheating', 'otp', 'phishing', 'money', 'lost money', 'scammed', 'fake call'],
        responses: [
            "💳 **ONLINE FRAUD / SCAM** – Act fast. Your money can be recovered if you report quickly.\n\n🚨 **IMMEDIATE ACTION:**\n• Call **1930** (Cyber Crime Helpline) IMMEDIATELY\n• Report at **cybercrime.gov.in**\n• Inform your **bank** right away to block/chargeback\n\n⚖️ **LEGAL SECTIONS:**\n• **IPC 420** – Cheating and dishonestly inducing delivery of property\n• **IT Act 66C** – Identity theft\n• **IT Act 66D** – Cheating by personation (fake calls/OTP)\n\n📝 **WHAT TO DO:**\n1. Save all transaction details & chats/calls\n2. Note the amount, date, time, and account details\n3. File a complaint on cybercrime.gov.in with evidence\n4. Get a copy of the FIR/complaint reference\n5. Report to your bank for a refund claim\n\n⏱️ **Act within the first few hours** – this gives the best chance to freeze and recover funds."
        ]
    },
    accident: {
        patterns: ['accident', 'road', 'crash', 'hit', 'vehicle', 'car', 'collision', 'road rage'],
        responses: [
            "🚗 **ROAD ACCIDENT** – Follow these steps:\n\n🚨 **IMMEDIATE ACTION:**\n• Call **112** (emergency) and **108** (ambulance)\n• Call **100** to report to police\n• Give first aid only if trained, otherwise wait for ambulance\n\n⚖️ **LEGAL ASPECTS:**\n• **IPC 279** – Rash and negligent driving\n• **IPC 304A** – Causing death by negligence\n• **IPC 337/338** – Causing hurt by endangering life\n• **Motor Vehicles Act** – Insurance compensation is your right\n\n📝 **WHAT TO DO:**\n1. Note the **registration number** of the vehicle\n2. Take photos of the accident scene\n3. Get witnesses' contact information\n4. **Do not flee** – it makes you liable (hit & run)\n5. File an FIR / accident report\n6. Claim **motor insurance** for compensation\n\n🛡️ If the other party is at fault, you have a right to compensation for injury and vehicle damage."
        ]
    },
    property: {
        patterns: ['property', 'land', 'dispute', 'plot', 'house', 'ownership', 'builder', 'document', 'registry', 'kabza'],
        responses: [
            "🏢 **PROPERTY / LAND DISPUTE** – These can be complex. Here's guidance:\n\n⚖️ **KEY POINTS:**\n• Always verify **ownership documents** and land records\n• Title disputes often involve civil suits, not just IPC\n• **IPC 447** – Criminal trespass\n• **IPC 379** – Theft of property\n• Document verification against fraud (IPC 420)\n\n📝 **WHAT TO DO:**\n1. Collect ALL documents – sale deed, registry, tax receipts, mutation record\n2. Verify the title through a **property lawyer**\n3. If someone has taken physical possession illegally, it's **criminal trespass** – file complaint\n4. For civil disputes, file a **suit for declaration & injunction**\n5. If there's a real estate dispute with builder, approach **RERA**\n\n🛡️ **TIP:** Always do due diligence on property documents BEFORE purchasing. Consult a lawyer for title verification."
        ]
    },
    sections: {
        patterns: ['section', 'ipc', 'bns', 'what is'],
        extractor: /section\s*(?:ipc\s*)?(\d+[a-zA-Z]?)/i,
        db: {
            '302': { name: 'Punishment for Murder', desc: 'Whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine.' },
            '354': { name: 'Assault or criminal force to woman with intent to outrage her modesty', desc: 'Assault or use of criminal force on a woman with intent to outrage her modesty — imprisonment up to 2 years or fine or both.' },
            '354a': { name: 'Sexual Harassment', desc: 'Unwelcome physical contact, demanding favors, showing pornography — imprisonment up to 3 years or fine or both.' },
            '354d': { name: 'Stalking', desc: 'Following or contacting a woman despite clear indication of disinterest — imprisonment up to 3 years.' },
            '376': { name: 'Punishment for Rape', desc: 'Sexual assault is a serious offense with severe punishment including rigorous imprisonment of at least 10 years and fine.' },
            '420': { name: 'Cheating and Dishonestly Inducing Delivery of Property', desc: 'Cheating and inducing delivery of property — imprisonment up to 7 years and fine.' },
            '323': { name: 'Voluntarily Causing Hurt', desc: 'Voluntarily causing hurt — imprisonment up to 1 year or fine up to ₹1,000 or both.' },
            '506': { name: 'Criminal Intimidation', desc: 'Threatening another with injury to person, reputation or mental harm — imprisonment up to 2 years or fine or both.' },
            '509': { name: 'Word, Gesture Intended to Insult Modesty of a Woman', desc: 'Uttering words or gestures intending to insult modesty of a woman — imprisonment up to 1 year or fine or both.' },
            '379': { name: 'Punishment for Theft', desc: 'Whoever commits theft shall be punished with imprisonment up to 3 years or fine or both.' },
            '306': { name: 'Abetment of Suicide', desc: 'If a person commits suicide, whoever abets the commission shall be punished with imprisonment up to 10 years and fine.' },
            '498a': { name: 'Cruelty by Husband or Relatives of Husband', desc: 'Cruelty by husband or relatives — imprisonment up to 3 years and fine. Also covered under DV Act, 2005.' },
            '384': { name: 'Extortion', desc: 'Putting a person in fear of injury and dishonestly inducing them to deliver property — imprisonment up to 3 years.' },
            '441': { name: 'Criminal Trespass', desc: 'Entering another\'s property with intent to commit an offense or to annoy — imprisonment up to 3 months or fine.' },
            '279': { name: 'Rash Driving or Riding on a Public Way', desc: 'Driving any vehicle on a public way rashly or negligently — imprisonment up to 6 months or fine.' },
            '304a': { name: 'Causing Death by Negligence', desc: 'Causing death by a rash or negligent act not amounting to culpable homicide — imprisonment up to 2 years or fine.' },
            '447': { name: 'Criminal Trespass', desc: 'Whoever commits criminal trespass shall be punished with imprisonment up to 3 months or fine.' },
            '499': { name: 'Defamation', desc: 'Making or publishing imputation concerning any person intending to harm reputation — punishment under IPC 500, up to 2 years.' },
            '354b': { name: 'Assault to Disrobe a Woman', desc: 'Assault to disrobe a woman or compel her to be naked — imprisonment 3 to 7 years and fine.' }
        },
        fallback: "I found the word 'section' but I need the exact number. Try asking like:\n\n• \"What is IPC 506?\"\n• \"Explain section 420\"\n• \"IPC 498A kya hai?\"\n\nOr I can tell you about sections related to: threat 🌪️, blackmail 🔒, domestic violence 🏠, harassment 👤, arrest 🖐️, online fraud 💳."
    },
    emergency_numbers: {
        patterns: ['emergency', 'helpline', 'number', 'call', 'ambulance', 'police number', 'phone number'],
        responses: [
            "📞 **IMPORTANT EMERGENCY NUMBERS:**\n\n🚨 **Emergency:**\n• **112** – National Emergency (all services)\n• **100** – Police\n• **101** – Fire\n• **108** – Ambulance\n• **102** – Ambulance (maternal/child)\n\n👩 **Women & Child:**\n• **1091** – Women Helpline\n• **181** – Women in Distress / Domestic Abuse\n• **1098** – Child Helpline\n\n💳 **Cyber & More:**\n• **1930** – Cyber Crime (online fraud)\n• **155260** – NALSA Legal Aid\n• **104** – Health Helpline\n\n💡 Tip: **112** connects you to the right emergency service automatically based on your need. It works nationwide."
        ]
    },
    legal_aid: {
        patterns: ['lawyer', 'legal aid', 'free lawyer', 'advocate', 'court', 'fir', 'complaint', 'how to file'],
        responses: [
            "⚖️ **LEGAL AID & FILING A COMPLAINT**\n\n👨‍⚖️ **FREE LEGAL AID (Article 39A):**\nIf you cannot afford a lawyer, you have the RIGHT to free legal assistance.\n• Call **15100** (NALSA helpline)\n• Visit your district **Legal Services Authority (DLSA)**\n\n📝 **HIGH COURT / SUPREME COURT:**\n• Supreme Court Legal Aid Committee\n• Every High Court has a Legal Services Authority\n\n🚔 **HOW TO FILE AN FIR:**\n1. Go to the police station where the offense happened\n2. Write your complaint (or the police personnel will help)\n3. The officer MUST register your FIR\n4. You have the right to a **free copy** of the FIR\n\n❌ **IF POLICE REFUSE TO FILE FIR:**\n• Write to the **Superintendent of Police (SP)**\n• Approach the **Judicial Magistrate** (the court can order the police to register the FIR)\n• For important cases you can also complain online or directly to DG of state police\n\n🛡️ You have the right to justice. Don't be afraid to seek it."
        ]
    },
    suicide_help: {
        patterns: ['suicide', 'depress', 'hopeless', 'don\'t want to live', 'end my life', 'no reason to live', 'self harm'],
        responses: [
            "💙 **PLEASE READ THIS** – Your life is precious and you matter.\n\nYou deserve help and support. Please reach out to someone right now:\n\n📞 **24/7 HELPLINES:**\n• **Tele-MANAS:** 14416\n• **KIRAN (mental health):** 1800-599-0019\n• **AASRA:** 91-9820466726\n• **iCall (TISS):** 9152987821\n\nTalk to a trusted friend or family member. There is always hope, even when it doesn't feel like it. You are not alone, and getting help is a sign of strength. 💙\n\nIf you feel you are in immediate danger, please call **112** right now."
        ]
    },
    default: {
        responses: [
            "I'm here to help! 🤖 Here are things I can assist you with:\n\n🛡️ **I'm being threatened** — safety & sections\n🔒 **Blackmail / Extortion** — action to take\n🏠 **Domestic violence** — your rights\n👤 **Harassment / Stalking** — protections\n🖐️ **Someone arrested** — rights\n💳 **Online fraud** — report it\n🚗 **Road accident** — what to do\n🏢 **Property dispute** — guidance\n📜 **IPC sections** — e.g. \"what is IPC 506\"\n📞 **Emergency numbers** — helplines\n\nJust type your situation. I'm here for you. 🙏"
        ]
    }
};

// ====== AI ANSWER ENGINE (OpenAI or Google Gemini) ======
// To enable real AI-generated legal answers, fill in ONE provider below.
//  OPENAI: get a key at https://platform.openai.com/api-keys  -> set PROVIDER='openai'
//  GEMINI: get a key at https://aistudio.google.com/apikey    -> set PROVIDER='gemini'
const AI_CONFIG = {
    PROVIDER: '',        // 'openai' | 'gemini' | '' (disabled)
    OPENAI_API_KEY: '',
    GEMINI_API_KEY: '',
    MODEL_OPENAI: 'gpt-3.5-turbo',
    MODEL_GEMINI: 'gemini-2.0-flash',
    ENABLED: false       // set to true once a provider + key are filled in
};

// Detects whether the user wrote in Hindi / Hinglish / Devanagari script.
function detectLanguage(input) {
    const devanagari = /[\u0900-\u097F]/.test(input);
    const hindiWords = /\b(mai|mein|mujhe|kya|hai|kaise|karu|karun|kya karu|kyu|kyun|nhi|nahi|chahiye|btao|batao|pata|hoti|hota|tha|thi|raha|rahi|ji|fir|dhoka|thag|zabardasti|torture|mara|maro|help chahiye|tension|darr|laga)\b/i.test(input);
    if (devanagari || hindiWords) return 'hi';
    return 'en';
}

// Simple bilingual (Hindi/Hinglish) knowledge-base responses.
const HINDI_KB = {
    greeting: "Namaste! 🙏 Main **Legal Sahayam** hoon, aapka legal sahayak.\n\nMain in chizo me help kar sakta hoon:\n• 🛡️ Koi dhamki / blackmail kar raha hai\n• 🏠 Domestic violence\n• 👤 Harassment ya stalking\n• 🖐️ Aap ya koi arrest hua hai\n• 💳 Online fraud\n• 📜 IPC section samajhna\n• 📞 Emergency numbers\n\nAapko kis cheez me help chahiye?"
};

// ====== QUICK SUGGESTED REPLIES ======
// Returns an array of suggested follow-up chips for the given bot reply.
function getSuggestions(text) {
    const t = text.toLowerCase();
    const suggestions = [];
    if (t.includes('threat') || t.includes('blackmail') || t.includes('domestic') ||
        t.includes('harass') || t.includes('arrest') || t.includes('fraud') ||
        t.includes('accident') || t.includes('property')) {
        suggestions.push('Emergency numbers', 'Free legal aid', 'IPC 506 kya hai?');
    }
    if (t.includes('fir') || t.includes('legal aid') || t.includes('complaint') || t.includes('lawyer')) {
        suggestions.push('How to file an FIR?', 'Free legal aid', 'Emergency numbers');
    }
    if (t.includes('section') || t.includes('ipc') || t.includes('📖')) {
        suggestions.push('What is IPC 420?', 'What is IPC 354?', 'What is IPC 498A?');
    }
    if (t.includes('emergency') || t.includes('helpline') || t.includes('number') || t.includes('📞')) {
        suggestions.push('I am being threatened', 'Online fraud', 'Free legal aid');
    }
    if (!suggestions.length) {
        suggestions.push('I am being threatened', 'Online fraud kya karu?', 'Emergency numbers');
    }
    return suggestions.slice(0, 3);
}

// Calls OpenAI Chat Completions to answer a question with AI.
async function openaiAnswer(question) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + AI_CONFIG.OPENAI_API_KEY
        },
        body: JSON.stringify({
            model: AI_CONFIG.MODEL_OPENAI,
            messages: [
                { role: 'system', content: 'You are Legal Sahayam, a helpful, compassionate Indian legal assistant. Give accurate, practical legal guidance about Indian law (IPC/BNS, fundamental rights, emergency helplines). If the user wrote in Hindi or Hinglish, reply in simple Hindi/Hinglish. Always end by suggesting to consult a qualified lawyer for specific advice.' },
                { role: 'user', content: question }
            ],
            max_tokens: 500
        })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return content ? content.trim() : null;
}

// Calls Google Gemini API to answer a question with AI.
async function geminiAnswer(question) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + AI_CONFIG.MODEL_GEMINI +
        ':generateContent?key=' + encodeURIComponent(AI_CONFIG.GEMINI_API_KEY);
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: 'You are Legal Sahayam, a helpful, compassionate Indian legal assistant. Give accurate, practical legal guidance about Indian law (IPC/BNS, fundamental rights, emergency helplines). If the user wrote in Hindi or Hinglish, reply in simple Hindi/Hinglish. Always end by suggesting to consult a qualified lawyer for specific advice.\n\nUser question: ' + question }]
            }]
        })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    if (!parts || !parts.length) return null;
    const text = parts.map(p => p.text || '').join('').trim();
    return text || null;
}

// Top-level AI entrypoint. Returns a string reply or null if AI is not configured/fails.
async function aiAnswer(question) {
    if (!AI_CONFIG.ENABLED) return null;
    try {
        if (AI_CONFIG.PROVIDER === 'openai' && AI_CONFIG.OPENAI_API_KEY) {
            return await openaiAnswer(question);
        }
        if (AI_CONFIG.PROVIDER === 'gemini' && AI_CONFIG.GEMINI_API_KEY) {
            return await geminiAnswer(question);
        }
    } catch (err) {
        return null;
    }
    return null;
}

// ====== CHATBOT RESPONSE ENGINE ======

function getBotResponse(input) {
    const text = input.toLowerCase();

    // Check suicide / mental health first (safety priority)
    for (const pattern of LEGAL_KB.suicide_help.patterns) {
        if (text.includes(pattern)) return LEGAL_KB.suicide_help.responses[0];
    }

    // Check section lookup first (specific queries)
    const sectionMatch = text.match(/(?:section|ipc|bns)\s*(\d+[a-zA-Z]?)/i) || text.match(/(\d{3}[a-zA-Z]?)\s*(?:section|ipc|bns)/i) || text.match(/ipc\s*(\d+[a-zA-Z]?)/i) || text.match(/bns\s*(\d+[a-zA-Z]?)/i);
    if (sectionMatch) {
        const num = sectionMatch[1].toLowerCase().replace(/^0+/, '');
        const entry = LEGAL_KB.sections.db[num];
        if (entry) {
            return `📖 **${entry.name}** (${entry.code || ''})\n\n"${entry.desc}"\n\nHave another section? Just type \"what is IPC <number>\" and I'll find it! ⚖️`;
        } else {
            return `I couldn't find the exact section **${sectionMatch[1]}** in my database yet, but I can help with common sections like 302, 354, 376, 420, 498A, 506, 384, etc.\n\nOr tell me your situation (e.g. \"I'm being threatened\") and I'll guide you. 🙏`;
        }
    }

    // Check "what is" without section number specifically
    if (text.includes('what is') && !sectionMatch) {
        return LEGAL_KB.sections.fallback;
    }

    // Greeting
    if (LEGAL_KB.greeting.patterns.some(p => text === p || text.startsWith(p))) {
        return LEGAL_KB.greeting.responses[0];
    }

    // Specific categories - check with priority to most specific
    const categories = [
        { key: 'threat', msg: "here because you're feeling threatened" },
        { key: 'blackmail', msg: "for blackmail concern" },
        { key: 'domestic', msg: "for domestic violence" },
        { key: 'harassment', msg: "for harassment/stalking" },
        { key: 'arrest', msg: "for arrest/police custody" },
        { key: 'fraud', msg: "for online fraud/scam" },
        { key: 'accident', msg: "for road accident" },
        { key: 'property', msg: "for property/land dispute" },
        { key: 'emergency_numbers', msg: "for emergency numbers" },
        { key: 'legal_aid', msg: "for legal aid/lawyer help" }
    ];

    for (const cat of categories) {
        if (LEGAL_KB[cat.key].patterns.some(p => text.includes(p))) {
            return LEGAL_KB[cat.key].responses[0];
        }
    }

    // If mentions section/introduction
    if (text.includes('yourself') || text.includes('who are you') || text.includes('what can you do')) {
        return "I'm **Legal Sahayam** ⚖️, your personal legal assistant.\n\nI help people who may not know about the law understand:\n• Their legal rights 🛡️\n• IPC/BNS sections 📖\n• What to do in dangerous situations 🚨\n• Important emergency numbers 📞\n\nTell me what's happening and I'll guide you. You're not alone."
    }

    return LEGAL_KB.default.responses[0];
}

window.LEGAL_KB = LEGAL_KB;
window.getBotResponse = getBotResponse;
window.googleSearchReply = googleSearchReply;
window.GOOGLE_CONFIG = GOOGLE_CONFIG;
