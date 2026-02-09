# RIME VS Code Extension

The official VS Code extension for RIME (Recursive Intelligence Multi-Agent Environment).

## Features

- **AI-Powered Code Assistance**: Get instant help with code explanations, error fixes, and documentation generation
- **Real-time Error Detection**: Automatically detect and suggest fixes for errors in your code
- **Inline CodeLens**: See "Ask RIME" annotations above functions and classes
- **Sidebar Panel**: Access RIME's full functionality from a dedicated sidebar panel
- **One-Click Fixes**: Apply suggested fixes directly from the editor

## Requirements

- VS Code 1.85.0 or higher
- RIME Core Engine running (default: http://localhost:3001)

## Installation

1. Install from the VS Code Marketplace (coming soon)
2. Or install from VSIX:
   ```bash
   code --install-extension rime-ai-0.1.0.vsix
   ```

## Configuration

Configure the extension in your VS Code settings:

```json
{
  "rime.apiUrl": "http://localhost:3001",
  "rime.enableAutoFix": true,
  "rime.enableCodeLens": true
}
```

## Usage

### Commands

- `RIME: Open Panel` - Open the RIME sidebar panel
- `RIME: Explain This Code` - Get an explanation of selected code
- `RIME: Fix This Error` - Get fixes for errors in selected code
- `RIME: Generate Documentation` - Generate documentation for selected code
- `RIME: Search Documentation` - Search for documentation

### Keyboard Shortcuts

- `Ctrl+Shift+R` (Cmd+Shift+R on Mac) - Open RIME Panel

### Context Menu

Right-click on selected code to access RIME commands:
- Explain This Code
- Fix This Error

## Development

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Watch for changes
npm run watch

# Open in VS Code
code .
# Press F5 to launch extension development host
```

## Contributing

See [CONTRIBUTING.md](../../docs/CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](../../LICENSE) for details.
