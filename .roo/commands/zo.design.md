---
description: Manage the global design system for the project (single source of truth).
handoffs:
  - label: Review Design System
    agent: zo.clarify
    prompt: Review this global design system.
---

## User Input

```text
$ARGUMENTS
```

**Modes**:

- No argument or `"global"` → Manage/update global design system (`.zo/design-system.md`)
- `"init"` → Initialize global design system for first time
- Feature name → Create feature-specific design that references global system

**Context**: This command manages the **global design system** (`.zo/design-system.md`) which is the single source of truth for all design tokens across the entire project. Feature-specific designs (`specs/XXX-feature/design.md`) should only contain feature-specific components and reference the global system.

## Instructions

### 1. Mode Detection

Parse `$ARGUMENTS` to determine the mode:

1. **Init Mode** (argument is `"init"` or `"initialize"`):
   - Create new global design system at `.zo/design-system.md`
   - Use UI/UX Pro Max to research and define initial design tokens

2. **Global Mode** (no argument, `"global"`, or `"update"`):
   - Load existing `.zo/design-system.md`
   - Update or expand the global design system

3. **Feature Mode** (argument is a feature name or path):
   - NOT IMPLEMENTED in this command
   - Use `/zo.specify --design` or `/zo.specify.idea --design` for feature designs

### 2. Context Loading

1. **For Init/Global modes**:
   - Check if `.zo/design-system.md` exists
   - If exists, read current global design system
   - If init mode and doesn't exist, proceed to create new

2. **Check for existing design system references**:
   ```bash
   # Check if any feature designs reference a global system
   grep -r "global design system\|\.zo/design-system" specs/ --include="*.md" 2>/dev/null || echo "No references found"
   ```

### 3. Design System Management (Global Mode)

#### 3.1 Load Template

Read `.zo/templates/design-system-template.md` if it exists. Otherwise use this structure:

```markdown
# Global Design System

**Project**: [PROJECT_NAME]
**Version**: [VERSION]
**Last Updated**: [DATE]
**Status**: [DRAFT | PUBLISHED]

---

## Design Philosophy

[Overall design principles and philosophy]

---

## Color Palette

### Brand Colors (App-wide)

### Semantic Colors (App-wide)

### Neutral Colors (App-wide)

### Light Mode Colors

### Dark Mode Colors

---

## Typography

### Font Families

### Type Scale

### Font Weights

### Line Heights

---

## Component Library

### Global Components

### Component Variants

---

## Icon System

### Icon Library

### Icon Sizes

### Icon Colors

---

## Spacing System

### Spacing Scale

### Layout Grid

---

## Elevation & Shadows

### Shadow Levels

### Z-Index Scale

---

## Border Radius

### Radius Scale

---

## Animation & Transitions

### Timing Functions

### Duration Scale

### Easing Curves

---

## Accessibility Standards

### Color Contrast Requirements

### Touch Target Sizes

### Keyboard Navigation

### Screen Reader Support

---

## Responsive Breakpoints

### Breakpoint Scale

### Container Widths

---

## Design Tokens Reference

### CSS Custom Properties

### Tailwind Config

### Export Formats

---

## Version History

| Version | Date | Changes | Author |
| ------- | ---- | ------- | ------ |
```

#### 3.2 Use UI/UX Pro Max for Research

If creating or updating the global design system:

**Step 3.2.1: Analyze & Search**

Based on project type and requirements, execute searches:

1. **Project Type/Domain**:

   ```bash
   cd "$(git rev-parse --show-toplevel)" && python3 .zo/system/ui-ux-pro-max/scripts/search.py "[project-type]" --domain product
   ```

2. **Style & Aesthetics**:

   ```bash
   cd "$(git rev-parse --show-toplevel)" && python3 .zo/system/ui-ux-pro-max/scripts/search.py "[desired-mood]" --domain style
   ```

3. **Typography**:

   ```bash
   cd "$(git rev-parse --show-toplevel)" && python3 .zo/system/ui-ux-pro-max/scripts/search.py "[mood]" --domain typography
   ```

4. **Color Palette**:

   ```bash
   cd "$(git rev-parse --show-toplevel)" && python3 .zo/system/ui-ux-pro-max/scripts/search.py "[industry/features]" --domain color
   ```

5. **Component Patterns**:
   ```bash
   cd "$(git rev-parse --show-toplevel)" && python3 .zo/system/ui-ux-pro-max/scripts/search.py "[component-type]" --domain ux
   ```

**Step 3.2.2: Synthesize & Document**

Use research data to fill out `.zo/design-system.md`:

1. **Color Palette**: Define complete color system with specific hex codes
   - Brand colors (primary, secondary, accent)
   - Semantic colors (success, warning, danger, info)
   - Neutral colors (gray scale for UI)
   - Light/dark mode variants

