import { useState, useCallback } from "react";
import { FileSearch, Upload, AlertTriangle, CheckCircle, FileType, FileDown } from "lucide-react";
import { toast } from "sonner";
import { generateGenericReport } from "@/lib/pdfExport";
import { SaveToCase } from "./SaveToCase";

interface FileSignature {
  hex: string;
  extension: string;
  description: string;
  category: string;
}

const fileSignatures: FileSignature[] = [
  { hex: "89504E47", extension: "PNG", description: "صورة PNG", category: "صورة" },
  { hex: "FFD8FFE0", extension: "JPG", description: "صورة JPEG (JFIF)", category: "صورة" },
  { hex: "FFD8FFE1", extension: "JPG", description: "صورة JPEG (EXIF)", category: "صورة" },
  { hex: "FFD8FFDB", extension: "JPG", description: "صورة JPEG", category: "صورة" },
  { hex: "47494638", extension: "GIF", description: "صورة GIF", category: "صورة" },
  { hex: "52494646", extension: "WEBP", description: "صورة WebP", category: "صورة" },
  { hex: "25504446", extension: "PDF", description: "مستند PDF", category: "مستند" },
  { hex: "504B0304", extension: "ZIP/DOCX/XLSX", description: "ملف مضغوط أو Office", category: "أرشيف" },
  { hex: "504B0506", extension: "ZIP", description: "ملف ZIP فارغ", category: "أرشيف" },
  { hex: "52617221", extension: "RAR", description: "أرشيف RAR", category: "أرشيف" },
  { hex: "1F8B0800", extension: "GZ", description: "ملف GZIP", category: "أرشيف" },
  { hex: "377ABCAF", extension: "7Z", description: "أرشيف 7-Zip", category: "أرشيف" },
  { hex: "4D5A9000", extension: "EXE", description: "ملف تنفيذي Windows", category: "تنفيذي" },
  { hex: "7F454C46", extension: "ELF", description: "ملف تنفيذي Linux", category: "تنفيذي" },
  { hex: "49443303", extension: "MP3", description: "ملف صوتي MP3 (ID3v2)", category: "صوت" },
  { hex: "FFFB9000", extension: "MP3", description: "ملف صوتي MP3", category: "صوت" },
  { hex: "00000020", extension: "MP4", description: "فيديو MP4", category: "فيديو" },
  { hex: "00000018", extension: "MP4", description: "فيديو MP4", category: "فيديو" },
  { hex: "1A45DFA3", extension: "MKV/WEBM", description: "فيديو Matroska/WebM", category: "فيديو" },
  { hex: "D0CF11E0", extension: "DOC/XLS/PPT", description: "مستند Office قديم", category: "مستند" },
];

interface DetectionResult {
  detectedType: FileSignature | null;
  actualExtension: string;
  headerHex: string;
  isMatch: boolean;
  isSuspicious: boolean;
}

