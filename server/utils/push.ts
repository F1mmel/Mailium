import webpush from 'web-push';
import { db } from './db';

const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY || 'BInIgBhWUcH8PLYiGPltpMKfalJgANhTY4-84mh5VVm1w2_UsCS4dCkyZHMmnF3t5xVOTazc7n9YVwaxH-rpyM4',
    privateKey: process.env.VAPID_PRIVATE_KEY || 'I89m42w4WKgLqiAcXUn29hWNpUWwx9fgzhFQCWddV8w'
};

webpush.setVapidDetails(
  'mailto:admin@volkszeitung.org',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export const pushService = {
    getPublicKey() {
        return vapidKeys.publicKey;
    },

    async sendNotification(subscription: any, payload: any) {
        try {
            const result = await webpush.sendNotification(subscription, JSON.stringify(payload), {
                headers: {
                    'Urgency': 'high'
                }
            });
            console.log(`Push sent successfully. Status: ${result.statusCode}`);
        } catch (error: any) {
            console.error('Error sending push notification:', error);
            if (error.statusCode) {
                 console.error('Status Code:', error.statusCode);
                 console.error('Headers:', error.headers);
                 console.error('Body:', error.body);
            }
        }
    },

    async notifyAll(payload: any) {
        const data = await db.read();
        const subscriptions = data.pushSubscriptions || [];
        
        console.log(`Sending push to ${subscriptions.length} devices`);
        
        const promises = subscriptions.map(sub => {
            console.log(`Sending to ${new URL(sub.endpoint).hostname}...`);
            return this.sendNotification(sub, payload).catch((e: any) => {
                if (e && (e.statusCode === 410 || e.statusCode === 404)) {
                    return this.removeSubscription(sub.endpoint);
                }
            });
        });
        
        await Promise.all(promises);
    },

    async addSubscription(subscription: any) {
        await db.update(data => {
            if (!data.pushSubscriptions) data.pushSubscriptions = [];
            if (!data.pushSubscriptions.find((s: any) => s.endpoint === subscription.endpoint)) {
                data.pushSubscriptions.push(subscription);
            }
        });
    },

    async removeSubscription(endpoint: string) {
        await db.update(data => {
            if (data.pushSubscriptions) {
                data.pushSubscriptions = data.pushSubscriptions.filter((s: any) => s.endpoint !== endpoint);
            }
        });
    }
};
