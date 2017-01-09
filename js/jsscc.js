var CanvasRenderer = (function () {
    function CanvasRenderer() {
        var _this = this;
        this.loader = new AssetLoader("assets/manifest.json");
        this.initialized = false;
        this.loadEvents = 2;
        this.scale = 1;
        this.tempRegions = null;
        this.tempData = null;
        this.paletteName = "default";
        this.palette = this.loader.palettes[this.paletteName];
        this.song = new Song();
        this.configOpen = false;
        window.addEventListener("load", function () {
            _this.loadEvents--;
            _this.initCanvas();
            _this.rescale();
            if (_this.loadEvents === 0) {
                //defer actual redraw so loading text has time to show up
                _this.clear();
                _this.ctx.fillStyle = _this.palette.foreground;
                _this.ctx.fillText("Loading...", _this.canvas.width / 2, _this.canvas.height / 2);
                window.setTimeout(function () { _this.clear(); _this.redraw(); }, 0);
            }
            else {
                _this.ctx.fillText("Loading assets...", _this.canvas.width / 2, _this.canvas.height / 2);
            }
        }, false);
        this.loader.onload = function () {
            _this.loadEvents--;
            _this.switchPalette(Cookies.get("palette", "default"));
            if (_this.loadEvents === 0) {
                _this.clear();
                _this.ctx.fillStyle = _this.palette.foreground;
                _this.ctx.fillText("Loading...", _this.canvas.width / 2, _this.canvas.height / 2);
                window.setTimeout(function () { _this.clear(); _this.redraw(); }, 0);
            }
        };
    }
    CanvasRenderer.prototype.switchPalette = function (name, callback) {
        var _this = this;
        if (name === void 0) { name = "default"; }
        if (name !== this.paletteName) {
            Cookies.write("palette", name);
            if (this.configOpen) {
                this.closeConfig();
                this.switchPalette(name, function () { _this.openConfig(); });
            }
            else if (this.initialized) {
                var olddata = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                this.clear();
                this.ctx.fillStyle = this.palette.foreground;
                this.ctx.fillText("Loading...", this.canvas.width / 2, this.canvas.height / 2);
                // have a frame render with the "Loading..." text before switching
                window.setTimeout(function () {
                    if (olddata != null) {
                        var newdata = new ImageData(olddata.width, olddata.height);
                        AssetLoader.composite(newdata.data, olddata.data, olddata.data, _this.palette, _this.loader.palettes[name]);
                        _this.ctx.putImageData(newdata, 0, 0);
                    }
                    _this.loader.switchPalette(_this.paletteName, name);
                    _this.palette = _this.loader.palettes[name];
                    _this.paletteName = name;
                    document.body.style.backgroundColor = _this.palette.background;
                    if (olddata == null && _this.initialized) {
                        _this.clear();
                        _this.redraw();
                    }
                    if (callback != null) {
                        callback();
                    }
                }, 0);
            }
            else {
                this.loader.switchPalette(this.paletteName, name);
                this.palette = this.loader.palettes[name];
                this.paletteName = name;
                document.body.style.backgroundColor = this.palette.background;
            }
        }
    };
    CanvasRenderer.prototype.initCanvas = function () {
        if (this.initialized) {
            return;
        }
        document.body.style.backgroundColor = this.palette.background;
        window.addEventListener("resize", function () { ui.rescale(); }, false);
        this.canvas = document.getElementById("content");
        this.canvas.width = 634;
        this.canvas.height = 444;
        var newCtx = this.canvas.getContext("2d");
        if (newCtx == null) {
            console.error("couldn't get 2d context for main canvas");
            return;
        }
        this.ctx = newCtx;
        this.ctx.textBaseline = "middle";
        this.ctx.textAlign = "center";
        this.ctx.font = "25px monospace";
        this.initialized = true;
        this.rescale();
        this.clear();
        this.hitDetector = new HitDetector(this.ctx);
        // add hit regions for each channel
        for (var i = 0; i < this.song.channels.length; i++) {
            this.initChannelHitbox(i);
        }
        this.initPositionHitbox();
        this.initButtons();
        this.initLink();
    };
    CanvasRenderer.prototype.rescale = function () {
        if (!this.initialized) {
            return;
        }
        var width = window.innerWidth / this.canvas.width;
        var height = window.innerHeight / this.canvas.height;
        this.scale = Math.max(1, Math.floor(Math.min(width, height)));
        this.ctx.canvas.style.height = (this.ctx.canvas.height * this.scale) + "px";
        this.ctx.canvas.style.width = (this.ctx.canvas.width * this.scale) + "px";
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    };
    CanvasRenderer.prototype.clear = function () {
        if (!this.initialized) {
            return;
        }
        this.ctx.fillStyle = this.palette.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    };
    CanvasRenderer.prototype.drawTexture = function (x, y, w, h) {
        this.ctx.fillStyle = this.palette.dark;
        var checkered = this.ctx.createImageData(1, h);
        var d = checkered.data;
        var dark = AssetLoader.hexToRgb(this.palette.dark);
        var bg = AssetLoader.hexToRgb(this.palette.background);
        if (dark === null || bg === null) {
            console.error("couldn't parse palette colors when drawing texture");
            return;
        }
        for (var i = 0; i < checkered.data.length; i += 8) {
            d[i] = bg.r;
            d[i + 1] = bg.g;
            d[i + 2] = bg.b;
            d[i + 3] = 255;
            d[i + 4] = dark.r;
            d[i + 5] = dark.g;
            d[i + 6] = dark.b;
            d[i + 7] = 255;
        }
        for (var i = 0; i + 4 <= w; i += 4) {
            this.ctx.putImageData(checkered, x + i, y);
            this.ctx.fillRect(x + i + 1, y, 2, h);
        }
    };
    CanvasRenderer.prototype.drawButton = function (x, y, w, h, pressed) {
        if (pressed === void 0) { pressed = false; }
        this.ctx.strokeStyle = pressed ? this.palette.background : this.palette.light;
        this.ctx.strokeRect(x + 1.5, y + 1.5, w - 2, h - 2);
        this.ctx.strokeStyle = pressed ? this.palette.light : this.palette.foreground;
        this.ctx.strokeRect(x + 2.5, y + 2.5, w - 3, h - 3);
        this.ctx.fillStyle = this.palette.dark;
        this.ctx.fillRect(x + 2, y + 2, w - 3, h - 3);
        this.ctx.strokeStyle = this.palette.foreground;
        this.ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    };
    CanvasRenderer.prototype.drawWindow = function (x, y, w, h, title) {
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
        //draw main window surface
        this.ctx.fillStyle = this.palette.background;
        this.ctx.fillRect(x, y, w, h);
        //draw left edge
        for (var i = 0; i < upperLeft.width; i++) {
            var dataIdx = ((upperLeft.height - 1) * upperLeft.width + i) * 4;
            this.ctx.strokeStyle = AssetLoader.rgbToHex(upperLeft.data[dataIdx], upperLeft.data[dataIdx + 1], upperLeft.data[dataIdx + 2]);
            this.ctx.beginPath();
            this.ctx.moveTo(x + i + 0.5, y + 0.5);
            this.ctx.lineTo(x + i + 0.5, y + h - 0.5);
            this.ctx.stroke();
        }
        //draw right edge
        for (var i = 0; i < upperRight.width; i++) {
            var dataIdx = ((upperRight.height - 1) * upperRight.width + i) * 4;
            this.ctx.strokeStyle = AssetLoader.rgbToHex(upperRight.data[dataIdx], upperRight.data[dataIdx + 1], upperRight.data[dataIdx + 2]);
            this.ctx.beginPath();
            this.ctx.moveTo(x + w - upperRight.width + i + 0.5, y + 0.5);
            this.ctx.lineTo(x + w - upperRight.width + i + 0.5, y + h - 0.5);
            this.ctx.stroke();
        }
        //draw top edge
        for (var i = 0; i < upperLeft.height; i++) {
            var dataIdx = (upperLeft.width * i + (upperLeft.width - 1)) * 4;
            this.ctx.strokeStyle = AssetLoader.rgbToHex(upperLeft.data[dataIdx], upperLeft.data[dataIdx + 1], upperLeft.data[dataIdx + 2]);
            this.ctx.beginPath();
            this.ctx.moveTo(x + 0.5, y + i + 0.5);
            this.ctx.lineTo(x + w - 0.5, y + i + 0.5);
            this.ctx.stroke();
        }
        //draw bottom edge
        for (var i = 0; i < lowerLeft.height; i++) {
            var dataIdx = (lowerLeft.width * i + (lowerLeft.width - 1)) * 4;
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
        //draw title
        if (title !== undefined) {
            this.loader.getFont("large").drawText(this.ctx, title, x + 8, y + 7, this.palette.white);
        }
    };
    CanvasRenderer.prototype.drawLogos = function () {
        this.ctx.putImageData(this.loader.getImage("logo"), 15, 10);
        this.ctx.putImageData(this.loader.getImage("sparkles"), 424, 4);
        this.drawTexture(358, 410, 64, 32);
        this.ctx.putImageData(this.loader.getImage("midi"), 436, 412);
        this.ctx.putImageData(this.loader.getImage("gs"), 482, 413);
        this.ctx.putImageData(this.loader.getImage("xg"), 525, 413);
        this.ctx.putImageData(this.loader.getImage("scc"), 575, 413);
        var medium = this.loader.getFont("medium");
        medium.drawText(this.ctx, "Alpha v. 0.0.1", 39, 39, this.palette.white);
        medium.drawText(this.ctx, "(C) 2016 meme.institute + Milkey Mouse", 453, 4, this.palette.dark); //drop shadow
        medium.drawText(this.ctx, "(C) 2016 meme.institute + Milkey Mouse", 452, 3, this.palette.white);
        medium.drawText(this.ctx, "Inspired by Gashisoft GXSCC", 500, 14, this.palette.dark);
    };
    CanvasRenderer.prototype.drawBuffer = function () {
        this.ctx.fillStyle = this.palette.background;
        this.ctx.fillRect(412, 32, 219, 9);
        this.ctx.fillStyle = this.palette.light;
        this.ctx.fillRect(413, 33, Math.round(218 * this.song.buffer), 8);
        this.ctx.strokeStyle = this.palette.foreground;
        this.ctx.strokeRect(412.5, 32.5, 219, 9);
    };
    CanvasRenderer.prototype.drawPositionSlider = function () {
        this.ctx.fillStyle = this.palette.background;
        this.ctx.fillRect(58, 402, 236, 16);
        this.ctx.fillStyle = this.palette.dark;
        this.ctx.fillRect(59, 402, Math.round(235 * this.song.position), 16);
        this.ctx.strokeStyle = this.palette.foreground;
        this.ctx.strokeRect(58.5, 402.5, 236, 16);
    };
    CanvasRenderer.prototype.drawSongInfo = function () {
        this.ctx.setTransform(1, 0, 0, 1, 0.5, 0.5);
        // song name
        this.ctx.fillStyle = this.palette.dark;
        this.ctx.strokeStyle = this.palette.dark;
        this.ctx.fillRect(58, 383, 573, 14);
        this.ctx.strokeRect(58, 383, 573, 14);
        // tick, bpm, tb
        this.ctx.fillStyle = this.palette.background;
        this.ctx.strokeStyle = this.palette.foreground;
        this.ctx.fillRect(58, 421, 74, 9);
        this.ctx.strokeRect(58, 421, 74, 9);
        this.ctx.fillRect(159, 421, 20, 9);
        this.ctx.strokeRect(159, 421, 20, 9);
        this.ctx.fillRect(198, 421, 20, 9);
        this.ctx.strokeRect(198, 421, 20, 9);
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        // song name
        var path = this.song.fileName === null ? "Drag and drop a MIDI file into this window to play" : this.song.fileName;
        this.loader.getFont("large").drawText(this.ctx, path, 60, 385, this.palette.light);
        // tick, bpm, tb
        var small = this.loader.getFont("small");
        small.spaceWidth = 1;
        small.drawTextRTL(this.ctx, "00 : 00 : 00 '000", 131, 423, this.palette.white);
        small.spaceWidth = 2;
        small.drawTextRTL(this.ctx, "000", 178, 423, this.palette.white);
        small.drawTextRTL(this.ctx, "000", 217, 423, this.palette.white);
    };
    CanvasRenderer.prototype.drawLabels = function () {
        var small = this.loader.getFont("small");
        var pointer = this.loader.getImage("pointer");
        small.drawTextRTL(this.ctx, "BUFFER", 410, 35, this.palette.foreground);
        this.ctx.putImageData(pointer, 412, 27);
        small.drawText(this.ctx, "OUT", 421, 25, this.palette.foreground);
        this.ctx.putImageData(pointer, 446, 27);
        small.drawText(this.ctx, "DANGER", 455, 25, this.palette.foreground);
        this.ctx.putImageData(pointer, 520, 27);
        small.drawText(this.ctx, "GOOD", 529, 25, this.palette.foreground);
        this.ctx.putImageData(pointer, 595, 27);
        small.drawText(this.ctx, "GREAT", 604, 25, this.palette.foreground);
        for (var y = 53; y <= 221; y += 168) {
            small.drawTextRTL(this.ctx, "MUTE/POLY", 54, y, this.palette.foreground);
            small.drawTextRTL(this.ctx, "VOLUME", 54, y + 13, this.palette.foreground);
            small.drawTextRTL(this.ctx, "EXPRESSION", 54, y + 21, this.palette.foreground);
            small.drawTextRTL(this.ctx, "SW.ENVELOPE", 54, y + 29, this.palette.foreground);
            small.drawTextRTL(this.ctx, "OUTPUT", 54, y + 45, this.palette.foreground);
            small.drawTextRTL(this.ctx, "PITCHBEND", 54, y + 73, this.palette.foreground);
            small.drawTextRTL(this.ctx, "PANPOT", 54, y + 84, this.palette.foreground);
            small.drawTextRTL(this.ctx, "PC", 54, y + 96, this.palette.foreground);
            small.drawTextRTL(this.ctx, "CC0", 54, y + 106, this.palette.foreground);
            small.drawTextRTL(this.ctx, "WAVE", 54, y + 121, this.palette.foreground);
            small.drawTextRTL(this.ctx, "FREQUENCY", 54, y + 136, this.palette.foreground);
            small.drawTextRTL(this.ctx, "HOLD/SOFT", 54, y + 147, this.palette.foreground);
        }
        small.drawTextRTL(this.ctx, "SONG", 54, 388, this.palette.foreground);
        small.drawTextRTL(this.ctx, "POSITION", 54, 407, this.palette.foreground);
        small.drawTextRTL(this.ctx, "TICK", 54, 423, this.palette.foreground);
        small.drawText(this.ctx, "BPM", 138, 423, this.palette.foreground);
        small.drawText(this.ctx, "TB", 184, 423, this.palette.foreground);
        var medium = this.loader.getFont("medium");
        medium.drawText(this.ctx, "Play", 140, 8, this.palette.foreground);
        medium.drawText(this.ctx, "Fast", 180, 8, this.palette.foreground);
        medium.drawText(this.ctx, "Stop", 219, 8, this.palette.foreground);
        medium.drawText(this.ctx, "Pause", 256, 8, this.palette.foreground);
        medium.drawText(this.ctx, "Export", 296, 8, this.palette.foreground);
        medium.drawText(this.ctx, "Config", 336, 8, this.palette.foreground);
    };
    CanvasRenderer.prototype.polyToColor = function (poly) {
        return this.palette.foreground; // TODO
    };
    CanvasRenderer.prototype.drawPan = function (x, y, val) {
        for (var i = -8; i <= 8; i++) {
            if (i === 0) {
                continue;
            }
            else if (val === null) {
                this.ctx.strokeStyle = this.palette.dark;
            }
            else if (Math.abs(i) === 1) {
                this.ctx.strokeStyle = "#ff9f00";
            }
            else if (val > 0 === i > 0 && Math.abs(val) >= Math.abs(i / 8)) {
                this.ctx.strokeStyle = this.palette.light;
            }
            else {
                this.ctx.strokeStyle = this.palette.dark;
            }
            var height = Math.floor(Math.abs(i) / 2 + 1.5);
            this.ctx.strokeRect(x + (i * 2) + (i > 0 ? 13 : 16), y + 5 - height, 0, height);
        }
    };
    CanvasRenderer.prototype.initChannelHitbox = function (idx) {
        var _this = this;
        var x = ((idx % 16) * 36) + 58;
        var y = (Math.floor(idx / 16) * 168) + 49;
        var region = new HitRegion(x, y, 33, 13);
        region.onmousedown = function (x, y) {
            _this.song.channels[idx].mute = !_this.song.channels[idx].mute;
            _this.drawChannel(idx);
        };
        this.hitDetector.addHitRegion(region, "chan" + idx);
    };
    CanvasRenderer.prototype.initPositionHitbox = function () {
        var _this = this;
        var slider = new HitRegion(58, 402, 236, 16);
        slider.cursor = "ew-resize";
        var slideEvent = function (e) {
            window.removeEventListener("mousemove", moveSlider, false);
            window.removeEventListener("mouseup", slideEvent, false);
        };
        var moveSlider = function (e) {
            _this.song.position = Math.min(1, Math.max(0, (e.offsetX - 57) / 236));
            _this.drawPositionSlider();
        };
        slider.onmousedown = function (x, y) {
            _this.song.position = Math.min(1, Math.max(0, (x - 57) / 236));
            _this.drawPositionSlider();
            window.addEventListener("mousemove", moveSlider, false);
            window.addEventListener("mouseup", slideEvent, false);
        };
        this.hitDetector.addHitRegion(slider, "positionSlider");
    };
    CanvasRenderer.prototype.initButtons = function () {
        var _this = this;
        var loop = new HitRegion(300, 402, 20, 17);
        var mouseup = function (e) {
            _this.drawRepeat();
            window.removeEventListener("mouseup", mouseup, false);
        };
        loop.onmousedown = function (x, y) {
            _this.drawRepeat();
            window.addEventListener("mouseup", mouseup, false);
        };
        loop.onmouseup = function (x, y) {
            _this.song.repeat = !_this.song.repeat;
            Cookies.write("loop", _this.song.repeat ? "true" : "false");
            _this.drawRepeat();
        };
        this.hitDetector.addHitRegion(loop, "loop");
        var createRegion = function (x, y, w, h, name, callback) {
            var r = new HitRegion(x, y, w, h);
            var el = function (e) {
                _this.drawButtons(name);
                window.removeEventListener("mouseup", el, false);
            };
            r.onmousedown = function () {
                _this.drawButtons(name);
                if (callback == null || !callback()) {
                    window.addEventListener("mouseup", el, false);
                }
            };
            _this.hitDetector.addHitRegion(r, name);
        };
        createRegion(132, 19, 34, 22, "play");
        createRegion(172, 19, 34, 22, "fastforward");
        createRegion(212, 19, 34, 22, "stop");
        createRegion(252, 19, 34, 22, "pause");
        createRegion(292, 19, 34, 22, "export");
        createRegion(332, 19, 34, 22, "config", function () { return _this.openConfig(); });
    };
    CanvasRenderer.prototype.drawRepeat = function () {
        this.drawButton(300, 402, 20, 16, this.hitDetector.regions["loop"].over && this.hitDetector.mouseDown);
        var repeatIcon = this.loader.getImage("repeat");
        if (this.song.repeat) {
            this.ctx.putImageData(repeatIcon, 304, 405);
        }
        else {
            var recolored = new ImageData(repeatIcon.width, repeatIcon.height);
            AssetLoader.composite(recolored.data, repeatIcon.data, repeatIcon.data, this.palette, {
                light: this.palette.foreground,
                dark: this.palette.dark
            });
            this.ctx.putImageData(recolored, 304, 405);
        }
    };
    CanvasRenderer.prototype.drawButtons = function (name) {
        if (name == null) {
            this.drawButtons("play");
            this.drawButtons("fastforward");
            this.drawButtons("stop");
            this.drawButtons("pause");
            this.drawButtons("export");
            this.drawButtons("config");
        }
        else if (this.hitDetector.regions[name] !== undefined) {
            switch (name) {
                case "play":
                    this.drawButton(132, 19, 34, 21, this.hitDetector.regions["play"].over && this.hitDetector.mouseDown);
                    this.ctx.putImageData(this.loader.getImage("play"), 143, 23);
                    break;
                case "fastforward":
                    this.drawButton(172, 19, 34, 21, this.hitDetector.regions["fastforward"].over && this.hitDetector.mouseDown);
                    this.ctx.putImageData(this.loader.getImage("fastForward"), 180, 22);
                    break;
                case "stop":
                    this.drawButton(212, 19, 34, 21, this.hitDetector.regions["stop"].over && this.hitDetector.mouseDown);
                    this.ctx.putImageData(this.loader.getImage("stop"), 222, 23);
                    break;
                case "pause":
                    this.drawButton(252, 19, 34, 21, this.hitDetector.regions["pause"].over && this.hitDetector.mouseDown);
                    this.ctx.putImageData(this.loader.getImage("pause"), 264, 23);
                    break;
                case "export":
                    this.drawButton(292, 19, 34, 21, this.hitDetector.regions["export"].over && this.hitDetector.mouseDown);
                    this.ctx.putImageData(this.loader.getImage("export"), 295, 22);
                    break;
                case "config":
                    this.drawButton(332, 19, 34, 21, this.hitDetector.regions["config"].over && this.hitDetector.mouseDown);
                    this.ctx.putImageData(this.loader.getImage("config"), 342, 22);
            }
        }
    };
    CanvasRenderer.prototype.initLink = function () {
        var _this = this;
        var link = new HitRegion(164, 435, 183, 10);
        link.onmousedown = function () {
            window.location.assign("https://github.com/milkey-mouse/JSSCC");
        };
        link.onenter = function () { _this.drawLink(false); };
        link.onexit = function () { _this.drawLink(); };
        this.hitDetector.addHitRegion(link, "link");
    };
    CanvasRenderer.prototype.drawLink = function (redrawText) {
        if (redrawText === void 0) { redrawText = true; }
        if (redrawText) {
            this.ctx.fillStyle = this.palette.background;
            this.ctx.fillRect(44, 435, 310, 10);
            this.loader.getFont("medium").drawText(this.ctx, "This project is open source: https://github.com/milkey-mouse/JSSCC", 44, 435, this.palette.dark);
        }
        if (this.hitDetector.regions["link"].over) {
            this.ctx.strokeStyle = this.palette.dark;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(164.5, 443.5);
            this.ctx.lineTo(347.5, 443.5);
            this.ctx.stroke();
        }
    };
    CanvasRenderer.prototype.drawChannel = function (idx) {
        var x = ((idx % 16) * 36) + 58;
        var y = (Math.floor(idx / 16) * 168) + 49;
        var chan = this.song.channels[idx];
        this.ctx.setTransform(1, 0, 0, 1, 0.5, 0.5);
        // mute/poly
        this.ctx.strokeStyle = this.palette.foreground;
        this.ctx.strokeRect(x, y, 33, 13);
        this.ctx.strokeRect(x + 16, y + 2, 15, 9);
        this.ctx.fillStyle = this.polyToColor(chan.poly);
        this.ctx.fillRect(x + 18, y + 4, 11, 5);
        this.ctx.strokeStyle = this.palette.dark;
        this.ctx.strokeRect(x + 18, y + 4, 11, 5);
        this.ctx.strokeStyle = this.palette.foreground;
        // volume/expression/sw. envelope
        this.ctx.strokeRect(x, y + 15, 33, 58);
        this.ctx.strokeRect(x + 2, y + 24, 5, 47);
        this.ctx.strokeRect(x + 7, y + 24, 5, 47);
        this.ctx.strokeRect(x + 12, y + 24, 5, 47);
        this.ctx.strokeRect(x + 17, y + 24, 14, 47);
        // image is done after translation is removed
        // pitchbend
        this.ctx.strokeRect(x, y + 75, 33, 9);
        // panpot
        this.ctx.strokeRect(x, y + 86, 33, 9);
        // percussion (pc)
        this.ctx.strokeRect(x, y + 97, 33, 9);
        // cc0
        this.ctx.strokeRect(x, y + 108, 33, 9);
        // waveform
        this.ctx.fillStyle = this.palette.background;
        this.ctx.fillRect(x, y + 119, 33, 17);
        this.ctx.strokeRect(x, y + 119, 33, 17);
        this.ctx.fillStyle = this.palette.light;
        this.ctx.fillRect(x + 0.5, y + 127.5, 32, 1);
        if (idx % 16 === 9) {
            this.drawButton(x - 0.5, y + 118.5, 33, 17);
            this.ctx.putImageData(this.loader.getImage("drum"), x + 3, y + 124);
        }
        else if (chan.wave !== null) {
            this.ctx.fillStyle = this.palette.light;
            for (var i = 0; i < this.song.channels.length; i++) {
                var val = Math.round(chan.wave(i / 32) * 7.5);
                if (val >= 0) {
                    val++;
                }
                this.ctx.fillRect(x + i + 0.5, y + 128.5, 1, -val);
            }
        }
        // frequency
        this.ctx.strokeRect(x, y + 138, 33, 9);
        // hold/soft
        this.ctx.fillStyle = this.palette.dark;
        this.ctx.strokeStyle = this.palette.foreground;
        this.ctx.strokeRect(x, y + 149, 15, 9);
        this.ctx.fillRect(x + 2, y + 151, 11, 5);
        this.ctx.strokeRect(x + 2, y + 151, 11, 5);
        this.ctx.strokeRect(x + 18, y + 149, 15, 9);
        this.ctx.fillRect(x + 20, y + 151, 11, 5);
        this.ctx.strokeRect(x + 20, y + 151, 11, 5);
        //VU meters
        for (var i = 0; i < 15; i++) {
            // volume
            this.ctx.strokeStyle = chan.volume >= (15 - i) / 15 ? this.palette.light : this.palette.dark;
            this.ctx.strokeRect(x + 4, y + (i * 3 + 26), 1, 1);
            // expression
            this.ctx.strokeStyle = chan.expression >= (15 - i) / 15 ? this.palette.light : this.palette.dark;
            this.ctx.strokeRect(x + 9, y + (i * 3 + 26), 1, 1);
            // sw. envelope
            this.ctx.strokeStyle = chan.envelope >= (15 - i) / 15 ? this.palette.light : this.palette.dark;
            this.ctx.strokeRect(x + 14, y + (i * 3 + 26), 1, 1);
            // output
            this.ctx.strokeStyle = chan.output >= (15 - i) / 15 ? this.palette.light : this.palette.dark;
            this.ctx.strokeRect(x + 19, y + (i * 3 + 26), 10, 1);
        }
        // draw pitchbend, panpot
        this.drawPan(x + 2, y + 77, chan.pitchbend);
        this.drawPan(x + 2, y + 88, chan.panpot);
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        var small = this.loader.getFont("small");
        //percussion (pc)
        var pcStr = "" + chan.percussion;
        pcStr = "000".substring(pcStr.length) + pcStr;
        small.drawTextRTL(this.ctx, pcStr, x + 32, y + 99, this.palette.white);
        // cc0
        small.drawTextRTL(this.ctx, "000", x + 32, y + 110, this.palette.white);
        // frequency
        var freqStr = "" + chan.freq;
        freqStr = "00000".substring(freqStr.length) + freqStr;
        small.drawTextRTL(this.ctx, freqStr, x + 32, y + 140, this.palette.white);
        // mute
        this.ctx.putImageData(this.loader.getImage(chan.mute ? "muted" : "unmuted"), x + 3, y + 3);
        // labels for vu meters
        this.ctx.putImageData(this.loader.getImage("vuLabels"), x + 3, y + 18);
    };
    CanvasRenderer.prototype.redraw = function () {
        this.drawLogos();
        this.drawBuffer();
        this.drawPositionSlider();
        this.drawSongInfo();
        this.drawLabels();
        this.drawRepeat();
        this.drawButtons();
        this.drawLink();
        for (var idx = 0; idx < this.song.channels.length; idx++) {
            this.drawChannel(idx);
        }
    };
    CanvasRenderer.prototype.openConfig = function () {
        this.configOpen = true;
        this.tempRegions = this.hitDetector.regions;
        this.hitDetector.regions = {};
        this.tempData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = "rgba(1, 1, 1, 0.75)";
        var newBG = AssetLoader.hexToRgb(this.palette.background);
        if (newBG === null) {
            return false;
        }
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
    };
    CanvasRenderer.prototype.initConfig = function (width, height) {
        var _this = this;
        var close = new HitRegion((this.canvas.width + width) / 2 - 23, (this.canvas.height - height) / 2 + 5, 16, 15);
        close.onmousedown = function () { _this.closeConfig(); };
        this.hitDetector.addHitRegion(close, "close");
        var windowX = (this.canvas.width - width) / 2;
        var windowY = (this.canvas.height - height) / 2;
        var paletteTextBox = new HitRegion(windowX + width * 0.4 - 1, windowY + 33, width * 0.6 - 29, 16);
        paletteTextBox.onmousedown = function () {
            _this.drawButton(windowX + width - 28, windowY + 33, 16, 16, true);
            _this.ctx.putImageData(_this.loader.getImage("dropdown"), 396, 138);
            window.setTimeout(function () {
                _this.drawButton(windowX + width - 28, windowY + 33, 16, 16, false);
                _this.ctx.putImageData(_this.loader.getImage("dropdown"), 395, 137);
            }, 100);
        };
        this.hitDetector.addHitRegion(paletteTextBox, "paletteTB");
        var paletteButton = new HitRegion(windowX + width - 29, windowY + 33, 16, 16);
        var mouseUp = function () {
            _this.drawButton(windowX + width - 28, windowY + 33, 16, 16, false);
            _this.ctx.putImageData(_this.loader.getImage("dropdown"), 395, 137);
            window.removeEventListener("mouseup", mouseUp);
        };
        paletteButton.onmousedown = function () {
            _this.drawButton(windowX + width - 28, windowY + 33, 16, 16, true);
            _this.ctx.putImageData(_this.loader.getImage("dropdown"), 396, 138);
            window.addEventListener("mouseup", mouseUp, false);
        };
        this.hitDetector.addHitRegion(paletteButton, "paletteDD");
    };
    CanvasRenderer.prototype.drawConfig = function (width, height) {
        var windowX = (this.canvas.width - width) / 2;
        var windowY = (this.canvas.height - height) / 2;
        var large = this.loader.getFont("large");
        this.drawWindow(windowX, windowY, width, height, "Preferences");
        large.drawText(this.ctx, "Color Palette", windowX + 12, windowY + 35, this.palette.foreground);
        this.drawButton(windowX + width * 0.4, windowY + 33, width * 0.6 - 28, 16, true);
        this.drawButton(windowX + width - 28, windowY + 33, 16, 16, false);
        this.ctx.putImageData(this.loader.getImage("dropdown"), 395, 137);
        large.drawText(this.ctx, this.paletteName, windowX + width * 0.4 + 4, windowY + 35, this.palette.white);
    };
    CanvasRenderer.prototype.closeConfig = function () {
        this.configOpen = false;
        if (this.tempData !== null) {
            this.ctx.putImageData(this.tempData, 0, 0);
            this.tempData = null;
        }
        if (this.tempRegions !== null) {
            this.hitDetector.regions = this.tempRegions;
            this.tempRegions = null;
        }
        document.body.style.backgroundColor = this.palette.background;
        this.hitDetector.regions["config"].over = false; // the next update won't run until after this is drawn, so we have to do it manually
        this.drawButtons("config");
    };
    return CanvasRenderer;
}());
// adapted from http://quirksmode.org/js/cookies.html
var Cookies = (function () {
    function Cookies() {
    }
    Cookies.write = function (name, value, days) {
        if (days === void 0) { days = 365; }
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            var expires = "; expires=" + date.toUTCString();
        }
        else {
            var expires = "";
        }
        document.cookie = name + "=" + value + expires + "; path=/";
    };
    Cookies.get = function (name, fallback) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ')
                c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0)
                return c.substring(nameEQ.length, c.length);
        }
        return fallback;
    };
    Cookies.delete = function (name) {
        Cookies.write(name, "", -1);
    };
    return Cookies;
}());
var BitmapFont = (function () {
    function BitmapFont(imgCanvas, charMap, rowEscapes) {
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
                for (var i = 0; i < data.length; i++) {
                    if (data[i] != 255) {
                        break;
                    }
                }
                if (i === data.length) {
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
    BitmapFont.prototype.drawText = function (ctx, text, x, y, color) {
        var newPalette = { foreground: color };
        for (var i = 0; i < text.length; i++) {
            if (text[i] === " ") {
                x += this.spaceWidth + this.spaceBetweenLetters;
                continue;
            }
            var charIdx = this.charMap.indexOf(text[i]);
            if (charIdx === -1) {
                console.warn("could not print character '" + text[i] + "' with charmap '" + this.charMap + "'");
                x += this.spaceWidth + this.spaceBetweenLetters;
            }
            else {
                var charImg = this.chars[charIdx];
                if (color == null) {
                    ctx.putImageData(charImg, x, y);
                }
                else {
                    var composited = ctx.createImageData(charImg.width, charImg.height);
                    AssetLoader.composite(composited.data, charImg.data, ctx.getImageData(x, y, charImg.width, charImg.height).data, BitmapFont.fontPalette, newPalette);
                    ctx.putImageData(composited, x, y);
                }
                x += charImg.width + this.spaceBetweenLetters;
            }
        }
    };
    BitmapFont.prototype.drawTextRTL = function (ctx, text, x, y, color) {
        var newPalette = { foreground: color };
        for (var i = text.length - 1; i >= 0; i--) {
            if (text[i] === " ") {
                x -= this.spaceWidth + this.spaceBetweenLetters;
                continue;
            }
            var charIdx = this.charMap.indexOf(text[i]);
            if (charIdx === -1 || charIdx >= this.chars.length) {
                console.warn("could not print character '" + text[i] + "'");
                x -= this.spaceWidth + this.spaceBetweenLetters;
            }
            else {
                var charImg = this.chars[charIdx];
                if (color == null) {
                    ctx.putImageData(this.chars[charIdx], x - charImg.width, y);
                }
                else {
                    var composited = ctx.createImageData(charImg.width, charImg.height);
                    AssetLoader.composite(composited.data, charImg.data, ctx.getImageData(x - charImg.width, y, charImg.width, charImg.height).data, BitmapFont.fontPalette, newPalette);
                    ctx.putImageData(composited, x - charImg.width, y);
                }
                x -= charImg.width + this.spaceBetweenLetters;
            }
        }
    };
    return BitmapFont;
}());
BitmapFont.fontPalette = { foreground: "#000", background: "#fff" };
var HitRegion = (function () {
    function HitRegion(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.w = width;
        this.h = height;
        this.over = false;
        this.cursor = null;
        this.onmousedown = null;
        this.onmouseup = null;
        this.onenter = null;
        this.onexit = null;
    }
    return HitRegion;
}());
var HitDetector = (function () {
    function HitDetector(ctx) {
        var _this = this;
        this.unnamedRegionsCount = 0;
        this.mouseDown = false;
        this.regions = {};
        this.ctx = ctx;
        // use lambdas to have the right context for 'this'
        ctx.canvas.addEventListener("mousedown", function (e) { _this.onMouseDown(e); }, false);
        ctx.canvas.addEventListener("mousemove", function (e) { _this.onMouseMove(e); }, false);
        ctx.canvas.addEventListener("mouseup", function (e) { _this.onMouseUp(e); }, false);
    }
    HitDetector.prototype.onMouseDown = function (event) {
        if (event.button !== 0) {
            return;
        }
        this.mouseDown = true;
        for (var regionName in this.regions) {
            var r = this.regions[regionName];
            if (r != null && r.onmousedown !== null &&
                event.offsetY >= r.y && event.offsetY <= r.y + r.h &&
                event.offsetX >= r.x && event.offsetX <= r.x + r.w) {
                r.onmousedown(event.offsetX, event.offsetY);
            }
        }
    };
    HitDetector.prototype.onMouseUp = function (event) {
        if (event.button !== 0) {
            return;
        }
        this.mouseDown = false;
        for (var regionName in this.regions) {
            var r = this.regions[regionName];
            if (r != null && r.onmouseup !== null &&
                event.offsetY >= r.y && event.offsetY <= r.y + r.h &&
                event.offsetX >= r.x && event.offsetX <= r.x + r.w) {
                r.onmouseup(event.offsetX, event.offsetY);
            }
        }
    };
    HitDetector.prototype.onMouseMove = function (event) {
        if (event.button !== 0) {
            return;
        }
        this.ctx.canvas.style.cursor = "auto";
        for (var regionName in this.regions) {
            var r = this.regions[regionName];
            if (r == null) {
                break;
            }
            var over = event.offsetY >= r.y && event.offsetY <= r.y + r.h &&
                event.offsetX >= r.x && event.offsetX <= r.x + r.w;
            if (over && r.cursor !== null) {
                this.ctx.canvas.style.cursor = r.cursor;
            }
            if (over === true && r.over === false) {
                r.over = true;
                if (r.onenter !== null) {
                    r.onenter();
                }
            }
            else if (over === false && r.over === true) {
                r.over = false;
                if (r.onexit !== null) {
                    r.onexit();
                }
            }
        }
    };
    HitDetector.prototype.addHitRegion = function (r, key) {
        if (key == null) {
            key = "region" + this.unnamedRegionsCount;
            this.unnamedRegionsCount++;
        }
        this.regions[key] = r;
        return key;
    };
    HitDetector.prototype.removeHitRegion = function (key) {
        delete this.regions[key];
    };
    HitDetector.prototype.clearHitRegions = function () {
        this.regions = {};
    };
    return HitDetector;
}());
var Palette = (function () {
    function Palette() {
    }
    return Palette;
}());
var ManifestXHRResponse = (function () {
    function ManifestXHRResponse() {
    }
    return ManifestXHRResponse;
}());
var AssetLoader = (function () {
    function AssetLoader(manifest) {
        if (manifest === void 0) { manifest = "assets/manifest.json"; }
        this.onload = function () { };
        this.unloadedAssets = 0;
        this.images = {};
        this.fonts = {};
        //cache default palette for loading screen
        this.palettes = {
            "default": {
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
    AssetLoader.canonicalizePalette = function (p) {
        for (var color in p) {
            if (typeof color === "string") {
                p[color] = AssetLoader.canonicalizeHex(p[color]);
            }
            else {
                console.error("palette has non-string key; this should never happen!");
                console.log(color);
            }
        }
    };
    AssetLoader.canonicalizeHex = function (hex) {
        var rgbColor = AssetLoader.hexToRgb(hex);
        if (rgbColor === null) {
            console.error("could not parse hex color " + hex);
            return "#ffffff";
        }
        else {
            return AssetLoader.colorToHex(rgbColor);
        }
    };
    AssetLoader.hexToRgb = function (hex) {
        // https://stackoverflow.com/a/5624139
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    };
    AssetLoader.colorToHex = function (c) {
        return AssetLoader.rgbToHex(c.r, c.g, c.b);
    };
    AssetLoader.rgbToHex = function (r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    };
    AssetLoader.prototype.add = function (manifest) {
        var _this = this;
        var xhr = new XMLHttpRequest();
        xhr.addEventListener("readystatechange", function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var resp = JSON.parse(xhr.responseText);
                    if (resp.images !== undefined) {
                        _this.unloadedAssets += resp.images.length;
                    }
                    if (resp.fonts !== undefined) {
                        _this.unloadedAssets += resp.fonts.length;
                    }
                    if (resp.palettes !== undefined) {
                        for (var p in resp.palettes) {
                            _this.palettes[p] = resp.palettes[p];
                            AssetLoader.canonicalizePalette(_this.palettes[p]);
                        }
                    }
                    if (resp.images !== undefined) {
                        resp.images.forEach(function (img) { _this.loadImage(img, true); }, _this);
                    }
                    if (resp.fonts !== undefined) {
                        resp.fonts.forEach(_this.loadFont, _this);
                    }
                }
                else {
                    console.error("HTTP request for asset manifest failed with code " + xhr.status);
                }
            }
        }, false);
        xhr.open('GET', manifest, true);
        xhr.send(null);
    };
    AssetLoader.composite = function (outdata, imgdata, bgdata, inPalette, outPalette) {
        if (inPalette === void 0) { inPalette = {}; }
        if (outPalette === void 0) { outPalette = {}; }
        AssetLoader.canonicalizePalette(inPalette);
        var rgbPalette = {};
        for (var color in outPalette) {
            var rgb = AssetLoader.hexToRgb(outPalette[color]);
            if (rgb === null) {
                console.error("could not parse hex string when converting palette: " + outPalette[color]);
                return;
            }
            else {
                rgbPalette[color] = rgb;
            }
        }
        for (var i = 0; i < imgdata.length; i += 4) {
            if (imgdata[i + 3] === 0) {
                outdata[i] = bgdata[i];
                outdata[i + 1] = bgdata[i + 1];
                outdata[i + 2] = bgdata[i + 2];
                outdata[i + 3] = bgdata[i + 3];
            }
            else {
                var outColor = { r: imgdata[i], g: imgdata[i + 1], b: imgdata[i + 2] };
                var hexColor = AssetLoader.colorToHex(outColor);
                for (var color in inPalette) {
                    if (hexColor === inPalette[color]) {
                        if (rgbPalette[color] != null) {
                            outColor = rgbPalette[color];
                        }
                        else {
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
    };
    AssetLoader.prototype.switchPalette = function (oldName, newName) {
        if (oldName !== newName) {
            for (var img in this.images) {
                var idata = this.getImage(img).data;
                AssetLoader.composite(idata, idata, idata, this.palettes[oldName], this.palettes[newName]);
            }
        }
    };
    AssetLoader.prototype.loadImage = function (imagePath, recolor, save, callback) {
        var _this = this;
        if (recolor === void 0) { recolor = false; }
        if (save === void 0) { save = true; }
        var name = imagePath.substring(imagePath.lastIndexOf("/") + 1, imagePath.lastIndexOf("."));
        if (this.images.hasOwnProperty(name)) {
            console.log("skipping cached image " + imagePath);
            return;
        }
        var img = new Image(); //document.createElement("img");
        img.addEventListener("load", function () {
            if (_this.tempCanvas == null) {
                var newCanvas = document.createElement("canvas").getContext("2d");
                if (typeof newCanvas === "object") {
                    _this.tempCanvas = newCanvas;
                }
                else {
                    console.error("could not create canvas or context for temp loader");
                    return;
                }
            }
            _this.tempCanvas.canvas.width = img.naturalWidth;
            _this.tempCanvas.canvas.height = img.naturalHeight;
            _this.tempCanvas.drawImage(img, 0, 0);
            if (save) {
                _this.images[name] = _this.tempCanvas.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
            }
            if (callback != null) {
                callback(name);
            }
            _this.unloadedAssets--;
            if (_this.unloadedAssets === 0) {
                _this.tempCanvas.canvas.remove();
                _this.tempCanvas = null;
                _this.onload();
            }
        }, false);
        img.src = this.prefix + "/" + imagePath;
    };
    AssetLoader.prototype.loadFont = function (font) {
        var _this = this;
        var name = font.path.substring(font.path.lastIndexOf("/") + 1, font.path.lastIndexOf("."));
        if (this.fonts.hasOwnProperty(name)) {
            console.log("skipping cached font " + font.path);
            return;
        }
        this.loadImage(font.path, false, false, function (name) {
            if (_this.tempCanvas == null) {
                console.error("tempCanvas is null right after writing; wut?!");
                return;
            }
            _this.fonts[name] = new BitmapFont(_this.tempCanvas, font.map, font.rowEscapes);
        });
    };
    AssetLoader.prototype.getImage = function (name) {
        return this.images[name];
    };
    AssetLoader.prototype.getFont = function (name) {
        return this.fonts[name];
    };
    AssetLoader.prototype.exportPalette = function (name) {
        if (this.tempCanvas == null) {
            var newCanvas = document.createElement("canvas").getContext("2d");
            if (typeof newCanvas === "object") {
                this.tempCanvas = newCanvas;
            }
            else {
                console.error("could not create canvas or context for temp loader");
                return;
            }
        }
        var colors = [];
        for (var key in this.palettes[name]) {
            colors.push(key);
        }
        colors.sort();
        this.tempCanvas.canvas.width = colors.length;
        this.tempCanvas.canvas.height = 1;
        var tempData = new ImageData(colors.length, 1);
        for (var i = 0; i < colors.length; i++) {
            var color = AssetLoader.hexToRgb(this.palettes[name][colors[i]]);
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
    };
    return AssetLoader;
}());
var Song = (function () {
    function Song(channelCount) {
        if (channelCount === void 0) { channelCount = 32; }
        //initialize with default channels
        this.channels = [];
        for (var i = 0; i < channelCount; i++) {
            this.channels.push(new Channel());
        }
        this.position = 0;
        this.buffer = 1;
        this.repeat = Cookies.get("loop", "true") === "true";
        this.fileName = null;
    }
    return Song;
}());
var Channel = (function () {
    function Channel() {
        this.mute = false;
        this.poly = 0;
        this.volume = 0;
        this.expression = 0;
        this.envelope = 0;
        this.output = 0;
        this.pitchbend = null;
        this.panpot = null;
        this.percussion = 0;
        this.cc0 = 0;
        this.freq = 0;
        this.wave = null;
    }
    return Channel;
}());
var Waveform = (function () {
    function Waveform() {
    }
    Waveform.sine = function (x) {
        return Math.sin(x * 2 * Math.PI);
    };
    Waveform.pulse125 = function (x) {
        return x % 1 > 0.125 ? -0.8 : 0.8;
    };
    Waveform.pulse25 = function (x) {
        return x % 1 > 0.25 ? -0.8 : 0.8;
    };
    Waveform.square = function (x) {
        return x % 1 > 0.5 ? -0.8 : 0.8;
    };
    Waveform.pulsedSquare = function (x) {
        return x % 1 > 0.5 ? 0 : 0.8;
    };
    Waveform.triangle = function (x) {
        var clamped = (x + 0.25) % 1;
        if (clamped > 0.5) {
            return 3 - clamped * 4;
        }
        else {
            return (clamped - 0.25) * 4;
        }
    };
    return Waveform;
}());
/// <reference path="canvas.ts" />
/// <reference path="cookie.ts" />
/// <reference path="hitbox.ts" />
/// <reference path="loader.ts" />
/// <reference path="Path2D.d.ts" />
/// <reference path="song.ts" />
var ui = new CanvasRenderer();
