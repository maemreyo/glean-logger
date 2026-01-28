# Design Extensions: [FEATURE NAME]

**Status**: [DRAFT | APPROVED]
**Related Spec**: [Link to spec.md]
**Related Design**: [Link to design.md]
**Extends**: `.zo/design-system.md` v[X.X]

> **NOTE**: This file contains ONLY feature-specific overrides and extensions to the global design system. All standard tokens are defined in [`.zo/design-system.md`](../../../.zo/design-system.md) and should NOT be duplicated here.

---

## Purpose

This file documents design tokens and components that are specific to this feature and cannot be accommodated by the global design system.

**Common reasons for extensions**:

- Feature requires a new color not in global palette
- Feature uses different typography for specific purpose
- Feature has unique spacing or layout requirements
- Feature needs custom component variants not in global library
- Feature has unique accessibility requirements

---

## Color Extensions

### New Colors

| Role       | Color Name | Hex Code | Tailwind Token | Usage   | Rationale                  |
| ---------- | ---------- | -------- | -------------- | ------- | -------------------------- |
| [Custom 1] | [Name]     | `#[Hex]` | `bg-[custom]`  | [Usage] | [Why this color is needed] |

### Color Overrides

> **WARNING**: Only override global colors if absolutely necessary. Document the reason thoroughly.

| Global Role | Override Color | Override Hex | Override Token | Rationale                |
| ----------- | -------------- | ------------ | -------------- | ------------------------ |
| [primary]   | [Name]         | `#[Hex]`     | `bg-primary`   | [Why override is needed] |

---

## Typography Extensions

### New Fonts

> **WARNING**: Adding new fonts impacts performance. Use sparingly.

| Role     | Font Name   | Weight   | Usage   | Rationale                 |
| -------- | ----------- | -------- | ------- | ------------------------- |
| [Custom] | [Font Name] | [Weight] | [Usage] | [Why this font is needed] |

### Typography Overrides

| Global Token   | Override Value | Usage   | Rationale                |
| -------------- | -------------- | ------- | ------------------------ |
| [font-heading] | [New Font]     | [Usage] | [Why override is needed] |

---

## Spacing Extensions

### Custom Spacing Scale

| Scale      | Value (px/rem) | Token          | Usage   | Rationale                    |
| ---------- | -------------- | -------------- | ------- | ---------------------------- |
| [custom-1] | [Value]        | `gap-[custom]` | [Usage] | [Why this spacing is needed] |

---

## Component Extensions

### [Custom Component Name]

**Purpose**: [Why this component is not in global library]

**Structure**: [Describe layout]

**Variants**:

- **Variant 1**: [Description]
- **Variant 2**: [Description]

**Interactions**:

- Hover: [Effect]
- Click: [Effect]
- States: [Default, Active, Disabled]

**Measurements**:

- Width: [Value]
- Height: [Value]
- Padding: [Value]
- Margin: [Value]

**Tokens Used**:

- Colors: [List from global or extensions]
- Typography: [List from global or extensions]
- Spacing: [List from global or extensions]

---

## Layout Extensions

### [Custom Layout Name]

**Purpose**: [Why this layout is not in global system]

**Structure**: [Describe layout]

**Responsive Behavior**:

- Mobile: [Description]
- Tablet: [Description]
- Desktop: [Description]

**Breakpoints Used**: [Reference global or define custom]

---

## Accessibility Extensions

### Feature-Specific Accessibility

- [Custom requirement 1]: [Description]
- [Custom requirement 2]: [Description]

**Note**: Standard accessibility requirements are defined in the global design system.

---

## Animation Extensions

### Custom Animations

| Name          | Duration | Easing   | Usage   | Rationale                      |
| ------------- | -------- | -------- | ------- | ------------------------------ |
| [custom-anim] | [ms]     | [easing] | [Usage] | [Why this animation is needed] |

---

## Version History

| Version | Date   | Changes                   | Author |
| ------- | ------ | ------------------------- | ------ |
| 1.0     | [DATE] | Initial design extensions | [Name] |

---

## Review Notes

- [ ] All extensions are necessary and cannot use global tokens
- [ ] Rationale is documented for each extension
- [ ] No conflicts with global design system
- [ ] Performance impact considered (fonts, animations)
- [ ] Accessibility maintained with extensions
- [ ] Documentation is clear for implementers
