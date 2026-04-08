

## Plan: Show Original Supplier PDF in a Viewer Instead of Downloading

### What changes
Replace the "Supplier PDF (Original)" dropdown item's download behavior with opening an in-app PDF viewer dialog. The base64 data URI is already stored — we just need to display it in an `<iframe>` inside a dialog instead of triggering a download.

### Changes in `src/pages/QuoteBuilder.tsx`

1. Add state: `const [showOriginalPdf, setShowOriginalPdf] = useState(false)`
2. Change the "Supplier PDF (Original)" dropdown item to set `showOriginalPdf(true)` instead of creating a download link
3. Add a `<Dialog>` at the bottom of the component with a full-size `<iframe>` that renders the base64 PDF data URI, with a title showing the file name

### Files modified
- `src/pages/QuoteBuilder.tsx` — replace download with viewer dialog (~15 lines added)

