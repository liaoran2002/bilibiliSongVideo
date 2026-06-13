module.exports = {
	devServer: {
		host: 'localhost',
		proxy: {
			"/biliapi": {
				target: 'http://localhost:5000',
				changeOrigin: true,
				ws: false,
				pathRewrite: {
					'^/biliapi': ''
				}
			}
		}
	}
}
