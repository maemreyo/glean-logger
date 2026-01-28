---
description: Turn accepted brainstorm ideas into a concrete feature specification with optional UI/UX design.
handoffs:
  - label: Review Spec
    agent: zo.clarify
    prompt: Review this new specification.
  - label: Build Technical Plan
    agent: zo.plan
    prompt: Create a plan for the spec. I am building with...
---

> **Prerequisite Scripts**: This command uses two scripts for context initialization:
>
> ### 1. setup-specify-idea.py
>
> Find brainstorm file and spec template for spec creation.
>
> ```text
> Usage: cd "$(git rev-parse --show-toplevel)" && ZO_DEBUG=1 python3 .zo/scripts/python/setup-specify-idea.py [--json] [brainstorm_file]
>
> OPTIONS:
>   --json, -h          Output results in JSON format
>   brainstorm_file     Optional path to brainstorm file (absolute or relative)
>
> OUTPUTS:
>   JSON object with:
>   - BRAINSTORM_FILE: Path to the brainstorm file
>   - SPEC_TEMPLATE: Path to the spec template
>   - DESIGN_FILE: Path to the design file
>
> BRAINSTORM FILE SEARCH ORDER:
>   1. User-provided path (if specified)
>   2. .zo/brainstorms/ (primary location)
>   3. FEATURE_DIR/brainstorms/ (legacy)
>   4. docs/brainstorms/ (legacy)
>
> EXAMPLES:
>   cd "$(git rev-parse --show-toplevel)" && ZO_DEBUG=1 python3 .zo/scripts/python/setup-specify-idea.py
>   cd "$(git rev-parse --show-toplevel)" && ZO_DEBUG=1 python3 .zo/scripts/python/setup-specify-idea.py --json
>   cd "$(git rev-parse --show-toplevel)" && ZO_DEBUG=1 python3 .zo/scripts/python/setup-specify-idea.py path/to/brainstorm.md
> ```
>
> ### 2. create-feature-from-idea.py
>
> Create a new feature from an idea description.
>
> ```text
> Usage: cd "$(git rev-parse --show-toplevel)" && ZO_DEBUG=1 python3 .zo/scripts/python/create-feature-from-idea.py [--json] [--short-name <name>] [--number N] <feature_description>
>
> OPTIONS:
>   --json              Output in JSON format
>   --short-name <name> Provide a custom short name (2-4 words) for the branch
>   --number N          Specify branch number manually (overrides auto-detection)
>   --help, -h          Show this help message
>   feature_description Feature description (positional argument)
>
> OUTPUTS:
>   JSON object with:
>   - BRANCH_NAME: The created branch name (e.g., 001-user-auth)
>   - SPEC_FILE: Path to the created spec file
>   - FEATURE_NUM: The feature number (e.g., 001)
>
> ENVIRONMENT VARIABLES:
>   - SPECIFY_FEATURE: Set to the branch name
>
> EXAMPLES:
>   python3 create-feature-from-idea.py --json "Add user authentication system" --short-name "user-auth"
>   python3 create-feature-from-idea.py --json "Implement OAuth2 integration for API" --number 5
> ```

## User Input

```text
$ARGUMENTS
```

**Context**: The user wants to convert specific ideas from a brainstorming session into a full Feature Specification.
**Format**: `$ARGUMENTS` typically contains "all" or specific idea IDs (e.g., "1, 3") and optionally:

- `--design` or `-d`: Generate design specification alongside the feature spec
- A brainstorm file path

## Outline

### 1. Context Loading

1.  Run the setup script to find the brainstorm file:
    ```bash
    cd "$(git rev-parse --show-toplevel)" && ZO_DEBUG=1 python3 .zo/scripts/python/setup-specify-idea.py --json $ARGUMENTS
    ```
2.  Parse JSON output to get `BRAINSTORM_FILE`, `SPEC_TEMPLATE`, `DESIGN_FILE`, and check for `--design` flag.
3.  **Read the content** of `BRAINSTORM_FILE` and `SPEC_TEMPLATE`.
4.  **Read** `DESIGN_FILE` if it exists (to understand existing design patterns).
5.  Parse `$ARGUMENTS` for design flag: `--design` or `-d` indicates user wants design specification.

