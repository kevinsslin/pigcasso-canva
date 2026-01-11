import { createHtmlCardSrcDoc } from "@/features/canvases/tldraw/html-card";

export const PIGCASSO_HTML_PREVIEW_DATA_URL_META_KEY = "pigcassoHtmlPreviewDataUrl";

const HTML2CANVAS_CDN_URL = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";

const injectPreviewScript = (srcDoc: string, requestId: string) => {
  const script = [
    "<script>",
    "(function(){",
    `const REQUEST_ID=${JSON.stringify(requestId)};`,
    "function send(payload){",
    "  try{ parent.postMessage(Object.assign({__pigcasso:true,type:'pigcasso:html-preview',requestId:REQUEST_ID},payload),'*'); }catch(e){}",
    "}",
    "function waitForHtml2Canvas(timeoutMs){",
    "  const start=Date.now();",
    "  return new Promise((resolve,reject)=>{",
    "    (function tick(){",
    "      if(window.html2canvas){ resolve(); return; }",
    "      if(Date.now()-start>timeoutMs){ reject(new Error('html2canvas did not load')); return; }",
    "      setTimeout(tick,50);",
    "    })();",
    "  });",
    "}",
    "window.addEventListener('load', async function(){",
    "  try{",
    "    await waitForHtml2Canvas(5000);",
    "    await new Promise(r=>setTimeout(r,250));",
    "    const canvas = await window.html2canvas(document.documentElement,{backgroundColor:'#ffffff',scale:1,logging:false,useCORS:true});",
    "    const dataUrl = canvas.toDataURL('image/jpeg',0.85);",
    "    send({dataUrl});",
    "  }catch(err){",
    "    send({error: (err && err.message) ? err.message : String(err)});",
    "  }",
    "});",
    "})();",
    "</script>",
  ].join("");

  const injection = [
    `<script src=\"${HTML2CANVAS_CDN_URL}\" crossorigin=\"anonymous\"></script>`,
    script,
  ].join("");

  if (srcDoc.includes("</body>")) {
    return srcDoc.replace("</body>", `${injection}</body>`);
  }
  if (srcDoc.includes("</html>")) {
    return srcDoc.replace("</html>", `${injection}</html>`);
  }
  return `${srcDoc}${injection}`;
};

export const createHtmlPreviewSrcDoc = (html: string, requestId: string) => {
  const base = createHtmlCardSrcDoc(html);
  return injectPreviewScript(base, requestId);
};

export const generateHtmlPreviewDataUrl = async (options: {
  html: string;
  width?: number;
  height?: number;
  timeoutMs?: number;
}) => {
  if (typeof window === "undefined") return null;
  if (typeof document === "undefined") return null;

  const requestId = crypto.randomUUID();
  const width = Math.max(240, Math.min(1400, Math.floor(options.width ?? 960)));
  const height = Math.max(160, Math.min(1400, Math.floor(options.height ?? 600)));
  const timeoutMs = Math.max(1000, Math.min(20000, Math.floor(options.timeoutMs ?? 12000)));

  const srcDoc = createHtmlPreviewSrcDoc(options.html, requestId);

  return new Promise<string | null>((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.setAttribute("referrerpolicy", "no-referrer");
    iframe.width = String(width);
    iframe.height = String(height);

    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = `${width}px`;
    iframe.style.height = `${height}px`;
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";

    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timeout);
      try {
        iframe.remove();
      } catch {
        // ignore
      }
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      const data = event.data as any;
      if (!data || typeof data !== "object") return;
      if (data.__pigcasso !== true) return;
      if (data.type !== "pigcasso:html-preview") return;
      if (data.requestId !== requestId) return;

      const dataUrl = typeof data.dataUrl === "string" ? data.dataUrl : null;
      cleanup();
      resolve(dataUrl);
    };

    const timeout = window.setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);

    window.addEventListener("message", onMessage);

    try {
      document.body.appendChild(iframe);
      iframe.srcdoc = srcDoc;
    } catch {
      cleanup();
      resolve(null);
    }
  });
};

