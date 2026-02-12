import { createApp } from "vue";
import "98.css";
import "./style.css";
import App from "./App.vue";
import { createRouter, createWebHistory } from "vue-router";
import DesktopRoute from "./routes/Desktop.vue";
import KioskRoute from "./routes/KioskInternal.vue";
import KioskExternalRoute from "./routes/KioskExternal.vue";

const routes = [
  { path: "/", component: DesktopRoute },
  { path: "/kiosk", component: KioskRoute },
  { path: "/kiosk-external", component: KioskExternalRoute },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

createApp(App).use(router).mount("#app");