### 2. Idea Extraction & Synthesis

1.  **Parse Selection**: Analyze `$ARGUMENTS` to determine which ideas to select:
    - If "all" or empty: Select ALL ideas marked as "Accepted" or specifically documented in the file.
    - If numbers (e.g., "1, 2"): Select only the ideas matching those IDs in the session log.

2.  **Synthesize Feature Description**:
    - Construct a comprehensive "Feature Description" string by combining the `Title`, `Benefit`, and `Proposal` of all selected ideas.
    - _Virtual Prompt_: "Implement [Idea 1] and [Idea 2]. [Idea 1 Details]. [Idea 2 Details]. The goal is [Combined Benefits]."
    - **Treat this synthesized description exactly as you would the user input in `/zo.specify`.**

### 3. Feature Initialization (Strict Protocol)

Given the synthesized feature description:

1.  **Generate a concise short name** (2-4 words) for the branch (e.g., "idea-name", "feature-set").

2.  **Check for existing branches before creating new one**:

    a. Fetch all remote branches:

    ```bash
    git fetch --all --prune
    ```

    b. Find the highest feature number across ALL branches and specs:
    - Remote branches: `git ls-remote --heads origin | grep -E 'refs/heads/[0-9]{3}-'`
    - Local branches: `git branch | grep -E '^[* ]*[0-9]{3}-'`
    - Specs directories: Check for all directories matching `specs/[0-9]{3}-`

    c. Determine the next available number:
    - Extract all numbers from all three sources
    - Find the highest number N
    - Use N+1 for the new branch number

3.  **Create Branch**:
    - Run `cd "$(git rev-parse --show-toplevel)" && ZO_DEBUG=1 python3 .zo/scripts/python/create-feature-from-idea.py --json --number N+1 --short-name "short-name" "Synthesized Description"`
    - Parse JSON output to get `BRANCH_NAME` and `SPEC_FILE`.

### 4. Specification Generation

1.  **Load template**: Read `.zo/templates/spec-template.md` to understand required sections.

2.  **Drafting**: Write the specification to `SPEC_FILE`:
    - **IMPORTANT**: The file is already initialized with `spec-from-idea.md`.
    - Replace `[FEATURE NAME]` with a descriptive title covering the selected ideas.
    - Replace `[FEATURE BRANCH]` with `BRANCH_NAME`.
    - Replace `[DATE]` with today's date.
    - **Source Context**: `Brainstorm: [BRAINSTORM_FILE] (Ideas: [Selected IDs])`

3.  **Follow this execution flow**:
    1. Parse synthesized feature description
    2. Extract key concepts: actors, actions, data, constraints
    3. For unclear aspects:
       - Make informed guesses based on brainstorm context and industry standards
       - Only mark with [NEEDS CLARIFICATION: specific question] if critical
       - **LIMIT: Maximum 3 [NEEDS CLARIFICATION] markers total**
       - Use brainstorm content to answer when possible
    4. Fill User Scenarios & Testing section
       - Convert each idea's "Proposal" into prioritized User Stories
    5. Generate Functional Requirements
       - Derive from detailed proposal text
       - Each requirement must be testable
    6. Define Success Criteria
       - Derive measurable outcomes from the "Benefit" sections
       - Must be technology-agnostic and verifiable
    7. Identify Key Entities (if data involved)
    8. Document Assumptions made from brainstorm context

### 5. Design System Integration (Optional)

If `--design` or `-d` flag was present in `$ARGUMENTS`:

1.  **Check if design is applicable**:
    - Does the feature have UI components?
    - Are there user interactions that need design?
    - If NO UI/UX involved, skip to validation and inform user.

2.  **Check for Global Design System**:
    - Check if `.zo/design-system.md` exists
    - If exists, read it to understand the global design tokens
    - Extract version number for reference in feature design

3.  **Initialize Design File**:
    - Create `.zo/templates/design-template.md` if not exists (updated to reference global system)
    - Initialize `FEATURE_DIR/design.md` with the template

