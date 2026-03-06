import { createRoute } from "@/utils";
import { MinecraftAPI, MinecraftServerStatusSchema } from "./service";

const MINECRAFT_SERVER_ADDRESS = "mc.tihlde.org";

const minecraftApp = createRoute()
  .basePath("/minecraft")
  .get("/status", async (c) => {
    const cache = c.get("cache");
    const minecraftApi = new MinecraftAPI(MINECRAFT_SERVER_ADDRESS);

    // Cache for 30 seconds to avoid hammering the API
    const cached = await cache.cachifyValidate({
      key: "minecraft:status",
      ttlSeconds: 30,
      fn: () => minecraftApi.getServerStatus(),
      schema: MinecraftServerStatusSchema,
    });

    return c.json(cached.data);
  });

export default minecraftApp;
