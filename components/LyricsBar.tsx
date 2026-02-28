// LyricsBar.tsx — Bottom bar showing synced lyrics one line at a time
// Displayed at the bottom of the SongList when not in comparison mode

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Music } from 'lucide-react';

interface LrcLine {
    time: number;
    text: string;
}

interface LyricsBarProps {
    audioUrl?: string;
    currentTime: number;
    isPlaying: boolean;
}

function parseLrc(raw: string): LrcLine[] {
    const lines: LrcLine[] = [];
    for (const line of raw.replace(/\r/g, '').split('\n')) {
        const match = line.match(/^\[(\d+):(\d+)(?:\.(\d+))?\]\s*(.*)$/);
        if (match) {
            const mins = parseInt(match[1], 10);
            const secs = parseInt(match[2], 10);
            const cs = match[3] ? parseInt(match[3].padEnd(2, '0').slice(0, 2), 10) : 0;
            const text = match[4].trim();
            if (text && !/^\[.*\]$/.test(text)) {
                lines.push({ time: mins * 60 + secs + cs / 100, text });
            }
        }
    }
    return lines.sort((a, b) => a.time - b.time);
}

function findCurrentIndex(lines: LrcLine[], time: number): number {
    if (lines.length === 0) return -1;
    let lo = 0, hi = lines.length - 1, result = -1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (lines[mid].time <= time) {
            result = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    return result;
}

export const LyricsBar: React.FC<LyricsBarProps> = ({ audioUrl, currentTime, isPlaying }) => {
    const [fetchedLrc, setFetchedLrc] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(true);
    const [prevIdx, setPrevIdx] = useState(-1);
    const [animating, setAnimating] = useState(false);

    // Fetch LRC
    useEffect(() => {
        if (!audioUrl) { setFetchedLrc(null); return; }
        let cancelled = false;
        const lrcUrl = audioUrl.replace(/\.\w+$/, '.lrc');
        fetch(lrcUrl)
            .then(res => { if (!res.ok) throw new Error('No LRC'); return res.text(); })
            .then(text => { if (!cancelled && text.includes('[')) setFetchedLrc(text); })
            .catch(() => { if (!cancelled) setFetchedLrc(null); });
        return () => { cancelled = true; };
    }, [audioUrl]);

    const lines = useMemo(() => fetchedLrc ? parseLrc(fetchedLrc) : [], [fetchedLrc]);
    const currentIdx = findCurrentIndex(lines, currentTime);

    // Trigger fade animation on line change
    useEffect(() => {
        if (currentIdx !== prevIdx && currentIdx >= 0) {
            setAnimating(true);
            const timer = setTimeout(() => setAnimating(false), 400);
            setPrevIdx(currentIdx);
            return () => clearTimeout(timer);
        }
    }, [currentIdx, prevIdx]);

    if (lines.length === 0 || !isPlaying) return null;

    const currentLine = currentIdx >= 0 ? lines[currentIdx] : null;
    const nextLine = currentIdx >= 0 && currentIdx + 1 < lines.length ? lines[currentIdx + 1] : null;

    return (
        <div className="flex-shrink-0 border-t border-zinc-200 dark:border-white/10 bg-gradient-to-r from-zinc-50 via-zinc-100 to-zinc-50 dark:from-zinc-900 dark:via-[#111113] dark:to-zinc-900 z-30 transition-all duration-300">
            {/* Collapse/Expand toggle tab */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-center gap-2 py-1 text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors group"
            >
                <Music size={12} className="text-pink-500/60" />
                <span className="font-medium">Lyrics</span>
                {expanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            </button>

            {/* Lyrics content */}
            <div
                className="overflow-hidden transition-all duration-300 ease-out"
                style={{ maxHeight: expanded ? '80px' : '0px', opacity: expanded ? 1 : 0 }}
            >
                <div className="px-6 pb-3 flex flex-col items-center justify-center min-h-[50px]">
                    {/* Current line */}
                    <div
                        className={`text-center transition-all duration-400 ease-out ${animating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
                        style={{ transitionDuration: animating ? '0ms' : '400ms' }}
                    >
                        <span
                            className="text-sm md:text-base font-semibold text-zinc-800 dark:text-white"
                            style={{
                                textShadow: '0 0 20px rgba(236, 72, 153, 0.3)',
                            }}
                        >
                            {currentLine?.text || '♪ ♪ ♪'}
                        </span>
                    </div>

                    {/* Next line preview */}
                    {nextLine && (
                        <div className="mt-1">
                            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                                {nextLine.text}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
