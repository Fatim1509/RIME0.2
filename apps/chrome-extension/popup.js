// ============================================
// RIME Chrome Extension - Popup Script
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const queryInput = document.getElementById('queryInput');
  const pageTitle = document.getElementById('pageTitle');
  const pageUrl = document.getElementById('pageUrl');
  const pageType = document.getElementById('pageType');
  const actionsContainer = document.getElementById('actions');
  const loading = document.getElementById('loading');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const apiUrlInput = document.getElementById('apiUrlInput');
  const autoExtractToggle = document.getElementById('autoExtractToggle');
  const saveSettings = document.getElementById('saveSettings');

  // State
  let pageContext = null;
  let isConnected = false;

  // Load settings
  const settings = await chrome.storage.sync.get(['apiUrl', 'enableAutoExtract']);
  if (settings.apiUrl) {
    apiUrlInput.value = settings.apiUrl;
  }
  if (settings.enableAutoExtract === false) {
    autoExtractToggle.classList.remove('active');
  }

  // Check health
  checkHealth();

  // Get current page info
  getCurrentPageInfo();

  // Event listeners
  queryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      submitIntent(e.target.value.trim());
      e.target.value = '';
    }
  });

  // Quick action buttons
  document.querySelectorAll('.quick-action').forEach(btn => {
    btn.addEventListener('click', () => {
      const query = btn.dataset.query;
      if (query) {
        submitIntent(query);
      }
    });
  });

  // Settings toggle
  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('active');
  });

  // Auto-extract toggle
  autoExtractToggle.addEventListener('click', () => {
    autoExtractToggle.classList.toggle('active');
  });

  // Save settings
  saveSettings.addEventListener('click', async () => {
    const newSettings = {
      apiUrl: apiUrlInput.value,
      enableAutoExtract: autoExtractToggle.classList.contains('active'),
    };
    
    await chrome.storage.sync.set(newSettings);
    
    // Send to background script
    chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings: newSettings,
    });
    
    settingsPanel.classList.remove('active');
    checkHealth();
  });

  // Functions
  async function checkHealth() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'checkHealth' });
      
      if (response?.success) {
        isConnected = true;
        statusDot.classList.remove('disconnected');
        statusText.textContent = 'Connected to RIME';
      } else {
        isConnected = false;
        statusDot.classList.add('disconnected');
        statusText.textContent = 'Not connected';
      }
    } catch (error) {
      isConnected = false;
      statusDot.classList.add('disconnected');
      statusText.textContent = 'Connection error';
    }
  }

  async function getCurrentPageInfo() {
    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab) {
        pageTitle.textContent = tab.title || 'Unknown';
        pageUrl.textContent = tab.url || '-';
        pageType.textContent = detectPageType(tab.url);
        
        // Extract page content
        const response = await chrome.runtime.sendMessage({ action: 'extractPage' });
        if (response?.success) {
          pageContext = response.data;
        }
      }
    } catch (error) {
      console.error('Failed to get page info:', error);
    }
  }

  function detectPageType(url) {
    if (!url) return 'Unknown';
    if (url.includes('github.com')) return 'GitHub';
    if (url.includes('stackoverflow.com')) return 'Stack Overflow';
    if (url.includes('docs.')) return 'Documentation';
    if (url.includes('medium.com') || url.includes('dev.to')) return 'Article';
    return 'Web Page';
  }

  async function submitIntent(query) {
    if (!isConnected) {
      showError('Not connected to RIME server');
      return;
    }

    showLoading(true);

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'submitIntent',
        query,
        context: pageContext,
      });

      showLoading(false);

      if (response?.success) {
        displayActions(response.data.actions);
      } else {
        showError(response?.error || 'Failed to submit intent');
      }
    } catch (error) {
      showLoading(false);
      showError(error.message);
    }
  }

  function displayActions(actions) {
    if (!actions || actions.length === 0) {
      actionsContainer.innerHTML = `
        <div class="action-item">
          <div class="action-description">No actions returned</div>
        </div>
      `;
      return;
    }

    actionsContainer.innerHTML = actions.map(action => `
      <div class="action-item" data-action-id="${action.id}">
        <div class="action-title">${action.title}</div>
        <div class="action-description">${action.description}</div>
        ${action.status === 'pending' ? `
          <div class="action-buttons">
            <button class="btn btn-primary" onclick="approveAction('${action.id}')">Approve</button>
            <button class="btn btn-secondary" onclick="rejectAction('${action.id}')">Reject</button>
          </div>
        ` : `
          <div class="action-description" style="margin-top: 8px; color: #22c55e;">
            Status: ${action.status}
          </div>
        `}
      </div>
    `).join('');
  }

  function showLoading(show) {
    loading.classList.toggle('active', show);
  }

  function showError(message) {
    actionsContainer.innerHTML = `
      <div class="action-item" style="border-left-color: #ef4444;">
        <div class="action-title" style="color: #ef4444;">Error</div>
        <div class="action-description">${message}</div>
      </div>
    `;
  }

  // Make action handlers global
  window.approveAction = async (actionId) => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'approveAction',
        actionId,
      });
      
      if (response?.success) {
        checkHealth(); // Refresh
      }
    } catch (error) {
      showError(error.message);
    }
  };

  window.rejectAction = async (actionId) => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'rejectAction',
        actionId,
      });
      
      if (response?.success) {
        checkHealth(); // Refresh
      }
    } catch (error) {
      showError(error.message);
    }
  };
});
