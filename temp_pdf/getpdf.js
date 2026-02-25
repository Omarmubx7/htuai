const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('c:/Users/omara/htuai/download.pdf');
pdf(dataBuffer).then(function (data) {
    fs.writeFileSync('c:/Users/omara/htuai/temp_pdf/output.txt', data.text);
}).catch(console.error);
