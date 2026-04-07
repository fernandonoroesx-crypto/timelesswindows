import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { stripPricesFromPdf, fileToBase64 } from '@/lib/pdf-price-strip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUp, Trash2, Check, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { extractPdfText, type ExtractedLineItem } from '@/lib/pdf-reader';
import type { QuoteLineItem, WindowType } from '@/lib/types';

const WINDOW_TYPES: WindowType[] = [
  'Casement', 'Casement Flag', 'Box Sash', 'Fix Sash', 'Spring Sash',
  'Door', 'Door + Top Light', 'French Door', 'Patio Door',
];

interface PdfImportDialogProps {
  projectRef: string;
  existingCount: number;
  onImport: (items: QuoteLineItem[]) => void;
  onPdfFiles?: (original: string, clean: string, fileName: string) => void;
}

export default function PdfImportDialog({ projectRef, existingCount, onImport, onPdfFiles }: PdfImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rawText, setRawText] = useState('');
  const [extractedItems, setExtractedItems] = useState<ExtractedLineItem[]>([]);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    setLoading(true);
    setFileName(file.name);

    try {
      const result = await extractPdfText(file);
      setRawText(result.rawText);
      setExtractedItems(result.items);

      // Generate original + cleaned PDFs
      if (onPdfFiles) {
        const original = await fileToBase64(file);
        let clean = '';
        try {
          const ab = await file.arrayBuffer();
          clean = await stripPricesFromPdf(ab);
        } catch (pdfErr) {
          console.error('PDF price strip error:', pdfErr);
        }
        onPdfFiles(original, clean, file.name);
      }

      if (result.items.length === 0) {
        toast.info('No line items auto-detected. Check the raw text tab to manually identify items.');
      } else {
        toast.success(`Found ${result.items.length} potential item(s)`);
      }
    } catch (err) {
      console.error('PDF extraction error:', err);
      toast.error('Failed to read PDF. The file may be encrypted or corrupted.');
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index: number, updates: Partial<ExtractedLineItem>) => {
    setExtractedItems(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const removeItem = (index: number) => {
    setExtractedItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleImport = () => {
    const items: QuoteLineItem[] = extractedItems.map((ext, i) => ({
      id: crypto.randomUUID(),
      itemRef: ext.itemRef || `${projectRef || 'ITEM'}-${existingCount + i + 1}`,
      type: ext.type as WindowType,
      qty: ext.qty,
      widthMm: ext.widthMm,
      heightMm: ext.heightMm,
      manufactureCurrency: ext.currency,
      supplier: ext.supplier,
      manufacturePrice: ext.manufacturePrice,
      uplift: 0,
      installationType: 'Internal',
      installationOverride: undefined,
      architraveType: 'none',
      trimsType: 'none',
      mdfRevealType: 'none',
      mdfWidthType: 'narrow',
      extra1: 'none',
      extra2: 'none',
      customExtra: 0,
    }));

    onImport(items);
    toast.success(`Imported ${items.length} item(s)`);
    setOpen(false);
    setRawText('');
    setExtractedItems([]);
    setFileName('');
  };

  const reset = () => {
    setRawText('');
    setExtractedItems([]);
    setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileUp className="w-4 h-4 mr-2" /> Import PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" /> Import Items from PDF
          </DialogTitle>
        </DialogHeader>

        {/* Upload area */}
        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> Reading PDF...
            </div>
          ) : fileName ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">{fileName}</span>
              <Button variant="ghost" size="sm" onClick={reset}>Change file</Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">Upload a supplier PDF to extract line items</p>
              <Input
                ref={fileRef}
                type="file"
                accept=".pdf"
                onChange={handleFile}
                className="max-w-xs mx-auto"
              />
            </>
          )}
        </div>

        {/* Results */}
        {(extractedItems.length > 0 || rawText) && (
          <Tabs defaultValue="items" className="mt-4">
            <TabsList>
              <TabsTrigger value="items">Extracted Items ({extractedItems.length})</TabsTrigger>
              <TabsTrigger value="raw">Raw Text</TabsTrigger>
            </TabsList>

            <TabsContent value="items" className="space-y-3 mt-3">
              {extractedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No items detected. Check the "Raw Text" tab to see the PDF content.
                </p>
              ) : (
                extractedItems.map((item, i) => (
                  <div key={i} className="border rounded-lg p-3 bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-muted-foreground">Item {i + 1}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeItem(i)} className="text-destructive h-7">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                      <div>
                        <Label className="text-xs">Ref</Label>
                        <Input className="h-8 text-xs" value={item.itemRef}
                          onChange={e => updateItem(i, { itemRef: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">Type</Label>
                        <Select value={item.type} onValueChange={v => updateItem(i, { type: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {WINDOW_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Qty</Label>
                        <Input type="number" min={1} className="h-8 text-xs" value={item.qty}
                          onChange={e => updateItem(i, { qty: parseInt(e.target.value) || 1 })} />
                      </div>
                      <div>
                        <Label className="text-xs">Width (mm)</Label>
                        <Input type="number" className="h-8 text-xs" value={item.widthMm}
                          onChange={e => updateItem(i, { widthMm: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label className="text-xs">Height (mm)</Label>
                        <Input type="number" className="h-8 text-xs" value={item.heightMm}
                          onChange={e => updateItem(i, { heightMm: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label className="text-xs">Price ({item.currency})</Label>
                        <Input type="number" step="0.01" className="h-8 text-xs" value={item.manufacturePrice}
                          onChange={e => updateItem(i, { manufacturePrice: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label className="text-xs">Currency</Label>
                        <Select value={item.currency} onValueChange={(v: 'GBP' | 'EUR') => updateItem(i, { currency: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GBP">GBP</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="raw" className="mt-3">
              <pre className="bg-muted rounded-lg p-4 text-xs max-h-80 overflow-auto whitespace-pre-wrap font-mono">
                {rawText || 'No text extracted'}
              </pre>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={extractedItems.length === 0}>
            <Check className="w-4 h-4 mr-2" /> Import {extractedItems.length} Item(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
