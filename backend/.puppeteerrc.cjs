const {join} = require('path');

module.exports = {
  // Cambia el directorio de caché para que Render lo encuentre correctamente
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
