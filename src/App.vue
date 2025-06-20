<template>
	<div id="app">
		<video id="biliVideo" :src="videoUrl" ref="video" @canplay="videoCanPlay" @timeupdate="videoUpDate"
			@ended="videoEnded" autoplay></video>
		<showList :listType="listType" :title="listType=='list'?listName:songName"
			:list="listType=='list'?songs:videoList" @showList="showList" @changeSong="changeSong"
			@changeVideo="changeVideo"></showList>
		<biliVideoControls :videoName="videoName" :currentMode="currentMode" :currentVolume="currentVolume"
			:isMuted="isMuted" :currentTime="currentTime" :duration="duration" :paused="paused" :listType="listType"
			@videoControl="videoControl" @changeTime="changeTime" @changeVolume="changeVolume"></biliVideoControls>
	</div>
</template>

<script>
	import biliVideoControls from "./components/biliVideoControls.vue"
	import showList from "./components/showList.vue"
	export default {
		name: 'App',
		data() {
			return {
				songListUrl: "",
				listName: "",
				songs: [],
				videoList: [],
				videoUrl: "",
				randomList: [],
				currentIndex: 0,
				MODE: {
					LOOP: 0, // 列表循环
					SINGLE: 1, // 单曲循环
					RANDOM: 2 // 随机播放
				},
				currentMode: 0,
				videoName: "",
				songName: "",
				currentVolume: 70,
				currentTime: 0,
				duration: 0,
				isMuted: false,
				paused: false,
				listType: "none"
			}
		},
		components: {
			biliVideoControls,
			showList
		},
		methods: {
			init() {
				if (this.songListUrl == '') {
					this.songListUrl = prompt('请输入歌单链接地址', 'https://y.qq.com/n/ryqq/playlist/8153225605');
				}
				if (this.songListUrl !== '') {
					this.getSongs();	
				}
			},
			getSongs() {
				this.$http({
					method: "POST",
					url: "/sss/songlist?detailed=false&format=song-singer",
					data: `url=${this.songListUrl}`
				}).then((res) => {
					this.listName = res["name"];
					this.songs = res["songs"];
					this.changeSong(this.currentIndex);
					this.resetRandomList();
					this.$refs.video.volume = this.currentVolume / 100;
				}).catch((err) => {
					console.log(err);
				})
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
					this.changeSong(this.next());
				}
			},
			videoControl(event) {
				switch (event) {
					case "list":
					case "vList":
						this.showList(event);
						break;
					case "before":
						this.changeSong(this.prev())
						break;
					case "next":
						this.changeSong(this.next())
						break;
					case "playControls":
						this.playConctrol();
						break;
					case "playMode":
						this.toggleMode()
						break;
				}
			},
			showList(event) {
				this.listType = (this.listType == event) ? "none" : event;
			},
			playConctrol() {
				if (this.paused)
					this.$refs.video.play();
				else
					this.$refs.video.pause();
				this.paused = !this.paused;
			},
			changeTime(time) {
				if (this.paused) {
					this.$refs.video.play();
					this.paused = !this.paused;
				}
				this.$refs.video.currentTime = time;
			},
			changeVolume(volume) {
				if (volume == 0) {
					this.isMuted = true;
				} else {
					this.isMuted = false;
				}
				console.log(volume)
				this.$refs.video.volume = volume / 100;
				this.currentVolume = volume;
			},
			changeSong(index) {
				this.currentIndex = index;
				this.songName = this.getCurrentSong()
				this.$http({
					method: "POST",
					url: "/biliapi/search",
					data: `keyword=${this.songName}`
				}).then((res) => {
					this.videoList = res["result"];
					this.videoName = this.videoList[0]["title"];
					this.changeVideo(this.videoList[0]["bvid"]);
				}).catch((err) => {
					console.log(err);
				})
			},
			changeVideo(bvid) {
				this.$http({
					method: "GET",
					url: "/mir6/api/bzjiexi",
					params: {
						"url": `https://www.bilibili.com/video/${bvid}`,
						"type": "json"
					}
				}).then((res) => {
					this.videoUrl = res[0]["video_url"];
				}).catch((err) => {
					console.log(err);
				})
			},
			getCurrentSong() {
				if (!this.songs || this.songs.length === 0) {
					return null;
				}
				return this.songs[this.currentIndex];
			},
			next() {
				if (!this.songs || this.songs.length === 0) {
					return null;
				}
				switch (this.currentMode) {
					case this.MODE.SINGLE:
						return this.currentIndex;
					case this.MODE.RANDOM:
						return this.getRandomNext();
					case this.MODE.LOOP:
					default:
						this.currentIndex = (this.currentIndex + 1) % this.songs.length;
						return this.currentIndex;
				}
			},
			prev() {
				if (!this.songs || this.songs.length === 0) {
					return null;
				}
				switch (this.currentMode) {
					case this.MODE.SINGLE:
						return this.currentIndex;
					case this.MODE.RANDOM:
						return this.getRandomPrev();
					case this.MODE.LOOP:
					default:
						this.currentIndex = (this.currentIndex - 1 + this.songs.length) % this.songs.length;
						return this.currentIndex;
				}
			},
			setCurrentIndex(index) {
				if (this.songs && index >= 0 && index < this.songs.length) {
					this.currentIndex = index;
					if (this.currentMode === this.MODE.RANDOM) {
						this.updateRandomList();
					}
				}
			},
			toggleMode() {
				this.currentMode = (this.currentMode + 1) % 3;
				if (this.currentMode === this.MODE.RANDOM) {
					this.resetRandomList();
				}
				return this.currentMode;
			},
			getRandomNext() {
				if (this.randomList.length === 0) {
					this.resetRandomList();
				}
				let currentPos = this.randomList.indexOf(this.currentIndex);
				if (currentPos === -1) {
					this.randomList.push(this.currentIndex);
					currentPos = this.randomList.length - 1;
				}
				let nextPos = (currentPos + 1) % this.randomList.length;
				this.currentIndex = this.randomList[nextPos];

				return this.songs[this.currentIndex];
			},
			getRandomPrev() {
				if (this.randomList.length === 0) {
					this.resetRandomList();
				}
				let currentPos = this.randomList.indexOf(this.currentIndex);
				if (currentPos === -1) {
					this.randomList.push(this.currentIndex);
					currentPos = this.randomList.length - 1;
				}
				let prevPos = (currentPos - 1 + this.randomList.length) % this.randomList.length;
				this.currentIndex = this.randomList[prevPos];
				return this.songs[this.currentIndex];
			},
			resetRandomList() {
				const indices = Array.from({
					length: this.songs.length
				}, (_, i) => i);
				for (let i = indices.length - 1; i > 0; i--) {
					let j = Math.floor(Math.random() * (i + 1));
					[indices[i], indices[j]] = [indices[j], indices[i]];
				}
				this.randomList = indices;
				if (this.songs.length > 0) {
					let currentPos = this.randomList.indexOf(this.currentIndex);
					if (currentPos === -1) {
						this.randomList.unshift(this.currentIndex);
					} else if (currentPos > 0) {
						this.randomList.splice(currentPos, 1);
						this.randomList.unshift(this.currentIndex);
					}
				}
			},
			updateRandomList() {
				if (this.randomList.length === 0 || !this.randomList.includes(this.currentIndex)) {
					this.resetRandomList();
				} else {
					const currentPos = this.randomList.indexOf(this.currentIndex);
					if (currentPos > 0) {
						this.randomList.splice(currentPos, 1);
						this.randomList.unshift(this.currentIndex);
					}
				}
			}
		},
		mounted() {
			this.init();
			// this.devInit()
		}
	}
</script>

<style>
	#app {
		height: 100vh;
		margin: 0;
		padding: 0;
		overflow: hidden;
		/* 完全禁止滚动 */
	}


	#biliVideo {
		height: 100%;
		width: 100%;
		margin: 0;
		padding: 0;
	}
</style>