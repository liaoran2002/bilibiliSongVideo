import axios from 'axios'

const http = axios.create({
	baseURL: process.env.VUE_APP_BASE_API,
	timeout: 5000,
	withCredentials: true,
})

// 全局默认配置
const DEFAULT_MAX_RETRY = 3
const RETRY_DELAY = 1000
/**
 * 请求拦截
 */
http.interceptors.request.use(config => {
	return config
}, error => {
	return Promise.reject(error)
})

/**
 * 响应拦截
 */
http.interceptors.response.use(async response => {
	return response.data.data;
}, error => {
	const { config } = error;
	// 无重试标识，直接抛出错误
    if (!config?.needRetry) return Promise.reject(error)
    // 初始化重试计数 & 最大重试次数（支持单请求自定义次数）
    config.__retryCount = config.__retryCount || 0
    // 优先取请求自定义次数，没有则用全局默认
    const maxRetry = config.maxRetry ?? DEFAULT_MAX_RETRY
    // 重试次数耗尽，抛出错误（此时可从 err 拿到所有重试信息）
    if (config.__retryCount >= maxRetry) {
      return Promise.reject(error)
    }
    config.__retryCount += 1
    // 延时重试
    return new Promise(resolve => {
      setTimeout(() => resolve(http(config)), RETRY_DELAY)
    }).catch(err => Promise.reject(err))
})


export default http