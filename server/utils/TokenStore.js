const fs = require('fs').promises;
const path = require('path');

class TokenStore {
  constructor(options = {}) {
    const defaultDir = path.resolve(process.cwd(), options.baseDir || 'tokens');
    this.tokenDir = options.tokenDir || process.env.DRIVE_TOKEN_PATH || defaultDir;
    this.ensureDirPromise = null;
  }

  async ensureDir() {
    if (!this.ensureDirPromise) {
      this.ensureDirPromise = fs.mkdir(this.tokenDir, { recursive: true }).catch(err => {
        this.ensureDirPromise = null;
        throw err;
      });
    }
    return this.ensureDirPromise;
  }

  getTokenPath(provider) {
    const filename = `${provider}-tokens.json`;
    return path.join(this.tokenDir, filename);
  }

  async getToken(provider) {
    try {
      const targetPath = this.getTokenPath(provider);
      const raw = await fs.readFile(targetPath, 'utf-8');
      return JSON.parse(raw);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async setToken(provider, tokens) {
    await this.ensureDir();
    const targetPath = this.getTokenPath(provider);
    const data = JSON.stringify(tokens, null, 2);
    await fs.writeFile(targetPath, data, 'utf-8');
    return tokens;
  }

  async clearToken(provider) {
    try {
      const targetPath = this.getTokenPath(provider);
      await fs.unlink(targetPath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }
}

module.exports = new TokenStore();




