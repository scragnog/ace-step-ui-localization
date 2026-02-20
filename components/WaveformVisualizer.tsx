import React, { useEffect, useRef, useState } from 'react';

interface WaveformVisualizerProps {
  audioUrl: string | null;
  currentTime: number;
  duration: number;
  progressBarRef?: React.RefObject<HTMLDivElement>;
  onSeek: (time: number) => void;
}

interface WaveformData {
  peaks: number[];
  length: number;
}

// Module-level cache: URL → peaks.  Keeps at most N entries to bound memory.
const WAVEFORM_CACHE_MAX = 30;
const waveformCache = new Map<string, WaveformData>();
function cacheSet(url: string, data: WaveformData) {
  if (waveformCache.size >= WAVEFORM_CACHE_MAX) {
    // Evict oldest entry
    const firstKey = waveformCache.keys().next().value;
    if (firstKey) waveformCache.delete(firstKey);
  }
  waveformCache.set(url, data);
}

// Shared AudioContext — reused across all instances / re-renders
let sharedAudioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedAudioCtx;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  audioUrl,
  currentTime,
  duration,
  progressBarRef,
  onSeek,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Generate waveform data from audio file
  useEffect(() => {
    if (!audioUrl) {
      setWaveformData(null);
      return;
    }

    // Check cache first
    const cached = waveformCache.get(audioUrl);
    if (cached) {
      setWaveformData(cached);
      setIsLoading(false);
      return;
    }

    // Abort any previous in-flight fetch
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);

    const audioContext = getAudioContext();

    fetch(audioUrl, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch audio');
        return response.arrayBuffer();
      })
      .then(arrayBuffer => {
        if (controller.signal.aborted) return;
        return audioContext.decodeAudioData(arrayBuffer);
      })
      .then(audioBuffer => {
        if (!audioBuffer || controller.signal.aborted) return;

        const channelData = audioBuffer.getChannelData(0);
        const samples = Math.min(800, Math.floor(canvasRef.current?.clientWidth || 600));
        const blockSize = Math.floor(channelData.length / samples);
        const peaks: number[] = [];

        for (let i = 0; i < samples; i++) {
          let peak = 0;
          for (let j = 0; j < blockSize; j++) {
            const sample = Math.abs(channelData[i * blockSize + j] || 0);
            if (sample > peak) peak = sample;
          }
          peaks.push(peak);
        }

        // audioBuffer is now only referenced locally — it will be GC'd
        // We only keep the tiny peaks array
        const data: WaveformData = { peaks, length: audioBuffer.duration };
        cacheSet(audioUrl, data);
        if (!controller.signal.aborted) {
          setWaveformData(data);
          setIsLoading(false);
        }
      })
      .catch(error => {
        if (error?.name === 'AbortError') return; // Expected — ignore
        console.error('Failed to generate waveform:', error);
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [audioUrl]);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;

    // Dynamic bar spacing — fills the full canvas width
    const totalBars = waveformData.peaks.length;
    const step = width / totalBars;
    const barWidth = Math.max(1, step * 0.65);
    const playedPercent = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
    const playedPixelWidth = playedPercent * width;

    const parentEl = canvas.parentElement;
    const isDarkMode = parentEl ? window.getComputedStyle(parentEl).backgroundColor.includes('28') ||
      document.documentElement.classList.contains('dark') : false;

    ctx.clearRect(0, 0, width, height);

    waveformData.peaks.forEach((peak, index) => {
      const smoothedPeak = index > 0 && index < totalBars - 1
        ? (peak + waveformData.peaks[index - 1] + waveformData.peaks[index + 1]) / 3
        : peak;

      const barHeight = Math.max(3, smoothedPeak * (height - 8));
      const x = index * step;

      const barCenterX = x + barWidth / 2;
      const isPlayed = barCenterX <= playedPixelWidth;

      if (isPlayed) {
        const gradient = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2);
        gradient.addColorStop(0, '#f43f5e');
        gradient.addColorStop(0.5, '#ec4899');
        gradient.addColorStop(1, '#f43f5e');
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = isDarkMode ? 'rgba(160, 160, 170, 0.4)' : 'rgba(100, 100, 110, 0.35)';
      }

      const barH = Math.min(barHeight, height - 4);
      const y = centerY - barH / 2;

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, 1);
      ctx.fill();
    });
  }, [waveformData, currentTime, duration]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!duration) return;

    const container = progressBarRef?.current || canvasRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    onSeek(percent * duration);
  };

  if (isLoading || !waveformData) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-full h-0.5 bg-zinc-300/20 dark:bg-zinc-600/20" />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className="w-full h-full cursor-pointer"
      style={{ width: '100%', height: '100%' }}
    />
  );
};
