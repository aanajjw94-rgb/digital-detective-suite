import { useState } from "react";
import { FileText, Search, BarChart3, Eye, EyeOff, FileDown } from "lucide-react";
import { toast } from "sonner";
import { generateGenericReport } from "@/lib/pdfExport";
import { SaveToCase } from "./SaveToCase";

interface TextStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  avgWordLength: number;
  longestWord: string;
  emails: string[];
  urls: string[];
  ips: string[];
  phones: string[];
}

const TextAnalyzer = () => {
  const [text, setText] = useState("");
  const [stats, setStats] = useState<TextStats | null>(null);
  const [showSensitive, setShowSensitive] = useState(false);

  const analyzeText = () => {
    if (!text.trim()) return;

    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    const lines = text.split(/\n/).filter(l => l.length > 0);

    // Regex patterns for data extraction
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
    const ipRegex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

    const longestWord = words.reduce((a, b) => a.length > b.length ? a : b, '');
    const avgWordLength = words.length > 0 
      ? words.reduce((sum, w) => sum + w.length, 0) / words.length 
      : 0;

    setStats({
      characters: text.length,
      charactersNoSpaces: text.replace(/\s/g, '').length,
      words: words.length,
      sentences: sentences.length,
      paragraphs: paragraphs.length,
      lines: lines.length,
      avgWordLength: Math.round(avgWordLength * 10) / 10,
      longestWord,
      emails: [...new Set(text.match(emailRegex) || [])],
      urls: [...new Set(text.match(urlRegex) || [])],
      ips: [...new Set(text.match(ipRegex) || [])],
      phones: [...new Set(text.match(phoneRegex) || [])],
    });
  };

  const sensitiveData = stats ? [
    ...stats.emails.map(e => ({ type: 'بريد إلكتروني', value: e, color: 'text-primary' })),
    ...stats.urls.map(u => ({ type: 'رابط', value: u, color: 'text-accent' })),
    ...stats.ips.map(ip => ({ type: 'عنوان IP', value: ip, color: 'text-warning' })),
    ...stats.phones.map(p => ({ type: 'رقم هاتف', value: p, color: 'text-success' })),
  ] : [];

  return (
    <div className="tool-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">محلل النصوص</h3>
          <p className="text-sm text-muted-foreground">استخراج البيانات والإحصائيات</p>
        </div>
      </div>

      {/* Input */}
      <div className="mb-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="cyber-input min-h-[150px] resize-none"
          placeholder="الصق النص هنا للتحليل..."
          dir="auto"
        />
      </div>

      <button
        onClick={analyzeText}
        disabled={!text.trim()}
        className="cyber-button w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Search className="w-5 h-5" />
        <span>تحليل النص</span>
      </button>

      {/* Results */}
      {stats && (
        <div className="mt-6 animate-fade-in space-y-4">
          <div className="flex justify-end gap-2">
            <SaveToCase
              toolName="Text Analyzer"
              reportType="Text Analysis"
              reportData={{
                stats,
                extractedEmails: stats.emails,
                extractedUrls: stats.urls,
                extractedIPs: stats.ips
              }}
              disabled={!stats}
            />
            <button
              onClick={() => {
                generateGenericReport(
                  'Text Analyzer',
                  'محلل النصوص',
                  {
                    'Statistics': {
                      'Characters': stats.characters.toString(),
                      'Characters (no spaces)': stats.charactersNoSpaces.toString(),
                      'Words': stats.words.toString(),
                      'Sentences': stats.sentences.toString(),
                      'Paragraphs': stats.paragraphs.toString(),
                      'Lines': stats.lines.toString(),
                      'Average Word Length': stats.avgWordLength.toString(),
                      'Longest Word': stats.longestWord,
                    },
                    'Extracted Data': {
                      'Emails': stats.emails.join(', ') || 'None',
                      'URLs': stats.urls.join(', ') || 'None',
                      'IP Addresses': stats.ips.join(', ') || 'None',
                      'Phone Numbers': stats.phones.join(', ') || 'None',
                    },
                  }
                );
                toast.success("تم تصدير التقرير بنجاح!");
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors text-sm text-primary"
            >
              <FileDown className="w-4 h-4" />
              <span>تصدير PDF</span>
            </button>
          </div>
          {/* Basic Stats */}
          <div className="bg-secondary/50 rounded-xl p-4 border border-border">
            <h4 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              الإحصائيات الأساسية
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-bold text-primary">{stats.characters}</p>
                <p className="text-xs text-muted-foreground">حرف</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">{stats.words}</p>
                <p className="text-xs text-muted-foreground">كلمة</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{stats.sentences}</p>
                <p className="text-xs text-muted-foreground">جملة</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">{stats.paragraphs}</p>
                <p className="text-xs text-muted-foreground">فقرة</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.lines}</p>
                <p className="text-xs text-muted-foreground">سطر</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{stats.avgWordLength}</p>
                <p className="text-xs text-muted-foreground">متوسط طول الكلمة</p>
              </div>
            </div>
          </div>

          {/* Extracted Data */}
          {sensitiveData.length > 0 && (
            <div className="bg-secondary/50 rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  بيانات مستخرجة ({sensitiveData.length})
                </h4>
                <button
                  onClick={() => setShowSensitive(!showSensitive)}
                  className="p-2 rounded-lg hover:bg-primary/20 transition-colors"
                >
                  {showSensitive ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-auto">
                {sensitiveData.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 bg-background/50 rounded-lg p-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {item.type}
                    </span>
                    <span className={`font-mono text-sm ${item.color} ${!showSensitive ? 'blur-sm' : ''}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Longest Word */}
          {stats.longestWord && (
            <div className="bg-secondary/50 rounded-xl p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">أطول كلمة</p>
              <p className="font-mono text-lg text-accent">{stats.longestWord}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.longestWord.length} حرف</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TextAnalyzer;
