import { POKEVTT } from "./module/config.mjs";

Hooks.once('init', function() {
  console.log("POKEVTT | Initializing Pokemon VTT System");

  CONFIG.POKEVTT = POKEVTT;
  
  // ... resto de tu código de inicialización ...
}); 