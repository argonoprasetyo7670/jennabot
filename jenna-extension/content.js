// This script runs in the "Isolated World" of the page.
// It injects `inject.js` into the "Main World" so it can access window.grecaptcha.

const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(script);

// Forward messages from background to inject.js
window.addEventListener('message', (event) => {
    // Prevent forwarding unrelated messages
    if (event.source !== window || !event.data || !event.data.type) return;
    
    // We only care if we need to let the page know about JENNA_RECAPTCHA_RESULT,
    // but the background.js is actually the one listening for JENNA_RECAPTCHA_RESULT via chrome.scripting.
    // Wait, background.js executeScript runs in THIS context. So THIS context will receive messages from inject.js
    // and background.js will listen to window 'message' event directly.
    // So content.js only needs to inject the script.
    
    if (event.data.type === 'JENNA_RECAPTCHA_READY') {
        window.__JENNA_RECAPTCHA_READY = true;
    }
});
