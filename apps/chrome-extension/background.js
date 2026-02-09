// ============================================
// RIME Chrome Extension - Background Script
// ============================================

// Extension state
const state = {
  apiUrl: 'http://localhost:3001',
  isConnected: false,
  pageContext: null,
};

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('RIME extension installed');
  
  // Set default settings
  chrome.storage.sync.set({
    apiUrl: 'http://localhost:3001',
    enableAutoExtract: true,
  });
  
  // Check health on startup
  checkHealth();
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'checkHealth':
      checkHealth().then(sendResponse);
      return true; // Async response
      
    case 'extractPage':
      extractPageContent(sender.tab?.id).then(sendResponse);
      return true;
      
    case 'submitIntent':
      submitIntent(request.query, request.context).then(sendResponse);
      return true;
      
    case 'getPageContext':
      sendResponse({ context: state.pageContext });
      break;
      
    case 'updateSettings':
      updateSettings(request.settings).then(sendResponse);
      return true;
  }
});

// Check RIME server health
async function checkHealth() {
  try {
    const settings = await chrome.storage.sync.get('apiUrl');
    const apiUrl = settings.apiUrl || state.apiUrl;
    
    const response = await fetch(`${apiUrl}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    
    if (response.ok) {
      const data = await response.json();
      state.isConnected = true;
      state.apiUrl = apiUrl;
      return { success: true, data };
    } else {
      state.isConnected = false;
      return { success: false, error: 'Server unhealthy' };
    }
  } catch (error) {
    state.isConnected = false;
    return { success: false, error: error.message };
  }
}

// Extract page content from active tab
async function extractPageContent(tabId) {
  if (!tabId) {
    return { success: false, error: 'No active tab' };
  }
  
  try {
    // Execute content script to extract page data
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // Extract page information
        const pageData = {
          url: window.location.href,
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.content || '',
          headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => ({
            level: h.tagName,
            text: h.textContent?.trim(),
          })),
          codeBlocks: Array.from(document.querySelectorAll('pre, code')).map(cb => ({
            language: cb.className?.match(/language-(\w+)/)?.[1] || 'unknown',
            content: cb.textContent?.trim(),
          })),
          links: Array.from(document.querySelectorAll('a[href]')).map(a => ({
            text: a.textContent?.trim(),
            href: a.href,
          })),
          timestamp: Date.now(),
        };
        
        return pageData;
      },
    });
    
    const pageData = results[0]?.result;
    state.pageContext = pageData;
    
    // Send to RIME server
    if (state.isConnected) {
      await sendPageContextToRIME(pageData);
    }
    
    return { success: true, data: pageData };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Send page context to RIME server
async function sendPageContextToRIME(pageData) {
  try {
    await fetch(`${state.apiUrl}/api/context/browser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pageData),
    });
  } catch (error) {
    console.error('Failed to send page context:', error);
  }
}

// Submit intent to RIME
async function submitIntent(query, context) {
  try {
    const response = await fetch(`${state.apiUrl}/api/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        type: 'natural_language',
        context,
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      return { success: false, error: 'Failed to submit intent' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Update extension settings
async function updateSettings(settings) {
  try {
    await chrome.storage.sync.set(settings);
    if (settings.apiUrl) {
      state.apiUrl = settings.apiUrl;
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Listen for tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const settings = await chrome.storage.sync.get('enableAutoExtract');
  if (settings.enableAutoExtract !== false) {
    await extractPageContent(activeInfo.tabId);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    const settings = await chrome.storage.sync.get('enableAutoExtract');
    if (settings.enableAutoExtract !== false) {
      await extractPageContent(tabId);
    }
  }
});

// Context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'rime-ask',
    title: 'Ask RIME about this',
    contexts: ['selection', 'page'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'rime-ask') {
    const query = info.selectionText || 'Explain this page';
    
    // Open popup with query
    chrome.windows.create({
      url: `popup.html?query=${encodeURIComponent(query)}`,
      type: 'popup',
      width: 400,
      height: 600,
    });
  }
});

console.log('RIME background script loaded');
