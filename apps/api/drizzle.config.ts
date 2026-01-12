import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: 'a698e4f4-21bc-4e53-8981-2e4f4fdb04fd',
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },
});