4.  **Determine Design Strategy**:

    **Case 1: Global Design System EXISTS**

    If `.zo/design-system.md` exists:
    1.  **Reference Global System**: Fill in the global design system reference in `design.md`:
        - Set `**Global Design System**: .zo/design-system.md v[X.X]` with actual version
        - Document that this feature uses the global design system
    2.  **Identify Feature-Specific Needs**:
        - Review the feature spec to identify components not in global system
        - Look for feature-specific layouts or page structures
        - Check if any global tokens need to be overridden for this feature
    3.  **Create Feature-Specific Design**:
        - Only document feature-specific components in `design.md`
        - Reference global tokens instead of duplicating them
        - If feature needs to extend/override global tokens, create `design-extensions.md`
    4.  **Use UI/UX Pro Max for Feature Components** (if applicable):
        - Execute searches only for feature-specific components
        - Skip searches for colors, typography, spacing (use global tokens)
        - Focus on: Product Type, Component Patterns specific to this feature

    **Case 2: No Global Design System**

    If `.zo/design-system.md` does NOT exist:
    1.  **Warn User**: Inform that no global design system exists
    2.  **Recommend**: Suggest creating global design system first with `/zo.design init`
    3.  **Proceed with Feature-Only Design**: Create `design.md` with feature-specific components only
    4.  **Note**: User can create global design system later and update this feature design

5.  **Verification**:

    Review generated `design.md` against quality rules:
    - [ ] **Global System Referenced**: If global system exists, it's properly referenced with version
    - [ ] **No Duplication**: Global tokens (colors, typography, spacing) are NOT duplicated
    - [ ] **Feature-Specific Only**: Only feature-specific components and layouts are documented
    - [ ] **Extensions Separated**: If overrides exist, they're in `design-extensions.md`
    - [ ] **Completeness**: All feature-specific UI elements from spec have guidelines
    - [ ] **Interactions**: Hover, focus, active, disabled states defined (or reference global)
    - [ ] **Accessibility**: Touch targets, keyboard navigation, ARIA support (or reference global)
    - [ ] **Responsive**: Breakpoints defined (or reference global system)

### 6. Specification Quality Validation (Mandatory)

After writing the initial draft, you **MUST** validate it against the quality criteria.

1.  **Create Spec Quality Checklist**: Generate `FEATURE_DIR/checklists/requirements.md` with:

    ```markdown
    # Specification Quality Checklist: [FEATURE NAME]

    **Purpose**: Validate specification completeness and quality before proceeding
    **Created**: [DATE]
    **Feature**: [Link to spec.md]
    **Source**: Derived from Brainstorm Ideas [IDs]

    ## Content Quality

    - [ ] No implementation details (languages, frameworks, APIs)
    - [ ] Focused on user value and business needs
    - [ ] Written for non-technical stakeholders
    - [ ] All mandatory sections completed

    ## Requirement Completeness

    - [ ] No [NEEDS CLARIFICATION] markers remain
    - [ ] Requirements are testable and unambiguous
    - [ ] Success criteria are measurable
    - [ ] Success criteria are technology-agnostic (no implementation details)
    - [ ] All acceptance scenarios are defined
    - [ ] Edge cases are identified
    - [ ] Scope is clearly bounded
    - [ ] Dependencies and assumptions identified

    ## Feature Readiness

    - [ ] All functional requirements have clear acceptance criteria
    - [ ] User scenarios cover primary flows
    - [ ] Feature meets measurable outcomes defined in Success Criteria
    - [ ] No implementation details leak into specification

    ## Design Integration (if --design flag used)

    - [ ] Design specification created at design.md
    - [ ] Global design system referenced with version (if exists)
    - [ ] No duplication of global tokens (colors, typography, spacing, icons)
    - [ ] Feature-specific components documented (not global components)
    - [ ] Feature-specific layouts documented (not standard layouts)
    - [ ] Design extensions created in separate file if overrides needed
    - [ ] Interactive states defined or reference global states
    - [ ] Accessibility requirements met or reference global standards
    - [ ] Responsive breakpoints reference global system (if exists)

    ## Notes

    - Items marked incomplete require spec updates before `/zo.clarify` or `/zo.plan`
    - Design integration can be added later with `/zo.design` if not done now
    ```

