import React from 'react';
import kawacanaanLogo from '../assets/images/kawacanaan_logo_1787055634013.jpg';

interface KawacanaanEmblemProps {
  className?: string;
  size?: number;
  alt?: string;
}

export const KawacanaanEmblem: React.FC<KawacanaanEmblemProps> = ({
  className = '',
  size = 64,
  alt = 'Emblem Kawacanaan',
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      id="kawacanaan-emblem"
    >
      <img
        src={kawacanaanLogo}
        alt={alt}
        className="w-full h-full object-contain rounded-full drop-shadow-md hover:scale-105 transition-transform duration-300"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
