<script setup lang="ts">
import driftGif from '../../assets/images/other/drift.gif';
</script>

<template>
  <div class="window-body">
    <div class="drift-gif-content">
      <img :src="driftGif" alt="Drift GIF" class="drift-gif" />
    </div>
  </div>
</template>

<style scoped>
.drift-gif-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: #c0c0c0;
  padding: 10px;
}

.drift-gif {
  width: 800px;
  height: auto;
}
</style>
