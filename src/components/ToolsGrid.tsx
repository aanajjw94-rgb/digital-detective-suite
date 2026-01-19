import { useState } from "react";
import { Hash, Image, Binary, Code2, FileSearch, FileText, ChevronRight, Smartphone, Terminal, FileCode, HardDrive, Database, Search, MapPin } from "lucide-react";
import HashAnalyzer from "./tools/HashAnalyzer";
import MetadataAnalyzer from "./tools/MetadataAnalyzer";
import HexViewer from "./tools/HexViewer";
import Base64Tool from "./tools/Base64Tool";
import FileSignatureDetector from "./tools/FileSignatureDetector";
import TextAnalyzer from "./tools/TextAnalyzer";
import { ADBBackupAnalyzer } from "./tools/ADBBackupAnalyzer";
import { ADBCommandGenerator } from "./tools/ADBCommandGenerator";
import { AndroidLogAnalyzer } from "./tools/AndroidLogAnalyzer";
import { FileCarver } from "./tools/FileCarver";
import { FileSystemAnalyzer } from "./tools/FileSystemAnalyzer";
import { SlackSpaceAnalyzer } from "./tools/SlackSpaceAnalyzer";
import { GPSExtractor } from "./tools/GPSExtractor";

const tools = [
  { id: "hash", name: "محلل Hash", icon: Hash, description: "MD5, SHA-1, SHA-256, SHA-512", component: HashAnalyzer },
  { id: "metadata", name: "محلل البيانات الوصفية", icon: Image, description: "EXIF Metadata", component: MetadataAnalyzer },
  { id: "gps", name: "مستخرج GPS", icon: MapPin, description: "إحداثيات الصور", component: GPSExtractor },
  { id: "hex", name: "عارض Hex", icon: Binary, description: "Hex Viewer", component: HexViewer },
  { id: "base64", name: "أداة Base64", icon: Code2, description: "تشفير وفك تشفير", component: Base64Tool },
  { id: "signature", name: "كاشف التوقيعات", icon: FileSearch, description: "Magic Numbers", component: FileSignatureDetector },
  { id: "text", name: "محلل النصوص", icon: FileText, description: "استخراج البيانات", component: TextAnalyzer },
  { id: "adb-backup", name: "محلل نسخ ADB", icon: Smartphone, description: "تحليل ملفات .ab", component: ADBBackupAnalyzer },
  { id: "adb-commands", name: "أوامر ADB", icon: Terminal, description: "مولد الأوامر الجنائية", component: ADBCommandGenerator },
  { id: "android-logs", name: "سجلات Android", icon: FileCode, description: "تحليل Logcat", component: AndroidLogAnalyzer },
  { id: "file-carver", name: "File Carving", icon: HardDrive, description: "استعادة الملفات", component: FileCarver },
  { id: "fs-analyzer", name: "محلل FAT/NTFS", icon: Database, description: "تحليل أنظمة الملفات", component: FileSystemAnalyzer },
  { id: "slack-space", name: "Slack Space", icon: Search, description: "البيانات المخفية", component: SlackSpaceAnalyzer },
];

const ToolsGrid = () => {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const ActiveComponent = tools.find(t => t.id === activeTool)?.component;

  return (
    <section id="tools" className="py-20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            أدوات التحليل الجنائي
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            مجموعة شاملة من الأدوات الاحترافية للتحليل الجنائي الرقمي
          </p>
        </div>

        {/* Tool Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(isActive ? null : tool.id)}
                className={`relative p-6 rounded-xl border transition-all duration-300 text-center group ${
                  isActive
                    ? "bg-primary/10 border-primary"
                    : "bg-card border-border hover:border-primary/50"
                }`}
              >
                <div className={`mx-auto mb-3 p-3 rounded-xl inline-flex transition-colors ${
                  isActive ? "bg-primary/20" : "bg-secondary group-hover:bg-primary/10"
                }`}>
                  <Icon className={`w-6 h-6 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
                </div>
                <h3 className="font-medium text-foreground text-sm mb-1">{tool.name}</h3>
                <p className="text-xs text-muted-foreground">{tool.description}</p>
                
                {isActive && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                    <ChevronRight className="w-4 h-4 text-primary rotate-90" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Tool Panel */}
        {ActiveComponent && (
          <div className="animate-fade-in">
            <ActiveComponent />
          </div>
        )}

        {/* Empty State */}
        {!activeTool && (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
            <p className="text-muted-foreground">اختر أداة من القائمة أعلاه للبدء</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default ToolsGrid;
