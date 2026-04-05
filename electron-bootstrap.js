// If ELECTRON_RUN_AS_NODE is set (e.g. when launched from certain IDE terminals),
// unset it so Electron starts as a proper browser process.
delete process.env.ELECTRON_RUN_AS_NODE;
delete process.env.ELECTRON_NO_ATTACH_CONSOLE;
require('./dist/main.js');
