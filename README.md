# Sensibull Uncheck Helper

A small Chrome extension (Manifest V3) that removes the manual clean-up step when adding option strikes to a group on [Sensibull](https://sensibull.com).

## The problem

When you select several strikes and click **Add to group**, Sensibull shows a conflict dialog listing the strikes that already belong to another group. You then have to dismiss the dialog and hunt down each of those strikes in the table to uncheck them by hand.

## What it does

With one click, the extension:

1. Clicks **Add to group** on the page.
2. Waits for the conflict dialog and reads the conflicting strikes from it.
3. Dismisses the dialog.
4. Finds the matching checked rows on the page and unchecks them.
5. Shows a toast with the result (how many strikes were unchecked, or what went wrong).

It understands both NSE option symbol formats:

- **Weekly**, e.g. `NIFTY2691523700PE`, shown as `15th Sep 23700 PE`
- **Monthly**, e.g. `NIFTY26SEP23700PE`, where the expiry day is taken from the "in DD-MMM-YYYY" text in the dialog

## Two ways to run it

- **Injected button:** an **Uncheck Conflicts** button appears next to **Add to Group**, cloned from the page's own button so it looks native. It is re-injected automatically if the page re-renders.
- **Popup:** click the extension icon and press **Run**.

## Installation

1. Clone or download this repository.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the project folder.
4. Open a Sensibull page and refresh it.

## Files

- `manifest.json`: extension config
- `content.js`: symbol parsing, dialog handling, unchecking, button injection
- `popup.html` / `popup.js`: popup UI that triggers the run

## Permissions

Only `activeTab`, plus a content script limited to `*.sensibull.com`. No data is collected or sent anywhere.

## Notes

The extension depends on Sensibull's current page markup. If the UI changes, selectors in `content.js` may need updating. Debug messages in the console are prefixed `[Sensibull Ext]`.

This is an unofficial tool and is not affiliated with Sensibull.
