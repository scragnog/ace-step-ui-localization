import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const router = Router();

const ACESTEP_API_URL = process.env.ACESTEP_API_URL || 'http://127.0.0.1:8001';
const ACESTEP_API_KEY = process.env.ACESTEP_API_KEY || '';

async function proxyToAceStep(endpoint: string, method: string, data?: any) {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (ACESTEP_API_KEY) {
      headers['x-api-key'] = ACESTEP_API_KEY;
      headers['Authorization'] = `Bearer ${ACESTEP_API_KEY}`;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${ACESTEP_API_URL}${endpoint}`, options);

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({ error: 'Request failed' }));
      const detail = errorData?.detail;
      const detailMsg = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: any) => d?.msg || JSON.stringify(d)).join('; ')
          : undefined;
      throw new Error(errorData?.error || errorData?.message || detailMsg || 'Request failed');
    }

    const result = await response.json();

    if (result && typeof result === 'object') {
      if ('code' in result && result.code && result.code !== 200) {
        throw new Error(result.error || result.message || 'Request failed');
      }
      if ('data' in result) {
        return result.data;
      }
    }
    return result;
  } catch (error: any) {
    throw new Error(error.message || 'Request failed');
  }
}

// Open native folder picker dialog (Windows)
router.get('/browse-folder', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const psScript = `
      Add-Type -AssemblyName System.Windows.Forms
      $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
      $dialog.Description = 'Select adapter folder'
      $dialog.ShowNewFolderButton = $false
      $topmost = New-Object System.Windows.Forms.Form
      $topmost.TopMost = $true
      if ($dialog.ShowDialog($topmost) -eq 'OK') {
        Write-Output $dialog.SelectedPath
      }
      $topmost.Dispose()
    `.trim();

    const result = execSync(
      `powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, '; ')}"`,
      { encoding: 'utf-8', timeout: 60000 }
    ).trim();

    res.json({ folder: result || '' });
  } catch (error: any) {
    // User cancelled or timeout
    res.json({ folder: '' });
  }
});

// List .safetensors files in a folder
router.get('/list-files', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const folder = req.query.folder as string;
    if (!folder) {
      return res.status(400).json({ error: 'folder query parameter is required' });
    }

    if (!fs.existsSync(folder)) {
      return res.status(404).json({ error: `Folder not found: ${folder}` });
    }

    const stat = fs.statSync(folder);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: `Not a directory: ${folder}` });
    }

    const files: Array<{ name: string; path: string; size: number; type: string }> = [];
    const entries = fs.readdirSync(folder);

    for (const entry of entries) {
      const fullPath = path.join(folder, entry);
      try {
        const entryStat = fs.statSync(fullPath);

        if (entry.endsWith('.safetensors') && entryStat.isFile()) {
          // Standalone safetensors file (LoKr)
          files.push({
            name: path.basename(entry, '.safetensors'),
            path: fullPath,
            size: entryStat.size,
            type: 'lokr',
          });
        } else if (entryStat.isDirectory()) {
          // Check for PEFT adapter directory
          const configPath = path.join(fullPath, 'adapter_config.json');
          const stFiles = fs.readdirSync(fullPath).filter(f => f.endsWith('.safetensors'));
          if (fs.existsSync(configPath) || stFiles.length > 0) {
            const dirSize = stFiles.reduce((sum, f) => {
              try { return sum + fs.statSync(path.join(fullPath, f)).size; } catch { return sum; }
            }, 0);
            files.push({
              name: entry,
              path: fullPath,
              size: dirSize,
              type: fs.existsSync(configPath) ? 'lora' : 'lokr',
            });
          }
        }
      } catch {
        // Skip files we can't stat
      }
    }

    res.json({ files, folder });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/load', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await proxyToAceStep('/v1/lora/load', 'POST', req.body);
    res.json(result || { message: 'LoRA loaded' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/unload', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await proxyToAceStep('/v1/lora/unload', 'POST', req.body);
    res.json(result || { message: 'LoRA unloaded' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/toggle', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await proxyToAceStep('/v1/lora/toggle', 'POST', req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/scale', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await proxyToAceStep('/v1/lora/scale', 'POST', req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Group scales (all slots)
router.post('/group-scales', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await proxyToAceStep('/v1/lora/group-scales', 'POST', req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Per-slot group scales
router.post('/slot-group-scales', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await proxyToAceStep('/v1/lora/slot-group-scales', 'POST', req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Per-slot layer scales (batch)
router.post('/slot-layer-scales', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await proxyToAceStep('/v1/lora/slot-layer-scales', 'POST', req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Per-slot single layer scale
router.post('/slot-layer-scale', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await proxyToAceStep('/v1/lora/slot-layer-scale', 'POST', req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Temporal adapter schedule
router.post('/temporal-schedule', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await proxyToAceStep('/v1/lora/temporal-schedule', 'POST', req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Audio diff for layer ablation experiments
router.post('/audio-diff', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await proxyToAceStep('/v1/audio/diff', 'POST', req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/status', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await proxyToAceStep('/v1/lora/status', 'GET');
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── LM LoRA (PEFT adapter on the 5Hz language model) ────────────────

router.post('/lm-load', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await proxyToAceStep('/v1/lm-lora/load', 'POST', req.body);
    res.json(result || { message: 'LM LoRA loaded' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/lm-unload', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await proxyToAceStep('/v1/lm-lora/unload', 'POST', {});
    res.json(result || { message: 'LM LoRA unloaded' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/lm-scale', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await proxyToAceStep('/v1/lm-lora/scale', 'POST', req.body);
    res.json(result || { message: 'LM LoRA scale updated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

