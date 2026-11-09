const CAPTURE_VISIBILITY_RULES = `
html body *:not(canvas):not(video):not(iframe):not(embed):not(object) { visibility: hidden !important; }
html body canvas, html body video, html body iframe, html body embed, html body object { visibility: visible !important; }
`;

function holdFor(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function inspectActiveDocument() {
  const session = window.__smartRobotAnimation;
  const running = Boolean(session && session.session);
  if (running) return { running, media: false };

  const media = [...document.querySelectorAll("canvas, video, iframe, embed, object")].some((element) => {
    const bounds = element.getBoundingClientRect();
    return (
      bounds.width > 8 &&
      bounds.height > 8 &&
      bounds.bottom > 0 &&
      bounds.right > 0 &&
      bounds.top < innerHeight &&
      bounds.left < innerWidth
    );
  });
  return { running, media };
}

function storeScreenshotForSession(imageAddress) {
  window.__smartRobotScreenshot = imageAddress;
  window.__smartRobotCaptureHidden = true;
}

async function restoreDocumentVisibility(target) {
  await chrome.scripting.removeCSS({ target, css: CAPTURE_VISIBILITY_RULES }).catch(() => {});
}

async function launchOnTab(tab) {
  if (tab?.id == null) return;
  const target = { tabId: tab.id };
  let visibilityChanged = false;
  try {
    const [inspection] = await chrome.scripting.executeScript({ target, func: inspectActiveDocument });
    const state = inspection.result || {};
    if (!state.running && state.media) {
      try {
        await chrome.scripting.insertCSS({ target, css: CAPTURE_VISIBILITY_RULES });
        visibilityChanged = true;
        await holdFor(90);
        const imageAddress = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
        await chrome.scripting.executeScript({
          target,
          func: storeScreenshotForSession,
          args: [imageAddress],
        });
      } catch {
        if (visibilityChanged) {
          await restoreDocumentVisibility(target);
          visibilityChanged = false;
        }
      }
    }
    await chrome.scripting.executeScript({ target, files: ["robot-scene.js"] });
  } catch (failure) {
    if (visibilityChanged) await restoreDocumentVisibility(target);
    console.error("[Smart Robot Animation] Unable to animate this page", failure);
  }
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "rebuild") return;
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await launchOnTab(activeTab);
});

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type !== "robot-animation:restore-page" || !sender.tab) return;
  restoreDocumentVisibility({ tabId: sender.tab.id }).then(() => respond(true));
  return true;
});
