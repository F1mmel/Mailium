import { defineEventHandler } from 'h3';
import { readData } from '../../lib/data';

export default defineEventHandler(async () => {
  const data = await readData();
  const customization = data.settings?.customization || {};

  return {
    appName: customization.appName || 'Mailium',
    accentColor: customization.accentColor || '#6366f1',
    density: customization.density || 'comfortable',
    dateFormat: customization.dateFormat || 'relative'
  };
});
