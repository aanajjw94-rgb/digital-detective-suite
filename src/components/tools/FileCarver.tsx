import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HardDrive, Upload, FileImage, FileVideo, FileAudio, FileText, File, Download, Search, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { generateFileCarverReport } from "@/lib/pdfExport";
import { toast } from "sonner";
import { SaveToCase } from "./SaveToCase";

interface FileSignature {
  name: string;
  extension: string;
  header: number[];
  footer?: number[];
  maxSize?: number;
  icon: typeof FileImage;
  category: 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other';
}

interface CarvedFile {
  type: string;
  extension: string;
  offset: number;
  size: number;
  data: Blob;
  category: string;
  confidence: number;
}

const fileSignatures: FileSignature[] = [
  // Images
  { name: "JPEG", extension: "jpg", header: [0xFF, 0xD8, 0xFF], footer: [0xFF, 0xD9], maxSize: 50000000, icon: FileImage, category: 'image' },
  { name: "PNG", extension: "png", header: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], footer: [0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82], maxSize: 50000000, icon: FileImage, category: 'image' },
  { name: "GIF", extension: "gif", header: [0x47, 0x49, 0x46, 0x38], footer: [0x00, 0x3B], maxSize: 20000000, icon: FileImage, category: 'image' },
  { name: "BMP", extension: "bmp", header: [0x42, 0x4D], maxSize: 50000000, icon: FileImage, category: 'image' },
  { name: "WebP", extension: "webp", header: [0x52, 0x49, 0x46, 0x46], maxSize: 50000000, icon: FileImage, category: 'image' },
  
  // Videos
  { name: "MP4", extension: "mp4", header: [0x00, 0x00, 0x00], maxSize: 500000000, icon: FileVideo, category: 'video' },
  { name: "AVI", extension: "avi", header: [0x52, 0x49, 0x46, 0x46], maxSize: 500000000, icon: FileVideo, category: 'video' },
  { name: "MKV", extension: "mkv", header: [0x1A, 0x45, 0xDF, 0xA3], maxSize: 500000000, icon: FileVideo, category: 'video' },
  
  // Audio
  { name: "MP3", extension: "mp3", header: [0x49, 0x44, 0x33], maxSize: 50000000, icon: FileAudio, category: 'audio' },
  { name: "WAV", extension: "wav", header: [0x52, 0x49, 0x46, 0x46], maxSize: 100000000, icon: FileAudio, category: 'audio' },
  { name: "OGG", extension: "ogg", header: [0x4F, 0x67, 0x67, 0x53], maxSize: 50000000, icon: FileAudio, category: 'audio' },
  
  // Documents
  { name: "PDF", extension: "pdf", header: [0x25, 0x50, 0x44, 0x46], footer: [0x25, 0x25, 0x45, 0x4F, 0x46], maxSize: 100000000, icon: FileText, category: 'document' },
  { name: "DOCX/ZIP", extension: "zip", header: [0x50, 0x4B, 0x03, 0x04], maxSize: 100000000, icon: FileText, category: 'document' },
  { name: "RTF", extension: "rtf", header: [0x7B, 0x5C, 0x72, 0x74, 0x66], maxSize: 50000000, icon: FileText, category: 'document' },
  
  // Archives
  { name: "RAR", extension: "rar", header: [0x52, 0x61, 0x72, 0x21], maxSize: 500000000, icon: File, category: 'archive' },
  { name: "7Z", extension: "7z", header: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C], maxSize: 500000000, icon: File, category: 'archive' },
  { name: "GZIP", extension: "gz", header: [0x1F, 0x8B], maxSize: 500000000, icon: File, category: 'archive' },
  
  // Executables
  { name: "EXE", extension: "exe", header: [0x4D, 0x5A], maxSize: 100000000, icon: File, category: 'other' },
  { name: "ELF", extension: "elf", header: [0x7F, 0x45, 0x4C, 0x46], maxSize: 100000000, icon: File, category: 'other' },
];

