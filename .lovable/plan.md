

## Plan: Align Excel Logo to Right Edge (Column 12)

### Problem
The logo is anchored at column 9, but the data extends to column 12 (Total). The logo should sit in the top-right corner aligned with the last column.

### Change in `src/lib/excel-export.ts`

Update the logo anchor from `col: 9` to approximately `col: 10.5` so the 160px-wide logo right-edge aligns with the end of column 12. The exact anchor depends on column widths — column 12 is 12 units wide (~87px). Setting `tl: { col: 10.8, row: 0.2 }` will push the logo so its right edge aligns near the Total column border.

### Files modified
- `src/lib/excel-export.ts` — adjust logo `tl.col` from `9` to ~`10.8`

