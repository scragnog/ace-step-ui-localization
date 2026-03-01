import React, { useState, useEffect } from 'react';
import { ChevronDown, FlaskConical } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { generateApi } from '../../services/api';

interface LayerAblationPanelProps {
    customMode: boolean;
    hasLoadedAdapters: boolean;
    onLayerScaleChange?: (slot: number, layer: number, scale: number) => void;
}

export const LayerAblationPanel: React.FC<LayerAblationPanelProps> = ({
    customMode,
    hasLoadedAdapters,
    onLayerScaleChange,
}) => {
    const { token } = useAuth();
    const [devMode, setDevMode] = useState(() => {
        try { return localStorage.getItem('ace_dev_mode') === 'true'; } catch { return false; }
    });
    const [isOpen, setIsOpen] = useState(false);
    const [selectedLayers, setSelectedLayers] = useState<Set<number>>(new Set());
    const [diffAmplify, setDiffAmplify] = useState(3.0);
    const [referencePath, setReferencePath] = useState('');
    const [ablatedPath, setAblatedPath] = useState('');
    const [diffResult, setDiffResult] = useState<{
        output_path: string;
        rms_energy: number;
        peak: number;
    } | null>(null);
    const [isDiffing, setIsDiffing] = useState(false);
    const [diffError, setDiffError] = useState<string | null>(null);

    useEffect(() => {
        try { localStorage.setItem('ace_dev_mode', String(devMode)); } catch { }
    }, [devMode]);

    if (!customMode) return null;

    const toggleLayer = (layer: number) => {
        setSelectedLayers(prev => {
            const next = new Set(prev);
            if (next.has(layer)) next.delete(layer); else next.add(layer);
            return next;
        });
    };

    const selectAll = () => setSelectedLayers(new Set(Array.from({ length: 24 }, (_, i) => i)));
    const selectNone = () => setSelectedLayers(new Set());

    const handleComputeDiff = async () => {
        if (!token || !referencePath || !ablatedPath) return;
        setIsDiffing(true);
        setDiffError(null);
        setDiffResult(null);
        try {
            const result = await generateApi.computeAudioDiff({
                reference_path: referencePath,
                ablated_path: ablatedPath,
                amplify: diffAmplify,
            }, token);
            setDiffResult(result);
        } catch (err: any) {
            setDiffError(err.message || 'Failed to compute diff');
        } finally {
            setIsDiffing(false);
        }
    };

    const handleSetLayerScale = async (layer: number, scale: number) => {
        if (onLayerScaleChange) {
            // Use parent callback to update both React state and API
            onLayerScaleChange(0, layer, scale);
        } else if (token) {
            // Fallback: direct API call
            try {
                await generateApi.setSlotLayerScale({ slot: 0, layer, scale }, token);
            } catch (err) {
                console.error('Failed to set layer scale:', err);
            }
        }
    };

    const handleZeroSelectedLayers = async () => {
        if (!token) return;
        for (const layer of selectedLayers) {
            await handleSetLayerScale(layer, 0.0);
        }
    };

    const handleResetAllLayers = async () => {
        if (!token) return;
        for (let i = 0; i < 24; i++) {
            await handleSetLayerScale(i, 1.0);
        }
    };

    return (
        <div>
            {/* Dev Mode Toggle */}
            <div className="flex items-center gap-2 px-1 py-1">
                <label className="text-[10px] font-medium text-zinc-500 dark:text-zinc-500 flex items-center gap-1.5 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={devMode}
                        onChange={(e) => setDevMode(e.target.checked)}
                        className="rounded border-zinc-300 dark:border-zinc-600 text-purple-500 focus:ring-purple-500"
                    />
                    <FlaskConical size={12} />
                    Developer Mode
                </label>
            </div>

            {devMode && (
                <div>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className={`w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-suno-card border border-zinc-200 dark:border-white/5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors ${isOpen ? 'rounded-t-xl rounded-b-none border-b-0' : 'rounded-xl'}`}
                    >
                        <div className="flex items-center gap-2">
                            <FlaskConical size={16} className="text-purple-500" />
                            <span>Layer Ablation Lab</span>
                        </div>
                        <ChevronDown size={18} className={`text-purple-500 chevron-icon ${isOpen ? 'rotated' : ''}`} />
                    </button>

                    {isOpen && (
                        <div className="bg-white dark:bg-suno-card rounded-b-xl rounded-t-none border border-t-0 border-zinc-200 dark:border-white/5 p-4 space-y-4">
                            {!hasLoadedAdapters ? (
                                <div className="text-xs text-zinc-400 dark:text-zinc-600 text-center py-4">
                                    Load an adapter in Advanced Mode to use the ablation lab
                                </div>
                            ) : (
                                <>
                                    {/* Workflow explanation */}
                                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed bg-purple-50 dark:bg-purple-900/10 rounded-lg px-3 py-2 border border-purple-200 dark:border-purple-800/30">
                                        <strong>How to use:</strong> Generate a reference track (full adapter, fixed seed). Then zero specific layers, regenerate with the same seed, and use Audio Diff to hear what changed. Higher RMS energy = bigger layer impact.
                                    </div>

                                    {/* Layer Selection Grid */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Layers to Test</span>
                                            <div className="flex gap-2">
                                                <button onClick={selectAll} className="text-[10px] text-purple-500 hover:text-purple-400">All</button>
                                                <button onClick={selectNone} className="text-[10px] text-zinc-400 hover:text-zinc-300">None</button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-8 gap-1">
                                            {Array.from({ length: 24 }, (_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => toggleLayer(i)}
                                                    className={`px-1 py-1 rounded text-[10px] font-mono font-semibold border transition-colors ${selectedLayers.has(i)
                                                        ? 'bg-purple-500 text-white border-purple-600'
                                                        : 'bg-zinc-100 dark:bg-black/20 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-white/10 hover:border-purple-300'
                                                        }`}
                                                >
                                                    {i}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={handleZeroSelectedLayers}
                                            disabled={selectedLayers.size === 0}
                                            className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/30 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-40 transition-colors"
                                        >
                                            Zero Selected ({selectedLayers.size})
                                        </button>
                                        <button
                                            onClick={handleResetAllLayers}
                                            className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                                        >
                                            Reset All to 1.0
                                        </button>
                                    </div>

                                    {/* Audio Diff Section */}
                                    <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-white/5">
                                        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Audio Diff</span>
                                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight">
                                            Paste paths to a reference track and an ablated track. The diff isolates what changed.
                                        </p>
                                        <div className="space-y-1.5">
                                            <input
                                                type="text"
                                                value={referencePath}
                                                onChange={(e) => setReferencePath(e.target.value)}
                                                placeholder="Reference audio path (full adapter)"
                                                className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                                            />
                                            <input
                                                type="text"
                                                value={ablatedPath}
                                                onChange={(e) => setAblatedPath(e.target.value)}
                                                placeholder="Ablated audio path (layer zeroed)"
                                                className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                                            />
                                            <div className="flex items-center gap-2">
                                                <label className="text-[10px] text-zinc-500 whitespace-nowrap">Amplify:</label>
                                                <input
                                                    type="range"
                                                    min={1}
                                                    max={20}
                                                    step={0.5}
                                                    value={diffAmplify}
                                                    onChange={(e) => setDiffAmplify(parseFloat(e.target.value))}
                                                    className="flex-1 accent-purple-500"
                                                />
                                                <span className="text-[10px] text-zinc-500 font-mono w-8">{diffAmplify}x</span>
                                            </div>
                                            <button
                                                onClick={handleComputeDiff}
                                                disabled={isDiffing || !referencePath || !ablatedPath}
                                                className="w-full px-3 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:brightness-110 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                                            >
                                                {isDiffing ? (
                                                    <><span className="inline-block w-3 h-3 border-2 border-white/60 border-t-transparent rounded-full animate-spin" /> Computing...</>
                                                ) : (
                                                    <>🔬 Compute Diff</>
                                                )}
                                            </button>
                                        </div>

                                        {/* Diff Error */}
                                        {diffError && (
                                            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                                                {diffError}
                                            </div>
                                        )}

                                        {/* Diff Results */}
                                        {diffResult && (
                                            <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg p-3 space-y-2 border border-purple-200 dark:border-purple-800/30">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">Diff Result</span>
                                                    <span className="text-[10px] text-zinc-500">{diffResult.duration_match ? '✓ Length match' : '⚠ Length mismatch'}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                                    <div>
                                                        <span className="text-zinc-500">RMS Energy:</span>
                                                        <span className={`ml-1 font-bold ${diffResult.rms_energy > 0.05 ? 'text-red-500' : diffResult.rms_energy > 0.01 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                            {diffResult.rms_energy.toFixed(4)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-zinc-500">Peak:</span>
                                                        <span className={`ml-1 font-bold ${diffResult.peak > 0.3 ? 'text-red-500' : diffResult.peak > 0.1 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                            {diffResult.peak.toFixed(4)}
                                                        </span>
                                                    </div>
                                                </div>
                                                {/* Impact bar */}
                                                <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 rounded-full transition-all"
                                                        style={{ width: `${Math.min(diffResult.rms_energy * 1000, 100)}%` }}
                                                    />
                                                </div>
                                                <p className="text-[9px] text-zinc-400 dark:text-zinc-500 truncate" title={diffResult.output_path}>
                                                    Saved: {diffResult.output_path}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LayerAblationPanel;
