

## Plan: Add "Boss" AI Assistant to Quote Builder

### Overview
Add an AI-powered pricing assistant ("Boss") to the Quote Builder. The icon will be the uploaded dachshund photo, displayed as a circular avatar button in the header. Clicking it opens a chat drawer where the user can request changes to uplifts and installation selling prices.

### Architecture

```text
User clicks Boss avatar → Sheet opens from right → User types request
  → Edge function sends to Lovable AI with tool-calling schema
  → AI returns structured pricing changes (uplifts / installation selling)
  → Frontend applies changes to quote pricing state
```

### Changes

**1. Copy dachshund photo to `src/assets/boss-avatar.jpg`**
- Used as the Boss icon in the header

**2. Create edge function `supabase/functions/boss-ai/index.ts`**
- Accepts: user message, conversation history, current uplift values, current installation selling values
- System prompt: pricing assistant that uses tool-calling to return structured changes
- Tool schema: `update_pricing` with optional `upliftChanges` and `installationChanges` maps + explanation
- Model: `google/gemini-3-flash-preview`
- Non-streaming (invoke-based) for short structured responses
- Handles 429/402 errors

**3. Create `src/components/BossAiDialog.tsx`**
- Sheet (slide-over from right) with chat interface
- Circular dachshund avatar as trigger button in header
- Shows current uplift/installation selling values as context at top
- Messages stored in component state
- On AI response with tool calls: applies pricing changes via callback and shows confirmation
- On text-only response: displays as assistant message
- Uses `supabase.functions.invoke('boss-ai', ...)` for calls

**4. Update `src/pages/QuoteBuilder.tsx`**
- Import BossAiDialog
- Add circular avatar button (dachshund photo) in the header row next to Save/Send
- Pass current `quotePricing` and an `updatePricing` callback to apply changes to `project.pricing`

### Files created/modified
- `src/assets/boss-avatar.jpg` — copied from upload
- `supabase/functions/boss-ai/index.ts` — new edge function
- `src/components/BossAiDialog.tsx` — new chat component
- `src/pages/QuoteBuilder.tsx` — add Boss button

