let workerId = 'zehahahahaha';
let isConnected = false;
let stats = { totalDone: 0, totalFailed: 0 };
let currentJob = null;
let pollTimeout = null;
let heartbeatInterval = null;
let lastToken = '';

let brokerUrl = 'http://localhost:4000';
const VERSION = '2.1.0';

// ─── Initialization ──────────────────────────────────────────────────────────

async function initWorker() {
  const result = await chrome.storage.local.get(['workerId', 'stats', 'brokerUrl']);
  if (result.brokerUrl) {
    brokerUrl = result.brokerUrl;
  }
  if (result.workerId) {
    workerId = result.workerId;
  } else {
    workerId = 'ext-' + Math.random().toString(36).substring(2, 10);
    await chrome.storage.local.set({ workerId });
  }
  if (result.stats) {
    stats = result.stats;
  }

  startHeartbeat();
  startPolling();
}

function updateStats(success) {
  if (success) stats.totalDone++;
  else stats.totalFailed++;
  chrome.storage.local.set({ stats });
  chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', isConnected, stats, workerId, brokerUrl, lastToken });
}

function setConnected(status) {
  isConnected = status;
  chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', isConnected, stats, workerId, brokerUrl, lastToken });
}

// ─── Broker Communication ───────────────────────────────────────────────────

function startHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);

  const sendHeartbeat = async () => {
    try {
      const res = await fetch(`${brokerUrl}/workers/heartbeat`, {
        method: 'POST',
        headers: {
          'X-Worker-ID': workerId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          version: VERSION,
          ua: navigator.userAgent
        })
      });

      if (res.ok) {
        setConnected(true);
      } else {
        setConnected(false);
      }
    } catch (err) {
      setConnected(false);
    }
  };

  sendHeartbeat();
  heartbeatInterval = setInterval(sendHeartbeat, 15000);
}

function startPolling() {
  if (pollTimeout) clearTimeout(pollTimeout);

  const poll = async () => {
    try {
      const res = await fetch(`${brokerUrl}/jobs/next`, {
        headers: { 'X-Worker-ID': workerId }
      });

      if (res.status === 200) {
        const data = await res.json();
        if (data.success && data.job) {
          handleJob(data.job);
          return; // Stop polling while handling job
        }
      }
    } catch (err) {
      // Ignore network errors during polling
    }

    // Poll again after 2 seconds
    pollTimeout = setTimeout(poll, 2000);
  };

  poll();
}

async function reportJobResult(jobId, tokens, errorMsg) {
  try {
    await fetch(`${brokerUrl}/jobs/${jobId}/result`, {
      method: 'POST',
      headers: {
        'X-Worker-ID': workerId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tokens: tokens || [],
        error: errorMsg || null
      })
    });
  } catch (err) {
    console.error('Failed to report result:', err);
  }
}

// ─── Job Execution ──────────────────────────────────────────────────────────

async function handleJob(job) {
  console.log(`[JOB] Received job ${job.id} (count: ${job.count}, action: ${job.action})`);
  currentJob = job;

  try {
    // Find a tab that matches labs.google.com or labs.google
    const tabs1 = await chrome.tabs.query({ url: "https://labs.google.com/*" });
    const tabs2 = await chrome.tabs.query({ url: "https://labs.google/*" });
    const tabs = [...tabs1, ...tabs2];
    
    if (tabs.length === 0) {
      throw new Error("No labs.google tab is open. Please keep a tab open.");
    }

    // Try to execute script in the first matched tab
    const tabId = tabs[0].id;

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: generateTokensInTab,
      args: [job.count, job.action]
    });

    const injectionResult = results[0].result;

    if (injectionResult.success) {
      if (injectionResult.tokens && injectionResult.tokens.length > 0) {
        lastToken = injectionResult.tokens[0];
      }
      await reportJobResult(job.id, injectionResult.tokens, null);
      updateStats(true);
      return injectionResult;
    } else {
      await reportJobResult(job.id, null, injectionResult.error);
      updateStats(false);
      return injectionResult;
    }

  } catch (err) {
    console.error(`[JOB] Error executing job:`, err);
    await reportJobResult(job.id, null, err.message);
    updateStats(false);
    return { success: false, error: err.message };
  } finally {
    currentJob = null;
    startPolling(); // Resume polling
  }
}

// This function is executed INSIDE the target tab's context, but in the Isolated World.
// It communicates with the injected script (Main World) to get the token.
async function generateTokensInTab(count, action) {
  return new Promise((resolve) => {
    // We don't check for readiness anymore, the inject script will wait up to 10s internally.

    const requestId = 'req_' + Math.random().toString(36).substr(2, 9);

    const messageListener = (event) => {
      // Only accept messages from the same window
      if (event.source !== window) return;

      const data = event.data;
      if (data && data.type === 'JENNA_RECAPTCHA_RESULT' && data.requestId === requestId) {
        window.removeEventListener('message', messageListener);
        clearTimeout(timeout);

        if (data.success) {
          resolve({ success: true, tokens: data.tokens });
        } else {
          resolve({ success: false, error: data.error });
        }
      }
    };

    window.addEventListener('message', messageListener);

    // Timeout after 30 seconds
    const timeout = setTimeout(() => {
      window.removeEventListener('message', messageListener);
      resolve({ success: false, error: "Timeout waiting for reCAPTCHA response (30s)." });
    }, 30000);

    // Ask the main world to generate tokens
    window.postMessage({
      type: 'JENNA_GENERATE_RECAPTCHA',
      requestId: requestId,
      count: count,
      action: action
    }, '*');
  });
}

// ─── Listeners ──────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_STATUS') {
    sendResponse({ isConnected, stats, workerId, brokerUrl, lastToken });
  } else if (request.type === 'RECONNECT') {
    startHeartbeat();
    startPolling();
    sendResponse({ success: true });
  } else if (request.type === 'UPDATE_BROKER_URL') {
    brokerUrl = request.url;
    chrome.storage.local.set({ brokerUrl }, () => {
      startHeartbeat();
      startPolling();
      sendResponse({ success: true });
    });
    return true;
  } else if (request.type === 'TRY_GENERATE') {
    // Fake a manual job for testing
    handleJob({ id: 'manual-test', count: 1, action: 'IMAGE_GENERATION' })
      .then((res) => {
        sendResponse(res);
      });
    return true; // Indicate async response
  }
});

// Start up
initWorker();
