<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface Props {
  onComplete?: () => void;
  onCancel?: () => void;
}

const props = defineProps<Props>();

const progress = ref(0);
let timer: number | null = null;

const cancel = () => {
  if (timer) {
    clearInterval(timer);
  }
  if (props.onCancel) {
    props.onCancel();
  }
};

onMounted(() => {
  const duration = 2000; // 2 seconds
  const interval = 80; // Update every 80ms
  const increment = (interval / duration) * 100;

  timer = setInterval(() => {
    progress.value += increment;
    if (progress.value >= 100) {
      progress.value = 100;
      if (timer) {
        clearInterval(timer);
      }
      setTimeout(() => {
        if (props.onComplete) {
          props.onComplete();
        }
      }, 100);
    }
  }, interval) as unknown as number;
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<template>
  <div class="loading-overlay">
    <div class="window loading-window">
      <div class="title-bar">
        <div class="title-bar-text">Loading...</div>
      </div>
      <div class="window-body">
        <p>Please wait while the application is loading...</p>
        <div class="progress-indicator segmented">
          <div class="progress-indicator-bar" :style="{ width: progress + '%' }"></div>
        </div>
        <div class="button-container">
          <button @click="cancel">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  cursor: url('/src/assets/cursors/default_busy.cur'), wait;
}

.loading-window {
  width: 400px;
  min-height: 150px;
  cursor: url('/src/assets/cursors/default_arrow.cur'), default;
}

.window-body {
  padding: 20px;
}

.window-body p {
  margin: 0 0 15px 0;
}

.button-container {
  margin-top: 15px;
  display: flex;
  justify-content: center;
}
</style>
