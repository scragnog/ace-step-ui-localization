import React from 'react';
import { useI18n } from '../../context/I18nContext';

/** Track names matching the backend constants in acestep/constants.py TRACK_NAMES */
const EXTRACT_TRACKS = [
    { value: 'vocals', key: 'trackVocals' as const },
    { value: 'backing_vocals', key: 'trackBackingVocals' as const },
    { value: 'drums', key: 'trackDrums' as const },
    { value: 'bass', key: 'trackBass' as const },
    { value: 'guitar', key: 'trackGuitar' as const },
    { value: 'keyboard', key: 'trackKeyboard' as const },
    { value: 'strings', key: 'trackStrings' as const },
    { value: 'synth', key: 'trackSynth' as const },
    { value: 'brass', key: 'trackBrass' as const },
    { value: 'woodwinds', key: 'trackWoodwinds' as const },
    { value: 'percussion', key: 'trackPercussion' as const },
    { value: 'fx', key: 'trackFx' as const },
];

interface ExtractTrackSelectorProps {
    extractTrack: string;
    setExtractTrack: (val: string) => void;
    isTurboModel?: boolean;
}

export const ExtractTrackSelector: React.FC<ExtractTrackSelectorProps> = ({
    extractTrack,
    setExtractTrack,
    isTurboModel = false,
}) => {
    const { t } = useI18n();

    return (
        <div className="bg-white dark:bg-suno-card rounded-xl border border-zinc-200 dark:border-white/5 overflow-hidden">
            <div className="px-3 py-2.5 space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                        {t('extractTrack')}
                    </span>
                    <select
                        value={extractTrack}
                        onChange={(e) => setExtractTrack(e.target.value)}
                        className="bg-zinc-100 dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-pink-500 dark:focus:border-pink-500 transition-colors cursor-pointer [&>option]:bg-white [&>option]:dark:bg-zinc-800 [&>option]:text-zinc-900 [&>option]:dark:text-white"
                    >
                        <option value="">{t('selectTrackToExtract')}</option>
                        {EXTRACT_TRACKS.map(({ value, key }) => (
                            <option key={value} value={value}>
                                {t(key)}
                            </option>
                        ))}
                    </select>
                </div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    {t('extractTrackTooltip')}
                </p>
                {isTurboModel && (
                    <p className="text-[10px] text-amber-500 dark:text-amber-400 font-medium">
                        ⚠️ {t('extractRequiresBaseModel')}
                    </p>
                )}
            </div>
        </div>
    );
};

export default ExtractTrackSelector;
