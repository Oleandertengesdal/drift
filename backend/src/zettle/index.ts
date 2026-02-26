import { PurchaseSchema, WebhookSchema, type WebhookBody } from "./schema";
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
import { upgradeWebSocket } from "../index";
import { ConnectionManager, WebSocketEvents } from "@/websocket";
import type { CacheClient } from "@/cache";

export function getZettleApi() {
  if (
    env.ZETTLE_API_KEY == null ||
    env.ZETTLE_CLIENT_ID == null ||
    env.ZETTLE_WEBHOOK_SIGNING_KEY == null
  ) {
    throw new Error("Zettle api not configured");
  }
  return new ZettleAPI(
    env.ZETTLE_CLIENT_ID,
    env.ZETTLE_API_KEY,
    env.ZETTLE_WEBHOOK_SIGNING_KEY,
  );
}

const PurchaseParamsSchema = z.object({
  startDate: z.iso.datetime().optional().nullable(),
  endDate: z.iso.datetime().optional().nullable(),
});

async function GetAllPurchasesInRange(
  zettleApi: ZettleAPI,
  cache: CacheClient,
  startDate: Date,
  endDate: Date,
) {
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

    const isCurrentMonth = getYear(now) === year && getMonth(now) + 1 === month;

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
  return allPurchases;
}

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

    const allPurchases = await GetAllPurchasesInRange(
      zettleApi,
      cache,
      startDate,
      endDate,
    );

    return c.json(allPurchases);
  })
  .get("/websocket", (...args) => {
    return upgradeWebSocket(() => {
      let assignedId: string | undefined = undefined;

      return {
        onOpen: (_event, ws) => {
          assignedId = ConnectionManager.generateAndAddConnection(ws);

          ConnectionManager.sendToConnection(
            assignedId,
            WebSocketEvents.ConnectionOpen,
            {
              id: assignedId,
            },
          );
        },

        onMessage(_event, _ws) {
          // No messages expected from client
        },

        onClose() {
          if (assignedId) {
            ConnectionManager.removeConnection(assignedId);
          }
        },
      };
    })(...args);
  })
  .post("/webhook", zValidator("json", WebhookSchema), async (c) => {
    const zettleApi = getZettleApi();
    const cache = c.get("cache");

    let body: WebhookBody;

    try {
      body = await c.req.valid("json");
      const signature = c.req.header("X-Zettle-Signature");
      zettleApi.verifyZettleSignature(
        body.timestamp,
        body.payload,
        signature ?? "",
      );
    } catch {
      // Its not important if this succeeds or not
      return c.text("OK", { status: 200 });
    }

    if (body.eventName === "PurchaseCreated") {
      async function broadcastPurchase(
        payload: string,
        zettleApi: ZettleAPI,
        cache: CacheClient,
      ) {
        const purchase = PurchaseSchema.parse(JSON.parse(payload));

        const now = utc(Date.now());
        const month = getMonth(now) + 1;
        const year = getYear(now);
        const cacheKey = `zettle:products:${year}-${month}`;
        await cache.delete(cacheKey);
        await GetAllPurchasesInRange(
          zettleApi,
          cache,
          startOfDay(now),
          endOfDay(now),
        );

        await ConnectionManager.broadcast(WebSocketEvents.NewPurchase, {
          purchase,
        });

        console.log("Broadcasted new purchase to all clients", {
          clientIds: Array.from(ConnectionManager.connections.keys()),
        });
      }

      broadcastPurchase(body.payload, zettleApi, cache)
        .then(() => console.log("Purchase event handled"))
        .catch(console.error);
    }

    return c.text("OK", { status: 200 });
  });

export default zettleApp;
