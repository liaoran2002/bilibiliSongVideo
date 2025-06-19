<template>
	<div id="biliVideoControls">
		<div class="videoName-container">
			<div id="videoName">{{ videoName }}</div>
		</div>
		<div id="controls">
			<i class="iconfont icon-yinleliebiao" @click="executeMethod('videoControl','list')" id="list"></i>
			<i class="iconfont icon-bofangliebiao" @click="executeMethod('videoControl','vList')" id="vList"></i>
			<i class="iconfont icon-play-previous" @click="executeMethod('videoControl','before')" id="before"></i>
			<i class="iconfont icon-pause" @click="executeMethod('videoControl','playControl')" id="playControls"></i>
			<i class="iconfont icon-play-next" @click="executeMethod('videoControl','next')" id="next"></i>
			<div class="audio-control" @click="toggleMute(event)">
				<i class="iconfont icon-sound-on" @click="executeMethod('videoControl','sound')" id="sound"></i>
				<div class="volume-slider" id="volume-slider">
					<div class="volume-track">
						<div class="volume-progress" id="volumeProgress"></div>
						<div class="volume-thumb" id="volumeThumb"></div>
					</div>
					<div class="volume-number" id="volume-number">0</div>
				</div>
			</div>
			<i class="iconfont icon-shunxubofang" @click="executeMethod('videoControl','playMode')" id="playMode"></i>
		</div>
		<!-- 进度条 -->
		<div class="progressContainer">
			<div class="time" id="currentTime">{{ formatTime(currentTime) }}</div>
			<div class="progressWrapper" id="progressContainer" @mousedown="openDragging" @mousemove="startDragging"
				@click="changeTime">
				<div class="progressBar" :style="{width:(progress)*100+'%'}" id="progressBar">
					<div class="progressHandle" id="progressHandle"></div>
				</div>
			</div>
			<div class="time" id="totalTime">{{ formatTime(duration) }}</div>
		</div>
	</div>
</template>

<script>
	export default {
		name: "biliVideoControls",
		data() {
			return {
				isVideoDragging: false,
				isSoundDragging: false,
				draggingTime: 0,
				draggingVolume: 0
			}
		},
		props: {
			videoName: {
				type: String,
				default: "",
				required: true
			},
			currentVolume: {
				type: Number,
				default: 0,
				required: true
			}
			currentTime: {
				type: Number,
				default: 0,
				required: true
			},
			duration: {
				type: Number,
				default: 0,
				required: true
			}
		},
		methods: {
			executeMethod(methodName, event) {
				this.$emit(methodName, event);
			},
			formatTime(timeInSeconds) {
				const totalSeconds = Math.floor(timeInSeconds);
				const hours = Math.floor(totalSeconds / 3600);
				const minutes = Math.floor((totalSeconds % 3600) / 60);
				const seconds = totalSeconds % 60;
				const pad = (num) => num < 10 ? '0' + num : num;
				return hours > 0 ?
					`${pad(hours)}:${pad(minutes)}:${pad(seconds)}` :
					`${pad(minutes)}:${pad(seconds)}`;
			},
			changeTime(event) {
				if (this.isVideoDragging) return; // 拖动时不处理点击
				const rect = event.currentTarget.getBoundingClientRect();
				const pos = (event.clientX - rect.left) / rect.width;
				this.draggingTime = pos * this.duration;
				this.executeMethod("changeTime", this.draggingTime);
			},
			openDragging(event) {
				if (event.currentTarget.id == "progressContainer")
					this.isVideoDragging = true;


			},
			startDragging(event) {
				if (this.isVideoDragging) {
					const rect = event.currentTarget.getBoundingClientRect();
					const pos = (event.clientX - rect.left) / rect.width;
					this.draggingTime = pos * this.duration;
					this.executeMethod("changeTime", this.draggingTime);
				} else if (this.isSoundDragging) {
					// handleVolumeChange(e);
				} else {
					return;
				}
			},
			overDragging() {
				this.isVideoDragging = false;
				this.isSoundDragging = false;
			}
		},
		mounted() {
			document.addEventListener("mouseup", this.overDragging);
		},
		beforeUnmount() {
			document.removeEventListener("mouseup", this.overDragging);
		},
		computed: {
			progress() {
				if (this.isVideoDragging) {
					return this.draggingTime / this.duration;
				} else {
					return this.currentTime / this.duration;
				}
			}
		}
	}
