import { defineEventHandler, setResponseHeader } from 'h3';
import { emailEvents } from '../../utils/events';

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Content-Type', 'text/event-stream');
  setResponseHeader(event, 'Cache-Control', 'no-cache');
  setResponseHeader(event, 'Connection', 'keep-alive');

  const onRefresh = (data: { accountId: string }) => {
    event.node.res.write(`data: ${JSON.stringify({ type: 'refresh', accountId: data.accountId })}\n\n`);
  };

  emailEvents.on('refresh', onRefresh);

  event.node.req.on('close', () => {
    emailEvents.off('refresh', onRefresh);
  });
});
