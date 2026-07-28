import { EventEmitter } from 'events';

export const emailEvents = new EventEmitter();

export const emitRefresh = (accountId: string) => {
    emailEvents.emit('refresh', { accountId });
};
