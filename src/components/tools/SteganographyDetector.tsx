import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Eye, Upload, AlertTriangle, CheckCircle, BarChart3, Layers } from "lucide-react";
import { toast } from "sonner";
import { SaveToCase } from "./SaveToCase";

interface AnalysisResult {
  fileName: string;
  fileSize: number;
  dimensions: { width: number; height: number };
  colorDepth: number;
  uniqueColors: number;
  lsbAnalysis: {
    redEntropy: number;
    greenEntropy: number;
    blueEntropy: number;
    overallScore: number;
  };
  chiSquareTest: number;
  suspicionLevel: "low" | "medium" | "high";
  indicators: string[];
  histogram: number[];
}

export const SteganographyDetector = () => {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const calculateEntropy = (data: number[]): number => {
    const freq: { [key: number]: number } = {};
    data.forEach(v => freq[v] = (freq[v] || 0) + 1);
    
    const total = data.length;
    let entropy = 0;
    Object.values(freq).forEach(count => {
      const p = count / total;
      if (p > 0) entropy -= p * Math.log2(p);
    });
    
    return entropy;
  };

  const chiSquareTest = (observed: number[], expected: number): number => {
    let chiSquare = 0;
    observed.forEach(o => {
      chiSquare += Math.pow(o - expected, 2) / expected;
    });
    return chiSquare;
  };

  const analyzeImage = (file: File) => {
    setIsAnalyzing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;

        // Extract LSB values for each channel
        const redLSB: number[] = [];
        const greenLSB: number[] = [];
        const blueLSB: number[] = [];
        const uniqueColorsSet = new Set<string>();
        const histogram = new Array(256).fill(0);

        for (let i = 0; i < data.length; i += 4) {
          redLSB.push(data[i] & 1);
          greenLSB.push(data[i + 1] & 1);
          blueLSB.push(data[i + 2] & 1);
          uniqueColorsSet.add(`${data[i]},${data[i+1]},${data[i+2]}`);
          histogram[Math.floor((data[i] + data[i+1] + data[i+2]) / 3)]++;
        }

        // Calculate entropy for each channel's LSBs
        const redEntropy = calculateEntropy(redLSB);
        const greenEntropy = calculateEntropy(greenLSB);
        const blueEntropy = calculateEntropy(blueLSB);
        const overallScore = (redEntropy + greenEntropy + blueEntropy) / 3;

        // Chi-square test on LSB pairs
        const pairCounts = new Array(4).fill(0);
        for (let i = 0; i < redLSB.length - 1; i += 2) {
          const pair = redLSB[i] * 2 + redLSB[i + 1];
          pairCounts[pair]++;
        }
        const expectedPairCount = redLSB.length / 8;
        const chiSquareValue = chiSquareTest(pairCounts, expectedPairCount);

        // Determine suspicion level and indicators
        const indicators: string[] = [];
        let suspicionLevel: "low" | "medium" | "high" = "low";

        if (overallScore > 0.95) {
          indicators.push("إنتروبيا LSB عالية جداً - احتمال وجود بيانات مخفية");
          suspicionLevel = "high";
        } else if (overallScore > 0.85) {
          indicators.push("إنتروبيا LSB مرتفعة قليلاً");
          suspicionLevel = "medium";
        }

        if (chiSquareValue > 100) {
          indicators.push("نتيجة Chi-Square تشير لتوزيع غير طبيعي");
          suspicionLevel = suspicionLevel === "low" ? "medium" : "high";
        }

        const colorRatio = uniqueColorsSet.size / (img.width * img.height);
        if (colorRatio > 0.9) {
          indicators.push("نسبة ألوان فريدة مرتفعة جداً");
          if (suspicionLevel !== "high") suspicionLevel = "medium";
        }

        // Check for unusual patterns in histogram
        let flatRegions = 0;
        for (let i = 1; i < histogram.length - 1; i++) {
          if (Math.abs(histogram[i] - histogram[i-1]) < 5 && 
              Math.abs(histogram[i] - histogram[i+1]) < 5) {
            flatRegions++;
          }
        }
        if (flatRegions > 50) {
          indicators.push("أنماط غير طبيعية في التوزيع اللوني");
        }

        if (indicators.length === 0) {
          indicators.push("لم يتم اكتشاف مؤشرات واضحة للستيغانوغرافي");
        }

        setResult({
          fileName: file.name,
          fileSize: file.size,
          dimensions: { width: img.width, height: img.height },
          colorDepth: 24,
          uniqueColors: uniqueColorsSet.size,
          lsbAnalysis: {
            redEntropy,
            greenEntropy,
            blueEntropy,
            overallScore
          },
          chiSquareTest: chiSquareValue,
          suspicionLevel,
          indicators,
          histogram: histogram.slice(0, 50) // Sample for display
        });

        setIsAnalyzing(false);
        toast.success("تم تحليل الصورة بنجاح");
      };

      img.src = e.target?.result as string;
      setPreviewUrl(e.target?.result as string);
    };

    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("الرجاء اختيار ملف صورة");
      return;
    }

    analyzeImage(file);
  };

  const getSuspicionColor = (level: string) => {
    switch (level) {
      case "high": return "bg-red-500/20 text-red-400 border-red-500";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500";
      default: return "bg-green-500/20 text-green-400 border-green-500";
    }
  };

  const getSuspicionText = (level: string) => {
    switch (level) {
      case "high": return "احتمال عالي";
      case "medium": return "احتمال متوسط";
      default: return "احتمال منخفض";
    }
  };

  const getReportData = () => result;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Eye className="w-5 h-5 text-primary" />
          كاشف الستيغانوغرافي
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <canvas ref={canvasRef} className="hidden" />
        
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            اسحب صورة هنا أو اضغط للاختيار
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            PNG, JPG, BMP - للكشف عن البيانات المخفية
          </p>
        </div>

        {isAnalyzing && (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">جاري تحليل الصورة...</p>
          </div>
        )}

        {result && !isAnalyzing && (
          <div className="space-y-6">
            {/* Preview and Basic Info */}
            <div className="grid md:grid-cols-2 gap-4">
              {previewUrl && (
                <div className="bg-secondary/50 p-4 rounded-lg">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-[200px] mx-auto rounded"
                  />
                </div>
              )}
              <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">اسم الملف:</span>
                  <span className="font-mono text-sm">{result.fileName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الحجم:</span>
                  <span>{(result.fileSize / 1024).toFixed(2)} KB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الأبعاد:</span>
                  <span>{result.dimensions.width} × {result.dimensions.height}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ألوان فريدة:</span>
                  <span>{result.uniqueColors.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Suspicion Level */}
            <div className={`p-4 rounded-lg border-2 ${getSuspicionColor(result.suspicionLevel)}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {result.suspicionLevel === "high" ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : result.suspicionLevel === "medium" ? (
                    <Layers className="w-5 h-5" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  <span className="font-medium">مستوى الاشتباه: {getSuspicionText(result.suspicionLevel)}</span>
                </div>
                <Badge className={getSuspicionColor(result.suspicionLevel)}>
                  {Math.round(result.lsbAnalysis.overallScore * 100)}% entropy
                </Badge>
              </div>
              <ul className="space-y-1">
                {result.indicators.map((indicator, i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {indicator}
                  </li>
                ))}
              </ul>
            </div>

            {/* LSB Analysis */}
            <div className="bg-secondary/50 p-4 rounded-lg">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                تحليل LSB (Least Significant Bit)
              </h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-red-400">Red Channel</span>
                    <span>{(result.lsbAnalysis.redEntropy * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={result.lsbAnalysis.redEntropy * 100} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-green-400">Green Channel</span>
                    <span>{(result.lsbAnalysis.greenEntropy * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={result.lsbAnalysis.greenEntropy * 100} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-blue-400">Blue Channel</span>
                    <span>{(result.lsbAnalysis.blueEntropy * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={result.lsbAnalysis.blueEntropy * 100} className="h-2" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Chi-Square Test:</span>
                  <span className="font-mono">{result.chiSquareTest.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <SaveToCase
                toolName="كاشف الستيغانوغرافي"
                reportType="steganography_analysis"
                reportData={getReportData()}
                fileName={result.fileName}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SteganographyDetector;
