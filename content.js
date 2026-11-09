// ── Helpers ──────────────────────────────────────────────────

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getOrdinal(n) {
  if (n >= 11 && n <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * Parses an NSE option symbol + optional full li text into the label format
 * shown on the page.
 *
 * Weekly format:  NIFTY 26 9 15 23700 PE
 *                 ^^^^^ YY M DD STRIKE TYPE
 *
 * Month code: 1–9 for Jan–Sep, O = Oct, N = Nov, D = Dec
 *
 * Monthly format: NIFTY 26 SEP 23700 PE
 * In this case there is no day in the symbol; we extract it from the
 * "in DD-MMM-YYYY" text that appears in the same <li>.
 *
 *
 * Returns e.g. "15th Sep 23700 PE"
 */
function parseSymbolToLabel(symbol, liText) {
  // ── Weekly ──────────────────────────────────────────────────
  const weeklyMatch = symbol.match(/^[A-Z]+(\d{2})([1-9OND])(\d{2})(\d+)(CE|PE)$/i);
  if (weeklyMatch) {
    const [, , monthCode, dd, strike, type] = weeklyMatch;
    const mc = monthCode.toUpperCase();
    const month = mc === 'O' ? 10 : mc === 'N' ? 11 : mc === 'D' ? 12 : parseInt(mc, 10);
    const day = parseInt(dd, 10);
    return `${dd}${getOrdinal(day)} ${MONTHS[month]} ${strike} ${type.toUpperCase()}`;
  }

  // ── Monthly ─────────────────────────────────────────────────
  // e.g. "NIFTY26SEP23700PE" – no day in the symbol itself.
  const monthlyMatch = symbol.match(
    /^[A-Z]+(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(\d+)(CE|PE)$/i
  );
  if (monthlyMatch) {
    const [, , monthStr, strike, type] = monthlyMatch;
    const monthIdx = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP',
      'OCT', 'NOV', 'DEC'].indexOf(monthStr.toUpperCase()) + 1;

    // Try to pick up the expiry day from "in DD-MMM-YYYY" in the li text.
    if (liText) {
      const dateMatch = liText.match(/in\s+(\d{1,2})-[a-z]+-\d{4}/i);
      if (dateMatch) {
        const day = parseInt(dateMatch[1], 10);
        return `${String(day).padStart(2, '0')}${getOrdinal(day)} ${MONTHS[monthIdx]} ${strike} ${type.toUpperCase()}`;
      }
    }

    // Fallback: no day available – return just month/strike/type.
    return `${MONTHS[monthIdx]} ${strike} ${type.toUpperCase()}`;
  }

  return null;
}

/** Replace non-breaking spaces and collapse whitespace for reliable comparison. */
function normalizeLabel(text) {
  return text.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

// ── DOM helpers ──────────────────────────────────────────────

/**
 * Finds the "Add to Group" button.
 *
 * Strategy (most → least stable):
 *   1. button.mini-action-button whose text matches "add to group"
 *      (the semantic class is stable; the text is visible in the HTML).
 *   2. Any button inside .summary-actions whose text matches.
 *   3. Global text search as last resort.
 */
function findAddToGroupButton() {
  // Most specific: the mini-action-button with matching text
  for (const btn of document.querySelectorAll('button.mini-action-button')) {
    if (/add\s+to\s+group/i.test(btn.textContent)) return btn;
  }

  // Inside .summary-actions
  const summaryActions = document.querySelector('.summary-actions');
  if (summaryActions) {
    for (const btn of summaryActions.querySelectorAll('button')) {
      if (/add\s+to\s+group/i.test(btn.textContent)) return btn;
    }

    // Positional fallback – mirrors nth-child(4) in user's original selector.
    const childDivs = summaryActions.querySelectorAll(':scope > div > div');
    const target = childDivs[3];
    if (target) {
      const btn = target.querySelector('button');
      if (btn) return btn;
    }

    const allBtns = summaryActions.querySelectorAll('button');
    if (allBtns.length) return allBtns[allBtns.length - 1];
  }

  // Global text search
  for (const btn of document.querySelectorAll('button')) {
    if (/add\s+to\s+group/i.test(btn.textContent)) return btn;
  }

  return null;
}

/**
 * Waits for the conflict dialog – specifically a div[role="dialog"] that
 * contains at least one <li> element (the strike list).
 *
 * Radix UI keeps multiple role="dialog" nodes in the DOM at all times
 * (for tooltips, dropdowns, etc.), so we cannot simply wait for the first
 * one; we must wait for one that actually has the expected content.
 */
function waitForConflictDialog(timeout = 6000) {
  return new Promise((resolve, reject) => {
    const find = () => {
      for (const d of document.querySelectorAll('div[role="dialog"]')) {
        if (d.querySelector('li')) return d;
      }
      return null;
    };

    const existing = find();
    if (existing) { resolve(existing); return; }

    const observer = new MutationObserver(() => {
      const d = find();
      if (d) { observer.disconnect(); resolve(d); }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error('Timed out waiting for conflict dialog'));
    }, timeout);
  });
}

/** Shows a small toast notification in the page corner. */
function showToast(message, isError = false) {
  const div = document.createElement('div');
  div.style.cssText = `
    position: fixed; top: 20px; right: 20px;
    background: ${isError ? '#e53935' : '#43a047'};
    color: #fff; padding: 12px 18px; border-radius: 8px;
    z-index: 2147483647; font-family: sans-serif; font-size: 14px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.35); max-width: 340px;
    line-height: 1.5; white-space: pre-wrap;
  `;
  div.textContent = message;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}

// ── Main logic ───────────────────────────────────────────────

async function run() {
  try {
    // ── Step 1: Click "Add to group" ────────────────────────────
    const addBtn = findAddToGroupButton();
    if (!addBtn) {
      showToast('Could not find "Add to group" button.\nMake sure you are on the right Sensibull page.', true);
      return;
    }
    addBtn.click();

    // ── Step 2: Wait for the conflict dialog (must contain <li> items) ──
    let dialog;
    try {
      dialog = await waitForConflictDialog();
    } catch {
      showToast('No conflict dialog appeared.\nEither all selected strikes were added successfully, or the dialog did not open.');
      return;
    }

    // ── Step 3: Parse conflicting strike symbols from the dialog ──
    const labelsToUncheck = [];
    for (const li of dialog.querySelectorAll('li')) {
      // Text format: "NIFTY2691523700PE/NRML in 15-sep-2026"
      //   or: "NIFTY26SEP23700PE/NRML in 25-sep-2026" (monthly)
      //
      const liText = li.textContent.trim();
      const symbol = liText.split('/')[0].trim();
      console.log('[Sensibull Ext] Dialog li text:', liText, '→ symbol:', symbol);
      const label = parseSymbolToLabel(symbol, liText);
      if (label) {
        labelsToUncheck.push(label);
        console.log('[Sensibull Ext] Parsed label:', label);
      } else {
        console.warn('[Sensibull Ext] Could not parse symbol:', symbol);
      }
    }

    // ── Step 4: Dismiss the dialog ──────────────────────────────
    const dismissBtn = dialog.querySelector('button');
    if (dismissBtn) dismissBtn.click();

    if (labelsToUncheck.length === 0) {
      showToast('Dialog appeared but no recognisable strikes were found in it.');
      return;
    }

    // ── Step 5: Brief pause for the dialog close animation ──────
    await new Promise(r => setTimeout(r, 400));

    // ── Step 6: Find and uncheck matching rows ──────────────────
    let unchecked = 0;
    for (const checkbox of document.querySelectorAll('button[role="checkbox"]')) {
      const row = checkbox.closest('tr');
      if (!row) continue;

      // The strike-name <p> is the only <p> in the row that contains a <sub>
      // (the ordinal suffix "th" / "st" / "nd" / "rd" is wrapped in <sub>).
      const labelEl = row.querySelector('p sub')?.closest('p');
      if (!labelEl) continue;

      const labelText = normalizeLabel(labelEl.textContent);

      if (labelsToUncheck.includes(labelText) && checkbox.dataset.state === 'checked') {
        checkbox.click();
        unchecked++;
      }
    }

    // ── Step 7: Report result ───────────────────────────────────
    if (unchecked > 0) {
      showToast(`✓ Unchecked ${unchecked} strike(s) already in another group.`);
    } else {
      showToast(
        `Dialog listed ${labelsToUncheck.length} conflict(s), but none were found as checked rows.\n\n` +
        `Looked for:\n${labelsToUncheck.join('\n')}`,
        true
      );
    }
  } catch (err) {
    console.error('[Sensibull Extension]', err);
    showToast(`Unexpected error: ${err.message}`, true);
  }
}

// ── Injected page button ──────────────────────────────────────

let isRunning = false;

/**
 * Injects an "Uncheck Conflicts" button right after the "Add to Group" button
 * in the page's action bar. Clones the wrapper div so it picks up all the
 * same Styled-Component classes and looks identical.
 */
function injectButton() {
  // Already injected and still in the DOM – nothing to do.
  if (document.querySelector('.sensibull-ext-btn')) return;

  const addToGroupBtn = findAddToGroupButton();
  if (!addToGroupBtn) return;

  // Clone the immediate wrapper div so we inherit all layout / styled-component classes.
  const wrapperDiv = addToGroupBtn.parentElement;
  if (!wrapperDiv) return;

  const newWrapper = wrapperDiv.cloneNode(true);  // deep clone (includes the button)
  const newBtn = newWrapper.querySelector('button');
  if (!newBtn) return;

  // Mark it so we can detect it later.
  newBtn.classList.add('sensibull-ext-btn');

  // Replace the text node that says "Add to Group" with our label.
  for (const node of newBtn.childNodes) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      node.textContent = 'Uncheck Conflicts';
      break;
    }
  }

  newBtn.addEventListener('click', async () => {
    if (isRunning) return;
    isRunning = true;
    newBtn.disabled = true;
    newBtn.style.opacity = '0.6';
    try {
      await run();
    } finally {
      isRunning = false;
      newBtn.disabled = false;
      newBtn.style.opacity = '';
    }
  });

  wrapperDiv.insertAdjacentElement('afterend', newWrapper);
}

/**
 * Tries to inject the button and re-injects if React ever re-renders it away.
 * Runs every 1.5 s – cheap DOM check, stops as soon as the button is present.
 */
setInterval(injectButton, 500);
injectButton(); // also try immediately on script load

// ── Message listener (popup "Run" button still works as before) ──
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'run') {
    run();
    sendResponse({ ok: true });
  }
});
