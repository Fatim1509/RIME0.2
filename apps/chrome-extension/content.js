// ============================================
// RIME Chrome Extension - Content Script
// ============================================

// Extract page content and send to background script
function extractPageContent() {
  const pageData = {
    url: window.location.href,
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content || '',
    headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => ({
      level: h.tagName,
      text: h.textContent?.trim(),
    })),
    codeBlocks: extractCodeBlocks(),
    links: Array.from(document.querySelectorAll('a[href]')).slice(0, 20).map(a => ({
      text: a.textContent?.trim(),
      href: a.href,
    })),
    pageType: detectPageType(),
    timestamp: Date.now(),
  };
  
  return pageData;
}

// Extract code blocks with language detection
function extractCodeBlocks() {
  const codeBlocks = [];
  
  // Common selectors for code blocks
  const selectors = [
    'pre code',
    'pre',
    '.highlight',
    '.code-block',
    '[class*="code"]',
    'code[class*="language-"]',
    'code[class*="lang-"]',
  ];
  
  document.querySelectorAll(selectors.join(', ')).forEach((el, index) => {
    if (index > 20) return; // Limit to 20 blocks
    
    const className = el.className || '';
    const language = detectLanguage(className, el);
    
    codeBlocks.push({
      language,
      content: el.textContent?.trim() || '',
      element: el.tagName.toLowerCase(),
    });
  });
  
  return codeBlocks;
}

// Detect programming language from class name
function detectLanguage(className, element) {
  // Check class name for language hints
  const langMatch = className.match(/(?:language|lang)-(\w+)/);
  if (langMatch) return langMatch[1];
  
  // Check data attributes
  const dataLang = element.getAttribute('data-language') || 
                   element.getAttribute('data-lang');
  if (dataLang) return dataLang;
  
  // Check parent pre element
  const parent = element.closest('pre');
  if (parent) {
    const parentClass = parent.className || '';
    const parentMatch = parentClass.match(/(?:language|lang)-(\w+)/);
    if (parentMatch) return parentMatch[1];
  }
  
  // Try to detect from content
  const content = element.textContent || '';
  return guessLanguageFromContent(content);
}

// Guess language from code content
function guessLanguageFromContent(content) {
  const patterns = {
    javascript: /\b(const|let|var|function|=>|import|export|require)\b/,
    typescript: /\b(interface|type|:\s*\w+|<\w+>)\b/,
    python: /\b(def|class|import|from|print)\b/,
    java: /\b(public|private|class|void|static)\b/,
    html: /<\/?[a-z][\s\S]*?>/i,
    css: /\{[\s\S]*?[\w-]+\s*:\s*[^;]+;/,
    json: /^\s*[\{\[]/,
    bash: /^(#|\$|\.|\/bin\/|sudo\s)/m,
  };
  
  for (const [lang, pattern] of Object.entries(patterns)) {
    if (pattern.test(content)) return lang;
  }
  
  return 'unknown';
}

// Detect page type
function detectPageType() {
  const url = window.location.href;
  const hostname = window.location.hostname;
  
  if (hostname.includes('github.com')) return 'github';
  if (hostname.includes('stackoverflow.com')) return 'stackoverflow';
  if (hostname.includes('docs.') || hostname.includes('documentation')) return 'documentation';
  if (hostname.includes('medium.com') || hostname.includes('dev.to')) return 'article';
  if (url.includes('/api/') || url.includes('/docs/')) return 'documentation';
  
  return 'generic';
}

// Create floating RIME button
function createFloatingButton() {
  // Check if button already exists
  if (document.getElementById('rime-floating-btn')) return;
  
  const button = document.createElement('button');
  button.id = 'rime-floating-btn';
  button.innerHTML = '🧠';
  button.title = 'Ask RIME';
  
  // Styles
  Object.assign(button.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
    border: 'none',
    cursor: 'pointer',
    fontSize: '24px',
    zIndex: '999999',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  });
  
  // Hover effect
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
    button.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  });
  
  // Click handler
  button.addEventListener('click', () => {
    // Send message to background script
    chrome.runtime.sendMessage({
      action: 'extractPage',
    }, (response) => {
      if (response?.success) {
        // Open popup
        chrome.runtime.sendMessage({
          action: 'openPopup',
          context: response.data,
        });
      }
    });
  });
  
  document.body.appendChild(button);
}

// Highlight code blocks
function highlightCodeBlocks() {
  document.querySelectorAll('pre code').forEach((block) => {
    // Add copy button
    const pre = block.closest('pre');
    if (pre && !pre.querySelector('.rime-copy-btn')) {
      const copyBtn = document.createElement('button');
      copyBtn.className = 'rime-copy-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        padding: 4px 8px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 4px;
        color: inherit;
        font-size: 12px;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s;
      `;
      
      pre.style.position = 'relative';
      pre.appendChild(copyBtn);
      
      pre.addEventListener('mouseenter', () => {
        copyBtn.style.opacity = '1';
      });
      
      pre.addEventListener('mouseleave', () => {
        copyBtn.style.opacity = '0';
      });
      
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(block.textContent || '');
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
        }, 2000);
      });
    }
  });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getPageData':
      sendResponse({ data: extractPageContent() });
      break;
      
    case 'highlightElement':
      const element = document.querySelector(request.selector);
      if (element) {
        element.style.outline = '2px solid #06b6d4';
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          element.style.outline = '';
        }, 3000);
      }
      break;
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Extract and send page content
  const pageData = extractPageContent();
  chrome.runtime.sendMessage({
    action: 'pageLoaded',
    data: pageData,
  });
  
  // Create floating button
  createFloatingButton();
  
  // Highlight code blocks
  highlightCodeBlocks();
});

// Also run immediately if DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  createFloatingButton();
  highlightCodeBlocks();
}

console.log('RIME content script loaded');
