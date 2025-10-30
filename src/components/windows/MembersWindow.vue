<script setup lang="ts">
import { ref } from 'vue';

interface Member {
  id: string;
  name: string;
  role: string;
  image?: string;
}

const members = ref<Member[]>([
  { id: '1', name: 'Medlem 1', role: 'Rolle 1' },
  { id: '2', name: 'Medlem 2', role: 'Rolle 2' },
  { id: '3', name: 'Medlem 3', role: 'Rolle 3' },
]);
</script>

<template>
  <div class="window-body">
    <div class="members-content">
      <h2>Drift-medlemmer</h2>
      <div class="members-list">
        <div v-for="member in members" :key="member.id" class="member-card">
          <div class="field-row-stacked">
            <label>{{ member.name }}</label>
            <p>{{ member.role }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.members-content {
  padding: 20px;
}

.members-content h2 {
  margin-top: 0;
  color: #000080;
}

.members-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.member-card {
  padding: 10px;
  border: 2px solid;
  border-color: #ffffff #000000 #000000 #ffffff;
  background: #c0c0c0;
}

.member-card label {
  font-weight: bold;
  margin-bottom: 5px;
}

.member-card p {
  margin: 5px 0 0 0;
}
</style>
