# Design Specification: [FEATURE NAME]

**Status**: Draft
**Related Spec**: [Link to spec.md]
**Global Design System**: `.zo/design-system.md` v[X.X]
**Design Extensions**: `design-extensions.md` (optional)

> **NOTE**: This design references the global design system at `.zo/design-system.md`. Only feature-specific components and layouts are documented here. Feature-specific overrides, if any, are in `design-extensions.md`.

## 1. Global Design System Reference

This feature uses the global design system defined in [`.zo/design-system.md`](../../../.zo/design-system.md).

**Global tokens include**:

- Color palette (brand, semantic, neutral colors)
- Typography system (fonts, type scale, weights, line heights)
- Spacing system (spacing scale, layout grid)
- Icon system (icon library, sizes, colors)
- Elevation & shadows (shadow levels, z-index scale)
- Border radius (radius scale)
- Animation & transitions (timing functions, duration scale)
- Accessibility standards (WCAG requirements, touch targets)
- Responsive breakpoints (breakpoint scale, container widths)

**Usage**: Refer to the global design system for all standard tokens. Only feature-specific components and layouts are documented below.

## 2. Feature-Specific Design Extensions (Optional)

If this feature requires any overrides or extensions to the global design system, document them in `design-extensions.md`. Otherwise, this section can be removed.

**Common reasons for extensions**:

- Feature requires a new color not in global palette
- Feature uses different typography for specific purpose
- Feature has unique spacing requirements
- Feature needs custom component variants

## 3. Feature-Specific Component Guidelines

> **NOTE**: Only document components that are specific to this feature. Standard components (buttons, inputs, modals) should use the global design system.

### [Component Name 1] (e.g., "Action Card")

- **Structure**: [Describe layout, e.g., "Icon left, Text right"]
- **Interactions**:
  - Hover: [Effect, e.g., "Lift up, shadow increases"]
  - Click: [Effect, e.g., "Scale down 95%"]
- **States**: [Default, Active, Disabled]

### [Component Name 2] (e.g., "Data Table")

- **Structure**: [Describe layout]
- **Interactions**: [Row hover, sort headers]

## 4. Feature Layouts & Flows

> **NOTE**: Document only feature-specific page layouts. Standard layouts (header, sidebar, footer) should use the global design system.

### [Page/Screen Name]

- **Layout Structure**:
  - Header: [Sticky/Fixed] (if custom for this feature)
  - Sidebar: [Collapsible/Fixed] (if custom for this feature)
  - Content Area: [Grid/List]
- **Key Sections**:
  1.  [Hero/Top Section]: [Description]
  2.  [Main Content]: [Description]
- **Responsive Behavior**:
  - Mobile: [Stacked, hidden sidebar]
  - Desktop: [Two columns]
  - (Reference global breakpoints from global design system)

## 5. Accessibility & UX Requirements

> **NOTE**: Standard accessibility requirements are defined in the global design system. Only document feature-specific requirements here.

- [ ] Interactive elements have `cursor-pointer`
- [ ] Contrast ratio meets WCAG AA (4.5:1) - verify using global color tokens
- [ ] Images include `alt` text placeholders
- [ ] Focus rings visible for keyboard users (use global focus styles)
- [ ] No layout shift on hover
