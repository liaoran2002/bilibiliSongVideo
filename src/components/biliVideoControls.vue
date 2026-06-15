<template>
  <div id="biliVideoControls">
    <div class="videoName-container">
      <div :class="['videoName-scroll', paused ? 'paused' : '']">
        <span v-html="videoName"></span>
        <span v-html="videoName"></span>
      </div>
    </div>
    <div id="controls">
      <i
        :class="[
          'iconfont',
          listType == 'list' ? 'icon-cuowu' : 'icon-yinleliebiao',
        ]"
        @click="$emit('videoControl', 'list')"
        id="list"
      ></i>
      <i
        :class="[
          'iconfont',
          listType == 'vList' ? 'icon-cuowu' : 'icon-bofangliebiao',
        ]"
        @click="$emit('videoControl', 'vList')"
        id="vList"
      ></i>
      <i
        class="iconfont icon-play-previous"
        @click="$emit('videoControl', 'before')"
        id="before"
      ></i>
      <i
        :class="['iconfont', paused ? 'icon-play' : 'icon-pause']"
        @click="$emit('videoControl', 'playControls')"
        id="playControls"
      ></i>
      <i
        class="iconfont icon-play-next"
        @click="$emit('videoControl', 'next')"
        id="next"
      ></i>
      <div class="audio-control">
        <i
          :class="['iconfont', isMuted ? 'icon-sound-off' : 'icon-sound-on']"
          @click="toggleMute"
          id="sound"
        ></i>
        <div
          :class="['volume-slider', isSoundDragging ? 'show' : '']"
          id="volume-slider"
        >
          <div
            class="volume-track"
            id="volume-track"
            @pointerdown.prevent="onVolumeDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
          >
            <div
              class="volume-progress"
              id="volumeProgress"
              :style="{
                height:
                  (isSoundDragging ? draggingVolume : currentVolume) + '%',
              }"
            ></div>
            <div
              class="volume-thumb"
              id="volumeThumb"
              :style="{
                bottom:
                  (isSoundDragging ? draggingVolume : currentVolume) + '%',
              }"
            ></div>
          </div>
          <div class="volume-number" id="volume-number">
            {{ isSoundDragging ? draggingVolume : currentVolume }}
          </div>
        </div>
      </div>
      <i
        :class="[
          'iconfont',
          currentMode
            ? currentMode == 1
              ? 'icon-danquxunhuan'
              : 'icon-ziyuanldpi'
            : 'icon-shunxubofang',
        ]"
        @click="$emit('videoControl', 'playMode')"
        id="playMode"
      ></i>
    </div>
    <div class="progressContainer">
      <div class="time" id="currentTime">
        {{ formatTime(isVideoDragging ? draggingTime : currentTime) }}
      </div>
      <div
        class="progressWrapper"
        id="progressContainer"
        @pointerdown.prevent="onProgressDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
      >
        <div
          class="progressBar"
          :style="{ width: progress * 100 + '%' }"
          id="progressBar"
        >
          <div class="progressHandle" id="progressHandle"></div>
        </div>
      </div>
      <div class="time" id="totalTime">{{ formatTime(duration) }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'biliVideoControls',
  data() {
    return {
      isVideoDragging: false,
      isSoundDragging: false,
      draggingTime: 0,
      draggingVolume: 0,
      activeEl: null,
    };
  },
  props: {
    videoName: { type: String, default: '' },
    currentMode: { type: Number, default: 0 },
    currentVolume: { type: Number, default: 0 },
    isMuted: { type: Boolean, default: false },
    currentTime: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    paused: { type: Boolean, default: false },
    listType: { type: String, default: '' },
  },
  methods: {
    formatTime(s) {
      s = Math.floor(s || 0);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      const p = (n) => (n < 10 ? '0' + n : n);
      return h > 0 ? `${p(h)}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
    },
    toggleMute() {
      if (this.isMuted) this.$emit('changeVolume', this.draggingVolume);
      else {
        this.draggingVolume = this.currentVolume;
        this.$emit('changeVolume', 0);
      }
    },
    onProgressDown(e) {
      this.isVideoDragging = true;
      this.activeEl = e.currentTarget;
      this.activeEl.setPointerCapture(e.pointerId);
      this.calcProgress(e);
    },
    onVolumeDown(e) {
      this.isSoundDragging = true;
      this.activeEl = e.currentTarget;
      this.activeEl.setPointerCapture(e.pointerId);
      this.calcVolume(e);
    },
    onPointerMove(e) {
      if (this.isVideoDragging) this.calcProgress(e);
      else if (this.isSoundDragging) this.calcVolume(e);
    },
    onPointerUp(e) {
      if (this.activeEl) {
        try {
          this.activeEl.releasePointerCapture(e.pointerId);
        } catch {}
        this.activeEl = null;
      }
      if (this.isVideoDragging) {
        this.isVideoDragging = false;
      }
      if (this.isSoundDragging) {
        this.isSoundDragging = false;
      }
    },
    calcProgress(e) {
      const el = this.activeEl || this.$el.querySelector('#progressContainer');
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pos = Math.min(
        Math.max(0, (e.clientX - rect.left) / rect.width),
        1,
      );
      this.draggingTime = pos * this.duration;
      this.$emit('changeTime', this.draggingTime);
    },
    calcVolume(e) {
      const el = this.activeEl || this.$el.querySelector('#volume-track');
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const y = rect.bottom - e.clientY;
      let pct = Math.min(Math.max(0, y / rect.height), 1);
      this.draggingVolume = Math.round(pct * 100);
      this.$emit('changeVolume', this.draggingVolume);
    },
  },
  computed: {
    progress() {
      return (
        (this.isVideoDragging ? this.draggingTime : this.currentTime) /
        (this.duration || 1)
      );
    },
  },
};
</script>

<style>
#biliVideoControls {
  color: white;
  position: fixed;
  bottom: 1%;
  left: 50%;
  user-select: none;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  padding: 20px;
  min-width: 10vw;
  max-width: 50vw;
  transform: translate(-50%, 0%);
  opacity: 0.1;
  transition: all 0.5s ease-in-out;
  font-size: 5vh;
}
#biliVideoControls:hover {
  opacity: 1;
  box-shadow:
    0 1px 4px rgba(0, 0, 0, 0.9),
    0 0 8px rgba(0, 0, 0, 0.5);
  text-shadow:
    0 1px 4px rgba(0, 0, 0, 0.9),
    0 0 10px rgba(0, 0, 0, 0.5);
}
.videoName-container {
  overflow: hidden;
  white-space: nowrap;
  position: relative;
  width: 100%;
}
.videoName-scroll {
  display: inline-flex;
  gap: 5em;
  text-shadow:
    0 1px 4px rgba(0, 0, 0, 0.9),
    0 0 8px rgba(0, 0, 0, 0.5);
  animation: scroll-left 10s linear infinite;
}
.videoName-scroll.paused {
  animation-play-state: paused;
}
.videoName-container:hover .videoName-scroll {
  animation-play-state: paused;
}
.videoName-scroll span {
  white-space: nowrap;
}
@keyframes scroll-left {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(calc(-50% - 1.5em));
  }
}
#controls {
  display: flex;
  align-items: center;
  justify-content: space-evenly;
}
#controls i {
  font-size: 10vh;
  height: 10vh;
  line-height: 10vh;
}
.audio-control {
  position: relative;
  display: inline-block;
  cursor: pointer;
}
.audio-control .volume-slider {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 30px;
  height: 120px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  padding: 8px 5px;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.2s,
    visibility 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 8px;
}
.audio-control:hover .volume-slider {
  opacity: 1;
  visibility: visible;
}
.show {
  opacity: 1 !important;
  visibility: visible !important;
}
.volume-track {
  width: 4px;
  height: 100%;
  background: rgba(255, 255, 255, 0.3);
  box-shadow:
    0 1px 4px rgba(0, 0, 0, 0.9),
    0 0 8px rgba(0, 0, 0, 0.5);
  border-radius: 2px;
  position: relative;
  touch-action: none;
}
.volume-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 70%;
  background: white;
  border-radius: 2px;
  transition: height 0.1s ease;
}
.volume-thumb {
  position: absolute;
  left: 50%;
  bottom: 70%;
  transform: translate(-50%, 50%);
  width: 12px;
  height: 12px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
  box-shadow:
    0 1px 4px rgba(0, 0, 0, 0.9),
    0 0 8px rgba(0, 0, 0, 0.5);
  transition: bottom 0.1s ease;
}
.volume-number {
  font-size: 2vh;
}
.time {
  font-size: 14px;
  min-width: 60px;
  text-align: center;
  text-shadow:
    0 1px 4px rgba(0, 0, 0, 0.9),
    0 0 8px rgba(0, 0, 0, 0.5);
}
.progressContainer {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 5px;
  margin-top: 15px;
  position: relative;
}
.progressWrapper {
  flex: 1;
  height: 5px;
  background-color: rgba(255, 255, 255, 0.3);
  position: relative;
  touch-action: none;
  cursor: pointer;
}
.progressBar {
  height: 100%;
  background-color: rgba(255, 255, 255, 0.8);
  box-shadow:
    0 1px 4px rgba(0, 0, 0, 0.9),
    0 0 8px rgba(0, 0, 0, 0.5);
  position: relative;
}
.progressHandle {
  position: absolute;
  right: -5px;
  top: 50%;
  transform: translateY(-50%);
  width: 15px;
  height: 15px;
  background-color: #fff;
  border-radius: 50%;
  box-shadow:
    0 1px 4px rgba(0, 0, 0, 0.9),
    0 0 8px rgba(0, 0, 0, 0.5);
  display: none;
}
#biliVideoControls:hover .progressHandle {
  display: block;
}
</style>
