type ButtonDrawObject = ["button", number, number, number, number, string|boolean];
type FilledRectDrawObject = ["filledRect", number, number, number, number, string];
type ImageDrawObject = ["image", string, number, number];
type LineDrawObject = ["line", number, number, number, number, string];
type PbarDrawObject = ["pbar", string, number, number, number, number, string];
type RTLTextDrawObject = ["textRTL", "small"|"medium"|"large", string, number, number, string];
type StrokeRectDrawObject = ["strokeRect", number, number, number, number, string];
type TextDrawObject = ["text", "small"|"medium"|"large", string, number, number, string];
type TextureDrawObject = ["texture", number, number, number, number];

type DrawObject = ButtonDrawObject | FilledRectDrawObject | ImageDrawObject | LineDrawObject | PbarDrawObject | RTLTextDrawObject | StrokeRectDrawObject | TextDrawObject | TextureDrawObject;