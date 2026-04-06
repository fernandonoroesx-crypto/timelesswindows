
## Plan: Fix New Quote Costs Not Matching Settings

### Root cause

The issue is not the pricing sync effect itself. It is the way a “new quote” is opened.

Right now, the app creates a new project with default pricing first and stores it in `currentProject` before navigating to `/quotes/new`:

- `src/pages/Dashboard.tsx`
- `src/pages/QuotesList.tsx`

Then in `QuoteBuilder`, this is treated like an existing quote:

- local state starts from `currentProject`
- `hasInitializedPricing` starts as `true`
- the “apply settings pricing after loading” effect never runs

So the quote keeps default costs instead of the saved Settings costs.

There is also a second issue: `currentProject` is never cleared, so opening “New Quote” from the sidebar can accidentally reuse the last open quote.

### What to change

#### 1. Make “New Quote” really start fresh
Update all “new quote” entry points so they clear `currentProject` and navigate to `/quotes/new` without pre-creating a quote object.

Files:
- `src/pages/Dashboard.tsx`
- `src/pages/QuotesList.tsx`
- `src/components/AppLayout.tsx` (for the sidebar “New Quote” link)

#### 2. Let `QuoteBuilder` create the new quote itself
Adjust `QuoteBuilder` so:

- if `currentProject` exists, it loads that saved/existing quote
- if `currentProject` is `null`, it creates a fresh quote locally
- after `loading` becomes `false`, it applies `globalPricing` once to that new quote
- existing quotes are never overwritten

File:
- `src/pages/QuoteBuilder.tsx`

#### 3. Reset the initialization flag correctly
Make sure the one-time pricing initialization ref is based on whether the builder is editing an existing quote, not on whether some placeholder object was injected before navigation.

### Expected behavior after fix

```text
Settings saved
  ↓
User clicks New Quote
  ↓
No quote object is preloaded
  ↓
QuoteBuilder creates a fresh local quote
  ↓
When settings finish loading, quote pricing is initialized from Settings
  ↓
Both selling and cost values match Settings
  ↓
If user edits quote pricing manually, those changes stay on that quote only
  ↓
If user selects a PM, PM pricing overrides the standard quote pricing
```

### What stays the same

- Previous/saved quotes keep their own pricing snapshot
- Manual quote-level pricing edits still work
- PM pricing still overrides standard pricing
- Settings remain the source of truth for the starting rates of every new quote

### Technical details

Current problematic flow:
```text
New Quote button
  → createNewProject()
  → pricing = DEFAULT/global placeholder
  → setCurrentProject(project)
  → QuoteBuilder sees currentProject
  → skips initialization from settings
```

Correct flow:
```text
New Quote button
  → setCurrentProject(null)
  → navigate('/quotes/new')
  → QuoteBuilder creates fresh local project
  → waits for loading=false
  → copies globalPricing into project.pricing once
```

### Files to update

- `src/pages/Dashboard.tsx`
- `src/pages/QuotesList.tsx`
- `src/components/AppLayout.tsx`
- `src/pages/QuoteBuilder.tsx`
