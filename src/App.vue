<template>
  <div id="app">
    <div v-if="!isLoggedIn" class="login-overlay">
      <div class="login-dialog">
        <h2>B站音乐视频播放器</h2>
        <p>请先登录B站账号以使用搜索和播放功能</p>
        <el-button type="primary" size="large" @click="startLogin"
          >登录B站</el-button
        >
      </div>
    </div>

    <template v-else>
      <div class="titlebar">
        <div class="titlebar-drag"></div>
        <div class="titlebar-right">
          <div class="user-info" @click="showUserMenu = !showUserMenu">
            <img v-if="userFace" :src="userFace" class="user-avatar" />
            <span v-if="userName" class="user-name">{{ userName }}</span>
          </div>
          <transition name="fade">
            <div v-if="showUserMenu" class="user-menu">
              <div
                class="menu-item"
                @click="
                  showUrlDialog = true;
                  showUserMenu = false;
                "
              >
                设置歌单
              </div>
              <div class="menu-item" @click="handleReLogin">退出登录</div>
            </div>
          </transition>
          <div class="win-btn" @click="winMinimize" title="最小化">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect y="5" width="12" height="1" fill="currentColor" />
            </svg>
          </div>
          <div
            class="win-btn"
            @click="winMaximize"
            :title="isMaximized ? '向下还原' : '最大化'"
          >
            <svg v-if="!isMaximized" width="12" height="12" viewBox="0 0 12 12">
              <rect
                x="1"
                y="1"
                width="10"
                height="10"
                rx="1"
                fill="none"
                stroke="currentColor"
                stroke-width="1"
              />
            </svg>
            <svg v-else width="12" height="12" viewBox="0 0 12 12">
              <rect
                x="2.5"
                y="3.5"
                width="7"
                height="7"
                rx="0.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1"
              />
              <path
                d="M4 3.5V2a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1H8"
                fill="none"
                stroke="currentColor"
                stroke-width="1"
              />
            </svg>
          </div>
          <div class="win-btn win-close" @click="winClose" title="关闭">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path
                d="M1 1L11 11M1 11L11 1"
                stroke="currentColor"
                stroke-width="1.2"
              />
            </svg>
          </div>
        </div>
      </div>

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
    </template>
  </div>
</template>

<script>
import biliVideoControls from './components/biliVideoControls.vue';
import showList from './components/showList.vue';
import electronApi from './api/electron';
import { th } from 'element-plus/es/locales.mjs';

