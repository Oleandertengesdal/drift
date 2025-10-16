<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <div class="container">
    <div class="logo-container">
      <img src="./pictures/Logo.png" class="logo" alt="Drift logo" />
    </div>
    <div class="counter-section">
      <button type="button" @click="count++">Click: {{ count }}</button>
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding-top: 3rem;
}

.logo-container {
  display: flex;
  justify-content: center;
}

.logo {
  max-width: 400px;
  width: 100%;
  height: auto;
}

.counter-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

button {
  font-size: 1.2em;
  padding: 0.8em 1.5em;
  border-radius: 12px;
  border: 2px solid #0066cc;
  background-color: #0066cc;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
}

button:hover {
  background-color: #0052a3;
  border-color: #0052a3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
}

button:active {
  transform: translateY(0);
}
</style>
