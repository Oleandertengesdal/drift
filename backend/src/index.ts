import { Hono } from "hono";
import { serve } from "@hono/node-server";
import zettleApp from "./zettle";

const app = new Hono().basePath("/api").route("/", zettleApp);

serve({
  fetch: app.fetch,
  port: 3000,
}).on("listening", () => {
  console.log("Server is listening on http://localhost:3000");
});
