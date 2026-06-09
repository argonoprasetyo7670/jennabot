document.addEventListener('DOMContentLoaded', () => {
  const elStatus = document.getElementById('conn-status');
  const elWorkerId = document.getElementById('worker-id');
  const elStatDone = document.getElementById('stat-done');
  const elStatFail = document.getElementById('stat-fail');
  const btnReconnect = document.getElementById('btn-reconnect');
  const btnTest = document.getElementById('btn-test');
  const inputBrokerUrl = document.getElementById('broker-url');
  const btnSaveUrl = document.getElementById('btn-save-url');
  const txtLastToken = document.getElementById('last-token');

  function updateUI(data) {
    if (!data) return;
    
    if (data.isConnected) {
      elStatus.textContent = 'Connected';
      elStatus.className = 'badge connected';
    } else {
      elStatus.textContent = 'Offline';
      elStatus.className = 'badge disconnected';
    }
    
    if (data.workerId) {
      elWorkerId.textContent = data.workerId;
    }
    
    if (data.stats) {
      elStatDone.textContent = data.stats.totalDone || 0;
      elStatFail.textContent = data.stats.totalFailed || 0;
    }
    
    if (data.brokerUrl && !inputBrokerUrl.value) {
      inputBrokerUrl.value = data.brokerUrl;
    }
    
    if (data.lastToken) {
      txtLastToken.value = data.lastToken;
    }
  }

  // Initial fetch
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    updateUI(response);
  });

  // Listen for background updates
  chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'STATUS_UPDATE') {
      updateUI(request);
    }
  });

  btnReconnect.addEventListener('click', () => {
    btnReconnect.textContent = 'Connecting...';
    btnReconnect.disabled = true;
    chrome.runtime.sendMessage({ type: 'RECONNECT' }, (response) => {
      setTimeout(() => {
        btnReconnect.textContent = 'Reconnect to Broker';
        btnReconnect.disabled = false;
      }, 1000);
    });
  });

  btnTest.addEventListener('click', () => {
    btnTest.textContent = 'Generating...';
    btnTest.disabled = true;
    txtLastToken.value = 'Generating token...';
    chrome.runtime.sendMessage({ type: 'TRY_GENERATE' }, (response) => {
      setTimeout(() => {
        btnTest.textContent = 'Test Generate Token';
        btnTest.disabled = false;
        if (response && response.tokens && response.tokens.length > 0) {
          txtLastToken.value = response.tokens[0];
        } else if (response && response.error) {
          txtLastToken.value = "Error: " + response.error;
        }
      }, 500);
    });
  });

  btnSaveUrl.addEventListener('click', () => {
    const newUrl = inputBrokerUrl.value.trim();
    if (newUrl) {
      btnSaveUrl.textContent = 'Saved!';
      chrome.runtime.sendMessage({ type: 'UPDATE_BROKER_URL', url: newUrl }, () => {
        setTimeout(() => btnSaveUrl.textContent = 'Save', 1000);
      });
    }
  });
});
