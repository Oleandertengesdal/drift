<template>
  <div class="kiosk-screen-window">
    <h2>Velg skjermtype</h2>
    <div class="button-container">
      <RouterLink to="/kiosk-external">
        <button>Ekstern skjerm</button>
      </RouterLink>
      <RouterLink to="/kiosk">
        <button>Intern skjerm</button>
      </RouterLink>
      <!-- <button @click="openInternalScreen">Intern skjerm</button> -->
    </div>
  </div>
</template>

<style scoped>
.kiosk-screen-window {
  padding: 20px;
}

h2 {
  margin-bottom: 10px;
}

.button-container {
  display: flex;
  gap: 10px;
  flex-direction: column;
}

button {
  padding: 10px 20px;
  min-width: 200px;
  cursor: pointer;
  width: 100%;
}
</style>
