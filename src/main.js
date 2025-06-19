import Vue from 'vue'
import App from './App.vue'
import './assets/iconfont/iconfont.css';
import httpRequest from './api/httpRequest';
Vue.prototype.$http = httpRequest // http请求方法
Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
