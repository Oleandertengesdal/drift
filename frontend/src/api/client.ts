import type { BackendApi } from "@drift/backend";
import { hc } from "hono/client";

export const apiClient = hc<BackendApi>(
  import.meta.env.VITE_API_ENDPOINT || "http://localhost:3000",
);
