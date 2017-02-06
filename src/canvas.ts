class CanvasRenderer {
    ctx: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;

    tempRegions: { [name: string]: HitRegion } | null;

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

    configOpen: boolean;

    constructor() {
        this.loader = new AssetLoader("assets/manifest.json");
        this.initialized = false;
        this.loadEvents = 2;
        this.scale = 1;

        this.tempRegions = null;

        this.paletteName = "default";
        this.palette = this.loader.palettes[this.paletteName];

        this.song = new Song();

        this.chan = this.song.channels[0];
        this.offsetX = 0;
        this.offsetY = 0;

        this.configOpen = false;

        window.addEventListener("load", () => {
            this.loadEvents--;
            this.initCanvas();
            this.rescale();
            if (this.loadEvents === 0) {
                //defer actual redraw so loading text has time to show up
                this.clear();
                this.ctx.fillStyle = this.palette.foreground;
                this.ctx.fillText("Loading...", this.canvas.width / 2, this.canvas.height / 2);
                window.setTimeout(() => { this.clear(); this.redraw(); }, 0);
            } else {
                this.ctx.fillText("Loading assets...", this.canvas.width / 2, this.canvas.height / 2);
            }
        }, false);

        this.loader.onload = () => {
            this.loadEvents--;
            this.switchPalette(Cookies.get("palette", "default"));
            if (this.loadEvents === 0) {
                this.clear();
                this.ctx.fillStyle = this.palette.foreground;
                this.ctx.fillText("Loading...", this.canvas.width / 2, this.canvas.height / 2);
                window.setTimeout(() => { this.clear(); this.redraw(); }, 0);
            }
        };
    }

    public switchPalette(name: string = "default", callback?: () => void): void {
        if (name !== this.paletteName) {
            Cookies.write("palette", name);
            if (this.configOpen) {
                this.closeConfig();
                this.switchPalette(name, () => { this.openConfig(); });
            } else if (this.initialized) {
                var olddata = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                this.clear();
                this.ctx.fillStyle = this.palette.foreground;
                this.ctx.fillText("Loading...", this.canvas.width / 2, this.canvas.height / 2);
                // have a frame render with the "Loading..." text before switching
                window.setTimeout(() => {
                    if (olddata != null) {
                        let newdata = new ImageData(olddata.width, olddata.height);
                        AssetLoader.composite(newdata.data, olddata.data, olddata.data, this.palette, this.loader.palettes[name]);
                        this.ctx.putImageData(newdata, 0, 0);
                    }
                    this.loader.switchPalette(this.paletteName, name);
                    this.palette = this.loader.palettes[name];
                    this.paletteName = name;
                    document.body.style.backgroundColor = this.palette.background;
                    if (olddata == null && this.initialized) {
                        this.clear();
                        this.redraw();
                    }
                    if (callback != null) {
                        callback();
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
        window.addEventListener("resize", () => { ui.rescale(); }, false);
        this.canvas = <HTMLCanvasElement>document.getElementById("content");
        this.canvas.width = 634;
        this.canvas.height = 444;

        var newCtx = this.canvas.getContext("2d");
        if (newCtx == null) {
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

        // add hit regions for each channel
        for (var i = 0; i < this.song.channels.length; i++) {
            this.initChannelHitbox(i);
        }
        this.initPositionHitbox();
        this.initButtons();
        this.initLink();
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

    public drawButton(x: number, y: number, w: number, h: number, pressed: boolean = false): void {
        this.ctx.strokeStyle = pressed ? this.palette.background : this.palette.light;
        this.ctx.strokeRect(x + 1.5, y + 1.5, w - 2, h - 2);
        this.ctx.strokeStyle = pressed ? this.palette.light : this.palette.foreground;
        this.ctx.strokeRect(x + 2.5, y + 2.5, w - 3, h - 3);
        this.ctx.fillStyle = this.palette.dark;
        this.ctx.fillRect(x + 2, y + 2, w - 3, h - 3);
        this.ctx.strokeStyle = this.palette.foreground;
        this.ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    }

    public drawFilledRect(x: number, y: number, w: number, h: number, color: string) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, w, h);
    }

    public drawImage(image: string, x: number, y: number) {
        this.ctx.putImageData(this.loader.getImage(image), x, y);
    }

    public drawLine(x1: number, y1: number, x2: number, y2: number, color: string) {
        x1 += this.offsetX;
        y1 += this.offsetY;
        x2 += this.offsetX;
        y2 += this.offsetY;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x1 + 0.5, y1 + 0.5);
        this.ctx.lineTo(x2 + 0.5, y2 + 0.5);
        this.ctx.stroke();
    }

    public drawPbar(value: number, x: number, y: number, w: number, h: number, color: string) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, Math.round(w * value), h);
    }

    public drawTextRTL(size: "small" | "medium" | "large", text: string, x: number, y: number, color: string, spaceWidth?: number) {
        if (spaceWidth === undefined) {
            this.loader.getFont(size).drawTextRTL(this.ctx, text, x, y, color);
        } else {
            this.loader.getFont(size).spaceWidth = spaceWidth;
            this.loader.getFont(size).drawTextRTL(this.ctx, text, x, y, color);
            this.loader.getFont(size).spaceWidth = 1;
        }
    }

    public drawStrokeRect(x: number, y: number, w: number, h: number, color: string) {
        this.ctx.strokeStyle = color;
        this.ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    }

    public drawText(size: "small" | "medium" | "large", text: string, x: number, y: number, color: string) {
        this.loader.getFont(size).drawText(this.ctx, text, x, y, color);
    }

    public drawWindow(x: number, y: number, w: number, h: number, title?: string) {
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
            this.loader.getFont("large").drawText(this.ctx, title, x + 8, y + 7, this.palette.white);
        }
    }

    public polyToColor(poly: number) {
        return this.palette.foreground; // TODO
    }

    public drawPan(x: number, y: number, val: number | null) {
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

    public drawWaveform(x: number, y: number, width: number, color: string) {
        this.ctx.fillStyle = color;
        if (this.chan.drum) {
            this.drawDGroup("channelButton");
        } else if (this.chan.wave !== null) {
            this.ctx.fillStyle = this.palette.light;
            for (var i = 0; i < width; i++) {
                var val = Math.round(this.chan.wave(i / width) * 7.5);
                if (val >= 0) { val++; }
                this.ctx.fillRect(x + i + 1, y + 11, 1, -val);
            }
        }
    }

    public drawVuMeter(x: number, y: number, w: number, h: number, val: number) {
        for (var i = 0; i < h; i++) {
            this.ctx.fillStyle = val >= (h - i) / h ? this.palette.light : this.palette.dark;
            this.ctx.fillRect(x, y + i * 3, w + 1, 2);
        }
    }

    public initChannelHitbox(idx: number): void {
        var x = ((idx % 16) * 36) + 58;
        var y = (Math.floor(idx / 16) * 168) + 49;

        var region = new HitRegion(x, y, 33, 13);
        region.onmousedown = (x: number, y: number) => {
            this.song.channels[idx].mute = !this.song.channels[idx].mute;
            this.drawChannel(idx, "channelMutePoly");
        };
        this.hitDetector.addHitRegion(region, "chan" + idx);
    }

    public initPositionHitbox(): void {
        var slider = new HitRegion(58, 402, 236, 16);
        slider.cursor = "ew-resize";
        var slideEvent = (e: MouseEvent) => {
            window.removeEventListener("mousemove", moveSlider, false);
            window.removeEventListener("mouseup", slideEvent, false);
        };
        var moveSlider = <EventListener>(e: MouseEvent) => {
            this.song.position = Math.min(1, Math.max(0, (e.offsetX / this.scale - 57) / 236));
            this.drawDGroup("positionSlider");
        };
        slider.onmousedown = (x: number, y: number) => {
            this.song.position = Math.min(1, Math.max(0, (x - 57) / 236));
            this.drawDGroup("positionSlider");
            window.addEventListener("mousemove", moveSlider, false);
            window.addEventListener("mouseup", slideEvent, false);
        };
        this.hitDetector.addHitRegion(slider, "positionSlider");
    }

    public initButtons(): void {
        var loop = new HitRegion(300, 402, 20, 17);
        var mouseup = <EventListener>(e: Event) => {
            this.drawDGroup("repeat");
            window.removeEventListener("mouseup", mouseup, false);
        };
        loop.onmousedown = (x: number, y: number) => {
            this.drawDGroup("repeat");
            window.addEventListener("mouseup", mouseup, false);
        };
        loop.onmouseup = (x: number, y: number) => {
            this.song.repeat = !this.song.repeat;
            Cookies.write("loop", this.song.repeat ? "true" : "false");
            this.drawDGroup("repeat");
        };
        this.hitDetector.addHitRegion(loop, "loop");

        var createRegion = (x: number, y: number, w: number, h: number, name: string, callback?: () => boolean) => {
            var r = new HitRegion(x, y, w, h);
            var el = (e: MouseEvent) => {
                this.drawDGroup(name + "Button");
                window.removeEventListener("mouseup", el, false);
            };
            r.onmousedown = () => {
                this.drawDGroup(name + "Button");
                if (callback == null || !callback()) {
                    window.addEventListener("mouseup", el, false);
                }
            };
            this.hitDetector.addHitRegion(r, name);
        }

        createRegion(132, 19, 34, 22, "play");
        createRegion(172, 19, 34, 22, "fastforward");
        createRegion(212, 19, 34, 22, "stop");
        createRegion(252, 19, 34, 22, "pause");
        createRegion(292, 19, 34, 22, "export");
        createRegion(332, 19, 34, 22, "config", () => { return this.openConfig(); });
    }

    public initLink(): void {
        var link = new HitRegion(164, 435, 183, 10);
        link.cursor = "pointer";
        link.onmousedown = () => {
            window.location.assign("https://github.com/milkey-mouse/JSSCC");
        }
        link.onenter = () => { this.drawDGroup("githubLinkSelected"); };
        link.onexit = () => { this.drawDGroup("githubLinkDeselected") };
        this.hitDetector.addHitRegion(link, "link");
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
        if (drawObj[0] === "bounds") {
            // bounds objects do not need to be rendered
            // they are essentially metadata for the occlusion
            return;
        }
        var args: Array<string | number | boolean | undefined | null> = drawObj.slice(1);
        var numbers = 0;
        for (var i = 0; i < args.length; i++) {
            var arg = args[i];
            if (typeof arg === "string" && arg.length > 0) {
                switch (arg.charAt(0)) {
                    case "$":
                        args[i] = eval(arg.substr(1));
                        break;
                    case "&":
                        var color = arg.substr(1);
                        if (this.palette.hasOwnProperty(color)) {
                            args[i] = (<any>this.palette)[color];
                        }
                        break;
                }
            } else if (typeof arg === "number" && numbers < 2) {
                // we have to cast args[i] to a number because even though it
                // must be a number the type checker doesn't realize it
                args[i] = <number>(args[i]) + (numbers === 0 ? this.offsetX : this.offsetY);
                numbers++;
            }
        }
        // we need to convert the name from lowerCamelCase to UpperCamelCase
        // to put "draw" before it, but otherwise the DObject types have a
        // one-to-one mapping with the draw functions above
        var func = (<any>this)["draw" + drawObj[0].charAt(0).toUpperCase() + drawObj[0].substring(1)];
        if (func !== undefined) {
            func.apply(this, args);
        } else {
            console.warn("unrecognized UI item: " + drawObj);
        }
    }

    public drawDGroup(group: DrawObject[] | string, offsetX?: number, offsetY?: number, checkWindow: boolean = this.configOpen) {
        if (offsetX !== undefined && offsetY !== undefined) {
            this.offsetX = offsetX;
            this.offsetY = offsetY;
        }

        // unlike all other groups, the config window can occlude other objects
        // therefore if it is open on a redraw we must redraw the window as well
        var redrawPreferencesWindow = false;
        if (typeof group === "string") {
            if (checkWindow) {
                redrawPreferencesWindow = (group.substring(0, 11) !== "preferences");
            }
            group = this.loader.drawGroups[group];
        } else if (checkWindow) {
            // drawDGroup isn't ever called with DrawObject[] instead of string currently
            // but let's still handle that case, albeit in a slower way, for completeness

            // if the group is one of the preferences window groups, skip the redraw
            redrawPreferencesWindow = true;
            for (var gn in this.loader.drawGroups) {
                if (typeof gn === "string" && gn.substring(0, 11) === "preferences") {
                    if (JSON.stringify(group) === JSON.stringify(this.loader.drawGroups[gn])) {
                        redrawPreferencesWindow = false;
                        break;
                    }
                }
            }
        }

        var windowGroup = this.loader.drawGroups["preferencesWindow"];
        var windowBounds = <number[]>windowGroup[windowGroup.length - 1].slice(1);
        var windowX = (this.canvas.width - windowBounds[2]) / 2;
        var windowY = (this.canvas.height - windowBounds[3]) / 2;

        if (redrawPreferencesWindow && group[group.length - 1][0] === "bounds") {
            // get cached bounds from manifest.json
            var bounds = <number[]>group[group.length - 1].slice(1);
            bounds[0] += this.offsetX;
            bounds[1] += this.offsetY;

            // reset the DGroup's area to the background color
            this.ctx.fillStyle = this.palette.background;
            this.ctx.fillRect(bounds[0], bounds[1], bounds[2], bounds[3]);

            // draw the group's objects
            for (var i = 0; i < group.length; i++) {
                this.drawDObject(group[i]);
            }

            // draw the semi-transparent overlay
            this.ctx.fillStyle = "rgba(1, 1, 1, 0.75)";
            this.ctx.fillRect(bounds[0], bounds[1], bounds[2], bounds[3]);

            // and now for something completely different:
            // if the bounds are entirely outside those of all config window bounds,
            // we'll skip the redraw entirely because its pixels were never affected
            windowBounds[0] += windowX;
            windowBounds[1] += windowY;

            // this code sets redrawPreferencesWindow to false if the rectangles are
            // not intersecting (see https://stackoverflow.com/a/2752387)
            redrawPreferencesWindow = !(windowBounds[0] > (bounds[0] + bounds[2]) ||
                (windowBounds[0] + windowBounds[2]) < bounds[0] ||
                windowBounds[1] > (bounds[1] + bounds[3]) ||
                (windowBounds[1] + windowBounds[3]) < bounds[1]);
        } else {
            if (redrawPreferencesWindow) { console.warn("no bounds for group"); }
            for (var i = 0; i < group.length; i++) {
                this.drawDObject(group[i]);
            }
        }

        if (this.offsetX !== 0 || this.offsetY !== 0) {
            this.offsetX = 0;
            this.offsetY = 0;
        }

        if (redrawPreferencesWindow) {
            this.drawAllGroupsWithName("preferences", windowX, windowY);
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

    public openConfig(): boolean {
        this.configOpen = true;
        this.tempRegions = this.hitDetector.regions;
        this.hitDetector.regions = {};
        this.ctx.fillStyle = "rgba(1, 1, 1, 0.75)";
        var newBG = AssetLoader.hexToRgb(this.palette.background);
        if (newBG === null) { return false; }
        newBG.r = Math.round(newBG.r * 0.25);
        newBG.g = Math.round(newBG.g * 0.25);
        newBG.b = Math.round(newBG.b * 0.25);
        document.body.style.backgroundColor = AssetLoader.colorToHex(newBG);
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        var windowWidth = 200;
        var windowHeight = 250;
        this.initConfig(windowWidth, windowHeight);
        this.drawConfig(windowWidth, windowHeight);
        return true;
    }

    public initConfig(width: number, height: number): void {
        var close = new HitRegion((this.canvas.width + width) / 2 - 23, (this.canvas.height - height) / 2 + 5, 16, 15);
        close.onmousedown = () => { this.closeConfig(); };
        this.hitDetector.addHitRegion(close, "close");

        var windowX = (this.canvas.width - width) / 2;
        var windowY = (this.canvas.height - height) / 2;

        var paletteTextBox = new HitRegion(windowX + width * 0.4 - 1, windowY + 33, width * 0.6 - 29, 16);
        paletteTextBox.onmousedown = () => {
            this.drawButton(windowX + width - 28, windowY + 33, 16, 16, true);
            this.ctx.putImageData(this.loader.getImage("dropdown"), 396, 138);
            window.setTimeout(() => {
                this.drawButton(windowX + width - 28, windowY + 33, 16, 16, false);
                this.ctx.putImageData(this.loader.getImage("dropdown"), 395, 137);
            }, 100);
        };
        this.hitDetector.addHitRegion(paletteTextBox, "paletteTB");

        var paletteButton = new HitRegion(windowX + width - 29, windowY + 33, 16, 16);
        var mouseUp = () => {
            this.drawDGroup("preferencesDropDown", windowX, windowY);
            window.removeEventListener("mouseup", mouseUp);
        };
        paletteButton.onmousedown = () => {
            this.drawDGroup("preferencesDropDown", windowX, windowY);
            window.addEventListener("mouseup", mouseUp, false);
        };
        this.hitDetector.addHitRegion(paletteButton, "paletteDD");
    }

    public drawConfig(width: number, height: number): void {
        var windowX = (this.canvas.width - width) / 2;
        var windowY = (this.canvas.height - height) / 2;
        this.drawAllGroupsWithName("preferences", windowX, windowY);
    }

    public closeConfig(): void {
        this.configOpen = false;

        if (this.tempRegions !== null) {
            this.hitDetector.regions = this.tempRegions;
            this.tempRegions = null;
        } else {
            console.warn("there were no tempRegions to restore from; this should never happen!");
        }
        this.redraw();
        document.body.style.backgroundColor = this.palette.background;

        // the next update for the mouseovers won't run until after this
        // stuff is drawn, so we have to set the mouseover state manually
        this.hitDetector.regions["config"].over = false;
        this.drawDGroup("configButton");
    }

    public rebakeBounds(manifestURL?: string) {
        this.loader.rebakeBounds(this, manifestURL);
    }
}