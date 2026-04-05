// Use electron/main which is the proper Electron built-in for main process
const { app } = require("electron/main");
console.log("Got app:", typeof app);
app.whenReady().then(() => {
  console.log("App is ready!");
  app.quit();
});
