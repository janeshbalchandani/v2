const fs = require('fs');
const contractPath = `artifacts/contracts/YodaLottery.sol/YodaLottery.json`;
const obj = JSON.parse(fs.readFileSync(contractPath));
const size = Buffer.byteLength(obj.deployedBytecode, 'utf8') / 2;
console.log('contract size is', size);