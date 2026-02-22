import React from 'react';
import { useI18n } from '../../context/I18nContext';
import { EditableSlider } from '../EditableSlider';

interface CoverRepaintSettingsProps {
    taskType: string;
    audioCoverStrength: number;
    setAudioCoverStrength: (val: number) => void;
    repaintingStart: number;
    setRepaintingStart: (val: number) => void;
    repaintingEnd: number;
    setRepaintingEnd: (val: number) => void;
}

export const CoverRepaintSettings: React.FC<CoverRepaintSettingsProps> = ({
    taskType,
    audioCoverStrength,
    setAudioCoverStrength,
    repaintingStart,
    setRepaintingStart,
    repaintingEnd,
    setRepaintingEnd
}) => {
    const { t } = useI18n();

    if (taskType === 'text2music' || taskType === 'extract') return null;

    return (
        <div className="bg-white dark:bg-suno-card rounded-xl border border-zinc-200 dark:border-white/5 p-4 space-y-4">
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                {taskType === 'repaint' ? t('repaintSettings') : t('coverSettings')}
            </h3>

            {/* Audio Cover Strength */}
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
    );
};

export default CoverRepaintSettings;
