import React from "react";
import "./App.css";

// Landing Page Components
import { Header } from "./components/landing/Header";
import { HeroSection } from "./components/landing/HeroSection";
import { ProblemSection } from "./components/landing/ProblemSection";
import { ProgramSection } from "./components/landing/ProgramSection";
import { WhatYouGetSection } from "./components/landing/WhatYouGetSection";
import { ExercisesSection } from "./components/landing/ExercisesSection";
import { TargetAudienceSection } from "./components/landing/TargetAudienceSection";
import { TestimonialsSection } from "./components/landing/TestimonialsSection";
import { WhyItWorksSection } from "./components/landing/WhyItWorksSection";
import { AuthorSection } from "./components/landing/AuthorSection";
import { OfferSection } from "./components/landing/OfferSection";
import { GuaranteeSection } from "./components/landing/GuaranteeSection";
import { Footer } from "./components/landing/Footer";

// Mock Data
import {
  heroData,
  problemData,
  programWeeks,
  whatYouGet,
  exercises,
  targetAudience,
  testimonials,
  whyItWorks,
  authorData,
  offerData,
  guaranteeData,
} from "./data/mock";

// Kiwify Link - Replace with actual link
const KIWIFY_LINK = "https://kiwify.com.br"; // TODO: Replace with actual Kiwify checkout link

function App() {
  return (
    <div className="App">
      <Header kiwifyLink={KIWIFY_LINK} />
      
      <main>
        <HeroSection data={{ ...heroData, kiwifyLink: KIWIFY_LINK }} />
        <ProblemSection data={problemData} />
        <ProgramSection weeks={programWeeks} kiwifyLink={KIWIFY_LINK} />
        <WhatYouGetSection items={whatYouGet} />
        <ExercisesSection exercises={exercises} />
        <TargetAudienceSection items={targetAudience} />
        <TestimonialsSection testimonials={testimonials} />
        <WhyItWorksSection items={whyItWorks} />
        <AuthorSection data={authorData} />
        <OfferSection data={{ ...offerData, kiwifyLink: KIWIFY_LINK }} />
        <GuaranteeSection data={guaranteeData} />
      </main>

      <Footer />
    </div>
  );
}

export default App;
