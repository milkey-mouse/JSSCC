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
    drawGroups?: { [path: string]: DrawObject[] };
}

class AssetLoader {
    public drawGroups: { [path: string]: DrawObject[] };
    public palettes: { [path: string]: Palette; };
    public images: { [path: string]: ImageData; };
    public fonts: { [path: string]: BitmapFont; };

    private tempCanvas: CanvasRenderingContext2D | null;
    private unloadedAssets: number;
    private prefix: string;

    public onload: () => void;

    constructor(manifest: string = "assets/manifest.json") {
        this.onload = () => { };
        this.unloadedAssets = 0;
        this.drawGroups = {};
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

                    if (resp.palettes !== undefined) {
                        for (var p in resp.palettes) {
                            this.palettes[p] = resp.palettes[p];
                            AssetLoader.canonicalizePalette(this.palettes[p]);
                        }
                    }

                    if (resp.images !== undefined) {
                        this.unloadedAssets += resp.images.length;
                        resp.images.forEach((img) => { this.loadImage(img, true); }, this);
                    }

                    if (resp.fonts !== undefined) {
                        this.unloadedAssets += resp.fonts.length;
                        resp.fonts.forEach(this.loadFont, this);
                    }

                    if (resp.drawGroups !== undefined) {
                        for (var p in resp.drawGroups) {
                            this.drawGroups[p] = resp.drawGroups[p];
                        }
                    }
                } else {
                    console.error("HTTP request for asset manifest failed with code " + xhr.status);
                }
            }
        }, false);
        xhr.open('GET', manifest, true);
        xhr.send(null);
    }

    public static composite(outdata: Uint8ClampedArray, imgdata: Uint8ClampedArray, bgdata: Uint8ClampedArray, inPalette: Palette = <Palette>{}, outPalette: Palette = <Palette>{}): void {
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
            if (imgdata[i + 3] === 0) {
                outdata[i] = bgdata[i];
                outdata[i + 1] = bgdata[i + 1];
                outdata[i + 2] = bgdata[i + 2];
                outdata[i + 3] = bgdata[i + 3];
            } else {
                let outColor: Color = { r: imgdata[i], g: imgdata[i + 1], b: imgdata[i + 2] };
                let hexColor = AssetLoader.colorToHex(outColor);
                for (var color in inPalette) {
                    if (hexColor === (<any>inPalette)[color]) {
                        if (rgbPalette[color] != null) {
                            outColor = rgbPalette[color];
                        } else {
                            outColor = { r: bgdata[i], g: bgdata[i + 1], b: bgdata[i + 2] };
                        }
                        break;
                    }
                }
                outdata[i] = outColor.r;
                outdata[i + 1] = outColor.g;
                outdata[i + 2] = outColor.b;
                outdata[i + 3] = 255;
            }
        }
    }

    public switchPalette(oldName: string, newName: string): void {
        if (oldName !== newName) {
            for (var img in this.images) {
                let idata = this.getImage(img).data;
                AssetLoader.composite(idata, idata, idata, this.palettes[oldName], this.palettes[newName]);
            }
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
                console.error("tempCanvas is null right after writing");
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
                tempData.data[i * 4] = color.r;
                tempData.data[i * 4 + 1] = color.g;
                tempData.data[i * 4 + 2] = color.b;
                tempData.data[i * 4 + 3] = 255;
            }
        }
        console.log(colors);
        this.tempCanvas.putImageData(tempData, 0, 0);
        window.location.assign(this.tempCanvas.canvas.toDataURL("image/png"));
    }

    public rebakeBounds(cr: CanvasRenderer, manifestURL: string = "assets/manifest.json") {
        // ugly stupid code to export the pretty-printed manifest.json with bounds metadata
        var xhr = new XMLHttpRequest();
        xhr.addEventListener("readystatechange", () => {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var json = <ManifestXHRResponse>JSON.parse(xhr.responseText);
                    if (json.drawGroups === undefined) {
                        console.error("no drawGroups in this manifest");
                        return;
                    }
                    var baked = JSON.stringify(json, (k, v) => { return k === "drawGroups" ? {} : v; }, 4);
                    var lines: string[] = [baked.substring(0, baked.indexOf('    "drawGroups": {}') + 19)];
                    for (var gn in json.drawGroups) {
                        lines.push("        " + JSON.stringify(gn) + ": [");
                        var group: DrawObject[] = json.drawGroups[gn];
                        this.drawGroups[gn] = group;

                        // actually calculate the bounds here
                        cr.ctx.clearRect(0, 0, cr.canvas.width, cr.canvas.height);
                        cr.drawDGroup(gn);
                        var xMin = null;
                        var xMax = null;
                        var yMin = null;
                        var yMax = null;

                        var id = cr.ctx.getImageData(0, 0, cr.canvas.width, cr.canvas.height);
                        for (var y = 0; y < id.height; y++) {
                            for (var x = 0; x < id.width; x++) {
                                var pos = ((y * id.width) + x) * 4;
                                if (id.data[pos] != 0 ||
                                    id.data[pos + 1] != 0 ||
                                    id.data[pos + 2] != 0 ||
                                    id.data[pos + 3] != 0) {
                                    if (xMin === null || xMax === null || yMin === null || yMax === null) {
                                        xMin = x;
                                        xMax = x;
                                        yMin = y;
                                        yMax = y;
                                    } else {
                                        xMin = Math.min(xMin, x);
                                        xMax = Math.max(xMax, x);
                                        yMin = Math.min(yMin, y);
                                        yMax = Math.max(yMax, y);
                                    }
                                }
                            }
                        }
                        if (xMin === null || xMax === null || yMin === null || yMax === null) {
                            console.warn("nothing drawn; can't do bounds check for '" + gn + "'");
                        } else {
                            group.push(<BoundsMetadata>["newBounds", xMin, yMin, xMax - xMin + 1, yMax - yMin + 1]);
                        }

                        // start exporting JSON again
                        for (var y = 0; y < group.length; y++) {
                            if (group[y][0] === "bounds") {
                                if (y === group.length - 1) {
                                    var lastLine = lines[lines.length - 1];
                                    lines[lines.length - 1] = lastLine.substring(0, lastLine.length - 1);
                                }
                                continue;
                            }
                            var stringified: string[] = [];
                            for (var x = 0; x < group[y].length; x++) {
                                stringified.push(JSON.stringify(group[y][x]));
                            }
                            if (y === group.length - 1 && stringified[0] === '"newBounds"') {
                                stringified[0] = '"bounds"';
                            }
                            lines.push("            [" + stringified.join(", ") + (y === group.length - 1 ? "]" : "],"));
                        }
                        lines.push("        ],");
                    }
                    lines.pop();
                    lines.push("        ]");
                    // pop open the final JSON in the current tab
                    lines.push("    " + baked.substring(baked.indexOf('    "drawGroups": {}') + 19));
                    window.location.assign("data:application/json;base64," + btoa(lines.join("\n")));
                } else {
                    console.error("HTTP request for asset manifest failed with code " + xhr.status);
                }
            }
        }, false);
        xhr.open('GET', manifestURL, true);
        xhr.send(null);
    }
}
