import React, { useState } from 'react';
import { Sliders, ChevronDown, FolderSearch } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { generateApi } from '../../services/api';
import { EditableSlider } from '../EditableSlider';

export interface AdapterSlot {
    slot: number;
    type: 'peft_lora' | 'lokr';
    name: string;
    path: string;
    scale: number;
    group_scales: Record<string, number>;
    layer_scales?: Record<number, number>;
}

export interface AdapterFile {
    path: string;
    name: string;
    type: string;
    size: number;
}

interface AdaptersAccordionProps {
    // Mode/Visibility
    customMode: boolean;
    isOpen: boolean;
    onToggle: () => void;

    // Basic Mode
    advancedAdapters: boolean;
    onAdvancedAdaptersChange: (val: boolean) => void;
    loraPath: string;
    onLoraPathChange: (val: string) => void;
    loraLoaded: boolean;
    isLoraLoading: boolean;
    onLoraToggle: () => void;
    loraError: string | null;
    loraScale: number;
    onLoraScaleChange: (val: number) => void;

    // Advanced Mode (Multi-slot)
    adapterFolder: string;
    onAdapterFolderChange: (val: string) => void;
    onScanFolder: () => void;
    adapterFiles: AdapterFile[];
    adapterSlots: AdapterSlot[];
    loadingAdapterPath: string | null;
    adapterLoadingMessage: string | null;
    expandedSlots: Set<number>;
    setExpandedSlots: React.Dispatch<React.SetStateAction<Set<number>>>;

    // Advanced Handlers
    onLoadSlot: (path: string) => void;
    onUnloadSlot: (slotNum: number) => void;
    onSlotScaleChange: (slotNum: number, scale: number) => void;
    onSlotGroupScaleChange: (slotNum: number, group: string, scale: number) => void;
    onSlotLayerScaleChange?: (slotNum: number, layer: number, scale: number) => void;
}

