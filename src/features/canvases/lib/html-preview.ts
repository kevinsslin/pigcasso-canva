import { createHtmlCardSrcDoc } from "@/features/canvases/tldraw/html-card";

export const PIGCASSO_HTML_PREVIEW_DATA_URL_META_KEY = "pigcassoHtmlPreviewDataUrl";

const HTML2CANVAS_CDN_URL = "/vendor/html2canvas.min.js";

const injectPreviewScript = (srcDoc: string, params: { requestId: string; width: number; height: number }) => {
  const { requestId, width, height } = params;
  const script = [
    "<script>",
    "(function(){",
    `const REQUEST_ID=${JSON.stringify(requestId)};`,
    `const TARGET_WIDTH=${JSON.stringify(width)};`,
    `const TARGET_HEIGHT=${JSON.stringify(height)};`,
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
    "function waitForFonts(timeoutMs){",
    "  try{",
    "    if(!document.fonts || !document.fonts.ready){ return Promise.resolve(); }",
    "    return Promise.race([document.fonts.ready, new Promise((resolve)=>setTimeout(resolve, timeoutMs))]);",
    "  }catch(e){ return Promise.resolve(); }",
    "}",
    "window.addEventListener('load', async function(){",
    "  try{",
    "    document.documentElement.style.background='#ffffff';",
    "    document.body.style.background='#ffffff';",
    "    document.body.style.margin='0';",
    "    document.body.style.width=TARGET_WIDTH+'px';",
    "    document.body.style.height=TARGET_HEIGHT+'px';",
    "    await waitForHtml2Canvas(5000);",
    "    await waitForFonts(1500);",
    "    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));",
    "    const scale = (TARGET_WIDTH * TARGET_HEIGHT) > 1100000 ? 0.75 : 1;",
    "    const canvas = await window.html2canvas(document.body,{backgroundColor:'#ffffff',scale,logging:false,useCORS:true,scrollX:0,scrollY:0,windowWidth:TARGET_WIDTH,windowHeight:TARGET_HEIGHT,width:TARGET_WIDTH,height:TARGET_HEIGHT});",
    "    const dataUrl = canvas.toDataURL('image/png');",
    "    (function(){",
    "      try{",
    "        const ctx = canvas.getContext('2d');",
    "        if(!ctx) return;",
    "        const sample = (x,y)=>Array.from(ctx.getImageData(x,y,1,1).data);",
    "        const pts=[[0,0],[canvas.width-1,0],[0,canvas.height-1],[canvas.width-1,canvas.height-1],[Math.floor(canvas.width/2),Math.floor(canvas.height/2)]];",
    "        const looksAllBlack = pts.every(([x,y])=>{const d=sample(Math.max(0,x),Math.max(0,y)); return d[0]===0 && d[1]===0 && d[2]===0 && d[3]===255;});",
    "        if(looksAllBlack){",
    "          send({error:'Preview rendered as an all-black bitmap (likely a browser rendering limitation). Use Live preview to view this HTML.'});",
    "          throw new Error('all-black');",
    "        }",
    "      }catch(e){",
    "        if(String(e&&e.message||e).indexOf('all-black')===-1){ /* ignore */ }",
    "        return;",
    "      }",
    "      send({dataUrl});",
    "    })();",
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

export const createHtmlPreviewSrcDoc = (html: string, params: { requestId: string; width: number; height: number }) => {
  const base = createHtmlCardSrcDoc(html);
  return injectPreviewScript(base, params);
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

  const srcDoc = createHtmlPreviewSrcDoc(options.html, { requestId, width, height });

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
