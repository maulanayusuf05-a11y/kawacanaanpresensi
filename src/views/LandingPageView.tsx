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
import { FreeStartModal } from '../landing/components/FreeStartModal';
import { TeacherRegisterModal } from '../landing/components/TeacherRegisterModal';
import { TermsAndLegalModal, LegalTabType } from '../landing/components/TermsAndLegalModal';

interface LandingPageViewProps {
  onEnterSystem: () => void;
  onEnterDashboard?: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({ onEnterSystem, onEnterDashboard }) => {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isFreeStartOpen, setIsFreeStartOpen] = useState(false);
  const [isTeacherRegisterOpen, setIsTeacherRegisterOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<'free' | 'teacher' | 'school'>('school');
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

    if (planId === 'free') {
      setIsFreeStartOpen(true);
      return;
    }

    if (planId === 'teacher') {
      setIsTeacherRegisterOpen(true);
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
        onOpenRegisterSchool={() => handleOpenRegister('school')}
        lang={lang}
        setLang={setLang}
      />

      <main className="relative">
        <HeroSection
          onOpenRegister={() => handleOpenRegister('free')}
          onOpenRegisterSchool={() => handleOpenRegister('school')}
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

      {/* Modal Mulai Gratis: Pemilihan Peran (tanpa Siswa), Tanpa Pilihan Ruang Kerja, Otomatis Ruang Kerja Personal */}
      <FreeStartModal
        isOpen={isFreeStartOpen}
        onClose={() => setIsFreeStartOpen(false)}
        onOpenLogin={handleOpenLogin}
        onEnterSystem={onEnterSystem}
        onEnterDashboard={onEnterDashboard}
        lang={lang}
      />

      {/* Modal Paket Guru Berbayar (Midtrans Gateway + Ruang Kerja Individu Pro) */}
      <TeacherRegisterModal
        isOpen={isTeacherRegisterOpen}
        onClose={() => setIsTeacherRegisterOpen(false)}
        onOpenLogin={handleOpenLogin}
        onEnterSystem={onEnterSystem}
        onEnterDashboard={onEnterDashboard}
        lang={lang}
      />

      {/* Modal Pendaftaran Sekolah / Berbayar */}
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

