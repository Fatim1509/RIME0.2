// ============================================
// RIME VS Code Extension - Webview Panel
// ============================================

import * as vscode from 'vscode';
import { RimeAPI } from './api-client';

export class RimePanel {
    private panel: vscode.WebviewPanel | undefined;
    private webview: vscode.Webview | undefined;
    private extensionUri: vscode.Uri;
    private apiClient: RimeAPI;

    constructor(extensionUri: vscode.Uri, apiClient: RimeAPI) {
        this.extensionUri = extensionUri;
        this.apiClient = apiClient;
    }

    show() {
        if (this.panel) {
            this.panel.reveal();
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'rime',
            'RIME',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [this.extensionUri],
            }
        );

        this.webview = this.panel.webview;
        this.updateContent();

        this.panel.onDidDispose(() => {
            this.panel = undefined;
            this.webview = undefined;
        });

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'submitIntent':
                        await this.handleSubmitIntent(message.text);
                        break;
                    case 'approveAction':
                        await this.handleApproveAction(message.actionId);
                        break;
                    case 'rejectAction':
                        await this.handleRejectAction(message.actionId);
                        break;
                    case 'checkHealth':
                        await this.handleCheckHealth();
                        break;
                }
            }
        );
    }

    setWebview(webview: vscode.Webview) {
        this.webview = webview;
        this.updateContent();
    }

    showAction(action: any) {
        if (this.webview) {
            this.webview.postMessage({
                type: 'showAction',
                action,
            });
        }
    }

    dispose() {
        this.panel?.dispose();
    }

    private updateContent() {
        if (!this.webview) return;

        this.webview.html = this.getHtmlContent();
    }

    private getHtmlContent(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RIME</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: var(--vscode-font-family);
            background: var(--vscode-editor-background);
            color: var(--vscode-foreground);
            padding: 16px;
        }
        
        .header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .logo {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #06b6d4, #8b5cf6);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
        }
        
        .title {
            font-size: 18px;
            font-weight: 600;
        }
        
        .subtitle {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        
        .input-container {
            position: relative;
            margin-bottom: 20px;
        }
        
        .input {
            width: 100%;
            padding: 12px 16px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            font-size: 14px;
            outline: none;
        }
        
        .input:focus {
            border-color: var(--vscode-focusBorder);
        }
        
        .input::placeholder {
            color: var(--vscode-input-placeholderForeground);
        }
        
        .quick-actions {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin-bottom: 20px;
        }
        
        .quick-action {
            padding: 10px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            text-align: left;
            transition: background 0.2s;
        }
        
        .quick-action:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        
        .section {
            margin-bottom: 20px;
        }
        
        .section-title {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 8px;
        }
        
        .action-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .action-item {
            padding: 12px;
            background: var(--vscode-list-hoverBackground);
            border-radius: 6px;
            border-left: 3px solid var(--vscode-focusBorder);
        }
        
        .action-title {
            font-size: 13px;
            font-weight: 500;
            margin-bottom: 4px;
        }
        
        .action-description {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        
        .action-buttons {
            display: flex;
            gap: 8px;
            margin-top: 8px;
        }
        
        .btn {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            font-size: 11px;
            cursor: pointer;
            transition: opacity 0.2s;
        }
        
        .btn:hover {
            opacity: 0.8;
        }
        
        .btn-primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .status {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px;
            background: var(--vscode-statusBar-background);
            border-radius: 6px;
            margin-top: 20px;
        }
        
        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #22c55e;
        }
        
        .status-dot.disconnected {
            background: #ef4444;
        }
        
        .status-text {
            font-size: 12px;
        }
        
        .loading {
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .loading.active {
            display: flex;
        }
        
        .spinner {
            width: 24px;
            height: 24px;
            border: 2px solid var(--vscode-panel-border);
            border-top-color: var(--vscode-focusBorder);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">🧠</div>
        <div>
            <div class="title">RIME</div>
            <div class="subtitle">AI Command Center</div>
        </div>
    </div>
    
    <div class="input-container">
        <input 
            type="text" 
            class="input" 
            id="queryInput"
            placeholder="What would you like RIME to do?"
        />
    </div>
    
    <div class="quick-actions">
        <button class="quick-action" onclick="sendCommand('Explain this code')">
            💡 Explain Code
        </button>
        <button class="quick-action" onclick="sendCommand('Fix this error')">
            🔧 Fix Error
        </button>
        <button class="quick-action" onclick="sendCommand('Search documentation')">
            📚 Search Docs
        </button>
        <button class="quick-action" onclick="sendCommand('Generate documentation')">
            📝 Generate Docs
        </button>
    </div>
    
    <div class="section">
        <div class="section-title">Actions</div>
        <div class="action-list" id="actionList">
            <div class="action-item">
                <div class="action-description">No actions yet. Use the input above or quick actions to get started.</div>
            </div>
        </div>
    </div>
    
    <div class="loading" id="loading">
        <div class="spinner"></div>
    </div>
    
    <div class="status">
        <div class="status-dot" id="statusDot"></div>
        <span class="status-text" id="statusText">Connecting...</span>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        // Handle input
        document.getElementById('queryInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const text = e.target.value;
                if (text.trim()) {
                    sendCommand(text);
                    e.target.value = '';
                }
            }
        });
        
        function sendCommand(text) {
            showLoading(true);
            vscode.postMessage({
                command: 'submitIntent',
                text: text
            });
        }
        
        function approveAction(actionId) {
            vscode.postMessage({
                command: 'approveAction',
                actionId: actionId
            });
        }
        
        function rejectAction(actionId) {
            vscode.postMessage({
                command: 'rejectAction',
                actionId: actionId
            });
        }
        
        function showLoading(show) {
            document.getElementById('loading').classList.toggle('active', show);
        }
        
        function addAction(action) {
            const actionList = document.getElementById('actionList');
            
            // Clear empty state if present
            if (actionList.children.length === 1 && 
                actionList.children[0].querySelector('.action-description').textContent.includes('No actions yet')) {
                actionList.innerHTML = '';
            }
            
            const actionEl = document.createElement('div');
            actionEl.className = 'action-item';
            actionEl.innerHTML = \`
                <div class="action-title">\${action.title}</div>
                <div class="action-description">\${action.description}</div>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="approveAction('\${action.id}')">Approve</button>
                    <button class="btn btn-secondary" onclick="rejectAction('\${action.id}')">Reject</button>
                </div>
            \`;
            actionList.prepend(actionEl);
        }
        
        // Handle messages from extension
        window.addEventListener('message', (event) => {
            const message = event.data;
            
            switch (message.type) {
                case 'showAction':
                    showLoading(false);
                    addAction(message.action);
                    break;
                case 'health':
                    const dot = document.getElementById('statusDot');
                    const text = document.getElementById('statusText');
                    if (message.status === 'healthy') {
                        dot.classList.remove('disconnected');
                        text.textContent = 'Connected';
                    } else {
                        dot.classList.add('disconnected');
                        text.textContent = 'Disconnected';
                    }
                    break;
            }
        });
        
        // Check health on load
        vscode.postMessage({ command: 'checkHealth' });
    </script>
</body>
</html>`;
    }

    private async handleSubmitIntent(text: string) {
        try {
            const result = await this.apiClient.submitIntent(text);
            
            if (this.webview) {
                this.webview.postMessage({
                    type: 'actions',
                    actions: result.actions,
                });
            }
        } catch (error) {
            if (this.webview) {
                this.webview.postMessage({
                    type: 'error',
                    message: String(error),
                });
            }
        }
    }

    private async handleApproveAction(actionId: string) {
        try {
            await this.apiClient.approveAction(actionId);
            vscode.window.showInformationMessage('Action approved!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to approve: ${error}`);
        }
    }

    private async handleRejectAction(actionId: string) {
        try {
            await this.apiClient.rejectAction(actionId);
            vscode.window.showInformationMessage('Action rejected');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to reject: ${error}`);
        }
    }

    private async handleCheckHealth() {
        try {
            const health = await this.apiClient.checkHealth();
            
            if (this.webview) {
                this.webview.postMessage({
                    type: 'health',
                    status: health.status,
                });
            }
        } catch (error) {
            if (this.webview) {
                this.webview.postMessage({
                    type: 'health',
                    status: 'unhealthy',
                });
            }
        }
    }
}
