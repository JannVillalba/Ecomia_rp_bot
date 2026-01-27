const fs = require('fs');
const path = require('path');
const paquetesPath = path.join(__dirname, '../data/paquetes.json');

function getPaquetes() {
  if (!fs.existsSync(paquetesPath)) return [];
  return JSON.parse(fs.readFileSync(paquetesPath, 'utf8'));
}

function savePaquetes(paquetes) {
  fs.writeFileSync(paquetesPath, JSON.stringify(paquetes, null, 2));
}

function addPaquete(paquete) {
  const paquetes = getPaquetes();
  paquete.id = Date.now();
  paquetes.push(paquete);
  savePaquetes(paquetes);
  return paquete;
}

module.exports = {
  getPaquetes,
  savePaquetes,
  addPaquete
};
