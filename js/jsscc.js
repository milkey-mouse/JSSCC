var CanvasRenderer = (function () {
    function CanvasRenderer() {
        var _this = this;
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
        this.framesDrawn = 0;
        this.drawStartTime = 0;
        window.addEventListener("load", function () {
            _this.loadEvents--;
            _this.initCanvas();
            _this.rescale();
            if (_this.loadEvents === 0) {
                //defer actual redraw so loading text has time to show up
                _this.clear();
                _this.ctx.fillStyle = _this.palette.foreground;
                _this.ctx.fillText("Loading...", _this.canvas.width / 2, _this.canvas.height / 2);
                window.setTimeout(function () {
                    _this.clear();
                    _this.redraw();
                    _this.renderFrame();
                }, 5);
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
                window.setTimeout(function () {
                    _this.clear();
                    _this.redraw();
                    _this.renderFrame();
                }, 0);
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
                }, 10);
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
    };
    CanvasRenderer.prototype.rescale = function () {
        if (!this.initialized) {
            return;
        }
        var widthScale = window.innerWidth / this.canvas.width;
        var heightScale = window.innerHeight / this.canvas.height;
        this.hitDetector.scale = this.scale = Math.max(1, Math.floor(Math.min(widthScale, heightScale)));
        this.ctx.canvas.style.height = (this.ctx.canvas.height * this.scale) + "px";
        this.ctx.canvas.style.width = (this.ctx.canvas.width * this.scale) + "px";
    };
    CanvasRenderer.prototype.clear = function () {
        if (!this.initialized) {
            return;
        }
        this.ctx.fillStyle = this.palette.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        Object.keys(this.palette).join("\n");
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
    CanvasRenderer.prototype.drawFilledRect = function (x, y, w, h, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, w, h);
    };
    CanvasRenderer.prototype.drawImage = function (image, x, y) {
        this.ctx.putImageData(this.loader.getImage(image), x, y);
    };
    CanvasRenderer.prototype.drawLine = function (x1, y1, x2, y2, color) {
        x2 += this.offsetX;
        y2 += this.offsetY;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x1 + 0.5, y1 + 0.5);
        this.ctx.lineTo(x2 + 0.5, y2 + 0.5);
        this.ctx.stroke();
    };
    CanvasRenderer.prototype.drawPbar = function (value, x, y, w, h, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, Math.round(w * value), h);
    };
    CanvasRenderer.prototype.drawStrokeRect = function (x, y, w, h, color) {
        this.ctx.strokeStyle = color;
        this.ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    };
    CanvasRenderer.prototype.drawText = function (size, text, x, y, color, rtl, spaceWidth) {
        var font = this.loader.getFont(size);
        if (spaceWidth === undefined) {
            this.loader.getFont(size).drawText(this.ctx, text, x, y, color, rtl);
        }
        else {
            font.spaceWidth = spaceWidth;
            font.drawText(this.ctx, text, x, y, color, rtl);
            font.spaceWidth = 1;
        }
    };
    CanvasRenderer.prototype.drawWindow = function (x, y, w, h, title) {
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
            var dataIdx = ((upperLeft.height - 1) * upperLeft.width + i) * 4;
            this.ctx.strokeStyle = AssetLoader.rgbToHex(upperLeft.data[dataIdx], upperLeft.data[dataIdx + 1], upperLeft.data[dataIdx + 2]);
            this.ctx.beginPath();
            this.ctx.moveTo(x + i + 0.5, y + 0.5);
            this.ctx.lineTo(x + i + 0.5, y + h - 0.5);
            this.ctx.stroke();
        }
        // draw right edge
        for (var i = 0; i < upperRight.width; i++) {
            var dataIdx = ((upperRight.height - 1) * upperRight.width + i) * 4;
            this.ctx.strokeStyle = AssetLoader.rgbToHex(upperRight.data[dataIdx], upperRight.data[dataIdx + 1], upperRight.data[dataIdx + 2]);
            this.ctx.beginPath();
            this.ctx.moveTo(x + w - upperRight.width + i + 0.5, y + 0.5);
            this.ctx.lineTo(x + w - upperRight.width + i + 0.5, y + h - 0.5);
            this.ctx.stroke();
        }
        // draw top edge
        for (var i = 0; i < upperLeft.height; i++) {
            var dataIdx = (upperLeft.width * i + (upperLeft.width - 1)) * 4;
            this.ctx.strokeStyle = AssetLoader.rgbToHex(upperLeft.data[dataIdx], upperLeft.data[dataIdx + 1], upperLeft.data[dataIdx + 2]);
            this.ctx.beginPath();
            this.ctx.moveTo(x + 0.5, y + i + 0.5);
            this.ctx.lineTo(x + w - 0.5, y + i + 0.5);
            this.ctx.stroke();
        }
        // draw bottom edge
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
        // draw title
        if (title !== undefined) {
            this.loader.getFont("large").drawText(this.ctx, title, x + 8, y + 7, this.palette.white);
        }
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
            this.ctx.strokeRect(x + (i * 2) + (i > 0 ? 13 : 16) + 0.5, y + 5 - height, 0, height + 1);
        }
    };
    CanvasRenderer.prototype.drawWaveform = function (x, y, width, color, checkWindow) {
        this.ctx.fillStyle = color;
        if (this.chan.wave !== null) {
            this.ctx.fillStyle = this.palette.light;
            for (var i = 0; i < width; i++) {
                var val = Math.round(this.chan.wave(i / width) * 7.5);
                if (val >= 0) {
                    val++;
                }
                this.ctx.fillRect(x + i + 1, y + 11, 1, -val);
            }
        }
    };
    CanvasRenderer.prototype.drawVuMeter = function (x, y, w, h, val) {
        for (var i = 0; i < h; i++) {
            this.ctx.fillStyle = val >= (h - i) / h ? this.palette.light : this.palette.dark;
            this.ctx.fillRect(x, y + i * 3, w + 1, 2);
        }
    };
    CanvasRenderer.prototype.initChannelHitbox = function (idx) {
        var _this = this;
        var x = ((idx % 16) * 36) + 58;
        var y = (Math.floor(idx / 16) * 168) + 49;
        var region = new HitRegion(x, y, 33, 13);
        region.onmousedown = function (x, y) {
            _this.song.channels[idx].mute = !_this.song.channels[idx].mute;
            _this.drawChannel(idx, "channelMute");
            _this.song.channels[idx].volume = 0;
            _this.song.channels[idx].expression = 0;
            _this.song.channels[idx].envelope = 0;
            _this.song.channels[idx].output = 0;
            _this.drawChannel(idx, "channelVEN");
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
            _this.song.position = Math.min(1, Math.max(0, (e.offsetX / _this.scale - 57) / 236));
            _this.drawDGroup("positionSlider");
        };
        slider.onmousedown = function (x, y) {
            _this.song.position = Math.min(1, Math.max(0, (x - 57) / 236));
            _this.drawDGroup("positionSlider");
            window.addEventListener("mousemove", moveSlider, false);
            window.addEventListener("mouseup", slideEvent, false);
        };
        this.hitDetector.addHitRegion(slider, "positionSlider");
    };
    CanvasRenderer.prototype.initButtons = function () {
        var _this = this;
        var loop = new HitRegion(300, 402, 20, 17);
        var mouseup = function (e) {
            _this.drawDGroup("repeat");
            window.removeEventListener("mouseup", mouseup, false);
        };
        loop.onmousedown = function (x, y) {
            _this.drawDGroup("repeat");
            window.addEventListener("mouseup", mouseup, false);
        };
        loop.onmouseup = function (x, y) {
            _this.song.repeat = !_this.song.repeat;
            Cookies.write("loop", _this.song.repeat ? "true" : "false");
            _this.drawDGroup("repeat");
        };
        this.hitDetector.addHitRegion(loop, "loop");
        var createRegion = function (x, y, w, h, name, callback) {
            var r = new HitRegion(x, y, w, h);
            var el = function (e) {
                switch (name) {
                    case "stop":
                        _this.song.playState = PlayState.STOPPED;
                        break;
                    case "play":
                        _this.framesDrawn = 0;
                        _this.drawStartTime = performance.now();
                        _this.song.playState = PlayState.PLAYING;
                        break;
                    case "pause":
                        _this.song.playState = PlayState.PAUSED;
                        break;
                }
                _this.drawDGroup(name + "Button");
                window.removeEventListener("mouseup", el, false);
            };
            r.onmousedown = function () {
                _this.drawDGroup(name + "Button");
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
    CanvasRenderer.prototype.initLink = function () {
        var _this = this;
        var link = new HitRegion(164, 435, 183, 10);
        link.cursor = "pointer";
        link.onmousedown = function () {
            window.location.assign("https://github.com/milkey-mouse/JSSCC");
        };
        link.onenter = function () { _this.drawDGroup("githubLinkSelected"); };
        link.onexit = function () { _this.drawDGroup("githubLinkDeselected"); };
        this.hitDetector.addHitRegion(link, "link");
    };
    CanvasRenderer.prototype.drawChannel = function (idx, group, checkWindow) {
        var x = ((idx % 16) * 36) + 58;
        var y = (Math.floor(idx / 16) * 168) + 49;
        this.chan = this.song.channels[idx];
        if (group !== undefined) {
            this.drawDGroup(group, x, y, checkWindow);
        }
        else {
            this.drawAllGroupsWithName("channel", x, y, checkWindow);
        }
    };
    CanvasRenderer.prototype.drawAllGroupsWithName = function (name, x, y, checkWindow) {
        for (var gn in this.loader.drawGroups) {
            if (typeof gn === "string" && gn.substring(0, name.length) === name) {
                this.drawDGroup(gn, x, y, checkWindow);
            }
        }
    };
    CanvasRenderer.prototype.drawDObject = function (drawObj) {
        if (drawObj[0] === "nop" || drawObj[0] === "bounds") {
            return;
        }
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
        var args = new Array(drawObj.length);
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
                        args[i] = this.palette.hasOwnProperty(color) ? this.palette[color] : drawObj[i];
                        break;
                    default:
                        args[i] = drawObj[i];
                        break;
                }
            }
            else if (numbers < 2 && typeof arg === "number") {
                args[i] = arg + (numbers === 0 ? this.offsetX : this.offsetY);
                numbers++;
            }
            else {
                args[i] = drawObj[i];
            }
        }
        // if the object type is "nop", completely disregard it; this is put
        // after the argument transformation so it can run code to determine
        // if the draw is a nop (e.g. don't draw the waveform on a drum channel)
        if (args[0] === "nop" || args[0] === "bounds") {
            return;
        }
        // we need to convert the name from lowerCamelCase to UpperCamelCase
        // to put "draw" before it, but otherwise the DObject types have a
        // one-to-one mapping with the draw functions above
        var func = this["draw" + args[0].charAt(0).toUpperCase() + args[0].substring(1)];
        if (typeof func === "function") {
            func.apply(this, args.slice(1));
        }
        else {
            console.warn("unrecognized UI item ", args);
        }
    };
    CanvasRenderer.prototype.drawDGroup = function (group, offsetX, offsetY, checkWindow) {
        if (checkWindow === void 0) { checkWindow = this.configOpen; }
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
        }
        else if (checkWindow) {
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
        var windowGroup;
        var windowBounds;
        var windowX;
        var windowY;
        if (redrawPreferencesWindow) {
            windowGroup = this.loader.drawGroups["preferencesWindow"];
            windowBounds = windowGroup[windowGroup.length - 1].slice(1);
            windowX = (this.canvas.width - windowBounds[2]) / 2;
            windowY = (this.canvas.height - windowBounds[3]) / 2;
            if (group[group.length - 1][0] === "bounds") {
                // get cached bounds from manifest.json
                var bounds = group[group.length - 1].slice(1);
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
            }
            else {
                console.warn("no bounds for group", group);
            }
            // reset offsets
            if (this.offsetX !== 0 || this.offsetY !== 0) {
                this.offsetX = 0;
                this.offsetY = 0;
            }
            this.drawAllGroupsWithName("preferences", windowX, windowY);
        }
        else {
            for (var i = 0; i < group.length; i++) {
                this.drawDObject(group[i]);
            }
            // reset offsets
            if (this.offsetX !== 0 || this.offsetY !== 0) {
                this.offsetX = 0;
                this.offsetY = 0;
            }
        }
    };
    CanvasRenderer.prototype.redraw = function () {
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
    };
    CanvasRenderer.prototype.openConfig = function () {
        this.configOpen = true;
        this.tempRegions = this.hitDetector.regions;
        this.hitDetector.regions = {};
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
        this.initConfig();
        this.drawConfig();
        return true;
    };
    CanvasRenderer.prototype.initConfig = function () {
        var _this = this;
        var windowGroup = this.loader.drawGroups["preferencesWindow"];
        var windowBounds = windowGroup[windowGroup.length - 1].slice(1);
        var width = windowBounds[2];
        var height = windowBounds[3];
        var close = new HitRegion((this.canvas.width + width) / 2 - 23, (this.canvas.height - height) / 2 + 5, 16, 15);
        close.onmousedown = function () { _this.closeConfig(); };
        this.hitDetector.addHitRegion(close, "close");
        var windowX = (this.canvas.width - windowBounds[2]) / 2;
        var windowY = (this.canvas.height - windowBounds[3]) / 2;
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
            _this.drawDGroup("preferencesColorPalette", windowX, windowY);
            window.removeEventListener("mouseup", mouseUp);
        };
        paletteButton.onmousedown = function () {
            _this.drawDGroup("preferencesColorPalette", windowX, windowY);
            window.addEventListener("mouseup", mouseUp, false);
        };
        this.hitDetector.addHitRegion(paletteButton, "paletteDD");
    };
    CanvasRenderer.prototype.drawConfig = function () {
        var windowGroup = this.loader.drawGroups["preferencesWindow"];
        var windowBounds = windowGroup[windowGroup.length - 1].slice(1);
        var windowX = (this.canvas.width - windowBounds[2]) / 2;
        var windowY = (this.canvas.height - windowBounds[3]) / 2;
        this.drawAllGroupsWithName("preferences", windowX, windowY);
    };
    CanvasRenderer.prototype.closeConfig = function () {
        this.configOpen = false;
        if (this.tempRegions !== null) {
            this.hitDetector.regions = this.tempRegions;
            this.tempRegions = null;
        }
        else {
            console.error("no tempRegions");
        }
        this.redraw();
        document.body.style.backgroundColor = this.palette.background;
        // the next update for the mouseovers won't run until after this
        // stuff is drawn, so we have to set the mouseover state manually
        this.hitDetector.regions["config"].over = false;
        this.drawDGroup("configButton");
    };
    CanvasRenderer.prototype.rebakeBounds = function (manifestURL) {
        // channelButton won't render unless the channel is a drum channel
        this.chan.drum = true;
        this.loader.rebakeBounds(this, manifestURL);
    };
    CanvasRenderer.prototype.perfTest = function (lengthMS) {
        if (lengthMS === void 0) { lengthMS = 5000; }
        console.log("running performance test for " + lengthMS / 1000 + " seconds");
        var i = 0;
        var t0 = performance.now();
        var t1 = t0;
        for (var frames = 0; (t1 - t0) < lengthMS; frames++) {
            // redraw everything that would be redrawn in a standard frame:
            // channels
            for (i = 0; i < 32; i++) {
                this.drawChannel(i, "channelVEN");
                //this.drawChannel(i, "channelFrequency");
                this.drawChannel(i, "channelPoly");
            }
            // these only need to be drawn about once a second normally
            if (frames % 30 == 0) {
                for (i = 0; i < 32; i++) {
                    this.drawChannel(i, "channelFrequency");
                }
                this.drawDGroup("positionSlider");
                this.drawDGroup("buffer");
            }
            t1 = performance.now();
        }
        console.log("perf test completed");
        console.log("milliseconds taken: " + (t1 - t0));
        console.log("frames drawn: " + frames);
        console.log("average fps: " + frames / (t1 - t0) * 1000);
    };
    CanvasRenderer.prototype.renderFrame = function () {
        var _this = this;
        if (this.song.playState === PlayState.PLAYING || this.song.playState === PlayState.FASTFORWARD) {
            var pn = (performance.now() / 1000);
            for (var i = 0; i < 32; i++) {
                var x = (Waveform.sine(pn + (i / 10)) + 1) * 0.505;
                this.chan = this.song.channels[i];
                this.chan.volume = x;
                this.chan.expression = x;
                this.chan.envelope = x;
                this.chan.output = x;
                this.drawChannel(i, "channelVEN");
                //this.drawChannel(i, "channelFrequency");
                this.drawChannel(i, "channelPoly");
            }
            this.framesDrawn++;
            if (this.framesDrawn % 30 === 0) {
                console.log((this.framesDrawn / (performance.now() - this.drawStartTime) * 1000) + " fps");
            }
        }
        window.requestAnimationFrame(function () { _this.renderFrame(); });
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
// tfw you just want to implement a synthesizer but you've accidentally written a terrible UI framework
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
    BitmapFont.prototype.drawText = function (ctx, text, x, y, color, rtl) {
        if (rtl === void 0) { rtl = false; }
        var newPalette = { foreground: color };
        var origX = x;
        for (var i = rtl ? (text.length - 1) : 0; rtl ? (i >= 0) : (i < text.length); rtl ? i-- : i++) {
            if (text[i] === " ") {
                if (rtl) {
                    x -= this.spaceWidth + this.spaceBetweenLetters;
                }
                else {
                    x += this.spaceWidth + this.spaceBetweenLetters;
                }
                continue;
            }
            else if (text[i] === "\n") {
                x = origX;
                y += this.height + this.spaceWidth;
                continue;
            }
            else {
                var charIdx = this.charMap.indexOf(text[i]);
                if (charIdx === -1 || (rtl && charIdx >= this.chars.length)) {
                    console.warn("could not print character '" + text[i] + "' with charmap '" + this.charMap + "'");
                    x += this.spaceWidth + this.spaceBetweenLetters;
                }
                else {
                    var charImg = this.chars[charIdx];
                    if (color == null) {
                        ctx.putImageData(charImg, rtl ? (x - charImg.width) : x, y);
                    }
                    else {
                        var composited = ctx.createImageData(charImg.width, charImg.height);
                        AssetLoader.composite(composited.data, charImg.data, ctx.getImageData(rtl ? (x - charImg.width) : x, y, charImg.width, charImg.height).data, BitmapFont.fontPalette, newPalette);
                        ctx.putImageData(composited, rtl ? (x - charImg.width) : x, y);
                    }
                    if (rtl) {
                        x -= charImg.width + this.spaceBetweenLetters;
                    }
                    else {
                        x += charImg.width + this.spaceBetweenLetters;
                    }
                }
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
        this.scale = 1;
        this.currentNamespace = "default";
        this.namespaces = {};
        // use lambdas to have the right context for 'this'
        ctx.canvas.addEventListener("mousedown", function (e) { _this.onMouseDown(e); }, false);
        ctx.canvas.addEventListener("mousemove", function (e) { _this.onMouseMove(e); }, false);
        ctx.canvas.addEventListener("mouseup", function (e) { _this.onMouseUp(e); }, false);
    }
    HitDetector.prototype.onMouseDown = function (event) {
        if (event.button !== 0) {
            return;
        }
        var mouseX = event.offsetX / this.scale;
        var mouseY = event.offsetY / this.scale;
        this.mouseDown = true;
        for (var regionName in this.regions) {
            var r = this.regions[regionName];
            if (r != null && r.onmousedown !== null &&
                mouseY >= r.y && mouseY <= r.y + r.h &&
                mouseX >= r.x && mouseX <= r.x + r.w) {
                r.onmousedown(mouseX, mouseY);
            }
        }
    };
    HitDetector.prototype.onMouseUp = function (event) {
        if (event.button !== 0) {
            return;
        }
        var mouseX = event.offsetX / this.scale;
        var mouseY = event.offsetY / this.scale;
        this.mouseDown = false;
        for (var regionName in this.regions) {
            var r = this.regions[regionName];
            if (r != null && r.onmouseup !== null &&
                mouseY >= r.y && mouseY <= r.y + r.h &&
                mouseX >= r.x && mouseX <= r.x + r.w) {
                r.onmouseup(mouseX, mouseY);
            }
        }
    };
    HitDetector.prototype.onMouseMove = function (event) {
        if (event.button !== 0) {
            return;
        }
        var mouseX = event.offsetX / this.scale;
        var mouseY = event.offsetY / this.scale;
        this.ctx.canvas.style.cursor = "auto";
        for (var regionName in this.regions) {
            var r = this.regions[regionName];
            if (r == null) {
                break;
            }
            var over = mouseY >= r.y && mouseY <= r.y + r.h &&
                mouseX >= r.x && mouseX <= r.x + r.w;
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
        this.drawGroups = {};
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
                    if (resp.drawGroups !== undefined) {
                        for (var p in resp.drawGroups) {
                            _this.drawGroups[p] = resp.drawGroups[p];
                        }
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
    AssetLoader.prototype.rebakeBounds = function (cr, manifestURL) {
        var _this = this;
        if (manifestURL === void 0) { manifestURL = "assets/manifest.json"; }
        // ugly stupid code to export the pretty-printed manifest.json with bounds metadata
        var xhr = new XMLHttpRequest();
        xhr.addEventListener("readystatechange", function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var json = JSON.parse(xhr.responseText);
                    if (json.drawGroups === undefined) {
                        console.error("no drawGroups in this manifest");
                        return;
                    }
                    var baked = JSON.stringify(json, function (k, v) { return k === "drawGroups" ? {} : v; }, 4);
                    var dgi = baked.lastIndexOf('    "drawGroups": {}');
                    if (dgi === -1) {
                        console.error("couldn't find replaceable string in stringified manifest JSON");
                        return;
                    }
                    else {
                        // TODO: Don't just cut it off, serialize objects after drawGroups as well
                        var lines = baked.substring(0, dgi - 1).split("\n");
                        baked = "";
                        lines.push('    "drawGroups": {');
                        for (var gn in json.drawGroups) {
                            lines.push("        " + JSON.stringify(gn) + ": [");
                            var group = json.drawGroups[gn];
                            _this.drawGroups[gn] = group;
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
                                        }
                                        else {
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
                            }
                            else {
                                group.push(["newBounds", xMin, yMin, xMax - xMin + 1, yMax - yMin + 1]);
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
                                var stringified = [];
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
                        lines.push("        ]\n    }\n}");
                        // pop open the final JSON in the current tab
                        window.location.assign("data:application/json;base64," + btoa(lines.join("\n")));
                    }
                }
                else {
                    console.error("HTTP request for asset manifest failed with code " + xhr.status);
                }
            }
        }, false);
        xhr.open('GET', manifestURL, true);
        xhr.send(null);
    };
    return AssetLoader;
}());
var PlayState;
(function (PlayState) {
    PlayState[PlayState["STOPPED"] = 0] = "STOPPED";
    PlayState[PlayState["PAUSED"] = 1] = "PAUSED";
    PlayState[PlayState["PLAYING"] = 2] = "PLAYING";
    PlayState[PlayState["FASTFORWARD"] = 3] = "FASTFORWARD";
})(PlayState || (PlayState = {}));
var Song = (function () {
    function Song(channelCount) {
        if (channelCount === void 0) { channelCount = 32; }
        //initialize with default channels
        this.channels = [];
        for (var i = 0; i < channelCount; i++) {
            this.channels.push(new Channel());
            this.channels[i].wave = Waveform.triangle;
        }
        this.channels[9].drum = true;
        this.channels[25].drum = true;
        this.position = 0;
        this.buffer = 1;
        this.playState = PlayState.STOPPED;
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
        this.drum = false;
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
/// <reference path="drawobject.ts" />
/// <reference path="canvas.ts" />
/// <reference path="cookie.ts" />
/// <reference path="hitbox.ts" />
/// <reference path="loader.ts" />
/// <reference path="song.ts" />
var ui = new CanvasRenderer();
