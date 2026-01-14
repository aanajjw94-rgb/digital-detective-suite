import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/Hero";
import ToolsGrid from "@/components/ToolsGrid";
import Features from "@/components/Features";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <ToolsGrid />
        <Features />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
