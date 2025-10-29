<script setup lang="ts">
import { ref } from 'vue';
import DesktopIcon from './DesktopIcon.vue';
import Taskbar from './Taskbar.vue';
import Window from './Window.vue';
import type { DesktopIcon as DesktopIconType, Window as WindowType } from '../types/desktop';
import wallpaper from '../assets/images/wallpaper.jpg';

const desktopIcons = ref<DesktopIconType[]>([
  {
    id: '1',
    name: 'About Us',
    icon: new URL('../assets/images/icons/AboutUs.png', import.meta.url).href,
    position: { x: 20, y: 20 },
    action: () => openWindow('about-us', 'About us', new URL('../assets/images/icons/AboutUs.png', import.meta.url).href, 'about-us'),
  },
  {
    id: '2',
    name: 'Members',
    icon: new URL('../assets/images/icons/Members.png', import.meta.url).href,
    position: { x: 20, y: 120 },
    action: () => openWindow('members', 'Members', new URL('../assets/images/icons/Members.png', import.meta.url).href, 'members'),
  },
  {
    id: '3',
    name: 'Order',
    icon: new URL('../assets/images/icons/Mail.png', import.meta.url).href,
    position: { x: 20, y: 220 },
    action: () => openWindow('order', 'Order', new URL('../assets/images/icons/Mail.png', import.meta.url).href, 'order'),
  },
  {
    id: '4',
    name: 'Bin',
    icon: new URL('../assets/images/icons/Bin.png', import.meta.url).href,
    position: { x: 20, y: 320 },
    action: () => openWindow('bin', 'Recycle Bin', new URL('../assets/images/icons/Bin.png', import.meta.url).href, 'bin'),
  },
  {
    id: '5',
    name: 'Kiosk Screen',
    icon: new URL('../assets/images/icons/kiosk_screen.png', import.meta.url).href,
    position: { x: 1220, y: 120 },
    action: () => openWindow('kiosk screen', 'Kiosk Screen', new URL('../assets/images/icons/kiosk_screen.png', import.meta.url).href, 'kiosk screen'),
  },
]);

const windows = ref<WindowType[]>([]);
const nextZIndex = ref(100);

const openWindow = (id: string, title: string, icon: string, component?: string) => {
  const existingWindow = windows.value.find(w => w.id === id);
  if (existingWindow) {
    focusWindow(id);
    if (existingWindow.isMinimized) {
      toggleMinimize(id);
    }
    return;
  }

  const offset = windows.value.length * 30;
  const newWindow: WindowType = {
    id,
    title,
    icon,
    position: { x: 100 + offset, y: 80 + offset },
    size: { width: 600, height: 400 },
    isMaximized: false,
    isMinimized: false,
    zIndex: nextZIndex.value++,
    component,
  };
  
  windows.value.push(newWindow);
};

const closeWindow = (id: string) => {
  const index = windows.value.findIndex(w => w.id === id);
  if (index !== -1) {
    windows.value.splice(index, 1);
  }
};

const focusWindow = (id: string) => {
  const window = windows.value.find(w => w.id === id);
  if (window) {
    window.zIndex = nextZIndex.value++;
  }
};

const minimizeWindow = (id: string) => {
  const window = windows.value.find(w => w.id === id);
  if (window) {
    window.isMinimized = true;
  }
};

const toggleMinimize = (id: string) => {
  const window = windows.value.find(w => w.id === id);
  if (window) {
    window.isMinimized = !window.isMinimized;
    if (!window.isMinimized) {
      focusWindow(id);
    }
  }
};

const maximizeWindow = (id: string) => {
  const window = windows.value.find(w => w.id === id);
  if (window) {
    window.isMaximized = !window.isMaximized;
  }
};
</script>

<template>
  <div class="desktop">
    <div class="desktop-background" :style="{ backgroundImage: `url(${wallpaper})` }">
      <DesktopIcon 
        v-for="icon in desktopIcons" 
        :key="icon.id" 
        :icon="icon" 
      />

      <Window
        v-for="window in windows"
        :key="window.id"
        :window="window"
        @close="closeWindow"
        @focus="focusWindow"
        @minimize="minimizeWindow"
        @maximize="maximizeWindow"
      />
    </div>
    
    <Taskbar 
      :windows="windows"
      @close-window="closeWindow"
      @focus-window="focusWindow"
      @toggle-minimize="toggleMinimize"
    />
  </div>
</template>

<style scoped>
.desktop {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.desktop-background {
  width: 100%;
  height: 100%;
  background-color: #1c458a;
  background-position: center;
  background-repeat: no-repeat;
  background-size: auto;
  position: relative;
}
</style>