/**
 * 音乐播放模式控制类
 * 支持单曲循环、列表循环、随机播放三种模式
 */
class PlayList {
  constructor() {
    // 播放模式常量
    this.MODE = {
      LOOP: 0,      // 列表循环
      SINGLE: 1,    // 单曲循环
      RANDOM: 2     // 随机播放
    };
    
    this.currentMode = this.MODE.LOOP;  // 默认列表循环
    this.songs = [];                    // 歌曲列表
    this.currentIndex = 0;              // 当前播放索引
    this.randomList = [];               // 随机播放列表
  }
  
  /**
   * 设置歌曲列表
   * @param {Array} songs - 歌曲数组
   */
  setSongs(songs) {
    this.songs = songs || [];
    this.currentIndex = 0;
    this.resetRandomList();
  }
  
  /**
   * 获取当前歌曲
   * @returns {Object} 当前歌曲对象
   */
  getCurrentSong() {
    if (!this.songs || this.songs.length === 0) {
      return null;
    }
    return this.songs[this.currentIndex];
  }
  
  /**
   * 切换到下一首歌曲
   * @returns {Object} 下一首歌曲对象
   */
  next() {
    if (!this.songs || this.songs.length === 0) {
      return null;
    }
    
    switch (this.currentMode) {
      case this.MODE.SINGLE:
        // 单曲循环：返回当前歌曲
        return this.songs[this.currentIndex];
        
      case this.MODE.RANDOM:
        // 随机播放：从随机列表中获取下一首
        return this.getRandomNext();
        
      case this.MODE.LOOP:
      default:
        // 列表循环：下一首，超出列表则回到开头
        this.currentIndex = (this.currentIndex + 1) % this.songs.length;
        return this.songs[this.currentIndex];
    }
  }
  
  /**
   * 切换到上一首歌曲
   * @returns {Object} 上一首歌曲对象
   */
  prev() {
    if (!this.songs || this.songs.length === 0) {
      return null;
    }
    
    switch (this.currentMode) {
      case this.MODE.SINGLE:
        // 单曲循环：返回当前歌曲
        return this.songs[this.currentIndex];
        
      case this.MODE.RANDOM:
        // 随机播放：从随机列表中获取上一首
        return this.getRandomPrev();
        
      case this.MODE.LOOP:
      default:
        // 列表循环：上一首，小于0则回到末尾
        this.currentIndex = (this.currentIndex - 1 + this.songs.length) % this.songs.length;
        return this.songs[this.currentIndex];
    }
  }
  
  /**
   * 设置当前播放歌曲索引
   * @param {number} index - 歌曲索引
   */
  setCurrentIndex(index) {
    if (this.songs && index >= 0 && index < this.songs.length) {
      this.currentIndex = index;
      // 如果是随机模式，更新随机列表
      if (this.currentMode === this.MODE.RANDOM) {
        this.updateRandomList();
      }
    }
  }
  
  /**
   * 切换播放模式
   * @returns {number} 新的播放模式
   */
  toggleMode() {
    this.currentMode = (this.currentMode + 1) % 3;
    // 切换到随机模式时，重置随机列表
    if (this.currentMode === this.MODE.RANDOM) {
      this.resetRandomList();
    }
    return this.currentMode;
  }
  
  /**
   * 获取当前播放模式
   * @returns {number} 当前播放模式
   */
  getMode() {
    return this.currentMode;
  }
  
  /**
   * 获取随机播放模式下的下一首歌曲
   * @returns {Object} 下一首歌曲对象
   */
  getRandomNext() {
    if (this.randomList.length === 0) {
      this.resetRandomList();
    }
    
    // 如果当前歌曲在随机列表中，找到它的位置
    let currentPos = this.randomList.indexOf(this.currentIndex);
    
    // 如果当前歌曲不在随机列表中（可能是用户直接选择了歌曲）
    if (currentPos === -1) {
      // 将当前歌曲添加到随机列表末尾
      this.randomList.push(this.currentIndex);
      currentPos = this.randomList.length - 1;
    }
    
    // 获取下一首歌曲的索引
    let nextPos = (currentPos + 1) % this.randomList.length;
    this.currentIndex = this.randomList[nextPos];
    
    return this.songs[this.currentIndex];
  }
  
  /**
   * 获取随机播放模式下的上一首歌曲
   * @returns {Object} 上一首歌曲对象
   */
  getRandomPrev() {
    if (this.randomList.length === 0) {
      this.resetRandomList();
    }
    
    // 如果当前歌曲在随机列表中，找到它的位置
    let currentPos = this.randomList.indexOf(this.currentIndex);
    
    // 如果当前歌曲不在随机列表中（可能是用户直接选择了歌曲）
    if (currentPos === -1) {
      // 将当前歌曲添加到随机列表末尾
      this.randomList.push(this.currentIndex);
      currentPos = this.randomList.length - 1;
    }
    
    // 获取上一首歌曲的索引
    let prevPos = (currentPos - 1 + this.randomList.length) % this.randomList.length;
    this.currentIndex = this.randomList[prevPos];
    
    return this.songs[this.currentIndex];
  }
  
  /**
   * 重置随机播放列表
   */
  resetRandomList() {
    // 创建一个包含所有歌曲索引的数组
    const indices = Array.from({ length: this.songs.length }, (_, i) => i);
    
    // 打乱数组顺序（Fisher-Yates洗牌算法）
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    
    this.randomList = indices;
    
    // 确保当前歌曲在随机列表中的位置正确
    if (this.songs.length > 0) {
      const currentPos = this.randomList.indexOf(this.currentIndex);
      if (currentPos === -1) {
        // 如果当前歌曲不在随机列表中，将其添加到列表开头
        this.randomList.unshift(this.currentIndex);
      } else if (currentPos > 0) {
        // 如果当前歌曲不在列表开头，将其移到开头
        this.randomList.splice(currentPos, 1);
        this.randomList.unshift(this.currentIndex);
      }
    }
  }
  
  /**
   * 更新随机列表，确保当前歌曲在列表中
   */
  updateRandomList() {
    // 如果随机列表为空或当前歌曲不在列表中，重置随机列表
    if (this.randomList.length === 0 || !this.randomList.includes(this.currentIndex)) {
      this.resetRandomList();
    } else {
      // 将当前歌曲移到随机列表的开头
      const currentPos = this.randomList.indexOf(this.currentIndex);
      if (currentPos > 0) {
        this.randomList.splice(currentPos, 1);
        this.randomList.unshift(this.currentIndex);
      }
    }
  }
}

// export default PlayMode;