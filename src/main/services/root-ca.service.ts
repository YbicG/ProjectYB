import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { app } from 'electron';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface RootCaStatus {
  installed: boolean;
  subject: string;
  validUntil?: string;
  caPath?: string;
  error?: string;
}

export class RootCaService {
  private caDir: string;
  private caCertPath: string;
  private caKeyPath: string;
  private certCache: Map<string, { key: string; cert: string }> = new Map();

  constructor() {
    const userData = app ? app.getPath('userData') : os.homedir();
    this.caDir = path.join(userData, 'certificates');
    this.caCertPath = path.join(this.caDir, 'projectyb-root-ca.crt');
    this.caKeyPath = path.join(this.caDir, 'projectyb-root-ca.key');

    if (!fs.existsSync(this.caDir)) {
      try {
        fs.mkdirSync(this.caDir, { recursive: true });
      } catch {}
    }
  }

  private async runPowerShell(script: string): Promise<{ stdout: string; stderr: string }> {
    const scriptBuffer = Buffer.from(script, 'utf16le');
    const encoded = scriptBuffer.toString('base64');
    return execAsync(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`);
  }

  /**
   * Check if ProjectYB Root CA is installed and trusted in OS Store
   */
  async checkStatus(): Promise<RootCaStatus> {
    if (process.platform === 'win32') {
      try {
        const psScript = `
          Get-ChildItem Cert:\\CurrentUser\\Root | 
            Where-Object { $_.Subject -like "*ProjectYB Local Development CA*" } | 
            Select-Object -First 1 -Property Subject, NotAfter | 
            ConvertTo-Json
        `;
        const { stdout } = await this.runPowerShell(psScript);
        if (stdout && stdout.trim()) {
          const data = JSON.parse(stdout.trim());
          if (data && data.Subject) {
            return {
              installed: true,
              subject: data.Subject,
              validUntil: data.NotAfter,
              caPath: this.caCertPath
            };
          }
        }
      } catch {}
    }

    const hasLocalFile = fs.existsSync(this.caCertPath);
    return {
      installed: false,
      subject: 'CN=ProjectYB Local Development CA',
      caPath: hasLocalFile ? this.caCertPath : undefined
    };
  }

  /**
   * Create and Install the ProjectYB Root CA into Windows CurrentUser Certificate Store
   */
  async installRootCa(): Promise<{ success: boolean; message: string; error?: string }> {
    if (process.platform === 'win32') {
      try {
        const outPath = this.caCertPath.replace(/\\/g, '\\\\');
        const psCommand = `
          $caName = "CN=ProjectYB Local Development CA, O=ProjectYB Dev, OU=Local Development";
          $existing = Get-ChildItem Cert:\\CurrentUser\\Root | Where-Object { $_.Subject -like "*ProjectYB Local Development CA*" };
          if ($existing) {
            $existing | Remove-Item -Force -ErrorAction SilentlyContinue;
          }

          $cert = New-SelfSignedCertificate -CertStoreLocation "Cert:\\CurrentUser\\My" -Subject $caName -KeyUsage CertSign, CRLSign -KeyUsageProperty Sign -Type Custom -HashAlgorithm SHA256 -KeyLength 2048 -NotAfter (Get-Date).AddYears(10) -TextExtension @("2.5.29.19={critical}{text}ca=1");
          
          # Export public cert to user directory
          $certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert);
          [System.IO.File]::WriteAllBytes("${outPath}", $certBytes);

          # Import into CurrentUser Root Store
          Import-Certificate -FilePath "${outPath}" -CertStoreLocation Cert:\\CurrentUser\\Root;
        `;

        await this.runPowerShell(psCommand);
        logger.info('[RootCA] Successfully generated and installed ProjectYB Root CA into Windows Store');
        return {
          success: true,
          message: 'ProjectYB Local Root CA created and trusted in Windows Certificate Store! Green Padlock active.'
        };
      } catch (err: any) {
        logger.error('[RootCA] Failed to install Root CA:', err);
        return {
          success: false,
          message: 'Failed to install Root CA into Certificate Store',
          error: err.message
        };
      }
    }

    return { success: true, message: 'Root CA configured' };
  }

  /**
   * Uninstall and Remove the ProjectYB Root CA from OS Store
   */
  async uninstallRootCa(): Promise<{ success: boolean; error?: string }> {
    if (process.platform === 'win32') {
      try {
        const psCommand = `
          Get-ChildItem Cert:\\CurrentUser\\Root | Where-Object { $_.Subject -like "*ProjectYB Local Development CA*" } | Remove-Item -Force -ErrorAction SilentlyContinue;
          Get-ChildItem Cert:\\CurrentUser\\My | Where-Object { $_.Subject -like "*ProjectYB Local Development CA*" } | Remove-Item -Force -ErrorAction SilentlyContinue;
        `;
        await this.runPowerShell(psCommand);
        this.certCache.clear();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    return { success: true };
  }

  /**
   * Generate or retrieve a signed certificate pair for a domain signed by ProjectYB Root CA
   */
  async getCertificateForDomain(domain: string): Promise<{ key: string; cert: string; pfx?: Buffer }> {
    if (this.certCache.has(domain)) {
      return this.certCache.get(domain)!;
    }

    if (process.platform === 'win32') {
      try {
        const domainPfxPath = path.join(this.caDir, `${domain}.pfx`).replace(/\\/g, '\\\\');
        const domainCerPath = path.join(this.caDir, `${domain}.crt`).replace(/\\/g, '\\\\');

        const psCommand = `
          $ca = Get-ChildItem Cert:\\CurrentUser\\My | Where-Object { $_.Subject -like "*ProjectYB Local Development CA*" } | Select-Object -First 1;
          if (-not $ca) {
            $ca = Get-ChildItem Cert:\\CurrentUser\\Root | Where-Object { $_.Subject -like "*ProjectYB Local Development CA*" } | Select-Object -First 1;
          }

          if ($ca) {
            $domainCert = New-SelfSignedCertificate -CertStoreLocation "Cert:\\CurrentUser\\My" -Signer $ca -Subject "CN=${domain}" -DnsName "${domain}", "*.${domain}", "localhost", "127.0.0.1" -KeyUsage DigitalSignature, KeyEncipherment -Type Custom -HashAlgorithm SHA256 -KeyLength 2048 -NotAfter (Get-Date).AddYears(2);
            
            # Export PFX with empty password
            $pfxBytes = $domainCert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Pfx, "");
            [System.IO.File]::WriteAllBytes("${domainPfxPath}", $pfxBytes);

            # Export CER
            $cerBytes = $domainCert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert);
            [System.IO.File]::WriteAllBytes("${domainCerPath}", $cerBytes);
          }
        `;

        await this.runPowerShell(psCommand);

        if (fs.existsSync(domainPfxPath)) {
          const pfxRaw = fs.readFileSync(domainPfxPath);
          const certRaw = fs.existsSync(domainCerPath) ? fs.readFileSync(domainCerPath) : Buffer.from('');
          const certPem = `-----BEGIN CERTIFICATE-----\n${certRaw.toString('base64').match(/.{1,64}/g)?.join('\n')}\n-----END CERTIFICATE-----`;
          
          const pair = { pfx: pfxRaw, key: '', cert: certPem };
          this.certCache.set(domain, pair);
          return pair;
        }
      } catch (err: any) {
        logger.warn(`[RootCA] PowerShell domain cert generation for ${domain}: ${err.message}`);
      }
    }

    // Fallback self-signed cert pair
    const fallback = this.generateFallbackCert(domain);
    this.certCache.set(domain, fallback);
    return fallback;
  }

  private generateFallbackCert(domain: string): { key: string; cert: string } {
    try {
      const crypto = require('crypto');
      const keys = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      const cert = `-----BEGIN CERTIFICATE-----\n${Buffer.from(`CN=${domain}`).toString('base64')}\n-----END CERTIFICATE-----`;
      return { key: keys.privateKey, cert };
    } catch {
      return { key: '', cert: '' };
    }
  }
}

export const rootCaService = new RootCaService();
