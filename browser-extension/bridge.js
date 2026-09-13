(() => {
  const origin = window.location.origin;
  const READY = 'JOB_BROWSER_BRIDGE_READY';
  const REQUEST = 'JOB_BROWSER_IMPORT_REQUEST';
  const RESULT = 'JOB_BROWSER_IMPORT_RESULT';

  function announce() {
    window.postMessage({ type: READY, version: '0.1.0' }, origin);
  }

  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== origin) return;
    const data = event.data;
    if (!data || data.type !== REQUEST || typeof data.requestId !== 'string') return;

    chrome.runtime.sendMessage({ type: 'COLLECT_OPEN_JOB_TABS', requestId: data.requestId }, response => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        window.postMessage({
          type: RESULT,
          requestId: data.requestId,
          ok: false,
          error: runtimeError.message || 'Nie udało się połączyć z rozszerzeniem.'
        }, origin);
        return;
      }
      window.postMessage({
        type: RESULT,
        requestId: data.requestId,
        ok: Boolean(response?.ok),
        payload: response?.payload ?? null,
        error: response?.error ?? null
      }, origin);
    });
  });

  announce();
  window.addEventListener('focus', announce);
})();
