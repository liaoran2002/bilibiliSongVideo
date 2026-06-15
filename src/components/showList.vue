<template>
  <div id="list" v-show="listType != 'none'">
    <div id="listMask" @click="$emit('showList', 'none')"></div>
    <div class="list">
      <div class="listTitle">{{ title }}</div>
      <div class="listBody" ref="listBody">
        <ul class="lists">
          <li
            :key="index"
            v-for="(item, index) in list"
            :ref="(el) => { if (el) itemRefs[index] = el }"
            :class="{ active: index === currentIndex }"
            @click="
              listType == 'list'
                ? $emit('changeSong', index)
                : $emit('changeVideo', item['bvid'], title)
            "
          >
            <div class="index">{{ index + 1 }}</div>
            <div
              class="title"
              v-html="listType == 'list' ? item : item['title']"
            ></div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'showList',
  data() {
    return {
      itemRefs: {},
    };
  },
  props: {
    title: {
      type: String,
      default: '',
      required: true,
    },
    list: {
      type: Array,
      required: true,
    },
    listType: {
      type: String,
      default: 'none',
      required: true,
    },
    currentIndex: {
      type: Number,
      default: 0,
    },
  },
  watch: {
    listType(val) {
      if (val !== 'none') {
        this.$nextTick(() => this.scrollToActive());
      }
    },
  },
  methods: {
    scrollToActive() {
      const el = this.itemRefs[this.currentIndex];
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    },
  },
};
</script>

<style>
.list {
  text-align: center;
  position: fixed;
  top: 50%;
  left: 50%;
  user-select: none;
  background: rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  padding: 30px;
  min-width: 50vw;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
  transform: translate(-50%, -50%);
  max-height: 50vh;
  color: white;
  opacity: 1;
  visibility: visible;
  transition:
    opacity 0.5s ease,
    visibility 0.5s ease;
  z-index: 999;
}

.listTitle {
  color: #000;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  padding: 15px 0;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 12px 12px 0 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.5);
  z-index: 1;
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
  display: flex;
  text-align: center;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: black;
  margin: 1%;
}

.lists .index {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 0, 0, 0.5);
  width: 5%;
  padding: 1%;
  margin: 0 auto;
  color: white;
}

.lists li:nth-child(2n) .index {
  background: rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.5);
  color: black;
}

.lists .title {
  background: rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.5);
  color: black;
  border: 1px solid rgba(0, 0, 0, 0.5);
  width: 95%;
  margin: 0 auto;
  padding: 1%;
}

.lists li:nth-child(2n) .title {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 0, 0, 0.5);
  color: white;
}

.lists li.active .index {
  background: rgba(232, 17, 35, 0.3);
  border: 1px solid rgba(232, 17, 35, 0.5);
  color: white;
}

.lists li.active .title {
  background: rgba(102, 120, 232, 0.3);
  border: 1px solid rgba(56, 132, 255, 0.5);
  color: white;
}
</style>
