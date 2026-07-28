import { defineEventHandler } from 'h3';
import { readData } from '../../lib/data';

export default defineEventHandler(async (event) => {
  const data = await readData();
  return data.settings || {};
});