export const AdaptersAccordion: React.FC<AdaptersAccordionProps> = ({
    customMode,
    isOpen,
    onToggle,
    advancedAdapters,
    onAdvancedAdaptersChange,
    loraPath,
    onLoraPathChange,
    loraLoaded,
    isLoraLoading,
    onLoraToggle,
    loraError,
    loraScale,
    onLoraScaleChange,
    adapterFolder,
    onAdapterFolderChange,
    onScanFolder,
    adapterFiles,
    adapterSlots,
    loadingAdapterPath,
    adapterLoadingMessage,
    expandedSlots,
    setExpandedSlots,
    onLoadSlot,
    onUnloadSlot,
    onSlotScaleChange,
    onSlotGroupScaleChange,
    onSlotLayerScaleChange,
}) => {
    const { t } = useI18n();
    const { token } = useAuth();
    const [browsedFiles, setBrowsedFiles] = useState<AdapterFile[]>([]);
    const [showBrowse, setShowBrowse] = useState(false);
    const [isBrowsing, setIsBrowsing] = useState(false);
    const [expandedLayers, setExpandedLayers] = useState<Set<number>>(new Set());

    // Open native folder picker dialog
    const handleBrowse = async () => {
        if (!token) return;
        setIsBrowsing(true);
        try {
            const result = await generateApi.browseLoraFolder(token);
            if (result.folder) {
                onLoraPathChange(result.folder);
            }
        } catch (err) {
            console.warn('Browse error:', err);
        } finally {
            setIsBrowsing(false);
        }
    };

    if (!customMode) return null;

    return (
        <div>
            <button
                onClick={onToggle}
                className={`w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-suno-card border border-zinc-200 dark:border-white/5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors ${isOpen ? 'rounded-t-xl rounded-b-none border-b-0' : 'rounded-xl'}`}
            >
                <div className="flex items-center gap-2">
                    <Sliders size={16} className="text-zinc-500" />
                    <span>Adapters (LoRA / LoKR)</span>
                </div>
                <ChevronDown size={18} className={`text-pink-500 chevron-icon ${isOpen ? 'rotated' : ''}`} />
            </button>

            {isOpen && (
                <div className="bg-white dark:bg-suno-card rounded-b-xl rounded-t-none border border-t-0 border-zinc-200 dark:border-white/5 p-4 space-y-4">
                    {/* Advanced Toggle */}
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={advancedAdapters}
                                onChange={(e) => onAdvancedAdaptersChange(e.target.checked)}
                                className="rounded border-zinc-300 dark:border-zinc-600 text-pink-500 focus:ring-pink-500"
                            />
                            Advanced (Multi-Adapter)
                        </label>
                    </div>

                    {!advancedAdapters ? (
                        /* BASIC MODE */
                        <>
                            {/* LoRA Path Input + Browse */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t('loraPath')}</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={loraPath}
                                        onChange={(e) => onLoraPathChange(e.target.value)}
                                        placeholder={t('loraPathPlaceholder')}
                                        className="flex-1 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-pink-500 dark:focus:border-pink-500 transition-colors"
                                    />
                                    <button
                                        onClick={handleBrowse}
                                        disabled={isBrowsing}
                                        title="Browse for adapter files"
                                        className="px-3 py-2 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                                    >
                                        <FolderSearch size={14} />
                                        {isBrowsing ? '...' : 'Browse'}
                                    </button>
                                </div>
                            </div>

                            {/* Browsed files dropdown */}
                            {showBrowse && browsedFiles.length > 0 && (
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                            Available ({browsedFiles.length})
                                        </label>
                                        <button
                                            onClick={() => setShowBrowse(false)}
                                            className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                        >
                                            Hide
                                        </button>
                                    </div>
                                    <div className="max-h-28 overflow-y-auto space-y-1">
                                        {browsedFiles.map((file) => (
                                            <button
                                                key={file.path}
                                                onClick={() => {
                                                    onLoraPathChange(file.path);
                                                    setShowBrowse(false);
                                                }}
                                                className={`w-full flex items-center justify-between bg-zinc-50 dark:bg-black/20 rounded-lg px-3 py-2 text-left hover:bg-pink-50 dark:hover:bg-pink-900/10 transition-colors ${file.path === loraPath ? 'ring-1 ring-pink-500' : ''}`}
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${file.type === 'lora' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}`}>
                                                        {file.type.toUpperCase()}
                                                    </span>
                                                    <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate">{file.name}</span>
                                                </div>
                                                <span className="text-[10px] text-zinc-400 flex-shrink-0 ml-2">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {showBrowse && browsedFiles.length === 0 && !isBrowsing && (
                                <div className="text-xs text-zinc-400 dark:text-zinc-600 text-center py-1">
                                    No adapter files found in folder
                                </div>
                            )}

                            {/* LoRA Load/Unload Toggle */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between py-2 border-t border-zinc-100 dark:border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${loraLoaded ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                        <span className={`text-xs font-medium ${loraLoaded ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {loraLoaded ? t('loraLoaded') : t('loraUnloaded')}
                                        </span>
                                    </div>
                                    <button
                                        onClick={onLoraToggle}
                                        disabled={!loraPath.trim() || isLoraLoading}
                                        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${loraLoaded
                                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/20 hover:from-green-600 hover:to-emerald-700'
                                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                            }`}
                                    >
                                        {isLoraLoading ? '...' : (loraLoaded ? t('loraUnload') : t('loraLoad'))}
                                    </button>
                                </div>
                                {loraError && (
                                    <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                                        {loraError}
                                    </div>
                                )}
                            </div>

                            {/* LoRA Scale Slider */}
                            <div className={!loraLoaded ? 'opacity-40 pointer-events-none' : ''}>
                                <EditableSlider
                                    label={t('loraScale')}
                                    value={loraScale}
                                    min={0}
                                    max={2}
                                    step={0.05}
                                    onChange={onLoraScaleChange}
                                    formatDisplay={(val) => val.toFixed(2)}
                                    helpText={t('loraScaleDescription')}
                                />
                            </div>
                        </>
                    ) : (
                        /* ADVANCED MODE */
                        <>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Adapter Folder</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={adapterFolder}
                                        onChange={(e) => onAdapterFolderChange(e.target.value)}
                                        placeholder="./lokr_output"
                                        className="flex-1 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-pink-500"
                                    />
                                    <button
                                        onClick={async () => {
                                            const folder = adapterFolder.trim() || './lokr_output';
                                            onAdapterFolderChange(folder);
                                            onScanFolder();
                                        }}
                                        disabled={!adapterFolder.trim() && false}
                                        className="px-3 py-2 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                                    >
                                        Scan
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!token) return;
                                            setIsBrowsing(true);
                                            try {
                                                const result = await generateApi.browseLoraFolder(token);
                                                if (result.folder) {
                                                    onAdapterFolderChange(result.folder);
                                                }
                                            } catch (e) { console.warn('Browse error:', e); } finally { setIsBrowsing(false); }
                                        }}
                                        disabled={isBrowsing}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-900/30 disabled:opacity-40 transition-colors"
                                        title="Browse for adapter files in the folder"
                                    >
                                        <FolderSearch size={14} />
                                        {isBrowsing ? '...' : 'Browse'}
                                    </button>
                                </div>
                                {showBrowse && browsedFiles.length > 0 && (
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                                Found ({browsedFiles.length})
                                            </label>
                                            <button
                                                onClick={() => setShowBrowse(false)}
                                                className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                            >
                                                Hide
                                            </button>
                                        </div>
                                        <div className="max-h-28 overflow-y-auto space-y-1">
                                            {browsedFiles.map((file) => {
                                                const isAlreadyLoaded = adapterSlots.some(s => s.path === file.path);
                                                return (
                                                    <button
                                                        key={file.path}
                                                        onClick={() => {
                                                            if (!isAlreadyLoaded) onLoadSlot(file.path);
                                                            setShowBrowse(false);
                                                        }}
                                                        disabled={isAlreadyLoaded}
                                                        className={`w-full flex items-center justify-between bg-zinc-50 dark:bg-black/20 rounded-lg px-3 py-2 text-left transition-colors ${isAlreadyLoaded ? 'opacity-50 cursor-not-allowed' : 'hover:bg-pink-50 dark:hover:bg-pink-900/10 cursor-pointer'}`}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${file.type === 'lora' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}`}>
                                                                {file.type.toUpperCase()}
                                                            </span>
                                                            <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate">{file.name}</span>
                                                        </div>
                                                        <span className="text-[10px] text-zinc-400 flex-shrink-0 ml-2">
                                                            {isAlreadyLoaded ? '✓ Loaded' : `${(file.size / 1024 / 1024).toFixed(1)}MB`}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* File list */}
                            {adapterFiles.length > 0 && (
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Available Adapters ({adapterFiles.length})</label>
                                    <div className="max-h-32 overflow-y-auto space-y-1">
                                        {adapterFiles.map((file) => {
                                            const isAlreadyLoaded = adapterSlots.some(s => s.path === file.path);
                                            return (
                                                <div key={file.path} className="flex items-center justify-between bg-zinc-50 dark:bg-black/20 rounded-lg px-3 py-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${file.type === 'lora' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}`}>
                                                            {file.type.toUpperCase()}
                                                        </span>
                                                        <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate">{file.name}</span>
                                                        <span className="text-[10px] text-zinc-400">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                                                    </div>
                                                    {isAlreadyLoaded ? (
                                                        <span className="px-2 py-1 rounded text-[10px] font-semibold text-emerald-500 dark:text-emerald-400 bg-emerald-500/10">
                                                            ✓ Loaded
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => onLoadSlot(file.path)}
                                                            disabled={isLoraLoading || adapterSlots.length >= 4}
                                                            className="px-2 py-1 rounded text-[10px] font-semibold bg-pink-500/10 text-pink-600 dark:text-pink-400 hover:bg-pink-500/20 disabled:opacity-40 transition-colors flex items-center gap-1"
                                                        >
                                                            {loadingAdapterPath === file.path ? (
                                                                <><span className="inline-block w-3 h-3 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" /> Loading…</>
                                                            ) : isLoraLoading ? 'Wait…' : 'Load'}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Adapter loading status */}
                            {adapterLoadingMessage && (
                                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1.5 rounded">
                                    <span className="inline-block w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                                    {adapterLoadingMessage}
                                </div>
                            )}

                            {/* Error display */}
                            {loraError && (
                                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                                    {loraError}
                                </div>
                            )}

                            {/* Loaded adapter slots */}
                            {adapterSlots.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Loaded Adapters ({adapterSlots.length}/4)</label>
                                    {(() => {
                                        const totalScale = adapterSlots.reduce((sum, s) => sum + s.scale, 0);
                                        return totalScale > 1.0 ? (
                                            <div className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1.5 rounded">
                                                <span className="mt-0.5">⚠️</span>
                                                <span>Combined adapter strength is <strong>{totalScale.toFixed(2)}</strong> — values above 1.0 may produce unexpected or distorted output.</span>
                                            </div>
                                        ) : null;
                                    })()}
                                    {adapterSlots.map((slot) => (
                                        <div key={slot.slot} className="bg-zinc-50 dark:bg-black/20 rounded-lg p-3 space-y-2 border border-zinc-200 dark:border-white/5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{slot.name}</span>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${slot.type === 'peft_lora' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}`}>
                                                        {slot.type === 'peft_lora' ? 'LoRA' : 'LoKr'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setExpandedSlots(prev => {
                                                            const next = new Set(prev);
                                                            if (next.has(slot.slot)) next.delete(slot.slot); else next.add(slot.slot);
                                                            return next;
                                                        })}
                                                        className="text-[10px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                                    >
                                                        {expandedSlots.has(slot.slot) ? '▼' : '▶'} Groups
                                                    </button>
                                                    <button
                                                        onClick={() => setExpandedLayers(prev => {
                                                            const next = new Set(prev);
                                                            if (next.has(slot.slot)) next.delete(slot.slot); else next.add(slot.slot);
                                                            return next;
                                                        })}
                                                        className="text-[10px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                                    >
                                                        {expandedLayers.has(slot.slot) ? '▼' : '▶'} Layers
                                                    </button>
                                                    <button
                                                        onClick={() => onUnloadSlot(slot.slot)}
                                                        disabled={isLoraLoading}
                                                        className="px-2 py-1 rounded text-[10px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors"
                                                    >
                                                        Unload
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Overall scale slider */}
                                            <EditableSlider
                                                label={`Scale`}
                                                value={slot.scale}
                                                min={0}
                                                max={2}
                                                step={0.05}
                                                onChange={(v) => onSlotScaleChange(slot.slot, v)}
                                                formatDisplay={(v) => v.toFixed(2)}
                                            />

                                            {/* Per-group sliders (expandable) */}
                                            {expandedSlots.has(slot.slot) && (
                                                <div className="space-y-1 pl-2 border-l-2 border-pink-500/20">
                                                    {(['self_attn', 'cross_attn', 'mlp'] as const).map((group) => (
                                                        <EditableSlider
                                                            key={group}
                                                            label={group === 'self_attn' ? 'Self-Attn' : group === 'cross_attn' ? 'Cross-Attn' : 'MLP'}
                                                            value={slot.group_scales[group]}
                                                            min={0}
                                                            max={2}
                                                            step={0.05}
                                                            onChange={(v) => onSlotGroupScaleChange(slot.slot, group, v)}
                                                            formatDisplay={(v) => v.toFixed(2)}
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            {/* Per-layer sliders (expandable) */}
                                            {expandedLayers.has(slot.slot) && (
                                                <div className="space-y-2 pl-2 border-l-2 border-purple-500/20">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Layer Scales (0–23)</span>
                                                        <button
                                                            onClick={() => {
                                                                if (onSlotLayerScaleChange) {
                                                                    for (let i = 0; i < 24; i++) {
                                                                        if ((slot.layer_scales?.[i] ?? 1.0) !== 1.0) {
                                                                            onSlotLayerScaleChange(slot.slot, i, 1.0);
                                                                        }
                                                                    }
                                                                }
                                                            }}
                                                            className="text-[10px] text-zinc-400 hover:text-pink-500 transition-colors"
                                                        >
                                                            Reset All
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-6 gap-x-2 gap-y-1">
                                                        {Array.from({ length: 24 }, (_, i) => {
                                                            const val = slot.layer_scales?.[i] ?? 1.0;
                                                            const isModified = Math.abs(val - 1.0) > 0.01;
                                                            return (
                                                                <div key={i} className="flex flex-col items-center">
                                                                    <span className={`text-[9px] font-mono ${isModified ? 'text-purple-500 font-bold' : 'text-zinc-400'}`}>{i}</span>
                                                                    <input
                                                                        type="range"
                                                                        min={0}
                                                                        max={2}
                                                                        step={0.05}
                                                                        value={val}
                                                                        onChange={(e) => onSlotLayerScaleChange?.(slot.slot, i, parseFloat(e.target.value))}
                                                                        className="w-full h-1 accent-purple-500"
                                                                        style={{ WebkitAppearance: 'none', height: '4px' }}
                                                                    />
                                                                    <span className={`text-[8px] ${isModified ? 'text-purple-400 font-semibold' : 'text-zinc-500'}`}>{val.toFixed(1)}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {adapterSlots.length === 0 && adapterFiles.length === 0 && (
                                <div className="text-xs text-zinc-400 dark:text-zinc-600 text-center py-2">
                                    Enter an adapter folder path and click Scan to browse available adapters
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdaptersAccordion;
