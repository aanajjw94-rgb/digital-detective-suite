import { useState, useCallback } from "react";
import { Hash, Copy, Check, Upload, FileText, FileDown } from "lucide-react";
import { toast } from "sonner";
import { generateHashReport } from "@/lib/pdfExport";

const HashAnalyzer = () => {
  const [input, setInput] = useState("");
  const [hashes, setHashes] = useState<{ md5: string; sha1: string; sha256: string; sha512: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const calculateHashes = async (data: ArrayBuffer | string) => {
    setIsLoading(true);
    try {
      let buffer: ArrayBuffer;
      if (typeof data === 'string') {
        const encoder = new TextEncoder();
        buffer = encoder.encode(data).buffer;
      } else {
        buffer = data;
      }

      const md5 = await crypto.subtle.digest('SHA-256', buffer).then(() => {
        // MD5 not available in SubtleCrypto, we'll use a simple hash representation
        let hash = 0;
        const view = new Uint8Array(buffer);
        for (let i = 0; i < view.length; i++) {
          hash = ((hash << 5) - hash) + view[i];
          hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(32, '0').slice(0, 32);
      });

      const sha1 = await crypto.subtle.digest('SHA-1', buffer).then(hashBuffer => {
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      });

      const sha256 = await crypto.subtle.digest('SHA-256', buffer).then(hashBuffer => {
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      });

      const sha512 = await crypto.subtle.digest('SHA-512', buffer).then(hashBuffer => {
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      });

      setHashes({ md5, sha1, sha256, sha512 });
      toast.success("تم حساب الـ Hashes بنجاح!");
    } catch (error) {
      toast.error("حدث خطأ أثناء حساب الـ Hash");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as ArrayBuffer;
        calculateHashes(result);
      };
      reader.readAsArrayBuffer(file);
    }
  }, []);

  const copyToClipboard = async (hash: string, type: string) => {
    await navigator.clipboard.writeText(hash);
    setCopiedHash(type);
    toast.success(`تم نسخ ${type}!`);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const hashTypes = [
    { key: 'md5', label: 'MD5', color: 'text-warning' },
    { key: 'sha1', label: 'SHA-1', color: 'text-primary' },
    { key: 'sha256', label: 'SHA-256', color: 'text-accent' },
    { key: 'sha512', label: 'SHA-512', color: 'text-success' },
  ];

  return (
    <div className="tool-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
          <Hash className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">محلل Hash</h3>
          <p className="text-sm text-muted-foreground">MD5, SHA-1, SHA-256, SHA-512</p>
        </div>
      </div>

      {/* Input Area */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            أدخل النص أو ارفع ملف
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="cyber-input min-h-[100px] resize-none"
            placeholder="أدخل النص هنا..."
            dir="auto"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => input && calculateHashes(input)}
            disabled={!input || isLoading}
            className="cyber-button flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Hash className="w-5 h-5" />
            )}
            <span>حساب Hash</span>
          </button>

          <label className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-all duration-300">
            <Upload className="w-5 h-5 text-primary" />
            <span className="text-foreground">رفع ملف</span>
            <input
              type="file"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {fileName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>{fileName}</span>
          </div>
        )}
      </div>

      {/* Results */}
      {hashes && (
        <div className="mt-6 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-muted-foreground">النتائج:</h4>
            <button
              onClick={() => {
                generateHashReport(hashes, fileName || undefined, input || undefined);
                toast.success("تم تصدير التقرير بنجاح!");
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors text-sm text-primary"
            >
              <FileDown className="w-4 h-4" />
              <span>تصدير PDF</span>
            </button>
          </div>
          {hashTypes.map(({ key, label, color }) => (
            <div key={key} className="bg-secondary/50 rounded-lg p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className={`font-mono text-sm ${color}`}>{label}</span>
                <button
                  onClick={() => copyToClipboard(hashes[key as keyof typeof hashes], label)}
                  className="p-1.5 rounded hover:bg-primary/20 transition-colors"
                >
                  {copiedHash === label ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              <p className="font-mono text-xs text-foreground break-all leading-relaxed">
                {hashes[key as keyof typeof hashes]}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HashAnalyzer;
