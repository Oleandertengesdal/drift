<script setup lang="ts">
import { ref } from 'vue';
import type { Window } from '../types/desktop';

interface Props {
  windows: Window[];
}

interface Emits {
  (e: 'closeWindow', id: string): void;
  (e: 'focusWindow', id: string): void;
  (e: 'toggleMinimize', id: string): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const currentTime = ref(new Date());

setInterval(() => {
  currentTime.value = new Date();
}, 1000);

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const handleWindowClick = (window: Window) => {
  if (window.isMinimized) {
    emit('toggleMinimize', window.id);
  } else {
    emit('focusWindow', window.id);
  }
};

const handleWindowRightClick = (event: MouseEvent, windowId: string) => {
  event.preventDefault();
  emit('closeWindow', windowId);
};
</script>

<template>
  <div class="taskbar">
    <div class="start-button">
      <img src="../assets/images/icons/Start.png" alt="Start" class="Start-icon" />
      <span>Start</span>
    </div>
    
    <div class="taskbar-items">
      <div 
        v-for="window in windows" 
        :key="window.id"
        class="taskbar-item"
        :class="{ minimized: window.isMinimized }"
        @click="handleWindowClick(window)"
        @contextmenu="handleWindowRightClick($event, window.id)"
        :title="`${window.title} (Right-click to close)`"
      >
        <img :src="window.icon" alt="" class="taskbar-item-icon" />
        <span class="taskbar-item-text">{{ window.title }}</span>
      </div>
    </div>
    
    <div class="system-tray">
      <div class="clock">
        {{ formatTime(currentTime) }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.taskbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: #c0c0c0;
  border-top: 2px solid;
  border-color: #ffffff #000000 #000000 #ffffff;
  display: flex;
  align-items: center;
  padding: 3px;
  z-index: 1000;
}

.start-button {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px 3px 5px;
  background: #c0c0c0;
  border: 2px solid;
  border-color: #ffffff #000000 #000000 #ffffff;
  color: #000;
  font-weight: bold;
  font-size: 13px;
  cursor: pointer;
  height: 30px;
  margin: 0 3px;
  box-shadow: none;
  transition: none;
}

.start-button:hover {
  background: #c0c0c0;
}

.start-button:active {
  border-color: #000000 #ffffff #ffffff #000000;
  padding: 4px 7px 2px 6px;
}

.start-icon {
  width: 20px;
  height: 20px;
}

.taskbar-items {
  flex: 1;
  display: flex;
  gap: 0;
  margin-left: 2px;
  overflow-x: auto;
  overflow-y: hidden;
  align-items: center;
}

.taskbar-items::-webkit-scrollbar {
  height: 0;
}

.taskbar-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 7px 2px 9px;
  min-width: 120px;
  max-width: 180px;
  height: 30px;
  background: #c0c0c0;
  border: 2px solid;
  border-color: #000000 #ffffff #ffffff #000000;
  cursor: pointer;
  font-size: 12px;
  color: #000;
  margin-right: 3px;
  box-shadow: none;
  transition: none;
}

.taskbar-item:hover {
  background: #c0c0c0;
}

.taskbar-item:active {
  border-color: #000000 #ffffff #ffffff #000000;
  padding: 4px 7px 2px 9px;
}

.taskbar-item.minimized {
  border-color: #ffffff #000000 #000000 #ffffff;
  padding: 3px 8px;
}

.taskbar-item-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.taskbar-item-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.system-tray {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  height: 30px;
  background: #c0c0c0;
  border: 2px solid;
  border-color: #808080 #ffffff #ffffff #808080;
  margin-left: 6px;
}

.clock {
  color: #000;
  font-size: 12px;
  font-weight: normal;
  min-width: 50px;
  text-align: center;
}
</style>
