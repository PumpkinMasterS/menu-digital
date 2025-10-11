// Custom bootstrap to disable service worker and start Flutter engine using the official loader
(function() {
  // Ensure global namespace
  window._flutter = window._flutter || {};

  // Build configuration (matches your current build)
  _flutter.buildConfig = {
    engineRevision: "ef0cd000916d64fa0c5d09cc809fa7ad244a5767",
    builds: [
      {
        compileTarget: "dart2js",
        renderer: "canvaskit",
        mainJsPath: "main.dart.js"
      },
      {
        compileTarget: "dart2js",
        renderer: "html",
        mainJsPath: "main.dart.js"
      }
    ]
  };

  function getRendererFromQuery() {
    try {
      const p = new URLSearchParams(window.location.search);
      const r = (p.get('renderer') || '').toLowerCase();
      if (r === 'html' || r === 'canvaskit') return r;
    } catch (_) {}
    return 'canvaskit';
  }

  window.addEventListener('load', function() {
    if (!window._flutter || !window._flutter.loader) {
      console.error('Flutter loader not found. Make sure flutter.js is included before custom_bootstrap.js');
      return;
    }

    const chosenRenderer = getRendererFromQuery();
    const engineConfig = chosenRenderer === 'html'
      ? { renderer: 'html' }
      : { renderer: 'canvaskit', canvasKitBaseUrl: 'canvaskit' };

    console.log('[Bootstrap] Starting Flutter with renderer =', engineConfig.renderer);

    window._flutter.loader.load({
      config: engineConfig,
      onEntrypointLoaded: function(engineInitializer) {
        engineInitializer.initializeEngine(engineConfig).then(function(appRunner) {
          console.log('[Bootstrap] Engine initialized. Running app...');
          return appRunner.runApp();
        });
      }
    }).catch(function(err) {
      console.error('Failed to bootstrap Flutter app:', err);
    });
  });
})();