class Palette {
    background: string;
    foreground: string;
    light: string;
    dark: string;
    white: string;
}

type XHRFont = { path: string, rowEscapes?: number[], map: string };
type Color = { r: number, g: number, b: number };

class ManifestXHRResponse {
    palettes?: Palette[];
    images?: string[];
    fonts?: XHRFont[];
}

class AssetLoader {
    palettes: { [path: string]: Palette; };
    images: { [path: string]: ImageData; };
    fonts: { [path: string]: BitmapFont; };

    tempCanvas: CanvasRenderingContext2D | null;
    unloadedAssets: number;
    onload: () => void;
    prefix: string;

    constructor(manifest: string = "assets/manifest.json") {
        this.onload = () => { };
        this.unloadedAssets = 0;
        this.images = {};
        this.fonts = {};

        //cache default palette for loading screen
        this.palettes = {
            "default": <Palette>{
                "background": "#df825f",
                "foreground": "#5c1f09",
                "dark": "#b2593f",
                "light": "#ffd2a2",
                "white": "#ffffff"
            }
        };

        this.prefix = manifest.substring(0, manifest.lastIndexOf("/"));
        this.add(manifest);
    }

    public static canonicalizePalette(p: Palette): void {
        for (var color in p) {
            if (typeof color === "string") {
                (<any>p)[color] = AssetLoader.canonicalizeHex((<any>p)[color]);
            } else {
                console.error("palette has non-string key; this should never happen!");
                console.log(color);
            }
        }
    }

    public static canonicalizeHex(hex: string): string {
        var rgbColor = AssetLoader.hexToRgb(hex);
        if (rgbColor === null) {
            console.error("could not parse hex color " + hex);
            return "#ffffff";
        } else {
            return AssetLoader.colorToHex(rgbColor);
        }
    }

