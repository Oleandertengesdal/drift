<script setup lang="ts">
import { ref, onMounted } from 'vue';

const serverAddress = ref('mc.tihlde.org');
const serverStatus = ref('Laster...');
const playerCount = ref('-/-');
const isOnline = ref(false);
const isLoading = ref(true);
const serverVersion = ref('');
const motd = ref('');

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(serverAddress.value);
    alert('Server adresse kopiert!');
  } catch (err) {
    console.error('Kunne ikke kopiere:', err);
  }
};

const fetchServerStatus = async () => {
  isLoading.value = true;
  try {
    const response = await fetch(`https://api.mcsrvstat.us/3/${serverAddress.value}`);
    
    if (!response.ok) {
      throw new Error('Kunne ikke hente serverstatus');
    }
    
    const data = await response.json();
    
    if (data.online) {
      isOnline.value = true;
      serverStatus.value = 'Online';
      playerCount.value = `${data.players.online}/${data.players.max}`;
      serverVersion.value = data.version.name_clean || data.version.name_raw || '1.20.1';
      motd.value = data.motd?.clean ? data.motd.clean.join(' ') : '';
    } else {
      isOnline.value = false;
      serverStatus.value = 'Offline';
      playerCount.value = '-/-';
      serverVersion.value = 'Ukjent';
    }
  } catch (error) {
    console.error('Feil ved henting av serverstatus:', error);
    isOnline.value = false;
    serverStatus.value = 'Ukjent';
    playerCount.value = '-/-';
    serverVersion.value = 'Ukjent';
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchServerStatus();
  // Oppdatere status hvært 30. sekund, tror dt ska være greit
  setInterval(fetchServerStatus, 30000);
});
</script>

<template>
  <div class="window-body">
    <div class="minecraft-content">
      <h2>TIHLDE Minecraft Server</h2>
      
      <div class="server-info">
        <div class="info-section">
          <label>Server adresse:</label>
          <div class="address-box">
            <input 
              type="text" 
              :value="serverAddress" 
              readonly 
              class="address-input"
            />
            <button @click="copyToClipboard" class="copy-button">
              Kopier
            </button>
          </div>
        </div>

        <div class="info-section">
          <label>Status:</label>
          <div class="status-indicator">
            <span class="status-dot" :class="{ online: isOnline, loading: isLoading }"></span>
            <span>{{ serverStatus }}</span>
            <button @click="fetchServerStatus" class="refresh-button" :disabled="isLoading">
              {{ isLoading ? '...' : '↻' }}
            </button>
          </div>
        </div>

        <div class="info-section">
          <label>Spillere:</label>
          <span>{{ playerCount }}</span>
        </div>

        <div class="info-section">
          <label>Versjon:</label>
          <span>{{ serverVersion || '1.20.1' }} (Java Edition)</span>
        </div>

        <div v-if="motd" class="info-section">
          <label>MOTD:</label>
          <span class="motd-text">{{ motd }}</span>
        </div>
      </div>

      <div class="instructions">
        <h3>Slik kobler du til:</h3>
        <ol>
          <li>Åpne Minecraft Java Edition</li>
          <li>Velg "Multiplayer"</li>
          <li>Klikk "Add Server"</li>
          <li>Lim inn server adressen: <strong>{{ serverAddress }}</strong></li>
          <li>Klikk "Done" og koble til!</li>
        </ol>
      </div>

      <div class="note">
        <p><strong>Merk:</strong> ... </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.minecraft-content {
  padding: 20px;
}

.minecraft-content h2 {
  margin-top: 0;
  color: #000080;
  font-size: 24px;
}

.minecraft-content h3 {
  color: #000080;
  font-size: 18px;
  margin-top: 20px;
  margin-bottom: 10px;
}

.server-info {
  background: #ffffff;
  border: 2px solid;
  border-color: #808080 #ffffff #ffffff #808080;
  padding: 15px;
  margin: 15px 0;
}

.info-section {
  margin-bottom: 15px;
}

.info-section:last-child {
  margin-bottom: 0;
}

.info-section label {
  display: block;
  font-weight: bold;
  margin-bottom: 5px;
  font-size: 14px;
}

.address-box {
  display: flex;
  gap: 10px;
}

.address-input {
  flex: 1;
  padding: 4px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: #000000;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ff0000;
  display: inline-block;
  transition: background 0.3s ease;
}

.status-dot.online {
  background: #00ff00;
  box-shadow: 0 0 4px #00ff00;
}

.status-dot.loading {
  background: #ffaa00;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.copy-button {
  font-size: 13px;
  margin-top: -2px;
}

.refresh-button  {
  font-size: 20px;
}

.motd-text {
  font-style: italic;
  color: #666666;
  font-size: 13px;
}

.instructions {
  margin-top: 20px;
}

.instructions ol {
  margin: 10px 0;
  padding-left: 20px;
}

.instructions li {
  margin-bottom: 8px;
  line-height: 1.5;
  font-size: 14px;
}

.note {
  background: #ffffcc;
  border: 1px solid #000000;
  padding: 10px;
  margin-top: 20px;
}

.note p {
  margin: 0;
  font-size: 14px;
}
</style>

