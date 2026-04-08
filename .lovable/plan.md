

## Plan: Reposition Excel Logo Over Columns K–L

### Problem
The logo is currently anchored at `col: 10.8`, pushing it too far right (past the data area). From the screenshot, the logo should be centered above columns K and L (Unit Total and Total — columns 11 and 12), roughly spanning from column 10 to column 12.

### Change in `src/lib/excel-export.ts`

Adjust the logo anchor from `col: 10.8` to approximately `col: 9.5` so the 160px-wide logo is visually centered over the last two data columns (K and L). This places the left edge of the logo around column J/K, with the right edge near the end of column L.

```
tl: { col: 9.5, row: 0.2 }
```

### Files modified
- `src/lib/excel-export.ts` — adjust logo `tl.col` from `10.8` to `~9.5`

