// ============================================
// RIME VS Code Extension - Main Entry Point
// ============================================

import * as vscode from 'vscode';
import { RimePanel } from './rime-panel';
import { RimeAPI } from './api-client';

let rimePanel: RimePanel | undefined;
let apiClient: RimeAPI;

export function activate(context: vscode.ExtensionContext) {
    console.log('RIME extension is now active');

    // Initialize API client
    const config = vscode.workspace.getConfiguration('rime');
    const apiUrl = config.get<string>('apiUrl', 'http://localhost:3001');
    apiClient = new RimeAPI(apiUrl);

    // Register commands
    const commands = [
        vscode.commands.registerCommand('rime.openPanel', () => {
            if (!rimePanel) {
                rimePanel = new RimePanel(context.extensionUri, apiClient);
            }
            rimePanel.show();
        }),

        vscode.commands.registerCommand('rime.explainCode', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor');
                return;
            }

            const selection = editor.selection;
            const text = editor.document.getText(selection);

            if (!text) {
                vscode.window.showWarningMessage('Please select some code first');
                return;
            }

            try {
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'RIME is analyzing your code...',
                    cancellable: false
                }, async () => {
                    const result = await apiClient.submitIntent(`Explain this code: ${text}`);
                    
                    if (result.actions.length > 0) {
                        const action = result.actions[0];
                        vscode.window.showInformationMessage(
                            action.description,
                            'View Details'
                        ).then(selection => {
                            if (selection === 'View Details') {
                                // Show detailed explanation in panel
                                if (!rimePanel) {
                                    rimePanel = new RimePanel(context.extensionUri, apiClient);
                                }
                                rimePanel.showAction(action);
                            }
                        });
                    }
                });
            } catch (error) {
                vscode.window.showErrorMessage(`RIME Error: ${error}`);
            }
        }),

        vscode.commands.registerCommand('rime.fixError', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor');
                return;
            }

            const selection = editor.selection;
            const text = editor.document.getText(selection);

            if (!text) {
                vscode.window.showWarningMessage('Please select the code with errors');
                return;
            }

            try {
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'RIME is finding fixes...',
                    cancellable: false
                }, async () => {
                    const result = await apiClient.submitIntent(`Fix this error: ${text}`);
                    
                    if (result.actions.length > 0) {
                        const action = result.actions[0];
                        const payload = action.payload as any;
                        
                        if (payload?.fixedCode) {
                            const applyFix = await vscode.window.showInformationMessage(
                                action.description,
                                'Apply Fix',
                                'View Details'
                            );

                            if (applyFix === 'Apply Fix') {
                                editor.edit(editBuilder => {
                                    editBuilder.replace(selection, payload.fixedCode);
                                });
                                vscode.window.showInformationMessage('Fix applied!');
                            }
                        }
                    }
                });
            } catch (error) {
                vscode.window.showErrorMessage(`RIME Error: ${error}`);
            }
        }),

        vscode.commands.registerCommand('rime.generateDocs', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor');
                return;
            }

            const selection = editor.selection;
            const text = editor.document.getText(selection);

            if (!text) {
                vscode.window.showWarningMessage('Please select code to document');
                return;
            }

            try {
                const result = await apiClient.submitIntent(`Generate documentation for: ${text}`);
                vscode.window.showInformationMessage('Documentation generated!');
            } catch (error) {
                vscode.window.showErrorMessage(`RIME Error: ${error}`);
            }
        }),

        vscode.commands.registerCommand('rime.searchDocs', async () => {
            const query = await vscode.window.showInputBox({
                prompt: 'What would you like to search for?',
                placeHolder: 'e.g., React hooks, TypeScript generics'
            });

            if (query) {
                try {
                    const result = await apiClient.submitIntent(`Search docs for: ${query}`);
                    
                    if (result.actions.length > 0) {
                        const action = result.actions[0];
                        const payload = action.payload as any;
                        
                        if (payload?.results) {
                            const items = payload.results.map((r: any) => ({
                                label: r.title,
                                detail: r.description,
                                link: r.url
                            }));

                            const selected = await vscode.window.showQuickPick(items, {
                                placeHolder: 'Select a result to open'
                            });

                            if (selected && selected.link) {
                                vscode.env.openExternal(vscode.Uri.parse(selected.link));
                            }
                        }
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(`RIME Error: ${error}`);
                }
            }
        }),
    ];

    // Register CodeLens provider
    const enableCodeLens = config.get<boolean>('enableCodeLens', true);
    if (enableCodeLens) {
        const codeLensProvider = vscode.languages.registerCodeLensProvider(
            [{ scheme: 'file' }, { scheme: 'untitled' }],
            {
                provideCodeLenses(document) {
                    const codeLenses: vscode.CodeLens[] = [];
                    const text = document.getText();
                    
                    // Find function declarations
                    const functionRegex = /(?:function|const|let|var)\s+(\w+)\s*[\(=:]/g;
                    let match;
                    
                    while ((match = functionRegex.exec(text)) !== null) {
                        const line = document.positionAt(match.index).line;
                        const range = new vscode.Range(line, 0, line, 0);
                        
                        codeLenses.push(
                            new vscode.CodeLens(range, {
                                title: '$(hubot) Ask RIME',
                                command: 'rime.explainCode',
                                tooltip: 'Ask RIME about this function'
                            })
                        );
                    }
                    
                    return codeLenses;
                }
            }
        );
        
        context.subscriptions.push(codeLensProvider);
    }

    // Register all commands
    commands.forEach(cmd => context.subscriptions.push(cmd));

    // Register panel provider
    const panelProvider = vscode.window.registerWebviewViewProvider(
        'rimePanel',
        {
            resolveWebviewView(webviewView) {
                if (!rimePanel) {
                    rimePanel = new RimePanel(context.extensionUri, apiClient);
                }
                rimePanel.setWebview(webviewView.webview);
            }
        }
    );
    context.subscriptions.push(panelProvider);

    // Show welcome message
    vscode.window.showInformationMessage(
        'RIME is ready! Press Cmd+Shift+R to open the panel.',
        'Open Panel'
    ).then(selection => {
        if (selection === 'Open Panel') {
            vscode.commands.executeCommand('rime.openPanel');
        }
    });
}

export function deactivate() {
    console.log('RIME extension is now deactivated');
    if (rimePanel) {
        rimePanel.dispose();
        rimePanel = undefined;
    }
}
