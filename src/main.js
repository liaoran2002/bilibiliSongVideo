import Vue from 'vue'
import App from './App.vue'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import './assets/iconfont/iconfont.css';
import httpRequest from './api/httpRequest';
Vue.prototype.$http = httpRequest // http请求方法
Vue.config.productionTip = false
Vue.config.devtools = true
Vue.use(ElementUI)
new Vue({
  el: '#app',
  render: h => h(App),
}).$mount('#app')
