/**
 * Audio analysis route — runs Essentia CLI to extract BPM and key from source audio.
 */
import { Router, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';

const router = Router();

const AUDIO_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../public/audio');

/** Resolve a frontend audio URL (e.g. `/audio/xxx.mp3`) to an absolute file path. */
const resolveAudioPath = (audioUrl: string): string => {
    if (audioUrl.startsWith('/audio/')) {
        return path.join(AUDIO_DIR, audioUrl.replace('/audio/', ''));
    }
    if (audioUrl.startsWith('http')) {
        try {
            const parsed = new URL(audioUrl);
            if (parsed.pathname.startsWith('/audio/')) {
                return path.join(AUDIO_DIR, parsed.pathname.replace('/audio/', ''));
            }
        } catch {
            // fall through
        }
    }
    return audioUrl;
};

// Path to Essentia binary — resolve relative to the project root
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const ESSENTIA_BIN = path.join(PROJECT_ROOT, 'Essentia', 'essentia_streaming_extractor_music.exe');

/**
 * POST /api/analyze
 * Body: { audioUrl: string }
 * Returns: { bpm: number, key: string, scale: string } or error
 */
router.post('/', async (req: Request, res: Response) => {
    const { audioUrl } = req.body;
    if (!audioUrl) {
        return res.status(400).json({ error: 'audioUrl is required' });
    }

    const audioPath = resolveAudioPath(audioUrl);

    // Verify the file exists
    try {
        await fs.access(audioPath);
    } catch {
        return res.status(404).json({ error: `Audio file not found: ${audioPath}` });
    }

    // Create temp output file for Essentia
    const tmpFile = path.join(os.tmpdir(), `essentia_${Date.now()}.json`);

    try {
        // Run Essentia CLI
        const result = await new Promise<string>((resolve, reject) => {
            execFile(
                ESSENTIA_BIN,
                [audioPath, tmpFile],
                { timeout: 120_000, maxBuffer: 10 * 1024 * 1024 },
                (error, _stdout, stderr) => {
                    // Essentia writes info to stderr even on success — check if output file exists
                    if (error && !error.killed) {
                        // Check if the file was created despite the "error"
                        fs.access(tmpFile).then(() => resolve('ok')).catch(() => reject(error));
                    } else {
                        resolve('ok');
                    }
                }
            );
        });

        // Parse the JSON output
        const raw = await fs.readFile(tmpFile, 'utf-8');
        const data = JSON.parse(raw);

        const bpm = Math.round(data?.rhythm?.bpm ?? 0);
        const keyData = data?.tonal?.key_edma ?? {};
        const key = keyData.key ?? '';
        const scale = keyData.scale ?? '';

        // Cleanup temp file
        fs.unlink(tmpFile).catch(() => { });

        console.log(`[analyze] BPM: ${bpm}, Key: ${key} ${scale} (from ${path.basename(audioPath)})`);

        return res.json({ bpm, key, scale });
    } catch (err: any) {
        // Cleanup temp file on error
        fs.unlink(tmpFile).catch(() => { });
        console.error('[analyze] Essentia failed:', err.message || err);
        return res.status(500).json({ error: `Analysis failed: ${err.message || 'Unknown error'}` });
    }
});

export default router;
