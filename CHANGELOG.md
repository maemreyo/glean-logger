# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-16

### Added
- Initial release of glean-logger
- Browser-safe client logging with localStorage persistence
- Winston-based server logging with daily file rotation
- HTTP request/response logging with automatic redaction
- Performance measurement utilities
- Automatic sensitive data redaction
- Environment detection (browser vs server)
- Child logger support for persistent context
- Setup and install scripts for easy integration
- Comprehensive README documentation

### Features
- `logger()` - Main logger factory with auto environment detection
- `child()` - Create child logger with context (server-only)
- `loggedFetch()` - Wrap fetch with automatic logging (server-only)
- `measure()` - Time async operations
- `performance` - Performance utilities

### Logs
- Console output (colored in dev, JSON in prod)
- File rotation: `_logs/combined.YYYY-MM-DD.log`
- File rotation: `_logs/api.YYYY-MM-DD.log`
- File rotation: `_logs/error.YYYY-MM-DD.log`

### Security
- Automatic redaction of sensitive fields (passwords, tokens, credit cards, etc.)
- Configurable redaction via environment variables