export const FileCarver = () => {
  const [isCarving, setIsCarving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [carvedFiles, setCarvedFiles] = useState<CarvedFile[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(['image', 'video', 'audio', 'document', 'archive', 'other'])
  );
  const [diskImageName, setDiskImageName] = useState<string>("");
  const [diskImageSize, setDiskImageSize] = useState<number>(0);

  const matchHeader = (data: Uint8Array, offset: number, header: number[]): boolean => {
    if (offset + header.length > data.length) return false;
    for (let i = 0; i < header.length; i++) {
      if (data[offset + i] !== header[i]) return false;
    }
    return true;
  };

  const findFooter = (data: Uint8Array, startOffset: number, footer: number[], maxSize: number): number => {
    const searchEnd = Math.min(startOffset + maxSize, data.length - footer.length);
    for (let i = startOffset + 10; i < searchEnd; i++) {
      let match = true;
      for (let j = 0; j < footer.length; j++) {
        if (data[i + j] !== footer[j]) {
          match = false;
          break;
        }
      }
      if (match) return i + footer.length;
    }
    return -1;
  };

  const carveFiles = async (data: Uint8Array): Promise<CarvedFile[]> => {
    const carved: CarvedFile[] = [];
    const activeSignatures = fileSignatures.filter(sig => selectedCategories.has(sig.category));
    
    for (let i = 0; i < data.length; i++) {
      // Update progress
      if (i % 100000 === 0) {
        setProgress(Math.floor((i / data.length) * 100));
        await new Promise(r => setTimeout(r, 0)); // Allow UI update
      }

      for (const sig of activeSignatures) {
        if (matchHeader(data, i, sig.header)) {
          let endOffset: number;
          let confidence = 80;

          if (sig.footer) {
            endOffset = findFooter(data, i, sig.footer, sig.maxSize || 10000000);
            if (endOffset === -1) {
              // No footer found, estimate size
              endOffset = Math.min(i + (sig.maxSize || 1000000), data.length);
              confidence = 50;
            } else {
              confidence = 95;
            }
          } else {
            // No footer, use max size or reasonable default
            endOffset = Math.min(i + (sig.maxSize || 1000000), data.length);
            confidence = 60;
          }

          const fileSize = endOffset - i;
          if (fileSize > 100 && fileSize < (sig.maxSize || 100000000)) {
            const fileData = data.slice(i, endOffset);
            
            carved.push({
              type: sig.name,
              extension: sig.extension,
              offset: i,
              size: fileSize,
              data: new Blob([fileData]),
              category: sig.category,
              confidence
            });

            // Skip past this file
            i = endOffset - 1;
            break;
          }
        }
      }
    }

    return carved;
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setDiskImageName(file.name);
    setDiskImageSize(file.size);
    setIsCarving(true);
    setProgress(0);
    setCarvedFiles([]);

    try {
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      
      const carved = await carveFiles(data);
      setCarvedFiles(carved);
      setProgress(100);
    } catch (error) {
      console.error('Error carving files:', error);
    } finally {
      setIsCarving(false);
    }
  }, [selectedCategories]);

  const downloadCarvedFile = (file: CarvedFile, index: number) => {
    const url = URL.createObjectURL(file.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carved_${index}_offset_${file.offset}.${file.extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAllFiles = () => {
    carvedFiles.forEach((file, index) => {
      setTimeout(() => downloadCarvedFile(file, index), index * 100);
    });
  };

  const toggleCategory = (category: string) => {
    const newCategories = new Set(selectedCategories);
    if (newCategories.has(category)) {
      newCategories.delete(category);
    } else {
      newCategories.add(category);
    }
    setSelectedCategories(newCategories);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (category: string) => {
    switch (category) {
      case 'image': return FileImage;
      case 'video': return FileVideo;
      case 'audio': return FileAudio;
      case 'document': return FileText;
      default: return File;
    }
  };

  const categoryCounts = carvedFiles.reduce((acc, file) => {
    acc[file.category] = (acc[file.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="bg-card/50 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <HardDrive className="w-5 h-5" />
          أداة File Carving
        </CardTitle>
        <CardDescription>
          استخراج الملفات المحذوفة من صور الأقراص (dd, raw, img)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-background/50 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-3">أنواع الملفات للبحث عنها:</h4>
          <div className="flex flex-wrap gap-3">
            {[
              { id: 'image', label: 'صور', icon: FileImage },
              { id: 'video', label: 'فيديو', icon: FileVideo },
              { id: 'audio', label: 'صوت', icon: FileAudio },
              { id: 'document', label: 'مستندات', icon: FileText },
              { id: 'archive', label: 'أرشيف', icon: File },
              { id: 'other', label: 'أخرى', icon: File }
            ].map(cat => (
              <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedCategories.has(cat.id)}
                  onCheckedChange={() => toggleCategory(cat.id)}
                />
                <cat.icon className="w-4 h-4" />
                <span className="text-sm">{cat.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
          <input
            type="file"
            accept=".dd,.raw,.img,.bin,.iso,.dmg"
            onChange={handleFileUpload}
            className="hidden"
            id="disk-upload"
          />
          <label htmlFor="disk-upload" className="cursor-pointer">
            <HardDrive className="w-12 h-12 mx-auto text-primary/60 mb-2" />
            <p className="text-muted-foreground">
              اسحب صورة القرص هنا أو اضغط للاختيار
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              يدعم: .dd, .raw, .img, .bin, .iso
            </p>
          </label>
        </div>

        {isCarving && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4 animate-pulse" />
                جاري البحث عن الملفات...
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {diskImageName && !isCarving && (
          <div className="bg-background/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">صورة القرص:</span>
              <span className="font-mono text-sm">{diskImageName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الحجم:</span>
              <span className="font-mono text-sm">{formatBytes(diskImageSize)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الملفات المستخرجة:</span>
              <Badge variant="default">{carvedFiles.length}</Badge>
            </div>
          </div>
        )}

        {carvedFiles.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2">
              {Object.entries(categoryCounts).map(([cat, count]) => {
                const Icon = getFileIcon(cat);
                return (
                  <Badge key={cat} variant="secondary" className="flex items-center gap-1">
                    <Icon className="w-3 h-3" />
                    {cat}: {count}
                  </Badge>
                );
              })}
            </div>

            <ScrollArea className="h-64 border rounded-lg p-2">
              <div className="space-y-2">
                {carvedFiles.map((file, index) => {
                  const Icon = getFileIcon(file.category);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-background/50 rounded hover:bg-background/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-primary" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{file.type}</span>
                            <Badge 
                              variant={file.confidence > 80 ? "default" : file.confidence > 60 ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {file.confidence}%
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Offset: 0x{file.offset.toString(16).toUpperCase()} | Size: {formatBytes(file.size)}
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => downloadCarvedFile(file, index)}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="flex gap-2">
              <Button onClick={downloadAllFiles} className="flex-1">
                <Download className="w-4 h-4 ml-2" />
                تحميل الملفات ({carvedFiles.length})
              </Button>
              <SaveToCase
                toolName="File Carver"
                reportType="Carved Files"
                reportData={{
                  diskImage: diskImageName,
                  diskSize: diskImageSize,
                  filesFound: carvedFiles.length,
                  files: carvedFiles.map(f => ({
                    type: f.type,
                    offset: f.offset,
                    size: f.size,
                    confidence: f.confidence
                  }))
                }}
                fileName={diskImageName}
                disabled={carvedFiles.length === 0}
              />
              <Button 
                variant="outline" 
                onClick={() => {
                  generateFileCarverReport(diskImageName, diskImageSize, carvedFiles.map(f => ({
                    type: f.type,
                    extension: f.extension,
                    offset: f.offset,
                    size: f.size,
                    category: f.category,
                    confidence: f.confidence,
                  })));
                  toast.success("تم تصدير التقرير بنجاح!");
                }}
                className="border-primary/30 hover:bg-primary/10"
              >
                <FileDown className="w-4 h-4 ml-2" />
                PDF
              </Button>
            </div>
          </>
        )}

        {!isCarving && carvedFiles.length === 0 && diskImageName && (
          <div className="text-center py-4 text-muted-foreground">
            لم يتم العثور على ملفات قابلة للاستعادة
          </div>
        )}
      </CardContent>
    </Card>
  );
};
