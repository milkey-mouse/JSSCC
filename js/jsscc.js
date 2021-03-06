var CanvasRenderer = (function () {
    function CanvasRenderer(loader, song, canvasID, continuouslyRender) {
        if (loader === void 0) { loader = new AssetLoader("assets/manifest.json"); }
        if (canvasID === void 0) { canvasID = "content"; }
        if (continuouslyRender === void 0) { continuouslyRender = true; }
        var _this = this;
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
        var onload = function () {
            _this.loadEvents--;
            _this.initCanvas();
            _this.rescale();
            if (_this.loadEvents === 0) {
                _this.firstDraw();
            }
        };
        if (document.readyState === "complete") {
            onload();
        }
        else {
            window.addEventListener("load", onload, false);
        }
        this.loader.onload.push(function () {
            _this.loadEvents--;
            _this.switchPalette(Cookies.get("palette", "default"));
            if (_this.loadEvents === 0) {
                _this.firstDraw();
            }
        });
    }
    CanvasRenderer.prototype.firstDraw = function () {
        this.clear();
        this.redraw();
        this.renderFrame();
    };
    CanvasRenderer.prototype.switchPalette = function (name) {
        var _this = this;
        if (name === void 0) { name = "default"; }
        if (name !== this.paletteName) {
            Cookies.write("palette", name);
            if (this.initialized) {
                var olddata = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                this.clear();
                this.ctx.fillStyle = this.palette.foreground;
                this.ctx.fillText("Loading...", this.canvas.width / 2, this.canvas.height / 2);
                // have a frame render with the "Loading..." text before switching
                window.setTimeout(function () {
                    if (olddata !== undefined) {
                        var newdata = new ImageData(olddata.width, olddata.height);
                        AssetLoader.composite(newdata.data, olddata.data, olddata.data, _this.palette, _this.loader.palettes[name]);
                        _this.ctx.putImageData(newdata, 0, 0);
                    }
                    _this.loader.switchPalette(_this.paletteName, name);
                    _this.palette = _this.loader.palettes[name];
                    _this.paletteName = name;
                    document.body.style.backgroundColor = _this.palette.background;
                    if (olddata === undefined && _this.initialized) {
                        _this.clear();
                        _this.redraw();
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
        var _this = this;
        if (this.initialized) {
            return;
        }
        document.body.style.backgroundColor = this.palette.background;
        window.addEventListener("resize", function () { _this.rescale(); }, false);
        this.canvas = document.getElementById(this.canvasID);
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
    };
    CanvasRenderer.prototype.button = function (x, y, w, h, pressed) {
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
    CanvasRenderer.prototype.strokeRect = function (x, y, w, h, color) {
        this.ctx.strokeStyle = color;
        this.ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    };
    CanvasRenderer.prototype.filledRect = function (x, y, w, h, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, w, h);
    };
    CanvasRenderer.prototype.clearRect = function (x, y, w, h) {
        this.ctx.clearRect(x, y, w, h);
    };
    CanvasRenderer.prototype.image = function (image, x, y) {
        this.ctx.putImageData(this.loader.getImage(image), x, y);
    };
    CanvasRenderer.prototype.line = function (x1, y1, x2, y2, color) {
        x2 += this.offsetX;
        y2 += this.offsetY;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x1 + 0.5, y1 + 0.5);
        this.ctx.lineTo(x2 + 0.5, y2 + 0.5);
        this.ctx.stroke();
    };
    CanvasRenderer.prototype.pbar = function (value, x, y, w, h, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, Math.round(w * value), h);
    };
    CanvasRenderer.prototype.text = function (size, text, x, y, color, rtl, spaceWidth) {
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
    CanvasRenderer.prototype.window = function (x, y, w, h, title) {
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
    CanvasRenderer.prototype.pan = function (x, y, val) {
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
    CanvasRenderer.prototype.waveform = function (x, y, width, color, checkWindow) {
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
    CanvasRenderer.prototype.vuMeter = function (x, y, w, h, val) {
        for (var i = 0; i < h; i++) {
            this.ctx.fillStyle = val >= (h - i) / h ? this.palette.light : this.palette.dark;
            this.ctx.fillRect(x, y + i * 3, w + 1, 2);
        }
    };
    CanvasRenderer.prototype.drawChannel = function (idx, group) {
        var x = ((idx % 16) * 36) + 58;
        var y = (Math.floor(idx / 16) * 168) + 49;
        this.chan = this.song.channels[idx];
        if (group !== undefined) {
            this.drawDGroup(group, x, y);
        }
        else {
            this.drawAllGroupsWithName("channel", x, y);
        }
    };
    CanvasRenderer.prototype.drawAllGroupsWithName = function (name, x, y) {
        for (var gn in this.loader.drawGroups) {
            if (typeof gn === "string" && gn.substring(0, name.length) === name) {
                this.drawDGroup(gn, x, y);
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
        var func = this[args[0]];
        if (typeof func === "function") {
            func.apply(this, args.slice(1));
        }
        else {
            console.warn("unrecognized UI item ", args);
        }
    };
    CanvasRenderer.prototype.drawDGroup = function (group, offsetX, offsetY) {
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
    };
    CanvasRenderer.prototype.redraw = function () {
        for (var group in this.loader.drawGroups) {
            this.drawDGroup(group);
        }
        for (var idx = 0; idx < this.song.channels.length; idx++) {
            this.drawChannel(idx);
        }
    };
    CanvasRenderer.prototype.rebakeBounds = function (manifestURL) {
        // channelButton won't render unless the channel is a drum channel
        // it doesn't matter that we're overwriting this as rebakeBounds
        // will redirect you to view the JSON anyway
        this.chan.drum = true;
        this.loader.rebakeBounds(this, manifestURL);
    };
    CanvasRenderer.prototype.autoRegion = function (name, autoRedraw, callback, offsetX, offsetY) {
        var _this = this;
        if (autoRedraw === void 0) { autoRedraw = true; }
        var group = this.loader.drawGroups[name];
        if (group === undefined) {
            console.error("no group named " + name);
        }
        else if (group.length === 0) {
            console.error("zero length DGroup");
        }
        var bounds = group[group.length - 1];
        if (bounds === undefined || bounds.length < 5 || bounds[0] !== "bounds") {
            console.error("incorrect bounds list ", bounds);
        }
        if (offsetX !== undefined && offsetY !== undefined) {
            var region = new HitRegion(bounds[1] + offsetX, bounds[2] + offsetY, bounds[3], bounds[4]);
        }
        else {
            var region = new HitRegion(bounds[1], bounds[2], bounds[3], bounds[4]);
        }
        if (autoRedraw) {
            var onMouseUp = function (e) {
                _this.drawDGroup(name, offsetX, offsetY);
                window.removeEventListener("mouseup", onMouseUp, false);
            };
            region.onmousedown.push(function (x, y) {
                _this.drawDGroup(name, offsetX, offsetY);
                if (callback !== undefined) {
                    callback();
                }
                else {
                    window.addEventListener("mouseup", onMouseUp, false);
                }
            });
        }
        this.hitDetector.addHitRegion(region, name);
        return region;
    };
    CanvasRenderer.prototype.renderFrame = function () {
        var _this = this;
        if (!this.continuouslyRender) {
            return;
        }
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
        this.onmousedown = [];
        this.onmouseup = [];
        this.onenter = [];
        this.onexit = [];
    }
    return HitRegion;
}());
var HitDetector = (function () {
    function HitDetector(ctx) {
        var _this = this;
        this.mouseDown = false;
        this.ctx = ctx;
        this.scale = 1;
        this.regions = {};
        // use lambdas to have the right context for 'this'
        this.ctx.canvas.addEventListener("mousedown", function (e) { _this.onMouseDown(e); }, false);
        this.ctx.canvas.addEventListener("mousemove", function (e) { _this.onMouseMove(e); }, false);
        this.ctx.canvas.addEventListener("mouseup", function (e) { _this.onMouseUp(e); }, false);
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
            if (r !== undefined && r.onmousedown.length > 0 &&
                mouseY >= r.y && mouseY <= r.y + r.h &&
                mouseX >= r.x && mouseX <= r.x + r.w) {
                for (var i = 0; i < r.onmousedown.length; i++) {
                    r.onmousedown[i](mouseX, mouseY);
                }
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
            if (r !== undefined && r.onmouseup.length > 0 &&
                mouseY >= r.y && mouseY <= r.y + r.h &&
                mouseX >= r.x && mouseX <= r.x + r.w) {
                for (var i = 0; i < r.onmouseup.length; i++) {
                    r.onmouseup[i](mouseX, mouseY);
                }
            }
        }
    };
    HitDetector.prototype.onMouseMove = function (event) {
        var mouseX = event.offsetX / this.scale;
        var mouseY = event.offsetY / this.scale;
        this.ctx.canvas.style.cursor = "auto";
        for (var regionName in this.regions) {
            var r = this.regions[regionName];
            if (r === undefined) {
                continue;
            }
            var over = mouseY >= r.y && mouseY <= r.y + r.h &&
                mouseX >= r.x && mouseX <= r.x + r.w;
            if (over && r.cursor !== null) {
                this.ctx.canvas.style.cursor = r.cursor;
            }
            if (over === true && r.over === false) {
                r.over = true;
                for (var i = 0; i < r.onenter.length; i++) {
                    r.onenter[i]();
                }
            }
            else if (over === false && r.over === true) {
                r.over = false;
                for (var i = 0; i < r.onexit.length; i++) {
                    r.onexit[i]();
                }
            }
        }
    };
    HitDetector.prototype.isOver = function (name) {
        return this.regions[name] !== undefined && this.regions[name].over;
    };
    HitDetector.prototype.isDown = function (name) {
        return this.mouseDown && this.isOver(name);
    };
    HitDetector.prototype.addHitRegion = function (r, key) {
        if (key === void 0) { key = "region"; }
        if (this.regions[key] !== undefined) {
            var i = 2;
            while (this.regions[key + i] !== undefined) {
                i++;
            }
            key = key + i;
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
        this.unloadedAssets = 0;
        this.unloadedManifests = 0;
        this.onload = [];
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
        if (manifest !== undefined) {
            this.add(manifest);
        }
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
    AssetLoader.prototype.add = function (manifest) {
        var _this = this;
        this.unloadedManifests++;
        if (this.prefix === undefined) {
            this.prefix = manifest.substring(0, manifest.lastIndexOf("/"));
        }
        var xhr = new XMLHttpRequest();
        xhr.addEventListener("readystatechange", function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var resp = JSON.parse(xhr.responseText);
                    if (resp.palettes !== undefined) {
                        for (var p in resp.palettes) {
                            _this.palettes[p] = resp.palettes[p];
                            AssetLoader.canonicalizePalette(_this.palettes[p]);
                        }
                    }
                    if (resp.images !== undefined) {
                        _this.unloadedAssets += resp.images.length;
                        resp.images.forEach(function (img) { _this.loadImage(img, true); }, _this);
                    }
                    if (resp.fonts !== undefined) {
                        _this.unloadedAssets += resp.fonts.length;
                        resp.fonts.forEach(_this.loadFont, _this);
                    }
                    if (resp.drawGroups !== undefined) {
                        for (var p in resp.drawGroups) {
                            _this.drawGroups[p] = resp.drawGroups[p];
                        }
                    }
                    _this.unloadedManifests--;
                }
                else {
                    console.error("HTTP request for asset manifest failed with code " + xhr.status);
                }
            }
        }, false);
        xhr.open('GET', manifest, true);
        xhr.send(null);
    };
    AssetLoader.prototype.createTempCanvas = function () {
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
            _this.createTempCanvas();
            if (_this.tempCanvas === null) {
                return;
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
            if (_this.unloadedAssets === 0 && _this.unloadedManifests === 0) {
                _this.tempCanvas.canvas.remove();
                _this.tempCanvas = null;
                for (var i = 0; i < _this.onload.length; i++) {
                    _this.onload[i]();
                }
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
                console.error("tempCanvas is null right after writing");
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
    AssetLoader.prototype.clone = function () {
        var al = new AssetLoader();
        // shallow copy these since they should be shared
        al.tempCanvas = this.tempCanvas;
        al.palettes = this.palettes;
        al.images = this.images;
        al.fonts = this.fonts;
        // don't copy the onload handlers to the clone
        //al.onload = this.onload;
        // deep copy the drawGroups because there are side effects to having extraneous
        // ones (they are redrawn by CanvasRenderer when redraw() is called)
        al.drawGroups = JSON.parse(JSON.stringify(this.drawGroups));
        return al;
    };
    AssetLoader.prototype.exportPalette = function (name) {
        this.createTempCanvas();
        if (this.tempCanvas === null) {
            return;
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
                    var lines = [baked.substring(0, baked.indexOf('    "drawGroups": {}') + 19)];
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
                    lines.push("        ]");
                    // pop open the final JSON in the current tab
                    lines.push("    " + baked.substring(baked.indexOf('    "drawGroups": {}') + 19));
                    window.location.assign("data:application/json;base64," + btoa(lines.join("\n")));
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
var JSSCC = (function () {
    function JSSCC() {
        var _this = this;
        this.song = new Song();
        var loader = new AssetLoader();
        this.configOpen = false;
        // load the base manifest & clone the loader for each renderer
        loader.onload.push(function () {
            var uiLoader = loader.clone();
            uiLoader.add("assets/ui.json");
            _this.renderer = new CanvasRenderer(uiLoader, _this.song);
            uiLoader.onload.push(function () { _this.addUIHitRegions(); });
            var configLoader = loader.clone();
            configLoader.add("assets/config.json");
            _this.configRenderer = new CanvasRenderer(configLoader, _this.song, "config", false);
            configLoader.onload.push(function () { _this.addConfigHitRegions(); });
        });
        loader.add("assets/base.json");
    }
    JSSCC.prototype.addUIHitRegions = function () {
        var _this = this;
        var _loop_1 = function () {
            x = ((i % 16) * 36) + 58;
            y = (Math.floor(i / 16) * 168) + 49;
            var chanIdx = i;
            // add mute button
            region = this_1.renderer.autoRegion("channelMute", false, undefined, x, y);
            region.onmousedown.unshift(function (x, y) {
                _this.song.channels[chanIdx].mute = !_this.song.channels[chanIdx].mute;
                _this.renderer.drawChannel(chanIdx, "channelMute");
            });
        };
        var this_1 = this, x, y, region;
        // add channel regions
        for (var i = 0; i < this.song.channels.length; i++) {
            _loop_1();
        }
        // add position slider (& mouse handling)
        var positionSliderDG = this.renderer.loader.drawGroups["positionSlider"];
        var bounds = positionSliderDG[positionSliderDG.length - 1];
        var slider = this.renderer.autoRegion("positionSlider");
        slider.cursor = "ew-resize";
        var slideEvent = function (e) {
            _this.renderer.canvas.removeEventListener("mousemove", moveSlider, false);
            window.removeEventListener("mouseup", slideEvent, false);
        };
        var moveSlider = function (e) {
            var x = e.offsetX / _this.renderer.scale;
            if (x < bounds[1]) {
                _this.song.position = 0;
            }
            else if (x > (bounds[1] + bounds[3])) {
                _this.song.position = 1;
            }
            else {
                _this.song.position = (x - bounds[1]) / bounds[3];
            }
            _this.renderer.drawDGroup("positionSlider");
        };
        slider.onmousedown.unshift(function (x, y) {
            moveSlider({ offsetX: x, offsetY: y });
            _this.renderer.canvas.addEventListener("mousemove", moveSlider, false);
            window.addEventListener("mouseup", slideEvent, false);
        });
        // Repeat button
        this.renderer.autoRegion("repeat").onmouseup.push(function (x, y) {
            _this.song.repeat = !_this.song.repeat;
            Cookies.write("loop", _this.song.repeat.toString());
        });
        // Top buttons (play, pause, etc.)
        this.renderer.autoRegion("play").onmouseup.push(function (x, y) {
            _this.song.playState = PlayState.PLAYING;
        });
        this.renderer.autoRegion("fastForward").onmouseup.push(function (x, y) {
            _this.song.playState = PlayState.FASTFORWARD;
        });
        this.renderer.autoRegion("stop").onmouseup.push(function (x, y) {
            _this.song.playState = PlayState.STOPPED;
        });
        this.renderer.autoRegion("pause").onmouseup.push(function (x, y) {
            _this.song.playState = PlayState.PAUSED;
        });
        this.renderer.autoRegion("export");
        this.renderer.autoRegion("config", true, function () { _this.openConfig(); });
        // GitHub link
        var link = this.renderer.autoRegion("githubLink", false);
        link.cursor = "pointer";
        link.onmousedown.push(function () {
            window.location.assign("https://github.com/milkey-mouse/JSSCC");
        });
        link.onenter.push(function () {
            _this.renderer.drawDGroup("githubLink");
        });
        link.onexit.push(function () {
            _this.renderer.drawDGroup("githubLink");
        });
    };
    JSSCC.prototype.addConfigHitRegions = function () {
        var _this = this;
        var windowGroup = this.configRenderer.loader.drawGroups["preferencesWindow"];
        var windowBounds = windowGroup[windowGroup.length - 1].slice(1);
        var width = windowBounds[2];
        var height = windowBounds[3];
        var windowX = (this.configRenderer.canvas.width - width) / 2;
        var windowY = (this.configRenderer.canvas.height - height) / 2;
        var close = new HitRegion((this.configRenderer.canvas.width + width) / 2 - 23, windowY + 5, 16, 15);
        close.onmousedown.push(function () { _this.closeConfig(); });
        this.configRenderer.hitDetector.addHitRegion(close, "close");
        this.configRenderer.autoRegion("preferencesColorPalette", true, undefined, windowX, windowY);
    };
    JSSCC.prototype.openConfig = function () {
        this.configOpen = true;
        // show the config window
        this.configRenderer.canvas.style.visibility = "visible";
        // set body's background color to that of the overlay
        var newBG = AssetLoader.hexToRgb(this.configRenderer.palette.background);
        if (newBG !== null) {
            newBG.r = Math.round(newBG.r * 0.25);
            newBG.g = Math.round(newBG.g * 0.25);
            newBG.b = Math.round(newBG.b * 0.25);
            document.body.style.backgroundColor = AssetLoader.colorToHex(newBG);
        }
        this.configRenderer.drawDGroup("overlay");
        var windowGroup = this.configRenderer.loader.drawGroups["preferencesWindow"];
        var windowBounds = windowGroup[windowGroup.length - 1].slice(1);
        var windowX = (this.configRenderer.canvas.width - windowBounds[2]) / 2;
        var windowY = (this.configRenderer.canvas.height - windowBounds[3]) / 2;
        this.configRenderer.drawAllGroupsWithName("preferences", windowX, windowY);
    };
    JSSCC.prototype.closeConfig = function () {
        this.configOpen = false;
        // hide the config window
        this.configRenderer.canvas.style.visibility = "hidden";
        // the next update for the mouseovers won't run until after this
        // stuff is drawn, so we have to set the mouseover state manually
        this.renderer.hitDetector.onMouseMove({ offsetX: 0, offsetY: 0 });
        this.renderer.drawDGroup("config");
        // reset the background color and rerender the (now unpressed) config button
        document.body.style.backgroundColor = this.configRenderer.palette.background;
    };
    JSSCC.prototype.switchPalette = function (name) {
        this.renderer.switchPalette(name);
        this.configRenderer.switchPalette(name);
    };
    return JSSCC;
}());
/// <reference path="drawobject.ts" />
/// <reference path="canvas.ts" />
/// <reference path="cookie.ts" />
/// <reference path="hitbox.ts" />
/// <reference path="loader.ts" />
/// <reference path="song.ts" />
/// <reference path="ui.ts" />
var ui = new JSSCC();
