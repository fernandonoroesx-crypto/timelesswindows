

## Plan: Auto-generate Quote Ref from Client Name

### What Changes

When a client is selected in the Quote Builder, the **Project Ref** will auto-generate using the first 3 letters of the client name (uppercased) plus an auto-incrementing number. For example:
- "AD Construction" → `ADC-000001`
- "Axis Europe" → `AXI-000002`
- No client → `QTE-000001` (fallback)

### Technical Approach

1. **Add helper function in `context.tsx`**:
   - `generateQuoteRef(clientName: string, existingProjects: Project[]): string`
   - Extract first 3 uppercase letters from client name (skip spaces/special chars)
   - Count existing projects with the same 3-letter prefix, increment by 1
   - Format as `XXX-000001`

2. **Update `QuoteBuilder.tsx` → `selectClient` function**:
   - When a client is selected, auto-generate the `projectRef` using the new helper
   - Make the Project Ref field show the auto-generated value but still allow manual editing

3. **Update `createNewProject` in `context.tsx`**:
   - Leave `projectRef` empty initially (gets set when client is selected)

4. **Display**: Quote ref stays editable so users can append address or notes (e.g., `ADC-000001 - 12 High Street`)

### Prefix Logic
- Take the client name, remove spaces and special characters, take first 3 characters, uppercase
- "AD Construction" → remove spaces → "ADConstruction" → first 3 → "ADC"
- "Axis Europe" → "AxisEurope" → "AXI"
- Empty/no client → fallback "QTE"