2.  **Run Validation Check**:
    - Review the spec against each checklist item
    - Document specific issues found (quote relevant spec sections)

3.  **Handle Validation Results**:
    - **If all items pass**: Mark checklist complete and proceed to completion

    - **If items fail (excluding [NEEDS CLARIFICATION])**:
      1. List the failing items and specific issues
      2. Update the spec to address each issue
      3. Re-run validation until all items pass (max 3 iterations)
      4. If still failing after 3 iterations, document remaining issues in checklist notes

    - **If [NEEDS CLARIFICATION] markers remain**:
      1. Extract all [NEEDS CLARIFICATION: ...] markers from the spec
      2. **LIMIT CHECK**: If more than 3 markers exist, keep only the 3 most critical (by scope/security/UX impact)
      3. Use brainstorm content to answer when possible
      4. For remaining clarifications (max 3), make informed assumptions and document in Assumptions section
      5. Re-run validation after all clarifications are resolved

4.  **Update Checklist**: Mark items as passed/failed after each validation iteration.

### 7. Completion

Report completion with:

- Branch: `BRANCH_NAME`
- Spec: `SPEC_FILE`
- Design: `FEATURE_DIR/design.md` (if --design was used)
- Source: Ideas [IDs] from `BRAINSTORM_FILE`
- Checklist: `FEATURE_DIR/checklists/requirements.md`
- Readiness: "Spec generated and validated. Ready for `/zo.clarify` or `/zo.plan`."

## General Guidelines

### Quick Guidelines

- Focus on **WHAT** users need and **WHY**
- Avoid HOW to implement (no tech stack, APIs, code structure)
- Written for business stakeholders, not developers
- Leverage brainstorm content to answer clarification questions
- DO NOT create checklists that are embedded in the spec

### Section Requirements

- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation from Brainstorm

When creating this spec from brainstorm ideas:

1. **Use brainstorm context**: Ideas often contain rich context for filling gaps
2. **Synthesize multiple ideas**: When selecting multiple ideas, combine them coherently
3. **Document assumptions**: Record reasonable defaults in the Assumptions section
4. **Limit clarifications**: Maximum 3 [NEEDS CLARIFICATION] markers - use brainstorm content first
5. **Prioritize clarifications**: scope > security/privacy > user experience > technical details
6. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist

### Success Criteria Guidelines

Success criteria must be:

1. **Measurable**: Include specific metrics (time, percentage, count, rate)
2. **Technology-agnostic**: No mention of frameworks, languages, databases, or tools
3. **User-focused**: Describe outcomes from user/business perspective
4. **Verifiable**: Can be tested/validated without knowing implementation details

**Good examples**:

- "Users can complete checkout in under 3 minutes"
- "System supports 10,000 concurrent users"
- "95% of searches return results in under 1 second"
- "Task completion rate improves by 40%"

**Bad examples** (implementation-focused):

- "API response time is under 200ms"
- "Database can handle 1000 TPS"
- "React components render efficiently"
- "Redis cache hit rate above 80%"

### Design Integration Guidelines

When using the `--design` flag:

1. **Check for Global Design System**: Always check if `.zo/design-system.md` exists first
2. **Reference Global System**: If global system exists, reference it with version number in feature design
3. **Avoid Duplication**: Do NOT duplicate global tokens (colors, typography, spacing, icons) in feature design
4. **Document Feature-Specific Only**: Only document components and layouts that are unique to this feature
5. **Use Extensions for Overrides**: If feature needs to override global tokens, create `design-extensions.md`
6. **Use UI/UX Pro Max**: For feature-specific components, use search scripts - don't guess design patterns
7. **Verify Completeness**: Ensure all feature-specific UI elements from spec have guidelines
8. **Leverage Brainstorm Context**: Brainstorm ideas often contain design hints and preferences

**Global Design System Reference**:

- If `.zo/design-system.md` exists: Reference it as `**Global Design System**: .zo/design-system.md v[X.X]`
- If NOT exists: Warn user and recommend creating with `/zo.design init`
- Feature designs should only contain feature-specific components and layouts
