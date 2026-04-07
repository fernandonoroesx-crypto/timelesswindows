ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS supplier_pdf_original text,
ADD COLUMN IF NOT EXISTS supplier_pdf_clean text,
ADD COLUMN IF NOT EXISTS supplier_pdf_name text;