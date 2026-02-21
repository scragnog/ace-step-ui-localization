import React from 'react';
import { ChevronDown, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';

interface LyricsSectionProps {
    showLyricsSub: boolean;
    setShowLyricsSub: (val: boolean) => void;
    instrumental: boolean;
    setInstrumental: (val: boolean) => void;
    lyrics: string;
    setLyrics: (val: string) => void;
    lyricsRef: React.RefObject<HTMLDivElement>;
    lyricsHeight: number;
    startResizing: (e: React.MouseEvent) => void;
    isFormattingLyrics: boolean;
    handleFormat: (target: 'lyrics' | 'style') => void;
}

export const LyricsSection: React.FC<LyricsSectionProps> = ({
    showLyricsSub,
    setShowLyricsSub,
    instrumental,
    setInstrumental,
    lyrics,
    setLyrics,
    lyricsRef,
    lyricsHeight,
    startResizing,
    isFormattingLyrics,
    handleFormat
}) => {
    const { t } = useI18n();

    if (instrumental) return null;

    return (
        <div>
            <button
                type="button"
                onClick={() => setShowLyricsSub(!showLyricsSub)}
                className="w-full flex items-center justify-between py-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide"
            >
                <span>{t('lyrics')}</span>
                <ChevronDown size={14} className={`text-pink-500 chevron-icon ${showLyricsSub ? 'rotated' : ''}`} />
            </button>
            {showLyricsSub && (
                <div className="space-y-2">
                    <div
                        ref={lyricsRef}
                        className="bg-zinc-50 dark:bg-black/20 rounded-lg border border-zinc-200 dark:border-white/10 overflow-hidden relative flex flex-col transition-colors focus-within:border-pink-500 dark:focus-within:border-pink-500"
                        style={{ height: 'auto' }}
                    >
                        <div className="flex items-center justify-end gap-1 px-2 py-1.5 bg-zinc-100 dark:bg-white/5 border-b border-zinc-200 dark:border-white/10">
                            <button
                                onClick={() => setInstrumental(!instrumental)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${instrumental
                                    ? 'bg-pink-600 text-white border-pink-500'
                                    : 'bg-white dark:bg-suno-card border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10'
                                    }`}
                            >
                                {instrumental ? t('instrumental') : t('vocal')}
                            </button>
                            <button
                                className={`p-1.5 hover:bg-zinc-200 dark:hover:bg-white/10 rounded transition-colors ${isFormattingLyrics ? 'text-pink-500' : 'text-zinc-500 hover:text-black dark:hover:text-white'}`}
                                title={t('aiFormatTooltip')}
                                onClick={() => handleFormat('lyrics')}
                                disabled={isFormattingLyrics || !lyrics.trim()}
                            >
                                {isFormattingLyrics ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            </button>
                            <button
                                className="p-1.5 hover:bg-zinc-200 dark:hover:bg-white/10 rounded text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
                                onClick={() => setLyrics('')}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                        <textarea
                            value={lyrics}
                            onChange={(e) => setLyrics(e.target.value)}
                            placeholder={t('lyricsPlaceholder')}
                            className="flex-1 bg-transparent p-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none resize-none overflow-y-auto"
                            style={{ minHeight: `${lyricsHeight}px`, maxHeight: `${lyricsHeight}px` }}
                        />
                        <div
                            onMouseDown={startResizing}
                            className="h-3 w-full cursor-ns-resize flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors absolute bottom-0 left-0 z-10"
                        >
                            <div className="w-8 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
                        </div>
                    </div>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{t('leaveLyricsEmpty')}</p>
                </div>
            )}
        </div>
    );
};

export default LyricsSection;
