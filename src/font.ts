class BitmapFont {
    public chars: ImageData[];
    public charMap: string;

    public spaceBetweenLetters: number;
    public spaceWidth: number;
    public height: number;

    private static fontPalette: Palette = <Palette>{ foreground: "#000", background: "#fff" };

    public constructor(imgCanvas: CanvasRenderingContext2D, charMap: string, rowEscapes?: number[]) {
        this.height = imgCanvas.canvas.height;
        this.spaceBetweenLetters = 1;
        this.spaceWidth = 2;

        this.charMap = charMap;
        this.chars = [];

        var lastCut = -1;
        var charIdx = 0;
        for (var row = 0; row < imgCanvas.canvas.width; row++) {
            if (rowEscapes == null || rowEscapes.indexOf(row) === -1) {
                var data = imgCanvas.getImageData(row, 0, 1, this.height).data;
                for (var i = 0; i < data.length; i++) { if (data[i] != 255) { break; } }
                if (i === data.length) {  //this column is all white
                    this.chars[charIdx] = imgCanvas.getImageData(lastCut + 1, 0, row - lastCut - 1, this.height);
                    lastCut = row;
                    charIdx++;
                }
            }
        }
        this.chars[charIdx] = imgCanvas.getImageData(lastCut + 1, 0, imgCanvas.canvas.width - lastCut - 1, this.height);
        if (this.charMap.length !== this.chars.length) {
            console.error("map is different length than char array; char map probably didn't load correctly");
        }
    }

    public drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color?: string, rtl: boolean = false): void {
        var newPalette: Palette = <Palette>{ foreground: color };
        var origX = x;
        for (var i = rtl ? (text.length - 1) : 0; rtl ? (i >= 0) : (i < text.length); rtl ? i-- : i++) {
            if (text[i] === " ") {
                if (rtl) {
                    x -= this.spaceWidth + this.spaceBetweenLetters;
                } else {
                    x += this.spaceWidth + this.spaceBetweenLetters;
                }
                continue;
            } else if (text[i] === "\n") {
                x = origX;
                y += this.height + this.spaceWidth;
                continue;
            } else {
                var charIdx = this.charMap.indexOf(text[i]);
                if (charIdx === -1 || (rtl && charIdx >= this.chars.length)) {
                    console.warn("could not print character '" + text[i] + "' with charmap '" + this.charMap + "'");
                    x += this.spaceWidth + this.spaceBetweenLetters;
                } else {
                    var charImg = this.chars[charIdx];
                    if (color == null) {
                        ctx.putImageData(charImg, rtl ? (x - charImg.width) : x, y);
                    } else {
                        var composited = ctx.createImageData(charImg.width, charImg.height);
                        AssetLoader.composite(composited.data, charImg.data, ctx.getImageData(rtl ? (x - charImg.width) : x, y, charImg.width, charImg.height).data, BitmapFont.fontPalette, newPalette);
                        ctx.putImageData(composited, rtl ? (x - charImg.width) : x, y);
                    }
                    if (rtl) {
                        x -= charImg.width + this.spaceBetweenLetters;
                    } else {
                        x += charImg.width + this.spaceBetweenLetters;
                    }
                }
            }
        }
    }
}