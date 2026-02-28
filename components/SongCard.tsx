import React, { useState, useRef, useEffect } from 'react';
import { Song } from '../types';
import { Play, Pause, ThumbsUp, MoreHorizontal, Lock, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { SongDropdownMenu } from './SongDropdownMenu';
import { ShareModal } from './ShareModal';
import { AlbumCover } from './AlbumCover';
import { songsApi } from '../services/api';

// Map model ID to short display name
const getModelDisplayName = (modelId?: string): string => {
    if (!modelId) return 'v1.5';
    const mapping: Record<string, string> = {
        'acestep-v15-base': '1.5B',
        'acestep-v15-sft': '1.5S',
        'acestep-v15-merge-base-sft-0.5': '1.5M',
        'acestep-v15-turbo-shift3': '1.5TS3',
        'acestep-v15-turbo-continuous': '1.5TC',
        'acestep-v15-turbo': '1.5T',
    };
    return mapping[modelId] || 'v1.5';
};

export interface SongCardProps {
    song: Song;
    isCurrent: boolean;
    isSelected: boolean;
    isSelectionMode: boolean;
    isChecked: boolean;
    isLiked: boolean;
    isPlaying: boolean;
    isOwner: boolean;
    onPlay: () => void;
    onSelect: () => void;
    onToggleSelect: () => void;
    onToggleLike: () => void;
    onAddToPlaylist: () => void;
    onOpenVideo?: () => void;
    onShowDetails?: () => void;
    onNavigateToProfile?: (username: string) => void;
    onReusePrompt?: () => void;
    onDelete?: () => void;
    onSongUpdate?: (updatedSong: Song) => void;
    onUseAsReference?: () => void;
    onCoverSong?: () => void;
    onDownloadFormat?: () => void;
}

export const SongCard: React.FC<SongCardProps> = ({
    song,
    isCurrent,
    isSelected,
    isSelectionMode,
    isChecked,
    isLiked,
    isPlaying,
    isOwner,
    onPlay,
    onSelect,
    onToggleSelect,
    onToggleLike,
    onAddToPlaylist,
    onOpenVideo,
    onShowDetails,
    onNavigateToProfile,
    onReusePrompt,
    onDelete,
    onSongUpdate,
    onUseAsReference,
    onCoverSong,
    onDownloadFormat
}) => {
    const { token } = useAuth();
    const { t } = useI18n();
    const [showDropdown, setShowDropdown] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState(song.title);
    const titleInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
            titleInputRef.current.select();
        }
    }, [isEditingTitle]);

    const handleSaveTitle = async () => {
        if (!token || !isOwner || !editedTitle.trim() || editedTitle === song.title) {
            setIsEditingTitle(false);
            setEditedTitle(song.title);
            return;
        }
        try {
            const response = await songsApi.updateSong(song.id, { title: editedTitle.trim() }, token);
            setIsEditingTitle(false);
            if (onSongUpdate && response.song) onSongUpdate(response.song);
        } catch {
            setEditedTitle(song.title);
            setIsEditingTitle(false);
        }
    };

    const formatDate = () => {
        if (!song.createdAt) return null;
        const d = song.createdAt instanceof Date ? song.createdAt : new Date(song.createdAt);
        if (isNaN(d.getTime())) return null;
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
        const isYesterday = d.toDateString() === yesterday.toDateString();
        const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (isToday) return time;
        if (isYesterday) return `Yesterday ${time}`;
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <>
            <div
                onClick={onSelect}
                className={`group relative flex flex-col rounded-xl overflow-hidden cursor-pointer transition-all border ${isSelected
                    ? 'bg-zinc-100 dark:bg-[#18181b] border-zinc-300 dark:border-white/15 ring-1 ring-pink-500/30'
                    : 'border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10 bg-white dark:bg-[#0c0c0e] hover:bg-zinc-50 dark:hover:bg-[#18181b]'
                    }`}
            >
                {/* Selection checkbox */}
                {isSelectionMode && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
                        className={`absolute top-2 left-2 z-10 w-5 h-5 rounded border flex items-center justify-center transition-colors ${isChecked
                            ? 'bg-pink-600 border-pink-600 text-white'
                            : 'border-white/50 bg-black/30 backdrop-blur-sm text-transparent hover:border-white/80'
                            }`}
                    >
                        {isChecked && <span className="text-[10px] font-bold">✓</span>}
                    </button>
                )}

                {/* Album Art */}
                <div className="relative aspect-square overflow-hidden">
                    {(!song.coverUrl || imageError) ? (
                        <AlbumCover seed={song.id || song.title} size="full" className={`w-full h-full ${song.isGenerating ? 'opacity-20 blur-sm' : ''}`} />
                    ) : (
                        <img
                            src={song.coverUrl}
                            alt={song.title}
                            className={`w-full h-full object-cover transition-opacity ${song.isGenerating ? 'opacity-20 blur-sm' : ''}`}
                            onError={() => setImageError(true)}
                        />
                    )}

                    {/* Model badge */}
                    <span className="absolute top-2 right-2 inline-flex items-center text-[9px] font-bold text-white bg-gradient-to-r from-pink-500 to-purple-500 px-1.5 py-0.5 rounded-sm shadow-sm z-10">
                        {getModelDisplayName(song.ditModel)}
                    </span>

                    {/* Private badge */}
                    {song.isPublic === false && (
                        <Lock size={10} className="absolute top-2 right-14 text-white/70 z-10" />
                    )}

                    {/* Generating overlay */}
                    {song.isGenerating ? (
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1">
                            {song.queuePosition ? (
                                <>
                                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                        <Clock size={20} className="text-amber-400" />
                                    </div>
                                    <span className="text-[11px] font-medium text-amber-400">Queue #{song.queuePosition}</span>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-end gap-1 h-8">
                                        <div className="w-1.5 bg-pink-500 rounded-full music-bar-anim" style={{ animationDelay: '0.0s' }} />
                                        <div className="w-1.5 bg-pink-500 rounded-full music-bar-anim" style={{ animationDelay: '0.2s' }} />
                                        <div className="w-1.5 bg-pink-500 rounded-full music-bar-anim" style={{ animationDelay: '0.4s' }} />
                                        <div className="w-1.5 bg-pink-500 rounded-full music-bar-anim" style={{ animationDelay: '0.1s' }} />
                                    </div>
                                    {song.progress !== undefined && (
                                        <div className="w-3/4 mt-1">
                                            <div className="h-1 rounded-full bg-white/20 overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-pink-500 to-purple-600"
                                                    style={{ width: `${Math.min(100, Math.max(0, ((song.progress > 1 ? song.progress / 100 : song.progress)) * 100))}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        /* Play overlay on hover */
                        <div
                            className={`absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px] cursor-pointer transition-opacity duration-200 ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`}
                            onClick={(e) => { e.stopPropagation(); onPlay(); }}
                        >
                            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg transform transition-transform hover:scale-110">
                                {isCurrent && isPlaying ? (
                                    <Pause fill="black" className="text-black w-6 h-6" />
                                ) : (
                                    <Play fill="black" className="text-black ml-1 w-6 h-6" />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Duration badge */}
                    {!song.isGenerating && song.duration && (
                        <span className="absolute bottom-2 right-2 text-[10px] font-mono text-white bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded z-10">
                            {song.duration}
                        </span>
                    )}
                </div>

                {/* Card Info */}
                <div className="px-3 pt-2.5 pb-3 flex flex-col gap-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                        <div className="flex-1 min-w-0">
                            {isEditingTitle && isOwner ? (
                                <input
                                    ref={titleInputRef}
                                    type="text"
                                    value={editedTitle}
                                    onChange={(e) => setEditedTitle(e.target.value)}
                                    onBlur={handleSaveTitle}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveTitle();
                                        if (e.key === 'Escape') { setEditedTitle(song.title); setIsEditingTitle(false); }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="font-bold text-sm bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-pink-500 focus:outline-none text-zinc-900 dark:text-white w-full"
                                />
                            ) : (
                                <h3
                                    className={`font-bold text-sm truncate ${isCurrent ? 'text-pink-600 dark:text-pink-500' : 'text-zinc-900 dark:text-white'} ${isOwner ? 'cursor-pointer hover:underline' : ''}`}
                                    onClick={(e) => {
                                        if (isOwner && !song.isGenerating) { e.stopPropagation(); setIsEditingTitle(true); }
                                    }}
                                >
                                    {song.title || (song.isGenerating ? 'Creating...' : 'Untitled')}
                                </h3>
                            )}
                        </div>
                    </div>

                    {/* Creator */}
                    <div
                        className="flex items-center gap-1 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); if (song.creator && onNavigateToProfile) onNavigateToProfile(song.creator); }}
                    >
                        <div className="w-3.5 h-3.5 rounded-full bg-purple-500 text-[7px] flex items-center justify-center font-bold text-white flex-shrink-0">
                            {(song.creator?.[0] || 'U').toUpperCase()}
                        </div>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate hover:underline">
                            {song.creator || 'Unknown'}
                        </span>
                    </div>

                    {/* Style tags */}
                    {song.style && (
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-600 line-clamp-1">
                            {song.style}
                        </p>
                    )}

                    {/* Bottom row: like + date + menu */}
                    {!song.isGenerating && (
                        <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-1">
                                <button
                                    className={`p-1 rounded-md transition-colors ${isLiked ? 'text-pink-600 dark:text-pink-500' : 'text-zinc-400 hover:text-pink-600'}`}
                                    onClick={(e) => { e.stopPropagation(); onToggleLike(); }}
                                >
                                    <ThumbsUp size={12} fill={isLiked ? 'currentColor' : 'none'} />
                                </button>
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-600">
                                    {formatDate()}
                                </span>
                            </div>

                            <div className="relative">
                                <button
                                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                    onClick={(e) => { e.stopPropagation(); setShowDropdown(!showDropdown); }}
                                >
                                    <MoreHorizontal size={14} />
                                </button>
                                <SongDropdownMenu
                                    song={song}
                                    isOpen={showDropdown}
                                    onClose={() => setShowDropdown(false)}
                                    isOwner={isOwner}
                                    onCreateVideo={() => onOpenVideo?.(song)}
                                    onReusePrompt={onReusePrompt ? () => onReusePrompt?.(song) : undefined}
                                    onAddToPlaylist={() => onAddToPlaylist?.(song)}
                                    onDelete={() => onDelete?.(song)}
                                    onShare={() => setShareModalOpen(true)}
                                    onUseAsReference={() => onUseAsReference?.()}
                                    onCoverSong={() => onCoverSong?.()}
                                    onDownloadFormat={() => onDownloadFormat?.()}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ShareModal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                song={song}
            />
        </>
    );
};
