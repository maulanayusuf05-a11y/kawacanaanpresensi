import React, { useState, useEffect } from 'react';
import { Menu, X, Shield, ChevronRight, UserCheck, GraduationCap, School } from 'lucide-react';
import { NavItem } from '../types';

interface NavbarProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  lang: 'ID' | 'EN';
  setLang: (lang: 'ID' | 'EN') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenLogin, 
  onOpenRegister,
  lang,
  setLang 
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('beranda');

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems: NavItem[] = [
    { name: lang === 'ID' ? 'Beranda' : 'Home', href: '#beranda', active: activeSection === 'beranda' },
    { name: lang === 'ID' ? 'Fitur' : 'Features', href: '#fitur', active: activeSection === 'fitur' },
    { name: lang === 'ID' ? 'Keunggulan' : 'Advantages', href: '#keunggulan', active: activeSection === 'keunggulan' },
    { name: lang === 'ID' ? 'Harga' : 'Pricing', href: '#harga', active: activeSection === 'harga' },
    { name: lang === 'ID' ? 'Testimoni' : 'Testimonials', href: '#testimoni', active: activeSection === 'testimoni' },
    { name: lang === 'ID' ? 'Blog' : 'Blog', href: '#blog', active: activeSection === 'blog' },
    { name: lang === 'ID' ? 'FAQ' : 'FAQ', href: '#faq', active: activeSection === 'faq' },
    { name: lang === 'ID' ? 'Kontak' : 'Contact', href: '#kontak', active: activeSection === 'kontak' },
  ];

  const handleNavClick = (href: string) => {
    setActiveSection(href.replace('#', ''));
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header 
      id="main-navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm py-4' 
          : 'bg-white/80 backdrop-blur-sm border-b border-slate-100 py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Logo & Subtitle */}
          <a 
            id="nav-brand-logo"
            href="#beranda" 
            onClick={(e) => {
              e.preventDefault();
              handleNavClick('#beranda');
            }}
            className="flex items-center gap-2.5 sm:gap-3.5 group text-left cursor-pointer min-w-0"
          >
            {/* Editorial Circle / Monogram Logo */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black text-base sm:text-xl shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform shrink-0">
              K
            </div>

            {/* Brand Title and Subtitle */}
            <div className="flex flex-col min-w-0">
              <span className="text-sm sm:text-lg lg:text-xl font-black tracking-tight text-slate-900 uppercase group-hover:text-indigo-600 transition-colors truncate">
                Kawacanaan
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                {lang === 'ID' ? 'Presensi Digital SD' : 'SD Attendance'}
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links - Editorial Uppercase Tracking */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-xs font-semibold uppercase tracking-widest text-slate-600">
            {navItems.map((item) => (
              <a
                key={item.name}
                id={`nav-link-${item.href.replace('#', '')}`}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.href);
                }}
                className={`transition-colors relative py-1 ${
                  item.active 
                    ? 'text-indigo-600 font-bold' 
                    : 'hover:text-slate-900'
                }`}
              >
                {item.name}
                {item.active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                )}
              </a>
            ))}
          </nav>

          {/* Right Actions: Language Switcher & Login CTA on Laptop/Desktop */}
          <div className="hidden lg:flex items-center gap-3 xl:gap-4">
            {/* Language Switcher Capsule */}
            <div 
              id="lang-switcher-capsule"
              className="flex items-center bg-slate-100 border border-slate-200 rounded-md p-0.5 text-[11px] font-bold uppercase tracking-wider"
            >
              <button
                type="button"
                id="btn-lang-id"
                onClick={() => setLang('ID')}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                  lang === 'ID' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ID
              </button>
              <button
                type="button"
                id="btn-lang-en"
                onClick={() => setLang('EN')}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                  lang === 'EN' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                EN
              </button>
            </div>

            {/* Login Button - Editorial Slate/Indigo Style */}
            <button
              type="button"
              id="btn-navbar-login"
              onClick={onOpenLogin}
              className="px-5 py-2.5 bg-slate-900 hover:bg-indigo-600 active:scale-95 text-white text-xs font-bold uppercase tracking-widest transition-all cursor-pointer shadow-sm rounded"
            >
              <span>{lang === 'ID' ? 'Masuk' : 'Sign In'}</span>
            </button>
          </div>

          {/* Mobile and Tablet Menu Controls (< 1024px) */}
          <div className="flex lg:hidden items-center gap-2">
            {/* Language toggle capsule for tablets / mobile */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded p-0.5 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setLang('ID')}
                className={`px-2 py-1 rounded transition-all cursor-pointer ${
                  lang === 'ID' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                ID
              </button>
              <button
                type="button"
                onClick={() => setLang('EN')}
                className={`px-2 py-1 rounded transition-all cursor-pointer ${
                  lang === 'EN' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              id="btn-mobile-login"
              onClick={onOpenLogin}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
            >
              {lang === 'ID' ? 'Masuk' : 'Sign In'}
            </button>
            <button
              type="button"
              id="btn-mobile-toggle-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 rounded transition-colors cursor-pointer"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile & Tablet Drawer Menu */}
      {mobileMenuOpen && (
        <div 
          id="mobile-drawer-menu"
          className="lg:hidden bg-white border-b border-slate-200 px-4 sm:px-6 pt-3 pb-6 space-y-3 shadow-xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-top duration-200"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.href);
                }}
                className={`block px-3.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                  item.active ? 'text-indigo-600 bg-indigo-50 font-bold' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {item.name}
              </a>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">Bahasa / Language:</span>
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded p-0.5 text-xs font-bold">
              <button
                onClick={() => setLang('ID')}
                className={`px-3 py-1 rounded cursor-pointer ${lang === 'ID' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
              >
                ID
              </button>
              <button
                onClick={() => setLang('EN')}
                className={`px-3 py-1 rounded cursor-pointer ${lang === 'EN' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
              >
                EN
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenRegister();
              }}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-widest rounded shadow-sm transition-all cursor-pointer text-center"
            >
              {lang === 'ID' ? 'Daftar Sekolah Baru' : 'Register New School'}
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenLogin();
              }}
              className="w-full py-3 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest rounded shadow-sm transition-all cursor-pointer text-center"
            >
              {lang === 'ID' ? 'Masuk ke Sistem' : 'Sign In'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
