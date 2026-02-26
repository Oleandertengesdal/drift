import { PurchaseSchema } from "./schema";
import { env } from "@/env";
import { createRoute } from "@/utils";
import {
  startOfDay,
  endOfDay,
  subWeeks,
  eachMonthOfInterval,
  endOfMonth,
  getMonth,
  getYear,
} from "date-fns";
import { ZettleAPI } from "./service";
import z from "zod";
import { utc } from "@date-fns/utc";
import { zValidator } from "@hono/zod-validator";
import leaderboardApp from "./leaderboard";

function getZettleApi() {
  if (env.ZETTLE_API_KEY == null || env.ZETTLE_CLIENT_ID == null) {
    throw new Error("Zettle api not configured");
  }
  return new ZettleAPI(env.ZETTLE_CLIENT_ID, env.ZETTLE_API_KEY);
}

const PurchaseParamsSchema = z.object({
  startDate: z.iso.datetime().optional().nullable(),
  endDate: z.iso.datetime().optional().nullable(),
});

const zettleApp = createRoute()
  .basePath("/zettle")
  .get("/purchases", zValidator("query", PurchaseParamsSchema), async (c) => {
    const zettleApi = getZettleApi();
    const params = c.req.valid("query");
    const cache = c.get("cache");

    const startDate = startOfDay(
      params.startDate ? params.startDate : subWeeks(new Date(), 1),
    );
    const endDate = endOfDay(params.endDate ? params.endDate : new Date());

    const monthRanges = eachMonthOfInterval({
      start: utc(startDate),
      end: utc(endDate),
    }).map((v) => ({
      start: v,
      end: endOfMonth(v),
    }));

    const now = utc(Date.now());

    const allPurchases: z.infer<typeof PurchaseSchema>[] = [];

    for (let i = 0; i < monthRanges.length; i++) {
      const range = monthRanges[i]!;
      const year = getYear(range.start);
      const month = getMonth(range.start) + 1;

      const isCurrentMonth =
        getYear(now) === year && getMonth(now) + 1 === month;

      const cacheKey = `zettle:products:${year}-${month}`;

      const ONE_MONTH_IN_SECONDS = 60 * 60 * 24 * 30;
      const FIFTY_SECONDS = 50;
      const ONE_HOUR_IN_SECONDS = 60 * 60;

      const cached = await cache.cachifyValidate({
        key: cacheKey,
        ttlSeconds: isCurrentMonth
          ? FIFTY_SECONDS
          : ONE_MONTH_IN_SECONDS + i * ONE_HOUR_IN_SECONDS,
        fn: () =>
          zettleApi.getAllPurchasesInRange({
            startDate: range.start,
            endDate: range.end,
          }),
        schema: z.array(PurchaseSchema),
      });

      allPurchases.push(...cached.data);
    }

    return c.json(allPurchases);
  })
  .route("/leaderboard", leaderboardApp);

export default zettleApp;
