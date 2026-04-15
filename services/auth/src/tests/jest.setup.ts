/**
 * Jest Setup - Global Configuration
 * Se ejecuta antes de los tests
 */

// Aumentar timeout global para e2e tests
jest.setTimeout(30000);

// Suprimir ciertos logs en tests (comentar si necesitas debugging)
const originalLog = console.log;
const originalWarn = console.warn;

global.console = {
  ...console,
  log: (...args: any[]) => {
    // Solo loguear errores críticos en tests
    if (args[0]?.includes?.('ERROR') || args[0]?.includes?.('error')) {
      originalLog(...args);
    }
  },
  warn: (...args: any[]) => {
    // Solo warnings sobre JWT keys no son críticos, así que silenciamos
    if (!args[0]?.includes?.('JWT')) {
      originalWarn(...args);
    }
  },
};

// JWT Test Helper es inicializado en tests con claves disponibles
// Por esto no lo inicializamos aquí globalmente

