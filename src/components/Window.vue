<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue';
import type { Window } from '../types/desktop';

interface Props {
  window: Window;
}

interface Emits {
  (e: 'close', id: string): void;
  (e: 'focus', id: string): void;
  (e: 'minimize', id: string): void;
  (e: 'maximize', id: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const AboutUsWindow = defineAsyncComponent(() => import('./windows/AboutUsWindow.vue'));
const MembersWindow = defineAsyncComponent(() => import('./windows/MembersWindow.vue'));
const OrderWindow = defineAsyncComponent(() => import('./windows/OrderWindow.vue'));
const BinWindow = defineAsyncComponent(() => import('./windows/BinWindow.vue'));
const KioskScreenWindow = defineAsyncComponent(() => import('./windows/KioskScreenWindow.vue'));

const componentMap: Record<string, any> = {
  'about-us': AboutUsWindow,
  'members': MembersWindow,
  'order': OrderWindow,
  'bin': BinWindow,
  'kiosk screen': KioskScreenWindow,
};

const windowComponent = computed(() => {
  return props.window.component ? componentMap[props.window.component] : null;
});

const isDragging = ref(false);
const isResizing = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const resizeStart = ref({ width: 0, height: 0, mouseX: 0, mouseY: 0 });

const localPosition = ref({ ...props.window.position });
const localSize = ref({ ...props.window.size });
const localMaximized = ref(props.window.isMaximized);

const windowStyle = computed(() => {
  if (localMaximized.value) {
    return {
      left: '0px',
      top: '0px',
      width: '100vw',
      height: 'calc(100vh - 40px)',
      zIndex: props.window.zIndex,
    };
  }
  return {
    left: `${localPosition.value.x}px`,
    top: `${localPosition.value.y}px`,
    width: `${localSize.value.width}px`,
    height: `${localSize.value.height}px`,
    zIndex: props.window.zIndex,
  };
});

const startDrag = (event: MouseEvent) => {
  if (localMaximized.value) return;
  
  emit('focus', props.window.id);
  isDragging.value = true;
  dragOffset.value = {
    x: event.clientX - localPosition.value.x,
    y: event.clientY - localPosition.value.y,
  };
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
};

const onDrag = (event: MouseEvent) => {
  if (isDragging.value) {
    localPosition.value = {
      x: Math.max(0, event.clientX - dragOffset.value.x),
      y: Math.max(0, event.clientY - dragOffset.value.y),
    };
  }
};

const stopDrag = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
};

const startResize = (event: MouseEvent) => {
  if (localMaximized.value) return;
  
  event.preventDefault();
  emit('focus', props.window.id);
  isResizing.value = true;
  resizeStart.value = {
    width: localSize.value.width,
    height: localSize.value.height,
    mouseX: event.clientX,
    mouseY: event.clientY,
  };
  document.addEventListener('mousemove', onResize);
  document.addEventListener('mouseup', stopResize);
};

const onResize = (event: MouseEvent) => {
  if (isResizing.value) {
    const deltaX = event.clientX - resizeStart.value.mouseX;
    const deltaY = event.clientY - resizeStart.value.mouseY;
    
    localSize.value = {
      width: Math.max(300, resizeStart.value.width + deltaX),
      height: Math.max(200, resizeStart.value.height + deltaY),
    };
  }
};

const stopResize = () => {
  isResizing.value = false;
  document.removeEventListener('mousemove', onResize);
  document.removeEventListener('mouseup', stopResize);
};

const handleClose = () => {
  emit('close', props.window.id);
};

const handleMinimize = () => {
  emit('minimize', props.window.id);
};

const handleMaximize = () => {
  localMaximized.value = !localMaximized.value;
  emit('maximize', props.window.id);
};

const handleFocus = () => {
  emit('focus', props.window.id);
};
</script>

<template>
  <div 
    v-if="!window.isMinimized"
    class="window" 
    :style="windowStyle"
    @mousedown="handleFocus"
  >
    <div class="title-bar" @mousedown="startDrag">
      <div class="title-bar-text">
        <img :src="window.icon" alt="" class="title-icon" />
        {{ window.title }}
      </div>
      <div class="title-bar-controls">
        <button 
          aria-label="Minimize" 
          @click.stop="handleMinimize"
        ></button>
        <button 
          aria-label="Maximize" 
          @click.stop="handleMaximize"
        ></button>
        <button 
          aria-label="Close" 
          @click.stop="handleClose"
        ></button>
      </div>
    </div>

    <component 
      :is="windowComponent" 
      v-if="windowComponent"
      class="window-content-component"
    />
    <div v-else class="window-body">
      <div class="content-placeholder">
        <img :src="window.icon" alt="" class="content-icon" />
        <h2>{{ window.title }}</h2>
        <p>Window content will be implemented here.</p>
      </div>
    </div>
    
    <div 
      v-if="!localMaximized"
      class="resize-handle" 
      @mousedown.stop="startResize"
    ></div>
  </div>
</template>

<style scoped>
.window {
  position: absolute;
  display: flex;
  flex-direction: column;
  min-width: 300px;
  min-height: 200px;
}

.title-bar {
  cursor: move;
  user-select: none;
}

.title-icon {
  width: 16px;
  height: 16px;
  margin-right: 4px;
  vertical-align: middle;
}

.window-content-component {
  flex: 1;
  overflow: auto;
}

.content-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
  height: 100%;
}

.content-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 20px;
}

.resize-handle {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  cursor: nwse-resize;
  background: transparent;
}

.resize-handle::after {
  content: '';
  position: absolute;
  bottom: 0;
  right: 0;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 0 12px 12px;
  border-color: transparent transparent #808080 transparent;
}
</style>
