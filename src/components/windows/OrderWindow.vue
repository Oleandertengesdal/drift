<script setup lang="ts">
import { ref } from 'vue';

const formData = ref({
  name: '',
  email: '',
  message: '',
});

const handleSubmit = () => {
  console.log('Order submitted:', formData.value);
  alert('Order submitted! (This is a placeholder)');
};
</script>

<template>
  <div class="window-body">
    <div class="order-content">
      <h2>Place an Order</h2>
      <form @submit.prevent="handleSubmit">
        <div class="field-row-stacked">
          <label for="name">Name:</label>
          <input 
            id="name" 
            type="text" 
            v-model="formData.name"
            required
          />
        </div>
        
        <div class="field-row-stacked">
          <label for="email">Email:</label>
          <input 
            id="email" 
            type="email" 
            v-model="formData.email"
            required
          />
        </div>
        
        <div class="field-row-stacked">
          <label for="message">Message:</label>
          <textarea 
            id="message" 
            v-model="formData.message"
            rows="6"
            required
          ></textarea>
        </div>

        <div class="field-row" style="justify-content: flex-end; margin-top: 15px;">
          <button type="submit">Submit Order</button>
          <button type="button" @click="formData = { name: '', email: '', message: '' }">
            Clear
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
