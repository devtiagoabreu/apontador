// src/lib/env.ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NEXTAUTH_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(1),
    SYSTEXTIL_CLIENT_ID: z.string().min(1),
    SYSTEXTIL_CLIENT_SECRET: z.string().min(1),
    SYSTEXTIL_TOKEN_URL: z.string().url(),
    SYSTEXTIL_API_URL: z.string().url(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    SYSTEXTIL_CLIENT_ID: process.env.SYSTEXTIL_CLIENT_ID,
    SYSTEXTIL_CLIENT_SECRET: process.env.SYSTEXTIL_CLIENT_SECRET,
    SYSTEXTIL_TOKEN_URL: process.env.SYSTEXTIL_TOKEN_URL,
    SYSTEXTIL_API_URL: process.env.SYSTEXTIL_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
});