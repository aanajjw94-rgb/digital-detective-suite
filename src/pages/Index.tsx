import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/Hero";
import ToolsGrid from "@/components/ToolsGrid";
import Features from "@/components/Features";
import CaseManager from "@/components/cases/CaseManager";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <section id="cases" className="py-12 container mx-auto px-4">
          <CaseManager />
        </section>
        <ToolsGrid />
        <Features />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
