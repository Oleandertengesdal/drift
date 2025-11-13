<script setup lang="ts">
import { ref } from "vue";
import clippyImg from '../../assets/images/icons/clippy.webp';


const messages = ref([
  { from: "clippy", text: "It looks like you're trying to ask a question!" }
]);

const userInput = ref("");
const isLoading = ref(false);

const sendMessage = async () => {
  if (!userInput.value.trim()) return;

  const userText = userInput.value;
  messages.value.push({ from: "user", text: userText });
  userInput.value = "";
  isLoading.value = true;

  const thinkingIndex = messages.value.push({
    from: "clippy",
    text: "Let me think..."
  }) - 1;

  try {
    const response = await fetch("http://129.241.100.98:8000/internal/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "super-secret-token"
      },
      body: JSON.stringify({ question: userText })
    });

    const data = await response.json();
    messages.value[thinkingIndex] = {
      from: "clippy",
      text: data.answer || "I'm not sure how to respond!"
    };
  } catch {
    messages.value[thinkingIndex] = {
      from: "clippy",
      text: "Oops! Something went wrong connecting to TIHLDE's servers."
    };
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="window-body">
    <div class="clippy-wrapper">

      <!-- Left Column: Speech Bubble + Chat -->
      <div class="bubble-column">
        <div class="clippy-bubble">
          <div class="bubble-content">
            <span>{{ messages[messages.length - 1]?.text }}</span>
          </div>
          <div class="bubble-tail"></div>
        </div>

        <!-- Chat history -->
        <div class="chat-area">
          <div 
            v-for="(msg, i) in messages.slice(0, -1)" 
            :key="i"
            :class="['chat-msg', msg.from]"
          >
            <b>{{ msg.from === 'clippy' ? 'Clippy:' : 'You:' }}</b>
            {{ msg.text }}
          </div>
        </div>

        <!-- Chat input -->
        <form @submit.prevent="sendMessage" class="field-row" style="margin-top:10px;">
          <input 
            type="text"
            v-model="userInput"
            placeholder="Ask Clippy..."
            class="chat-input"
          >
          <button type="submit" :disabled="isLoading">Send</button>
        </form>
      </div>

      <!-- Right Column: Clippy Graphic -->
      <div class="clippy-column">
        <img :src="clippyImg" alt="Clippy" class="clippy-image" />
      </div>

    </div>
  </div>
</template>

<style scoped>
.clippy-wrapper {
  display: flex;
  gap: 20px;
  padding: 10px;
  height: 100%;
}

.bubble-column {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* ---- Clippy Speech Bubble ---- */
.clippy-bubble {
  position: relative;
  padding: 12px 15px;
  border: 2px solid black;
  border-radius: 15px;
  background: white;
  max-width: 80%;
  margin-bottom: 10px;
}

.bubble-content {
  font-size: 14px;
  line-height: 1.4;
}

/* Tail pointing toward clippy */
.bubble-tail {
  position: absolute;
  right: -20px;
  top: 18px;
  width: 0;
  height: 0;
  border-left: 20px solid black;
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
}

/* ---- Chat History ---- */
.chat-area {
  overflow-y: auto;
  flex: 1;
  margin-top: 5px;
}

.chat-msg {
  margin-bottom: 6px;
  font-size: 13px;
}

/* ---- Clippy Graphic ---- */
.clippy-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.clippy-image {
  width: 120px;
  z-index: 2;
}

.clippy-paper {
  width: 160px;
  margin-top: -40px;
  z-index: 1;
  opacity: 0.85;
}

/* ---- Input ---- */
.chat-input {
  flex: 1;
}
</style>