import { Shield, Github, Twitter, Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card/50 mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-8 h-8 text-primary" />
              <span className="font-bold text-xl text-foreground">ForensicLab</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
              منصة متكاملة للتحليل الجنائي الرقمي. أدوات احترافية لتحليل البيانات واستخراج الأدلة الرقمية.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">الأدوات</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#hash" className="hover:text-primary transition-colors">محلل Hash</a></li>
              <li><a href="#metadata" className="hover:text-primary transition-colors">محلل البيانات الوصفية</a></li>
              <li><a href="#hex" className="hover:text-primary transition-colors">عارض Hex</a></li>
              <li><a href="#base64" className="hover:text-primary transition-colors">أداة Base64</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">تواصل معنا</h4>
            <div className="flex gap-4">
              <a href="#" className="p-2 rounded-lg bg-secondary hover:bg-primary/20 transition-colors">
                <Github className="w-5 h-5 text-muted-foreground hover:text-primary" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-secondary hover:bg-primary/20 transition-colors">
                <Twitter className="w-5 h-5 text-muted-foreground hover:text-primary" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-secondary hover:bg-primary/20 transition-colors">
                <Mail className="w-5 h-5 text-muted-foreground hover:text-primary" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 ForensicLab. جميع الحقوق محفوظة.
          </p>
          <p className="text-xs font-mono text-muted-foreground">
            BUILD: 2024.01.14 | STATUS: OPERATIONAL
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
