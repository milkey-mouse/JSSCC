class CanvasRenderer {
    ctx: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;

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

    framesDrawn: number;
    drawStartTime: number;

    constructor() {
        this.loader = new AssetLoader("assets/manifest.json");
        this.initialized = false;
        this.loadEvents = 2;
        this.scale = 1;

        this.paletteName = "default";
        this.palette = this.loader.palettes[this.paletteName];

        this.song = new Song();

        this.chan = this.song.channels[0];
        this.offsetX = 0;
        this.offsetY = 0;

        this.configOpen = false;

        this.framesDrawn = 0;
        this.drawStartTime = 0;

        window.addEventListener("load", () => {
            this.loadEvents--;
            this.initCanvas();
            this.rescale();
            if (this.loadEvents === 0) {
                //defer actual redraw so loading text has time to show up
                this.clear();
                this.ctx.fillStyle = this.palette.foreground;
                this.ctx.fillText("Loading...", this.canvas.width / 2, this.canvas.height / 2);
                window.setTimeout(() => {
                    for (var i = 0; i < this.song.channels.length; i++) {
                        this.initChannelHitbox(i);
                    }

                    this.initPositionHitbox();
                    this.initButtons();
                    this.initLink();

                    this.clear();
                    this.redraw();
                    this.renderFrame();
                }, 5);
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
                window.setTimeout(() => {
                    for (var i = 0; i < this.song.channels.length; i++) {
                        this.initChannelHitbox(i);
                    }

                    this.initPositionHitbox();
                    this.initButtons();
                    this.initLink();

                    this.clear();
                    this.redraw();
                    this.renderFrame();
                }, 5);
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
                    if (callback !== undefined) {
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
        Object.keys(this.palette).join("\n");
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

    public drawStrokeRect(x: number, y: number, w: number, h: number, color: string) {
        this.ctx.strokeStyle = color;
        this.ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    }

    public drawText(size: "small" | "medium" | "large", text: string, x: number, y: number, color: string, rtl?: boolean, spaceWidth?: number) {
        var font = this.loader.getFont(size);
        if (spaceWidth === undefined) {
            this.loader.getFont(size).drawText(this.ctx, text, x, y, color, rtl);
        } else {
            font.spaceWidth = spaceWidth;
            font.drawText(this.ctx, text, x, y, color, rtl);
            font.spaceWidth = 1;
        }
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
            this.loader.getFont("large").drawText(this.ctx, <string>title, x + 8, y + 7, this.palette.white);
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

    public drawWaveform(x: number, y: number, width: number, color: string, checkWindow?: boolean) {
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

    public drawVuMeter(x: number, y: number, w: number, h: number, val: number) {
        for (var i = 0; i < h; i++) {
            this.ctx.fillStyle = val >= (h - i) / h ? this.palette.light : this.palette.dark;
            this.ctx.fillRect(x, y + i * 3, w + 1, 2);
        }
    }

    public initChannelHitbox(idx: number): void {
        var x = ((idx % 16) * 36) + 58;
        var y = (Math.floor(idx / 16) * 168) + 49;

        var region = this.autoRegion("channelMute");
        region.onmousedown.push((x: number, y: number) => {
            this.song.channels[idx].mute = !this.song.channels[idx].mute;
            this.drawChannel(idx, "channelMute");
            this.song.channels[idx].volume = 0;
            this.song.channels[idx].expression = 0;
            this.song.channels[idx].envelope = 0;
            this.song.channels[idx].output = 0;
            this.drawChannel(idx, "channelVEN");
        });
        this.hitDetector.addHitRegion(region, "chan" + idx);
    }

    public initPositionHitbox(): void {
        var slider = this.autoRegion("positionSlider");
        slider.cursor = "ew-resize";
        var slideEvent = (e: MouseEvent) => {
            window.removeEventListener("mousemove", moveSlider, false);
            window.removeEventListener("mouseup", slideEvent, false);
        };
        var moveSlider = <EventListener>(e: MouseEvent) => {
            this.song.position = Math.min(1, Math.max(0, (e.offsetX / this.scale - 57) / 236));
            this.drawDGroup("positionSlider");
        };
        slider.onmousedown.push((x: number, y: number) => {
            this.song.position = Math.min(1, Math.max(0, (x - 57) / 236));
            this.drawDGroup("positionSlider");
            window.addEventListener("mousemove", moveSlider, false);
            window.addEventListener("mouseup", slideEvent, false);
        });
        this.hitDetector.addHitRegion(slider, "positionSlider");
    }

    public initButtons(): void {
        var repeat = this.autoRegion("repeat");
        repeat.onmouseup.push((x: number, y: number) => {
            this.song.repeat = !this.song.repeat;
            Cookies.write("loop", this.song.repeat ? "true" : "false");
        });

        this.autoRegion("play").onmouseup.push((x: number, y: number) => {
            this.framesDrawn = 0;
            this.drawStartTime = performance.now();
            this.song.playState = PlayState.PLAYING;
        });
        this.autoRegion("fastForward").onmouseup.push((x: number, y: number) => {
            this.framesDrawn = 0;
            this.drawStartTime = performance.now();
            this.song.playState = PlayState.FASTFORWARD;
        });
        this.autoRegion("stop").onmouseup.push((x: number, y: number) => {
            this.song.playState = PlayState.STOPPED;
        });
        this.autoRegion("pause").onmouseup.push((x: number, y: number) => {
            this.song.playState = PlayState.PAUSED;
        });
        this.autoRegion("config", true, () => { this.openConfig(); });
        this.autoRegion("export");
    }

    public initLink(): void {
        var link = this.autoRegion("githubLink", false);
        link.onmousedown.push(() => {
            window.location.assign("https://github.com/milkey-mouse/JSSCC");
        });
        link.onenter.push(() => {
            this.drawDGroup("githubLink");
        });
        link.onexit.push(() => {
            this.drawDGroup("githubLink");
        });
    }

    public drawChannel(idx: number, group?: string, checkWindow?: boolean): void {
        var x = ((idx % 16) * 36) + 58;
        var y = (Math.floor(idx / 16) * 168) + 49;
        this.chan = this.song.channels[idx];
        if (group !== undefined) {
            this.drawDGroup(group, x, y, checkWindow);
        } else {
            this.drawAllGroupsWithName("channel", x, y, checkWindow);
        }
    }

    public drawAllGroupsWithName(name: string, x?: number, y?: number, checkWindow?: boolean) {
        for (var gn in this.loader.drawGroups) {
            if (typeof gn === "string" && gn.substring(0, name.length) === name) {
                this.drawDGroup(gn, x, y, checkWindow);
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

        // we need to convert the name from lowerCamelCase to UpperCamelCase
        // to put "draw" before it, but otherwise the DObject types have a
        // one-to-one mapping with the draw functions above
        var func = (<any>this)["draw" + <string>(<any>args[0]).charAt(0).toUpperCase() + <string>(<any>args[0]).substring(1)];
        if (typeof func === "function") {
            func.apply(this, args.slice(1));
        } else {
            console.warn("unrecognized UI item ", args);
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
            if (checkWindow) { redrawPreferencesWindow = (group.substring(0, 11) !== "preferences"); }
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

        var windowGroup: DrawObject[];
        var windowBounds: number[];
        var windowX: number;
        var windowY: number;

        if (redrawPreferencesWindow) {
            windowGroup = this.loader.drawGroups["preferencesWindow"];
            windowBounds = <number[]>windowGroup[windowGroup.length - 1].slice(1);
            windowX = (this.canvas.width - windowBounds[2]) / 2;
            windowY = (this.canvas.height - windowBounds[3]) / 2;

            if (group[group.length - 1][0] === "bounds") {
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
                    windowBounds[0] + windowBounds[2] < bounds[0] ||
                    windowBounds[1] > bounds[1] + bounds[3] ||
                    windowBounds[1] + windowBounds[3] < bounds[1]);

                // if they are 100% intersecting (i.e. one is inside the other), skip
                // drawing the inside object entirely
                if (redrawPreferencesWindow) {
                    redrawPreferencesWindow = bounds[0] < windowBounds[0] ||
                        bounds[1] < windowBounds[1] ||
                        bounds[0] + bounds[2] > windowBounds[0] + windowBounds[2] ||
                        bounds[1] + bounds[3] > windowBounds[1] + windowBounds[3];
                }
            } else {
                console.warn("no bounds for group", group);
            }

            // reset offsets
            if (this.offsetX !== 0 || this.offsetY !== 0) {
                this.offsetX = 0;
                this.offsetY = 0;
            }

            this.drawAllGroupsWithName("preferences", windowX, windowY);
        } else {
            for (var i = 0; i < group.length; i++) {
                this.drawDObject(group[i]);
            }

            // reset offsets
            if (this.offsetX !== 0 || this.offsetY !== 0) {
                this.offsetX = 0;
                this.offsetY = 0;
            }
        }
    }

    public redraw(): void {
        // we don't need to redraw the window after every group
        // so disable the check until the very end (once)
        //this.drawDGroup("clear", undefined, undefined, false);
        for (var group in this.loader.drawGroups) {
            this.drawDGroup(group, undefined, undefined, false);
        }
        for (var idx = 0; idx < this.song.channels.length; idx++) {
            this.drawChannel(idx, undefined, false);
        }
        if (this.configOpen) {
            this.ctx.fillStyle = "rgba(1, 1, 1, 0.75)";
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.drawConfig();
        }
    }

    public openConfig() {
        this.configOpen = true;
        this.hitDetector.switchNamespace("window");
        this.ctx.fillStyle = "rgba(1, 1, 1, 0.75)";
        var newBG = AssetLoader.hexToRgb(this.palette.background);
        if (newBG === null) { return; }
        newBG.r = Math.round(newBG.r * 0.25);
        newBG.g = Math.round(newBG.g * 0.25);
        newBG.b = Math.round(newBG.b * 0.25);
        document.body.style.backgroundColor = AssetLoader.colorToHex(newBG);
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.initConfig();
        this.drawConfig();
    }

    public initConfig(): void {
        var windowGroup = this.loader.drawGroups["preferencesWindow"];
        var windowBounds = <number[]>windowGroup[windowGroup.length - 1].slice(1);
        var width = windowBounds[2];
        var height = windowBounds[3];

        var windowX = (this.canvas.width - width) / 2;
        var windowY = (this.canvas.height - height) / 2;

        var close = new HitRegion((this.canvas.width + width) / 2 - 23, windowY + 5, 16, 15);
        close.onmousedown.push(() => { this.closeConfig(); });
        this.hitDetector.addHitRegion(close, "close");

        this.autoRegion("preferencesColorPalette", true, undefined, windowX, windowY);
    }

    public drawConfig(): void {
        var windowGroup = this.loader.drawGroups["preferencesWindow"];
        var windowBounds = <number[]>windowGroup[windowGroup.length - 1].slice(1);
        var windowX = (this.canvas.width - windowBounds[2]) / 2;
        var windowY = (this.canvas.height - windowBounds[3]) / 2;
        this.drawAllGroupsWithName("preferences", windowX, windowY);
    }

    public closeConfig(): void {
        this.configOpen = false;

        this.hitDetector.switchNamespace("default");
        this.redraw();
        document.body.style.backgroundColor = this.palette.background;

        // the next update for the mouseovers won't run until after this
        // stuff is drawn, so we have to set the mouseover state manually
        this.hitDetector.onMouseMove(<MouseEvent>{ offsetX: 0, offsetY: 0 });
        this.drawDGroup("config");
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
        var region = new HitRegion(bounds[1], bounds[2], bounds[3], bounds[4]);
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
                this.drawChannel(i, "channelPoly");
            }

            if (this.framesDrawn++ % 30 === 0) {
                console.log((this.framesDrawn / (performance.now() - this.drawStartTime) * 1000) + " fps");
            }
        }

        window.requestAnimationFrame(() => { this.renderFrame(); });
    }
}