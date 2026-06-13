<template>
  <div id="app">
    <video
      id="biliVideo"
      :src="videoUrl"
      ref="video"
      @canplay="videoCanPlay"
      @timeupdate="videoUpDate"
      @ended="videoEnded"
      autoplay
    ></video>

    <showList
      :listType="listType"
      :title="listType == 'list' ? listName : songName"
      :list="listType == 'list' ? songs : videoList"
      @showList="showList"
      @changeSong="changeSong"
      @changeVideo="changeVideo"
    ></showList>

    <biliVideoControls
      :videoName="videoName"
      :currentMode="currentMode"
      :currentVolume="currentVolume"
      :isMuted="isMuted"
      :currentTime="currentTime"
      :duration="duration"
      :paused="paused"
      :listType="listType"
      @videoControl="videoControl"
      @changeTime="changeTime"
      @changeVolume="changeVolume"
    ></biliVideoControls>

    <div
      class="fullscreen-btn"
      @click="toggleFullscreen"
      :title="isFullscreen ? '退出全屏' : '全屏'"
    >
      <svg
        v-if="!isFullscreen"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
      >
        <path
          d="M3 7V3H7M13 3H17V7M17 13V17H13M7 17H3V13"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M7 3V7H3M17 7H13V3M13 17V13H17M3 13H7V17"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>

    <el-dialog
      v-model="showUrlDialog"
      title="设置歌单链接"
      width="500px"
      :close-on-click-modal="!playlistRequired"
    >
      <el-input
        v-model="songListUrlInput"
        placeholder="请输入歌单链接"
      ></el-input>
      <template #footer>
        <el-button v-if="!playlistRequired" @click="showUrlDialog = false"
          >取消</el-button
        >
        <el-button type="primary" @click="confirmSongListUrl">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import biliVideoControls from './components/biliVideoControls.vue';
import showList from './components/showList.vue';
import { searchSong, resolveVideo } from './api';

