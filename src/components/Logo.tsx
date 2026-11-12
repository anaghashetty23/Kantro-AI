import React from 'react';
import { Utensils, Clock } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showTagline = false, className = '' }) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center gap-2">
        <div className="relative flex items-center justify-center bg-[#F4C542] rounded-xl p-2 shadow-xs border border-amber-300">
          <Utensils className={`${iconSizes[size]} text-[#292929] stroke-[2.2]`} />
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 border border-amber-400">
            <Clock className="w-3 h-3 text-[#292929]" />
          </div>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight text-[#292929] ${textSizes[size]}`}>
              KANTRO
            </span>
            <span className="bg-[#292929] text-[#F4C542] text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase">
              AI
            </span>
          </div>
          {showTagline && (
            <span className="text-[11px] text-[#777777] font-medium tracking-normal -mt-0.5">
              Your Break, Your Food, Your Time.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
