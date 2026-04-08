import { useState, useCallback } from 'react';
import { Upload, FileText, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { stripPricesFromPdf } from '@/lib/pdf-price-strip';

export default function PdfEditorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [outputName, setOutputName] = useState('');

  const handleFile = useCallback((f: File) => {
    if (f.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }
    setFile(f);
    setResultUrl(null);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const processFile = async () => {
    if (!file) return;
    setProcessing(true);
    setResultUrl(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const dataUrl = await stripPricesFromPdf(arrayBuffer);
      setResultUrl(dataUrl);
      const baseName = file.name.replace(/\.pdf$/i, '');
      setOutputName(`${baseName} - Specifications.pdf`);
      toast.success('PDF processed successfully');
    } catch (err: any) {
      console.error('PDF processing error:', err);
      toast.error(err.message || 'Failed to process PDF');
    } finally {
      setProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!resultUrl) return;
    const link = document.createElement('a');
    link.href = resultUrl;
    link.download = outputName;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">PDF Editor</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Convert supplier quotes to client-facing specification PDFs
        </p>
      </div>

      {/* Upload area */}
      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
        onClick={() => document.getElementById('pdf-upload')?.click()}
      >
        <input
          id="pdf-upload"
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={onFileInput}
        />
        <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-foreground">
          {file ? file.name : 'Drop a supplier PDF here or click to browse'}
        </p>
        {file && (
          <p className="text-xs text-muted-foreground mt-1">
            {(file.size / 1024).toFixed(0)} KB
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={processFile} disabled={!file || processing}>
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Convert to Specification
            </>
          )}
        </Button>
        {resultUrl && (
          <Button variant="outline" onClick={downloadResult}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        )}
      </div>

      {/* Preview */}
      {resultUrl && (
        <div className="border border-border rounded-xl overflow-hidden">
          <iframe
            src={resultUrl}
            className="w-full h-[700px]"
            title="PDF Preview"
          />
        </div>
      )}
    </div>
  );
}
