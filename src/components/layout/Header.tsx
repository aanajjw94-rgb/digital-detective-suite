import { Shield, Terminal, Menu } from "lucide-react";
import { useState } from "react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Shield className="w-8 h-8 text-primary" />
              <div className="absolute inset-0 blur-lg bg-primary/30" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-foreground cyber-glow">
                ForensicLab
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                v2.0.0
              </span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#tools" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">
              الأدوات
            </a>
            <a href="#features" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">
              المميزات
            </a>
            <a href="#about" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">
              حول
            </a>
          </nav>

          {/* Status */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/30">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-mono text-success">متصل</span>
            </div>
            <Terminal className="w-5 h-5 text-muted-foreground" />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-4">
              <a href="#tools" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">
                الأدوات
              </a>
              <a href="#features" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">
                المميزات
              </a>
              <a href="#about" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">
                حول
              </a>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
