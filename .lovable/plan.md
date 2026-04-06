

## Plan: Generate Pricing Formulas PDF

Create a professional PDF document summarizing all pricing formulas currently implemented in the system, using Python's reportlab library.

### Content

The PDF will contain all the formulas from the previous Mermaid diagram, organized into clear sections:

1. **Linear Meter Formulas** — Single, Bay Side, Bay Central
2. **Selling Price Breakdown** — Material, Installation, Architrave, Trims, MDF, Making Good, Delivery/Stock, Waste Disposal, FENSA/Survey, Extras
3. **Cost Price Breakdown** — Same categories plus Consumables
4. **Totals** — Unit Total, Line Total, Profit, Margin

### Technical approach

- Use `reportlab` (already available in sandbox) to generate a clean, structured PDF
- Write to `/mnt/documents/pricing_formulas.pdf`
- Visual QA via `pdftoppm` before delivering

### No codebase changes needed

This is a standalone artifact generation task — no project files will be modified.

