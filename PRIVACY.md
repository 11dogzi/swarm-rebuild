# Smart Robot Animation — Privacy Policy

Last updated: November 9, 2026. Applies to the Smart Robot Animation code distributed with this file.

[简体中文](swarm-rebuild/PRIVACY.zh-CN.md) · [User Guide](swarm-rebuild/README.md)

## Project origin

This project makes partial logic and appearance changes to Swarm Rebuild from [DhvanilPatel/swarm-cursors](https://github.com/DhvanilPatel/swarm-cursors). Its upstream README also credits Joel Califa's [Swarm](https://github.com/califa/swarm-site). This policy describes **this modified version**; it is not a privacy commitment made by the upstream project or by other versions.

## Information processed locally

The extension has no developer-operated data collection service, account system, analytics SDK, advertising tracker or telemetry upload feature. The current code does not intentionally send page content, screenshots or pointer coordinates to the developer or a third-party service.

The following information is processed in your browser to create the animation:

| Information | When and why it is processed |
| --- | --- |
| Latest pointer position | The pointer tracker loads on matching pages where injection is permitted and site access has been granted. Before an animation starts, pointer movement can already overwrite the latest coordinates in that tab's memory. It does not retain a movement history. Coordinates position robot departures and returns. |
| Page layout, accessible text and computed styles | Read after you launch the animation, to build drawing jobs and the visual overlay. This can include personal information displayed on the page. |
| Form display state | Reconstruction can read ordinary input values, selected option text and checkbox state. The dedicated password-field handler reads the value's length and draws masking dots rather than plaintext. This is not a guarantee that the entire page screenshot has been redacted. |
| A screenshot of the visible active tab | When a launch-time check finds visible canvas, video or embedded media, the extension attempts to temporarily hide non-media content and capture the visible tab for media cropping. Screenshots can contain visible sensitive information. |
| Media references and current frames | Used to reproduce page images, canvas content and current video frames. Video drawing follows the original player and does not require uploading the video. |
| Active tab and window identifiers | Used to target script injection and screenshot capture. The extension does not read a browsing-history list. |

Before drawing, the extension may briefly scroll the page to activate lazy-loaded content. This can also trigger the website's own loading or analytics behavior.

## Storage and retention

- Page blueprints, screenshots, animation state and the latest pointer coordinates are held in the current tab's memory, rather than extension-specific persistent storage.
- The current code does not store this information in `chrome.storage`, `localStorage`, `sessionStorage`, IndexedDB or cookies, and does not intentionally download screenshots to disk.
- Exiting removes the overlay and stops listeners associated with that animation session. The pointer tracker used by future launches can remain active.
- **Exiting does not guarantee immediate deletion of all in-memory state.** The implementation can retain the most recent screenshot for reuse by subsequent playback in the same tab. The latest pointer coordinates and session entry point can also remain. Reloading or closing the page clears these page-context values with that context.
- Browser resource caches, browser memory management and the website's own retention practices are outside the extension's control.

## Network activity and third-party resources

The current code has no `fetch`, XMLHttpRequest, WebSocket, Beacon or analytics request for uploading page content, and does not load remote executable code.

Reconstructing images, backgrounds, fonts or SVG references can cause the browser to request resources already referenced by the original page. Requests may reach the original site or its third-party providers and follow applicable browser/site caching, cookie, referrer and cross-origin rules. The original webpage and video player can also continue their own network activity. Consequently, this policy does not promise that using the extension results in no network requests whatsoever.

## Permissions

| Permission or declaration | Purpose |
| --- | --- |
| `activeTab` | Allows operations on the active tab following your shortcut action, including capturing its visible area when needed. |
| `scripting` | Injects the animation, inspects page media and temporarily inserts or removes capture-related styles. |
| `content_scripts.matches: <all_urls>` | Declares the sites on which the pointer tracker can run, subject to browser restrictions and granted access. This tracker can run before an animation is launched; it does not automatically launch full page reconstruction. |
| `web_accessible_resources` | Allows the animation overlay to load the bundled robot explosion GIF. It is not an upload mechanism. |

Access to file URLs and incognito windows depends on your browser's extension settings. Protected browser pages can block injection.

## Audio and device access

Robot effects are synthesized locally with the Web Audio API. The extension does not record audio, request microphone, camera or location access, or read the clipboard. Its sound toggle does not control the original page's media playback.

## Your controls

- Use the launch shortcut to start reconstruction. Press Esc or the shortcut again to exit early.
- Adjust site access, file URL access and incognito access in the extension's Details.
- Reload or close a page to clear its injected scripts and in-memory state.
- Disable or remove the extension in the extension manager, then refresh already open pages to clear injected content.

## Changes and questions

Future versions that introduce networking, storage, permissions or new processing practices should update this policy and its date. For questions about this modified version, contact the maintainer who supplied it to you; no separate support email is specified here. The upstream repository is linked for attribution and does not imply that its authors maintain or support this modified version.
