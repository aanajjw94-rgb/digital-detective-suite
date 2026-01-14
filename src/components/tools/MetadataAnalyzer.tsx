import { useState, useCallback } from "react";
import { Image, Upload, MapPin, Calendar, Camera, Info } from "lucide-react";
import { toast } from "sonner";

interface ImageMetadata {
  fileName: string;
  fileSize: string;
  fileType: string;
  dimensions?: string;
  lastModified: string;
  exifData?: Record<string, string>;
}

const MetadataAnalyzer = () => {
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const extractMetadata = useCallback((file: File): Promise<ImageMetadata> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = () => {
          const metadata: ImageMetadata = {
            fileName: file.name,
            fileSize: formatFileSize(file.size),
            fileType: file.type,
            dimensions: `${img.naturalWidth} × ${img.naturalHeight}`,
            lastModified: new Date(file.lastModified).toLocaleString('ar-SA'),
            exifData: {
              'العرض': `${img.naturalWidth}px`,
              'الارتفاع': `${img.naturalHeight}px`,
              'النسبة': (img.naturalWidth / img.naturalHeight).toFixed(2),
              'نوع الملف': file.type.split('/')[1].toUpperCase(),
              'الحجم الأصلي': formatFileSize(file.size),
            }
          };
          resolve(metadata);
        };
        img.src = e.target?.result as string;
      };
      
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("الرجاء رفع ملف صورة");
      return;
    }

    setIsLoading(true);
    try {
      const meta = await extractMetadata(file);
      setMetadata(meta);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      toast.success("تم استخراج البيانات الوصفية بنجاح!");
    } catch (error) {
      toast.error("حدث خطأ أثناء تحليل الصورة");
    } finally {
      setIsLoading(false);
    }
  }, [extractMetadata]);

  return (
    <div className="tool-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-accent/10 border border-accent/30">
          <Image className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">محلل البيانات الوصفية</h3>
          <p className="text-sm text-muted-foreground">EXIF Metadata Analyzer</p>
        </div>
      </div>

      {/* Upload Area */}
      <label className="block border-2 border-dashed border-border hover:border-accent/50 rounded-xl p-8 text-center cursor-pointer transition-all duration-300 hover:bg-accent/5">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        <Upload className="w-12 h-12 text-accent/50 mx-auto mb-4" />
        <p className="text-foreground font-medium mb-2">اسحب الصورة هنا أو انقر للرفع</p>
        <p className="text-sm text-muted-foreground">PNG, JPG, WEBP, GIF</p>
      </label>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      )}

      {/* Results */}
      {metadata && !isLoading && (
        <div className="mt-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Preview */}
            {preview && (
              <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  معاينة
                </h4>
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="w-full h-48 object-contain rounded-lg bg-background"
                />
              </div>
            )}

            {/* File Info */}
            <div className="bg-secondary/50 rounded-xl p-4 border border-border">
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Info className="w-4 h-4" />
                معلومات الملف
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">اسم الملف</span>
                  <span className="font-mono text-foreground truncate max-w-[150px]">{metadata.fileName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">الحجم</span>
                  <span className="font-mono text-accent">{metadata.fileSize}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">النوع</span>
                  <span className="font-mono text-primary">{metadata.fileType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">الأبعاد</span>
                  <span className="font-mono text-success">{metadata.dimensions}</span>
                </div>
              </div>
            </div>
          </div>

          {/* EXIF Data */}
          {metadata.exifData && (
            <div className="mt-4 bg-secondary/50 rounded-xl p-4 border border-border">
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                البيانات الوصفية المستخرجة
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(metadata.exifData).map(([key, value]) => (
                  <div key={key} className="bg-background/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{key}</p>
                    <p className="font-mono text-sm text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MetadataAnalyzer;
