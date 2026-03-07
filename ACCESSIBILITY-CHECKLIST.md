# Accessibility Audit Checklist - WCAG 2.1 AA Compliance

## ✅ **Priority 1: Keyboard Navigation**
### Components to Test:
- [ ] **Course cards** - Tab through all cards, Enter to toggle selection
- [ ] **Modal dialogs** - Focus trap when open, Escape to close
- [ ] **Settings toggles** - Space/Enter to activate
- [ ] **Navigation** - Tab order follows visual flow
- [ ] **Dropdowns** - Arrow keys for selection, Enter to confirm

### Required Fixes:
1. Add `tabIndex={0}` to interactive elements that aren't native buttons
2. Implement keyboard handlers (onKeyDown) for custom interactive elements
3. Add focus indicators (`:focus-visible` styles) to all interactive elements

---

## ✅ **Priority 2: ARIA Labels & Semantic HTML**
### Components Needing ARIA:
- [ ] **Course status circles** - `aria-label="Course status: Complete/In Progress/Not Started"`
- [ ] **Grade badges** - `aria-label="Grade: Distinction/Merit/Pass"`
- [ ] **Icon-only buttons** - Add `aria-label` to Settings, Theme Toggle, Notes buttons
- [ ] **Progress bars** - Add `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- [ ] **Modal overlays** - Add `role="dialog"` with `aria-modal="true"` and `aria-labelledby`

### Semantic HTML:
- Replace `<div>` with `<button>` for clickable elements
- Use `<nav>` for navigation bars
- Use `<main>` for primary content
- Use `<section>` and `<article>` appropriately
- Use `<h1>`-`<h6>` in proper hierarchy

---

## ✅ **Priority 3: Color Contrast (WCAG AA: 4.5:1)**
### Text to Check:
- [ ] **Body text** - white/90 on dark backgrounds (likely passes)
- [ ] **Secondary text** - white/40, white/50, white/60 (may fail - increase to white/70+)
- [ ] **Button text** - White on violet-600, emerald-500, amber-500 (verify contrast)
- [ ] **Error states** - Red text must have 4.5:1 contrast

### Tools:
Use Chrome DevTools > Accessibility tab to check contrast ratios.

### Fixes Needed:
```css
/* Example: Increase contrast for secondary text */
.text-white\/40 { @apply text-white/70 } /* From 40% to 70% opacity */
.text-white\/50 { @apply text-white/75 }
```

---

## ✅ **Priority 4: Form Accessibility**
### Login Form:
- [x] `<label>` elements with `htmlFor` matching input IDs ✅
- [ ] Error messages announced with `aria-describedby`
- [ ] Required fields marked with `aria-required="true"`

### Settings Forms:
- [ ] All toggles have visible labels
- [ ] All inputs have `<label>` or `aria-label`
- [ ] Validation errors read by screen readers

---

## ✅ **Priority 5: Live Regions for Dynamic Content**
### Components Needing `aria-live`:
- [ ] **Toast notifications** - `role="status"` with `aria-live="polite"`
- [ ] **Loading states** - `aria-live="polite"` for "Loading..." messages
- [ ] **Data updates** - Announce when course completion changes

Example:
```tsx
<div role="status" aria-live="polite" aria-atomic="true">
  {toast.message}
</div>
```

---

## ✅ **Priority 6: Screen Reader Testing**
### Test with NVDA (Windows) or VoiceOver (Mac):
- [ ] Landing page reads correctly
- [ ] Course cards announce name, code, credits, and status
- [ ] Navigation can be used eyes-free
- [ ] Modal dialogs announce title and content
- [ ] Button labels are descriptive (not just "Click here")

---

## ✅ **Priority 7: Focus Management**
### Modal Dialogs:
- [ ] Focus moves to modal when opened
- [ ] Focus trapped inside modal (Tab doesn't escape)
- [ ] Focus returns to trigger element on close

### Navigation:
- [ ] Skip link for keyboard users: `<a href="#main-content">Skip to content</a>`
- [ ] Focus visible on all interactive elements

---

## **Automated Testing Tools**
1. **Install axe DevTools** (Chrome Extension): https://www.deque.com/axe/devtools/
2. **Run on each page**:
   - Landing page (/)
   - Course Tracker (/ after login)
   - Planner (/planner)
   - Settings (/planner/settings)
   - Admin Dashboard (/admin)

3. **Fix all Critical and Serious issues first**

---

## **Quick Wins to Implement Now**

### 1. Add ARIA labels to icon buttons:
```tsx
<button aria-label="Open settings">
  <Settings className="w-4 h-4" />
</button>

<button aria-label="Toggle theme">
  <Sun className="w-4 h-4" />
</button>
```

### 2. Add focus-visible styles globally:
```css
/* In globals.css */
*:focus-visible {
  outline: 2px solid theme('colors.violet.400');
  outline-offset: 2px;
}
```

### 3. Improve secondary text contrast:
```tsx
// Change all instances of:
className="text-white/40"
// To:
className="text-white/70"
```

### 4. Add skip link in layout.tsx:
```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white text-black p-2 rounded z-50">
  Skip to content
</a>
<main id="main-content">
  {/* Page content */}
</main>
```

---

## **Resources**
- WCAG 2.1 Quick Reference: https://www.w3.org/WAI/WCAG21/quickref/
- ARIA Authoring Practices Guide: https://www.w3.org/WAI/ARIA/apg/
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
