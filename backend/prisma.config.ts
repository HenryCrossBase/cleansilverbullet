// @ts-expect-error Prisma config helper is resolved by Prisma CLI runtime.
import { defineConfig } from 'prisma/config';

function isPoolerUrl(url?: string) {
  if (!url) return false;
  return /(?:pooler|pgbouncer|pool\.neon|supabase)/i.test(url);
}

const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
const directUrl = process.env.DIRECT_URL || (isPoolerUrl(databaseUrl) ? databaseUrl : databaseUrl);

export default defineConfig({
  earlyAccess: true,
  migrations: {
    url: directUrl,
  },
});
