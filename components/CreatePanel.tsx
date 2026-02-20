import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePersistedState } from '../hooks/usePersistedState';
import { Sparkles, ChevronDown, Settings2, Trash2, Music2, Sliders, Dices, Hash, RefreshCw, Plus, Upload, Play, Pause, Loader2 } from 'lucide-react';
import { GenerationParams, Song } from '../types';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { generateApi } from '../services/api';
import { MAIN_STYLES, SUB_STYLES, ALL_STYLES } from '../data/genres';
import { EditableSlider } from './EditableSlider';

interface ReferenceTrack {
  id: string;
  filename: string;
  storage_key: string;
  duration: number | null;
  file_size_bytes: number | null;
  tags: string[] | null;
  created_at: string;
  audio_url: string;
}

interface CreatePanelProps {
  onGenerate: (params: GenerationParams) => void;
  isGenerating: boolean;
  activeJobCount?: number;
  initialData?: { song: Song, timestamp: number } | null;
  createdSongs?: Song[];
  pendingAudioSelection?: { target: 'reference' | 'source'; url: string; title?: string } | null;
  onAudioSelectionApplied?: () => void;
}

const KEY_SIGNATURES = [
  '',
  'C major', 'C minor',
  'C# major', 'C# minor',
  'Db major', 'Db minor',
  'D major', 'D minor',
  'D# major', 'D# minor',
  'Eb major', 'Eb minor',
  'E major', 'E minor',
  'F major', 'F minor',
  'F# major', 'F# minor',
  'Gb major', 'Gb minor',
  'G major', 'G minor',
  'G# major', 'G# minor',
  'Ab major', 'Ab minor',
  'A major', 'A minor',
  'A# major', 'A# minor',
  'Bb major', 'Bb minor',
  'B major', 'B minor'
];

const TIME_SIGNATURES = ['', '2/4', '3/4', '4/4', '6/8'];

const VOCAL_LANGUAGE_KEYS = [
  { value: 'unknown', key: 'autoInstrumental' as const },
  { value: 'ar', key: 'vocalArabic' as const },
  { value: 'az', key: 'vocalAzerbaijani' as const },
  { value: 'bg', key: 'vocalBulgarian' as const },
  { value: 'bn', key: 'vocalBengali' as const },
  { value: 'ca', key: 'vocalCatalan' as const },
  { value: 'cs', key: 'vocalCzech' as const },
  { value: 'da', key: 'vocalDanish' as const },
  { value: 'de', key: 'vocalGerman' as const },
  { value: 'el', key: 'vocalGreek' as const },
  { value: 'en', key: 'vocalEnglish' as const },
  { value: 'es', key: 'vocalSpanish' as const },
  { value: 'fa', key: 'vocalPersian' as const },
  { value: 'fi', key: 'vocalFinnish' as const },
  { value: 'fr', key: 'vocalFrench' as const },
  { value: 'he', key: 'vocalHebrew' as const },
  { value: 'hi', key: 'vocalHindi' as const },
  { value: 'hr', key: 'vocalCroatian' as const },
  { value: 'ht', key: 'vocalHaitianCreole' as const },
  { value: 'hu', key: 'vocalHungarian' as const },
  { value: 'id', key: 'vocalIndonesian' as const },
  { value: 'is', key: 'vocalIcelandic' as const },
  { value: 'it', key: 'vocalItalian' as const },
  { value: 'ja', key: 'vocalJapanese' as const },
  { value: 'ko', key: 'vocalKorean' as const },
  { value: 'la', key: 'vocalLatin' as const },
  { value: 'lt', key: 'vocalLithuanian' as const },
  { value: 'ms', key: 'vocalMalay' as const },
  { value: 'ne', key: 'vocalNepali' as const },
  { value: 'nl', key: 'vocalDutch' as const },
  { value: 'no', key: 'vocalNorwegian' as const },
  { value: 'pa', key: 'vocalPunjabi' as const },
  { value: 'pl', key: 'vocalPolish' as const },
  { value: 'pt', key: 'vocalPortuguese' as const },
  { value: 'ro', key: 'vocalRomanian' as const },
  { value: 'ru', key: 'vocalRussian' as const },
  { value: 'sa', key: 'vocalSanskrit' as const },
  { value: 'sk', key: 'vocalSlovak' as const },
  { value: 'sr', key: 'vocalSerbian' as const },
  { value: 'sv', key: 'vocalSwedish' as const },
  { value: 'sw', key: 'vocalSwahili' as const },
  { value: 'ta', key: 'vocalTamil' as const },
  { value: 'te', key: 'vocalTelugu' as const },
  { value: 'th', key: 'vocalThai' as const },
  { value: 'tl', key: 'vocalTagalog' as const },
  { value: 'tr', key: 'vocalTurkish' as const },
  { value: 'uk', key: 'vocalUkrainian' as const },
  { value: 'ur', key: 'vocalUrdu' as const },
  { value: 'vi', key: 'vocalVietnamese' as const },
  { value: 'yue', key: 'vocalCantonese' as const },
  { value: 'zh', key: 'vocalChineseMandarin' as const },
];

