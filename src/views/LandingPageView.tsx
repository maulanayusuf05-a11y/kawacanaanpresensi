import React, { useState } from 'react';
import '../landing/landing.css';
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
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<'free' | 'teacher' | 'school'>('free');
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTabType>('terms');
  const [lang, setLang] = useState<'ID' | 'EN'>('ID');

  const handleOpenRegister = (planId: 'free' | 'teacher' | 'school' | 'custom' = 'free') => {
    if (planId === 'custom') {
      const phone = '6281234567890';
      const text = encodeURIComponent(
        lang === 'ID'
          ? 'Halo Tim Kawacanaan SD, saya tertarik untuk konsultasi Paket Custom / Enterprise untuk yayasan/sekolah kami.'
          : 'Hello Kawacanaan Team, I would like to inquire about the Custom / Enterprise Plan for our schools.'
      );
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
      return;
    }
    setSelectedPlanId(planId);
    setIsRegisterOpen(true);
  };

  // Membuka login sistem presensi sekolah dasar
  const handleOpenLogin = () => {
    onEnterSystem();
  };

  const handleOpenLegal = (tab: LegalTabType) => {
    setLegalTab(tab);
    setIsLegalOpen(true);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-600 selection:text-white antialiased">
      <Navbar
        onOpenLogin={handleOpenLogin}
        onOpenRegister={() => handleOpenRegister('free')}
        lang={lang}
        setLang={setLang}
      />

      <main className="relative">
        <HeroSection
          onOpenRegister={() => handleOpenRegister('free')}
          onOpenLogin={handleOpenLogin}
          lang={lang}
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

