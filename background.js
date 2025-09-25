console.log("[HoverSave] background loaded");

chrome.runtime.onInstalled.addListener(() => {
  console.log("[HoverSave] installed");
});

// Command-driven trigger: works even if page swallows key events.
// Set the shortcut at chrome://extensions/shortcuts.
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "save-hover-image") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "trigger-hover-save" }, (res) => {
    if (chrome.runtime.lastError) {
      console.warn("[HoverSave] sendMessage error:", chrome.runtime.lastError.message);
    }
    if (res?.status) console.log("[HoverSave]", res.status);
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "download-image-url" && msg.url) {
    const filename = (msg.filename || "image") + (guessExt(msg.url) || "");
    chrome.downloads.download(
      { url: msg.url, filename, saveAs: false, conflictAction: "uniquify" },
      (dlId) => {
        const err = chrome.runtime.lastError;
        if (err || !dlId) sendResponse({ ok: false, reason: err?.message || "Download failed" });
        else sendResponse({ ok: true });
      }
    );
    return true; // async
  }

  if (msg?.type === "download-image-dataurl" && msg.dataUrl) {
    const ext = dataUrlExt(msg.dataUrl) || ".png";
    const filename = (msg.filename || "image") + ext;
    chrome.downloads.download(
      { url: msg.dataUrl, filename, saveAs: false, conflictAction: "uniquify" },
      (dlId) => {
        const err = chrome.runtime.lastError;
        sendResponse({ ok: !!dlId, reason: err?.message });
      }
    );
    return true; // async
  }
});

function guessExt(url) {
  try {
    const last = new URL(url).pathname.split("/").pop() || "";
    const dot = last.lastIndexOf(".");
    if (dot > -1) {
      const ext = last.slice(dot);
      if (/^\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(ext)) return ext;
    }
  } catch {}
  return "";
}

function dataUrlExt(dataUrl) {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/.exec(dataUrl);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  if (mime.includes("png")) return ".png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return ".jpg";
  if (mime.includes("gif")) return ".gif";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("bmp")) return ".bmp";
  if (mime.includes("svg")) return ".svg";
  if (mime.includes("avif")) return ".avif";
  return null;
}
