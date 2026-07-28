import { defineEventHandler, getQuery, createError } from 'h3';
import { updateData } from '../../lib/data';
import { deleteAccountFolderCache } from '../../lib/storage';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const id = query.id as string;

  if (!id) {
    throw createError({ statusCode: 400, message: 'Account-ID erforderlich' });
  }

  await updateData((data) => {
    if (data.emailAccounts) {
      data.emailAccounts = data.emailAccounts.filter((a: any) => a.id !== id);
    }
  });

  await deleteAccountFolderCache(id);

  return { message: 'Konto gelöscht' };
});
