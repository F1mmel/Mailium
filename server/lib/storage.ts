import { promises as fs } from 'fs';
import path from 'path';
import { getDataPath } from './data';

const DATA_FILE = getDataPath();
const STORAGE_DIR = path.resolve(path.dirname(DATA_FILE), 'storage');
const BODIES_DIR = path.join(STORAGE_DIR, 'bodies');
const CACHE_DIR = path.join(STORAGE_DIR, 'cache');

async function ensureDir(dir: string) {
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
}

function sanitizeKey(key: string) {
    return key.replace(/[^a-z0-9\-_]/gi, '_');
}

export async function readBody(key: string) {
    const filename = sanitizeKey(key) + '.json';
    const filePath = path.join(BODIES_DIR, filename);
    
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    } catch {
        return null;
    }
}

export async function writeBody(key: string, data: any) {
    await ensureDir(BODIES_DIR);
    const filename = sanitizeKey(key) + '.json';
    const filePath = path.join(BODIES_DIR, filename);
    
    const tempPath = filePath + '.tmp';
    await fs.writeFile(tempPath, JSON.stringify(data));
    await fs.rename(tempPath, filePath);
}

export async function deleteBody(key: string) {
    const filename = sanitizeKey(key) + '.json';
    const filePath = path.join(BODIES_DIR, filename);
    try {
        await fs.unlink(filePath);
    } catch {}
}

export async function readFolderCache(accountId: string, folder: string) {
    const key = `${accountId}_${folder}`;
    const filename = sanitizeKey(key) + '.json';
    const filePath = path.join(CACHE_DIR, filename);
    
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    } catch {
        return null;
    }
}

export async function writeFolderCache(accountId: string, folder: string, data: any) {
    await ensureDir(CACHE_DIR);
    const key = `${accountId}_${folder}`;
    const filename = sanitizeKey(key) + '.json';
    const filePath = path.join(CACHE_DIR, filename);
    
    const tempPath = filePath + '.tmp';
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2));
    await fs.rename(tempPath, filePath);
}

export async function deleteFolderCache(accountId: string, folder: string) {
    const key = `${accountId}_${folder}`;
    const filename = sanitizeKey(key) + '.json';
    const filePath = path.join(CACHE_DIR, filename);
    try {
        await fs.unlink(filePath);
    } catch {}
}

export async function deleteAccountFolderCache(accountId: string) {
    try {
        const files = await fs.readdir(CACHE_DIR);
        const prefix = sanitizeKey(accountId) + '_';
        for (const file of files) {
            if (file.startsWith(prefix)) {
                await fs.unlink(path.join(CACHE_DIR, file)).catch(() => {});
            }
        }
    } catch {}
}

export async function getStorageStats() {
    let totalBytes = 0;
    let fileCount = 0;

    const calculateDirSize = async (dirPath: string) => {
        try {
            const files = await fs.readdir(dirPath);
            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stat = await fs.stat(filePath);
                if (stat.isFile()) {
                    totalBytes += stat.size;
                    fileCount++;
                }
            }
        } catch {}
    };

    await calculateDirSize(BODIES_DIR);
    await calculateDirSize(CACHE_DIR);

    const sizeMb = (totalBytes / (1024 * 1024)).toFixed(2);
    return { totalBytes, sizeMb: parseFloat(sizeMb), fileCount };
}

export async function clearAllStorage() {
    const clearDir = async (dirPath: string) => {
        try {
            const files = await fs.readdir(dirPath);
            for (const file of files) {
                await fs.unlink(path.join(dirPath, file)).catch(() => {});
            }
        } catch {}
    };

    await clearDir(BODIES_DIR);
    await clearDir(CACHE_DIR);

    return { success: true };
}