    public static hexToRgb(hex: string): Color | null {
        // https://stackoverflow.com/a/5624139
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? <Color>{
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    public static colorToHex(c: Color): string {
        return AssetLoader.rgbToHex(c.r, c.g, c.b);
    }

    public static rgbToHex(r: number, g: number, b: number): string {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    public add(manifest: string): void {
        var xhr = new XMLHttpRequest();
        xhr.addEventListener("readystatechange", () => {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var resp = <ManifestXHRResponse>JSON.parse(xhr.responseText);
                    if (resp.images !== undefined) { this.unloadedAssets += resp.images.length; }
                    if (resp.fonts !== undefined) { this.unloadedAssets += resp.fonts.length; }

                    if (resp.palettes !== undefined) {
                        for (var p in resp.palettes) {
                            this.palettes[p] = resp.palettes[p];
                            AssetLoader.canonicalizePalette(this.palettes[p]);
                        }
                    }

                    if (resp.images !== undefined) {
                        resp.images.forEach((img) => { this.loadImage(img, true); }, this);
                    }
                    if (resp.fonts !== undefined) {
                        resp.fonts.forEach(this.loadFont, this);
                    }
                } else {
                    console.error("HTTP request for asset manifest failed with code " + xhr.status);
                }
            }
        }, false);
        xhr.open('GET', manifest, true);
        xhr.send(null);
    }

    public static composite(outdata: Uint8ClampedArray, imgdata: Uint8ClampedArray, bgdata: Uint8ClampedArray, inPalette: Palette, outPalette: Palette): void {
        AssetLoader.canonicalizePalette(inPalette);

        var rgbPalette: { [name: string]: Color } = {};
        for (var color in outPalette) {
            let rgb = AssetLoader.hexToRgb(<string>(<any>outPalette)[color]);
            if (rgb === null) {
                console.error("could not parse hex string when converting palette: " + <string>(<any>outPalette)[color]);
                return;
            } else {
                rgbPalette[color] = rgb;
            }
        }

        for (var i = 0; i < imgdata.length; i += 4) {
            let hexColor = AssetLoader.rgbToHex(imgdata[i], imgdata[i + 1], imgdata[i + 2]);
            let outColor: Color = { r: bgdata[i], g: bgdata[i + 1], b: bgdata[i + 2] };
            for (var color in inPalette) {
                if (hexColor === (<any>inPalette)[color]) 
                {
                    outColor = rgbPalette[color];
                    break;
                }
            }
            outdata[i] = outColor.r;
            outdata[i + 1] = outColor.g;
            outdata[i + 2] = outColor.b;
            outdata[i + 3] = 255;
        }
    }

    public switchPalette(oldName: string, newName: string): void {
        if (oldName !== newName) {
            for (var img in this.images) {
                let idata = this.getImage(img).data;
                AssetLoader.composite(idata, idata, idata, this.palettes[oldName], this.palettes[newName]);
            }
            //for (var fontName in this.fonts) {
            //    var font = this.fonts[fontName];
            //    for (var i = 0; i < font.chars.length; i++) {
            //        let fdata = font.chars[i].data;
            //        AssetLoader.replaceColors(fdata, fdata, fdata, this.palettes[oldName], this.palettes[newName]);
            //    }
            //}
        }
    }

    public loadImage(imagePath: string, recolor: boolean = false, save: boolean = true, callback?: (x?: string) => void): void {
        var name = imagePath.substring(imagePath.lastIndexOf("/") + 1, imagePath.lastIndexOf("."));
        if (this.images.hasOwnProperty(name)) {
            console.log("skipping cached image " + imagePath);
            return;
        }
        var img = new Image(); //document.createElement("img");
        img.addEventListener("load", () => {
            if (this.tempCanvas == null) {
                var newCanvas = <Object | null>(<HTMLCanvasElement>document.createElement("canvas")).getContext("2d");
                if (typeof newCanvas === "object") {
                    this.tempCanvas = <CanvasRenderingContext2D>newCanvas;
                } else {
                    console.error("could not create canvas or context for temp loader");
                    return;
                }
            }
            this.tempCanvas.canvas.width = img.naturalWidth;
            this.tempCanvas.canvas.height = img.naturalHeight;
            this.tempCanvas.drawImage(img, 0, 0);
            if (save) { this.images[name] = this.tempCanvas.getImageData(0, 0, img.naturalWidth, img.naturalHeight); }
            if (callback != null) { callback(name); }
            this.unloadedAssets--;
            if (this.unloadedAssets === 0) {
                this.tempCanvas.canvas.remove();
                this.tempCanvas = null;
                this.onload();
            }
        }, false);
        img.src = this.prefix + "/" + imagePath;
    }

    public loadFont(font: XHRFont): void {
        var name = font.path.substring(font.path.lastIndexOf("/") + 1, font.path.lastIndexOf("."));
        if (this.fonts.hasOwnProperty(name)) {
            console.log("skipping cached font " + font.path);
            return;
        }
        this.loadImage(font.path, false, false, (name: string) => {
            if (this.tempCanvas == null) {
                console.error("tempCanvas is null right after writing; wut?!");
                return;
            }
            this.fonts[name] = new BitmapFont(this.tempCanvas, font.map, font.rowEscapes);
        });
    }

    public getImage(name: string): ImageData {
        return (<any>this.images)[name];
    }

    public getFont(name: string): BitmapFont {
        return (<any>this.fonts)[name];
    }

    public exportPalette(name: string): void {
        if (this.tempCanvas == null) {
            var newCanvas = <Object | null>(<HTMLCanvasElement>document.createElement("canvas")).getContext("2d");
            if (typeof newCanvas === "object") {
                this.tempCanvas = <CanvasRenderingContext2D>newCanvas;
            } else {
                console.error("could not create canvas or context for temp loader");
                return;
            }
        }
        var colors: string[] = [];
        for (var key in this.palettes[name]) { colors.push(key); }
        colors.sort();
        this.tempCanvas.canvas.width = colors.length;
        this.tempCanvas.canvas.height = 1;
        var tempData = new ImageData(colors.length, 1);
        for (var i = 0; i < colors.length; i++) {
            let color = AssetLoader.hexToRgb((<any>this.palettes[name])[colors[i]]);
            if (color !== null) {
                tempData.data[i*4] = color.r;
                tempData.data[i*4+1] = color.g;
                tempData.data[i*4+2] = color.b;
                tempData.data[i*4+3] = 255;
            }
        }
        console.log(colors);
        this.tempCanvas.putImageData(tempData, 0, 0);
        window.location.assign(this.tempCanvas.canvas.toDataURL("image/png"));
    }
}