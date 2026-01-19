import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, AlertTriangle, Info, Bug, Search, Download, Filter, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateAndroidLogReport } from "@/lib/pdfExport";
import { toast } from "sonner";

interface LogEntry {
  timestamp: string;
  pid: string;
  tid: string;
  level: 'V' | 'D' | 'I' | 'W' | 'E' | 'F';
  tag: string;
  message: string;
  raw: string;
}

interface AnalysisResult {
  totalLines: number;
  errors: LogEntry[];
  warnings: LogEntry[];
  suspiciousActivities: LogEntry[];
  appActivities: { [key: string]: number };
  timeRange: { start: string; end: string };
  crashLogs: LogEntry[];
  networkActivities: LogEntry[];
  sensitiveData: LogEntry[];
}

export const AndroidLogAnalyzer = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const parseLogLine = (line: string): LogEntry | null => {
    // Standard logcat format: MM-DD HH:MM:SS.mmm PID TID Level Tag: Message
    const regex = /^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+(\d+)\s+([VDIWEF])\s+([^:]+):\s*(.*)$/;
    const match = line.match(regex);
    
    if (match) {
      return {
        timestamp: match[1],
        pid: match[2],
        tid: match[3],
        level: match[4] as LogEntry['level'],
        tag: match[5].trim(),
        message: match[6],
        raw: line
      };
    }

    // Alternative format without PID/TID
    const altRegex = /^([VDIWEF])\/([^(]+)\(\s*(\d+)\):\s*(.*)$/;
    const altMatch = line.match(altRegex);
    
    if (altMatch) {
      return {
        timestamp: new Date().toISOString(),
        pid: altMatch[3],
        tid: '',
        level: altMatch[1] as LogEntry['level'],
        tag: altMatch[2].trim(),
        message: altMatch[4],
        raw: line
      };
    }

    return null;
  };

  const analyzeForForensics = (entries: LogEntry[]): AnalysisResult => {
    const errors = entries.filter(e => e.level === 'E' || e.level === 'F');
    const warnings = entries.filter(e => e.level === 'W');
    
    // Detect suspicious activities
    const suspiciousPatterns = [
      /permission/i, /denied/i, /root/i, /su\s/i, /inject/i,
      /exploit/i, /malware/i, /keylog/i, /screenshot/i, /record/i,
      /hidden/i, /stealth/i, /spy/i
    ];
    
    const suspiciousActivities = entries.filter(e => 
      suspiciousPatterns.some(pattern => pattern.test(e.message) || pattern.test(e.tag))
    );

    // Detect crash logs
    const crashPatterns = [/FATAL/i, /crash/i, /exception/i, /ANR/i, /force close/i];
    const crashLogs = entries.filter(e =>
      crashPatterns.some(pattern => pattern.test(e.message))
    );

    // Detect network activities
    const networkPatterns = [/http/i, /https/i, /socket/i, /connect/i, /network/i, /wifi/i, /upload/i, /download/i];
    const networkActivities = entries.filter(e =>
      networkPatterns.some(pattern => pattern.test(e.message) || pattern.test(e.tag))
    );

    // Detect sensitive data exposure
    const sensitivePatterns = [
      /password/i, /token/i, /api.?key/i, /secret/i, /credential/i,
      /ssn/i, /credit.?card/i, /\b\d{16}\b/, /bearer/i
    ];
    const sensitiveData = entries.filter(e =>
      sensitivePatterns.some(pattern => pattern.test(e.message))
    );

    // Count app activities
    const appActivities: { [key: string]: number } = {};
    entries.forEach(e => {
      appActivities[e.tag] = (appActivities[e.tag] || 0) + 1;
    });

    // Get time range
    const timestamps = entries.map(e => e.timestamp).filter(t => t);
    const timeRange = {
      start: timestamps[0] || 'N/A',
      end: timestamps[timestamps.length - 1] || 'N/A'
    };

    return {
      totalLines: entries.length,
      errors,
      warnings,
      suspiciousActivities,
      appActivities,
      timeRange,
      crashLogs,
      networkActivities,
      sensitiveData
    };
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      const parsedLogs = lines
        .map(line => parseLogLine(line))
        .filter((entry): entry is LogEntry => entry !== null);

      setLogs(parsedLogs);
      setAnalysis(analyzeForForensics(parsedLogs));
    } catch (error) {
      console.error('Error parsing logs:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchQuery === "" || 
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.tag.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter === "all" || log.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'E': case 'F': return 'text-red-500';
      case 'W': return 'text-yellow-500';
      case 'I': return 'text-blue-500';
      case 'D': return 'text-gray-500';
      default: return 'text-gray-400';
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'E': case 'F': return 'destructive';
      case 'W': return 'warning' as any;
      default: return 'secondary';
    }
  };

  const exportReport = () => {
    if (!analysis) return;

    const report = `
تقرير تحليل سجلات Android
========================

النطاق الزمني: ${analysis.timeRange.start} - ${analysis.timeRange.end}
إجمالي السطور: ${analysis.totalLines}

الأخطاء: ${analysis.errors.length}
التحذيرات: ${analysis.warnings.length}
الأنشطة المشبوهة: ${analysis.suspiciousActivities.length}
سجلات الأعطال: ${analysis.crashLogs.length}
أنشطة الشبكة: ${analysis.networkActivities.length}
تسريبات البيانات الحساسة: ${analysis.sensitiveData.length}

--- الأنشطة المشبوهة ---
${analysis.suspiciousActivities.map(s => `[${s.timestamp}] ${s.tag}: ${s.message}`).join('\n')}

--- تسريبات البيانات الحساسة ---
${analysis.sensitiveData.map(s => `[${s.timestamp}] ${s.tag}: ${s.message}`).join('\n')}

--- الأخطاء الحرجة ---
${analysis.errors.slice(0, 50).map(e => `[${e.timestamp}] ${e.tag}: ${e.message}`).join('\n')}
    `.trim();

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'forensic_log_report.txt';
    a.click();
  };

  return (
    <Card className="bg-card/50 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <FileText className="w-5 h-5" />
          محلل سجلات Android (Logcat)
        </CardTitle>
        <CardDescription>
          تحليل ملفات logcat للكشف عن الأنشطة المشبوهة والأدلة الرقمية
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
          <input
            type="file"
            accept=".txt,.log"
            onChange={handleFileUpload}
            className="hidden"
            id="logcat-upload"
          />
          <label htmlFor="logcat-upload" className="cursor-pointer">
            <Upload className="w-12 h-12 mx-auto text-primary/60 mb-2" />
            <p className="text-muted-foreground">
              اسحب ملف logcat (.txt, .log) هنا أو اضغط للاختيار
            </p>
          </label>
        </div>

        {analysis && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-background/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-primary">{analysis.totalLines}</div>
                <div className="text-xs text-muted-foreground">إجمالي السطور</div>
              </div>
              <div className="bg-destructive/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-destructive">{analysis.errors.length}</div>
                <div className="text-xs text-muted-foreground">أخطاء</div>
              </div>
              <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-yellow-500">{analysis.warnings.length}</div>
                <div className="text-xs text-muted-foreground">تحذيرات</div>
              </div>
              <div className="bg-primary/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-primary">{analysis.suspiciousActivities.length}</div>
                <div className="text-xs text-muted-foreground">مشبوهة</div>
              </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="flex flex-wrap h-auto gap-1">
                <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
                <TabsTrigger value="suspicious" className="text-destructive">
                  مشبوهة ({analysis.suspiciousActivities.length})
                </TabsTrigger>
                <TabsTrigger value="sensitive">
                  تسريبات ({analysis.sensitiveData.length})
                </TabsTrigger>
                <TabsTrigger value="crashes">
                  أعطال ({analysis.crashLogs.length})
                </TabsTrigger>
                <TabsTrigger value="all">كل السجلات</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3">
                <div className="bg-background/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">النطاق الزمني:</span>
                    <span className="font-mono text-sm">{analysis.timeRange.start} - {analysis.timeRange.end}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">أنشطة الشبكة:</span>
                    <Badge variant="outline">{analysis.networkActivities.length}</Badge>
                  </div>
                </div>

                <div className="bg-background/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-2">أكثر التطبيقات نشاطاً:</h4>
                  <div className="space-y-1">
                    {Object.entries(analysis.appActivities)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 10)
                      .map(([tag, count]) => (
                        <div key={tag} className="flex justify-between text-sm">
                          <span className="font-mono truncate max-w-[200px]">{tag}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="suspicious">
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {analysis.suspiciousActivities.map((log, i) => (
                      <div key={i} className="bg-destructive/5 border border-destructive/20 rounded p-2">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-3 h-3 text-destructive" />
                          <span className="font-mono text-xs text-muted-foreground">{log.timestamp}</span>
                          <Badge variant="outline" className="text-xs">{log.tag}</Badge>
                        </div>
                        <p className="text-sm font-mono break-all">{log.message}</p>
                      </div>
                    ))}
                    {analysis.suspiciousActivities.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">لم يتم العثور على أنشطة مشبوهة</p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="sensitive">
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {analysis.sensitiveData.map((log, i) => (
                      <div key={i} className="bg-yellow-500/5 border border-yellow-500/20 rounded p-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Info className="w-3 h-3 text-yellow-500" />
                          <span className="font-mono text-xs text-muted-foreground">{log.timestamp}</span>
                          <Badge variant="outline" className="text-xs">{log.tag}</Badge>
                        </div>
                        <p className="text-sm font-mono break-all">{log.message}</p>
                      </div>
                    ))}
                    {analysis.sensitiveData.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">لم يتم العثور على تسريبات</p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="crashes">
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {analysis.crashLogs.map((log, i) => (
                      <div key={i} className="bg-destructive/5 border border-destructive/20 rounded p-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Bug className="w-3 h-3 text-destructive" />
                          <span className="font-mono text-xs text-muted-foreground">{log.timestamp}</span>
                          <Badge variant="destructive" className="text-xs">{log.tag}</Badge>
                        </div>
                        <p className="text-sm font-mono break-all">{log.message}</p>
                      </div>
                    ))}
                    {analysis.crashLogs.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">لم يتم العثور على أعطال</p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="all" className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث في السجلات..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={levelFilter} onValueChange={setLevelFilter}>
                    <SelectTrigger className="w-32">
                      <Filter className="w-4 h-4 ml-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="E">Error</SelectItem>
                      <SelectItem value="W">Warning</SelectItem>
                      <SelectItem value="I">Info</SelectItem>
                      <SelectItem value="D">Debug</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ScrollArea className="h-64">
                  <div className="space-y-1 font-mono text-xs">
                    {filteredLogs.slice(0, 200).map((log, i) => (
                      <div key={i} className={`p-1 rounded ${getLevelColor(log.level)}`}>
                        <span className="text-muted-foreground">{log.timestamp}</span>
                        {' '}
                        <Badge variant={getLevelBadge(log.level)} className="text-xs py-0">{log.level}</Badge>
                        {' '}
                        <span className="text-primary">{log.tag}:</span>
                        {' '}
                        <span>{log.message}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2">
              <Button onClick={exportReport} className="flex-1" variant="outline">
                <Download className="w-4 h-4 ml-2" />
                تصدير TXT
              </Button>
              <Button 
                onClick={() => {
                  const topApps = Object.entries(analysis.appActivities)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 15) as Array<[string, number]>;
                  
                  generateAndroidLogReport({
                    totalLines: analysis.totalLines,
                    errors: analysis.errors.length,
                    warnings: analysis.warnings.length,
                    suspiciousActivities: analysis.suspiciousActivities,
                    sensitiveData: analysis.sensitiveData,
                    crashLogs: analysis.crashLogs.length,
                    networkActivities: analysis.networkActivities.length,
                    timeRange: analysis.timeRange,
                    topApps,
                  });
                  toast.success("تم تصدير التقرير بنجاح!");
                }}
                className="flex-1"
              >
                <FileDown className="w-4 h-4 ml-2" />
                تصدير PDF
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
