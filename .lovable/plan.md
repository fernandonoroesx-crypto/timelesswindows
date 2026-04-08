

## Plan: Fix Excel Reader to Properly Detect Items

### Problem
The Excel reader finds 0 items when importing supplier Excel files. The header detection patterns are too narrow and don't cover common supplier spreadsheet formats.

### Root Causes
1. **Header detection too restrictive** — only matches exact patterns like "width", "height", "price". Supplier files may use "W", "H", "Size", "Dimensions", "Description", "Unit Price", "Net", "Sell", "No.", "Mark", "Pos" etc.
2. **Combined dimension column not handled broadly** — only looks for "dim" header, but suppliers may put dimensions in a "Size" or "Description" column as "630x1670" or "630 x 1670 mm"
3. **Minimum dimension filter too aggressive** — `width < 200 || height < 200` skips smaller items like fanlights (e.g. 600x150mm)
4. **No fallback text scanning** — if headers aren't found in the first 10 rows, the numeric fallback is weak and doesn't extract refs or types
5. **Price column detection matches "Total" greedily** — could match summary totals instead of unit prices

### Changes to `src/lib/excel-reader.ts`

**1. Expand `detectColumns` header patterns**
- Add matches for: "mark", "pos", "no.", "item", "description", "desc", "size", "w", "h", "net", "sell", "unit price", "each", "line total", "sub", "nr", "pce", "amount"
- Match "material" as a price column for supplier files
- Handle headers with parenthetical units: "Width (mm)", "Height(mm)", "W(mm)"

**2. Scan all text columns for embedded dimensions**
- After header detection, if width/height columns aren't found, scan every text cell in each data row for dimension patterns: `(\d{3,4})\s*[x×X]\s*(\d{3,4})`
- Also try "W: 630 H: 1670" or "630w x 1670h" patterns

**3. Reduce minimum dimension threshold**
- Lower from 200mm to 100mm to catch small fanlights and toplights

**4. Search more rows for headers**
- Increase header scan from first 10 rows to first 20 rows

**5. Add smarter fallback parsing**
- When no header is found, scan each row for dimension patterns in any string cell
- Extract type from any cell containing window/door keywords
- Extract price from cells with currency symbols or numeric values

**6. Add console logging**
- Log detected header row index and column map so issues can be debugged from browser console

### Files modified
- `src/lib/excel-reader.ts` — improved detection logic

