# Typography & Spacing Normalization Guide

## Overview

All typography sizes and spacing values are now standardized via CSS variables and utility classes. Instead of hardcoding `text-xs`, `text-sm`, `p-4`, etc., use the new consistent utilities.

---

## Typography Utilities

### Page-Level Headings
```tsx
<h1 className="text-app-title">Dashboard</h1>           {/* 32px, used on app main title */}
<h1 className="text-page-title">Work Ledger</h1>        {/* 28px, used on page headers */}
```

### Section & Subsection Headings
```tsx
<h2 className="text-section-title">Recent Items</h2>     {/* 20px, section headers */}
<h3 className="text-subsection-title">Filters</h3>       {/* 16px, card headers */}
```

### Body & Label Text
```tsx
<p className="text-body">Default paragraph text</p>      {/* 14px, main content */}
<label className="text-label">Email Address</label>     {/* 13px, form labels */}
<span className="text-caption">Last updated 2 min ago</span> {/* 12px, timestamps */}
<span className="text-micro">v1.2.3</span>              {/* 11px, badges, tags only */}
```

### Tabular/Data Text
```tsx
<td className="text-mono-data font-mono">WR-2026-001</td> {/* 13px mono, for IDs & numbers */}
<code className="text-mono-data">SELECT * FROM records</code>
```

---

## Spacing Utilities

### Gap Between Items
```tsx
<div className="flex gap-md">          {/* 12px gap */}
  <Button>Save</Button>
  <Button>Cancel</Button>
</div>

<div className="grid gap-lg">           {/* 16px gap */}
  {items.map(item => <Card>{item}</Card>)}
</div>
```

### Padding
```tsx
<GlassCard className="p-lg">           {/* 16px all sides */}
  Content
</GlassCard>

<div className="px-md py-lg">          {/* 12px left/right, 16px top/bottom */}
  Form field
</div>
```

### Margin
```tsx
<h2 className="text-section-title mb-lg">Section</h2>  {/* 16px bottom margin */}
<p className="text-body mb-md">Paragraph</p>          {/* 12px bottom margin */}
```

### Spacing Scale Reference
| Class | Value | Use Case |
|-------|-------|----------|
| `*-xs` | 4px | Tiny gaps (rarely used) |
| `*-sm` | 8px | Small gaps between inline items |
| `*-md` | 12px | Standard form field spacing |
| `*-lg` | 16px | Section spacing, main padding |
| `*-xl` | 20px | Large section gaps |
| `*-2xl` | 24px | Large content gaps |
| `*-3xl` | 32px | Extra large spacing |
| `*-4xl` | 40px | Maximum spacing |
| `*-5xl` | 48px | Page-level spacing |

---

## Component Height Utilities

### Table Rows
```tsx
{/* Dense tables (WorkLedger, AuditLog) */}
<tr className="h-table-row-dense">   {/* 36px */}
  <td>WR-2026-001</td>
</tr>

{/* Normal tables (DocumentHub) */}
<tr className="h-table-row">         {/* 44px */}
  <td>Document Name</td>
</tr>
```

### Form Controls
```tsx
<Button className="h-control">Save</Button>           {/* 36px */}
<Button className="h-action-button">Delete</Button>   {/* 40px */}
<Input className="h-control" />                       {/* 36px */}
```

---

## Before & After Examples

