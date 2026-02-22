import React from 'react';
import { useI18n } from '../../context/I18nContext';

interface TaskTypeSelectorProps {
    taskType: string;
    setTaskType: (val: string) => void;
    audioTab: 'reference' | 'source';
    setAudioTab: (val: 'reference' | 'source') => void;
    useReferenceAudio: boolean;
}

export const TaskTypeSelector: React.FC<TaskTypeSelectorProps> = ({
    taskType,
    setTaskType,
    audioTab,
    setAudioTab,
    useReferenceAudio
}) => {
    const { t } = useI18n();

    return (
        <div className="bg-white dark:bg-suno-card rounded-xl border border-zinc-200 dark:border-white/5 overflow-hidden">
            <div className="px-3 py-2.5 flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{t('taskType')}</span>
                <select
                    value={taskType}
                    onChange={(e) => {
                        setTaskType(e.target.value);
                        if (e.target.value === 'extract') {
                            // Extract always needs source audio
                            setAudioTab('source');
                        } else if (e.target.value === 'text2music' && audioTab === 'source') {
                            setAudioTab('reference');
                        } else if (e.target.value !== 'text2music' && !useReferenceAudio) {
                            setAudioTab('source');
                        }
                    }}
                    className="bg-zinc-100 dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-pink-500 dark:focus:border-pink-500 transition-colors cursor-pointer [&>option]:bg-white [&>option]:dark:bg-zinc-800 [&>option]:text-zinc-900 [&>option]:dark:text-white"
                >
                    <option value="text2music">{t('textToMusic')}</option>
                    <option value="cover">{t('coverTask')}</option>
                    <option value="repaint">{t('repaintTask')}</option>
                    <option value="extract">{t('extractTask')}</option>
                    <option value="audio2audio">{t('audio2audio')}</option>
                </select>
            </div>
        </div>
    );
};

export default TaskTypeSelector;
