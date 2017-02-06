// tfw you just want to implement a synthesizer but you've accidentally written a terrible UI framework

type ButtonDrawObject = ["button", number, number, number, number, string | boolean];
type FilledRectDrawObject = ["filledRect", number, number, number, number, string];
type ImageDrawObject = ["image", string, number, number];
type LineDrawObject = ["line", number, number, number, number, string];
type PbarDrawObject = ["pbar", string, number, number, number, number, string];
type TextDrawObject = ["text", "small" | "medium" | "large", string, number, number, string, number | undefined];
type RTLTextDrawObject = ["textRTL", "small" | "medium" | "large", string, number, number, string, number | undefined];
type StrokeRectDrawObject = ["strokeRect", number, number, number, number, string];
type TextureDrawObject = ["texture", number, number, number, number];
type PanDrawObject = ["pan", number, number, number | null];
type VUMeterDrawObject = ["vuMeter", number, number, number, number, number];
type WaveformDrawObject = ["waveform", number, number, number, string];
type WindowDrawObject = ["window", number, number, number, number, string | undefined];
type BoundsMetadata = ["bounds"|"newBounds", number, number, number, number];

type DrawObject = ButtonDrawObject | FilledRectDrawObject | ImageDrawObject | LineDrawObject | PbarDrawObject | RTLTextDrawObject | StrokeRectDrawObject | TextDrawObject | TextureDrawObject | PanDrawObject | VUMeterDrawObject | WaveformDrawObject | WindowDrawObject | BoundsMetadata;