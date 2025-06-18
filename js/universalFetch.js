/**
 * 万能Fetch工具函数
 * @param {string} url - 请求URL
 * @param {Object} options - 请求配置
 * @param {string} [options.method='GET'] - HTTP方法
 * @param {Object} [options.headers={}] - 请求头
 * @param {Object|FormData} [options.data=null] - 请求数据
 * @param {number} [options.timeout=30000] - 请求超时时间(ms)
 * @param {boolean} [options.credentials=false] - 是否发送cookie
 * @returns {Promise<Object>} - 响应数据
 */
async function universalFetch(url, options = {}) {
	// 默认配置
	const defaultOptions = {
		method: 'GET',
		headers: {},
		data: null,
		timeout: 30000,
		credentials: false,
	};

	// 合并配置
	const config = {
		...defaultOptions,
		...options
	};

	// 构建请求参数
	const fetchOptions = {
		method: config.method.toUpperCase(),
		headers: {
			'Accept': 'application/json',
			...config.headers,
		},
		credentials: config.credentials ? 'include' : 'same-origin',
	};

	// 处理请求体
	if (config.data) {
		fetchOptions.body = config.data;
	}

	try {
		const response = await fetch(url, {
			...fetchOptions
		});

		// 检查响应状态
		if (!response.ok) {
			throw new Error(`HTTP错误! 状态: ${response.status}`);
		}

		// 根据Content-Type解析响应
		const contentType = response.headers.get('Content-Type');
		if (contentType && contentType.includes('json')) {
			return await response.json();
		} else if (contentType && contentType.includes('text/plain')) {
			return await response.text();
		} else if (contentType && contentType.includes('application/xml')) {
			return await response.text(); // 可以进一步解析为XML
		} else {
			return await response.blob();
		}
	} catch (error) {
		console.log(error)
	}
}

/**
 * GET请求便捷方法
 * @param {string} url - 请求URL
 * @param {Object} [params={}] - URL参数
 * @param {Object} [options={}] - 其他配置
 * @returns {Promise<Object>} - 响应数据
 */
async function get(url, params = {}, options = {}) {
	// 处理URL参数
	if (Object.keys(params).length > 0) {
		const queryString = new URLSearchParams(params).toString();
		url = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
	}

	return universalFetch(url, {
		method: 'GET',
		...options
	});
}

/**
 * POST请求便捷方法
 * @param {string} url - 请求URL
 * @param {Object|FormData} [data=null] - 请求数据
 * @param {Object} [options={}] - 其他配置
 * @returns {Promise<Object>} - 响应数据
 */
async function post(url, data = null, options = {}) {
	return universalFetch(url, {
		method: 'POST',
		data,
		...options
	});
}

/**
 * PUT请求便捷方法
 * @param {string} url - 请求URL
 * @param {Object|FormData} [data=null] - 请求数据
 * @param {Object} [options={}] - 其他配置
 * @returns {Promise<Object>} - 响应数据
 */
async function put(url, data = null, options = {}) {
	return universalFetch(url, {
		method: 'PUT',
		data,
		...options
	});
}

/**
 * DELETE请求便捷方法
 * @param {string} url - 请求URL
 * @param {Object} [params={}] - URL参数
 * @param {Object} [options={}] - 其他配置
 * @returns {Promise<Object>} - 响应数据
 */
async function del(url, params = {}, options = {}) {
	// 处理URL参数
	if (Object.keys(params).length > 0) {
		const queryString = new URLSearchParams(params).toString();
		url = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
	}

	return universalFetch(url, {
		method: 'DELETE',
		...options
	});
}

// export { universalFetch, get, post, put, del };