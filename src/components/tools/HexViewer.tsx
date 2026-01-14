import { useState, useCallback } from "react";
import { Binary, Upload, FileCode, Download } from "lucide-react";
import { toast } from "sonner";

const HexViewer = () => {
  const [hexData, setHexData] = useState<string[]>([]);
  const [asciiData, setAsciiData] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const byteToHex = (byte: number): string => {
    return byte.toString(16).padStart(2, '0').toUpperCase();
  };

  const byteToAscii = (byte: number): string => {
    if (byte >= 32 && byte <= 126) {
      return String.fromCharCode(byte);
    }
    return '.';
  };

  const processFile = useCallback((buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    const maxBytes = Math.min(bytes.length, 1024); // Limit to 1KB for display
    
    const hexLines: string[] = [];
    const asciiLines: string[] = [];
    
    for (let i = 0; i < maxBytes; i += 16) {
      const lineBytes = bytes.slice(i, Math.min(i + 16, maxBytes));
      
      let hexLine = '';
      let asciiLine = '';
      
      lineBytes.forEach((byte, index) => {
        hexLine += byteToHex(byte) + ' ';
        if (index === 7) hexLine += ' ';
        asciiLine += byteToAscii(byte);
      });
      
      // Pad if less than 16 bytes
      const padding = 16 - lineBytes.length;
      for (let j = 0; j < padding; j++) {
        hexLine += '   ';
        if (j === 7 - lineBytes.length && lineBytes.length <= 8) hexLine += ' ';
      }
      
      hexLines.push(hexLine.trim());
      asciiLines.push(asciiLine);
    }
    
    setHexData(hexLines);
    setAsciiData(asciiLines);
    setFileSize(bytes.length);
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as ArrayBuffer;
      processFile(result);
      setIsLoading(false);
      toast.success("تم تحليل الملف بنجاح!");
    };
    reader.onerror = () => {
      setIsLoading(false);
      toast.error("حدث خطأ أثناء قراءة الملف");
    };
    reader.readAsArrayBuffer(file);
  }, [processFile]);

  const formatOffset = (index: number): string => {
    return (index * 16).toString(16).padStart(8, '0').toUpperCase();
  };

  return (
    <div className="tool-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-success/10 border border-success/30">
          <Binary className="w-6 h-6 text-success" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">عارض Hex</h3>
          <p className="text-sm text-muted-foreground">Hex Viewer / Dumper</p>
        </div>
      </div>

      {/* Upload Area */}
      <label className="block border-2 border-dashed border-border hover:border-success/50 rounded-xl p-6 text-center cursor-pointer transition-all duration-300 hover:bg-success/5">
        <input
          type="file"
          onChange={handleFileUpload}
          className="hidden"
        />
        <Upload className="w-10 h-10 text-success/50 mx-auto mb-3" />
        <p className="text-foreground font-medium mb-1">رفع ملف للتحليل</p>
        <p className="text-xs text-muted-foreground">أي نوع من الملفات</p>
      </label>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-success/30 border-t-success rounded-full animate-spin" />
        </div>
      )}

      {/* Results */}
      {hexData.length > 0 && !isLoading && (
        <div className="mt-6 animate-fade-in">
          {/* File Info */}
          <div className="flex items-center justify-between mb-4 p-3 bg-secondary/50 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5 text-success" />
              <span className="font-mono text-sm text-foreground truncate max-w-[200px]">{fileName}</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {fileSize} bytes {fileSize > 1024 && '(عرض أول 1KB)'}
            </span>
          </div>

          {/* Hex Display */}
          <div className="bg-background rounded-xl border border-border overflow-hidden">
            <div className="bg-secondary/50 px-4 py-2 border-b border-border">
              <div className="flex font-mono text-xs text-muted-foreground">
                <span className="w-24">OFFSET</span>
                <span className="flex-1">HEX</span>
                <span className="w-24 text-right">ASCII</span>
              </div>
            </div>
            
            <div className="max-h-96 overflow-auto">
              <div className="p-4 space-y-1">
                {hexData.map((hex, index) => (
                  <div key={index} className="flex font-mono text-xs hover:bg-success/5 rounded px-2 py-0.5">
                    <span className="w-24 text-success">{formatOffset(index)}</span>
                    <span className="flex-1 text-foreground tracking-wider">{hex}</span>
                    <span className="w-24 text-right text-primary">{asciiData[index]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-success" />
              <span>Offset</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-foreground" />
              <span>Hex Values</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary" />
              <span>ASCII</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HexViewer;
