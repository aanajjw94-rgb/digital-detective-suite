import { useState } from "react";
import { Code2, ArrowRightLeft, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const Base64Tool = () => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [copied, setCopied] = useState(false);

  const handleEncode = () => {
    try {
      const encoded = btoa(unescape(encodeURIComponent(input)));
      setOutput(encoded);
      toast.success("تم التشفير بنجاح!");
    } catch (error) {
      toast.error("حدث خطأ أثناء التشفير");
    }
  };

  const handleDecode = () => {
    try {
      const decoded = decodeURIComponent(escape(atob(input)));
      setOutput(decoded);
      toast.success("تم فك التشفير بنجاح!");
    } catch (error) {
      toast.error("النص غير صالح لفك التشفير");
    }
  };

  const handleProcess = () => {
    if (!input.trim()) {
      toast.error("الرجاء إدخال نص");
      return;
    }
    if (mode === "encode") {
      handleEncode();
    } else {
      handleDecode();
    }
  };

  const copyToClipboard = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success("تم النسخ!");
    setTimeout(() => setCopied(false), 2000);
  };

  const swapInputOutput = () => {
    setInput(output);
    setOutput("");
    setMode(mode === "encode" ? "decode" : "encode");
  };

  return (
    <div className="tool-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-warning/10 border border-warning/30">
          <Code2 className="w-6 h-6 text-warning" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">أداة Base64</h3>
          <p className="text-sm text-muted-foreground">تشفير وفك تشفير Base64</p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex rounded-lg bg-secondary/50 p-1 mb-6">
        <button
          onClick={() => setMode("encode")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            mode === "encode"
              ? "bg-warning text-warning-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          تشفير (Encode)
        </button>
        <button
          onClick={() => setMode("decode")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            mode === "decode"
              ? "bg-warning text-warning-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          فك التشفير (Decode)
        </button>
      </div>

      {/* Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          {mode === "encode" ? "النص الأصلي" : "النص المشفر (Base64)"}
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="cyber-input min-h-[100px] resize-none"
          placeholder={mode === "encode" ? "أدخل النص للتشفير..." : "أدخل Base64 لفك التشفير..."}
          dir="auto"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={handleProcess}
          className="cyber-button flex-1 flex items-center justify-center gap-2"
        >
          <Code2 className="w-5 h-5" />
          <span>{mode === "encode" ? "تشفير" : "فك التشفير"}</span>
        </button>
        <button
          onClick={swapInputOutput}
          className="p-3 rounded-lg border border-border hover:border-warning/50 transition-all"
          title="تبديل المدخلات والمخرجات"
        >
          <ArrowRightLeft className="w-5 h-5 text-warning" />
        </button>
      </div>

      {/* Output */}
      {output && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-muted-foreground">
              {mode === "encode" ? "النص المشفر (Base64)" : "النص الأصلي"}
            </label>
            <button
              onClick={copyToClipboard}
              className="p-1.5 rounded hover:bg-warning/20 transition-colors"
            >
              {copied ? (
                <Check className="w-4 h-4 text-success" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>
          <div className="bg-secondary/50 rounded-lg p-4 border border-border">
            <p className="font-mono text-sm text-foreground break-all leading-relaxed" dir="auto">
              {output}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Base64Tool;
