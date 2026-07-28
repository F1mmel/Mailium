import { defineEventHandler, readBody } from 'h3';
import { updateData } from '../../lib/data';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { appName, accentColor, density, dateFormat } = body || {};

  await updateData((data) => {
    if (!data.settings) data.settings = {};
    data.settings.customization = {
      appName: appName ? appName.trim() : 'Mailium',
      accentColor: accentColor || '#6366f1',
      density: density || 'comfortable',
      dateFormat: dateFormat || 'relative'
    };
  });

  return { success: true, message: 'Customization settings saved' };
});
