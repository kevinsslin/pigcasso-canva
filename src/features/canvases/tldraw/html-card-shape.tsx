/* eslint-disable react-hooks/rules-of-hooks */

import { BaseBoxShapeUtil, HTMLContainer, RecordProps, T, toDomPrecision, type TLBaseShape, type TLResizeInfo, resizeBox, useIsEditing } from "tldraw";

import { createHtmlCardSrcDoc, HTML_CARD_MIN_SIZE, HTML_CARD_SHAPE_TYPE, HTML_CARD_DEFAULT_SIZE } from "@/features/canvases/tldraw/html-card";
import { getHtmlCardIframeStyle, HTML_CARD_IFRAME_SANDBOX } from "@/features/canvases/tldraw/html-card-iframe";
import { PIGCASSO_HTML_PREVIEW_DATA_URL_META_KEY } from "@/features/canvases/lib/html-preview";

export type HtmlCardShape = TLBaseShape<
  typeof HTML_CARD_SHAPE_TYPE,
  {
    w: number;
    h: number;
    html: string;
  }
>;

export class HtmlCardShapeUtil extends BaseBoxShapeUtil<HtmlCardShape> {
  static override type = HTML_CARD_SHAPE_TYPE;
  static override props: RecordProps<HtmlCardShape> = {
    w: T.number,
    h: T.number,
    html: T.string,
  };

  override canEdit() {
    return true;
  }

  override canEditInReadonly() {
    return true;
  }

  override getDefaultProps(): HtmlCardShape["props"] {
    return {
      w: HTML_CARD_DEFAULT_SIZE.w,
      h: HTML_CARD_DEFAULT_SIZE.h,
      html: "",
    };
  }

  override onResize(shape: HtmlCardShape, info: TLResizeInfo<HtmlCardShape>) {
    return resizeBox(shape, info, {
      minWidth: HTML_CARD_MIN_SIZE.w,
      minHeight: HTML_CARD_MIN_SIZE.h,
    });
  }

  component(shape: HtmlCardShape) {
    const { w, h, html } = shape.props;
    const isEditing = useIsEditing(shape.id);
    const srcDoc = createHtmlCardSrcDoc(html);
    const isInteractive = isEditing;
    const previewRaw = (shape.meta as any)?.[PIGCASSO_HTML_PREVIEW_DATA_URL_META_KEY];
    const previewDataUrl =
      typeof previewRaw === "string" && previewRaw.startsWith("data:image/png") ? previewRaw : null;
    const previewStatus = typeof previewRaw === "string" ? previewRaw : null;

    return (
      <HTMLContainer id={shape.id} className="relative rounded-2xl overflow-hidden bg-white">
        {!isEditing && previewDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            src={previewDataUrl}
            className="w-full h-full object-cover bg-white"
            draggable={false}
          />
        ) : srcDoc ? (
          <iframe
            title="HTML preview"
            sandbox={HTML_CARD_IFRAME_SANDBOX}
            srcDoc={srcDoc}
            width={toDomPrecision(w)}
            height={toDomPrecision(h)}
            draggable={false}
            referrerPolicy="no-referrer"
            loading="eager"
            tabIndex={isEditing ? 0 : -1}
            className="w-full h-full bg-white"
            style={getHtmlCardIframeStyle(isInteractive)}
          />
        ) : (
          <div className="h-full w-full grid place-items-center bg-white text-xs text-muted-foreground">
            Add HTML to preview
          </div>
        )}

        {!isEditing &&
        srcDoc &&
        (previewStatus === "rendering" ||
          previewStatus === "failed" ||
          (typeof previewStatus === "string" &&
            previewStatus.startsWith("data:image/") &&
            !previewStatus.startsWith("data:image/png"))) ? (
          <div className="absolute bottom-2 right-2 rounded-full border bg-white/90 px-2 py-1 text-[10px] font-semibold text-muted-foreground shadow-sm">
            {previewStatus === "failed"
              ? "Static preview unavailable"
              : previewStatus === "rendering"
                ? "Rendering static preview…"
                : "Updating static preview…"}
          </div>
        ) : null}

        {!isEditing && srcDoc ? <div className="absolute inset-0 pointer-events-auto" aria-hidden="true" /> : null}
      </HTMLContainer>
    );
  }

  indicator(shape: HtmlCardShape) {
    return (
      <rect
        width={toDomPrecision(shape.props.w)}
        height={toDomPrecision(shape.props.h)}
        rx="16"
        ry="16"
      />
    );
  }
}
