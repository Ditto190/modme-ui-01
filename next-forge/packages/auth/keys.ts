import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
    server: {
      AUTH_SECRET: z.string().min(1),
      AUTH_DEV_EMAIL: z.string().email().optional(),
      AUTH_DEV_PASSWORD: z.string().optional(),
    },
    runtimeEnv: {
      AUTH_SECRET: process.env.AUTH_SECRET,
      AUTH_DEV_EMAIL: process.env.AUTH_DEV_EMAIL,
      AUTH_DEV_PASSWORD: process.env.AUTH_DEV_PASSWORD,
    },
  });
