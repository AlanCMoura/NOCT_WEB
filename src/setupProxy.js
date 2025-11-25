const { createProxyMiddleware } = require('http-proxy-middleware');

const DEV_PROXY_PREFIX = '/ctapi';
const TARGET_API = 'https://api.ct-view.com';

module.exports = function setupProxy(app) {
  app.use(
    DEV_PROXY_PREFIX,
    createProxyMiddleware({
      target: TARGET_API,
      changeOrigin: true,
      secure: true,
      pathRewrite: {
        [`^${DEV_PROXY_PREFIX}`]: '',
      },
      logLevel: 'warn',
    }),
  );
};
