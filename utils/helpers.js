module.exports = {
    /**
     * Retrasa la ejecución del código por un período de tiempo.
     * @param {number} ms - El tiempo en milisegundos para esperar.
     */
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
};