### Before (Inconsistent)
```tsx
export function WorkLedger() {
  return (
    <div>
      <h1 className="text-3xl">Work Ledger</h1>            {/* 30px */}
      <div className="gap-4">                              {/* 16px */}
        {items.map(item => (
          <div className="px-3 py-2">                     {/* Inconsistent */}
            <span className="text-xs">{item.id}</span>     {/* 12px */}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### After (Normalized)
```tsx
export function WorkLedger() {
  return (
    <div>
      <h1 className="text-page-title">Work Ledger</h1>    {/* 28px, standardized */}
      <div className="gap-md">                            {/* 12px, standardized */}
        {items.map(item => (
          <div className="px-md py-sm">                  {/* Standardized */}
            <span className="text-mono-data">{item.id}</span> {/* 13px mono */}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Pages to Refactor (Priority Order)

### High Priority (Core Pages)
1. **WorkLedger** — Densest table, most impact
   - Title: Change to `text-page-title`
   - Section headers: Change to `text-section-title`
   - Table rows: Use `h-table-row-dense`
   - Spacing: Use `gap-md`, `p-lg`

2. **DocumentHub** — Complex filtering & grid
   - Title: `text-page-title`
   - Cards: Use `p-lg`
   - Gaps: Standardize to `gap-md`

3. **Dashboard** — KPI cards & quick actions
   - Title: `text-app-title` for main, `text-page-title` for sections
   - Card titles: `text-subsection-title`
   - Padding: `p-lg` for cards

4. **SearchExplorer** — Search results
   - Result items: `gap-md`, `p-md`
   - Headings: `text-section-title`

### Medium Priority
5. **AuditLog** — Paginated table
6. **LedgerReports** — Charts and reports
7. **DocumentDetail** — Detail views

### Low Priority
8. Login, Settings, etc.

---

## Migration Checklist

For each page:

- [ ] Replace page heading with `text-page-title`
- [ ] Replace section headings with `text-section-title`
- [ ] Replace all `text-xs` with `text-caption` or `text-micro`
- [ ] Replace all `text-sm` with `text-label` or `text-body`
- [ ] Replace `gap-4` with `gap-md` (or appropriate size)
- [ ] Replace `px-4 py-3` with `px-lg py-sm` (or appropriate size)
- [ ] Replace table row heights: use `h-table-row-dense` or `h-table-row`
- [ ] Verify visual consistency (no size jumps between sections)
- [ ] Test responsive layout (zoom in/out)

---

## CSS Variables (Direct Use)

If you need to use these in inline styles or CSS:

```css
/* Typography */
font-size: var(--font-size-page-title);      /* 28px */
line-height: var(--line-height-page-title);  /* 36px */

/* Spacing */
gap: var(--spacing-md);                      /* 12px */
padding: var(--spacing-lg);                  /* 16px */

/* Heights */
height: var(--height-table-row);             /* 44px */
```

---

## Quick Reference Card

Save this for reference:

```
TYPOGRAPHY:
  .text-app-title      → 32px (dashboard main title)
  .text-page-title     → 28px (Work Ledger, DocumentHub)
  .text-section-title  → 20px (KPI Stats, Recent Items)
  .text-subsection-title → 16px (Card headers)
  .text-body           → 14px (default text)
  .text-label          → 13px (form labels)
  .text-caption        → 12px (timestamps)
  .text-micro          → 11px (badges only)
  .text-mono-data      → 13px mono (IDs, numbers)

SPACING:
  gap-xs/sm/md/lg/xl/2xl/3xl/4xl/5xl
  p-xs/sm/md/lg/xl/2xl/3xl/4xl/5xl
  px-xs/sm/md/lg/xl/2xl/3xl
  py-xs/sm/md/lg/xl/2xl/3xl
  m-xs/sm/md/lg/xl/2xl/3xl
  mb-xs/sm/md/lg/xl/2xl/3xl

HEIGHTS:
  h-table-row-dense → 36px
  h-table-row       → 44px
  h-control         → 36px
  h-action-button   → 40px
```

---

## FAQ

**Q: Can I still use Tailwind's built-in sizes like `text-sm`?**
A: Yes, but we're deprecating them in favor of the new utilities. Avoid using `text-xs`, `text-sm`, etc. in new code.

**Q: What if I need a custom size?**
A: Use inline styles with CSS variables: `style={{ fontSize: 'var(--font-size-page-title)' }}`. Don't add new hardcoded sizes.

**Q: How do I know which heading size to use?**
A: Reference the page hierarchy — app title (32px) > page title (28px) > section (20px) > subsection (16px).

**Q: What about responsive spacing?**
A: The utilities are fixed pixel values. Use Tailwind's `sm:`, `md:`, `lg:` prefixes for responsive changes: `gap-md sm:gap-lg md:gap-xl`.
