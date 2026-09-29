const fs = require('fs'); const txt = fs.readFileSync('frontend/index.html'); const idx = txt.indexOf('DIGO'); console.log(txt.slice(idx-4, idx+4));
