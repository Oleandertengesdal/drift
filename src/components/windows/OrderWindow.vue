<script setup lang="ts">
import { ref } from 'vue';

const formData = ref({
  name: '',
  email: '',
  message: '',
});

const handleSubmit = () => {
  console.log('Bestilling sendt inn:', formData.value);
  alert('Bestilling sendt inn! (Dette er en midlertidig melding)');
};
</script>

<template>
  <div class="window-body">
    <div class="order-content">
      <h2>Opprett bestilling</h2>
      <form @submit.prevent="handleSubmit">
        <div class="field-row-stacked">
          <label for="name">Navn:</label>
          <input 
            id="name" 
            type="text" 
            v-model="formData.name"
            required
          />
        </div>
        
        <div class="field-row-stacked">
          <label for="email">E-post:</label>
          <input 
            id="email" 
            type="email" 
            v-model="formData.email"
            required
          />
        </div>
        
        <div class="field-row-stacked">
          <label for="message">Melding:</label>
          <textarea 
            id="message" 
            v-model="formData.message"
            rows="6"
            required
          ></textarea>
        </div>

        <div class="field-row" style="justify-content: flex-end; margin-top: 15px;">
          <button type="submit">Send bestilling</button>
          <button type="button" @click="formData = { name: '', email: '', message: '' }">
            Tøm
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.order-content {
  padding: 20px;
}

.order-content h2 {
  margin-top: 0;
  color: #000080;
  margin-bottom: 20px;
}

.field-row-stacked {
  margin-bottom: 15px;
}

.field-row {
  display: flex;
  gap: 10px;
}
</style>