</script>

<style>
	#biliVideoControls {
		color: white;
		position: fixed;
		bottom: 1%;
		left: 50%;
		/* 左侧定位到50% */
		user-select: none;
		background: rgba(255, 255, 255, 0.3);
		/* 半透明背景 */
		backdrop-filter: blur(10px);
		/* 磨砂玻璃核心属性 */
		-webkit-backdrop-filter: blur(10px);
		/* 兼容webkit内核 */
		border: 1px solid rgba(255, 255, 255, 0.5);
		/* 边框增强立体感 */
		border-radius: 12px;
		/* 圆角 */
		padding: 20px;
		min-width: 10vw;
		max-width: 50vw;
		box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
		/* 阴影增强深度 */
		transform: translate(-50%, 0%);
		/* 向上向左各偏移自身宽度的50%，实现完全居中 */
		opacity: 0.1;
		/* 初始不透明度 */
		transition: all 1s ease-in-out;
		/* 过渡效果：0.5秒缓动 */
		font-size: 5vh;
	}


	#biliVideoControls:hover {
		opacity: 1;
	}

	.videoName-container {
		overflow: hidden;
		white-space: nowrap;
		position: relative;
	}

	#videoName {
		display: inline-block;
		padding-left: 100%;
		/* 初始位置 */
		animation: scroll-left 15s linear infinite;
	}

	/* 鼠标悬停时暂停动画 */
	.videoName-container:hover #videoName {
		animation-play-state: paused;
	}

	/* 动画定义 */
	@keyframes scroll-left {
		0% {
			transform: translateX(0);
		}

		100% {
			transform: translateX(-100%);
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

	/* 整合式音量控制容器 */
	.audio-control {
		position: relative;
		display: inline-block;
		cursor: pointer;
	}

	/* 声音图标样式 */
	.audio-control .icon {
		font-size: 24px;
		color: #333;
		transition: color 0.2s;
	}

	.audio-control:hover .icon {
		color: #4285f4;
	}

	/* 垂直音量控制滑块样式 */
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
		transition: opacity 0.2s, visibility 0.2s;
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 8px;
	}

	/* 显示音量控制条 */
	.audio-control:hover .volume-slider {
		opacity: 1;
		visibility: visible;
	}

	/* 垂直滑块轨道 */
	.volume-track {
		width: 4px;
		height: 100%;
		background: rgba(255, 255, 255, 0.3);
		border-radius: 2px;
		position: relative;
	}

	/* 垂直滑块进度 */
	.volume-progress {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 70%;
		/* 默认音量 */
		background: white;
		border-radius: 2px;
		transition: height 0.1s ease;
	}

	/* 垂直滑块按钮 */
	.volume-thumb {
		position: absolute;
		left: 50%;
		bottom: 70%;
		/* 默认位置 */
		transform: translate(-50%, 50%);
		width: 12px;
		height: 12px;
		background: white;
		border-radius: 50%;
		cursor: pointer;
		box-shadow: 0 0 2px rgba(255, 255, 255, 0.3);
		transition: bottom 0.1s ease, transform 0.1s ease;
	}

	.volume-number {
		font-size: 2vh;
	}

	.time {
		font-size: 14px;
		min-width: 60px;
		text-align: center;
	}

	.progressContainer {
		display: flex;
		align-items: center;
		gap: 5px;
		height: 5px;
		margin-top: 15px;
		cursor: pointer;
		position: relative;
	}

	.progressWrapper {
		flex: 1;
		height: 5px;
		background-color: rgba(255, 255, 255, 0.3);
		cursor: pointer;
		position: relative;
	}

	.progressBar {
		height: 100%;
		background-color: rgba(255, 255, 255, 0.8);
		width: 0%;
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
		box-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
		display: none;
	}

	#biliVideoControls:hover .progressHandle {
		display: block;
	}
</style>