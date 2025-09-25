console.log("[HoverSave] content injected at", location.href);
let lastHoverEl = null;

document.addEventListener("mousemove", (e) => {
  lastHoverEl = e.target;
}, { capture: true, passive: true });

// Fallback local key listener (works if the page isn't inside a locked iframe)
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && e.code === "Space") {
    e.preventDefault();
    trigger();
  }
}, true);

// Preferred path: background command -> content trigger
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "trigger-hover-save") {
    trigger().then(() => sendResponse({ status: "attempted" }));
    return true;
  }
});

async function trigger() {
  try {
    const startEl = lastHoverEl || document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    const info = findImageForElement(startEl);
    if (!info?.url) return toast("No image found under cursor.");
    const filenameBase = suggestFilenameBase(info.url) || "image";
    chrome.runtime.sendMessage({ type: "download-image-url", url: info.url, filename: filenameBase }, async (res) => {
      if (res?.ok) return toast("Downloading image…");
      try {
        const dataUrl = await fetchAsDataUrl(info.url);
        chrome.runtime.sendMessage({ type: "download-image-dataurl", dataUrl, filename: filenameBase }, (res2) => {
          if (res2?.ok) toast("Downloading image (fallback)…");
          else toast("Download failed.");
        });
      } catch {
        toast("Could not fetch image (CORS/protected).");
      }
    });
  } catch (err) {
    toast("Error: " + (err?.message || err));
  }
}

function findImageForElement(startEl) {
  if (!startEl) return null;
  let el = startEl;
  const seen = new Set();

  while (el && !seen.has(el)) {
    seen.add(el);

    if (el.tagName === "IMG") {
      const url = el.currentSrc || el.src;
      if (url) return { url, el, type: "img" };
    }

    if (el.tagName === "IMAGE" && el.ownerSVGElement) {
      const url = el.href?.baseVal || el.getAttribute("xlink:href");
      if (url) return { url: absoluteUrl(url), el, type: "svg-image" };
    }

    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg !== "none") {
      const url = extractFirstUrl(bg);
      if (url) return { url: absoluteUrl(url), el, type: "background" };
    }

    if (el.tagName === "PICTURE") {
      const img = el.querySelector("img");
      if (img && (img.currentSrc || img.src)) {
        return { url: img.currentSrc || img.src, el: img, type: "picture" };
      }
    }

    if (el.tagName === "SOURCE") {
      const url = el.srcset?.split(/\s+/)[0] || el.src || el.getAttribute("src");
      if (url) return { url: absoluteUrl(url), el, type: "source" };
    }

    el = el.parentElement || el.getRootNode()?.host || null; // follow into shadow roots
  }
  return null;
}

function extractFirstUrl(bgImage) {
  const m = /url\((['"]?)(.*?)\1\)/i.exec(bgImage);
  return m ? m[2] : null;
}

function absoluteUrl(u) {
  try { return new URL(u, location.href).toString(); } catch { return u; }
}

function suggestFilenameBase(u) {
  try {
    const { pathname } = new URL(u, location.href);
    const last = pathname.split("/").pop() || "";
    const name = last.replace(/\.[a-z0-9]+$/i, "");
    if (name) return sanitize(name);
  } catch {}
  return "image-" + new Date().toISOString().replace(/[:.]/g, "-");
}

function sanitize(s) { return s.replace(/[^a-z0-9._-]+/gi, "_").slice(0, 80) || "image"; }

async function fetchAsDataUrl(url) {
  const resp = await fetch(url, { credentials: "include" });
  if (!resp.ok) throw new Error("HTTP " + resp.status);
  const blob = await resp.blob();
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// Tiny toast
let toastTimer;
function toast(text) {
  try { clearTimeout(toastTimer); } catch {}
  let div = document.getElementById("__hover_save_toast__");
  if (!div) {
    div = document.createElement("div");
    div.id = "__hover_save_toast__";
    Object.assign(div.style, {
      position: "fixed", right: "12px", bottom: "12px", padding: "8px 12px",
      background: "rgba(0,0,0,0.75)", color: "#fff", font: "13px system-ui, -apple-system, Segoe UI, Roboto, Arial",
      borderRadius: "8px", zIndex: 2147483647, transition: "opacity .2s"
    });
    document.documentElement.appendChild(div);
  }
  div.textContent = text;
  div.style.opacity = "1";
  toastTimer = setTimeout(() => { div.style.opacity = "0"; }, 1600);
}
