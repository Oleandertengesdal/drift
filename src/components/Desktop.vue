<script setup lang="ts">
import { ref, computed } from 'vue';
import DesktopIcon from './DesktopIcon.vue';
import Taskbar from './Taskbar.vue';
import Window from './Window.vue';
import LoadingBar from './LoadingBar.vue';
import ExternalKioskScreen from './windows/KioskScreenWindow/ExternalKioskScreen.vue';
import InternalKioskScreen from './windows/KioskScreenWindow/InternalKioskScreen.vue';
import type { DesktopIcon as DesktopIconType, Window as WindowType } from '../types/desktop';
import wallpaper from '../assets/images/wallpaper.jpg';

const showLoadingBar = ref(false);
let pendingWindowData: { id: string, title: string, icon: string, component?: string } | null = null;

const desktopIcons = ref<DesktopIconType[]>([
  {
    id: '1',
    name: 'Om oss',
    icon: new URL('../assets/images/icons/AboutUs.png', import.meta.url).href,
    position: { x: 20, y: 20 },
    action: () => openWindow('about-us', 'Om oss', new URL('../assets/images/icons/AboutUs.png', import.meta.url).href, 'about-us'),
  },
  {
    id: '2',
    name: 'Medlemmer',
    icon: new URL('../assets/images/icons/Members.png', import.meta.url).href,
    position: { x: 20, y: 120 },
    action: () => openWindow('members', 'Medlemmer', new URL('../assets/images/icons/Members.png', import.meta.url).href, 'members'),
  },
  {
    id: '3',
    name: 'Bestilling',
    icon: new URL('../assets/images/icons/Mail.png', import.meta.url).href,
    position: { x: 20, y: 220 },
    action: () => openWindow('order', 'Bestilling', new URL('../assets/images/icons/Mail.png', import.meta.url).href, 'order'),
  },
  {
    id: '4',
    name: 'Papirkurv',
    icon: new URL('../assets/images/icons/Bin.png', import.meta.url).href,
    position: { x: 20, y: 320 },
  },
  {
    id: '5',
    name: 'Kioskskjerm',
    icon: new URL('../assets/images/icons/kiosk_screen.png', import.meta.url).href,
    position: { x: 1220, y: 120 },
    action: () => openWindow('kiosk screen', 'Kioskskjerm', new URL('../assets/images/icons/kiosk_screen.png', import.meta.url).href, 'kiosk screen'),
  },
  {
    id: '6',
    name: 'Minecraft Server',
    icon: new URL('../assets/images/icons/Minecraft_icon.svg', import.meta.url).href,
    position: {x: 120, y: 20},
    action: () => openWindow('minecraft server', 'Minecraft Server', new URL('../assets/images/icons/Minecraft_icon.svg', import.meta.url).href, 'minecraft server'),
  },
  {
    id: '7',
    name: 'Clippy',
    icon: new URL('../assets/images/icons/Clippy.webp', import.meta.url).href,
    position: { x: 500, y: 500 },
    action: () => openWindow('clippy', 'Clippy', new URL('../assets/images/icons/Clippy.webp', import.meta.url).href, 'clippy'),
  },
  
]);

const windows = ref<WindowType[]>([]);
const nextZIndex = ref(100);
const showExternalKiosk = ref(false);
const showInternalKiosk = ref(false);

const hasMaximizedWindow = computed(() => {
  return windows.value.some(w => w.isMaximized && !w.isMinimized);
});

const openWindow = (id: string, title: string, icon: string, component?: string) => {
  const existingWindow = windows.value.find(w => w.id === id);
  if (existingWindow) {
    focusWindow(id);
    if (existingWindow.isMinimized) {
      toggleMinimize(id);
    }
    return;
  }

  // 1/3 chance to show loading bar
  const shouldShowLoading = Math.random() < 1/3;
  
  if (shouldShowLoading) {
    pendingWindowData = { id, title, icon, component };
    showLoadingBar.value = true;
    return;
  }

  createWindow(id, title, icon, component);
};

const createWindow = (id: string, title: string, icon: string, component?: string) => {
  const offset = windows.value.length * 30;
  
  let windowSize = { width: 600, height: 400 };
  if (id === 'about-us') {
    windowSize = { width: 700, height: 500 };
  } 
  if (id === 'members') {
    windowSize = { width: 1200, height: 750 };
  }
  if (id === 'order') {
    windowSize = { width: 600, height: 420}
  }
  if (id === 'minecraft server') {
    windowSize = { width: 650, height: 550 };
  }
  
  const newWindow: WindowType = {
    id,
    title,
    icon,
    position: { x: 100 + offset, y: 80 + offset },
    size: windowSize,
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

const openExternalKiosk = () => {
  closeWindow('kiosk screen');
  showExternalKiosk.value = true;
  requestFullscreen();
};

const openInternalKiosk = () => {
  closeWindow('kiosk screen');
  showInternalKiosk.value = true;
  requestFullscreen();
};

const closeExternalKiosk = () => {
  showExternalKiosk.value = false;
};

const closeInternalKiosk = () => {
  showInternalKiosk.value = false;
};

const requestFullscreen = () => {
  const elem = document.documentElement;
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  }
};

const onLoadingComplete = () => {
  showLoadingBar.value = false;
  if (pendingWindowData) {
    const { id, title, icon, component } = pendingWindowData;
    createWindow(id, title, icon, component);
    pendingWindowData = null;
  }
};

const onLoadingCancel = () => {
  showLoadingBar.value = false;
  pendingWindowData = null;
};
</script>

<template>
  <div class="desktop">
    <LoadingBar 
      v-if="showLoadingBar" 
      :on-complete="onLoadingComplete" 
      :on-cancel="onLoadingCancel"
    />
    
    <ExternalKioskScreen 
      v-if="showExternalKiosk"
      @close="closeExternalKiosk"
    />
    <InternalKioskScreen 
      v-if="showInternalKiosk"
      @close="closeInternalKiosk"
    />
    
    <div v-if="!showExternalKiosk && !showInternalKiosk" class="desktop-background" :style="{ backgroundImage: `url(${wallpaper})` }">
      <DesktopIcon 
        v-for="icon in desktopIcons" 
        :key="icon.id" 
        :icon="icon" 
      />

      <Window
        v-for="window in windows"
        :key="window.id"
        :window="window"
        :open-window="openWindow"
        @close="closeWindow"
        @focus="focusWindow"
        @minimize="minimizeWindow"
        @maximize="maximizeWindow"
        @open-external-screen="openExternalKiosk"
        @open-internal-screen="openInternalKiosk"
      />
    </div>
    
    <Taskbar 
      v-if="!hasMaximizedWindow && !showExternalKiosk && !showInternalKiosk"
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