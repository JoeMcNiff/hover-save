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
  if (msg?.type === "upload-image-by-url" && msg.url) {
    (async () => {
      try {
        // 1) Fetch the image
        const resp = await fetch(msg.url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const blob = await resp.blob();

        // 2) Convert to base64
        const arrayBuf = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuf);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const base64 = btoa(binary);

        // 3) Build payload (JSON)
        const payload = {
          image_class: msg.image_class || null,
          requestedFilename: (msg.filename || "image"),
          page_url: msg.page_url || null,
          image_url: msg.url,
          element_type: msg.element_type || null,
          image_mime: blob.type || "application/octet-stream",
          image_base64: base64
        };

        // 4) POST to your API
        const r = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(API_KEY ? { "X-Api-Key": API_KEY } : {})
          },
          body: JSON.stringify(payload)
        });

        if (!r.ok) throw new Error(`API HTTP ${r.status}`);
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, reason: e?.message || String(e) });
      }
    })();

    return true; // async response
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
