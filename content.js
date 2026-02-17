/**
 * content.js - GDPR Swiss Army Knife (v2.0)
 * Ultimate compliance validation engine.
 */

function performGDPRScan() {
    console.log('Lexia v2.1: Deep Analysis active.');

    const results = {
        score: 100,
        checks: []
    };

    // Helper to add findings
    const addCheck = (key, label, status, detail, severity = 0) => {
        results.checks.push({ key, label, status, detail });
        if (status === 'crit') results.score -= severity;
        else if (status === 'warn') results.score -= (severity / 2);
    };

    const resources = performance.getEntriesByType('resource');
    const scripts = Array.from(document.querySelectorAll('script'));
    const linkTags = Array.from(document.querySelectorAll('link'));
    const iFrames = Array.from(document.querySelectorAll('iframe'));
    const pageSource = document.documentElement.innerHTML;
    const bodyText = document.body.innerText;

    // --- 1. GOOGLE FONTS (Ultimate) ---
    const fontHosts = ['fonts.googleapis.com', 'fonts.gstatic.com'];
    let fontFound = false;
    let fontMethod = '';

    // Resource Check
    resources.forEach(res => {
        if (fontHosts.some(host => res.name.includes(host))) {
            fontFound = true;
            fontMethod = 'Network';
        }
    });
    // DOM Check
    if (!fontFound) {
        if (fontHosts.some(host => pageSource.includes(host))) {
            fontFound = true;
            fontMethod = 'Source Code';
        }
    }

    if (fontFound) {
        addCheck('fonts', 'Google Fonts', 'crit', `External fonts detected (${fontMethod}). Loading from third-party servers transfers IP addresses.`, 30);
    } else {
        addCheck('fonts', 'Google Fonts', 'ok', 'No external Google Fonts found.');
    }

    // --- 2. TRACKING & ANALYTICS ---
    const trackingPatterns = [
        { name: 'Google Analytics', pattern: /gtag|ga\.js|analytics\.js|googletagmanager/ },
        { name: 'Facebook Pixel', pattern: /fbevents\.js|connect\.facebook\.net/ },
        { name: 'Matomo', pattern: /matomo\.js|piwik\.js/ },
        { name: 'Hotjar', pattern: /hotjar\.com/ },
        { name: 'LinkedIn Insight', pattern: /snap\.licdn\.com/ }
    ];

    let foundTrackers = [];
    trackingPatterns.forEach(t => {
        const inScripts = scripts.some(s => t.pattern.test(s.src) || t.pattern.test(s.textContent));
        const inResources = resources.some(r => t.pattern.test(r.name));
        if (inScripts || inResources) foundTrackers.push(t.name);
    });

    if (foundTrackers.length > 0) {
        addCheck('tracking', 'Tracking & Analytics', 'crit', `Active trackers: ${foundTrackers.join(', ')}. Consent required.`, 40);
    } else {
        addCheck('tracking', 'Tracking & Analytics', 'ok', 'No known tracking scripts found.');
    }

    // --- 3. CDN & EXTERNAL HOSTS (New v2.0) ---
    const cdnPatterns = ['cdnjs.cloudflare.com', 'unpkg.com', 'jsdelivr.net', 'bootstrapcdn.com', 'ajax.googleapis.com'];
    let foundCDNs = [];
    resources.forEach(res => {
        cdnPatterns.forEach(p => {
            if (res.name.includes(p) && !foundCDNs.includes(p)) foundCDNs.push(p);
        });
    });

    if (foundCDNs.length > 0) {
        addCheck('cdn', 'External CDNs', 'crit', `Resources loaded from CDNs: ${foundCDNs.join(', ')}. IP consent required.`, 20);
    } else {
        addCheck('cdn', 'External CDNs', 'ok', 'No external library CDNs detected.');
    }

    // --- 4. THIRD-PARTY EMBEDS (New v2.0) ---
    const embedPatterns = [
        { name: 'YouTube', pattern: /youtube\.com|youtu\.be/ },
        { name: 'Vimeo', pattern: /vimeo\.com/ },
        { name: 'Google Maps', pattern: /google\.com\/maps/ }
    ];
    let foundEmbeds = [];
    iFrames.forEach(f => {
        embedPatterns.forEach(e => {
            if (e.pattern.test(f.src)) foundEmbeds.push(e.name);
        });
    });

    if (foundEmbeds.length > 0) {
        addCheck('embeds', 'Media Embeds', 'warn', `External media found: ${foundEmbeds.join(', ')}. Two-click solution recommended.`, 10);
    } else {
        addCheck('embeds', 'Media Embeds', 'ok', 'No external video/map embeds found.');
    }

    // --- 5. LEGAL LINKS (Imprint & Privacy) ---
    const impressumTerms = ['impressum', 'legal notice', 'legal disclosure', 'rechtliches'];
    const privacyTerms = ['datenschutz', 'privacy policy', 'datenschutzerklärung'];

    const hasTerm = (terms) => {
        return Array.from(document.querySelectorAll('a')).some(link => {
            const text = link.innerText.toLowerCase();
            const href = link.href.toLowerCase();
            return terms.some(t => text.includes(t) || href.includes(t));
        });
    };

    const impressumOk = hasTerm(impressumTerms);
    const privacyOk = hasTerm(privacyTerms);

    if (impressumOk) {
        addCheck('impressum', 'Legal Notice', 'ok', 'Legal notice link detected.');
    } else {
        addCheck('impressum', 'Legal Notice', 'crit', 'No legal notice/imprint found!', 20);
    }

    if (privacyOk) {
        addCheck('privacy', 'Privacy Policy', 'ok', 'Privacy policy detected.');
    } else {
        addCheck('privacy', 'Privacy Policy', 'crit', 'No privacy policy found!', 20);
    }

    // --- 6. COOKIES & STORAGE (New v2.0) ---
    let cookieCount = 0;
    let storageCount = 0;
    try {
        cookieCount = document.cookie ? document.cookie.split(';').length : 0;
        storageCount = (typeof localStorage !== 'undefined' ? localStorage.length : 0) +
            (typeof sessionStorage !== 'undefined' ? sessionStorage.length : 0);
    } catch (e) {
        console.warn('Lexia: Access to cookies/storage denied.');
    }

    if (cookieCount > 5 || storageCount > 5) {
        addCheck('storage', 'Storage & Cookies', 'warn', `${cookieCount} cookies and ${storageCount} storage items active. Check for consent requirement.`, 5);
    } else {
        addCheck('storage', 'Storage & Cookies', 'ok', 'Low number of cookies/storage items.');
    }

    // Clamp score
    results.score = Math.max(0, results.score);

    return results;
}

// listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getGDPRResults") {
        sendResponse(performGDPRScan());
    }
    return true;
});
