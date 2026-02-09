# Contributing to RIME

Thank you for your interest in contributing to RIME! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported
2. Create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, browser, versions)
   - Screenshots if applicable

### Suggesting Features

1. Check if the feature has already been suggested
2. Create a new issue with:
   - Clear use case
   - Proposed solution
   - Alternatives considered

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit with clear messages
6. Push to your fork
7. Open a Pull Request

## Development Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose

### Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/rime.git
cd rime

# Install dependencies
./scripts/setup.sh

# Start development environment
./scripts/dev-start.sh
```

## Project Structure

```
rime/
├── services/
│   ├── core-engine/     # Node.js backend
│   └── screen-service/  # Python screen capture
├── apps/
│   ├── dashboard/       # Next.js web UI
│   ├── vscode-extension/# VS Code extension
│   └── chrome-extension/# Chrome extension
├── shared/
│   └── types/           # Shared TypeScript types
├── infrastructure/      # Docker, CI/CD
└── docs/               # Documentation
```

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint configuration
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Write unit tests for new features

Example:
```typescript
/**
 * Processes user intent and returns actions
 * @param intent - The user intent to process
 * @returns Promise with agent result
 */
async function processIntent(intent: UserIntent): Promise<AgentResult> {
  // Implementation
}
```

### Python

- Follow PEP 8 style guide
- Use type hints
- Add docstrings for functions
- Write unit tests

Example:
```python
def analyze_screenshot(image: bytes) -> VisionAnalysis:
    """
    Analyze screenshot and extract information.
    
    Args:
        image: Screenshot image bytes
        
    Returns:
        VisionAnalysis with extracted information
    """
    # Implementation
```

### CSS/Tailwind

- Use Tailwind utility classes
- Follow mobile-first approach
- Use CSS variables for theming
- Keep specificity low

## Testing

### Unit Tests

```bash
# Core engine
cd services/core-engine
npm test

# Dashboard
cd apps/dashboard
npm test

# Screen service
cd services/screen-service
pytest
```

### Integration Tests

```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run tests
npm run test:integration
```

### E2E Tests

```bash
# Start application
./scripts/dev-start.sh

# Run E2E tests
npm run test:e2e
```

## Commit Messages

Use conventional commits:

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Format code
refactor: Refactor code
test: Add tests
chore: Update build process
```

Example:
```
feat(agents): Add support for custom agents

- Implement plugin system for agents
- Add agent registration API
- Update documentation

Closes #123
```

## Documentation

- Update README.md if changing setup
- Update API.md if changing endpoints
- Update ARCHITECTURE.md if changing structure
- Add JSDoc comments to public APIs

## Review Process

1. All PRs require at least one review
2. CI checks must pass
3. No merge conflicts
4. Follow coding standards
5. Include tests for new features

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Create release branch
4. Run full test suite
5. Create GitHub release
6. Tag with version number

## Areas for Contribution

### High Priority

- [ ] Additional AI agents (Testing, Security, DevOps)
- [ ] Mobile app (React Native)
- [ ] Plugin system for third-party agents
- [ ] Advanced vision capabilities (OCR, element detection)

### Medium Priority

- [ ] More integrations (Jira, Notion, Linear)
- [ ] Enhanced voice control
- [ ] Collaborative features
- [ ] Performance optimizations

### Documentation

- [ ] Tutorial videos
- [ ] Example workflows
- [ ] API client libraries
- [ ] Deployment guides for more platforms

## Questions?

- GitHub Discussions: https://github.com/rime-ai/rime/discussions
- Discord: https://discord.gg/rime
- Email: contributors@rime.ai

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in documentation

Thank you for contributing to RIME! 🧠
