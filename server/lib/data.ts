import { promises as fs, readFileSync } from 'fs';
import path from 'path';

const DATA_FILE = process.env.DATA_PATH || path.resolve(process.cwd(), 'data.json');

export interface Data {
  users: any[];
  settings?: any;
  emailAccounts?: any[];
  pushSubscriptions?: any[];
}

let isWriting = false;
const queue: (() => void)[] = [];

async function lock() {
    if (isWriting) {
        await new Promise<void>(resolve => queue.push(resolve));
    }
    isWriting = true;
}

function unlock() {
    isWriting = false;
    const next = queue.shift();
    if (next) next();
}

export function getDataPath(): string {
    return DATA_FILE;
}

export function readDataSync(): Data {
  try {
    const content = readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(content);
    return {
      users: data.users || [],
      settings: data.settings || {},
      emailAccounts: data.emailAccounts || [],
      pushSubscriptions: data.pushSubscriptions || []
    };
  } catch (error) {
    return {
      users: [],
      settings: {},
      emailAccounts: [],
      pushSubscriptions: []
    };
  }
}

export async function readData(): Promise<Data> {
  try {
    const content = await fs.readFile(DATA_FILE, 'utf-8');
    const data = JSON.parse(content);
    return {
      users: data.users || [],
      settings: data.settings || {},
      emailAccounts: data.emailAccounts || [],
      pushSubscriptions: data.pushSubscriptions || []
    };
  } catch (error) {
    return {
      users: [],
      settings: {},
      emailAccounts: [],
      pushSubscriptions: []
    };
  }
}

export async function writeData(data: Data): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

export async function updateData(updater: (data: Data) => void | Promise<void>): Promise<void> {
    await lock();
    try {
        const data = await readData();
        await updater(data);
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    } finally {
        unlock();
    }
}

export async function getDataSize(): Promise<number> {
    try {
        const stats = await fs.stat(DATA_FILE);
        return stats.size;
    } catch {
        return 0;
    }
}

export async function existsData(): Promise<boolean> {
    try {
        await fs.access(DATA_FILE);
        return true;
    } catch {
        return false;
    }
}
