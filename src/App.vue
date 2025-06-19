<template>
	<div id="app">
		<video id="biliVideo" :src="videoUrl" ref="video" @canplay="videoCanPlay" @timeupdate="videoUpDate"
			@ended="videoEnded" autoplay></video>
		<biliVideoControls
		:videoName="videoName"
		:currentTime="currentTime"
		:duration="duration"
		@videoControl="videoControl"
		@changeTime="changeTime"
		></biliVideoControls>
	</div>
</template>

<script>
	import biliVideoControls from "./components/biliVideoControls.vue"
	export default {
		name: 'App',
		data() {
			return {
				songListUrl: "",
				songs: [],
				videoList: [],
				videoUrl: "./如果可以 - 韦礼安.mp4",
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
				mutedVolume: 0,
				currentVolume: 70,
				currentTime: 0,
				duration: 0,
				isMuted: false
			}
		},
		components: {
			biliVideoControls
		},
		methods: {
			init() {
				this.getSongs();
				this.resetRandomList();
				this.$refs.video.volume=this.currentVolume/100;
			},
			getSongs() {
				this.$http({
					method: "POST",
					url: "/sss/songlist?detailed=false&format=song-singer",
					data: 'url=https://y.qq.com/n/ryqq/playlist/8153225605'
				}).then((res) => {
					console.log(res);
				}).catch((err) => {
					console.log(err);
				})
			},
			devInit() {
				this.$http({
					method: "GET",
					url: "./666.json"
				}).then((res) => {
					this.songs = res["songs"];
				}).catch((err) => {
					console.log("error", err);
				})
			},
			videoCanPlay() {
				this.video = this.$refs.video;
			},
			videoUpDate() {
				this.currentTime=this.$refs.video.currentTime;
				this.duration=this.$refs.video.duration;
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
			changeTime(time){
				this.$refs.video.currentTime=time;
			},
			changeSong(index) {
				this.currentIndex = index;
				console.log(this.songs, this.currentIndex)
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
						return this.songs[this.currentIndex];
					case this.MODE.RANDOM:
						return this.getRandomPrev();
					case this.MODE.LOOP:
					default:
						this.currentIndex = (this.currentIndex - 1 + this.songs.length) % this.songs.length;
						return this.songs[this.currentIndex];
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
			// this.init();
			this.devInit()
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