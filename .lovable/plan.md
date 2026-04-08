

## Plan: Add Extras & Waste Disposal to Settings Selling/Cost Tabs

### Problem
The Settings page never got Extras and Waste Disposal fields added to the **Selling Prices** and **Cost Prices** tabs. They only appear in the General tab (selling values only, no cost). The PricingEditor component used in QuoteBuilder already has them — but Settings renders its own manual layout.

### Changes in `src/pages/SettingsPage.tsx`

1. **Selling tab** (after Trims — Selling card, ~line 158): Add a new card "Extras & Waste Disposal — Selling" with:
   - Each entry from `pricing.extrasSelling` as an editable row
   - Waste Disposal selling price

2. **Cost tab** (after Trims — Cost card, ~line 221): Add a new card "Extras & Waste Disposal — Cost" with:
   - Each entry from `pricing.extrasCost` as an editable row
   - Waste Disposal cost price

3. **General tab** (~line 265): Remove the Extras & Waste Disposal fields from the "Extras & Overheads" card, leaving only Overhead/day. Rename card to just "Overheads".

### Files modified
- `src/pages/SettingsPage.tsx`

