import { Shield, Lock, Zap, Database, Eye, FileCheck } from "lucide-react";

const features = [
  {
    icon: Lock,
    title: "خصوصية كاملة",
    description: "جميع التحليلات تتم محلياً في متصفحك. لا يتم إرسال أي بيانات للخوادم.",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
  },
  {
    icon: Zap,
    title: "سرعة فائقة",
    description: "معالجة فورية للملفات باستخدام تقنيات المتصفح الحديثة.",
    color: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/30",
  },
  {
    icon: Database,
    title: "دعم متعدد",
    description: "دعم مجموعة واسعة من أنواع الملفات وصيغ البيانات.",
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/30",
  },
  {
    icon: Eye,
    title: "تحليل عميق",
    description: "استخراج البيانات الوصفية والتوقيعات المخفية من الملفات.",
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
  },
  {
    icon: FileCheck,
    title: "التحقق من الملفات",
    description: "كشف الملفات المشبوهة والتحقق من سلامة البيانات.",
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
  },
  {
    icon: Shield,
    title: "أمان متقدم",
    description: "أدوات احترافية مصممة للمحللين الجنائيين الرقميين.",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-20 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            مميزات المنصة
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            منصة متكاملة تجمع بين الأمان والكفاءة والخصوصية
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="tool-card group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`p-3 rounded-xl ${feature.bg} border ${feature.border} inline-flex mb-4`}>
                  <Icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
