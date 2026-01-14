import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Terminal, Copy, Check, ChevronDown, ChevronUp, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Command {
  name: string;
  command: string;
  description: string;
  category: string;
  forensicUse: string;
  warning?: string;
}

const forensicCommands: Command[] = [
  // Data Extraction
  {
    name: "استخراج نسخة احتياطية كاملة",
    command: "adb backup -apk -shared -all -f backup.ab",
    description: "إنشاء نسخة احتياطية كاملة تشمل التطبيقات والبيانات المشتركة",
    category: "extraction",
    forensicUse: "استخراج جميع بيانات الجهاز للتحليل الجنائي"
  },
  {
    name: "استخراج بيانات تطبيق محدد",
    command: "adb backup -apk -f app_backup.ab com.package.name",
    description: "نسخ احتياطي لتطبيق واحد مع APK والبيانات",
    category: "extraction",
    forensicUse: "تحليل تطبيق مشبوه أو استخراج محادثات"
  },
  {
    name: "نسخ ملف من الجهاز",
    command: "adb pull /path/on/device /local/path",
    description: "نقل ملف أو مجلد من الجهاز للحاسوب",
    category: "extraction",
    forensicUse: "استخراج ملفات محددة كدليل"
  },
  {
    name: "استخراج قاعدة بيانات WhatsApp",
    command: "adb pull /data/data/com.whatsapp/databases/msgstore.db ./",
    description: "نسخ قاعدة بيانات رسائل واتساب (يتطلب صلاحيات Root)",
    category: "extraction",
    forensicUse: "تحليل محادثات واتساب",
    warning: "يتطلب صلاحيات Root"
  },
  {
    name: "استخراج سجل المكالمات",
    command: "adb shell content query --uri content://call_log/calls",
    description: "عرض سجل المكالمات من قاعدة البيانات",
    category: "extraction",
    forensicUse: "تحليل سجل الاتصالات"
  },
  {
    name: "استخراج الرسائل النصية",
    command: "adb shell content query --uri content://sms",
    description: "عرض جميع الرسائل النصية SMS",
    category: "extraction",
    forensicUse: "تحليل الرسائل النصية كأدلة"
  },
  {
    name: "استخراج جهات الاتصال",
    command: "adb shell content query --uri content://contacts/phones",
    description: "عرض جميع جهات الاتصال المخزنة",
    category: "extraction",
    forensicUse: "تحليل شبكة العلاقات"
  },

  // System Information
  {
    name: "معلومات الجهاز الكاملة",
    command: "adb shell getprop",
    description: "عرض جميع خصائص النظام",
    category: "sysinfo",
    forensicUse: "توثيق معلومات الجهاز للتقرير الجنائي"
  },
  {
    name: "رقم IMEI",
    command: "adb shell service call iphonesubinfo 1",
    description: "استخراج رقم IMEI للجهاز",
    category: "sysinfo",
    forensicUse: "تحديد هوية الجهاز"
  },
  {
    name: "الرقم التسلسلي",
    command: "adb get-serialno",
    description: "الحصول على الرقم التسلسلي للجهاز",
    category: "sysinfo",
    forensicUse: "توثيق هوية الجهاز"
  },
  {
    name: "إصدار Android",
    command: "adb shell getprop ro.build.version.release",
    description: "معرفة إصدار نظام Android",
    category: "sysinfo",
    forensicUse: "تحديد نقاط الضعف المحتملة"
  },
  {
    name: "معلومات البطارية",
    command: "adb shell dumpsys battery",
    description: "حالة ومعلومات البطارية",
    category: "sysinfo",
    forensicUse: "تحديد آخر استخدام للجهاز"
  },
  {
    name: "التطبيقات المثبتة",
    command: "adb shell pm list packages -f",
    description: "قائمة بجميع التطبيقات مع مساراتها",
    category: "sysinfo",
    forensicUse: "اكتشاف التطبيقات المشبوهة"
  },

  // Logs & Activity
  {
    name: "سجلات النظام (Logcat)",
    command: "adb logcat -d > logcat.txt",
    description: "تصدير جميع سجلات النظام",
    category: "logs",
    forensicUse: "تحليل نشاط النظام والتطبيقات"
  },
  {
    name: "سجل الأحداث",
    command: "adb shell dumpsys activity activities",
    description: "عرض الأنشطة الحالية والحديثة",
    category: "logs",
    forensicUse: "تتبع نشاط المستخدم"
  },
  {
    name: "سجل تشغيل التطبيقات",
    command: "adb shell dumpsys usagestats",
    description: "إحصائيات استخدام التطبيقات",
    category: "logs",
    forensicUse: "تحليل أنماط الاستخدام"
  },
  {
    name: "سجل WiFi",
    command: "adb shell dumpsys wifi",
    description: "معلومات الشبكات اللاسلكية المتصلة",
    category: "logs",
    forensicUse: "تتبع المواقع عبر الشبكات"
  },
  {
    name: "سجل البلوتوث",
    command: "adb shell dumpsys bluetooth_manager",
    description: "الأجهزة المقترنة والاتصالات",
    category: "logs",
    forensicUse: "تحديد الأجهزة المتصلة"
  },

  // Memory & Storage
  {
    name: "تصوير الذاكرة (Memory Dump)",
    command: "adb shell dumpsys meminfo > meminfo.txt",
    description: "تفريغ معلومات الذاكرة",
    category: "memory",
    forensicUse: "تحليل البيانات في الذاكرة",
    warning: "يتطلب صلاحيات Root للتفريغ الكامل"
  },
  {
    name: "معلومات التخزين",
    command: "adb shell df",
    description: "مساحة التخزين المستخدمة والمتاحة",
    category: "memory",
    forensicUse: "تحديد وجود ملفات كبيرة مخفية"
  },
  {
    name: "قائمة الملفات المحذوفة مؤخراً",
    command: "adb shell ls -la /data/data/*/cache/",
    description: "عرض ملفات الكاش التي قد تحتوي على بقايا محذوفة",
    category: "memory",
    forensicUse: "استعادة البيانات المحذوفة جزئياً",
    warning: "يتطلب صلاحيات Root"
  },

  // Screen & Media
  {
    name: "لقطة شاشة",
    command: "adb shell screencap -p /sdcard/screen.png && adb pull /sdcard/screen.png",
    description: "التقاط وتحميل صورة للشاشة",
    category: "media",
    forensicUse: "توثيق حالة الشاشة"
  },
  {
    name: "تسجيل الشاشة",
    command: "adb shell screenrecord /sdcard/recording.mp4",
    description: "تسجيل فيديو للشاشة (حد 3 دقائق)",
    category: "media",
    forensicUse: "توثيق التفاعل مع الجهاز"
  },
  {
    name: "استخراج الصور",
    command: "adb pull /sdcard/DCIM/Camera/ ./photos/",
    description: "نسخ جميع الصور من الكاميرا",
    category: "media",
    forensicUse: "تحليل الصور كأدلة"
  }
];

