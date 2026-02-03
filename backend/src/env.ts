import z from "zod";
import dotenv from "dotenv";
dotenv.config();

export const env = z
  .object({
    ZETTLE_CLIENT_ID: z.string().optional(),
    ZETTLE_API_KEY: z.string().optional(),
  })
  .parse(process.env);
