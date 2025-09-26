// === CONFIG ===
let API_ENDPOINT = "";
let API_KEY = "";

// Load once on startup
chrome.storage.local.get(["apiUrl", "XApiKey"]).then((result) => {
  API_ENDPOINT = result.apiUrl || "";
  API_KEY = result.XApiKey || "";
});


console.log("[HoverSave] background worker ready");

// Track pending downloads so we can report when they complete
// dlId -> { image_class, requestedFilename }
const pending = new Map();

// Listen for download requests from content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "download-image-url" && msg.url) {
    const filename = (msg.filename || "image") + (guessExt(msg.url) || "");
    const payload = { image_class: msg.image_class || null, requestedFilename: filename };

    chrome.downloads.download(
      { url: msg.url, filename, saveAs: false, conflictAction: "uniquify" },
      (dlId) => {
        const err = chrome.runtime.lastError;
        if (err || !dlId) {
          sendResponse({ ok: false, reason: err?.message || "Download failed" });
        } else {
          pending.set(dlId, payload);
          sendResponse({ ok: true, dlId });
        }
      }
    );
    return true; // async response
  }

  if (msg?.type === "download-image-dataurl" && msg.dataUrl) {
    const ext = dataUrlExt(msg.dataUrl) || ".png";
    const filename = (msg.filename || "image") + ext;
    const payload = { image_class: msg.image_class || null, requestedFilename: filename };

    chrome.downloads.download(
      { url: msg.dataUrl, filename, saveAs: false, conflictAction: "uniquify" },
      (dlId) => {
        const err = chrome.runtime.lastError;
        if (err || !dlId) {
          sendResponse({ ok: false, reason: err?.message || "Download failed" });
        } else {
          pending.set(dlId, payload);
          sendResponse({ ok: true, dlId });
        }
      }
    );
    return true; // async response
  }
});

// When a download completes, look up its absolute path and POST to the API
chrome.downloads.onChanged.addListener(async (delta) => {
  if (!delta.state || delta.state.current !== "complete") return;
  const dlId = delta.id;

  try {
    const [item] = await chrome.downloads.search({ id: dlId });
    if (!item) return;

    const meta = pending.get(dlId);
    pending.delete(dlId);

    // item.filename is the absolute local path to the saved file
    const body = {
      image_path: item.filename,
      image_class: meta?.image_class || null
    };

    // Post to your API endpoint
    // Note: Make sure your server accepts requests from an extension (CORS).
    await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).catch((e) => {
      console.warn("[HoverSave] API POST failed:", e?.message || e);
    });
  } catch (e) {
    console.warn("[HoverSave] onChanged handler error:", e?.message || e);
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
