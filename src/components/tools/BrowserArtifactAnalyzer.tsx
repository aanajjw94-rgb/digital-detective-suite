import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Upload, History, Cookie, Download, Search, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { SaveToCase } from "./SaveToCase";

interface HistoryEntry {
  url: string;
  title: string;
  visitTime: string;
  visitCount: number;
  domain: string;
}

interface CookieEntry {
  domain: string;
  name: string;
  value: string;
  expires: string;
  secure: boolean;
  httpOnly: boolean;
}

interface DownloadEntry {
  fileName: string;
  url: string;
  downloadTime: string;
  fileSize: string;
  mimeType: string;
}

interface AnalysisResult {
  history: HistoryEntry[];
  cookies: CookieEntry[];
  downloads: DownloadEntry[];
  suspiciousFindings: string[];
  statistics: {
    totalVisits: number;
    uniqueDomains: number;
    topDomains: { domain: string; count: number }[];
    dateRange: { start: string; end: string };
  };
}

export const BrowserArtifactAnalyzer = () => {
  const [inputData, setInputData] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("history");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseHistoryCSV = (text: string): HistoryEntry[] => {
    const lines = text.split('\n').filter(l => l.trim());
    const entries: HistoryEntry[] = [];

    lines.forEach(line => {
      // Try to parse various CSV formats
      const parts = line.split(',');
      if (parts.length >= 2) {
        const url = parts[0]?.replace(/"/g, '').trim() || '';
        const title = parts[1]?.replace(/"/g, '').trim() || '';
        const time = parts[2]?.replace(/"/g, '').trim() || '';
        const count = parseInt(parts[3]) || 1;

        if (url.startsWith('http')) {
          try {
            const urlObj = new URL(url);
            entries.push({
              url,
              title: title || urlObj.hostname,
              visitTime: time || new Date().toISOString(),
              visitCount: count,
              domain: urlObj.hostname
            });
          } catch {
            // Invalid URL, skip
          }
        }
      }
    });

    return entries;
  };

  const parseCookiesJSON = (text: string): CookieEntry[] => {
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        return data.map(c => ({
          domain: c.domain || c.host || '',
          name: c.name || '',
          value: c.value || '',
          expires: c.expirationDate ? new Date(c.expirationDate * 1000).toISOString() : 'Session',
          secure: c.secure || false,
          httpOnly: c.httpOnly || false
        }));
      }
    } catch {
      // Not valid JSON, try line parsing
      const lines = text.split('\n').filter(l => l.trim());
      return lines.map(line => {
        const parts = line.split('\t');
        return {
          domain: parts[0] || '',
          name: parts[5] || '',
          value: parts[6] || '',
          expires: parts[4] || 'Unknown',
          secure: parts[3] === 'TRUE',
          httpOnly: parts[1] === 'TRUE'
        };
      }).filter(c => c.domain);
    }
    return [];
  };

  const extractURLs = (text: string): HistoryEntry[] => {
    const urlRegex = /https?:\/\/[^\s<>"]+/g;
    const matches = text.match(urlRegex) || [];
    const entries: HistoryEntry[] = [];

    matches.forEach(url => {
      try {
        const urlObj = new URL(url);
        entries.push({
          url,
          title: urlObj.pathname.substring(0, 50),
          visitTime: '',
          visitCount: 1,
          domain: urlObj.hostname
        });
      } catch {
        // Invalid URL
      }
    });

    return entries;
  };

  const detectSuspiciousActivity = (history: HistoryEntry[], cookies: CookieEntry[]): string[] => {
    const findings: string[] = [];
    
    // Suspicious domains
    const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz'];
    const suspiciousKeywords = ['phish', 'hack', 'crack', 'warez', 'torrent', 'darkweb', 'proxy', 'vpn'];
    
    history.forEach(entry => {
      if (suspiciousTLDs.some(tld => entry.domain.endsWith(tld))) {
        findings.push(`نطاق مشبوه: ${entry.domain}`);
      }
      if (suspiciousKeywords.some(kw => entry.url.toLowerCase().includes(kw))) {
        findings.push(`كلمة مفتاحية مشبوهة في: ${entry.url.substring(0, 50)}...`);
      }
    });

    // Check for data exfiltration patterns
    const uniqueDomains = new Set(history.map(h => h.domain));
    if (uniqueDomains.size > 100) {
      findings.push(`عدد كبير من النطاقات المختلفة (${uniqueDomains.size}) - قد يشير لنشاط مشبوه`);
    }

    // Check cookies
    cookies.forEach(cookie => {
      if (!cookie.secure && cookie.domain.includes('bank')) {
        findings.push(`كوكي غير آمن لموقع مصرفي: ${cookie.domain}`);
      }
    });

    return [...new Set(findings)];
  };

  const analyzeData = () => {
    if (!inputData.trim()) {
      toast.error("الرجاء إدخال بيانات للتحليل");
      return;
    }

    setIsAnalyzing(true);
    setTimeout(() => {
      let history: HistoryEntry[] = [];
      let cookies: CookieEntry[] = [];
      const downloads: DownloadEntry[] = [];

      // Try to detect data type and parse accordingly
      if (inputData.includes('"url"') || inputData.includes('"domain"')) {
        // Looks like JSON
        try {
          const json = JSON.parse(inputData);
          if (json.history) history = json.history;
          if (json.cookies) cookies = parseCookiesJSON(JSON.stringify(json.cookies));
        } catch {
          cookies = parseCookiesJSON(inputData);
        }
      } else if (inputData.includes('http://') || inputData.includes('https://')) {
        // Contains URLs
        history = extractURLs(inputData);
        // Also try CSV parsing
        const csvHistory = parseHistoryCSV(inputData);
        if (csvHistory.length > history.length) {
          history = csvHistory;
        }
      } else {
        // Try as cookies text file
        cookies = parseCookiesJSON(inputData);
      }

      // Generate statistics
      const domainCounts: { [key: string]: number } = {};
      history.forEach(h => {
        domainCounts[h.domain] = (domainCounts[h.domain] || 0) + 1;
      });

      const topDomains = Object.entries(domainCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([domain, count]) => ({ domain, count }));

      const suspiciousFindings = detectSuspiciousActivity(history, cookies);

      setResult({
        history,
        cookies,
        downloads,
        suspiciousFindings,
        statistics: {
          totalVisits: history.length,
          uniqueDomains: Object.keys(domainCounts).length,
          topDomains,
          dateRange: {
            start: history[0]?.visitTime || 'N/A',
            end: history[history.length - 1]?.visitTime || 'N/A'
          }
        }
      });

      setIsAnalyzing(false);
      
      if (history.length > 0 || cookies.length > 0) {
        toast.success(`تم تحليل ${history.length} سجل تاريخ و ${cookies.length} كوكي`);
      } else {
        toast.warning("لم يتم العثور على بيانات قابلة للتحليل");
      }
    }, 500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setInputData(event.target?.result as string);
      toast.success("تم تحميل الملف");
    };
    reader.readAsText(file);
  };

  const getReportData = () => result;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Globe className="w-5 h-5 text-primary" />
          محلل آثار المتصفح
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            أدخل بيانات المتصفح (سجل التاريخ، الكوكيز، التنزيلات)
          </label>
          <Textarea
            value={inputData}
            onChange={(e) => setInputData(e.target.value)}
            placeholder="الصق هنا محتوى ملف history، cookies.json، أو أي بيانات متصفح..."
            className="min-h-[120px] font-mono text-sm bg-secondary/50"
            dir="ltr"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={analyzeData} disabled={isAnalyzing}>
            <Search className="w-4 h-4 mr-2" />
            {isAnalyzing ? "جاري التحليل..." : "تحليل البيانات"}
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            تحميل ملف
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv,.txt,.sqlite"
            onChange={handleFileUpload}
            className="hidden"
          />
          {result && (
            <SaveToCase
              toolName="محلل آثار المتصفح"
              reportType="browser_artifact_analysis"
              reportData={getReportData()}
            />
          )}
        </div>

        {result && (
          <div className="space-y-4">
            {/* Suspicious Findings */}
            {result.suspiciousFindings.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <h4 className="font-medium text-red-400 mb-2">⚠️ نتائج مشبوهة ({result.suspiciousFindings.length})</h4>
                <ul className="space-y-1">
                  {result.suspiciousFindings.map((finding, i) => (
                    <li key={i} className="text-sm text-red-300">{finding}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-secondary/50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-primary">{result.statistics.totalVisits}</div>
                <div className="text-xs text-muted-foreground">إجمالي الزيارات</div>
              </div>
              <div className="bg-secondary/50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-primary">{result.statistics.uniqueDomains}</div>
                <div className="text-xs text-muted-foreground">نطاقات فريدة</div>
              </div>
              <div className="bg-secondary/50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-primary">{result.cookies.length}</div>
                <div className="text-xs text-muted-foreground">كوكيز</div>
              </div>
              <div className="bg-secondary/50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-primary">{result.downloads.length}</div>
                <div className="text-xs text-muted-foreground">تنزيلات</div>
              </div>
            </div>

            {/* Top Domains */}
            {result.statistics.topDomains.length > 0 && (
              <div className="bg-secondary/50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">أكثر النطاقات زيارة</h4>
                <div className="flex flex-wrap gap-2">
                  {result.statistics.topDomains.map((d, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {d.domain} ({d.count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs for detailed data */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="history" className="flex-1">
                  <History className="w-4 h-4 mr-2" />
                  السجل ({result.history.length})
                </TabsTrigger>
                <TabsTrigger value="cookies" className="flex-1">
                  <Cookie className="w-4 h-4 mr-2" />
                  الكوكيز ({result.cookies.length})
                </TabsTrigger>
                <TabsTrigger value="downloads" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  التنزيلات ({result.downloads.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="history" className="mt-4">
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {result.history.slice(0, 50).map((entry, i) => (
                    <div key={i} className="bg-background/50 p-3 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{entry.title}</div>
                          <div className="text-xs text-muted-foreground font-mono truncate" dir="ltr">
                            {entry.url}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-xs">
                            {entry.visitCount}x
                          </Badge>
                          {entry.visitTime && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {entry.visitTime.substring(0, 10)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {result.history.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">لا توجد سجلات</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="cookies" className="mt-4">
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {result.cookies.slice(0, 50).map((cookie, i) => (
                    <div key={i} className="bg-background/50 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-sm">{cookie.name}</span>
                        <div className="flex gap-1">
                          {cookie.secure && <Badge className="text-xs bg-green-500/20 text-green-400">Secure</Badge>}
                          {cookie.httpOnly && <Badge className="text-xs bg-blue-500/20 text-blue-400">HttpOnly</Badge>}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">{cookie.domain}</div>
                      <div className="text-xs font-mono text-muted-foreground truncate mt-1" dir="ltr">
                        {cookie.value.substring(0, 50)}...
                      </div>
                    </div>
                  ))}
                  {result.cookies.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">لا توجد كوكيز</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="downloads" className="mt-4">
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {result.downloads.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">لا توجد تنزيلات</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BrowserArtifactAnalyzer;
