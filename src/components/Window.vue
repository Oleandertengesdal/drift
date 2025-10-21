<script setup lang="ts">
import { ref, computed } from 'vue';
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
        <span>{{ window.title }}</span>
      </div>
      <div class="title-bar-controls">
        <button class="title-bar-button minimize" @click.stop="handleMinimize" title="Minimize">
          <span>_</span>
        </button>
        <button class="title-bar-button maximize" @click.stop="handleMaximize" :title="localMaximized ? 'Restore' : 'Maximize'">
          <span v-if="!localMaximized">□</span>
          <span v-else>❐</span>
        </button>
        <button class="title-bar-button close" @click.stop="handleClose" title="Close">
          <span>✕</span>
        </button>
      </div>
    </div>

    <div class="window-content">
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
  background: #c0c0c0;
  border: 2px solid;
  border-color: #ffffff #000000 #000000 #ffffff;
  box-shadow: none;
  min-width: 300px;
  min-height: 200px;
}

.title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #000080;
  padding: 2px 3px;
  cursor: move;
  user-select: none;
  height: 24px;
}

.title-bar-text {
  display: flex;
  align-items: center;
  gap: 4px;
  color: white;
  font-weight: bold;
  font-size: 11px;
  flex: 1;
  overflow: hidden;
}

.title-icon {
  width: 16px;
  height: 16px;
}

.title-bar-controls {
  display: flex;
  gap: 2px;
}

.title-bar-button {
  width: 16px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid;
  border-color: #ffffff #000000 #000000 #ffffff;
  background: #c0c0c0;
  color: #000;
  font-size: 10px;
  font-weight: bold;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.title-bar-button:hover {
  background: #c0c0c0;
}

.title-bar-button:active {
  border-color: #000000 #ffffff #ffffff #000000;
  background: #c0c0c0;
}

.title-bar-button.minimize {
  padding-bottom: 5px;
}

.title-bar-button.close {
  background: #c0c0c0;
  color: #000;
  margin-left: 2px;
}

.title-bar-button.close:hover {
  background: #c0c0c0;
}

.title-bar-button.close:active {
  border-color: #000000 #ffffff #ffffff #000000;
  background: #c0c0c0;
}

.window-content {
  flex: 1;
  overflow: auto;
  background: white;
  border-top: 2px solid;
  border-color: #808080 #ffffff #ffffff #808080;
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

.content-placeholder h2 {
  color: #000080;
  margin: 0 0 10px 0;
  font-size: 18px;
  font-weight: bold;
}

.content-placeholder p {
  color: #000;
  margin: 0;
  font-size: 14px;
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
