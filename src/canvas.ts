class CanvasRenderer {
    canvasID: string;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    loader: AssetLoader;
    hitDetector: HitDetector;

    palette: Palette;
    paletteName: string;

    initialized: boolean;
    loadEvents: number;
    scale: number;

    song: Song;

    chan: Channel;
    offsetX: number;
    offsetY: number;

    continuouslyRender: boolean;

    constructor(loader: AssetLoader = new AssetLoader("assets/manifest.json"), song: Song, canvasID: string = "content", continuouslyRender: boolean = true) {
        this.loader = loader;
        this.initialized = false;
        this.loadEvents = 2;
        this.scale = 1;

        this.canvasID = canvasID;
        this.paletteName = "default";
        this.palette = this.loader.palettes[this.paletteName];

        this.song = song;
        this.chan = song.channels[0];

        this.offsetX = 0;
        this.offsetY = 0;

        this.continuouslyRender = continuouslyRender;

        var onload = () => {
            this.loadEvents--;
            this.initCanvas();
            this.rescale();
            if (this.loadEvents === 0) { this.firstDraw(); }
        };

        if (document.readyState === "complete") {
            onload();
        } else {
            window.addEventListener("load", onload, false);
        }

        this.loader.onload.push(() => {
            this.loadEvents--;
            this.switchPalette(Cookies.get("palette", "default"));
            if (this.loadEvents === 0) { this.firstDraw(); }
        });
    }

    public firstDraw() {
        this.clear();
        this.redraw();
        this.renderFrame();
    }

    public switchPalette(name: string = "default"): void {
        if (name !== this.paletteName) {
            Cookies.write("palette", name);
            if (this.initialized) {
                var olddata = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                this.clear();
                this.ctx.fillStyle = this.palette.foreground;
                this.ctx.fillText("Loading...", this.canvas.width / 2, this.canvas.height / 2);
                // have a frame render with the "Loading..." text before switching
                window.setTimeout(() => {
                    if (olddata !== undefined) {
                        let newdata = new ImageData(olddata.width, olddata.height);
                        AssetLoader.composite(newdata.data, olddata.data, olddata.data, this.palette, this.loader.palettes[name]);
                        this.ctx.putImageData(newdata, 0, 0);
                    }
                    this.loader.switchPalette(this.paletteName, name);
                    this.palette = this.loader.palettes[name];
                    this.paletteName = name;
                    document.body.style.backgroundColor = this.palette.background;
                    if (olddata === undefined && this.initialized) {
                        this.clear();
                        this.redraw();
                    }
                }, 10);
            } else {
                this.loader.switchPalette(this.paletteName, name);
                this.palette = this.loader.palettes[name];
                this.paletteName = name;
                document.body.style.backgroundColor = this.palette.background;
            }
        }
    }

    public initCanvas(): void {
        if (this.initialized) { return; }
        document.body.style.backgroundColor = this.palette.background;
        window.addEventListener("resize", () => { this.rescale(); }, false);
        this.canvas = <HTMLCanvasElement>document.getElementById(this.canvasID);
        this.canvas.width = 634;
        this.canvas.height = 444;

        var newCtx = this.canvas.getContext("2d");
        if (newCtx === null) {
            console.error("couldn't get 2d context for main canvas");
            return;
        }

        this.hitDetector = new HitDetector(newCtx);

        this.ctx = newCtx;
        this.ctx.textBaseline = "middle";
        this.ctx.textAlign = "center";
        this.ctx.font = "25px monospace";
        this.initialized = true;
        this.rescale();
        this.clear();
    }

    public rescale(): void {
        if (!this.initialized) { return; }
        var widthScale: number = window.innerWidth / this.canvas.width;
        var heightScale: number = window.innerHeight / this.canvas.height;
        this.hitDetector.scale = this.scale = Math.max(1, Math.floor(Math.min(widthScale, heightScale)));
        this.ctx.canvas.style.height = (this.ctx.canvas.height * this.scale) + "px";
        this.ctx.canvas.style.width = (this.ctx.canvas.width * this.scale) + "px";
    }

    public clear(): void {
        if (!this.initialized) { return; }
        this.ctx.fillStyle = this.palette.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    public button(x: number, y: number, w: number, h: number, pressed: boolean = false): void {
        this.ctx.strokeStyle = pressed ? this.palette.background : this.palette.light;
        this.ctx.strokeRect(x + 1.5, y + 1.5, w - 2, h - 2);
        this.ctx.strokeStyle = pressed ? this.palette.light : this.palette.foreground;
        this.ctx.strokeRect(x + 2.5, y + 2.5, w - 3, h - 3);
        this.ctx.fillStyle = this.palette.dark;
        this.ctx.fillRect(x + 2, y + 2, w - 3, h - 3);
        this.ctx.strokeStyle = this.palette.foreground;
        this.ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    }

    public strokeRect(x: number, y: number, w: number, h: number, color: string) {
        this.ctx.strokeStyle = color;
        this.ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    }

    public filledRect(x: number, y: number, w: number, h: number, color: string) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, w, h);
    }

    public clearRect(x: number, y: number, w: number, h: number) {
        this.ctx.clearRect(x, y, w, h);
    }

    public image(image: string, x: number, y: number) {
        this.ctx.putImageData(this.loader.getImage(image), x, y);
    }

    public line(x1: number, y1: number, x2: number, y2: number, color: string) {
        x2 += this.offsetX;
        y2 += this.offsetY;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x1 + 0.5, y1 + 0.5);
        this.ctx.lineTo(x2 + 0.5, y2 + 0.5);
        this.ctx.stroke();
    }

    public pbar(value: number, x: number, y: number, w: number, h: number, color: string) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, Math.round(w * value), h);
    }

    public text(size: "small" | "medium" | "large", text: string, x: number, y: number, color: string, rtl?: boolean, spaceWidth?: number) {
        var font = this.loader.getFont(size);
        if (spaceWidth === undefined) {
            this.loader.getFont(size).drawText(this.ctx, text, x, y, color, rtl);
        } else {
            font.spaceWidth = spaceWidth;
            font.drawText(this.ctx, text, x, y, color, rtl);
            font.spaceWidth = 1;
        }
    }

    public window(x: number, y: number, w: number, h: number, title?: string) {
        // the reason for all this raw ImageData manipulation is to dynamically
        // generate (because of palette changes) the gradients on the sides of
        // the window by scaling the corners' edges all the way across the sides
        // the corners also need compositing as parts of them are transparent

        // composite curved corners with background
        var upperLeft = this.loader.getImage("upperLeft");
        var upperRight = this.loader.getImage("upperRight");
        var lowerLeft = this.loader.getImage("lowerLeft");
        var lowerRight = this.loader.getImage("lowerRight");
        var compositedUpperLeft = new ImageData(upperLeft.width, upperLeft.height);
        var compositedUpperRight = new ImageData(upperRight.width, upperRight.height);
        var compositedLowerLeft = new ImageData(lowerLeft.width, lowerLeft.height);
        var compositedLowerRight = new ImageData(lowerRight.width, lowerRight.height);

        AssetLoader.composite(compositedUpperLeft.data, upperLeft.data, this.ctx.getImageData(x, y, upperLeft.width, upperLeft.height).data);
        AssetLoader.composite(compositedUpperRight.data, upperRight.data, this.ctx.getImageData(x + w - upperRight.width, y, upperRight.width, upperRight.height).data);
        AssetLoader.composite(compositedLowerLeft.data, lowerLeft.data, this.ctx.getImageData(x, y + h - lowerLeft.height, lowerLeft.width, lowerLeft.height).data);
        AssetLoader.composite(compositedLowerRight.data, lowerRight.data, this.ctx.getImageData(x + w - lowerRight.width, y + h - lowerRight.height, lowerRight.width, lowerRight.height).data);

        // draw main window surface
        this.ctx.fillStyle = this.palette.background;
        this.ctx.fillRect(x, y, w, h);

        // draw left edge
        for (var i = 0; i < upperLeft.width; i++) {
            let dataIdx = ((upperLeft.height - 1) * upperLeft.width + i) * 4;
            this.ctx.strokeStyle = AssetLoader.rgbToHex(upperLeft.data[dataIdx], upperLeft.data[dataIdx + 1], upperLeft.data[dataIdx + 2]);
            this.ctx.beginPath();
            this.ctx.moveTo(x + i + 0.5, y + 0.5);
            this.ctx.lineTo(x + i + 0.5, y + h - 0.5);
            this.ctx.stroke();
        }

        // draw right edge
        for (var i = 0; i < upperRight.width; i++) {
            let dataIdx = ((upperRight.height - 1) * upperRight.width + i) * 4;
            this.ctx.strokeStyle = AssetLoader.rgbToHex(upperRight.data[dataIdx], upperRight.data[dataIdx + 1], upperRight.data[dataIdx + 2]);
            this.ctx.beginPath();
            this.ctx.moveTo(x + w - upperRight.width + i + 0.5, y + 0.5);
            this.ctx.lineTo(x + w - upperRight.width + i + 0.5, y + h - 0.5);
            this.ctx.stroke();
        }

        // draw top edge
        for (var i = 0; i < upperLeft.height; i++) {
            let dataIdx = (upperLeft.width * i + (upperLeft.width - 1)) * 4;
            this.ctx.strokeStyle = AssetLoader.rgbToHex(upperLeft.data[dataIdx], upperLeft.data[dataIdx + 1], upperLeft.data[dataIdx + 2]);
            this.ctx.beginPath();
            this.ctx.moveTo(x + 0.5, y + i + 0.5);
            this.ctx.lineTo(x + w - 0.5, y + i + 0.5);
            this.ctx.stroke();
        }

        // draw bottom edge
        for (var i = 0; i < lowerLeft.height; i++) {
            let dataIdx = (lowerLeft.width * i + (lowerLeft.width - 1)) * 4;
            this.ctx.strokeStyle = AssetLoader.rgbToHex(lowerLeft.data[dataIdx], lowerLeft.data[dataIdx + 1], lowerLeft.data[dataIdx + 2]);
            this.ctx.beginPath();
            this.ctx.moveTo(x + 0.5, y + h - lowerLeft.height + i + 0.5);
            this.ctx.lineTo(x + w - 0.5, y + h - lowerLeft.height + i + 0.5);
            this.ctx.stroke();
        }

        this.ctx.putImageData(compositedUpperLeft, x, y);
        this.ctx.putImageData(compositedUpperRight, x + w - upperRight.width, y);
        this.ctx.putImageData(compositedLowerLeft, x, y + h - lowerLeft.height);
        this.ctx.putImageData(compositedLowerRight, x + w - lowerRight.width, y + h - lowerRight.height);

        // draw title
        if (title !== undefined) {
            this.loader.getFont("large").drawText(this.ctx, <string>title, x + 8, y + 7, this.palette.white);
        }
    }

    public polyToColor(poly: number) {
        return this.palette.foreground; // TODO
    }

    public pan(x: number, y: number, val: number | null) {
        for (var i = -8; i <= 8; i++) {
            if (i === 0) {
                continue;
            } else if (val === null) {
                this.ctx.strokeStyle = this.palette.dark;
            } else if (Math.abs(i) === 1) {
                this.ctx.strokeStyle = "#ff9f00";
            } else if (val > 0 === i > 0 && Math.abs(val) >= Math.abs(i / 8)) {
                this.ctx.strokeStyle = this.palette.light;
            } else {
                this.ctx.strokeStyle = this.palette.dark;
            }
            var height = Math.floor(Math.abs(i) / 2 + 1.5);
            this.ctx.strokeRect(x + (i * 2) + (i > 0 ? 13 : 16) + 0.5, y + 5 - height, 0, height + 1);
        }
    }

    public waveform(x: number, y: number, width: number, color: string, checkWindow?: boolean) {
        this.ctx.fillStyle = color;
        if (this.chan.wave !== null) {
            this.ctx.fillStyle = this.palette.light;
            for (var i = 0; i < width; i++) {
                var val = Math.round(this.chan.wave(i / width) * 7.5);
                if (val >= 0) { val++; }
                this.ctx.fillRect(x + i + 1, y + 11, 1, -val);
            }
        }
    }

    public vuMeter(x: number, y: number, w: number, h: number, val: number) {
        for (var i = 0; i < h; i++) {
            this.ctx.fillStyle = val >= (h - i) / h ? this.palette.light : this.palette.dark;
            this.ctx.fillRect(x, y + i * 3, w + 1, 2);
        }
    }

    public drawChannel(idx: number, group?: string): void {
        var x = ((idx % 16) * 36) + 58;
        var y = (Math.floor(idx / 16) * 168) + 49;
        this.chan = this.song.channels[idx];
        if (group !== undefined) {
            this.drawDGroup(group, x, y);
        } else {
            this.drawAllGroupsWithName("channel", x, y);
        }
    }

    public drawAllGroupsWithName(name: string, x?: number, y?: number) {
        for (var gn in this.loader.drawGroups) {
            if (typeof gn === "string" && gn.substring(0, name.length) === name) {
                this.drawDGroup(gn, x, y);
            }
        }
    }

    public drawDObject(drawObj: DrawObject) {
        if (drawObj[0] === "nop" || drawObj[0] === "bounds") { return; }

        // evaluate the arguments according to some rules:
        // - if the argument is not a string, don't do anything to it
        // - if the argument starts with "$", eval the rest of it and
        //   set the arg to the result
        // - if the argument starts with "&", get the corresponding
        //   color from the current palette (this could have been done)
        //   with "$" and eval as above, but it's done often enough
        //   that this shortcut/optimization makes sense
        // - if the argument starts with a "#", interpret it as a hex
        //   code (the AssetLoader.canonicalizeHex function takes care
        //   of the codes later, making sure the formatting is correct,
        //   converting #F00 to #FF0000, etc.)
        var args: Array<string | number | boolean | undefined | null> = new Array(drawObj.length);
        var numbers = 0;
        for (var i = 0; i < drawObj.length; i++) {
            var arg = drawObj[i];
            if (typeof arg === "string" && arg.length > 0) {
                switch (arg.charAt(0)) {
                    case "$":
                        args[i] = eval(arg.substr(1));
                        break;
                    case "&":
                        var color = arg.substr(1);
                        args[i] = this.palette.hasOwnProperty(color) ? (<any>this.palette)[color] : drawObj[i];
                        break;
                    default:
                        args[i] = drawObj[i];
                        break;
                }
            } else if (numbers < 2 && typeof arg === "number") {
                args[i] = arg + (numbers === 0 ? this.offsetX : this.offsetY);
                numbers++;
            } else {
                args[i] = drawObj[i];
            }
        }

        // if the object type is "nop", completely disregard it; this is put
        // after the argument transformation so it can run code to determine
        // if the draw is a nop (e.g. don't draw the waveform on a drum channel)
        if (args[0] === "nop" || args[0] === "bounds") { return; }

        var func = (<any>this)[<string>(<any>args[0])];
        if (typeof func === "function") {
            func.apply(this, args.slice(1));
        } else {
            console.warn("unrecognized UI item ", args);
        }
    }

    public drawDGroup(group: DrawObject[] | string, offsetX?: number, offsetY?: number) {
        if (offsetX !== undefined && offsetY !== undefined) {
            this.offsetX = offsetX;
            this.offsetY = offsetY;
        }

        if (typeof group === "string") {
            group = this.loader.drawGroups[group];
        }

        for (var i = 0; i < group.length; i++) {
            this.drawDObject(group[i]);
        }

        // reset offsets
        if (this.offsetX !== 0 || this.offsetY !== 0) {
            this.offsetX = 0;
            this.offsetY = 0;
        }
    }

    public redraw(): void {
        for (var group in this.loader.drawGroups) {
            this.drawDGroup(group);
        }
        for (var idx = 0; idx < this.song.channels.length; idx++) {
            this.drawChannel(idx);
        }
    }

    public rebakeBounds(manifestURL?: string) {
        // channelButton won't render unless the channel is a drum channel
        // it doesn't matter that we're overwriting this as rebakeBounds
        // will redirect you to view the JSON anyway
        this.chan.drum = true;
        this.loader.rebakeBounds(this, manifestURL);
    }

    public autoRegion(name: string, autoRedraw: boolean = true, callback?: () => any, offsetX?: number, offsetY?: number): HitRegion {
        var group = this.loader.drawGroups[name];
        if (group === undefined) {
            console.error("no group named " + name);
        } else if (group.length === 0) {
            console.error("zero length DGroup");
        }
        var bounds = <BoundsMetadata>group[group.length - 1];
        if (bounds === undefined || bounds.length < 5 || bounds[0] !== "bounds") {
            console.error("incorrect bounds list ", bounds);
        }
        if (offsetX !== undefined && offsetY !== undefined) {
            var region = new HitRegion(bounds[1] + offsetX, bounds[2] + offsetY, bounds[3], bounds[4]);
        } else {
            var region = new HitRegion(bounds[1], bounds[2], bounds[3], bounds[4]);
        }
        if (autoRedraw) {
            var onMouseUp = (e: MouseEvent) => {
                this.drawDGroup(name, offsetX, offsetY);
                window.removeEventListener("mouseup", onMouseUp, false);
            }
            region.onmousedown.push((x: number, y: number) => {
                this.drawDGroup(name, offsetX, offsetY);
                if (callback !== undefined) {
                    callback();
                } else {
                    window.addEventListener("mouseup", onMouseUp, false);
                }
            });
        }
        this.hitDetector.addHitRegion(region, name);
        return region;
    }

    public renderFrame() {
        if (!this.continuouslyRender) { return; }
        if (this.song.playState === PlayState.PLAYING || this.song.playState === PlayState.FASTFORWARD) {
            var pn = (performance.now() / 1000);
            for (var i = 0; i < 32; i++) {
                var x = (Waveform.sine(pn + (i / 10)) + 1) * 0.505;
                this.chan = this.song.channels[i];
                this.chan.volume = x
                this.chan.expression = x
                this.chan.envelope = x
                this.chan.output = x;
                this.drawChannel(i, "channelVEN");
                //this.drawChannel(i, "channelFrequency");
                //this.drawChannel(i, "channelPoly");
            }
        }

        window.requestAnimationFrame(() => { this.renderFrame(); });
    }
}