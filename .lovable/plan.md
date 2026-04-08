

## Plan: Add Item Reference Field to Line Item Editor

### What it does
Adds an editable "Item Ref" input field to the `LineItemCard` component so users can view and edit the reference when expanding a line item. The field will be pre-populated with the auto-generated reference but fully editable.

### Changes

**`src/pages/QuoteBuilder.tsx`**

In the `LineItemCard` component (around line 711), add a new field at the beginning of the grid — before the "Type" select:

```
<div>
  <Label className="text-xs">Item Ref</Label>
  <Input className="h-9 text-xs" value={item.itemRef}
    onChange={e => onUpdate({ itemRef: e.target.value })}
    placeholder="e.g. W01" />
</div>
```

This places it as the first field in the edit form, making it prominent and easy to fill in when missing. The existing auto-generation on `addLineItem()` remains unchanged — this just lets users override or fill in the reference manually.

### Files modified
- `src/pages/QuoteBuilder.tsx` — add Item Ref input to LineItemCard grid

