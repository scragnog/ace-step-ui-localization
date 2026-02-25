import React from 'react';
import { useI18n } from '../../context/I18nContext';
import { EditableSlider } from '../EditableSlider';

interface CoverRepaintSettingsProps {
    taskType: string;
    audioCoverStrength: number;
    setAudioCoverStrength: (val: number) => void;
    coverNoiseStrength: number;
    setCoverNoiseStrength: (val: number) => void;
    tempoScale: number;
    setTempoScale: (val: number) => void;
    enableNormalization: boolean;
    setEnableNormalization: (val: boolean) => void;
    normalizationDb: number;
    setNormalizationDb: (val: number) => void;
    latentShift: number;
    setLatentShift: (val: number) => void;
    latentRescale: number;
    setLatentRescale: (val: number) => void;
    repaintingStart: number;
    setRepaintingStart: (val: number) => void;
    repaintingEnd: number;
    setRepaintingEnd: (val: number) => void;
}

export const CoverRepaintSettings: React.FC<CoverRepaintSettingsProps> = ({
    taskType,
    audioCoverStrength,
    setAudioCoverStrength,
    coverNoiseStrength,
    setCoverNoiseStrength,
    tempoScale,
    setTempoScale,
    enableNormalization,
    setEnableNormalization,
    normalizationDb,
    setNormalizationDb,
    latentShift,
    setLatentShift,
    latentRescale,
    setLatentRescale,
    repaintingStart,
    setRepaintingStart,
    repaintingEnd,
    setRepaintingEnd
}) => {
    const { t } = useI18n();

    const isCoverMode = taskType !== 'text2music' && taskType !== 'extract';

    return (
        <>
            {/* COVER / REPAINT CONTROLS — only for cover/repaint/a2a */}
            {isCoverMode && (
                <div className="bg-white dark:bg-suno-card rounded-xl border border-zinc-200 dark:border-white/5 p-4 space-y-4">
                    <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                        {taskType === 'repaint' ? t('repaintSettings') : t('coverSettings')}
                    </h3>

                    {/* Audio Cover Strength & Cover Noise Strength side-by-side */}
                    <div className="grid grid-cols-2 gap-3">
                        <EditableSlider
                            label={t('audioCoverStrength')}
                            value={audioCoverStrength}
                            min={0}
                            max={1}
                            step={0.05}
                            onChange={setAudioCoverStrength}
                            formatDisplay={(val) => val.toFixed(2)}
                            helpText={t('audioCoverStrengthHelp')}
                            title={t('audioCoverStrengthTooltip')}
                        />
                        <EditableSlider
                            label={t('coverNoiseStrength')}
                            value={coverNoiseStrength}
                            min={0}
                            max={1}
                            step={0.01}
                            onChange={setCoverNoiseStrength}
                            formatDisplay={(val) => val.toFixed(2)}
                            helpText={t('coverNoiseStrengthHelp')}
                            title={t('coverNoiseStrengthTooltip')}
                        />
                    </div>

                    {/* Tempo Scale */}
                    <EditableSlider
                        label={t('tempoScale')}
                        value={tempoScale}
                        min={0.5}
                        max={2.0}
                        step={0.05}
                        onChange={setTempoScale}
                        formatDisplay={(val) => `${val.toFixed(2)}x`}
                        helpText={t('tempoScaleHelp')}
                        title={t('tempoScaleTooltip')}
                    />

                    {/* Repainting Start/End - repaint mode only */}
                    {taskType === 'repaint' && (
                        <>
                            <EditableSlider
                                label={t('repaintingStart')}
                                value={repaintingStart}
                                min={0}
                                max={600}
                                step={1}
                                onChange={setRepaintingStart}
                                formatDisplay={(val) => val === 0 ? t('beginning') : `${val}s`}
                                helpText={t('repaintingStartHelp')}
                                title={t('repaintingStartTooltip')}
                            />
                            <EditableSlider
                                label={t('repaintingEnd')}
                                value={repaintingEnd}
                                min={-1}
                                max={600}
                                step={1}
                                onChange={setRepaintingEnd}
                                formatDisplay={(val) => val === -1 ? t('endOfTrack') : `${val}s`}
                                helpText={t('repaintingEndHelp')}
                                title={t('repaintingEndTooltip')}
                            />
                        </>
                    )}
                </div>
            )}

            {/* OUTPUT PROCESSING — visible for ALL task types */}
            <div className="bg-white dark:bg-suno-card rounded-xl border border-zinc-200 dark:border-white/5 p-4 space-y-4">
                <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    {t('outputProcessing')}
                </h3>

                {/* Normalization toggle */}
                <div className="flex items-center justify-between py-1">
                    <div>
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400" title={t('enableNormalizationTooltip')}>{t('enableNormalization')}</span>
                        <p className="text-[10px] text-zinc-500">{t('enableNormalizationHelp')}</p>
                    </div>
                    <button
                        onClick={() => setEnableNormalization(!enableNormalization)}
                        className={`w-10 h-5 rounded-full flex items-center transition-colors duration-200 px-0.5 border border-zinc-200 dark:border-white/5 ${enableNormalization ? 'bg-pink-600' : 'bg-zinc-300 dark:bg-black/40'}`}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white transform transition-transform duration-200 shadow-sm ${enableNormalization ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>

                {/* Normalization dB - only shown when normalization is enabled */}
                {enableNormalization && (
                    <EditableSlider
                        label={t('normalizationDb')}
                        value={normalizationDb}
                        min={-10}
                        max={0}
                        step={0.1}
                        onChange={setNormalizationDb}
                        formatDisplay={(val) => `${val.toFixed(1)} dB`}
                        helpText={t('normalizationDbHelp')}
                        title={t('normalizationDbTooltip')}
                    />
                )}

                {/* Latent Shift & Latent Rescale side-by-side */}
                <div className="grid grid-cols-2 gap-3">
                    <EditableSlider
                        label={t('latentShift')}
                        value={latentShift}
                        min={-0.2}
                        max={0.2}
                        step={0.01}
                        onChange={setLatentShift}
                        formatDisplay={(val) => val.toFixed(2)}
                        helpText={t('latentShiftHelp')}
                        title={t('latentShiftTooltip')}
                    />
                    <EditableSlider
                        label={t('latentRescale')}
                        value={latentRescale}
                        min={0.5}
                        max={1.5}
                        step={0.01}
                        onChange={setLatentRescale}
                        formatDisplay={(val) => val.toFixed(2)}
                        helpText={t('latentRescaleHelp')}
                        title={t('latentRescaleTooltip')}
                    />
                </div>
            </div>
        </>
    );
};

export default CoverRepaintSettings;
