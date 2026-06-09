// This script runs in the "Main World" of the page.
// It has access to window.grecaptcha.

console.log("[Jenna] Inject script loaded. Waiting for grecaptcha...");

function findSiteKey() {
    // Attempt 1: If there's an iframe with a sitekey parameter
    const iframes = document.querySelectorAll('iframe[src*="recaptcha/enterprise"]');
    for (const iframe of iframes) {
        const url = new URL(iframe.src);
        const k = url.searchParams.get('k');
        if (k) return k;
    }

    // Attempt 2: If there's an element with a sitekey attribute
    const el = document.querySelector('[data-sitekey]');
    if (el) return el.getAttribute('data-sitekey');

    // Fallback: This is the known sitekey for useapi/labs google flow usually if we can't find it
    return '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV';
}

// No longer polling here. We will wait when requested.

window.addEventListener('message', async (event) => {
    if (event.source !== window || !event.data || event.data.type !== 'JENNA_GENERATE_RECAPTCHA') return;

    const { requestId, count, action } = event.data;
    const tokens = [];
    
    try {
        // Wait up to 10 seconds for grecaptcha to be available
        let waits = 0;
        while ((!window.grecaptcha || !window.grecaptcha.enterprise) && waits < 100) {
            await new Promise(r => setTimeout(r, 100));
            waits++;
        }

        if (!window.grecaptcha || !window.grecaptcha.enterprise) {
            throw new Error("grecaptcha object not found on this page after waiting.");
        }

        const siteKey = findSiteKey();
        if (!siteKey) {
            throw new Error("Could not find reCAPTCHA siteKey on this page.");
        }

        for (let i = 0; i < count; i++) {
            const token = await window.grecaptcha.enterprise.execute(siteKey, { action: action || 'IMAGE_GENERATION' });
            tokens.push(token);
        }

        window.postMessage({
            type: 'JENNA_RECAPTCHA_RESULT',
            requestId: requestId,
            success: true,
            tokens: tokens
        }, '*');

    } catch (err) {
        window.postMessage({
            type: 'JENNA_RECAPTCHA_RESULT',
            requestId: requestId,
            success: false,
            error: err.message
        }, '*');
    }
});
