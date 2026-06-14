import axios from 'axios'

const http = axios.create({
	baseURL: '/biliapi',
	timeout: 10000,
	withCredentials: true,
})

const DEFAULT_MAX_RETRY = 3
const RETRY_DELAY = 1000

http.interceptors.request.use(config => {
	return config
}, error => {
	return Promise.reject(error)
})

http.interceptors.response.use(response => {
	return response.data
}, error => {
	const { config } = error
	if (!config?.needRetry) return Promise.reject(error)

	config.__retryCount = config.__retryCount || 0
	const maxRetry = config.maxRetry ?? DEFAULT_MAX_RETRY

	if (config.__retryCount >= maxRetry) {
		return Promise.reject(error)
	}
	config.__retryCount += 1

	return new Promise(resolve => {
		setTimeout(() => resolve(http(config)), RETRY_DELAY)
	}).catch(err => Promise.reject(err))
})

export default http
