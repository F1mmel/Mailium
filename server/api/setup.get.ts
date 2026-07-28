import { defineEventHandler } from 'h3';
import { existsData } from '../lib/data';

export default defineEventHandler(async (event) => {
  const configured = await existsData();
  return { configured };
});
