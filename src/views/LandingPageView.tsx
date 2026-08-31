import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Navbar } from '../landing/components/Navbar';
import { HeroSection } from '../landing/components/HeroSection';
import { FeaturesSection } from '../landing/components/FeaturesSection';
import { AdvantagesSection } from '../landing/components/AdvantagesSection';
import { HowItWorksSection } from '../landing/components/HowItWorksSection';
import { PricingSection } from '../landing/components/PricingSection';
import { TestimonialSection } from '../landing/components/TestimonialSection';
import { BlogSection } from '../landing/components/BlogSection';
import { FaqSection } from '../landing/components/FaqSection';
import { ContactSection } from '../landing/components/ContactSection';
import { Footer } from '../landing/components/Footer';
import { RegisterModal } from '../landing/components/RegisterModal';
import { TermsAndLegalModal, LegalTabType } from '../landing/components/TermsAndLegalModal';

interface LandingPageViewProps {
  onEnterSystem: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({ onEnterSystem }) => {
  const { currentUser } = useApp();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<'free' | 'teacher' | 'school'>('free');
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTabType>('terms');
  const [lang, setLang] = useState<'ID' | 'EN'>('ID');

  const handleOpenRegister = (planId: 'free' | 'teacher' | 'school' = 'free') => {
    setSelectedPlanId(planId);
    setIsRegisterOpen(true);
  };

  const handleOpenLogin = () => {
    onEnterSystem();
  };

  const handleOpenLegal = (tab: LegalTabType) => {
    setLegalTab(tab);
    setIsLegalOpen(true);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-indigo-600 selection:text-white antialiased">
      <Navbar
        onOpenLogin={handleOpenLogin}
        onOpenRegister={() => handleOpenRegister('free')}
        lang={lang}
        setLang={setLang}
        isLoggedIn={!!currentUser}
      />

      <main className="relative">
        <HeroSection
          onOpenRegister={() => handleOpenRegister('free')}
          onOpenLogin={handleOpenLogin}
          lang={lang}
          isLoggedIn={!!currentUser}
        />
        <FeaturesSection lang={lang} />
        <AdvantagesSection lang={lang} onOpenRegister={() => handleOpenRegister('school')} />
        <HowItWorksSection lang={lang} onOpenRegister={() => handleOpenRegister('free')} />
        <PricingSection onOpenRegister={handleOpenRegister} lang={lang} />
        <TestimonialSection lang={lang} />
        <BlogSection lang={lang} />
        <FaqSection lang={lang} onOpenRegister={() => handleOpenRegister('free')} />
        <ContactSection lang={lang} onOpenRegister={() => handleOpenRegister('school')} />
      </main>

      <Footer lang={lang} onOpenLegal={handleOpenLegal} />

      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onOpenLogin={handleOpenLogin}
        initialPlanId={selectedPlanId}
        lang={lang}
      />

      <TermsAndLegalModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        initialTab={legalTab}
        lang={lang}
      />
    </div>
  );
};

