import { createRoute } from "@/utils";
import type { CacheClient } from "@/cache";
import z from "zod";
import { zValidator } from "@hono/zod-validator";

// --- Schemas ---

const RegisterCardSchema = z.object({
  maskedPan: z.string().min(1),
  displayName: z.string().min(1).max(50),
});

const UnregisterCardSchema = z.object({
  maskedPan: z.string().min(1),
});

const RegistrationEntrySchema = z.object({
  displayName: z.string(),
  registeredAt: z.string(),
});

const RegistrationsMapSchema = z.record(z.string(), RegistrationEntrySchema);

export type RegistrationEntry = z.infer<typeof RegistrationEntrySchema>;
export type RegistrationsMap = z.infer<typeof RegistrationsMapSchema>;

// --- Constants ---

const REGISTRATIONS_CACHE_KEY = "leaderboard:registrations";
// 5 years TTL — effectively permanent, survives Redis restarts if persistence is on
const REGISTRATIONS_TTL_SECONDS = 60 * 60 * 24 * 365 * 5;

// --- Helpers ---

async function getRegistrations(
  cache: CacheClient,
): Promise<RegistrationsMap> {
  const raw = await cache.getObject<RegistrationsMap>(REGISTRATIONS_CACHE_KEY);
  if (!raw) return {};
  // Validate shape — drop corrupted entries silently
  const parsed = RegistrationsMapSchema.safeParse(raw);
  return parsed.success ? parsed.data : {};
}

async function saveRegistrations(
  cache: CacheClient,
  registrations: RegistrationsMap,
): Promise<void> {
  await cache.setObject(
    REGISTRATIONS_CACHE_KEY,
    registrations,
    REGISTRATIONS_TTL_SECONDS,
  );
}

// --- Routes ---

const leaderboardApp = createRoute()
  /**
   * POST /register
   * Register a card with a display name for the leaderboard.
   * Body: { maskedPan: string, displayName: string }
   */
  .post("/register", zValidator("json", RegisterCardSchema), async (c) => {
    const { maskedPan, displayName } = c.req.valid("json");
    const cache = c.get("cache");

    const registrations = await getRegistrations(cache);

    registrations[maskedPan] = {
      displayName: displayName.trim(),
      registeredAt: new Date().toISOString(),
    };

    await saveRegistrations(cache, registrations);

    return c.json({ success: true });
  })

  /**
   * GET /registrations
   * Returns all card→displayName registrations.
   */
  .get("/registrations", async (c) => {
    const cache = c.get("cache");
    const registrations = await getRegistrations(cache);
    return c.json(registrations);
  })

  /**
   * POST /unregister
   * Remove a card registration.
   * Body: { maskedPan: string }
   */
  .post(
    "/unregister",
    zValidator("json", UnregisterCardSchema),
    async (c) => {
      const { maskedPan } = c.req.valid("json");
      const cache = c.get("cache");

      const registrations = await getRegistrations(cache);
      delete registrations[maskedPan];
      await saveRegistrations(cache, registrations);

      return c.json({ success: true });
    },
  );

export default leaderboardApp;
