# 1.0.0 (2026-01-16)


### Bug Fixes

* add --legacy-peer-deps for npm ci ([5de0dd5](https://github.com/maemreyo/glean-logger/commit/5de0dd53dedeeb1439fde7e80fb4a3d4cade3021))
* **logger:** replace winston fatal with error and simplify implementation ([7b6c9fa](https://github.com/maemreyo/glean-logger/commit/7b6c9fa22197241558547a6ccedb55fb6e0336de))
* remove unused variables in examples to pass lint ([38fe69e](https://github.com/maemreyo/glean-logger/commit/38fe69e853f8ef0e2640efcb1ac052e44681ac5e))
* rename eslint.config.js to eslint.config.mjs for ESM support ([a340c6e](https://github.com/maemreyo/glean-logger/commit/a340c6e0b8458a7a073645a1db7139b6f4aa1956))
* use Node.js 20 for release workflow (semantic-release requires Node 20+) ([1fea787](https://github.com/maemreyo/glean-logger/commit/1fea7876c2c106e56b1cc42aaab92dd381a69be1))


### chore

* rename package to @zaob/glean-logger ([f2ce7f1](https://github.com/maemreyo/glean-logger/commit/f2ce7f16a7f1c68542bd28ff2482e7c8cef4b565))


### Features

* **browser:** implement browser-safe logging with localStorage persistence ([04f292e](https://github.com/maemreyo/glean-logger/commit/04f292e9dec076ade9e36d5f24b25ab1876f0540))
* **examples:** add comprehensive examples directory with 5 demo projects ([3eeb1d0](https://github.com/maemreyo/glean-logger/commit/3eeb1d00828a6bfc73d1995eed645ec230045c7a))
* **examples:** add comprehensive Next.js logging demo with @zaob/glean-logger integration ([027b2a9](https://github.com/maemreyo/glean-logger/commit/027b2a9be105d21730e5d3f30ce1324d45c9cee7))
* **logging:** add response body logging with content-type handling and redaction ([1838ac8](https://github.com/maemreyo/glean-logger/commit/1838ac8c6be4bf51d4e23c7c8089c25cc67584e9))
* **logging:** add winston logger integration and circular reference detection ([9f27410](https://github.com/maemreyo/glean-logger/commit/9f27410c4bd29bf974716f56072e647415055ef6))
* **logging:** implement comprehensive body logging configuration with builder pattern ([8cc9507](https://github.com/maemreyo/glean-logger/commit/8cc95075c525bf2323e2ac91b5df4839216c3aad)), closes [hi#traffic](https://github.com/hi/issues/traffic)
* **logging:** implement comprehensive HTTP body logging with builder pattern ([030b1b4](https://github.com/maemreyo/glean-logger/commit/030b1b4502428d4e1ea9f0ca48165b14cbb7c5d2))
* **logging:** introduce preset configurations for ApiLoggerBuilder ([0b3d09e](https://github.com/maemreyo/glean-logger/commit/0b3d09ef8ca7d982683ffbac3d6ba5c3927919bb))
* setup semantic-release for automated releases ([7d14705](https://github.com/maemreyo/glean-logger/commit/7d147055c5f4182176b7f13aee31962baedc0cd9))


### BREAKING CHANGES

* **logging:** The logging API now requires explicit configuration through ApiLoggerBuilder for body logging features. Previous simple logging approaches need to be migrated to use the new builder pattern.
* **logging:** The body redaction logic has been modified to handle circular references, which may affect existing logging behavior for complex object structures.
* **logging:** The default behavior for multipart/form-data content type has changed from being logged as text to being excluded by default. This aligns with the new content type filtering system and provides better security by default.
* **logging:** Response body logging is now enabled by default with automatic content-type handling and size limits. Binary content is excluded from logging.
* **examples:** This is a new example project and does not affect existing functionality.
* **browser:** The browser logger API has changed from custom implementation to standardized @zaob/glean-logger exports. Existing code using the old client logger will need to be updated to use the new logger() function.
* Package name changed from 'glean-logger' to '@zaob/glean-logger'. Users will need to update their installation and import statements.

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
