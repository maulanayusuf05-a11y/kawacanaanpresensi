import React from 'react';
import { useApp } from '../context/AppContext';

interface SchoolLogoProps {
  className?: string;
  size?: number;
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({ className = '', size = 48 }) => {
  const { systemConfig } = useApp();

  if (systemConfig.schoolLogoUrl) {
    return (
      <img
        src={systemConfig.schoolLogoUrl}
        alt="Logo Sekolah"
        className={`object-contain rounded-full shadow-sm ${className}`}
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center rounded-full overflow-hidden shadow-sm border border-amber-800/30 bg-amber-950/10 flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Ring */}
        <circle cx="50" cy="50" r="48" fill="#7A1D1D" stroke="#E6C25B" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="43" fill="#8E2323" stroke="#D39F38" strokeWidth="1" strokeDasharray="2 1.5" />

        {/* Center Shield Backing */}
        <path
          d="M50 15 C65 15 78 24 78 45 C78 68 50 82 50 82 C50 82 22 68 22 45 C22 24 35 15 50 15 Z"
          fill="#5B1313"
          stroke="#F3D17A"
          strokeWidth="1.5"
        />

        {/* Golden Wings / Rice & Cotton Garlands */}
        <path
          d="M25 50 C26 35 38 25 50 25 C62 25 74 35 75 50 C70 65 50 72 50 72 C50 72 30 65 25 50 Z"
          fill="#A32929"
        />

        {/* Golden Center Flame / Star / Monas Symbol */}
        <path
          d="M50 28 L53 38 L63 38 L55 44 L58 54 L50 48 L42 54 L45 44 L37 38 L47 38 Z"
          fill="#F5D061"
          stroke="#B4861F"
          strokeWidth="0.8"
        />

        {/* Center Book / Education Rays */}
        <path
          d="M36 58 Q50 54 50 63 Q50 54 64 58 L63 66 Q50 62 50 70 Q50 62 37 66 Z"
          fill="#FFFFFF"
          stroke="#D4A017"
          strokeWidth="0.8"
        />

        {/* Bottom Gold/White Banner with text */}
        <path
          d="M22 75 Q50 86 78 75 L75 83 Q50 94 25 83 Z"
          fill="#F8FAF0"
          stroke="#B4861F"
          strokeWidth="1"
        />
        <text
          x="50"
          y="81.5"
          textAnchor="middle"
          fill="#681616"
          fontSize="4.5"
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
          letterSpacing="0.2"
        >
          TUT WURI HANDAYANI
        </text>
      </svg>
    </div>
  );
};
