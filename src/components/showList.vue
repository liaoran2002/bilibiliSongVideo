<template>
	<div id="list" v-show="listType!='none'">
		<div id="listMask" @click="executeMethod('showList','none')"></div>
		<div class="list">
			<div class="listTitle">{{ title }}</div>
			<div class="listBody">
				<ul class="lists">
					<li :key="index" v-for="(item,index) in list"
						@click="listType=='list'?executeMethod('changeSong',index):executeMethod('changeVideo',item['bvid'])"
						v-html="listType=='list'?item:item['title']"
						></li>
				</ul>
			</div>
		</div>
	</div>
</template>

<script>
	export default {
		name: "showList",
		data() {
			return {

			}
		},
		props: {
			title: {
				type: String,
				default: "",
				required: true
			},
			list: {
				type: Array,
				required: true
			},
			listType: {
				type: String,
				default: "none",
				required: true
			}
		},
		methods: {
			executeMethod(methodName, event) {
				this.$emit(methodName, event);
			},
		}
	}
</script>

<style>
	.list {
		text-align: center;
		position: fixed;
		top: 50%;
		left: 50%;
		/* 左侧定位到50% */
		user-select: none;
		background: rgba(255, 255, 255, 0.3);
		/* 半透明背景 */
		border: 1px solid rgba(255, 255, 255, 0.5);
		/* 边框增强立体感 */
		border-radius: 12px;
		/* 圆角 */
		padding: 30px;
		min-width: 50vw;
		box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
		/* 阴影增强深度 */
		transform: translate(-50%, -50%);
		/* 向上向左各偏移自身宽度的50%，实现完全居中 */
		max-height: 50vh;
		color: white;
		opacity: 1;
		visibility: visible;
		transition: opacity 0.5s ease, visibility 0.5s ease;
		z-index: 999;
	}

	.listTitle {
		color: #000;
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		padding: 15px 0;
		/* 与playList的padding保持一致，确保视觉统一 */
		background: rgba(255, 255, 255, 0.5);
		/* 半透明背景，避免遮挡内容 */
		border-radius: 12px 12px 0 0;
		/* 只显示顶部圆角 */
		border-bottom: 1px solid rgba(255, 255, 255, 0.5);
		/* 底部边框分隔列表名和歌曲列表 */
		z-index: 1;
		/* 确保覆盖在歌曲列表上方 */
	}

	#listMask {
		position: fixed;
		top: 0;
		left: 0;
		height: 100vh;
		width: 100vw;
		opacity: 0.5;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 1;
	}

	.show {
		visibility: hidden;
		opacity: 0;
	}

	.listBody {
		margin-top: 25px;
		max-height: 50vh;
		overflow-y: auto;
	}

	.lists {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.lists li {
		backdrop-filter: blur(10px);
		/* 磨砂玻璃核心属性 */
		-webkit-backdrop-filter: blur(10px);
		/* 兼容webkit内核 */
		background: rgba(255, 255, 255, 0.3);
		/* 半透明背景 */
		border: 1px solid rgba(255, 255, 255, 0.5);
		/* 边框增强立体感 */
		color: black;
		padding: 5px;
		margin: 5px;
	}

	.lists li:nth-child(2n) {
		background: rgba(0, 0, 0, 0.3);
		/* 半透明背景 */
		border: 1px solid rgba(0, 0, 0, 0.5);
		/* 边框增强立体感 */
		color: white;
	}
</style>