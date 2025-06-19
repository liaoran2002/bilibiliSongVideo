module.exports = {
	devServer: {
		host: 'localhost',
		proxy: {
			"/sss":{
				target: 'https://sss.unmeta.cn',
				changeOrigin: true,
				ws: false,
				pathRewrite: {
					'^/sss': ''
				}
			},
			"/biliapi": {
				target: 'http://localhost:5000',
				changeOrigin: true,
				ws: false,
				pathRewrite: {
					'^/biliapi': ''
				}
			},
			"/mir6":{
				target: 'https://api.mir6.com',
				changeOrigin: true,
				ws: false,
				pathRewrite: {
					'^/mir6': ''
				}
			}
		}
	}
}