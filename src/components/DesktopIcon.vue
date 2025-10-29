<script setup lang="ts">
import { ref } from 'vue';
import type { DesktopIcon } from '../types/desktop';

interface Props {
  icon: DesktopIcon;
}

const props = defineProps<Props>();

const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const currentPosition = ref({ ...props.icon.position });

const startDrag = (event: MouseEvent) => {
  isDragging.value = true;
  dragOffset.value = {
    x: event.clientX - currentPosition.value.x,
    y: event.clientY - currentPosition.value.y,
  };
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
};

const onDrag = (event: MouseEvent) => {
  if (isDragging.value) {
    currentPosition.value = {
      x: event.clientX - dragOffset.value.x,
      y: event.clientY - dragOffset.value.y,
    };
  }
};

const stopDrag = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
};

const handleDoubleClick = () => {
  if (props.icon.action) {
    props.icon.action();
  }
};
</script>

<template>
  <div
    class="desktop-icon"
    :style="{
      left: `${currentPosition.x}px`,
      top: `${currentPosition.y}px`,
    }"
    @mousedown="startDrag"
    @dblclick="handleDoubleClick"
  >
    <img :src="icon.icon" :alt="icon.name" class="icon-image" />
    <span class="icon-name">{{ icon.name }}</span>
  </div>
</template>

<style scoped>
.desktop-icon {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 80px;
  cursor: pointer;
  user-select: none;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.desktop-icon:hover {
  background-color: rgba(255, 255, 255, 0.15);
}

.desktop-icon:active {
  background-color: rgba(255, 255, 255, 0.25);
}

.icon-image {
  width: 48px;
  height: 48px;
  margin-bottom: 4px;
  pointer-events: none;
}

.icon-name {
  color: white;
  font-size: 15px;
  text-align: center;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  word-wrap: break-word;
  max-width: 100%;
  line-height: 1.2;
}
</style>