export default {
  name: 'App',
  components: { biliVideoControls, showList },
  data() {
    return {
      songs: [],
      videoList: [],
      videoUrl: '',
      randomList: [],
      currentIndex: 0,
      MODE: { LOOP: 0, SINGLE: 1, RANDOM: 2 },
      currentMode: 0,
      videoName: '',
      songName: '',
      listName: '',
      currentVolume: 70,
      currentTime: 0,
      duration: 0,
      isMuted: false,
      paused: false,
      listType: 'none',
      showUrlDialog: false,
      songListUrlInput: '',
      playlistRequired: false,
      isFullscreen: false,
    };
  },
  methods: {
    init() {
      const saved = localStorage.getItem('playlist');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.songs && data.songs.length > 0) {
            this.listName = data.name || '';
            this.songs = data.songs;
            this.playCurrent();
            return;
          }
        } catch (e) {
          /* ignore */
        }
      }
      this.playlistRequired = true;
      this.showUrlDialog = true;
    },
    playCurrent() {
      if (this.songs.length === 0) return;
      this.changeSong(this.currentIndex);
      this.resetRandomList();
      this.$nextTick(() => {
        if (this.$refs.video) {
          this.$refs.video.volume = this.currentVolume / 100;
        }
      });
    },
    confirmSongListUrl() {
      if (!this.songListUrlInput) {
        this.$message.warning('请输入歌单链接');
        return;
      }
      fetch(
        `https://sss.unmeta.cn/songlist?detailed=false&format=song-singer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `url=${encodeURIComponent(this.songListUrlInput)}`,
        },
      )
        .then((r) => r.json())
        .then((res) => {
          const playlist = {
            name: res.data.name || '',
            songs: res.data.songs || [],
          };
          localStorage.setItem('playlist', JSON.stringify(playlist));
          this.listName = playlist.name;
          this.songs = playlist.songs;
          this.currentIndex = 0;
          this.playCurrent();
          this.showUrlDialog = false;
          this.playlistRequired = false;
          this.$message.success('歌单加载成功');
        })
        .catch((err) => {
          this.$message.error(err.message || '获取歌单失败');
        });
    },
    videoCanPlay() {
      this.video = this.$refs.video;
    },
    videoUpDate() {
      this.currentTime = this.$refs.video.currentTime;
      this.duration = this.$refs.video.duration;
    },
    videoEnded() {
      if (this.currentMode == this.MODE.SINGLE) {
        this.currentTime = 0;
      } else {
        this.next();
      }
    },
    videoControl(event) {
      switch (event) {
        case 'list':
        case 'vList':
          this.showList(event);
          break;
        case 'before':
          this.prev();
          break;
        case 'next':
          this.next();
          break;
        case 'playControls':
          this.playControl();
          break;
        case 'playMode':
          this.toggleMode();
          break;
      }
    },
    showList(event) {
      this.listType = this.listType == event ? 'none' : event;
    },
    playControl() {
      if (this.paused) this.$refs.video.play();
      else this.$refs.video.pause();
      this.paused = !this.paused;
    },
    changeTime(time) {
      if (this.paused) {
        this.$refs.video.play();
        this.paused = false;
      }
      this.$refs.video.currentTime = time;
    },
    changeVolume(volume) {
      this.isMuted = volume == 0;
      this.$refs.video.volume = volume / 100;
      this.currentVolume = volume;
    },
    toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        this.isFullscreen = true;
      } else {
        document.exitFullscreen();
        this.isFullscreen = false;
      }
    },
    handleKeydown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')
        return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.playControl();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.changeVolume(Math.min(100, this.currentVolume + 5));
          this.$message.success(`当前音量:${this.currentVolume}`);
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.changeVolume(Math.max(0, this.currentVolume - 5));
          this.$message.success(`当前音量:${this.currentVolume}`);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (this.duration) {
            this.changeTime(Math.min(this.duration, this.currentTime + 5));
            this.$message.success(
              `${this.formatTime(this.currentTime)}/${this.formatTime(
                this.duration,
              )}`,
            );
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.changeTime(Math.max(0, this.currentTime - 5));
          this.$message.success(
            `${this.formatTime(this.currentTime)}/${this.formatTime(
              this.duration,
            )}`,
          );
          break;
        case 'KeyF':
          e.preventDefault();
          this.toggleFullscreen();
          break;
        case 'Escape':
          e.preventDefault();
          if (this.isFullscreen) this.toggleFullscreen();
          break;
      }
    },
    formatTime(s) {
      s = Math.floor(s || 0);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      const p = (n) => (n < 10 ? '0' + n : n);
      return h > 0 ? `${p(h)}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
    },
    async changeSong(index) {
      const songName = this.getSongName(index);
      if (!songName) return;
      try {
        const res = await searchSong(songName);
        this.currentIndex = index;
        this.songName = songName;
        this.videoList = (res.data?.result || []).filter(
          (item) => item.type == 'video',
        );
        if (this.videoList.length > 0) {
          this.changeVideo(this.videoList[0].bvid);
        }
      } catch (err) {
        this.$message.error(
          `《${songName}》${err.response?.data?.message || err.message}`,
        );
      }
    },
    async changeVideo(bvid) {
      try {
        const res = await resolveVideo(bvid);
        this.videoUrl = res.videoUrl;
        const video = this.videoList.find((item) => item.bvid === bvid);
        this.videoName = video ? video.title : '';
      } catch (err) {
        this.$message.error(err.response?.data?.message || err.message);
      }
    },
    getSongName(index) {
      if (!this.songs || this.songs.length === 0) return null;
      return this.songs[index];
    },
    next() {
      if (!this.songs || this.songs.length === 0) return;
      const index =
        this.currentMode === this.MODE.RANDOM
          ? this.getRandomNext()
          : (this.currentIndex + 1) % this.songs.length;
      this.changeSong(index);
    },
    prev() {
      if (!this.songs || this.songs.length === 0) return;
      const index =
        this.currentMode === this.MODE.RANDOM
          ? this.getRandomPrev()
          : (this.currentIndex - 1 + this.songs.length) % this.songs.length;
      this.changeSong(index);
    },
    toggleMode() {
      this.currentMode = (this.currentMode + 1) % 3;
      if (this.currentMode === this.MODE.RANDOM) this.resetRandomList();
    },
    getRandomNext() {
      if (this.randomList.length === 0) this.resetRandomList();
      let pos = this.randomList.indexOf(this.currentIndex);
      if (pos === -1) {
        this.randomList.push(this.currentIndex);
        pos = this.randomList.length - 1;
      }
      return this.randomList[(pos + 1) % this.randomList.length];
    },
    getRandomPrev() {
      if (this.randomList.length === 0) this.resetRandomList();
      let pos = this.randomList.indexOf(this.currentIndex);
      if (pos === -1) {
        this.randomList.push(this.currentIndex);
        pos = this.randomList.length - 1;
      }
      return this.randomList[
        (pos - 1 + this.randomList.length) % this.randomList.length
      ];
    },
    resetRandomList() {
      const indices = Array.from({ length: this.songs.length }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      this.randomList = indices;
      if (this.songs.length > 0) {
        const pos = this.randomList.indexOf(this.currentIndex);
        if (pos === -1) this.randomList.unshift(this.currentIndex);
        else if (pos > 0) {
          this.randomList.splice(pos, 1);
          this.randomList.unshift(this.currentIndex);
        }
      }
    },
  },
  mounted() {
    this.init();
    document.addEventListener('keydown', this.handleKeydown);
    document.addEventListener('fullscreenchange', () => {
      this.isFullscreen = !!document.fullscreenElement;
    });
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.handleKeydown);
  },
};
</script>

<style>
#app {
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
#biliVideo {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  z-index: 0;
}
.fullscreen-btn {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 100;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: all 0.2s;
  opacity: 0.2;
}
.fullscreen-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.3);
}
</style>
