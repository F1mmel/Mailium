import { readData, updateData } from '../lib/data';

export interface EmailAccount {
  id: string;
  name: string;
  email: string;
  aliases?: string[];
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPass: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  tls: boolean;
  source?: string;
  visible?: boolean;
}

export const db = {
  async read() {
    return await readData();
  },
  async write(data: any) {
    await updateData((dbData) => {
        Object.assign(dbData, data);
    });
  },
  async update(updater: (data: any) => void | Promise<void>) {
      await updateData(updater);
  }
};
