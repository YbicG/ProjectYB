import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AssetForgeService, assetForgeService } from '../src/main/services/asset-forge.service';

describe('AssetForgeService', () => {
  let service: AssetForgeService;
  let tempDir: string;
  let validImagePath: string;

  beforeEach(() => {
    service = new AssetForgeService();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'projectyb-asset-test-'));

    // Create a mock image file with valid bytes
    validImagePath = path.join(tempDir, 'source-logo.png');
    fs.writeFileSync(validImagePath, Buffer.alloc(1024, 'image-bytes'));
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {}
  });

  describe('generateFaviconSuite', () => {
    it('generates complete favicon suite and site.webmanifest in public directory', async () => {
      const projectDir = path.join(tempDir, 'web-app');
      fs.mkdirSync(projectDir, { recursive: true });

      const result = await service.generateFaviconSuite(projectDir, validImagePath);

      expect(result.success).toBe(true);
      expect(result.targetDir).toBe(path.join(projectDir, 'public'));
      expect(result.generatedFiles).toEqual([
        'favicon-16x16.png',
        'favicon-32x32.png',
        'apple-touch-icon.png',
        'android-chrome-192x192.png',
        'android-chrome-512x512.png',
        'favicon.ico',
        'site.webmanifest'
      ]);

      // Verify files exist on disk
      const targetDir = result.targetDir;
      for (const fileName of result.generatedFiles) {
        expect(fs.existsSync(path.join(targetDir, fileName))).toBe(true);
      }

      // Verify site.webmanifest structure
      const manifestRaw = fs.readFileSync(path.join(targetDir, 'site.webmanifest'), 'utf8');
      const manifest = JSON.parse(manifestRaw);
      expect(manifest.name).toBe('web-app');
      expect(manifest.short_name).toBe('web-app');
      expect(manifest.display).toBe('standalone');
      expect(manifest.icons.length).toBe(2);
      expect(manifest.icons[0].sizes).toBe('192x192');
      expect(manifest.icons[1].sizes).toBe('512x512');
    });

    it('falls back to static directory when static exists instead of public', async () => {
      const projectDir = path.join(tempDir, 'static-app');
      const staticDir = path.join(projectDir, 'static');
      fs.mkdirSync(staticDir, { recursive: true });

      const result = await service.generateFaviconSuite(projectDir, validImagePath);

      expect(result.success).toBe(true);
      expect(result.targetDir).toBe(staticDir);
      expect(fs.existsSync(path.join(staticDir, 'favicon.ico'))).toBe(true);
      expect(fs.existsSync(path.join(staticDir, 'site.webmanifest'))).toBe(true);
    });

    it('falls back to src/assets directory when src/assets exists', async () => {
      const projectDir = path.join(tempDir, 'spa-app');
      const assetsDir = path.join(projectDir, 'src', 'assets');
      fs.mkdirSync(assetsDir, { recursive: true });

      const result = await service.generateFaviconSuite(projectDir, validImagePath);

      expect(result.success).toBe(true);
      expect(result.targetDir).toBe(assetsDir);
      expect(fs.existsSync(path.join(assetsDir, 'favicon.ico'))).toBe(true);
    });

    it('returns error when source image file does not exist', async () => {
      const projectDir = path.join(tempDir, 'app');
      const missingImagePath = path.join(tempDir, 'does-not-exist.png');

      const result = await service.generateFaviconSuite(projectDir, missingImagePath);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Source image file not found');
      expect(result.generatedFiles).toEqual([]);
    });

    it('returns error when source image file is empty or invalid', async () => {
      const projectDir = path.join(tempDir, 'app');
      const emptyImagePath = path.join(tempDir, 'empty.png');
      fs.writeFileSync(emptyImagePath, Buffer.alloc(0));

      const result = await service.generateFaviconSuite(projectDir, emptyImagePath);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid or unsupported');
    });
  });

  describe('convertImage', () => {
    it('converts image to optimized PNG format', async () => {
      const result = await service.convertImage(validImagePath, 'png');

      expect(result.success).toBe(true);
      expect(result.outputPath).toContain('-optimized.png');
      expect(fs.existsSync(result.outputPath)).toBe(true);
      expect(result.newSize).toBeGreaterThan(0);
      expect(result.originalSize).toBe(1024);
    });

    it('converts image to optimized JPEG format with quality parameter', async () => {
      const result = await service.convertImage(validImagePath, 'jpeg', 85);

      expect(result.success).toBe(true);
      expect(result.outputPath).toContain('-optimized.jpeg');
      expect(fs.existsSync(result.outputPath)).toBe(true);
      expect(result.newSize).toBeGreaterThan(0);
      expect(result.message).toContain('Successfully optimized image');
    });

    it('handles non-existent image in convertImage', async () => {
      const missingPath = path.join(tempDir, 'ghost.jpg');
      const result = await service.convertImage(missingPath, 'png');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Source image not found');
    });

    it('handles empty image file in convertImage', async () => {
      const emptyPath = path.join(tempDir, 'empty.jpg');
      fs.writeFileSync(emptyPath, Buffer.alloc(0));

      const result = await service.convertImage(emptyPath, 'jpeg');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid image format');
    });
  });
});
