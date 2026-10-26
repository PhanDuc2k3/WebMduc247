import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Development fallback for machines without an S3-compatible object store.
// The profile API is authenticated, so returning the small processed image as
// a data URL keeps the file private without adding a public static route.
export class LocalAvatarStorage {
  constructor(directory) {
    this.directory = directory;
  }

  file(key) {
    if (!/^avatars\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/i.test(key)) {
      throw new Error('Invalid avatar key');
    }
    return path.join(this.directory, ...key.split('/'));
  }

  async put(key, data) {
    const file = this.file(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data, { flag: 'wx' });
  }

  async remove(key) {
    await unlink(this.file(key)).catch(error => {
      if (error.code !== 'ENOENT') throw error;
    });
  }

  async signedUrl(key) {
    try {
      const data = await readFile(this.file(key));
      return `data:image/webp;base64,${data.toString('base64')}`;
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }
}
