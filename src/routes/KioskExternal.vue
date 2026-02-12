<template>
  <div class="external-kiosk-screen">
    <div class="header">
      <h1>Ekstern Kioskskjerm</h1>
      <button @click="exitFullscreen">Lukk</button>
    </div>
    <div class="content">
      <div class="window">
        <div class="title-bar">
          <div class="title-bar-text">Ekstern skjerm - Innhold</div>
        </div>
        <div class="window-body">
          <p>Ekstern kioskskjermen.</p>
          <p>Innhold kommer her.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
const router = useRouter();

const exitFullscreen = () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
  router.push("/");
};
</script>

<style scoped>
.external-kiosk-screen {
  width: 100vw;
  height: 100vh;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.header {
  padding: 20px;
  background-color: #000080;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  margin: 0;
  font-size: 1.5em;
}

.header button {
  padding: 8px 16px;
}

.content {
  flex: 1;
  padding: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.window {
  min-width: 600px;
}

.window-body {
  padding: 20px;
  font-size: 1.2em;
}

.window-body p {
  margin: 10px 0;
}
</style>
