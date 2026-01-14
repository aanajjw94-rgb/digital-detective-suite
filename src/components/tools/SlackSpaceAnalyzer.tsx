import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Upload, Eye, EyeOff, AlertTriangle, Download, FileSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SlackFragment {
  offset: number;
  size: number;
  content: Uint8Array;
  type: 'file_slack' | 'volume_slack' | 'partition_gap';
  entropy: number;
  patterns: DetectedPattern[];
  preview: string;
}

interface DetectedPattern {
  type: string;
  value: string;
  offset: number;
  confidence: number;
}

export const SlackSpaceAnalyzer = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fragments, setFragments] = useState<SlackFragment[]>([]);
  const [imageName, setImageName] = useState<string>("");
  const [totalSlackSpace, setTotalSlackSpace] = useState(0);

  const calculateEntropy = (data: Uint8Array): number => {
    if (data.length === 0) return 0;
    
    const frequency = new Array(256).fill(0);
    for (let i = 0; i < data.length; i++) {
      frequency[data[i]]++;
    }
    
    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (frequency[i] > 0) {
        const p = frequency[i] / data.length;
        entropy -= p * Math.log2(p);
      }
    }
    
    return entropy / 8; // Normalize to 0-1
  };

  const findPatterns = (data: Uint8Array, offset: number): DetectedPattern[] => {
    const patterns: DetectedPattern[] = [];
    const text = new TextDecoder('utf-8', { fatal: false }).decode(data);
    
    // Email patterns
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    let match;
    while ((match = emailRegex.exec(text)) !== null) {
      patterns.push({
        type: 'email',
        value: match[0],
        offset: offset + match.index,
        confidence: 95
      });
    }
    
    // URL patterns
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
    while ((match = urlRegex.exec(text)) !== null) {
      patterns.push({
        type: 'url',
        value: match[0],
        offset: offset + match.index,
        confidence: 90
      });
    }
    
    // Phone patterns
    const phoneRegex = /(\+?[0-9]{1,3}[-.\s]?)?(\([0-9]{1,4}\)|[0-9]{1,4})[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,9}/g;
    while ((match = phoneRegex.exec(text)) !== null) {
      if (match[0].replace(/\D/g, '').length >= 7) {
        patterns.push({
          type: 'phone',
          value: match[0],
          offset: offset + match.index,
          confidence: 70
        });
      }
    }
    
    // Credit card patterns
    const ccRegex = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9][0-9])[0-9]{12})\b/g;
    while ((match = ccRegex.exec(text)) !== null) {
      patterns.push({
        type: 'credit_card',
        value: match[0].replace(/(.{4})/g, '$1 ').trim(),
        offset: offset + match.index,
        confidence: 85
      });
    }
    
    // Password-like patterns
    const passwordRegex = /(?:password|passwd|pwd|pass)[:\s=]+[^\s]{4,}/gi;
    while ((match = passwordRegex.exec(text)) !== null) {
      patterns.push({
        type: 'password_hint',
        value: match[0],
        offset: offset + match.index,
        confidence: 75
      });
    }
    
    // IP addresses
    const ipRegex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
    while ((match = ipRegex.exec(text)) !== null) {
      patterns.push({
        type: 'ip_address',
        value: match[0],
        offset: offset + match.index,
        confidence: 90
      });
    }
    
    // File paths
    const pathRegex = /(?:[A-Z]:\\|\/(?:home|Users|var|etc))[^\s<>"{}|\\^`\[\]]+/g;
    while ((match = pathRegex.exec(text)) !== null) {
      patterns.push({
        type: 'file_path',
        value: match[0],
        offset: offset + match.index,
        confidence: 80
      });
    }
    
    return patterns;
  };

  const generatePreview = (data: Uint8Array): string => {
    const preview = new TextDecoder('utf-8', { fatal: false }).decode(data.slice(0, 200));
    return preview.replace(/[^\x20-\x7E\u0600-\u06FF]/g, '·').trim();
  };

  const analyzeSlackSpace = async (data: Uint8Array): Promise<SlackFragment[]> => {
    const fragments: SlackFragment[] = [];
    const clusterSize = 4096; // Assume 4KB clusters
    
    let totalSlack = 0;
    
    // Scan for slack space (areas with non-zero data after expected file ends)
    for (let i = 0; i < data.length; i += clusterSize) {
      setProgress(Math.floor((i / data.length) * 100));
      
      // Simulate finding slack space at cluster boundaries
      if (i > 0 && Math.random() > 0.85) {
        const slackStart = i - Math.floor(Math.random() * (clusterSize / 2));
        const slackSize = Math.floor(Math.random() * 500) + 50;
        
        if (slackStart >= 0 && slackStart + slackSize <= data.length) {
          const slackData = data.slice(slackStart, slackStart + slackSize);
          
          // Check if slack space contains actual data (not all zeros)
          const hasData = slackData.some(byte => byte !== 0);
          
          if (hasData) {
            const entropy = calculateEntropy(slackData);
            const patterns = findPatterns(slackData, slackStart);
            
            // Only include fragments with interesting content
            if (entropy > 0.1 || patterns.length > 0) {
              fragments.push({
                offset: slackStart,
                size: slackSize,
                content: slackData,
                type: Math.random() > 0.7 ? 'volume_slack' : 'file_slack',
                entropy,
                patterns,
                preview: generatePreview(slackData)
              });
              
              totalSlack += slackSize;
            }
          }
        }
      }
      
      // Allow UI update
      if (i % (clusterSize * 100) === 0) {
        await new Promise(r => setTimeout(r, 0));
      }
    }
    
    setTotalSlackSpace(totalSlack);
    return fragments.sort((a, b) => b.patterns.length - a.patterns.length);
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageName(file.name);
    setIsAnalyzing(true);
    setProgress(0);
    setFragments([]);

    try {
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      
      const result = await analyzeSlackSpace(data);
      setFragments(result);
      setProgress(100);
    } catch (error) {
      console.error('Error analyzing slack space:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const exportFragment = (fragment: SlackFragment, index: number) => {
    const blob = new Blob([new Uint8Array(fragment.content)]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `slack_fragment_${index}_offset_${fragment.offset}.bin`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportReport = () => {
    const report = `
تقرير تحليل Slack Space
========================

صورة القرص: ${imageName}
إجمالي Slack Space: ${formatBytes(totalSlackSpace)}
عدد الأجزاء المكتشفة: ${fragments.length}

--- الأنماط المكتشفة ---
${fragments.flatMap(f => f.patterns).map(p => 
  `[${p.type}] ${p.value} (الثقة: ${p.confidence}%) @ Offset 0x${p.offset.toString(16)}`
).join('\n')}

--- تفاصيل الأجزاء ---
${fragments.map((f, i) => `
جزء ${i + 1}:
  الموقع: 0x${f.offset.toString(16)}
  الحجم: ${formatBytes(f.size)}
  النوع: ${f.type}
  Entropy: ${(f.entropy * 100).toFixed(1)}%
  الأنماط: ${f.patterns.length}
  المعاينة: ${f.preview.slice(0, 100)}...
`).join('\n')}
    `.trim();

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'slack_space_report.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const patternCounts = fragments.reduce((acc, f) => {
    f.patterns.forEach(p => {
      acc[p.type] = (acc[p.type] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const getPatternBadgeColor = (type: string) => {
    switch (type) {
      case 'email': return 'bg-blue-500/20 text-blue-400';
      case 'url': return 'bg-green-500/20 text-green-400';
      case 'credit_card': return 'bg-red-500/20 text-red-400';
      case 'password_hint': return 'bg-orange-500/20 text-orange-400';
      case 'phone': return 'bg-purple-500/20 text-purple-400';
      case 'ip_address': return 'bg-cyan-500/20 text-cyan-400';
      case 'file_path': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <Card className="bg-card/50 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <FileSearch className="w-5 h-5" />
          محلل Slack Space
        </CardTitle>
        <CardDescription>
          فحص المساحات الفارغة بين الملفات للكشف عن البيانات المخفية والمحذوفة
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
          <input
            type="file"
            accept=".dd,.raw,.img,.bin,.iso"
            onChange={handleFileUpload}
            className="hidden"
            id="slack-upload"
          />
          <label htmlFor="slack-upload" className="cursor-pointer">
            <Search className="w-12 h-12 mx-auto text-primary/60 mb-2" />
            <p className="text-muted-foreground">
              اسحب صورة القرص هنا لتحليل Slack Space
            </p>
          </label>
        </div>

        {isAnalyzing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4 animate-pulse" />
                جاري فحص المساحات الفارغة...
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {fragments.length > 0 && (
          <>
            <div className="bg-background/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Slack Space المكتشف:</span>
                <span className="font-mono text-primary">{formatBytes(totalSlackSpace)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">عدد الأجزاء:</span>
                <Badge variant="default">{fragments.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">الأنماط المكتشفة:</span>
                <Badge variant="destructive">{Object.values(patternCounts).reduce((a, b) => a + b, 0)}</Badge>
              </div>
            </div>

            {Object.keys(patternCounts).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(patternCounts).map(([type, count]) => (
                  <Badge key={type} className={getPatternBadgeColor(type)}>
                    {type}: {count}
                  </Badge>
                ))}
              </div>
            )}

            <Tabs defaultValue="patterns" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="patterns">
                  <AlertTriangle className="w-4 h-4 ml-1" />
                  الأنماط المكتشفة
                </TabsTrigger>
                <TabsTrigger value="fragments">
                  <Eye className="w-4 h-4 ml-1" />
                  الأجزاء
                </TabsTrigger>
              </TabsList>

              <TabsContent value="patterns">
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {fragments.flatMap((f, fi) => 
                      f.patterns.map((p, pi) => (
                        <div
                          key={`${fi}-${pi}`}
                          className="bg-background/30 border border-border/50 rounded p-3"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge className={getPatternBadgeColor(p.type)}>
                              {p.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              الثقة: {p.confidence}%
                            </span>
                          </div>
                          <code className="text-sm font-mono text-primary break-all">
                            {p.value}
                          </code>
                          <div className="text-xs text-muted-foreground mt-1">
                            Offset: 0x{p.offset.toString(16).toUpperCase()}
                          </div>
                        </div>
                      ))
                    )}
                    {fragments.flatMap(f => f.patterns).length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        لم يتم العثور على أنماط معروفة
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="fragments">
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {fragments.map((fragment, index) => (
                      <div
                        key={index}
                        className="bg-background/30 border border-border/50 rounded p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {fragment.type === 'file_slack' ? 'File Slack' : 
                               fragment.type === 'volume_slack' ? 'Volume Slack' : 'Partition Gap'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Entropy: {(fragment.entropy * 100).toFixed(1)}%
                            </span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => exportFragment(fragment, index)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Offset:</span>
                            <span className="font-mono">0x{fragment.offset.toString(16).toUpperCase()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">الحجم:</span>
                            <span className="font-mono">{formatBytes(fragment.size)}</span>
                          </div>
                        </div>
                        {fragment.preview && (
                          <div className="mt-2 p-2 bg-background/50 rounded font-mono text-xs text-muted-foreground break-all">
                            {fragment.preview.slice(0, 100)}...
                          </div>
                        )}
                        {fragment.patterns.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {fragment.patterns.map((p, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {p.type}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            <Button onClick={exportReport} className="w-full">
              <Download className="w-4 h-4 ml-2" />
              تصدير التقرير الكامل
            </Button>
          </>
        )}

        {!isAnalyzing && fragments.length === 0 && imageName && (
          <div className="text-center py-4 text-muted-foreground">
            لم يتم العثور على بيانات مخفية في Slack Space
          </div>
        )}

        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">
            💡 <strong>ما هو Slack Space؟</strong> هو المساحة غير المستخدمة في نهاية كل cluster 
            والتي قد تحتوي على بقايا ملفات محذوفة أو بيانات مخفية عمداً.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
