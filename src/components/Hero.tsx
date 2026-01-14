import { Shield, Fingerprint, Binary, Scan } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden pt-16">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(hsl(180 100% 50% / 0.1) 1px, transparent 1px),
            linear-gradient(90deg, hsl(180 100% 50% / 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-8 animate-fade-in">
            <Scan className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono text-primary">منصة التحليل الجنائي الرقمي</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="text-foreground">بيئة متكاملة لـ</span>
            <br />
            <span className="text-primary cyber-glow">التحليل الجنائي</span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            أدوات احترافية لتحليل البيانات الرقمية، استخراج البيانات الوصفية، 
            فحص الملفات، وتحليل الأدلة الرقمية
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <a href="#tools" className="cyber-button flex items-center gap-2">
              <Fingerprint className="w-5 h-5" />
              <span>ابدأ التحليل</span>
            </a>
            <a 
              href="#features" 
              className="px-6 py-3 rounded-lg border border-border hover:border-primary/50 transition-all duration-300 flex items-center gap-2 text-foreground hover:text-primary"
            >
              <Binary className="w-5 h-5" />
              <span>اكتشف الأدوات</span>
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary cyber-glow">6+</div>
              <div className="text-sm text-muted-foreground mt-1">أداة تحليل</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary cyber-glow">100%</div>
              <div className="text-sm text-muted-foreground mt-1">خصوصية محلية</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary cyber-glow">∞</div>
              <div className="text-sm text-muted-foreground mt-1">استخدام مجاني</div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Icons */}
      <div className="absolute top-1/3 left-10 animate-pulse">
        <Shield className="w-12 h-12 text-primary/20" />
      </div>
      <div className="absolute bottom-1/3 right-10 animate-pulse" style={{ animationDelay: '0.5s' }}>
        <Fingerprint className="w-12 h-12 text-accent/20" />
      </div>
    </section>
  );
};

export default Hero;
