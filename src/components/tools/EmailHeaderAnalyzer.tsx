import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, Server, Clock, AlertTriangle, CheckCircle, Globe, User } from "lucide-react";
import { toast } from "sonner";
import { SaveToCase } from "./SaveToCase";

interface HeaderInfo {
  from: string;
  to: string;
  subject: string;
  date: string;
  messageId: string;
  receivedChain: { server: string; timestamp: string; ip: string }[];
  authResults: { spf: string; dkim: string; dmarc: string };
  xHeaders: { name: string; value: string }[];
  suspiciousIndicators: string[];
}

export const EmailHeaderAnalyzer = () => {
  const [headerText, setHeaderText] = useState("");
  const [analysis, setAnalysis] = useState<HeaderInfo | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const parseHeaders = (text: string): HeaderInfo => {
    const getHeader = (name: string): string => {
      const regex = new RegExp(`^${name}:\\s*(.+?)(?=\\n[A-Za-z-]+:|$)`, 'ism');
      const match = text.match(regex);
      return match ? match[1].replace(/\s+/g, ' ').trim() : "";
    };

    // Parse Received headers
    const receivedRegex = /Received:\s*from\s+([^\s]+).*?(?:\[(\d+\.\d+\.\d+\.\d+)\])?.*?;\s*(.+?)(?=\nReceived:|\n[A-Za-z-]+:|\n\n|$)/gis;
    const receivedChain: { server: string; timestamp: string; ip: string }[] = [];
    let match;
    while ((match = receivedRegex.exec(text)) !== null) {
      receivedChain.push({
        server: match[1] || "Unknown",
        ip: match[2] || "N/A",
        timestamp: match[3]?.trim() || ""
      });
    }

    // Parse authentication results
    const authHeader = getHeader("Authentication-Results");
    const spfMatch = authHeader.match(/spf=(\w+)/i);
    const dkimMatch = authHeader.match(/dkim=(\w+)/i);
    const dmarcMatch = authHeader.match(/dmarc=(\w+)/i);

    // Parse X-headers
    const xHeaderRegex = /^(X-[A-Za-z0-9-]+):\s*(.+?)(?=\n[A-Za-z-]+:|\n\n|$)/gim;
    const xHeaders: { name: string; value: string }[] = [];
    while ((match = xHeaderRegex.exec(text)) !== null) {
      xHeaders.push({
        name: match[1],
        value: match[2].replace(/\s+/g, ' ').trim()
      });
    }

    // Detect suspicious indicators
    const suspiciousIndicators: string[] = [];
    
    const from = getHeader("From");
    const returnPath = getHeader("Return-Path");
    const replyTo = getHeader("Reply-To");

    if (from && returnPath && !returnPath.includes(from.match(/<(.+?)>/)?.[1] || from)) {
      suspiciousIndicators.push("Return-Path لا يتطابق مع From");
    }
    if (replyTo && from && !replyTo.toLowerCase().includes(from.toLowerCase().split('@')[1] || '')) {
      suspiciousIndicators.push("Reply-To يختلف عن نطاق المرسل");
    }
    if (spfMatch && spfMatch[1].toLowerCase() === 'fail') {
      suspiciousIndicators.push("فشل التحقق من SPF");
    }
    if (dkimMatch && dkimMatch[1].toLowerCase() === 'fail') {
      suspiciousIndicators.push("فشل التحقق من DKIM");
    }
    if (dmarcMatch && dmarcMatch[1].toLowerCase() === 'fail') {
      suspiciousIndicators.push("فشل التحقق من DMARC");
    }
    if (receivedChain.length > 10) {
      suspiciousIndicators.push("سلسلة Received طويلة بشكل غير عادي");
    }
    if (text.toLowerCase().includes("x-spam")) {
      suspiciousIndicators.push("تم تصنيفه كـ Spam بواسطة خادم سابق");
    }

    return {
      from: getHeader("From"),
      to: getHeader("To"),
      subject: getHeader("Subject"),
      date: getHeader("Date"),
      messageId: getHeader("Message-ID"),
      receivedChain: receivedChain.reverse(),
      authResults: {
        spf: spfMatch?.[1] || "N/A",
        dkim: dkimMatch?.[1] || "N/A",
        dmarc: dmarcMatch?.[1] || "N/A"
      },
      xHeaders,
      suspiciousIndicators
    };
  };

  const analyzeHeaders = () => {
    if (!headerText.trim()) {
      toast.error("الرجاء إدخال رؤوس البريد الإلكتروني");
      return;
    }

    setIsAnalyzing(true);
    setTimeout(() => {
      const result = parseHeaders(headerText);
      setAnalysis(result);
      setIsAnalyzing(false);

      if (result.suspiciousIndicators.length > 0) {
        toast.warning(`تم اكتشاف ${result.suspiciousIndicators.length} مؤشرات مشبوهة`);
      } else {
        toast.success("تم تحليل الرؤوس بنجاح");
      }
    }, 500);
  };

  const getAuthBadge = (status: string) => {
    const lower = status.toLowerCase();
    if (lower === "pass") return <Badge className="bg-green-500/20 text-green-400">✓ {status}</Badge>;
    if (lower === "fail") return <Badge className="bg-red-500/20 text-red-400">✗ {status}</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  const getReportData = () => analysis;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Mail className="w-5 h-5 text-primary" />
          محلل رؤوس البريد الإلكتروني
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            الصق رؤوس البريد الإلكتروني الكاملة (Email Headers)
          </label>
          <Textarea
            value={headerText}
            onChange={(e) => setHeaderText(e.target.value)}
            placeholder="Received: from mail.example.com...&#10;From: sender@example.com&#10;To: recipient@example.com&#10;..."
            className="min-h-[150px] font-mono text-sm bg-secondary/50"
            dir="ltr"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={analyzeHeaders} disabled={isAnalyzing}>
            <Mail className="w-4 h-4 mr-2" />
            {isAnalyzing ? "جاري التحليل..." : "تحليل الرؤوس"}
          </Button>
          {analysis && (
            <SaveToCase
              toolName="محلل رؤوس البريد"
              reportType="email_header_analysis"
              reportData={getReportData()}
            />
          )}
        </div>

        {analysis && (
          <div className="space-y-6">
            {/* Suspicious Indicators */}
            {analysis.suspiciousIndicators.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <span className="font-medium text-red-400">مؤشرات مشبوهة</span>
                </div>
                <ul className="space-y-1">
                  {analysis.suspiciousIndicators.map((indicator, i) => (
                    <li key={i} className="text-sm text-red-300 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                      {indicator}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Basic Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-secondary/50 p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span className="text-sm">من:</span>
                </div>
                <div className="font-mono text-sm" dir="ltr">{analysis.from || "N/A"}</div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span className="text-sm">إلى:</span>
                </div>
                <div className="font-mono text-sm" dir="ltr">{analysis.to || "N/A"}</div>
              </div>

              <div className="bg-secondary/50 p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">الموضوع:</span>
                </div>
                <div className="text-sm">{analysis.subject || "N/A"}</div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">التاريخ:</span>
                </div>
                <div className="font-mono text-sm" dir="ltr">{analysis.date || "N/A"}</div>
              </div>
            </div>

            {/* Authentication Results */}
            <div className="bg-secondary/50 p-4 rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                نتائج المصادقة
              </h4>
              <div className="flex gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">SPF:</span>
                  {getAuthBadge(analysis.authResults.spf)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">DKIM:</span>
                  {getAuthBadge(analysis.authResults.dkim)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">DMARC:</span>
                  {getAuthBadge(analysis.authResults.dmarc)}
                </div>
              </div>
            </div>

            {/* Received Chain */}
            {analysis.receivedChain.length > 0 && (
              <div className="bg-secondary/50 p-4 rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Server className="w-4 h-4 text-primary" />
                  مسار الرسالة ({analysis.receivedChain.length} خوادم)
                </h4>
                <div className="space-y-2">
                  {analysis.receivedChain.map((hop, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-background/50 rounded">
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                        {i + 1}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm truncate" dir="ltr">{hop.server}</div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {hop.ip}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {hop.timestamp.substring(0, 30)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* X-Headers */}
            {analysis.xHeaders.length > 0 && (
              <div className="bg-secondary/50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">رؤوس X الإضافية ({analysis.xHeaders.length})</h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {analysis.xHeaders.map((header, i) => (
                    <div key={i} className="text-sm font-mono bg-background/50 p-2 rounded" dir="ltr">
                      <span className="text-primary">{header.name}:</span>{" "}
                      <span className="text-muted-foreground">{header.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailHeaderAnalyzer;
