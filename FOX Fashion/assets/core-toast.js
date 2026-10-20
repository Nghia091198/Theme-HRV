(() => {
    const FOX = (window.FOX = window.FOX || {});

    const call = (method, message, fallback) => {
        const toast = window.TYT?.Toast;
        if (toast && typeof toast[method] === 'function') {
            toast[method](message);
            return;
        }
        fallback(`[FOX.toast] ${message}`);
    };

    FOX.toast = {
        success: (message) => call('success', message, console.info),
        error: (message) => call('error', message, console.warn),
        info: (message) => call('info', message, console.info),
    };
})();
