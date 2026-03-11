import React from 'react';

interface MasteringToggleProps {
    isOriginal: boolean;
    onToggle: () => void;
    size?: 'sm' | 'md';
    className?: string;
}

/**
 * Slider toggle for switching between Mastered and Original audio.
 * Amber/orange when Mastered, muted when Original.
 */
export const MasteringToggle: React.FC<MasteringToggleProps> = ({
    isOriginal,
    onToggle,
    size = 'md',
    className = '',
}) => {
    const isSm = size === 'sm';

    return (
        <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className={`relative inline-flex items-center rounded-full transition-all duration-200 cursor-pointer flex-shrink-0 ${
                isSm ? 'w-[52px] h-[20px]' : 'w-[64px] h-[24px]'
            } ${
                isOriginal
                    ? 'bg-zinc-300 dark:bg-zinc-600'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-sm shadow-amber-500/30'
            } ${className}`}
            title={isOriginal ? 'Playing original — click for mastered' : 'Playing mastered — click for original'}
        >
            {/* Track labels */}
            <span className={`absolute left-1 font-bold text-white/80 select-none ${
                isSm ? 'text-[7px]' : 'text-[8px]'
            } ${isOriginal ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
                M
            </span>
            <span className={`absolute right-1.5 font-bold select-none ${
                isSm ? 'text-[7px]' : 'text-[8px]'
            } ${isOriginal ? 'opacity-100 text-zinc-500 dark:text-zinc-400' : 'opacity-0 text-white/80'} transition-opacity`}>
                O
            </span>

            {/* Thumb */}
            <span className={`inline-block rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                isSm ? 'w-[16px] h-[16px]' : 'w-[20px] h-[20px]'
            } ${
                isOriginal
                    ? (isSm ? 'translate-x-[34px]' : 'translate-x-[42px]')
                    : 'translate-x-[2px]'
            }`} />
        </button>
    );
};

export default MasteringToggle;
