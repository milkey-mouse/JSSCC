// tfw you just want to implement a synthesizer but you've accidentally written a terrible UI framework

type BoundsMetadata = ["bounds" | "newBounds", number, number, number, number];
type ButtonDrawObject = ["button", number, number, number, number, string | boolean];
type FilledRectDrawObject = ["filledRect", number, number, number, number, string];
type ImageDrawObject = ["image", string, number, number];
type LineDrawObject = ["line", number, number, number, number, string];
type NOP = ["nop"];
type PanDrawObject = ["pan", number, number, number | null];
type PbarDrawObject = ["pbar", string, number, number, number, number, string];
type StrokeRectDrawObject = ["strokeRect", number, number, number, number, string];
type TextDrawObject = ["text", "small" | "medium" | "large", string, number, number, string, boolean | undefined, number | undefined];
type TextureDrawObject = ["texture", number, number, number, number];
type VUMeterDrawObject = ["vuMeter", number, number, number, number, number];
type WaveformDrawObject = ["waveform", number, number, number, string];
type WindowDrawObject = ["window", number, number, number, number, string | undefined];

type DrawObject = BoundsMetadata |
    ButtonDrawObject |
    FilledRectDrawObject |
    ImageDrawObject |
    LineDrawObject |
    NOP |
    PanDrawObject |
    PbarDrawObject |
    StrokeRectDrawObject |
    TextDrawObject |
    TextureDrawObject |
    VUMeterDrawObject |
    WaveformDrawObject |
    WindowDrawObject;