2. **Typography**: Define font system
   - Font families (heading, body, mono)
   - Type scale (display through caption)
   - Font weights (light through bold)
   - Line heights for each scale

3. **Component Library**: Define global components
   - Button styles and variants
   - Input/form element styles
   - Card styles
   - Modal/dialog styles

4. **Icon System**: Define icon usage
   - Icon library (Lucide/Heroicons/other)
   - Icon sizes and variants
   - Icon color conventions

5. **Spacing System**: Define spacing scale
   - Base unit (4px, 8px grid)
   - Spacing scale (4px through 128px)
   - Layout gutters and margins

6. **Accessibility Standards**: Define accessibility requirements
   - WCAG compliance level
   - Contrast ratio requirements
   - Touch target minimums
   - Keyboard navigation patterns

7. **Responsive Breakpoints**: Define breakpoint system
   - Mobile, tablet, desktop breakpoints
   - Container max-widths
   - Layout adaptation rules

### 4. Design System Verification

Before finalizing, verify the global design system against quality criteria:

#### 4.1 Completeness Check

- [ ] **Colors**: All colors have specific hex codes (no generic names)
- [ ] **Typography**: Complete type scale with sizes, weights, line heights
- [ ] **Spacing**: Complete spacing scale defined
- [ ] **Components**: All global components have specifications
- [ ] **Icons**: Icon library specified with usage guidelines
- [ ] **Accessibility**: WCAG requirements clearly defined
- [ ] **Responsive**: Breakpoints and layouts specified

#### 4.2 Quality Check

- [ ] **Color Contrast**: All combinations meet WCAG AA (≥4.5:1 normal text)
- [ ] **Touch Targets**: Minimum 44×44px defined
- [ ] **Font Pairing**: Harmonious and readable
- [ ] **Consistency**: No conflicting definitions
- [ ] **Implementability**: All tokens can be implemented with available tech stack

#### 4.3 Export Formats

Generate implementation-ready formats:

**CSS Variables Example**:

```css
:root {
  /* Colors */
  --color-primary-500: #3b82f6;
  --color-success: #22c55e;

  /* Typography */
  --font-heading: 'Space Grotesk', sans-serif;
  --font-body: 'DM Sans', sans-serif;

  /* Spacing */
  --spacing-1: 0.25rem; /* 4px */
  --spacing-2: 0.5rem; /* 8px */

  /* ... complete token set */
}
```

**Tailwind Config Example**:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EFF6FF',
          500: '#3B82F6',
          // ... complete scale
        },
      },
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
    },
  },
};
```

### 5. Synchronization with Feature Designs

After updating the global design system:

1. **Check for affected feature designs**:

   ```bash
   grep -l "\.zo/design-system" specs/*/design.md 2>/dev/null || echo "No feature designs found"
   ```

2. **Report compatibility issues**:
   - If feature designs reference outdated tokens
   - If breaking changes were introduced
   - Suggest which feature designs need updates

### 6. Completion

Report completion with:

- **Global Design System**: `.zo/design-system.md`
- **Version**: Current version number
- **Status**: What was updated/created
- **Affected Features**: List of feature designs that may need updates
- **Next Steps**:
  - Feature designs should reference: `Global Design System: .zo/design-system.md v[X.X]`
  - Use `/zo.specify --design` or `/zo.specify.idea --design` to create feature-specific designs

---

## Feature Design (Deprecated)

**NOTE**: Feature-specific design creation has been moved to `/zo.specify --design` and `/zo.specify.idea --design`. This command now focuses exclusively on managing the global design system.

### For Feature Design

To create a feature-specific design that references the global design system:

```bash
# For natural language feature description
/zo.specify "Create analytics dashboard" --design

# For brainstorm ideas
/zo.specify.idea 1,3,5 --design
```

This will create `specs/XXX-feature/design.md` with:

- References to `.zo/design-system.md`
- Only feature-specific components and layouts
- Optional: `design-extensions.md` for feature-specific overrides

---

## Design System Best Practices

### Single Source of Truth

- **Global design system** (`.zo/design-system.md`) is the ONLY place for:
  - Color palette
  - Typography system
  - Spacing scale
  - Icon system
  - Global components
  - Accessibility standards
  - Responsive breakpoints

### Feature Designs Should Only Contain

- **Feature-specific components** not in global system
- **Feature-specific layouts** and page structures
- **References to global tokens** (not redefinitions)
- **Optional extensions** via `design-extensions.md` for feature-specific needs

### When to Update Global Design System

1. **Initial project setup** - Create the design system
2. **New category of component** - Add to global component library
3. **Breaking change** - Increment version and update all references
4. **Token addition** - Add new colors, spacing, etc.

### When NOT to Update Global Design System

1. **Feature-specific styles** - Use feature's `design-extensions.md`
2. **Temporary variations** - Use feature-specific overrides
3. **A/B testing** - Use feature-level variations
