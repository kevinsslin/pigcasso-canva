/* eslint-disable react-hooks/rules-of-hooks */
import { useCallback } from "react";
import {
  createComputedCache,
  FONT_FAMILIES,
  FONT_SIZES,
  getColorValue,
  isEqual,
  renderHtmlFromRichTextForMeasurement,
  RichTextLabel,
  TEXT_PROPS,
  TextShapeUtil,
  useDefaultColorTheme,
  useEditor,
  Vec,
  type Editor,
  type TLShapeId,
  type TLTextShape,
} from "tldraw";

import { PIGCASSO_TEXT_FONT_FAMILY_META_KEY } from "@/features/canvases/lib/text-style";

const sizeCache = createComputedCache(
  "pigcasso text size",
  (editor: Editor, shape: TLTextShape) => {
    editor.fonts.trackFontsForShape(shape);
    return getTextSize(editor, shape);
  },
  {
    areRecordsEqual: (a, b) =>
      a.props === b.props &&
      (a.meta as any)?.[PIGCASSO_TEXT_FONT_FAMILY_META_KEY] === (b.meta as any)?.[PIGCASSO_TEXT_FONT_FAMILY_META_KEY],
  },
);

export class PigcassoTextShapeUtil extends TextShapeUtil {
  static override type = "text" as const;

  override getMinDimensions(shape: TLTextShape) {
    return sizeCache.get(this.editor, shape.id)!;
  }

  override component(shape: TLTextShape) {
    const {
      id,
      props: { font, size, richText, color, scale, textAlign },
    } = shape;

    const { width, height } = this.getMinDimensions(shape);
    const isSelected = shape.id === this.editor.getOnlySelectedShapeId();
    const theme = useDefaultColorTheme();
    const handleKeyDown = useTextShapeKeydownHandler(id);
    const fontFamily = getFontFamilyForShape(shape);

    return (
      <RichTextLabel
        shapeId={id}
        classNamePrefix="tl-text-shape"
        type="text"
        font={font}
        fontSize={FONT_SIZES[size]}
        lineHeight={TEXT_PROPS.lineHeight}
        align={textAlign}
        verticalAlign="middle"
        richText={richText}
        labelColor={getColorValue(theme, color, "solid")}
        isSelected={isSelected}
        textWidth={width}
        textHeight={height}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          fontFamily,
        }}
        wrap
        onKeyDown={handleKeyDown}
      />
    );
  }

  override onBeforeUpdate(prev: TLTextShape, next: TLTextShape) {
    if (!next.props.autoSize) return;

    const prevFamily = getFontFamilyForShape(prev);
    const nextFamily = getFontFamilyForShape(next);

    const styleDidChange =
      prev.props.size !== next.props.size ||
      prev.props.textAlign !== next.props.textAlign ||
      prev.props.font !== next.props.font ||
      prevFamily !== nextFamily ||
      (prev.props.scale !== 1 && next.props.scale === 1);

    const textDidChange = !isEqual(prev.props.richText, next.props.richText);

    if (!styleDidChange && !textDidChange) return;

    const boundsA = this.getMinDimensions(prev);
    const boundsB = getTextSize(this.editor, next);

    const wA = boundsA.width * prev.props.scale;
    const hA = boundsA.height * prev.props.scale;
    const wB = boundsB.width * next.props.scale;
    const hB = boundsB.height * next.props.scale;

    let delta: Vec | undefined;

    switch (next.props.textAlign) {
      case "middle": {
        delta = new Vec((wB - wA) / 2, textDidChange ? 0 : (hB - hA) / 2);
        break;
      }
      case "end": {
        delta = new Vec(wB - wA, textDidChange ? 0 : (hB - hA) / 2);
        break;
      }
      default: {
        if (textDidChange) break;
        delta = new Vec(0, (hB - hA) / 2);
        break;
      }
    }

    if (delta) {
      delta.rot(next.rotation);
      const { x, y } = next;
      return {
        ...next,
        x: x - delta.x,
        y: y - delta.y,
        props: { ...next.props, w: wB },
      };
    }

    return { ...next, props: { ...next.props, w: wB } };
  }
}

const getFontFamilyForShape = (shape: TLTextShape) => {
  const raw = (shape.meta as any)?.[PIGCASSO_TEXT_FONT_FAMILY_META_KEY];
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return FONT_FAMILIES[shape.props.font];
};

const getTextSize = (editor: Editor, shape: TLTextShape) => {
  const { richText, size, w } = shape.props;

  const minWidth = 16;
  const fontSize = FONT_SIZES[size];

  const maybeFixedWidth = shape.props.autoSize ? null : Math.max(minWidth, Math.floor(w));

  const html = renderHtmlFromRichTextForMeasurement(editor, richText);
  const result = editor.textMeasure.measureHtml(html, {
    ...TEXT_PROPS,
    fontFamily: getFontFamilyForShape(shape),
    fontSize,
    maxWidth: maybeFixedWidth,
  });

  return {
    width: maybeFixedWidth ?? Math.max(minWidth, result.w + 1),
    height: Math.max(fontSize, result.h),
  };
};

const useTextShapeKeydownHandler = (id: TLShapeId) => {
  const editor = useEditor();

  return useCallback(
    (e: KeyboardEvent) => {
      if (editor.getEditingShapeId() !== id) return;

      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        editor.complete();
      }
    },
    [editor, id],
  );
};
