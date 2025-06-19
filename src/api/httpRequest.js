import axios from 'axios'

const http = axios.create({
	baseURL: process.env.VUE_APP_BASE_API,
	timeout: 1000 * 30,
	withCredentials: true
})

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
	return Promise.reject(error)
})


export default http