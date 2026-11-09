const runBtn   = document.getElementById('runBtn');
const statusEl = document.getElementById('status');

runBtn.addEventListener('click', async () => {
  runBtn.disabled = true;
  statusEl.textContent = 'Running…';

  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch {
    statusEl.textContent = 'Error: could not get active tab.';
    runBtn.disabled = false;
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'run' });
    statusEl.textContent = 'Done – check the page for the result.';
  } catch {
    statusEl.textContent = 'Error: content script not ready. Refresh the Sensibull page and try again.';
  }

  runBtn.disabled = false;
});
