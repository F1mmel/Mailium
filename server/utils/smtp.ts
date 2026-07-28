import nodemailer from 'nodemailer';
import { readData } from '../lib/data';

export const smtpService = {
  async sendEmail(accountId: string, to: string, subject: string, text: string, html: string, fromOverride?: string, attachments?: any[]) {
    const data = await readData();
    const account = data.emailAccounts?.find((a: any) => a.id === accountId);
    
    if (!account) throw new Error('Account not found');

    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort,
      secure: account.smtpPort === 465, 
      auth: {
        user: account.smtpUser,
        pass: account.smtpPass,
      },
    });

    const fromHeader = fromOverride ? `"${account.name}" <${fromOverride}>` : `"${account.name}" <${account.email}>`;

    const info = await transporter.sendMail({
      from: fromHeader,
      to,
      subject,
      text,
      html: html || text,
      attachments: attachments?.map(att => ({
        filename: att.filename,
        content: Buffer.from(att.content, 'base64'),
        contentType: att.contentType,
        cid: att.cid
      }))
    });

    return info;
  }
};
