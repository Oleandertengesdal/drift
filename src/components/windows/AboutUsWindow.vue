<script setup lang="ts">
import pixelCar from '../../assets/images/other/pixel_car.gif';

interface Props {
  openWindow?: (id: string, title: string, icon: string, component?: string) => void;
}

const props = defineProps<Props>();

const handlePixelCarClick = () => {
  if (props.openWindow) {
    props.openWindow('drift-gif', 'Drift', pixelCar, 'drift-gif');
  }
};
</script>

<template>
  <div class="window-body">
    <div class="about-us-content">
      <h2>Om TIHLDE Drift</h2>
      <p>Velkommen til TIHLDE Drift</p>
      <p>TIHLDE Drift består av 19 personer som hjelper å vedlikeholde TIHLDE's datasystemer og infrastruktur.</p>
      <p>Vi jobber med blant annet: </p>
      <p>- 1</p>
      <p>- 2</p>
      <p>- 3</p>
      <p></p>
      <p>Om du har noen spørsmål kan du kontakte oss via epost til: <a href="mailto:driftsminister@tihlde.org">driftsminister@tihlde.org</a></p>
      
      <img 
        :src="pixelCar" 
        alt="Pixel Car" 
        class="pixel-car"
        @click="handlePixelCarClick"
      />
    </div>
  </div>
</template>

<style scoped>
.about-us-content {
  padding: 10px;
  position: relative;
}

.about-us-content h2 {
  margin-top: 0;
  color: #000080;
  font-size: 32px;
}

.about-us-content p {
  margin: 10px 0;
  line-height: 1.6;
  font-size: 18px; 
}

.pixel-car {
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 48px;
  height: auto;
  cursor: pointer;
}
</style>
