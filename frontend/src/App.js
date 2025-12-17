import React, { useEffect } from "react";
import "./App.css";

// Landing Page Components
import { Header } from "./components/landing/Header";
import { HeroSection } from "./components/landing/HeroSection";
import { ProblemSection } from "./components/landing/ProblemSection";
import { UniversalInfoSection } from "./components/landing/UniversalInfoSection";
import { TargetAudienceSection } from "./components/landing/TargetAudienceSection";
import { HowItWorksSection } from "./components/landing/HowItWorksSection";
import { CourseContentSection } from "./components/landing/CourseContentSection";
import { BenefitsSection } from "./components/landing/BenefitsSection";
import { OfferSection } from "./components/landing/OfferSection";
import { BonusSection } from "./components/landing/BonusSection";
import { FutureSection } from "./components/landing/FutureSection";
import { ScarcitySection } from "./components/landing/ScarcitySection";
import { FinalCTASection } from "./components/landing/FinalCTASection";
import { FAQSection } from "./components/landing/FAQSection";
import { Footer } from "./components/landing/Footer";

// Mock Data
import {
  heroData,
  problemData,
  universalInfoData,
  targetAudienceData,
  howItWorksData,
  courseContentData,
  benefitsData,
  offerData,
  bonusData,
  futureData,
  scarcityData,
  faqData,
} from "./data/mock";

// Checkout Link - Replace with actual Kiwify/Hotmart link
const CHECKOUT_LINK = "#checkout"; // TODO: Replace with actual checkout link

function App() {
  useEffect(() => {
    console.log('[App] Curso Anti-Reganho Landing Page loaded');
  }, []);

  return (
    <div className="App">
      <Header checkoutLink={CHECKOUT_LINK} />
      
      <main>
        {/* BLOCO 1 - Hero / Headline */}
        <HeroSection data={heroData} checkoutLink={CHECKOUT_LINK} />
        
        {/* BLOCO 2 - O Problema */}
        <ProblemSection data={problemData} />
        
        {/* BLOCO 3 - Informação Universal */}
        <UniversalInfoSection data={universalInfoData} />
        
        {/* BLOCO 4 - Para Quem É */}
        <TargetAudienceSection data={targetAudienceData} />
        
        {/* BLOCO 5 - Como Funciona */}
        <section id="como-funciona">
          <HowItWorksSection data={howItWorksData} />
        </section>

        {/* Conteúdo do Curso */}
        <CourseContentSection data={courseContentData} />
        
        {/* BLOCO 6 - Benefícios */}
        <section id="beneficios">
          <BenefitsSection data={benefitsData} />
        </section>
        
        {/* BLOCO 7 - Oferta */}
        <OfferSection data={offerData} checkoutLink={CHECKOUT_LINK} />
        
        {/* BLOCO 8 - Bônus */}
        <BonusSection data={bonusData} />
        
        {/* BLOCO 9 - Garantia [REMOVIDO conforme instruções] */}
        
        {/* BLOCO 10 - Futuro Presumido */}
        <FutureSection data={futureData} />
        
        {/* BLOCO 11 - Escassez e Urgência */}
        <ScarcitySection 
          data={scarcityData} 
          checkoutLink={CHECKOUT_LINK} 
          cta={offerData.cta}
        />
        
        {/* BLOCO 12 - CTA Final */}
        <FinalCTASection cta={offerData.cta} checkoutLink={CHECKOUT_LINK} />
        
        {/* BLOCO 13 - FAQ */}
        <section id="faq">
          <FAQSection data={faqData} />
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default App;
