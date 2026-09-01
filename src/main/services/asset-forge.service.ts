import * as fs from 'fs';
import * as path from 'path';
import { nativeImage } from 'electron';
import { logger } from '../utils/logger';

export interface FaviconSuiteResult {
  success: boolean;
  generatedFiles: string[];
  targetDir: string;
  message: string;
}

export interface ImageConversionResult {
  success: boolean;
  outputPath: string;
  originalSize: number;
  newSize: number;
  savedPercent: number;
  message: string;
}

export class AssetForgeService {
  async generateFaviconSuite(projectPath: string, sourceImagePath: string): Promise<FaviconSuiteResult> {
    const resolvedSource = path.isAbsolute(sourceImagePath)
      ? sourceImagePath
      : path.join(projectPath, sourceImagePath);

    if (!fs.existsSync(resolvedSource)) {
      return { success: false, generatedFiles: [], targetDir: '', message: 'Source image file not found: ' + sourceImagePath };
    }

    let targetDir = path.join(projectPath, 'public');
    if (!fs.existsSync(targetDir)) {
      if (fs.existsSync(path.join(projectPath, 'static'))) {
        targetDir = path.join(projectPath, 'static');
      } else if (fs.existsSync(path.join(projectPath, 'src', 'assets'))) {
        targetDir = path.join(projectPath, 'src', 'assets');
      } else {
        try {
          fs.mkdirSync(targetDir, { recursive: true });
        } catch {
          targetDir = projectPath;
        }
      }
    }

    try {
      const img = nativeImage.createFromPath(resolvedSource);
      if (img.isEmpty()) {
        return { success: false, generatedFiles: [], targetDir, message: 'Invalid or unsupported image format' };
      }

      const generatedFiles: string[] = [];

      const sizes = [
        { name: 'favicon-16x16.png', size: 16 },
        { name: 'favicon-32x32.png', size: 32 },
        { name: 'apple-touch-icon.png', size: 180 },
        { name: 'android-chrome-192x192.png', size: 192 },
        { name: 'android-chrome-512x512.png', size: 512 }
      ];

      for (const s of sizes) {
        const resized = img.resize({ width: s.size, height: s.size, quality: 'best' });
        const outPath = path.join(targetDir, s.name);
        fs.writeFileSync(outPath, resized.toPNG());
        generatedFiles.push(s.name);
      }

      // Write favicon.ico from 32x32 image
      const icoImg = img.resize({ width: 32, height: 32, quality: 'best' });
      const icoPath = path.join(targetDir, 'favicon.ico');
      fs.writeFileSync(icoPath, icoImg.toPNG());
      generatedFiles.push('favicon.ico');

      // Generate site.webmanifest
      const manifestPath = path.join(targetDir, 'site.webmanifest');
      const projectName = path.basename(projectPath);
      const manifest = {
        name: projectName,
        short_name: projectName,
        icons: [
          { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
        ],
        theme_color: '#ffffff',
        background_color: '#09090b',
        display: 'standalone'
      };
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
      generatedFiles.push('site.webmanifest');

      logger.info('[AssetForge] Generated favicon suite in ' + targetDir);
      return {
        success: true,
        generatedFiles,
        targetDir,
        message: 'Generated ' + generatedFiles.length + ' icons and manifest in ' + path.basename(targetDir)
      };
    } catch (err: any) {
      return { success: false, generatedFiles: [], targetDir, message: err.message };
    }
  }

  async convertImage(sourcePath: string, targetFormat: 'png' | 'jpeg', quality: number = 90): Promise<ImageConversionResult> {
    if (!fs.existsSync(sourcePath)) {
      return { success: false, outputPath: '', originalSize: 0, newSize: 0, savedPercent: 0, message: 'Source image not found' };
    }

    try {
      const origStats = fs.statSync(sourcePath);
      const img = nativeImage.createFromPath(sourcePath);
      if (img.isEmpty()) {
        return { success: false, outputPath: '', originalSize: origStats.size, newSize: 0, savedPercent: 0, message: 'Invalid image format' };
      }

      const parsed = path.parse(sourcePath);
      const outPath = path.join(parsed.dir, parsed.name + '-optimized.' + targetFormat);

      let buffer: Buffer;
      if (targetFormat === 'png') {
        buffer = img.toPNG();
      } else {
        buffer = img.toJPEG(quality);
      }

      fs.writeFileSync(outPath, buffer);
      const newSize = buffer.length;
      const savedPercent = origStats.size > 0 ? Math.round(((origStats.size - newSize) / origStats.size) * 100) : 0;

      return {
        success: true,
        outputPath: outPath,
        originalSize: origStats.size,
        newSize,
        savedPercent,
        message: 'Successfully optimized image (' + (savedPercent > 0 ? savedPercent + '% smaller' : 'Converted') + ')'
      };
    } catch (err: any) {
      return { success: false, outputPath: '', originalSize: 0, newSize: 0, savedPercent: 0, message: err.message };
    }
  }
}

export const assetForgeService = new AssetForgeService();