const categories = [
  { id: "extraction", name: "استخراج البيانات", icon: "📥" },
  { id: "sysinfo", name: "معلومات النظام", icon: "ℹ️" },
  { id: "logs", name: "السجلات", icon: "📋" },
  { id: "memory", name: "الذاكرة والتخزين", icon: "💾" },
  { id: "media", name: "الوسائط", icon: "🖼️" }
];

export const ADBCommandGenerator = () => {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [expandedCommands, setExpandedCommands] = useState<Set<string>>(new Set());

  const copyToClipboard = async (command: string) => {
    await navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const toggleExpand = (name: string) => {
    const newExpanded = new Set(expandedCommands);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedCommands(newExpanded);
  };

  return (
    <Card className="bg-card/50 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Terminal className="w-5 h-5" />
          مولد أوامر ADB الجنائية
        </CardTitle>
        <CardDescription>
          مكتبة أوامر ADB للتحليل الجنائي مع شرح الاستخدام
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="extraction" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
            {categories.map(cat => (
              <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
                {cat.icon} {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map(cat => (
            <TabsContent key={cat.id} value={cat.id} className="space-y-3 max-h-96 overflow-y-auto">
              {forensicCommands
                .filter(cmd => cmd.category === cat.id)
                .map((cmd, index) => (
                  <Collapsible
                    key={index}
                    open={expandedCommands.has(cmd.name)}
                    onOpenChange={() => toggleExpand(cmd.name)}
                  >
                    <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-primary" />
                            <span className="font-medium text-sm">{cmd.name}</span>
                            {cmd.warning && (
                              <Badge variant="destructive" className="text-xs">تحذير</Badge>
                            )}
                          </div>
                          {expandedCommands.has(cmd.name) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="mt-3 space-y-3">
                        <div className="bg-background rounded p-2 font-mono text-xs text-primary break-all flex items-center justify-between gap-2">
                          <code className="flex-1">{cmd.command}</code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(cmd.command)}
                            className="shrink-0"
                          >
                            {copiedCommand === cmd.command ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>

                        <p className="text-sm text-muted-foreground">{cmd.description}</p>

                        <div className="bg-primary/5 rounded p-2 border border-primary/20">
                          <div className="flex items-center gap-1 text-xs text-primary mb-1">
                            <Info className="w-3 h-3" />
                            الاستخدام الجنائي:
                          </div>
                          <p className="text-xs text-muted-foreground">{cmd.forensicUse}</p>
                        </div>

                        {cmd.warning && (
                          <div className="bg-destructive/10 rounded p-2 border border-destructive/30">
                            <p className="text-xs text-destructive">⚠️ {cmd.warning}</p>
                          </div>
                        )}
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            💡 <strong>ملاحظة:</strong> تأكد من تفعيل وضع المطور و USB Debugging على الجهاز المستهدف قبل استخدام هذه الأوامر.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
