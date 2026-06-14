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
        <el-button
          type="primary"
          :loading="loadingPlaylist"
          :disabled="loadingPlaylist"
          @click="confirmSongListUrl"
        >
          {{ loadingPlaylist ? '加载中...' : '确定' }}
        </el-button>
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
      songToken: 0,
      tagBonusConfig: {
        5: [
          'MV', 'Official', '官方', '原唱版', '华语MV', '原版', '蓝光', '超清', '4K',
        ],
        3: [
          'Live', '高清', '无损', 'Hi-Res', 'Hi-Fi', '高音质', '录音棚', '动态歌词',
          '微电影', '音乐现场', '演唱会', '舞台', '原画', '8K', '2K', '1080P',
          '杜比音效', '全景声', 'DTS', '母带音质', '现场版', '巡演', '音乐节',
          '录音室', '超清原画', '动态频谱', '沉浸式音效',
        ],
        '-2': [
          '翻唱', '合唱', '阿卡贝拉', '书本打击', '音乐可视化', '音高可视化',
          '录屏', '歌单', '精选歌单', '电台', '改编', '萌系翻唱', '双人合唱',
          '多人合唱', '可视化音频', '歌词可视化', '录屏版', '私人歌单', '主题歌单',
          '音乐电台', '情感电台', '分享', '推荐', '翻唱合集', '混剪', '卡点',
        ],
        '-4': [
          '演奏', '口琴', '萨克斯', '吉他', '架子鼓', '非洲鼓', '钢琴', '古筝',
          '打击乐', '小提琴', '大提琴', '二胡', '琵琶', '竹笛', '扬琴', '贝斯',
          '电子琴', '手鼓', '马林巴', '纯音乐演奏', '乐器独奏', '乐器合奏',
          '即兴演奏', '指弹吉他',
        ],
        '-6': [
          '教学', '教程', '鼓谱', '吉他谱', '动态鼓谱', '卡拉OK', '歌词排版',
          'VJ素材', '零基础教学', '进阶教程', '钢琴谱', '简谱', '五线谱', '动态谱',
          '字幕排版', 'VJ循环素材', '背景音乐素材',
        ],
        '-20': ['伴奏', '纯伴奏', '无和声', '消音', 'instrumental'],
      },
      loadingPlaylist: false,
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
    async confirmSongListUrl() {
      if (!this.songListUrlInput) {
        this.$message.warning('请输入歌单链接');
        return;
      }
      this.loadingPlaylist = true;
      try {
        const playlist = await new Promise((resolve, reject) => {
          fetch(
            `https://sss.unmeta.cn/songlist?detailed=false&format=song-singer`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: `url=${encodeURIComponent(this.songListUrlInput)}`,
            },
          )
            .then((r) => r.json())
            .then((res) => resolve({ name: res.data.name || '', songs: res.data.songs || [] }))
            .catch(reject);
        });
        localStorage.setItem('playlist', JSON.stringify(playlist));
        this.listName = playlist.name;
        this.songs = playlist.songs;
        this.currentIndex = 0;
        this.playCurrent();
        this.showUrlDialog = false;
        this.playlistRequired = false;
        this.$message.success('歌单加载成功');
      } catch (err) {
        this.$message.error(err.message || '获取歌单失败');
      } finally {
        this.loadingPlaylist = false;
      }
    },
    videoCanPlay() {
      this.video = this.$refs.video;
    },
    videoUpDate() {
      if (!this.$refs.video) return;
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
      const token = ++this.songToken;
      this.paused = false;
      try {
        const res = await searchSong(songName);
        if (token !== this.songToken) return;
        const all = res.data?.result || [];
        const videos = all.filter((item) => item.type == 'video' || item.bvid);
        const keywords = songName.replace(/-/g, '').trim();
        const parts = songName.split('-').map((s) => s.trim());
        const realSongName = parts[0] || '';
        const artistName = parts[1] || '';
        videos.sort((a, b) => {
          const sa =
            this.matchScore(a.title, keywords) +
            this.nameBonus(a.title, realSongName, artistName);
          const sb =
            this.matchScore(b.title, keywords) +
            this.nameBonus(b.title, realSongName, artistName);
          return sb + this.tagBonus(b.title) - (sa + this.tagBonus(a.title));
        });
        this.currentIndex = index;
        this.songName = songName;
        this.videoList = videos;
        if (videos.length > 0) {
          this.changeVideo(videos[0].bvid);
        } else {
          this.$message.warning(`《${songName}》未找到视频`);
        }
      } catch (err) {
        if (token !== this.songToken) return;
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
    matchScore(title, keywords) {
      const t = (title || '').replace(/<[^>]*>/g, '').toLowerCase();
      const k = keywords.toLowerCase().replace(/\s/g, '');
      let score = 0;
      let remaining = t;
      for (const ch of k) {
        const idx = remaining.indexOf(ch);
        if (idx !== -1) {
          score++;
          remaining = remaining.slice(0, idx) + remaining.slice(idx + 1);
        }
      }
      return score;
    },
    tagBonus(title) {
      const t = (title || '').replace(/<[^>]*>/g, '');
      let bonus = 0;
      for (const [score, keywords] of Object.entries(this.tagBonusConfig)) {
        for (const kw of keywords) {
          if (t.toLowerCase().includes(kw.toLowerCase())) {
            bonus += Number(score);
          }
        }
      }
      return bonus;
    },
    nameBonus(title, songName, artistName) {
      if (!title) return 0;
      const t = title.replace(/<[^>]*>/g, '');
      let bonus = 0;
      const songMatch = songName && t.includes(songName);
      const artistMatch = artistName && t.includes(artistName);
      if (songMatch) bonus += 5;
      if (artistMatch) bonus += 3;
      if (songMatch && artistMatch) bonus += 5;
      return bonus;
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
