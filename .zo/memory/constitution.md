<!--
Sync Impact Report - Constitution Update
Version change: none → 1.0.0
Modified principles: none (all principles added)
Added sections: Technology Stack Requirements, Development Workflow
Removed sections: none
Templates requiring updates:
- plan-template.md: Constitution Check section needs gates based on principles
- spec-template.md: Ensure specifications align with UX, performance, security principles
- tasks-template.md: Task categorization should reflect principle-driven requirements (UX testing, performance optimization, security reviews)
- README.md: Already aligns with technology stack requirements
Follow-up TODOs: none
-->

# Glean Teleprompter Constitution

## Core Principles

### I. User Experience First

The teleprompter interface must prioritize user experience with intuitive controls, real-time text display, smooth scrolling, and responsive design. All features must be accessible and usable on both desktop and mobile devices.

### II. Performance & Reliability

The application must maintain smooth text scrolling at variable speeds, low-latency audio synchronization, and responsive UI interactions. Reliability includes proper error handling and data persistence.

### III. Security & Privacy

User authentication must be secure using Supabase Auth. All user data must be handled securely, with proper encryption and privacy compliance. No user data should be logged or stored unnecessarily.

### IV. Code Quality & Testing

All code must be written in TypeScript with strict mode enabled. Components must be well-tested with unit and integration tests. Code must follow clean architecture principles with clear separation of concerns.

### V. Technology Standards

The application must use Next.js as the framework, Supabase for authentication and data, Tailwind CSS for styling, and shadcn/ui for UI components. All dependencies must be kept up-to-date and compatible.

## Technology Stack Requirements

The project must use Next.js 14+ with App Router, Supabase for backend services, Tailwind CSS for styling, shadcn/ui for components, and TypeScript for type safety. Deployment must be to Vercel for optimal performance.

## Development Workflow

Development follows Git flow with feature branches, pull request reviews, and automated testing. Code must pass linting, type checking, and tests before merge. Deployment is automated via Vercel.

## Governance

The constitution supersedes all other project guidelines. Amendments require documentation and approval. Constitution versioning follows semantic versioning. All pull requests must verify compliance with constitutional principles.

**Version**: 1.0.0 | **Ratified**: 2025-12-30 | **Last Amended**: 2025-12-30
