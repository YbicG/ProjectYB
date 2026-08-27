import * as fs from 'fs';

class EnvManager {
  async readEnvFile(filePath: string): Promise<Record<string, string>> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      const vars: Record<string, string> = {};
      
      lines.forEach(line => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
          vars[match[1].trim()] = match[2].trim();
        }
      });
      return vars;
    } catch (e) {
      return {};
    }
  }

  async writeEnvFile(filePath: string, vars: Record<string, string>) {
    const lines = Object.entries(vars).map(([k, v]) => `${k}=${v}`);
    await fs.promises.writeFile(filePath, lines.join('\n'), 'utf8');
  }

  async listEnvFiles(projectPath: string): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(projectPath);
      return files.filter(f => f.startsWith('.env'));
    } catch {
      return [];
    }
  }

  async getEnvValue(filePath: string, key: string): Promise<string | undefined> {
    const vars = await this.readEnvFile(filePath);
    return vars[key];
  }

  async setEnvValue(filePath: string, key: string, value: string) {
    const vars = await this.readEnvFile(filePath);
    vars[key] = value;
    await this.writeEnvFile(filePath, vars);
  }
}

export const envManager = new EnvManager();