export default {
  name: 'App',
  components: { biliVideoControls, showList },
  data() {
    return {
      isLoggedIn: false,
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
      userFace: '',
      userName: '',
      showUserMenu: false,
      isMaximized: false,
      isFullscreen: false,
      removeLoginListener: null,
      removeMaximizedListener: null,
      removeFullscreenListener: null,
    };
  },
  methods: {
    async init() {
      const hasCookie = await electronApi.checkCookie();
      if (!hasCookie) {
        this.isLoggedIn = false;
        return;
      }
      this.isLoggedIn = true;
      this.isMaximized = await electronApi.winIsMaximized();
      this.isFullscreen = await electronApi.winIsFullscreen();
      this.loadUserInfo();
      await this.loadPlaylist();
    },
    async loadUserInfo() {
      try {
        const info = await electronApi.getUserInfo();
        this.userFace = info.face;
        this.userName = info.name;
      } catch {}
    },
    async loadPlaylist() {
      const saved = await electronApi.getPlaylist();
      if (saved && saved.songs && saved.songs.length > 0) {
        this.listName = saved.name || '';
        this.songs = saved.songs;
        this.playCurrent();
        return;
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
    async confirmSongListUrl() {
      if (!this.songListUrlInput) {
        this.$message.warning('请输入歌单链接');
        return;
      }
      try {
        const res = await electronApi.fetchSongList(this.songListUrlInput);
        const playlist = { name: res.name || '', songs: res.songs || [] };
        await electronApi.savePlaylist(playlist);
        this.listName = playlist.name;
        this.songs = playlist.songs;
        this.currentIndex = 0;
        this.playCurrent();
        this.showUrlDialog = false;
        this.playlistRequired = false;
        this.$message.success('歌单加载成功');
      } catch (err) {
        this.$message.error(err.message);
      }
    },
    async startLogin() {
      await electronApi.startLogin();
    },
    async handleReLogin() {
      this.showUserMenu = false;
      await electronApi.reLogin();
    },
    winMinimize() {
      electronApi.winMinimize();
    },
    winMaximize() {
      if (!this.isFullscreen) this.toggleFullscreen;
      electronApi.winMaximize();
    },
    winClose() {
      electronApi.winClose();
    },
    async toggleFullscreen() {
      this.isFullscreen = await electronApi.winToggleFullscreen();
      this.$message.info(
        this.isFullscreen
          ? '进入全屏,按esc或F键可以退出全屏'
          : '退出全屏,按F键可以再次进入全屏',
      );
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
    formatTime(s) {
      s = Math.floor(s || 0);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      const p = (n) => (n < 10 ? '0' + n : n);
      return h > 0 ? `${p(h)}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
    },
    handleKeydown(e) {
      if (!this.isLoggedIn) return;
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
              `${this.formatTime(this.currentTime)}/${this.formatTime(this.duration)}`,
            );
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.changeTime(Math.max(0, this.currentTime - 5));
          this.$message.success(
            `${this.formatTime(this.currentTime)}/${this.formatTime(this.duration)}`,
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
    async changeSong(index) {
      if (!this.isLoggedIn) return;
      const songName = this.getSongName(index);
      if (!songName) return;
      try {
        const res = await electronApi.searchSong(songName);
        this.currentIndex = index;
        this.songName = songName;
        this.videoList =
          res.result.filter((item) => item.type == 'video') || [];
        if (this.videoList.length > 0) {
          this.changeVideo(this.videoList[0].bvid);
        }
      } catch (err) {
        if (err.message === 'AUTH_FAILED' || err.message === 'NO_COOKIE') {
          this.isLoggedIn = false;
          this.$message.error('登录已过期，请重新登录');
          return;
        }
        this.$message.error(`《${songName}》${err.message}`);
      }
    },
    async changeVideo(bvid) {
      if (!this.isLoggedIn) return;
      try {
        const res = await electronApi.resolveVideoUrl(bvid);
        this.videoUrl = res.videoUrl;
        const video = this.videoList.find((item) => item.bvid === bvid);
        this.videoName = video ? video.title : '';
      } catch (err) {
        if (err.message === 'AUTH_FAILED' || err.message === 'NO_COOKIE') {
          this.isLoggedIn = false;
          this.$message.error('登录已过期，请重新登录');
          return;
        }
        this.$message.error(err.message);
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
    this.removeLoginListener = electronApi.onLoginSuccess(() => {
      this.isLoggedIn = true;
      this.loadUserInfo();
      this.loadPlaylist();
    });
    this.removeMaximizedListener = electronApi.onMaximized((val) => {
      this.isMaximized = val;
    });
    this.removeFullscreenListener = electronApi.onFullscreen((val) => {
      this.isFullscreen = val;
    });
    document.addEventListener('keydown', this.handleKeydown);
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-info') && !e.target.closest('.user-menu')) {
        this.showUserMenu = false;
      }
    });
  },
  beforeUnmount() {
    if (this.removeLoginListener) this.removeLoginListener();
    if (this.removeMaximizedListener) this.removeMaximizedListener();
    if (this.removeFullscreenListener) this.removeFullscreenListener();
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

.login-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.login-dialog {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 40px 50px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}
.login-dialog h2 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 24px;
}
.login-dialog p {
  margin: 0 0 24px 0;
  color: #666;
  font-size: 14px;
}

.titlebar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 36px;
  z-index: 200;
  display: flex;
  align-items: center;
}
.titlebar-drag {
  flex: 1;
  height: 100%;
  -webkit-app-region: drag;
}
.titlebar-right {
  display: flex;
  align-items: center;
  gap: 2px;
  padding-right: 4px;
  -webkit-app-region: no-drag;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 2px 10px 2px 2px;
  margin-right: 4px;
  transition: background 0.2s;
}
.user-info:hover {
  background: rgba(255, 255, 255, 0.25);
}
.user-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.3);
}
.user-name {
  color: white;
  font-size: 12px;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-menu {
  position: absolute;
  top: 100%;
  right: 60px;
  margin-top: 4px;
  background: rgba(30, 30, 30, 0.92);
  border-radius: 8px;
  overflow: hidden;
  min-width: 120px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}
.menu-item {
  padding: 10px 16px;
  color: #eee;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}
.menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.win-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.8);
  transition: background 0.15s;
  border-radius: 4px;
}
.win-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}
.win-close:hover {
  background: #e81123 !important;
  color: white;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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
