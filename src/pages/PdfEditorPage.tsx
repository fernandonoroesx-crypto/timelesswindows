import { useState, useCallback } from 'react';
import { Upload, FileText, Download, Loader2, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { stripPricesFromPdf } from '@/lib/pdf-price-strip';
import { extractPdfText, type ExtractedLineItem } from '@/lib/pdf-reader';
import * as XLSX from 'xlsx';

export default function PdfEditorPage() {
  // Remove Prices state
  const [rpFile, setRpFile] = useState<File | null>(null);
  const [rpProcessing, setRpProcessing] = useState(false);
  const [rpResultUrl, setRpResultUrl] = useState<string | null>(null);
  const [rpOutputName, setRpOutputName] = useState('');

  // Extract to Excel state
  const [exFile, setExFile] = useState<File | null>(null);
  const [exProcessing, setExProcessing] = useState(false);
  const [exItems, setExItems] = useState<ExtractedLineItem[]>([]);

  // --- Remove Prices handlers ---
  const handleRpFile = useCallback((f: File) => {
    if (f.type !== 'application/pdf') { toast.error('Please upload a PDF file'); return; }
    setRpFile(f);
    setRpResultUrl(null);
  }, []);

  const processRp = async () => {
    if (!rpFile) return;
    setRpProcessing(true);
    setRpResultUrl(null);
    try {
      const ab = await rpFile.arrayBuffer();
      const dataUrl = await stripPricesFromPdf(ab);
      setRpResultUrl(dataUrl);
      setRpOutputName(`${rpFile.name.replace(/\.pdf$/i, '')} - Specifications.pdf`);
      toast.success('PDF processed successfully');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to process PDF');
    } finally {
      setRpProcessing(false);
    }
  };

  const downloadRp = () => {
    if (!rpResultUrl) return;
    const a = document.createElement('a');
    a.href = rpResultUrl;
    a.download = rpOutputName;
    a.click();
  };

  // --- Extract to Excel handlers ---
  const handleExFile = useCallback((f: File) => {
    if (f.type !== 'application/pdf') { toast.error('Please upload a PDF file'); return; }
    setExFile(f);
    setExItems([]);
  }, []);

  const processEx = async () => {
    if (!exFile) return;
    setExProcessing(true);
    setExItems([]);
    try {
      const result = await extractPdfText(exFile);
      if (result.items.length === 0) {
        toast.warning('No line items found in this PDF');
      } else {
        setExItems(result.items);
        toast.success(`Extracted ${result.items.length} items`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to extract data');
    } finally {
      setExProcessing(false);
    }
  };

  const downloadExcel = () => {
    if (exItems.length === 0) return;
    const rows = exItems.map((it, i) => ({
      'Item Ref': it.itemRef || `W${String(i + 1).padStart(2, '0')}`,
      'Type': it.type,
      'Qty': it.qty,
      'Width (mm)': it.widthMm,
      'Height (mm)': it.heightMm,
      'Price': it.manufacturePrice,
      'Currency': it.currency,
      'Glass Spec': it.glassSpec ?? '',
      'Glass (mm)': it.glassThicknessMm ?? '',
      'Uplift': it.uplift ?? '',
      'Installation': it.installationOverride ?? '',
      'Installation Type': it.installationType ?? '',
      'Architrave': it.architraveType ?? '',
      'Trims': it.trimsType ?? '',
      'MDF Reveal': it.mdfRevealType ?? '',
      'Custom Extra': it.customExtra ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Extracted Items');
    const name = exFile ? exFile.name.replace(/\.pdf$/i, '') : 'extracted';
    XLSX.writeFile(wb, `${name} - Extracted.xlsx`);
  };

  // Shared upload area component
  const UploadArea = ({ file, onFile }: { file: File | null; onFile: (f: File) => void }) => {
    const id = `pdf-upload-${file === rpFile ? 'rp' : 'ex'}`;
    return (
      <div
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
        onDragOver={e => e.preventDefault()}
        className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
        onClick={() => document.getElementById(id)?.click()}
      >
        <input id={id} type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-foreground">
          {file ? file.name : 'Drop a supplier PDF here or click to browse'}
        </p>
        {file && <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(0)} KB</p>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">PDF Options</h1>
        <p className="text-sm text-muted-foreground mt-1">Process supplier PDFs — remove prices or extract data</p>
      </div>

      <Tabs defaultValue="remove-prices">
        <TabsList>
          <TabsTrigger value="remove-prices"><FileText className="w-4 h-4 mr-1.5" />Remove Prices</TabsTrigger>
          <TabsTrigger value="extract-excel"><Table2 className="w-4 h-4 mr-1.5" />Extract to Excel</TabsTrigger>
        </TabsList>

        {/* Remove Prices Tab */}
        <TabsContent value="remove-prices" className="space-y-4 mt-4">
          <UploadArea file={rpFile} onFile={handleRpFile} />
          <div className="flex gap-3">
            <Button onClick={processRp} disabled={!rpFile || rpProcessing}>
              {rpProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</> : <><FileText className="w-4 h-4 mr-2" />Convert to Specification</>}
            </Button>
            {rpResultUrl && (
              <Button variant="outline" onClick={downloadRp}><Download className="w-4 h-4 mr-2" />Download</Button>
            )}
          </div>
          {rpResultUrl && (
            <div className="border border-border rounded-xl overflow-hidden">
              <iframe src={rpResultUrl} className="w-full h-[700px]" title="PDF Preview" />
            </div>
          )}
        </TabsContent>

        {/* Extract to Excel Tab */}
        <TabsContent value="extract-excel" className="space-y-4 mt-4">
          <UploadArea file={exFile} onFile={handleExFile} />
          <div className="flex gap-3">
            <Button onClick={processEx} disabled={!exFile || exProcessing}>
              {exProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Extracting…</> : <><Table2 className="w-4 h-4 mr-2" />Extract Data</>}
            </Button>
            {exItems.length > 0 && (
              <Button variant="outline" onClick={downloadExcel}><Download className="w-4 h-4 mr-2" />Download Excel</Button>
            )}
          </div>
          {exItems.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      {['Item Ref','Type','Qty','Width','Height','Price','Currency','Glass','Uplift','Installation'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {exItems.map((it, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                        <td className="px-3 py-2">{it.itemRef || `W${String(i+1).padStart(2,'0')}`}</td>
                        <td className="px-3 py-2">{it.type}</td>
                        <td className="px-3 py-2">{it.qty}</td>
                        <td className="px-3 py-2">{it.widthMm}</td>
                        <td className="px-3 py-2">{it.heightMm}</td>
                        <td className="px-3 py-2">{it.manufacturePrice}</td>
                        <td className="px-3 py-2">{it.currency}</td>
                        <td className="px-3 py-2">{it.glassThicknessMm ? `${it.glassThicknessMm}mm` : '—'}</td>
                        <td className="px-3 py-2">{it.uplift ?? '—'}</td>
                        <td className="px-3 py-2">{it.installationOverride ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