const FileSignatureDetector = () => {
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const detectSignature = useCallback((buffer: ArrayBuffer, extension: string): DetectionResult => {
    const bytes = new Uint8Array(buffer.slice(0, 8));
    const headerHex = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0').toUpperCase())
      .join('');

    let detectedType: FileSignature | null = null;
    
    for (const sig of fileSignatures) {
      if (headerHex.startsWith(sig.hex)) {
        detectedType = sig;
        break;
      }
    }

    const actualExt = extension.toUpperCase();
    const isMatch = detectedType?.extension.includes(actualExt) || 
                   (detectedType?.extension === "ZIP/DOCX/XLSX" && ["DOCX", "XLSX", "PPTX", "ZIP"].includes(actualExt));
    const isSuspicious = detectedType !== null && !isMatch;

    return {
      detectedType,
      actualExtension: actualExt,
      headerHex,
      isMatch,
      isSuspicious,
    };
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);
    
    const extension = file.name.split('.').pop() || '';
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      const detection = detectSignature(buffer, extension);
      setResult(detection);
      setIsLoading(false);
      
      if (detection.isSuspicious) {
        toast.warning("تحذير: نوع الملف لا يتطابق مع الامتداد!");
      } else if (detection.isMatch) {
        toast.success("الملف سليم - التوقيع يتطابق مع الامتداد");
      } else if (!detection.detectedType) {
        toast.info("لم يتم التعرف على نوع الملف");
      }
    };
    reader.readAsArrayBuffer(file);
  }, [detectSignature]);

  return (
    <div className="tool-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30">
          <FileSearch className="w-6 h-6 text-destructive" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">كاشف توقيع الملفات</h3>
          <p className="text-sm text-muted-foreground">Magic Number Detection</p>
        </div>
      </div>

      {/* Upload Area */}
      <label className="block border-2 border-dashed border-border hover:border-destructive/50 rounded-xl p-6 text-center cursor-pointer transition-all duration-300 hover:bg-destructive/5">
        <input
          type="file"
          onChange={handleFileUpload}
          className="hidden"
        />
        <Upload className="w-10 h-10 text-destructive/50 mx-auto mb-3" />
        <p className="text-foreground font-medium mb-1">رفع ملف للفحص</p>
        <p className="text-xs text-muted-foreground">التحقق من توقيع الملف الحقيقي</p>
      </label>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-destructive/30 border-t-destructive rounded-full animate-spin" />
        </div>
      )}

      {/* Results */}
      {result && !isLoading && (
        <div className="mt-6 animate-fade-in space-y-4">
          <div className="flex justify-end gap-2">
            <SaveToCase
              toolName="File Signature Detector"
              reportType="Signature Analysis"
              reportData={{
                fileName,
                extension: result.actualExtension,
                signature: result.headerHex,
                detectedType: result.detectedType?.description,
                isSuspicious: result.isSuspicious
              }}
              fileName={fileName || undefined}
              disabled={!result}
            />
            <button
              onClick={() => {
                generateGenericReport(
                  'File Signature Detector',
                  'كاشف توقيع الملفات',
                  {
                    'Detection Results': {
                      'File Name': fileName || 'Unknown',
                      'Declared Extension': `.${result.actualExtension}`,
                      'File Signature (Hex)': result.headerHex,
                      'Detected Type': result.detectedType?.description || 'Unknown',
                      'Category': result.detectedType?.category || 'Unknown',
                      'Status': result.isSuspicious ? 'SUSPICIOUS - Mismatch Detected' : result.isMatch ? 'Valid - Signature Matches' : 'Unknown Type',
                    },
                  },
                  fileName || undefined
                );
                toast.success("تم تصدير التقرير بنجاح!");
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors text-sm text-primary"
            >
              <FileDown className="w-4 h-4" />
              <span>تصدير PDF</span>
            </button>
          </div>
          {/* Status Banner */}
          <div className={`p-4 rounded-xl border flex items-center gap-3 ${
            result.isSuspicious 
              ? "bg-destructive/10 border-destructive/30"
              : result.isMatch 
                ? "bg-success/10 border-success/30"
                : "bg-warning/10 border-warning/30"
          }`}>
            {result.isSuspicious ? (
              <>
                <AlertTriangle className="w-6 h-6 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">ملف مشبوه!</p>
                  <p className="text-sm text-muted-foreground">التوقيع لا يتطابق مع الامتداد</p>
                </div>
              </>
            ) : result.isMatch ? (
              <>
                <CheckCircle className="w-6 h-6 text-success" />
                <div>
                  <p className="font-medium text-success">ملف سليم</p>
                  <p className="text-sm text-muted-foreground">التوقيع يتطابق مع الامتداد</p>
                </div>
              </>
            ) : (
              <>
                <FileType className="w-6 h-6 text-warning" />
                <div>
                  <p className="font-medium text-warning">نوع غير معروف</p>
                  <p className="text-sm text-muted-foreground">لم يتم التعرف على توقيع الملف</p>
                </div>
              </>
            )}
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-secondary/50 rounded-xl p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">اسم الملف</p>
              <p className="font-mono text-sm text-foreground truncate">{fileName}</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">الامتداد المعلن</p>
              <p className="font-mono text-sm text-primary">.{result.actualExtension}</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">توقيع الملف (Hex)</p>
              <p className="font-mono text-sm text-accent">{result.headerHex}</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">النوع الحقيقي المكتشف</p>
              <p className="font-mono text-sm text-success">
                {result.detectedType?.description || "غير معروف"}
              </p>
            </div>
          </div>

          {result.detectedType && (
            <div className="bg-secondary/50 rounded-xl p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-2">تفاصيل التوقيع</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono">
                  {result.detectedType.extension}
                </span>
                <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs">
                  {result.detectedType.category}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileSignatureDetector;
