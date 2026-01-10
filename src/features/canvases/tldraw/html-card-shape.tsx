/* eslint-disable react-hooks/rules-of-hooks */

import { BaseBoxShapeUtil, HTMLContainer, RecordProps, T, toDomPrecision, type TLBaseShape, type TLResizeInfo, resizeBox, useIsEditing } from "tldraw";

import { createHtmlCardSrcDoc, HTML_CARD_MIN_SIZE, HTML_CARD_SHAPE_TYPE, HTML_CARD_DEFAULT_SIZE } from "@/features/canvases/tldraw/html-card";

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

    return (
      <HTMLContainer id={shape.id} className="rounded-2xl overflow-hidden">
        <iframe
          title="HTML preview"
          sandbox="allow-scripts"
          srcDoc={srcDoc}
          width={toDomPrecision(w)}
          height={toDomPrecision(h)}
          draggable={false}
          referrerPolicy="no-referrer"
          loading="lazy"
          tabIndex={isEditing ? 0 : -1}
          className="w-full h-full bg-white"
          style={{
            border: 0,
            pointerEvents: isEditing ? "auto" : "none",
          }}
        />
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
