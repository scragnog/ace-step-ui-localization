// LiveVisualizer.tsx — Real-time audio-reactive visualization canvas
// Used in: RightSidebar (cover art replacement), SongList (background), FullscreenVisualizer

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Palette, Maximize2, Shuffle } from 'lucide-react';
import { useAudioAnalysis } from '../context/AudioAnalysisContext';
import {
    PresetType, ALL_PRESETS, DEFAULT_CONFIG,
    renderVisualizerFrame,
} from './visualizerEngine';

// Preset icons/labels for picker
const PRESET_LABELS: Record<PresetType, string> = {
    'NCS Circle': '🔵 Classic NCS',
    'Linear Bars': '📊 Spectrum',
    'Dual Mirror': '🪞 Mirror',
    'Center Wave': '🌊 Shockwave',
    'Orbital': '🪐 Orbital',
    'Hexagon': '⬡ Hex Core',
    'Oscilloscope': '📈 Analog',
    'Digital Rain': '🟢 Matrix',
    'Shockwave': '💥 Pulse',
    'Minimal': '✨ Clean',
};

const RANDOM_CYCLE_MS = 30_000; // 30 seconds

interface LiveVisualizerProps {
    /** Is audio currently playing? Controls animation loop. */
    isPlaying: boolean;
    /** CSS class for the container */
    className?: string;
    /** Dim the output (for songlist background) */
    dimmed?: boolean;
    /** Show preset picker + fullscreen controls */
    showControls?: boolean;
    /** Callback when fullscreen is requested */
    onFullscreen?: () => void;
}

export const LiveVisualizer: React.FC<LiveVisualizerProps> = ({
    isPlaying,
    className = '',
    dimmed = false,
    showControls = true,
    onFullscreen,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const { analyserNode } = useAudioAnalysis();

    // Preset state
    const [selectedPreset, setSelectedPreset] = useState<PresetType | 'Random'>(() => {
        const saved = localStorage.getItem('visualizer_preset');
        if (saved === 'Random') return 'Random';
        if (saved && ALL_PRESETS.includes(saved as PresetType)) return saved as PresetType;
        return 'Random';
    });

    const [currentPreset, setCurrentPreset] = useState<PresetType>(() => {
        const saved = localStorage.getItem('visualizer_preset');
        if (saved && saved !== 'Random' && ALL_PRESETS.includes(saved as PresetType)) return saved as PresetType;
        return ALL_PRESETS[Math.floor(Math.random() * ALL_PRESETS.length)];
    });

    const [showPicker, setShowPicker] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);

    // Save selection
    useEffect(() => {
        localStorage.setItem('visualizer_preset', selectedPreset);
        if (selectedPreset !== 'Random') {
            setCurrentPreset(selectedPreset);
        }
    }, [selectedPreset]);

    // Random mode: cycle every 30s
    useEffect(() => {
        if (selectedPreset !== 'Random' || !isPlaying) return;

        const pickRandom = () => {
            const available = ALL_PRESETS.filter(p => p !== currentPreset);
            setCurrentPreset(available[Math.floor(Math.random() * available.length)]);
        };

        // Pick one immediately when switching to random
        pickRandom();

        const interval = setInterval(pickRandom, RANDOM_CYCLE_MS);
        return () => clearInterval(interval);
    }, [selectedPreset, isPlaying]); // intentionally omitting currentPreset to avoid re-triggering

    // Close picker on outside click
    useEffect(() => {
        if (!showPicker) return;
        const handleClick = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setShowPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showPicker]);

    // Animation loop
    useEffect(() => {
        if (!isPlaying || !analyserNode) {
            cancelAnimationFrame(animationRef.current);
            // Clear canvas when stopped
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            }
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        const render = () => {
            const ctx = canvas.getContext('2d');
            if (!ctx || !analyserNode) return;

            // Size canvas to container
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const w = rect.width * dpr;
            const h = rect.height * dpr;
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
            }

            // Get audio data
            const bufferLength = analyserNode.frequencyBinCount;
            const frequencyData = new Uint8Array(bufferLength);
            const timeDomainData = new Uint8Array(bufferLength);
            analyserNode.getByteFrequencyData(frequencyData);
            analyserNode.getByteTimeDomainData(timeDomainData);

            const time = Date.now() / 1000;

            renderVisualizerFrame({
                canvas, ctx,
                width: w, height: h,
                frequencyData, timeDomainData,
                time,
                config: { ...DEFAULT_CONFIG, preset: currentPreset },
            });

            animationRef.current = requestAnimationFrame(render);
        };

        animationRef.current = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animationRef.current);
    }, [isPlaying, analyserNode, currentPreset]);

    return (
        <div
            className={`relative overflow-hidden ${className}`}
            style={dimmed ? { opacity: 0.15, pointerEvents: 'none' } : undefined}
        >
            <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ width: '100%', height: '100%', display: 'block', background: '#000' }}
            />

            {/* Controls overlay */}
            {showControls && !dimmed && (
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-10">
                    {/* Preset picker button */}
                    <div className="relative" ref={pickerRef}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowPicker(!showPicker); }}
                            className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white/70 hover:text-white transition-all backdrop-blur-sm"
                            title="Change visualization"
                        >
                            <Palette size={14} />
                        </button>

                        {/* Dropdown */}
                        {showPicker && (
                            <div className="absolute bottom-full right-0 mb-2 w-44 bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                                {/* Random option */}
                                <button
                                    onClick={() => { setSelectedPreset('Random'); setShowPicker(false); }}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors ${selectedPreset === 'Random'
                                            ? 'text-pink-400 bg-pink-500/10'
                                            : 'text-zinc-300 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <Shuffle size={13} />
                                    <span>Random</span>
                                    {selectedPreset === 'Random' && (
                                        <span className="ml-auto text-[10px] text-pink-400/60">~30s</span>
                                    )}
                                </button>

                                <div className="h-px bg-white/10 my-1" />

                                {/* Preset list */}
                                {ALL_PRESETS.map(preset => (
                                    <button
                                        key={preset}
                                        onClick={() => { setSelectedPreset(preset); setShowPicker(false); }}
                                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium transition-colors ${currentPreset === preset && selectedPreset !== 'Random'
                                                ? 'text-pink-400 bg-pink-500/10'
                                                : 'text-zinc-300 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <span>{PRESET_LABELS[preset]}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Fullscreen button */}
                    {onFullscreen && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onFullscreen(); }}
                            className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white/70 hover:text-white transition-all backdrop-blur-sm"
                            title="Full screen"
                        >
                            <Maximize2 size={14} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