export const CreatePanel: React.FC<CreatePanelProps> = ({
  onGenerate,
  isGenerating,
  activeJobCount = 0,
  initialData,
  createdSongs = [],
  pendingAudioSelection,
  onAudioSelectionApplied,
}) => {
  const { isAuthenticated, token, user } = useAuth();
  const { t } = useI18n();

  // Randomly select 6 music tags from MAIN_STYLES
  const [musicTags, setMusicTags] = useState<string[]>(() => {
    const shuffled = [...MAIN_STYLES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6);
  });

  // Function to refresh music tags
  const refreshMusicTags = useCallback(() => {
    const shuffled = [...MAIN_STYLES].sort(() => Math.random() - 0.5);
    setMusicTags(shuffled.slice(0, 6));
  }, []);

  // Mode
  const [customMode, setCustomMode] = usePersistedState('ace-customMode', true);

  // Simple Mode
  const [songDescription, setSongDescription] = usePersistedState('ace-songDescription', '');

  // Custom Mode
  const [lyrics, setLyrics] = usePersistedState('ace-lyrics', '');
  const [style, setStyle] = usePersistedState('ace-style', '');
  const [title, setTitle] = usePersistedState('ace-title', '');

  // Common
  const [instrumental, setInstrumental] = usePersistedState('ace-instrumental', false);
  const [vocalLanguage, setVocalLanguage] = usePersistedState('ace-vocalLanguage', 'en');
  const [vocalGender, setVocalGender] = usePersistedState<'male' | 'female' | ''>('ace-vocalGender', '');

  // Music Parameters
  const [bpm, setBpm] = usePersistedState('ace-bpm', 0);
  const [keyScale, setKeyScale] = usePersistedState('ace-keyScale', '');
  const [timeSignature, setTimeSignature] = usePersistedState('ace-timeSignature', '');

  // Advanced Settings
  const [showAdvanced, setShowAdvanced] = usePersistedState('ace-showAdvanced', false);
  const [duration, setDuration] = usePersistedState('ace-duration', -1);
  const [batchSize, setBatchSize] = usePersistedState('ace-batchSize', 1);
  const [bulkCount, setBulkCount] = usePersistedState('ace-bulkCount', 1);
  const [guidanceScale, setGuidanceScale] = usePersistedState('ace-guidanceScale', 9.0);
  const [randomSeed, setRandomSeed] = usePersistedState('ace-randomSeed', true);
  const [seed, setSeed] = usePersistedState('ace-seed', -1);
  const [thinking, setThinking] = usePersistedState('ace-thinking', false); // Default false for GPU compatibility
  const [audioFormat, setAudioFormat] = usePersistedState<'mp3' | 'flac'>('ace-audioFormat', 'mp3');
  const [inferenceSteps, setInferenceSteps] = usePersistedState('ace-inferenceSteps', 12);
  const [inferMethod, setInferMethod] = usePersistedState<'ode' | 'sde'>('ace-inferMethod', 'ode');
  const [lmBackend, setLmBackend] = usePersistedState<'pt' | 'vllm'>('ace-lmBackend', 'pt');
  const [lmModel, setLmModel] = usePersistedState('ace-lmModel', 'acestep-5Hz-lm-0.6B');
  const [shift, setShift] = usePersistedState('ace-shift', 3.0);

  // LM Parameters (under Expert)
  const [showLmParams, setShowLmParams] = usePersistedState('ace-showLmParams', false);
  const [lmTemperature, setLmTemperature] = usePersistedState('ace-lmTemperature', 0.8);
  const [lmCfgScale, setLmCfgScale] = usePersistedState('ace-lmCfgScale', 2.2);
  const [lmTopK, setLmTopK] = usePersistedState('ace-lmTopK', 0);
  const [lmTopP, setLmTopP] = usePersistedState('ace-lmTopP', 0.92);
  const [lmNegativePrompt, setLmNegativePrompt] = usePersistedState('ace-lmNegativePrompt', 'NO USER INPUT');

  // Expert Parameters — session-specific audio state (NOT persisted)
  const [referenceAudioUrl, setReferenceAudioUrl] = useState('');
  const [sourceAudioUrl, setSourceAudioUrl] = useState('');
  const [referenceAudioTitle, setReferenceAudioTitle] = useState('');
  const [sourceAudioTitle, setSourceAudioTitle] = useState('');
  const [audioCodes, setAudioCodes] = useState('');
  const [repaintingStart, setRepaintingStart] = useState(0);
  const [repaintingEnd, setRepaintingEnd] = useState(-1);
  const [instruction, setInstruction] = useState(t('instructionDefault'));
  const [audioCoverStrength, setAudioCoverStrength] = usePersistedState('ace-audioCoverStrength', 1.0);
  const [taskType, setTaskType] = useState('text2music');
  const [useAdg, setUseAdg] = usePersistedState('ace-useAdg', false);
  const [cfgIntervalStart, setCfgIntervalStart] = usePersistedState('ace-cfgIntervalStart', 0.0);
  const [cfgIntervalEnd, setCfgIntervalEnd] = usePersistedState('ace-cfgIntervalEnd', 1.0);
  const [customTimesteps, setCustomTimesteps] = useState('');
  const [useCotMetas, setUseCotMetas] = usePersistedState('ace-useCotMetas', true);
  const [useCotCaption, setUseCotCaption] = usePersistedState('ace-useCotCaption', true);
  const [useCotLanguage, setUseCotLanguage] = usePersistedState('ace-useCotLanguage', true);
  const [autogen, setAutogen] = useState(false);
  const [constrainedDecodingDebug, setConstrainedDecodingDebug] = useState(false);
  const [allowLmBatch, setAllowLmBatch] = usePersistedState('ace-allowLmBatch', true);
  const [getScores, setGetScores] = useState(false);
  const [getLrc, setGetLrc] = useState(false);
  const [scoreScale, setScoreScale] = usePersistedState('ace-scoreScale', 0.5);
  const [lmBatchChunkSize, setLmBatchChunkSize] = usePersistedState('ace-lmBatchChunkSize', 8);
  const [trackName, setTrackName] = useState('');
  const [completeTrackClasses, setCompleteTrackClasses] = useState('');
  const [isFormatCaption, setIsFormatCaption] = usePersistedState('ace-isFormatCaption', false);
  const [maxDurationWithLm, setMaxDurationWithLm] = usePersistedState('ace-maxDurationWithLm', 240);
  const [maxDurationWithoutLm, setMaxDurationWithoutLm] = usePersistedState('ace-maxDurationWithoutLm', 240);

  // LoRA Parameters
  const [showLoraPanel, setShowLoraPanel] = usePersistedState('ace-showLoraPanel', false);
  const [loraPath, setLoraPath] = usePersistedState('ace-loraPath', './lokr_output/final/lokr_weights.safetensors');
  const [loraLoaded, setLoraLoaded] = useState(false);
  const [loraScale, setLoraScale] = usePersistedState('ace-loraScale', 1.0);
  const [loraError, setLoraError] = useState<string | null>(null);
  const [isLoraLoading, setIsLoraLoading] = useState(false);

  // Advanced adapter state
  const [advancedAdapters, setAdvancedAdapters] = usePersistedState('ace-advancedAdapters', false);
  const [adapterFolder, setAdapterFolder] = usePersistedState('ace-adapterFolder', './lokr_output');
  const [adapterFiles, setAdapterFiles] = useState<Array<{ name: string; path: string; size: number; type: string }>>([]);
  const [adapterSlots, setAdapterSlots] = useState<Array<{
    slot: number; name: string; path: string; type: string; scale: number;
    delta_keys: number; group_scales: { self_attn: number; cross_attn: number; mlp: number };
  }>>([]);
  const [expandedSlot, setExpandedSlot] = useState<number | null>(null);
  // Per-adapter persisted group scales (keyed by adapter filename)
  const [savedGroupScales, setSavedGroupScales] = usePersistedState<Record<string, { self_attn: number; cross_attn: number; mlp: number }>>('ace-adapterGroupScales', {});

  // Model selection
  const [selectedModel, setSelectedModel] = usePersistedState('ace-model', 'acestep-v15-turbo-shift3');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const previousModelRef = useRef<string>(selectedModel);
  const isMountedRef = useRef(true);
  const modelsRetryTimeoutRef = useRef<number | null>(null);

  // Available models fetched from backend
  const [fetchedModels, setFetchedModels] = useState<{ name: string; is_active: boolean; is_preloaded: boolean }[]>([]);
  const [activeBackendModel, setActiveBackendModel] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);

  // Fallback model list when backend is unavailable
  const availableModels = useMemo(() => {
    if (fetchedModels.length > 0) {
      return fetchedModels.map(m => ({ id: m.name, name: m.name }));
    }
    // Fallback — only default ACE-Step models.
    // Replaced by dynamic list from /v1/models once Python API starts.
    return [
      { id: 'acestep-v15-base', name: 'acestep-v15-base' },
      { id: 'acestep-v15-sft', name: 'acestep-v15-sft' },
      { id: 'acestep-v15-turbo', name: 'acestep-v15-turbo' },
      { id: 'acestep-v15-turbo-shift1', name: 'acestep-v15-turbo-shift1' },
      { id: 'acestep-v15-turbo-shift3', name: 'acestep-v15-turbo-shift3' },
      { id: 'acestep-v15-turbo-continuous', name: 'acestep-v15-turbo-continuous' },
    ];
  }, [fetchedModels]);

  // Map model ID to short display name
  const getModelDisplayName = (modelId: string): string => {
    const mapping: Record<string, string> = {
      'acestep-v15-base': '1.5B',
      'acestep-v15-sft': '1.5S',
      'acestep-v15-turbo-shift1': '1.5TS1',
      'acestep-v15-turbo-shift3': '1.5TS3',
      'acestep-v15-turbo-continuous': '1.5TC',
      'acestep-v15-turbo': '1.5T',
      'acestep-v15-merge-sft-turbo-0.5': 'ST.5',
      'acestep-v15-merge-sft-turbo-0.4': 'ST.4',
      'acestep-v15-merge-sft-turbo-0.3': 'ST.3',
      'acestep-v15-merge-base-turbo-0.5': 'BT.5',
      'acestep-v15-merge-base-sft-0.5': 'BS.5',
    };
    return mapping[modelId] || modelId;
  };

  // Check if model is a turbo variant
  const isTurboModel = (modelId: string): boolean => {
    return modelId.includes('turbo');
  };

  // Genre selection state (cascading)
  // Two-level genre cascade states
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showSubGenreDropdown, setShowSubGenreDropdown] = useState(false);
  const [genreSearch, setGenreSearch] = useState<string>('');
  const [selectedMainGenre, setSelectedMainGenre] = useState<string>('');
  const [selectedSubGenre, setSelectedSubGenre] = useState<string>('');
  const genreDropdownRef = useRef<HTMLDivElement>(null);
  const subGenreDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (genreDropdownRef.current && !genreDropdownRef.current.contains(event.target as Node)) {
        setShowGenreDropdown(false);
      }
      if (subGenreDropdownRef.current && !subGenreDropdownRef.current.contains(event.target as Node)) {
        setShowSubGenreDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get sub-genres for a main genre (styles that contain the main genre name)
  const getSubGenres = (mainGenre: string) => {
    return ALL_STYLES.filter(style =>
      style.toLowerCase().includes(mainGenre.toLowerCase()) &&
      style.toLowerCase() !== mainGenre.toLowerCase()
    );
  };

  // Get sub-genres count for each main genre
  const getSubGenreCount = (mainGenre: string) => {
    return getSubGenres(mainGenre).length;
  };

  // Other genres: ALL_STYLES 中既不是 MAIN_STYLES，也不是任何 MAIN_STYLE 的 sub-genre
  const OTHER_GENRES = useMemo(() => {
    const mainStylesLower = new Set(MAIN_STYLES.map(s => s.toLowerCase()));

    // 检查一个风格是否是某个 main genre 的 sub-genre
    const isSubGenreOfAnyMain = (style: string): boolean => {
      const styleLower = style.toLowerCase();
      return MAIN_STYLES.some(mainGenre => {
        const mainLower = mainGenre.toLowerCase();
        // 风格包含主流派关键词，且不是主流派本身
        return styleLower !== mainLower && styleLower.includes(mainLower);
      });
    };

    return ALL_STYLES.filter(style => {
      const styleLower = style.toLowerCase();
      // 不是 main style 本身
      if (mainStylesLower.has(styleLower)) return false;
      // 不是任何 main genre 的 sub-genre
      if (isSubGenreOfAnyMain(style)) return false;
      return true;
    });
  }, []);

  // Filter sub-genres based on selected main genre
  const filteredSubGenres = useMemo(() => {
    if (!selectedMainGenre) return [];
    return getSubGenres(selectedMainGenre);
  }, [selectedMainGenre]);

  // Combined and sorted genres for first level dropdown
  const combinedGenres = useMemo(() => {
    const mainSet = new Set(MAIN_STYLES.map(s => s.toLowerCase()));
    // Combine both lists with type indicator
    const combined = [
      ...MAIN_STYLES.map(g => ({ name: g, type: 'main' as const })),
      ...OTHER_GENRES.map(g => ({ name: g, type: 'other' as const }))
    ];
    // Sort alphabetically by name
    return combined.sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // Filter combined genres based on search query
  const filteredCombinedGenres = useMemo(() => {
    if (!genreSearch) return combinedGenres;
    return combinedGenres.filter(g => g.name.toLowerCase().includes(genreSearch.toLowerCase()));
  }, [genreSearch, combinedGenres]);

  const [isUploadingReference, setIsUploadingReference] = useState(false);
  const [isUploadingSource, setIsUploadingSource] = useState(false);
  const [isTranscribingReference, setIsTranscribingReference] = useState(false);
  const transcribeAbortRef = useRef<AbortController | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isFormattingStyle, setIsFormattingStyle] = useState(false);
  const [isFormattingLyrics, setIsFormattingLyrics] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [dragKind, setDragKind] = useState<'file' | 'audio' | null>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [audioModalTarget, setAudioModalTarget] = useState<'reference' | 'source'>('reference');
  const [tempAudioUrl, setTempAudioUrl] = useState('');
  const [audioTab, setAudioTab] = useState<'reference' | 'source'>('reference');
  const referenceAudioRef = useRef<HTMLAudioElement>(null);
  const sourceAudioRef = useRef<HTMLAudioElement>(null);
  const [referencePlaying, setReferencePlaying] = useState(false);
  const [sourcePlaying, setSourcePlaying] = useState(false);
  const [referenceTime, setReferenceTime] = useState(0);
  const [sourceTime, setSourceTime] = useState(0);
  const [referenceDuration, setReferenceDuration] = useState(0);
  const [sourceDuration, setSourceDuration] = useState(0);

  // Reference tracks modal state
  const [referenceTracks, setReferenceTracks] = useState<ReferenceTrack[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [playingTrackSource, setPlayingTrackSource] = useState<'uploads' | 'created' | null>(null);
  const modalAudioRef = useRef<HTMLAudioElement>(null);
  const [modalTrackTime, setModalTrackTime] = useState(0);
  const [modalTrackDuration, setModalTrackDuration] = useState(0);
  const [libraryTab, setLibraryTab] = useState<'uploads' | 'created'>('uploads');

  const createdTrackOptions = useMemo(() => {
    return createdSongs
      .filter(song => !song.isGenerating)
      .filter(song => (user ? song.userId === user.id : true))
      .filter(song => Boolean(song.audioUrl))
      .map(song => ({
        id: song.id,
        title: song.title || t('untitled'),
        audio_url: song.audioUrl!,
        duration: song.duration,
      }));
  }, [createdSongs, user]);

  const getAudioLabel = (url: string) => {
    try {
      const parsed = new URL(url);
      const name = decodeURIComponent(parsed.pathname.split('/').pop() || parsed.hostname);
      return name.replace(/\.[^/.]+$/, '') || name;
    } catch {
      const parts = url.split('/');
      const name = decodeURIComponent(parts[parts.length - 1] || url);
      return name.replace(/\.[^/.]+$/, '') || name;
    }
  };

  // Resize Logic
  const [lyricsHeight, setLyricsHeight] = useState(() => {
    const saved = localStorage.getItem('acestep_lyrics_height');
    return saved ? parseInt(saved, 10) : 144; // Default h-36 is 144px (9rem * 16)
  });
  const [isResizing, setIsResizing] = useState(false);
  const lyricsRef = useRef<HTMLDivElement>(null);


  // Close model menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
        setShowModelMenu(false);
      }
    };

    if (showModelMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showModelMenu]);

  // Auto-unload LoRA when model changes
  useEffect(() => {
    if (previousModelRef.current !== selectedModel && loraLoaded) {
      void handleLoraUnload();
    }
    previousModelRef.current = selectedModel;
  }, [selectedModel, loraLoaded]);

  // Auto-disable thinking and ADG when LoRA is loaded
  useEffect(() => {
    if (loraLoaded) {
      if (thinking) setThinking(false);
      if (useAdg) setUseAdg(false);
    }
  }, [loraLoaded]);

  // LoRA API handlers
  const handleLoraToggle = async () => {
    if (!token) {
      setLoraError(t('pleaseSignInToUseLoRA'));
      return;
    }
    if (!loraPath.trim()) {
      setLoraError(t('pleaseEnterLoRAPath'));
      return;
    }

    setIsLoraLoading(true);
    setLoraError(null);

    try {
      if (loraLoaded) {
        await handleLoraUnload();
      } else {
        const result = await generateApi.loadLora({ lora_path: loraPath }, token);
        setLoraLoaded(true);
        console.log('LoRA loaded:', result?.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'LoRA operation failed';
      setLoraError(message);
      console.error('LoRA error:', err);
    } finally {
      setIsLoraLoading(false);
    }
  };

  const handleLoraUnload = async () => {
    if (!token) return;

    setIsLoraLoading(true);
    setLoraError(null);

    try {
      const result = await generateApi.unloadLora(token);
      setLoraLoaded(false);
      console.log('LoRA unloaded:', result?.message);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unload LoRA';
      setLoraError(message);
      console.error('Unload error:', err);
    } finally {
      setIsLoraLoading(false);
    }
  };

  const handleLoraScaleChange = async (newScale: number) => {
    setLoraScale(newScale);

    if (!token || !loraLoaded) return;

    try {
      await generateApi.setLoraScale({ scale: newScale }, token);
    } catch (err) {
      console.error('Failed to set LoRA scale:', err);
    }
  };

  // Advanced adapter handlers
  const handleScanFolder = async () => {
    if (!token || !adapterFolder.trim()) return;
    setLoraError(null);
    try {
      const result = await generateApi.listLoraFiles(adapterFolder, token);
      setAdapterFiles(result.files || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to scan folder';
      setLoraError(msg);
    }
  };

  const handleLoadSlot = async (filePath: string) => {
    if (!token) return;
    setIsLoraLoading(true);
    setLoraError(null);
    try {
      const nextSlot = adapterSlots.length > 0
        ? Math.max(...adapterSlots.map(s => s.slot)) + 1
        : 0;
      await generateApi.loadLora({ lora_path: filePath, slot: nextSlot }, token);
      // Refresh status to get actual slot info
      const status = await generateApi.getLoraStatus(token);
      if (status?.advanced?.slots) {
        setAdapterSlots(status.advanced.slots);
        setLoraLoaded(true);
      }
    } catch (err) {
      setLoraError(err instanceof Error ? err.message : 'Failed to load adapter');
    } finally {
      setIsLoraLoading(false);
    }
  };

  const handleUnloadSlot = async (slot: number) => {
    if (!token) return;
    setIsLoraLoading(true);
    setLoraError(null);
    try {
      await generateApi.unloadLora(token, slot);
      const status = await generateApi.getLoraStatus(token);
      if (status?.advanced) {
        setAdapterSlots(status.advanced.slots || []);
        setLoraLoaded(status.advanced.loaded);
      } else {
        setAdapterSlots([]);
        setLoraLoaded(false);
      }
    } catch (err) {
      setLoraError(err instanceof Error ? err.message : 'Failed to unload');
    } finally {
      setIsLoraLoading(false);
    }
  };

  const handleSlotScaleChange = async (slot: number, scale: number) => {
    if (!token) return;
    setAdapterSlots(prev => prev.map(s => s.slot === slot ? { ...s, scale } : s));
    try {
      await generateApi.setLoraScale({ scale, slot }, token);
    } catch (err) {
      console.error('Failed to set slot scale:', err);
    }
  };

  const handleSlotGroupScaleChange = async (slot: number, group: 'self_attn' | 'cross_attn' | 'mlp', value: number) => {
    if (!token) return;
    const slotData = adapterSlots.find(s => s.slot === slot);
    if (!slotData) return;
    const newScales = { ...slotData.group_scales, [group]: value };
    setAdapterSlots(prev => prev.map(s => s.slot === slot ? { ...s, group_scales: newScales } : s));
    // Save per-adapter
    const key = slotData.name;
    setSavedGroupScales(prev => ({ ...prev, [key]: newScales }));
    try {
      await generateApi.setSlotGroupScales({ slot, ...newScales }, token);
    } catch (err) {
      console.error('Failed to set slot group scales:', err);
    }
  };

  // Reuse Effect - must be after all state declarations
  useEffect(() => {
    if (initialData) {
      setCustomMode(true);
      setStyle(initialData.song.style);
      setTitle(initialData.song.title);

      // Check if song is instrumental (empty lyrics, [Instrumental], or Instrumental)
      const trimmedLyrics = initialData.song.lyrics?.trim() || '';
      const isInstrumentalSong = trimmedLyrics.length === 0 ||
        trimmedLyrics === '[Instrumental]' ||
        trimmedLyrics === 'Instrumental';

      setInstrumental(isInstrumentalSong);
      // Only set lyrics if not instrumental
      setLyrics(isInstrumentalSong ? '' : initialData.song.lyrics);

      // Restore full generation parameters if available
      const gp = initialData.song.generationParams;
      if (gp) {
        if (gp.bpm != null) setBpm(gp.bpm);
        if (gp.keyScale != null) setKeyScale(gp.keyScale);
        if (gp.timeSignature != null) setTimeSignature(gp.timeSignature);
        if (gp.duration != null) setDuration(gp.duration);
        if (gp.inferenceSteps != null) setInferenceSteps(gp.inferenceSteps);
        if (gp.guidanceScale != null) setGuidanceScale(gp.guidanceScale);
        if (gp.seed != null && gp.seed >= 0) {
          setSeed(gp.seed);
          setRandomSeed(false);
        }
        if (gp.inferMethod) setInferMethod(gp.inferMethod);
        if (gp.shift != null) setShift(gp.shift);
        if (gp.audioFormat) setAudioFormat(gp.audioFormat);
        if (gp.thinking != null) setThinking(gp.thinking);
        if (gp.ditModel) setSelectedModel(gp.ditModel);
        if (gp.vocalLanguage) setVocalLanguage(gp.vocalLanguage);
        if (gp.referenceAudioUrl) {
          setReferenceAudioUrl(gp.referenceAudioUrl);
          if (gp.referenceAudioTitle) setReferenceAudioTitle(gp.referenceAudioTitle);
        }
        if (gp.sourceAudioUrl) {
          setSourceAudioUrl(gp.sourceAudioUrl);
          if (gp.sourceAudioTitle) setSourceAudioTitle(gp.sourceAudioTitle);
        }
        if (gp.taskType) setTaskType(gp.taskType);
        if (gp.lmBackend) setLmBackend(gp.lmBackend);
        if (gp.lmModel) setLmModel(gp.lmModel);
      } else if (initialData.song.ditModel) {
        setSelectedModel(initialData.song.ditModel);
      }
    }
  }, [initialData]);

  useEffect(() => {
    if (!pendingAudioSelection) return;
    applyAudioTargetUrl(
      pendingAudioSelection.target,
      pendingAudioSelection.url,
      pendingAudioSelection.title
    );
    onAudioSelectionApplied?.();
  }, [pendingAudioSelection, onAudioSelectionApplied]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      // Calculate new height based on mouse position relative to the lyrics container top
      // We can't easily get the container top here without a ref to it,
      // but we can use dy (delta y) from the previous position if we tracked it,
      // OR simpler: just update based on movement if we track the start.
      //
      // Better approach for absolute sizing:
      // 1. Get the bounding rect of the textarea wrapper on mount/resize start?
      //    We can just rely on the fact that we are dragging the bottom.
      //    So new height = currentMouseY - topOfElement.

      if (lyricsRef.current) {
        const rect = lyricsRef.current.getBoundingClientRect();
        const newHeight = e.clientY - rect.top;
        // detailed limits: min 96px (h-24), max 600px
        if (newHeight > 96 && newHeight < 600) {
          setLyricsHeight(newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
      // Save height to localStorage
      localStorage.setItem('acestep_lyrics_height', String(lyricsHeight));
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none'; // Prevent text selection while dragging
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isResizing]);

  const refreshModels = useCallback(async (isInitial = false): Promise<boolean> => {
    try {
      const res = await fetch('/api/generate/models');
      if (!res.ok) return false;
      const data = await res.json();
      const models = data.models || [];
      if (models.length > 0) {
        if (!isMountedRef.current) return false;
        setFetchedModels(models);
        if (data.active_model) {
          setActiveBackendModel(data.active_model);
        }
        // Only sync to backend's active model on initial load
        // After that, respect user's selection
        if (isInitial) {
          const active = models.find((m: any) => m.is_active);
          if (active) {
            setSelectedModel(active.name);
          }
        }
        return true;
      }
    } catch {
      // ignore - will use fallback model list
    }
    return false;
  }, []);

  const refreshLoraStatus = useCallback(async () => {
    if (!token) return;
    try {
      const status = await generateApi.getLoraStatus(token);
      if (!isMountedRef.current) return;
      setLoraLoaded(Boolean(status?.lora_loaded));
      if (typeof status?.lora_scale === 'number' && Number.isFinite(status.lora_scale)) {
        setLoraScale(status.lora_scale);
      }
      // Sync advanced adapter slots
      if (status?.advanced?.slots && status.advanced.slots.length > 0) {
        setAdapterSlots(status.advanced.slots);
      }
    } catch {
      // ignore - backend may be starting
    }
  }, [token]);

  const handleSwitchModel = useCallback(async (targetModel: string) => {
    if (!token || isSwitching) return;
    setIsSwitching(true);
    try {
      const result = await generateApi.switchModel(targetModel, token);
      if (result.switched) {
        setActiveBackendModel(result.active_model);
        void refreshModels(false);
      }
    } catch (err: any) {
      console.error('Model switch failed:', err.message);
    } finally {
      setIsSwitching(false);
    }
  }, [token, isSwitching, refreshModels]);

  useEffect(() => {
    isMountedRef.current = true;
    let cancelled = false;
    const loadModelsAndLimits = async () => {
      // Backend can start slowly; retry silently until models are available.
      const attemptRefresh = async (attempt: number) => {
        if (cancelled) return;
        // Pass true for isInitial only on first attempt
        const ok = await refreshModels(attempt === 0);
        if (!ok) {
          const delayMs = Math.min(15000, 800 * Math.pow(1.6, attempt));
          modelsRetryTimeoutRef.current = window.setTimeout(() => { void attemptRefresh(attempt + 1); }, delayMs);
        }
      };
      void attemptRefresh(0);

      void refreshLoraStatus();

      // Fetch limits
      try {
        const response = await fetch('/api/generate/limits');
        if (!response.ok) return;
        const data = await response.json();
        if (typeof data.max_duration_with_lm === 'number') {
          setMaxDurationWithLm(data.max_duration_with_lm);
        }
        if (typeof data.max_duration_without_lm === 'number') {
          setMaxDurationWithoutLm(data.max_duration_without_lm);
        }
      } catch {
        // ignore limits fetch failures
      }
    };

    loadModelsAndLimits();
    return () => {
      // best-effort cancel retry loop
      cancelled = true;
      isMountedRef.current = false;
      if (modelsRetryTimeoutRef.current != null) {
        window.clearTimeout(modelsRetryTimeoutRef.current);
        modelsRetryTimeoutRef.current = null;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    };
  }, []);

  useEffect(() => {
    void refreshLoraStatus();
  }, [refreshLoraStatus]);

  // Re-fetch models after generation completes to update active model status
  // Don't change selection, just refresh the is_active status
  const prevIsGeneratingRef = useRef(isGenerating);
  useEffect(() => {
    if (prevIsGeneratingRef.current && !isGenerating) {
      void refreshModels(false);
    }
    prevIsGeneratingRef.current = isGenerating;
  }, [isGenerating, refreshModels]);

  const activeMaxDuration = thinking ? maxDurationWithLm : maxDurationWithoutLm;

  useEffect(() => {
    if (duration > activeMaxDuration) {
      setDuration(activeMaxDuration);
    }
  }, [duration, activeMaxDuration]);

  useEffect(() => {
    const getDragKind = (e: DragEvent): 'file' | 'audio' | null => {
      if (!e.dataTransfer) return null;
      const types = Array.from(e.dataTransfer.types);
      if (types.includes('Files')) return 'file';
      if (types.includes('application/x-ace-audio')) return 'audio';
      return null;
    };

    const handleDragEnter = (e: DragEvent) => {
      const kind = getDragKind(e);
      if (!kind) return;
      dragDepthRef.current += 1;
      setIsDraggingFile(true);
      setDragKind(kind);
      e.preventDefault();
    };

    const handleDragOver = (e: DragEvent) => {
      const kind = getDragKind(e);
      if (!kind) return;
      setDragKind(kind);
      e.preventDefault();
    };

    const handleDragLeave = (e: DragEvent) => {
      const kind = getDragKind(e);
      if (!kind) return;
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) {
        setIsDraggingFile(false);
        setDragKind(null);
      }
    };

    const handleDrop = (e: DragEvent) => {
      const kind = getDragKind(e);
      if (!kind) return;
      e.preventDefault();
      dragDepthRef.current = 0;
      setIsDraggingFile(false);
      setDragKind(null);
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const uploadAudio = async (file: File, target: 'reference' | 'source') => {
    if (!token) {
      setUploadError(t('pleaseSignInToUploadAudio'));
      return;
    }
    setUploadError(null);
    const setUploading = target === 'reference' ? setIsUploadingReference : setIsUploadingSource;
    const setUrl = target === 'reference' ? setReferenceAudioUrl : setSourceAudioUrl;
    setUploading(true);
    try {
      const result = await generateApi.uploadAudio(file, token);
      setUrl(result.url);
      setShowAudioModal(false);
      setTempAudioUrl('');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('uploadFailed');
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, target: 'reference' | 'source') => {
    const file = e.target.files?.[0];
    if (file) {
      void uploadReferenceTrack(file, target);
    }
    e.target.value = '';
  };

  // Format handler - uses LLM to enhance style/lyrics and auto-fill parameters
  const handleFormat = async (target: 'style' | 'lyrics') => {
    if (!token || !style.trim()) return;
    if (target === 'style') {
      setIsFormattingStyle(true);
    } else {
      setIsFormattingLyrics(true);
    }
    try {
      const result = await generateApi.formatInput({
        caption: style,
        lyrics: lyrics,
        bpm: bpm > 0 ? bpm : undefined,
        duration: duration > 0 ? duration : undefined,
        keyScale: keyScale || undefined,
        timeSignature: timeSignature || undefined,
        temperature: lmTemperature,
        topK: lmTopK > 0 ? lmTopK : undefined,
        topP: lmTopP,
        lmModel: lmModel || 'acestep-5Hz-lm-0.6B',
        lmBackend: lmBackend || 'pt',
      }, token);

      if (result.caption || result.lyrics || result.bpm || result.duration) {
        // Update fields with LLM-generated values
        if (target === 'style' && result.caption) setStyle(result.caption);
        if (target === 'lyrics' && result.lyrics) setLyrics(result.lyrics);
        if (result.bpm && result.bpm > 0) setBpm(result.bpm);
        if (result.duration && result.duration > 0) setDuration(result.duration);
        if (result.key_scale) setKeyScale(result.key_scale);
        if (result.time_signature) {
          const ts = String(result.time_signature);
          setTimeSignature(ts.includes('/') ? ts : `${ts}/4`);
        }
        if (result.vocal_language) setVocalLanguage(result.vocal_language);
        if (target === 'style') setIsFormatCaption(true);
      } else {
        console.error(t('formatFailed') + ':', result.error || result.status_message);
        alert(result.error || result.status_message || t('formatFailedLLMNotInitialized'));
      }
    } catch (err) {
      console.error('Format error:', err);
      alert(t('formatFailedLLMNotAvailable'));
    } finally {
      if (target === 'style') {
        setIsFormattingStyle(false);
      } else {
        setIsFormattingLyrics(false);
      }
    }
  };

  const openAudioModal = (target: 'reference' | 'source', tab: 'uploads' | 'created' = 'uploads') => {
    setAudioModalTarget(target);
    setTempAudioUrl('');
    setLibraryTab(tab);
    setShowAudioModal(true);
    void fetchReferenceTracks();
  };

  const fetchReferenceTracks = useCallback(async () => {
    if (!token) return;
    setIsLoadingTracks(true);
    try {
      const response = await fetch('/api/reference-tracks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setReferenceTracks(data.tracks || []);
      }
    } catch (err) {
      console.error(t('failedToFetchReferenceTracks'), err);
    } finally {
      setIsLoadingTracks(false);
    }
  }, [token]);

  const uploadReferenceTrack = async (file: File, target?: 'reference' | 'source') => {
    if (!token) {
      setUploadError(t('pleaseSignInToUploadAudio'));
      return;
    }
    setUploadError(null);
    setIsUploadingReference(true);
    try {
      const formData = new FormData();
      formData.append('audio', file);

      const response = await fetch('/api/reference-tracks', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || t('uploadFailed'));
      }

      const data = await response.json();
      setReferenceTracks(prev => [data.track, ...prev]);

      // Also set as current reference/source
      const selectedTarget = target ?? audioModalTarget;
      applyAudioTargetUrl(selectedTarget, data.track.audio_url, data.track.filename);
      if (data.whisper_available && data.track?.id) {
        void transcribeReferenceTrack(data.track.id).then(() => undefined);
      } else {
        setShowAudioModal(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('uploadFailed');
      setUploadError(message);
    } finally {
      setIsUploadingReference(false);
    }
  };

  const transcribeReferenceTrack = async (trackId: string) => {
    if (!token) return;
    setIsTranscribingReference(true);
    const controller = new AbortController();
    transcribeAbortRef.current = controller;
    try {
      const response = await fetch(`/api/reference-tracks/${trackId}/transcribe`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(t('failedToTranscribe'));
      }
      const data = await response.json();
      if (data.lyrics) {
        setLyrics(prev => prev || data.lyrics);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error(t('transcriptionFailed'), err);
    } finally {
      if (transcribeAbortRef.current === controller) {
        transcribeAbortRef.current = null;
      }
      setIsTranscribingReference(false);
    }
  };

  const cancelTranscription = () => {
    if (transcribeAbortRef.current) {
      transcribeAbortRef.current.abort();
      transcribeAbortRef.current = null;
    }
    setIsTranscribingReference(false);
  };

  const deleteReferenceTrack = async (trackId: string) => {
    if (!token) return;
    try {
      const response = await fetch(`/api/reference-tracks/${trackId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setReferenceTracks(prev => prev.filter(t => t.id !== trackId));
        if (playingTrackId === trackId && playingTrackSource === 'uploads') {
          setPlayingTrackId(null);
          setPlayingTrackSource(null);
          if (modalAudioRef.current) {
            modalAudioRef.current.pause();
          }
        }
      }
    } catch (err) {
      console.error(t('failedToDeleteTrack'), err);
    }
  };

  const useReferenceTrack = (track: { audio_url: string; title?: string }) => {
    applyAudioTargetUrl(audioModalTarget, track.audio_url, track.title);
    setShowAudioModal(false);
    setPlayingTrackId(null);
    setPlayingTrackSource(null);
  };

  const toggleModalTrack = (track: { id: string; audio_url: string; source: 'uploads' | 'created' }) => {
    if (playingTrackId === track.id) {
      if (modalAudioRef.current) {
        modalAudioRef.current.pause();
      }
      setPlayingTrackId(null);
      setPlayingTrackSource(null);
    } else {
      setPlayingTrackId(track.id);
      setPlayingTrackSource(track.source);
      if (modalAudioRef.current) {
        modalAudioRef.current.src = track.audio_url;
        modalAudioRef.current.play().catch(() => undefined);
      }
    }
  };

  const applyAudioUrl = () => {
    if (!tempAudioUrl.trim()) return;
    applyAudioTargetUrl(audioModalTarget, tempAudioUrl.trim());
    setShowAudioModal(false);
    setTempAudioUrl('');
  };

  const applyAudioTargetUrl = (target: 'reference' | 'source', url: string, title?: string) => {
    const derivedTitle = title ? title.replace(/\.[^/.]+$/, '') : getAudioLabel(url);
    if (target === 'reference') {
      setReferenceAudioUrl(url);
      setReferenceAudioTitle(derivedTitle);
      setReferenceTime(0);
      setReferenceDuration(0);
    } else {
      setSourceAudioUrl(url);
      setSourceAudioTitle(derivedTitle);
      setSourceTime(0);
      setSourceDuration(0);
      if (taskType === 'text2music') {
        setTaskType('cover');
      }
    }
  };

  const formatTime = (time: number) => {
    if (!Number.isFinite(time) || time <= 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  const toggleAudio = (target: 'reference' | 'source') => {
    const audio = target === 'reference' ? referenceAudioRef.current : sourceAudioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => undefined);
    } else {
      audio.pause();
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, target: 'reference' | 'source') => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void uploadReferenceTrack(file, target);
      return;
    }
    const payload = e.dataTransfer.getData('application/x-ace-audio');
    if (payload) {
      try {
        const data = JSON.parse(payload);
        if (data?.url) {
          applyAudioTargetUrl(target, data.url, data.title);
        }
      } catch {
        // ignore
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleWorkspaceDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.files?.length || e.dataTransfer.types.includes('application/x-ace-audio')) {
      handleDrop(e, audioTab);
    }
  };

  const handleWorkspaceDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('application/x-ace-audio')) {
      e.preventDefault();
    }
  };

  const handleGenerate = () => {
    const styleWithGender = (() => {
      if (!vocalGender) return style;
      const genderHint = vocalGender === 'male' ? t('maleVocals') : t('femaleVocals');
      const trimmed = style.trim();
      return trimmed ? `${trimmed}\n${genderHint}` : genderHint;
    })();

    // Bulk generation: loop bulkCount times
    for (let i = 0; i < bulkCount; i++) {
      // Seed handling: first job uses user's seed, rest get random seeds
      let jobSeed = -1;
      if (!randomSeed && i === 0) {
        jobSeed = seed;
      } else if (!randomSeed && i > 0) {
        // Subsequent jobs get random seeds for variety
        jobSeed = Math.floor(Math.random() * 4294967295);
      }

      onGenerate({
        customMode,
        songDescription: customMode ? undefined : songDescription,
        prompt: lyrics,
        lyrics,
        style: styleWithGender,
        title: bulkCount > 1 ? `${title} (${i + 1})` : title,
        ditModel: selectedModel,
        instrumental,
        vocalLanguage,
        bpm,
        keyScale,
        timeSignature,
        duration,
        inferenceSteps,
        guidanceScale,
        batchSize,
        randomSeed: randomSeed || i > 0, // Force random for subsequent bulk jobs
        seed: jobSeed,
        thinking,
        audioFormat,
        inferMethod,
        lmBackend,
        lmModel,
        shift,
        lmTemperature,
        lmCfgScale,
        lmTopK,
        lmTopP,
        lmNegativePrompt,
        referenceAudioUrl: referenceAudioUrl.trim() || undefined,
        sourceAudioUrl: sourceAudioUrl.trim() || undefined,
        referenceAudioTitle: referenceAudioTitle.trim() || undefined,
        sourceAudioTitle: sourceAudioTitle.trim() || undefined,
        audioCodes: audioCodes.trim() || undefined,
        repaintingStart,
        repaintingEnd,
        instruction,
        audioCoverStrength,
        taskType,
        useAdg,
        cfgIntervalStart,
        cfgIntervalEnd,
        customTimesteps: customTimesteps.trim() || undefined,
        useCotMetas,
        useCotCaption,
        useCotLanguage,
        autogen,
        constrainedDecodingDebug,
        allowLmBatch,
        getScores,
        getLrc,
        scoreScale,
        lmBatchChunkSize,
        trackName: trackName.trim() || undefined,
        completeTrackClasses: (() => {
          const parsed = completeTrackClasses
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
          return parsed.length ? parsed : undefined;
        })(),
        isFormatCaption,
        loraLoaded,
      });
    }
  };

  return (
    <div
      className="relative flex flex-col h-full bg-zinc-50 dark:bg-suno-panel w-full overflow-y-auto custom-scrollbar transition-colors duration-300"
      onDrop={handleWorkspaceDrop}
      onDragOver={handleWorkspaceDragOver}
    >
      {isDraggingFile && (
        <div className="absolute inset-0 z-[90] pointer-events-none">
          <div className="absolute inset-0 bg-white/70 dark:bg-black/50 backdrop-blur-sm" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white/90 dark:bg-zinc-900/90 px-6 py-5 shadow-xl">
              {dragKind !== 'audio' && (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white flex items-center justify-center shadow-lg">
                  <Upload size={22} />
                </div>
              )}
              <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                {dragKind === 'audio' ? t('dropToUseAudio') : t('dropToUpload')}
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {dragKind === 'audio'
                  ? (audioTab === 'reference' ? t('usingAsReference') : t('usingAsCover'))
                  : (audioTab === 'reference' ? t('uploadingAsReference') : t('uploadingAsCover'))}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="p-4 pt-14 md:pt-4 pb-24 lg:pb-32 space-y-5">
        <input
          ref={referenceInputRef}
          type="file"
          accept="audio/*"
          onChange={(e) => handleFileSelect(e, 'reference')}
          className="hidden"
        />
        <input
          ref={sourceInputRef}
          type="file"
          accept="audio/*"
          onChange={(e) => handleFileSelect(e, 'source')}
          className="hidden"
        />
        <audio
          ref={referenceAudioRef}
          src={referenceAudioUrl || undefined}
          onPlay={() => setReferencePlaying(true)}
          onPause={() => setReferencePlaying(false)}
          onEnded={() => setReferencePlaying(false)}
          onTimeUpdate={(e) => setReferenceTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setReferenceDuration(e.currentTarget.duration || 0)}
        />
        <audio
          ref={sourceAudioRef}
          src={sourceAudioUrl || undefined}
          onPlay={() => setSourcePlaying(true)}
          onPause={() => setSourcePlaying(false)}
          onEnded={() => setSourcePlaying(false)}
          onTimeUpdate={(e) => setSourceTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setSourceDuration(e.currentTarget.duration || 0)}
        />

        {/* Header - Mode Toggle & Model Selection */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">ACE-Step v1.5</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Toggle */}
            <div className="flex items-center bg-zinc-200 dark:bg-black/40 rounded-lg p-1 border border-zinc-300 dark:border-white/5">
              <button
                onClick={() => setCustomMode(false)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${!customMode ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
              >
                {t('simple')}
              </button>
              <button
                onClick={() => setCustomMode(true)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${customMode ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
              >
                {t('custom')}
              </button>
            </div>

            {/* Model Selection */}
            <div className="relative" ref={modelMenuRef}>
              <button
                onClick={() => setShowModelMenu(!showModelMenu)}
                className="bg-zinc-200 dark:bg-black/40 border border-zinc-300 dark:border-white/5 rounded-md px-2 py-1 text-[11px] font-medium text-zinc-900 dark:text-white hover:bg-zinc-300 dark:hover:bg-black/50 transition-colors flex items-center gap-1"
                disabled={availableModels.length === 0}
              >
                {availableModels.length === 0 ? '...' : getModelDisplayName(selectedModel)}
                <ChevronDown size={10} className="text-zinc-600 dark:text-zinc-400" />
              </button>

              {/* Floating Model Menu */}
              {showModelMenu && availableModels.length > 0 && (
                <div className="absolute top-full right-0 mt-1 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {availableModels.map(model => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setSelectedModel(model.id);
                          // Auto-adjust parameters for non-turbo models
                          if (!isTurboModel(model.id)) {
                            setInferenceSteps(20);
                            setUseAdg(true);
                          }
                          setShowModelMenu(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-b-0 ${selectedModel === model.id ? 'bg-zinc-50 dark:bg-zinc-800/50' : ''
                          }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                              {getModelDisplayName(model.id)}
                            </span>
                            {fetchedModels.find(m => m.name === model.id)?.is_preloaded && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                {fetchedModels.find(m => m.name === model.id)?.is_active ? t('modelActive') : t('modelReady')}
                              </span>
                            )}
                          </div>
                          {selectedModel === model.id && (
                            <div className="w-4 h-4 rounded-full bg-pink-500 flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{model.id}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Model Mismatch Banner */}
        {activeBackendModel && selectedModel !== activeBackendModel && (
          <div className="mx-4 mt-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 flex items-center justify-between gap-2">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              <span className="font-semibold">{getModelDisplayName(selectedModel)}</span> selected but <span className="font-semibold">{getModelDisplayName(activeBackendModel)}</span> is loaded
            </p>
            <button
              onClick={() => handleSwitchModel(selectedModel)}
              disabled={isSwitching || isGenerating}
              className="shrink-0 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {isSwitching ? (
                <><Loader2 size={10} className="animate-spin" /> Switching…</>
              ) : (
                <><RefreshCw size={10} /> Switch</>
              )}
            </button>
          </div>
        )}

        {/* SIMPLE MODE */}
        {!customMode && (
          <div className="space-y-5">
            {/* Song Description */}
            <div className="bg-white dark:bg-suno-card rounded-xl border border-zinc-200 dark:border-white/5 overflow-hidden">
              <div className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-white/5">
                {t('describeYourSong')}
              </div>
              <textarea
                value={songDescription}
                onChange={(e) => setSongDescription(e.target.value)}
                placeholder={t('songDescriptionPlaceholder')}
                className="w-full h-32 bg-transparent p-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none resize-none"
              />
            </div>

            {/* Vocal Language (Simple) */}
            <div className="bg-white dark:bg-suno-card rounded-xl border border-zinc-200 dark:border-white/5 overflow-hidden">
              <div className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-white/5">
                {t('vocalLanguage')}
              </div>
              <div className="flex flex-wrap items-center gap-2 p-3">
                <select
                  value={vocalLanguage}
                  onChange={(e) => setVocalLanguage(e.target.value)}
                  className="flex-1 min-w-[180px] bg-transparent text-sm text-zinc-900 dark:text-white focus:outline-none"
                >
                  {VOCAL_LANGUAGE_KEYS.map(lang => (
                    <option key={lang.value} value={lang.value}>{t(lang.key)}</option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVocalGender(vocalGender === 'male' ? '' : 'male')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${vocalGender === 'male' ? 'bg-pink-600 text-white border-pink-600' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-white/20'}`}
                  >
                    {t('male')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVocalGender(vocalGender === 'female' ? '' : 'female')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${vocalGender === 'female' ? 'bg-pink-600 text-white border-pink-600' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-white/20'}`}
                  >
                    {t('female')}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Settings (Simple Mode) */}
            <div className="bg-white dark:bg-suno-card rounded-xl border border-zinc-200 dark:border-white/5 p-4 space-y-4">
              <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide flex items-center gap-2">
                <Sliders size={14} />
                {t('quickSettings')}
              </h3>

              {/* Duration */}
              <EditableSlider
                label={t('duration')}
                value={duration}
                min={-1}
                max={600}
                step={5}
                onChange={setDuration}
                formatDisplay={(val) => val === -1 ? t('auto') : `${val}${t('seconds')}`}
                title={''}
                autoLabel={t('auto')}
              />

              {/* BPM */}
              <EditableSlider
                label="BPM"
                value={bpm}
                min={0}
                max={300}
                step={5}
                onChange={setBpm}
                formatDisplay={(val) => val === 0 ? t('auto') : val.toString()}
                autoLabel={t('auto')}
              />

              {/* Key & Time Signature */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t('key')}</label>
                  <select
                    value={keyScale}
                    onChange={setKeyScale}
                    className="w-full bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 dark:focus:border-pink-500 transition-all cursor-pointer hover:border-pink-300 dark:hover:border-pink-500/50 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%236b7280%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-[length:1rem] bg-[right_0.5rem_center] pr-8 shadow-sm"
                  >
                    <option value="">{t('autoOption')}</option>
                    {KEY_SIGNATURES.filter(k => k).map(key => (
                      <option key={key} value={key}>{key}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t('time')}</label>
                  <select
                    value={timeSignature}
                    onChange={setTimeSignature}
                    className="w-full bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 dark:focus:border-pink-500 transition-all cursor-pointer hover:border-pink-300 dark:hover:border-pink-500/50 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%236b7280%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-[length:1rem] bg-[right_0.5rem_center] pr-8 shadow-sm"
                  >
                    <option value="">{t('autoOption')}</option>
                    {TIME_SIGNATURES.filter(t => t).map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Variations */}
              <EditableSlider
                label={t('variations')}
                value={batchSize}
                min={1}
                max={8}
                step={1}
                onChange={setBatchSize}
              />
              <div style={{ display: 'none' }}>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={batchSize}
                  onChange={setBatchSize}
                  className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
                <p className="text-[10px] text-zinc-500">{t('numberOfVariations')}</p>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOM MODE */}
        {customMode && (
          <div className="space-y-5">
            {/* Audio Section */}
            <div
              onDrop={(e) => handleDrop(e, audioTab)}
              onDragOver={handleDragOver}
              className="bg-white dark:bg-[#1a1a1f] rounded-xl border border-zinc-200 dark:border-white/5 overflow-hidden"
            >
              {/* Header with Audio label and tabs */}
              <div className="px-3 py-2.5 border-b border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{t('audio')}</span>
                  <div className="flex items-center gap-1 bg-zinc-200/50 dark:bg-black/30 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setAudioTab('reference')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${audioTab === 'reference'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                        }`}
                    >
                      {t('reference')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudioTab('source')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${audioTab === 'source'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                        }`}
                    >
                      {t('cover')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Audio Content */}
              <div className="p-3 space-y-2">
                {/* Reference Audio Player */}
                {audioTab === 'reference' && referenceAudioUrl && (
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-white/[0.03] border border-zinc-100 dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => toggleAudio('reference')}
                      className="relative flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform"
                    >
                      {referencePlaying ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                      ) : (
                        <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      )}
                      <span className="absolute -bottom-1 -right-1 text-[8px] font-bold bg-zinc-900 text-white px-1 py-0.5 rounded">
                        {formatTime(referenceDuration)}
                      </span>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate mb-1.5">
                        {referenceAudioTitle || getAudioLabel(referenceAudioUrl)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-400 tabular-nums">{formatTime(referenceTime)}</span>
                        <div
                          className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-white/10 cursor-pointer group/seek"
                          onClick={(e) => {
                            if (referenceAudioRef.current && referenceDuration > 0) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const percent = (e.clientX - rect.left) / rect.width;
                              referenceAudioRef.current.currentTime = percent * referenceDuration;
                            }
                          }}
                        >
                          <div
                            className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all relative"
                            style={{ width: referenceDuration ? `${Math.min(100, (referenceTime / referenceDuration) * 100)}%` : '0%' }}
                          >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-md opacity-0 group-hover/seek:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        <span className="text-[10px] text-zinc-400 tabular-nums">{formatTime(referenceDuration)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setReferenceAudioUrl(''); setReferenceAudioTitle(''); setReferencePlaying(false); setReferenceTime(0); setReferenceDuration(0); }}
                      className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}

                {/* Source/Cover Audio Player */}
                {audioTab === 'source' && sourceAudioUrl && (
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-white/[0.03] border border-zinc-100 dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => toggleAudio('source')}
                      className="relative flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform"
                    >
                      {sourcePlaying ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                      ) : (
                        <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      )}
                      <span className="absolute -bottom-1 -right-1 text-[8px] font-bold bg-zinc-900 text-white px-1 py-0.5 rounded">
                        {formatTime(sourceDuration)}
                      </span>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate mb-1.5">
                        {sourceAudioTitle || getAudioLabel(sourceAudioUrl)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-400 tabular-nums">{formatTime(sourceTime)}</span>
                        <div
                          className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-white/10 cursor-pointer group/seek"
                          onClick={(e) => {
                            if (sourceAudioRef.current && sourceDuration > 0) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const percent = (e.clientX - rect.left) / rect.width;
                              sourceAudioRef.current.currentTime = percent * sourceDuration;
                            }
                          }}
                        >
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all relative"
                            style={{ width: sourceDuration ? `${Math.min(100, (sourceTime / sourceDuration) * 100)}%` : '0%' }}
                          >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-md opacity-0 group-hover/seek:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        <span className="text-[10px] text-zinc-400 tabular-nums">{formatTime(sourceDuration)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSourceAudioUrl(''); setSourceAudioTitle(''); setSourcePlaying(false); setSourceTime(0); setSourceDuration(0); }}
                      className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openAudioModal(audioTab, 'uploads')}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 px-3 py-2 text-xs font-medium transition-colors border border-zinc-200 dark:border-white/5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    {t('fromLibrary')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const input = audioTab === 'reference' ? referenceInputRef.current : sourceInputRef.current;
                      input?.click();
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 px-3 py-2 text-xs font-medium transition-colors border border-zinc-200 dark:border-white/5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {t('upload')}
                  </button>
                </div>
              </div>
            </div>

            {/* Lyrics Input */}
            <div
              ref={lyricsRef}
              className="bg-white dark:bg-suno-card rounded-xl border border-zinc-200 dark:border-white/5 overflow-hidden transition-colors group focus-within:border-zinc-400 dark:focus-within:border-white/20 relative flex flex-col"
              style={{ height: 'auto' }}
            >
              <div className="flex items-center justify-between px-3 py-2.5 bg-zinc-50 dark:bg-white/5 border-b border-zinc-100 dark:border-white/5 flex-shrink-0">
                <div>
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{t('lyrics')}</span>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">{t('leaveLyricsEmpty')}</p>
                </div>
                <div className="flex items-center gap-2">
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
                    disabled={isFormattingLyrics || !style.trim()}
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
              </div>
              <textarea
                disabled={instrumental}
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder={instrumental ? t('instrumental') + ' mode' : t('lyricsPlaceholder')}
                className={`w-full bg-transparent p-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none resize-none font-mono leading-relaxed ${instrumental ? 'opacity-30 cursor-not-allowed' : ''}`}
                style={{ height: `${lyricsHeight}px` }}
              />
              {/* Resize Handle */}
              <div
                onMouseDown={startResizing}
                className="h-3 w-full cursor-ns-resize flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors absolute bottom-0 left-0 z-10"
              >
                <div className="w-8 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
              </div>
            </div>

            {/* Style Input */}
            <div className="bg-white dark:bg-suno-card rounded-xl border border-zinc-200 dark:border-white/5 overflow-visible transition-colors group focus-within:border-zinc-400 dark:focus-within:border-white/20">
              <div className="flex items-center justify-between px-3 py-2.5 bg-zinc-50 dark:bg-white/5 border-b border-zinc-100 dark:border-white/5">
                <div>
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{t('styleOfMusic')}</span>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">{t('genreMoodInstruments')}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="p-1.5 hover:bg-zinc-200 dark:hover:bg-white/10 rounded transition-colors text-zinc-500 hover:text-black dark:hover:text-white"
                    title={t('refreshGenres')}
                    onClick={refreshMusicTags}
                  >
                    <Dices size={14} />
                  </button>
                  <button
                    className="p-1.5 hover:bg-zinc-200 dark:hover:bg-white/10 rounded text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
                    onClick={() => setStyle('')}
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    className={`p-1.5 hover:bg-zinc-200 dark:hover:bg-white/10 rounded transition-colors ${isFormattingStyle ? 'text-pink-500' : 'text-zinc-500 hover:text-black dark:hover:text-white'}`}
                    title={t('aiFormatTooltip')}
                    onClick={() => handleFormat('style')}
                    disabled={isFormattingStyle || !style.trim()}
                  >
                    {isFormattingStyle ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  </button>
                </div>
              </div>
              <textarea
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder={t('stylePlaceholder')}
                className="w-full h-20 bg-transparent p-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none resize-none"
              />
              <div className="px-3 pb-3 space-y-3">
                {/* Genre Selector with Integrated Search */}
                <div className="space-y-3">
                  {/* Combined Genre Dropdown with Search */}
                  <div className="relative" ref={genreDropdownRef}>
                    <button
                      onClick={() => setShowGenreDropdown(!showGenreDropdown)}
                      className="w-full flex items-center justify-between bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-700 dark:text-zinc-200 hover:border-pink-300 dark:hover:border-pink-500/50 transition-all shadow-sm"
                    >
                      <span className={selectedMainGenre || selectedSubGenre ? 'text-zinc-900 dark:text-white font-medium' : 'text-zinc-400'}>
                        {selectedSubGenre
                          ? `${selectedMainGenre} › ${selectedSubGenre}`
                          : selectedMainGenre
                            ? `${selectedMainGenre} ${getSubGenreCount(selectedMainGenre) > 0 ? `(${getSubGenreCount(selectedMainGenre)} ${t('subGenres')})` : ''}`
                            : t('selectGenre')}
                      </span>
                      <div className="flex items-center gap-1">
                        {(selectedMainGenre || selectedSubGenre) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMainGenre('');
                              setSelectedSubGenre('');
                            }}
                            className="p-0.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            title={t('clearSelection')}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                        <svg className={`w-4 h-4 text-zinc-400 transition-transform ${showGenreDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {/* Dropdown Panel */}
                    {showGenreDropdown && (
                      <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-2xl overflow-hidden" style={{ maxHeight: '500px' }}>
                        {/* Search Input Inside Dropdown */}
                        <div className="p-2 border-b border-zinc-100 dark:border-zinc-700">
                          <div className="relative">
                            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                              type="text"
                              value={genreSearch}
                              onChange={(e) => setGenreSearch(e.target.value)}
                              placeholder={t('searchGenre') || 'Search genres...'}
                              className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-8 pr-7 py-1.5 text-xs text-zinc-700 dark:text-zinc-200 focus:outline-none focus:border-pink-500 dark:focus:border-pink-500 placeholder:text-zinc-400"
                              autoFocus
                            />
                            {genreSearch && (
                              <button
                                onClick={() => setGenreSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Dropdown Options - Combined and Sorted */}
                        <div className="overflow-y-auto" style={{ maxHeight: '420px' }}>
                          {filteredCombinedGenres.length > 0 && (
                            <div className="py-1">
                              {filteredCombinedGenres.map(({ name, type }) => {
                                const subCount = type === 'main' ? getSubGenreCount(name) : 0;
                                const isSelected = selectedMainGenre === name;
                                return (
                                  <button
                                    key={name}
                                    onClick={() => {
                                      if (type === 'main') {
                                        setSelectedMainGenre(name);
                                        setSelectedSubGenre('');
                                        setStyle(prev => prev ? `${prev}, ${name}` : name);
                                        if (subCount === 0) {
                                          setShowGenreDropdown(false);
                                          setGenreSearch('');
                                        }
                                      } else {
                                        // Other genre - no sub genres
                                        setStyle(prev => prev ? `${prev}, ${name}` : name);
                                        setSelectedMainGenre('');
                                        setSelectedSubGenre('');
                                        setShowGenreDropdown(false);
                                        setGenreSearch('');
                                      }
                                    }}
                                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between transition-colors ${isSelected
                                      ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300'
                                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-pink-50 dark:hover:bg-pink-900/20 hover:text-pink-700 dark:hover:text-pink-300'
                                      }`}
                                  >
                                    <span className="flex items-center gap-2">
                                      <span className={`w-1.5 h-1.5 rounded-full ${type === 'main' ? 'bg-pink-400' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                                      {name}
                                    </span>
                                    {type === 'main' && subCount > 0 && (
                                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full">
                                        {subCount}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sub Genre Dropdown - Custom styled for dark mode support */}
                  {selectedMainGenre && filteredSubGenres.length > 0 && (
                    <div className="relative" ref={subGenreDropdownRef}>
                      <button
                        onClick={() => setShowSubGenreDropdown(!showSubGenreDropdown)}
                        className="w-full flex items-center justify-between bg-gradient-to-r from-pink-50/80 to-purple-50/80 dark:from-pink-950/30 dark:to-purple-950/30 border border-pink-200 dark:border-pink-700/50 rounded-xl px-3 py-2 text-xs text-zinc-700 dark:text-zinc-200 hover:border-pink-300 dark:hover:border-pink-500 transition-all shadow-sm"
                      >
                        <span className={selectedSubGenre ? 'text-zinc-900 dark:text-white font-medium' : 'text-zinc-500 dark:text-zinc-400'}>
                          {selectedSubGenre || `${t('selectSubGenre')} (${filteredSubGenres.length})`}
                        </span>
                        <div className="flex items-center gap-1">
                          {selectedSubGenre && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSubGenre('');
                              }}
                              className="p-0.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                              title={t('clearSelection') || 'Clear'}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                          <svg className={`w-4 h-4 text-zinc-400 transition-transform ${showSubGenreDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* Sub Genre Dropdown Panel */}
                      {showSubGenreDropdown && (
                        <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-2xl overflow-hidden" style={{ maxHeight: '300px' }}>
                          <div className="overflow-y-auto" style={{ maxHeight: '300px' }}>
                            <div className="py-1">
                              {filteredSubGenres.map(genre => (
                                <button
                                  key={genre}
                                  onClick={() => {
                                    setSelectedSubGenre(genre);
                                    setStyle(prev => prev ? `${prev}, ${genre}` : genre);
                                    setShowSubGenreDropdown(false);
                                  }}
                                  className={`w-full px-3 py-1.5 text-left text-xs transition-colors ${selectedSubGenre === genre
                                    ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300'
                                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-pink-50 dark:hover:bg-pink-900/20 hover:text-pink-700 dark:hover:text-pink-300'
                                    }`}
                                >
                                  {genre}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}


                </div>
                {/* Quick Tags */}
                <div className="flex flex-wrap gap-2">
                  {musicTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setStyle(prev => prev ? `${prev}, ${tag}` : tag)}
                      className="text-[10px] font-medium bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white px-2.5 py-1 rounded-full transition-colors border border-zinc-200 dark:border-white/5"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Title Input */}
            <div className="bg-white dark:bg-suno-card rounded-xl border border-zinc-200 dark:border-white/5 overflow-hidden">
              <div className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-white/5">
                {t('title')}
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('nameSong')}
                className="w-full bg-transparent p-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* COMMON SETTINGS */}
        <div className="space-y-4">
          {/* Instrumental Toggle (Simple Mode) */}
          {!customMode && (
            <div className="flex items-center justify-between px-1 py-2">
              <div className="flex items-center gap-2">
                <Music2 size={14} className="text-zinc-500" />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('instrumental')}</span>
              </div>
              <button
                onClick={() => setInstrumental(!instrumental)}
                className={`w-11 h-6 rounded-full flex items-center transition-colors duration-200 px-1 border border-zinc-200 dark:border-white/5 ${instrumental ? 'bg-pink-600' : 'bg-zinc-300 dark:bg-black/40'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transform transition-transform duration-200 shadow-sm ${instrumental ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          )}

          {/* Vocal Language (Custom mode) */}
          {customMode && !instrumental && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide px-1">
                  {t('vocalLanguage')}
                </label>
                <select
                  value={vocalLanguage}
                  onChange={(e) => setVocalLanguage(e.target.value)}
                  className="w-full bg-white dark:bg-suno-card border border-zinc-200 dark:border-white/5 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-pink-500 dark:focus:border-pink-500 transition-colors cursor-pointer [&>option]:bg-white [&>option]:dark:bg-zinc-800 [&>option]:text-zinc-900 [&>option]:dark:text-white"
                >
                  {VOCAL_LANGUAGE_KEYS.map(lang => (
                    <option key={lang.value} value={lang.value}>{t(lang.key)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide px-1">
                  {t('vocalGender')}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVocalGender(vocalGender === 'male' ? '' : 'male')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${vocalGender === 'male' ? 'bg-pink-600 text-white border-pink-600' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-white/20'}`}
                  >
                    {t('male')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVocalGender(vocalGender === 'female' ? '' : 'female')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${vocalGender === 'female' ? 'bg-pink-600 text-white border-pink-600' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-white/20'}`}
                  >
                    {t('female')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* LORA CONTROL PANEL */}
        {customMode && (
          <>
            <button
              onClick={() => setShowLoraPanel(!showLoraPanel)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-suno-card rounded-xl border border-zinc-200 dark:border-white/5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sliders size={16} className="text-zinc-500" />
                <span>LoRA</span>
              </div>
              <ChevronDown size={18} className={`text-pink-500 chevron-icon ${showLoraPanel ? 'rotated' : ''}`} />
            </button>

            {showLoraPanel && (
              <div className="bg-white dark:bg-suno-card rounded-xl border border-zinc-200 dark:border-white/5 p-4 space-y-4">
                {/* Advanced Toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={advancedAdapters}
                      onChange={(e) => setAdvancedAdapters(e.target.checked)}
                      className="rounded border-zinc-300 dark:border-zinc-600 text-pink-500 focus:ring-pink-500"
                    />
                    Advanced (Multi-Adapter)
                  </label>
                </div>

                {!advancedAdapters ? (
                  /* BASIC MODE — existing UI untouched */
                  <>
                    {/* LoRA Path Input */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t('loraPath')}</label>
                      <input
                        type="text"
                        value={loraPath}
                        onChange={(e) => setLoraPath(e.target.value)}
                        placeholder={t('loraPathPlaceholder')}
                        className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-pink-500 dark:focus:border-pink-500 transition-colors"
                      />
                    </div>

                    {/* LoRA Load/Unload Toggle */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-2 border-t border-zinc-100 dark:border-white/5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${loraLoaded ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                            }`}></div>
                          <span className={`text-xs font-medium ${loraLoaded ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                            {loraLoaded ? t('loraLoaded') : t('loraUnloaded')}
                          </span>
                        </div>
                        <button
                          onClick={handleLoraToggle}
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
                        onChange={handleLoraScaleChange}
                        formatDisplay={(val) => val.toFixed(2)}
                        helpText={t('loraScaleDescription')}
                      />
                    </div>
                  </>
                ) : (
                  /* ADVANCED MODE — multi-slot adapter UI */
                  <>
                    {/* Adapter folder browser */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Adapter Folder</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={adapterFolder}
                          onChange={(e) => setAdapterFolder(e.target.value)}
                          placeholder="./lokr_output"
                          className="flex-1 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-pink-500"
                        />
                        <button
                          onClick={handleScanFolder}
                          disabled={!adapterFolder.trim()}
                          className="px-3 py-2 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                        >
                          Scan
                        </button>
                      </div>
                    </div>

                    {/* File list */}
                    {adapterFiles.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Available Adapters ({adapterFiles.length})</label>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {adapterFiles.map((file) => (
                            <div key={file.path} className="flex items-center justify-between bg-zinc-50 dark:bg-black/20 rounded-lg px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${file.type === 'lora' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}`}>
                                  {file.type.toUpperCase()}
                                </span>
                                <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate">{file.name}</span>
                                <span className="text-[10px] text-zinc-400">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                              </div>
                              <button
                                onClick={() => handleLoadSlot(file.path)}
                                disabled={isLoraLoading || adapterSlots.length >= 4}
                                className="px-2 py-1 rounded text-[10px] font-semibold bg-pink-500/10 text-pink-600 dark:text-pink-400 hover:bg-pink-500/20 disabled:opacity-40 transition-colors"
                              >
                                Load
                              </button>
                            </div>
                          ))}
                        </div>
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
                                  onClick={() => setExpandedSlot(expandedSlot === slot.slot ? null : slot.slot)}
                                  className="text-[10px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                >
                                  {expandedSlot === slot.slot ? '▼' : '▶'} Groups
                                </button>
                                <button
                                  onClick={() => handleUnloadSlot(slot.slot)}
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
                              onChange={(v) => handleSlotScaleChange(slot.slot, v)}
                              formatDisplay={(v) => v.toFixed(2)}
                            />

                            {/* Per-group sliders (expandable) */}
                            {expandedSlot === slot.slot && (
                              <div className="space-y-1 pl-2 border-l-2 border-pink-500/20">
                                {(['self_attn', 'cross_attn', 'mlp'] as const).map((group) => (
                                  <EditableSlider
                                    key={group}
                                    label={group === 'self_attn' ? 'Self-Attn' : group === 'cross_attn' ? 'Cross-Attn' : 'MLP'}
                                    value={slot.group_scales[group]}
                                    min={0}
                                    max={2}
                                    step={0.05}
                                    onChange={(v) => handleSlotGroupScaleChange(slot.slot, group, v)}
                                    formatDisplay={(v) => v.toFixed(2)}
                                  />
                                ))}
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
          </>
        )}

        {/* MUSIC PARAMETERS */}
        <div className="bg-white dark:bg-suno-card rounded-xl border border-zinc-200 dark:border-white/5 p-4 space-y-4">
          <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide flex items-center gap-2">
            <Sliders size={14} />
            {t('musicParameters')}
          </h3>

          {/* BPM */}
          <EditableSlider
            label={t('bpm')}
            value={bpm}
            min={0}
            max={300}
            step={5}
            onChange={setBpm}
            formatDisplay={(val) => val === 0 ? t('auto') : val.toString()}
            autoLabel={t('auto')}
          />

          {/* Key & Time Signature */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t('key')}</label>
              <select
                value={keyScale}
                onChange={(e) => setKeyScale(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl px-2 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-pink-500 dark:focus:border-pink-500 transition-colors cursor-pointer [&>option]:bg-white [&>option]:dark:bg-zinc-800 [&>option]:text-zinc-900 [&>option]:dark:text-white"
              >
                <option value="">{t('autoOption')}</option>
                {KEY_SIGNATURES.filter(k => k).map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t('time')}</label>
              <select
                value={timeSignature}
                onChange={(e) => setTimeSignature(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl px-2 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-pink-500 dark:focus:border-pink-500 transition-colors cursor-pointer [&>option]:bg-white [&>option]:dark:bg-zinc-800 [&>option]:text-zinc-900 [&>option]:dark:text-white"
              >
                <option value="">{t('autoOption')}</option>
                {TIME_SIGNATURES.filter(t => t).map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ADVANCED SETTINGS */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-suno-card rounded-xl border border-zinc-200 dark:border-white/5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings2 size={16} className="text-zinc-500" />
            <span>{t('advancedSettings')}</span>
          </div>
          <ChevronDown size={18} className={`text-pink-500 chevron-icon ${showAdvanced ? 'rotated' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="bg-white dark:bg-suno-card rounded-xl border border-zinc-200 dark:border-white/5 p-4 space-y-4">

            {/* Duration */}
            <EditableSlider
              label={t('duration')}
              value={duration}
              min={-1}
              max={600}
              step={5}
              onChange={setDuration}
              formatDisplay={(val) => val === -1 ? t('auto') : `${val}${t('seconds')}`}
              autoLabel={t('auto')}
              helpText={`${t('auto')} - 10 ${t('min')}`}
            />

            {/* Batch Size */}
            <EditableSlider
              label={t('batchSize')}
              value={batchSize}
              min={1}
              max={8}
              step={1}
              onChange={setBatchSize}
              helpText={t('numberOfVariations')}
              title={t('batchSizeTooltip')}
            />

            {/* Bulk Generate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t('bulkGenerate')}</label>
                <span className="text-xs font-mono text-zinc-900 dark:text-white bg-zinc-100 dark:bg-black/20 px-2 py-0.5 rounded">
                  {bulkCount} {t(bulkCount === 1 ? 'job' : 'jobs')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 5, 10].map((count) => (
                  <button
                    key={count}
                    onClick={() => { setBulkCount(count); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${bulkCount === count
                      ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-md'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-zinc-500">{t('queueMultipleJobs')}</p>
            </div>

            {/* Inference Steps */}
            <EditableSlider
              label={t('inferenceSteps')}
              value={inferenceSteps}
              min={4}
              max={200}
              step={1}
              onChange={setInferenceSteps}
              helpText={t('moreStepsBetterQuality')}
              title={t('inferenceStepsTooltip')}
            />

            {/* Guidance Scale */}
            <EditableSlider
              label={t('guidanceScale')}
              value={guidanceScale}
              min={1}
              max={15}
              step={0.5}
              onChange={setGuidanceScale}
              formatDisplay={(val) => val.toFixed(1)}
              helpText={t('howCloselyFollowPrompt')}
              title={t('guidanceScaleTooltip')}
            />

            {/* Audio Format & Inference Method */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t('audioFormat')}</label>
                <select
                  value={audioFormat}
                  onChange={(e) => setAudioFormat(e.target.value as 'mp3' | 'flac')}
                  className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl px-2 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-pink-500 dark:focus:border-pink-500 transition-colors cursor-pointer [&>option]:bg-white [&>option]:dark:bg-zinc-800 [&>option]:text-zinc-900 [&>option]:dark:text-white"
                >
                  <option value="mp3">{t('mp3Smaller')}</option>
                  <option value="flac">{t('flacLossless')}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400" title={t('inferMethodTooltip')}>{t('inferMethod')}</label>
                <select
                  value={inferMethod}
                  onChange={(e) => setInferMethod(e.target.value as 'ode' | 'sde')}
                  className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl px-2 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-pink-500 dark:focus:border-pink-500 transition-colors cursor-pointer [&>option]:bg-white [&>option]:dark:bg-zinc-800 [&>option]:text-zinc-900 [&>option]:dark:text-white"
                >
                  <option value="ode">{t('odeDeterministic')}</option>
                  <option value="sde">{t('sdeStochastic')}</option>
                </select>
              </div>
            </div>

            {/* LM Backend */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t('lmBackendLabel')}</label>
              <select
                value={lmBackend}
                onChange={(e) => setLmBackend(e.target.value as 'pt' | 'vllm')}
                className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl px-2 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-pink-500 dark:focus:border-pink-500 transition-colors cursor-pointer [&>option]:bg-white [&>option]:dark:bg-zinc-800 [&>option]:text-zinc-900 [&>option]:dark:text-white"
              >
                <option value="pt">{t('lmBackendPt')}</option>
                <option value="vllm">{t('lmBackendVllm')}</option>
              </select>
              <p className="text-[10px] text-zinc-500">{t('lmBackendHint')}</p>
            </div>

            {/* LM Model */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t('lmModelLabel')}</label>
              <select
                value={lmModel}
                onChange={(e) => { const v = e.target.value; setLmModel(v); }}
                className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl px-2 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-pink-500 dark:focus:border-pink-500 transition-colors cursor-pointer [&>option]:bg-white [&>option]:dark:bg-zinc-800 [&>option]:text-zinc-900 [&>option]:dark:text-white"
              >
                <option value="acestep-5Hz-lm-0.6B">{t('lmModel06B')}</option>
                <option value="acestep-5Hz-lm-1.7B">{t('lmModel17B')}</option>
                <option value="acestep-5Hz-lm-4B">{t('lmModel4B')}</option>
              </select>
              <p className="text-[10px] text-zinc-500">{t('lmModelHint')}</p>
            </div>

            {/* Seed */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Dices size={14} className="text-zinc-500" />
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400" title={t('seedTooltip')}>{t('seed')}</span>
                </div>
                <button
                  onClick={() => setRandomSeed(!randomSeed)}
                  className={`w-10 h-5 rounded-full flex items-center transition-colors duration-200 px-0.5 border border-zinc-200 dark:border-white/5 ${randomSeed ? 'bg-pink-600' : 'bg-zinc-300 dark:bg-black/40'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transform transition-transform duration-200 shadow-sm ${randomSeed ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Hash size={14} className="text-zinc-500" />
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(Number(e.target.value))}
                  placeholder={t('enterFixedSeed')}
                  disabled={randomSeed}
                  onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                  className={`flex-1 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${randomSeed ? 'opacity-40 cursor-not-allowed' : ''}`}
                />
              </div>
              <p className="text-[10px] text-zinc-500">{randomSeed ? t('randomSeedRecommended') : t('fixedSeedReproducible')}</p>
            </div>

            {/* Thinking Toggle */}
            <div className="flex items-center justify-between py-2 border-t border-zinc-100 dark:border-white/5">
              <span className={`text-xs font-medium ${loraLoaded ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-600 dark:text-zinc-400'}`} title={t('thinkingTooltip')}>{t('thinkingCot')}</span>
              <button
                onClick={() => !loraLoaded && setThinking(!thinking)}
                disabled={loraLoaded}
                className={`w-10 h-5 rounded-full flex items-center transition-colors duration-200 px-0.5 border border-zinc-200 dark:border-white/5 ${thinking ? 'bg-pink-600' : 'bg-zinc-300 dark:bg-black/40'} ${loraLoaded ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transform transition-transform duration-200 shadow-sm ${thinking ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Shift */}
            <EditableSlider
              label={t('shift')}
              value={shift}
              min={1}
              max={5}
              step={0.1}
              onChange={setShift}
              formatDisplay={(val) => val.toFixed(1)}
              helpText={t('timestepShiftForBase')}
              title={t('shiftTooltip')}
            />

            {/* Divider */}
            <div className="border-t border-zinc-200 dark:border-white/10 pt-4">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-bold mb-3">{t('expertControls')}</p>
            </div>

            {uploadError && (
              <div className="text-[11px] text-rose-500">{uploadError}</div>
            )}

            {/* LM Parameters */}
            <button
              onClick={() => setShowLmParams(!showLmParams)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white/60 dark:bg-black/20 rounded-xl border border-zinc-200/70 dark:border-white/10 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Music2 size={16} className="text-zinc-500" />
                <div className="flex flex-col items-start">
                  <span title={t('lmParametersTooltip')}>{t('lmParameters')}</span>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-normal">{t('controlLyricGeneration')}</span>
                </div>
              </div>
              <ChevronDown size={18} className={`text-pink-500 chevron-icon ${showLmParams ? 'rotated' : ''}`} />
            </button>

            {showLmParams && (
              <div className="bg-white dark:bg-suno-card rounded-xl border border-zinc-200 dark:border-white/5 p-4 space-y-4">
                {/* LM Temperature */}
                <EditableSlider
                  label={t('lmTemperature')}
                  value={lmTemperature}
                  min={0}
                  max={2}
                  step={0.05}
                  onChange={(e) => setLmTemperature(Number(e.target.value))}
                  formatDisplay={(val) => val.toFixed(2)}
                  helpText={t('higherMoreRandom')}
                  title={t('lmTemperatureTooltip')}
                />

                {/* LM CFG Scale */}
                <EditableSlider
                  label={t('lmCfgScale')}
                  value={lmCfgScale}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={setLmCfgScale}
                  formatDisplay={(val) => val.toFixed(1)}
                  helpText={t('noCfgScale')}
                  title={t('lmGuidanceScaleTooltip')}
                />

                {/* LM Top-K & Top-P */}
                <div className="grid grid-cols-2 gap-3">
                  <EditableSlider
                    label={t('topK')}
                    value={lmTopK}
                    min={0}
                    max={100}
                    step={1}
                    onChange={setLmTopK}
                    title={t('lmTopKTooltip')}
                  />
                  <EditableSlider
                    label={t('topP')}
                    value={lmTopP}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={setLmTopP}
                    formatDisplay={(val) => val.toFixed(2)}
                    title={t('lmTopPTooltip')}
                  />
                </div>

                {/* LM Negative Prompt */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400" title={t('lmNegativePromptTooltip')}>{t('lmNegativePrompt')}</label>
                  <textarea
                    value={lmNegativePrompt}
                    onChange={(e) => setLmNegativePrompt(e.target.value)}
                    placeholder={t('thingsToAvoid')}
                    className="w-full h-16 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg p-2 text-xs text-zinc-900 dark:text-white focus:outline-none resize-none"
                  />
                  <p className="text-[10px] text-zinc-500">{t('useWhenCfgScaleGreater')}</p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide" title={t('transformTooltip')}>{t('transform')}</h4>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{t('controlSourceAudio')}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400" title={t('audioCodesTooltip')}>{t('audioCodes')}</label>
              <textarea
                value={audioCodes}
                onChange={(e) => setAudioCodes(e.target.value)}
                placeholder={t('optionalAudioCodes')}
                className="w-full h-16 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg p-2 text-xs text-zinc-900 dark:text-white focus:outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400" title={t('taskTypeTooltip')}>{t('taskType')}</label>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl px-2 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-pink-500 dark:focus:border-pink-500 transition-colors cursor-pointer [&>option]:bg-white [&>option]:dark:bg-zinc-800 [&>option]:text-zinc-900 [&>option]:dark:text-white"
                >
                  <option value="text2music">{t('textToMusic')}</option>
                  <option value="audio2audio">{t('audio2audio')}</option>
                  <option value="cover">{t('coverTask')}</option>
                  <option value="repaint">{t('repaintTask')}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400" title={t('audioCoverStrengthTooltip')}>{t('audioCoverStrength')}</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={audioCoverStrength}
                  onChange={(e) => setAudioCoverStrength(Number(e.target.value))}
                  className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400" title={t('repaintingStartTooltip')}>{t('repaintingStart')}</label>
                <input
                  type="number"
                  step="0.1"
                  value={repaintingStart}
                  onChange={(e) => setRepaintingStart(Number(e.target.value))}
                  className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400" title={t('repaintingEndTooltip')}>{t('repaintingEnd')}</label>
                <input
                  type="number"
                  step="0.1"
                  value={repaintingEnd}
                  onChange={(e) => setRepaintingEnd(Number(e.target.value))}
                  className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400" title={t('instructionTooltip')}>{t('instruction')}</label>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                className="w-full h-16 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg p-2 text-xs text-zinc-900 dark:text-white focus:outline-none resize-none"
              />
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{t('guidance')}</h4>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{t('advancedCfgScheduling')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400" title={t('cfgIntervalStartTooltip')}>{t('cfgIntervalStart')}</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={cfgIntervalStart}
                  onChange={(e) => setCfgIntervalStart(Number(e.target.value))}
                  className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400" title={t('cfgIntervalEndTooltip')}>{t('cfgIntervalEnd')}</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={cfgIntervalEnd}
                  onChange={(e) => setCfgIntervalEnd(Number(e.target.value))}
                  className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400" title={t('customTimestepsTooltip')}>{t('customTimesteps')}</label>
              <input
                type="text"
                value={customTimesteps}
                onChange={(e) => setCustomTimesteps(e.target.value)}
                placeholder={t('timestepsPlaceholder')}
                className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400" title={t('scoreScaleTooltip')}>{t('scoreScale')}</label>
                <input
                  type="number"
                  step="0.05"
                  value={scoreScale}
                  onChange={(e) => setScoreScale(Number(e.target.value))}
                  className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400" title={t('lmBatchChunkSizeTooltip')}>{t('lmBatchChunkSize')}</label>
                <input
                  type="number"
                  min="1"
                  value={lmBatchChunkSize}
                  onChange={(e) => setLmBatchChunkSize(Number(e.target.value))}
                  className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t('trackName')}</label>
              <input
                type="text"
                value={trackName}
                onChange={(e) => setTrackName(e.target.value)}
                placeholder={t('optionalTrackName')}
                className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t('completeTrackClasses')}</label>
              <input
                type="text"
                value={completeTrackClasses}
                onChange={(e) => setCompleteTrackClasses(e.target.value)}
                placeholder={t('trackClassesPlaceholder')}
                className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label
                className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400"
                title={t('useAdgTooltip')}
              >
                <input type="checkbox" checked={useAdg} onChange={() => setUseAdg(!useAdg)} />
                {t('useAdg')}
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400" title={t('allowLmBatchTooltip')}>
                <input type="checkbox" checked={allowLmBatch} onChange={() => setAllowLmBatch(!allowLmBatch)} />
                {t('allowLmBatch')}
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400" title={t('useCotMetadataTooltip')}>
                <input type="checkbox" checked={useCotMetas} onChange={() => setUseCotMetas(!useCotMetas)} />
                {t('useCotMetas')}
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400" title={t('useCotCaptionTooltip')}>
                <input type="checkbox" checked={useCotCaption} onChange={() => setUseCotCaption(!useCotCaption)} />
                {t('useCotCaption')}
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400" title={t('useCotLanguageTooltip')}>
                <input type="checkbox" checked={useCotLanguage} onChange={() => setUseCotLanguage(!useCotLanguage)} />
                {t('useCotLanguage')}
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400" title={t('autogenHint')}>
                <input type="checkbox" checked={autogen} onChange={() => setAutogen(!autogen)} />
                {t('autogen')}
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400" title={t('constrainedDecodingDebugTooltip')}>
                <input type="checkbox" checked={constrainedDecodingDebug} onChange={() => setConstrainedDecodingDebug(!constrainedDecodingDebug)} />
                {t('constrainedDecodingDebug')}
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400" title={t('formatCaptionTooltip')}>
                <input type="checkbox" checked={isFormatCaption} onChange={() => setIsFormatCaption(!isFormatCaption)} />
                {t('formatCaption')}
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400" title={t('getScoresTooltip')}>
                <input type="checkbox" checked={getScores} onChange={() => setGetScores(!getScores)} />
                {t('getScores')}
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400" title={t('getLrcTooltip')}>
                <input type="checkbox" checked={getLrc} onChange={() => setGetLrc(!getLrc)} />
                {t('getLrcLyrics')}
              </label>
            </div>
          </div>
        )}
      </div>

      {showAudioModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { setShowAudioModal(false); setPlayingTrackId(null); setPlayingTrackSource(null); }}
          />
          <div className="relative w-[92%] max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">
                    {audioModalTarget === 'reference' ? t('referenceModalTitle') : t('coverModalTitle')}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {audioModalTarget === 'reference'
                      ? t('referenceModalDescription')
                      : t('coverModalDescription')}
                  </p>
                </div>
                <button
                  onClick={() => { setShowAudioModal(false); setPlayingTrackId(null); setPlayingTrackSource(null); }}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Upload Button */}
              <button
                type="button"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.mp3,.wav,.flac,.m4a,.mp4,audio/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) void uploadReferenceTrack(file);
                  };
                  input.click();
                }}
                disabled={isUploadingReference || isTranscribingReference}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 dark:border-white/20 bg-zinc-50 dark:bg-white/5 px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10 hover:border-zinc-400 dark:hover:border-white/30 transition-all"
              >
                {isUploadingReference ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    {t('uploadingAudio')}
                  </>
                ) : isTranscribingReference ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    {t('transcribing')}
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    {t('uploadAudio')}
                    <span className="text-xs text-zinc-400 ml-1">{t('audioFormats')}</span>
                  </>
                )}
              </button>

              {uploadError && (
                <div className="mt-2 text-xs text-rose-500">{uploadError}</div>
              )}
              {isTranscribingReference && (
                <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
                  <span>{t('transcribingWithWhisper')}</span>
                  <button
                    type="button"
                    onClick={cancelTranscription}
                    className="text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                  >
                    {t('cancel')}
                  </button>
                </div>
              )}
            </div>

            {/* Library Section */}
            <div className="border-t border-zinc-100 dark:border-white/5">
              <div className="px-5 py-3 flex items-center gap-2">
                <div className="flex items-center gap-1 bg-zinc-200/60 dark:bg-white/10 rounded-full p-0.5">
                  <button
                    type="button"
                    onClick={() => setLibraryTab('uploads')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${libraryTab === 'uploads'
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                      }`}
                  >
                    {t('uploaded')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLibraryTab('created')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${libraryTab === 'created'
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                      }`}
                  >
                    {t('createdTab')}
                  </button>
                </div>
              </div>

              {/* Track List */}
              <div className="max-h-[280px] overflow-y-auto">
                {libraryTab === 'uploads' ? (
                  isLoadingTracks ? (
                    <div className="px-5 py-8 text-center">
                      <RefreshCw size={20} className="animate-spin mx-auto text-zinc-400" />
                      <p className="text-xs text-zinc-400 mt-2">{t('loadingTracks')}</p>
                    </div>
                  ) : referenceTracks.length === 0 ? (
                    <div className="px-5 py-8 text-center">
                      <Music2 size={24} className="mx-auto text-zinc-300 dark:text-zinc-600" />
                      <p className="text-sm text-zinc-400 mt-2">{t('noTracksYet')}</p>
                      <p className="text-xs text-zinc-400 mt-1">{t('uploadAudioFilesAsReferences')}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-white/5">
                      {referenceTracks.map((track) => (
                        <div
                          key={track.id}
                          className="px-5 py-3 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors group"
                        >
                          {/* Play Button */}
                          <button
                            type="button"
                            onClick={() => toggleModalTrack({ id: track.id, audio_url: track.audio_url, source: 'uploads' })}
                            className="flex-shrink-0 w-9 h-9 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-white/20 transition-colors"
                          >
                            {playingTrackId === track.id && playingTrackSource === 'uploads' ? (
                              <Pause size={14} fill="currentColor" />
                            ) : (
                              <Play size={14} fill="currentColor" className="ml-0.5" />
                            )}
                          </button>

                          {/* Track Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                {track.filename.replace(/\.[^/.]+$/, '')}
                              </span>
                              {track.tags && track.tags.length > 0 && (
                                <div className="flex gap-1">
                                  {track.tags.slice(0, 2).map((tag, i) => (
                                    <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-200 dark:bg-white/10 text-zinc-600 dark:text-zinc-400">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            {/* Progress bar with seek - show when this track is playing */}
                            {playingTrackId === track.id && playingTrackSource === 'uploads' ? (
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] text-zinc-400 tabular-nums w-8">
                                  {formatTime(modalTrackTime)}
                                </span>
                                <div
                                  className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-white/10 cursor-pointer group/seek"
                                  onClick={(e) => {
                                    if (modalAudioRef.current && modalTrackDuration > 0) {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const percent = (e.clientX - rect.left) / rect.width;
                                      modalAudioRef.current.currentTime = percent * modalTrackDuration;
                                    }
                                  }}
                                >
                                  <div
                                    className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full relative"
                                    style={{ width: modalTrackDuration > 0 ? `${(modalTrackTime / modalTrackDuration) * 100}%` : '0%' }}
                                  >
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-md opacity-0 group-hover/seek:opacity-100 transition-opacity" />
                                  </div>
                                </div>
                                <span className="text-[10px] text-zinc-400 tabular-nums w-8 text-right">
                                  {formatTime(modalTrackDuration)}
                                </span>
                              </div>
                            ) : (
                              <div className="text-xs text-zinc-400 mt-0.5">
                                {track.duration ? formatTime(track.duration) : '--:--'}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => useReferenceTrack({ audio_url: track.audio_url, title: track.filename })}
                              className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
                            >
                              {t('useTrack')}
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteReferenceTrack(track.id)}
                              className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-400 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : createdTrackOptions.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <Music2 size={24} className="mx-auto text-zinc-300 dark:text-zinc-600" />
                    <p className="text-sm text-zinc-400 mt-2">{t('noCreatedSongsYet')}</p>
                    <p className="text-xs text-zinc-400 mt-1">{t('generateSongsToReuse')}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-white/5">
                    {createdTrackOptions.map((track) => (
                      <div
                        key={track.id}
                        className="px-5 py-3 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors group"
                      >
                        <button
                          type="button"
                          onClick={() => toggleModalTrack({ id: track.id, audio_url: track.audio_url, source: 'created' })}
                          className="flex-shrink-0 w-9 h-9 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-white/20 transition-colors"
                        >
                          {playingTrackId === track.id && playingTrackSource === 'created' ? (
                            <Pause size={14} fill="currentColor" />
                          ) : (
                            <Play size={14} fill="currentColor" className="ml-0.5" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                            {track.title}
                          </div>
                          {playingTrackId === track.id && playingTrackSource === 'created' ? (
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] text-zinc-400 tabular-nums w-8">
                                {formatTime(modalTrackTime)}
                              </span>
                              <div
                                className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-white/10 cursor-pointer group/seek"
                                onClick={(e) => {
                                  if (modalAudioRef.current && modalTrackDuration > 0) {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const percent = (e.clientX - rect.left) / rect.width;
                                    modalAudioRef.current.currentTime = percent * modalTrackDuration;
                                  }
                                }}
                              >
                                <div
                                  className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full relative"
                                  style={{ width: modalTrackDuration > 0 ? `${(modalTrackTime / modalTrackDuration) * 100}%` : '0%' }}
                                >
                                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-md opacity-0 group-hover/seek:opacity-100 transition-opacity" />
                                </div>
                              </div>
                              <span className="text-[10px] text-zinc-400 tabular-nums w-8 text-right">
                                {formatTime(modalTrackDuration)}
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs text-zinc-400 mt-0.5">
                              {track.duration || '--:--'}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => useReferenceTrack({ audio_url: track.audio_url, title: track.title })}
                            className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
                          >
                            {t('useTrack')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Hidden audio element for modal playback */}
            <audio
              ref={modalAudioRef}
              onTimeUpdate={() => {
                if (modalAudioRef.current) {
                  setModalTrackTime(modalAudioRef.current.currentTime);
                }
              }}
              onLoadedMetadata={() => {
                if (modalAudioRef.current) {
                  setModalTrackDuration(modalAudioRef.current.duration);
                  // Update track duration in database if not set
                  const track = referenceTracks.find(t => t.id === playingTrackId);
                  if (playingTrackSource === 'uploads' && track && !track.duration && token) {
                    fetch(`/api/reference-tracks/${track.id}`, {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                      },
                      body: JSON.stringify({ duration: Math.round(modalAudioRef.current.duration) })
                    }).then(() => {
                      setReferenceTracks(prev => prev.map(t =>
                        t.id === track.id ? { ...t, duration: Math.round(modalAudioRef.current?.duration || 0) } : t
                      ));
                    }).catch(() => undefined);
                  }
                }
              }}
              onEnded={() => setPlayingTrackId(null)}
            />
          </div>
        </div>
      )}

      {/* Footer Create Button */}
      <div className="p-4 mt-auto sticky bottom-0 bg-zinc-50/95 dark:bg-suno-panel/95 backdrop-blur-sm z-10 border-t border-zinc-200 dark:border-white/5 space-y-3">
        <button
          onClick={handleGenerate}
          className="w-full h-12 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-lg hover:brightness-110"
          disabled={!isAuthenticated}
        >
          <Sparkles size={18} />
          <span>
            {activeJobCount > 0
              ? t('queueNext')
              : bulkCount > 1
                ? `${t('createButton')} ${bulkCount} ${t('jobs')} (${bulkCount * batchSize} ${t('variations')})`
                : `${t('createButton')}${batchSize > 1 ? ` (${batchSize} ${t('variations')})` : ''}`
            }
          </span>
        </button>
      </div>
    </div>
  );
};
