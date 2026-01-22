import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, ArrowDown, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { SaveToCase } from "./SaveToCase";

interface TimelineEvent {
  timestamp: Date;
  type: string;
  description: string;
  source: string;
  importance: "low" | "medium" | "high";
}

export const TimelineAnalyzer = () => {
  const [inputData, setInputData] = useState("");
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const parseTimestamps = (text: string): TimelineEvent[] => {
    const patterns = [
      // ISO 8601
      { regex: /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)/g, type: "ISO 8601" },
      // Unix timestamp (seconds)
      { regex: /\b(1[0-9]{9})\b/g, type: "Unix Timestamp" },
      // Unix timestamp (milliseconds)
      { regex: /\b(1[0-9]{12})\b/g, type: "Unix Timestamp (ms)" },
      // Common date formats
      { regex: /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/g, type: "Date/Time" },
      { regex: /(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})/g, type: "Date/Time" },
      // Windows FILETIME
      { regex: /\b(1[2-3]\d{16})\b/g, type: "Windows FILETIME" },
      // Mac Absolute Time
      { regex: /\b([0-9]{9,10}\.[0-9]+)\b/g, type: "Mac Absolute Time" },
      // Log format
      { regex: /\[(\d{2}\/\w{3}\/\d{4}:\d{2}:\d{2}:\d{2}\s+[+-]\d{4})\]/g, type: "Log Format" },
    ];

    const foundEvents: TimelineEvent[] = [];
    const lines = text.split('\n');

    lines.forEach((line, lineIndex) => {
      patterns.forEach(pattern => {
        const matches = line.matchAll(pattern.regex);
        for (const match of matches) {
          let date: Date | null = null;
          const value = match[1];

          try {
            if (pattern.type === "Unix Timestamp") {
              date = new Date(parseInt(value) * 1000);
            } else if (pattern.type === "Unix Timestamp (ms)") {
              date = new Date(parseInt(value));
            } else if (pattern.type === "Windows FILETIME") {
              const filetime = BigInt(value);
              const unixTime = Number((filetime - BigInt(116444736000000000)) / BigInt(10000));
              date = new Date(unixTime);
            } else if (pattern.type === "Mac Absolute Time") {
              date = new Date((parseFloat(value) + 978307200) * 1000);
            } else {
              date = new Date(value);
            }

            if (date && !isNaN(date.getTime()) && date.getFullYear() > 1970 && date.getFullYear() < 2100) {
              foundEvents.push({
                timestamp: date,
                type: pattern.type,
                description: line.substring(0, 100) + (line.length > 100 ? "..." : ""),
                source: `سطر ${lineIndex + 1}`,
                importance: detectImportance(line)
              });
            }
          } catch {
            // Invalid date, skip
          }
        }
      });
    });

    // Sort by timestamp
    return foundEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  const detectImportance = (text: string): "low" | "medium" | "high" => {
    const highKeywords = ["error", "fail", "delete", "remove", "attack", "malware", "virus", "hack", "breach", "unauthorized"];
    const mediumKeywords = ["warning", "modified", "changed", "access", "login", "logout", "create", "update"];
    
    const lowerText = text.toLowerCase();
    if (highKeywords.some(k => lowerText.includes(k))) return "high";
    if (mediumKeywords.some(k => lowerText.includes(k))) return "medium";
    return "low";
  };

  const analyzeTimeline = () => {
    if (!inputData.trim()) {
      toast.error("الرجاء إدخال بيانات للتحليل");
      return;
    }

    setIsAnalyzing(true);
    setTimeout(() => {
      const parsed = parseTimestamps(inputData);
      setEvents(parsed);
      setIsAnalyzing(false);
      
      if (parsed.length > 0) {
        toast.success(`تم العثور على ${parsed.length} حدث زمني`);
      } else {
        toast.warning("لم يتم العثور على أي timestamps");
      }
    }, 500);
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case "high": return "bg-red-500/20 text-red-400 border-red-500/50";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      default: return "bg-green-500/20 text-green-400 border-green-500/50";
    }
  };

  const getReportData = () => ({
    totalEvents: events.length,
    highImportance: events.filter(e => e.importance === "high").length,
    mediumImportance: events.filter(e => e.importance === "medium").length,
    lowImportance: events.filter(e => e.importance === "low").length,
    timeRange: events.length > 1 ? {
      start: events[0].timestamp.toISOString(),
      end: events[events.length - 1].timestamp.toISOString()
    } : null,
    events: events.map(e => ({
      timestamp: e.timestamp.toISOString(),
      type: e.type,
      description: e.description,
      importance: e.importance
    }))
  });

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Clock className="w-5 h-5 text-primary" />
          محلل الجدول الزمني
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            أدخل البيانات المحتوية على timestamps (سجلات، ملفات نظام، logs)
          </label>
          <Textarea
            value={inputData}
            onChange={(e) => setInputData(e.target.value)}
            placeholder="الصق هنا محتوى السجلات أو أي نص يحتوي على تواريخ وأوقات..."
            className="min-h-[150px] font-mono text-sm bg-secondary/50"
            dir="ltr"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={analyzeTimeline} disabled={isAnalyzing}>
            <Calendar className="w-4 h-4 mr-2" />
            {isAnalyzing ? "جاري التحليل..." : "تحليل الجدول الزمني"}
          </Button>
          {events.length > 0 && (
            <SaveToCase
              toolName="محلل الجدول الزمني"
              reportType="timeline_analysis"
              reportData={getReportData()}
            />
          )}
        </div>

        {events.length > 0 && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-secondary/50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-primary">{events.length}</div>
                <div className="text-xs text-muted-foreground">إجمالي الأحداث</div>
              </div>
              <div className="bg-red-500/10 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-400">
                  {events.filter(e => e.importance === "high").length}
                </div>
                <div className="text-xs text-muted-foreground">عالية الأهمية</div>
              </div>
              <div className="bg-yellow-500/10 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {events.filter(e => e.importance === "medium").length}
                </div>
                <div className="text-xs text-muted-foreground">متوسطة</div>
              </div>
              <div className="bg-green-500/10 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-400">
                  {events.filter(e => e.importance === "low").length}
                </div>
                <div className="text-xs text-muted-foreground">منخفضة</div>
              </div>
            </div>

            {/* Timeline */}
            <div className="relative space-y-2 pr-4 border-r-2 border-primary/30">
              {events.map((event, index) => (
                <div key={index} className="relative pr-6">
                  <div className="absolute right-[-9px] top-2 w-4 h-4 bg-primary rounded-full border-2 border-background" />
                  <div className={`p-3 rounded-lg border ${getImportanceColor(event.importance)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        {event.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{event.source}</span>
                    </div>
                    <div className="font-mono text-sm mb-1">
                      {event.timestamp.toLocaleString("ar-SA")}
                    </div>
                    <div className="text-xs text-muted-foreground" dir="ltr">
                      {event.description}
                    </div>
                  </div>
                  {index < events.length - 1 && (
                    <ArrowDown className="absolute right-[-6px] bottom-[-12px] w-3 h-3 text-primary/50" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TimelineAnalyzer;
