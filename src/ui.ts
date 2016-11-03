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

    constructor(manifest: string = "assets/manifest.json") {
        this.loader = new AssetLoader(manifest);
        this.initialized = false;
        this.loadEvents = 2;
        this.scale = 1;

        this.paletteName = "default";
        this.palette = this.loader.palettes[this.paletteName];

        this.song = new Song();

        window.addEventListener("load", () => {
            this.loadEvents--;
            this.initCanvas();
            this.rescale();
            if (this.loadEvents === 0) {
                this.redraw();
            } else {
                this.ctx.fillText("Loading assets...", this.canvas.width/2, this.canvas.height/2);
            }
        }, false);

        this.loader.onload = () => {
            this.loadEvents--;
            if (this.loadEvents === 0) {
                this.clear();
                this.redraw();
            }
         };
    }

    public switchPalette(name: string = "default", redraw: boolean = true) : void {
        if (name !== this.paletteName) {
            this.loader.switchPalette(this.paletteName, name);
            this.palette = this.loader.palettes[name];
            this.paletteName = name;
        }
        if (redraw && this.initialized) {
            this.clear();
            this.redraw();
        }
    }

    public initCanvas() : void {
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
    }

    public rescale() : void {
        if (!this.initialized) { return; }
        var width : number = window.innerWidth / this.canvas.width;
        var height : number = window.innerHeight / this.canvas.height;
        this.scale = Math.max(1, Math.floor(Math.min(width, height)));
        this.ctx.canvas.style.height = (this.ctx.canvas.height * this.scale) + "px";        
        this.ctx.canvas.style.width = (this.ctx.canvas.width * this.scale) + "px";
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    public clear() : void {
        if (!this.initialized) { return; }
        this.ctx.fillStyle = this.palette.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    public drawTexture(x: number, y: number, w: number, h: number) : void {
        this.ctx.fillStyle = this.palette.dark;
        var checkered = this.ctx.createImageData(1, h);
        var d = checkered.data;
        var f = AssetLoader.hexToRgb(this.palette.dark);
        if (f === null) { return; }
        for(var i = 0; i < checkered.data.length; i+=8) {
            d[i] = 0;
            d[i+1] = 0;
            d[i+2] = 0;
            d[i+3] = 0;
            
            d[i+4] = f.r;
            d[i+5] = f.g;
            d[i+6] = f.b;
            d[i+7] = 255;
        }
        for(var i = 0; i+4 <= w; i+=4) {
            this.ctx.putImageData(checkered, x+i, y);
            this.ctx.fillRect(x+i+1, y, 2, h);
        }
    }

    public drawLogos() : void {
        this.ctx.putImageData(this.loader.getImage("logo"), 15, 10);
        this.ctx.putImageData(this.loader.getImage("sparkles"), 424, 4);
        this.drawTexture(358, 410, 64, 32);
        this.ctx.putImageData(this.loader.getImage("midi"), 436, 412);
        this.ctx.putImageData(this.loader.getImage("gs"), 482, 413);
        this.ctx.putImageData(this.loader.getImage("xg"), 525, 413);
        this.ctx.putImageData(this.loader.getImage("scc"), 575, 413);
        var medium = this.loader.getFont("medium");
        medium.drawText(this.ctx, "Alpha v. 0.0.1", 39, 39, "#FFF");
        medium.drawText(this.ctx, "(C) 2016 meme.institute + Milkey Mouse", 453, 4, this.palette.dark); //drop shadow
        medium.drawText(this.ctx, "(C) 2016 meme.institute + Milkey Mouse", 452, 3, "#FFF");
        medium.drawText(this.ctx, "Inspired by Gashisoft GXSCC", 500, 14, this.palette.dark);
        medium.drawText(this.ctx, "This project is open source: https://github.com/milkey-mouse/JSSCC", 44, 435, this.palette.dark);
    }

    public drawBuffer() : void {
        this.ctx.fillStyle = this.palette.background;
        this.ctx.fillRect(412, 32, 219, 9);
        this.ctx.fillStyle = this.palette.light;
        this.ctx.fillRect(413, 33, Math.round(218*this.song.buffer), 8);
        this.ctx.strokeStyle = this.palette.foreground;
        this.ctx.strokeRect(412.5, 32.5, 219, 9);
    }

    public drawPositionSlider() : void {
        this.ctx.fillStyle = this.palette.background;
        this.ctx.fillRect(58, 402, 236, 16);
        this.ctx.fillStyle = this.palette.dark;
        this.ctx.fillRect(59, 402, Math.round(235*this.song.position), 16);
        this.ctx.strokeStyle = this.palette.foreground;
        this.ctx.strokeRect(58.5, 402.5, 236, 16);
    }

    public drawSongInfo() : void {
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
        this.loader.getFont("large").drawText(this.ctx, path, 60, 385, "#FFD2A2");

        // tick, bpm, tb
        var small = this.loader.getFont("small");
        small.spaceWidth = 1;
        small.drawTextRTL(this.ctx, "00 : 00 : 00 '000", 131, 423, "#FFF");
        small.spaceWidth = 2;
        small.drawTextRTL(this.ctx, "000", 178, 423, "#FFF");
        small.drawTextRTL(this.ctx, "000", 217, 423, "#FFF");
    }

    public drawLabels() : void {
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
        for (var y = 53; y <= 221; y += 168)
        {
                small.drawTextRTL(this.ctx, "MUTE/POLY", 54, y, this.palette.foreground);
                small.drawTextRTL(this.ctx, "VOLUME", 54, y+13, this.palette.foreground);
                small.drawTextRTL(this.ctx, "EXPRESSION", 54, y+21, this.palette.foreground);
                small.drawTextRTL(this.ctx, "SW.ENVELOPE", 54, y+29, this.palette.foreground);
                small.drawTextRTL(this.ctx, "OUTPUT", 54, y+45, this.palette.foreground);
                small.drawTextRTL(this.ctx, "PITCHBEND", 54, y+73, this.palette.foreground);
                small.drawTextRTL(this.ctx, "PANPOT", 54, y+84, this.palette.foreground);
                small.drawTextRTL(this.ctx, "PC", 54, y+96, this.palette.foreground);
                small.drawTextRTL(this.ctx, "CC0", 54, y+106, this.palette.foreground);
                small.drawTextRTL(this.ctx, "WAVE", 54, y+121, this.palette.foreground);
                small.drawTextRTL(this.ctx, "FREQUENCY", 54, y+136, this.palette.foreground);
                small.drawTextRTL(this.ctx, "HOLD/SOFT", 54, y+147, this.palette.foreground);
        }
        small.drawTextRTL(this.ctx, "SONG", 54, 388, this.palette.foreground);
        small.drawTextRTL(this.ctx, "POSITION", 54, 407, this.palette.foreground);
        small.drawTextRTL(this.ctx, "TICK", 54, 423, this.palette.foreground);
        small.drawText(this.ctx, "BPM", 138, 423, this.palette.foreground);
        small.drawText(this.ctx, "TB", 184, 423, this.palette.foreground);
    }

    public polyToColor(poly: number) {
        return this.palette.foreground; // TODO
    }

    public drawPan(x: number, y: number, val: number | null) {
        for(var i = -8; i <= 8; i++) {
            if (i === 0) {
                continue;
            } else if (val === null) {
                this.ctx.strokeStyle = this.palette.dark; 
            } else if (Math.abs(i) === 1) {
                this.ctx.strokeStyle = "#ff9f00";
            } else if(val > 0 === i > 0 && Math.abs(val) >= Math.abs(i/8)) {
                this.ctx.strokeStyle = this.palette.light;
            } else {
                this.ctx.strokeStyle = this.palette.dark;
            }
            var height = Math.floor(Math.abs(i) / 2 + 1.5);
            this.ctx.strokeRect(x+(i*2)+(i > 0 ? 13 : 16), y+5-height, 0, height);
        }
    }

    public initChannelHitbox(idx: number) : void {
        var x = ((idx % 16) * 36) + 58;
        var y = (Math.floor(idx / 16) * 168) + 49;

        var region = new HitRegion(x, y, 33, 13);
        region.onmousedown = (x: number, y: number) => {
            this.song.channels[idx].mute = !this.song.channels[idx].mute;
            this.drawChannel(idx);
        };
        this.hitDetector.addHitRegion(region, "chan" + idx);
    }

    public initPositionHitbox() : void {
        var slider = new HitRegion(58, 402, 236, 16);
        slider.cursor = "ew-resize";
        var moveSlider = <EventListener>(e: MouseEvent) => {
            this.song.position = Math.min(1, Math.max(0, (e.offsetX - 58) / 236));
            this.drawPositionSlider();
        };
        slider.onmousedown = (x: number, y: number) => {
            this.song.position = Math.min(1, Math.max(0, (x - 58) / 236));
            this.drawPositionSlider();
            window.addEventListener("mousemove", moveSlider, false);
            window.addEventListener("mouseup", (e: MouseEvent) => {
                window.removeEventListener("mousemove", moveSlider, false);
            }, false);
        };
        this.hitDetector.addHitRegion(slider, "positionSlider");
    }

    public drawChannel(idx: number) : void {
        var x = ((idx % 16) * 36) + 58;
        var y = (Math.floor(idx / 16) * 168) + 49;
        var chan = this.song.channels[idx];
        this.ctx.setTransform(1, 0, 0, 1, 0.5, 0.5);
        
        // mute/poly
        this.ctx.strokeStyle = this.palette.foreground;
        this.ctx.strokeRect(x, y, 33, 13);
        this.ctx.strokeRect(x+16, y+2, 15, 9);
        this.ctx.fillStyle = this.polyToColor(chan.poly);
        this.ctx.fillRect(x+18, y+4, 11, 5);
        this.ctx.strokeStyle = this.palette.dark;
        this.ctx.strokeRect(x+18, y+4, 11, 5);
        this.ctx.strokeStyle = this.palette.foreground;

        // volume/expression/sw. envelope
        this.ctx.strokeRect(x, y+15, 33, 58);
        this.ctx.strokeRect(x+2, y+24, 5, 47);
        this.ctx.strokeRect(x+7, y+24, 5, 47);
        this.ctx.strokeRect(x+12, y+24, 5, 47);
        this.ctx.strokeRect(x+17, y+24, 14, 47);
        // image is done after translation is removed

        // pitchbend
        this.ctx.strokeRect(x, y+75, 33, 9);
        
        // panpot
        this.ctx.strokeRect(x, y+86, 33, 9);
        
        // percussion (pc)
        this.ctx.strokeRect(x, y+97, 33, 9);
        
        // cc0
        this.ctx.strokeRect(x, y+108, 33, 9);

        // waveform
        this.ctx.fillStyle = this.palette.background;
        this.ctx.fillRect(x, y+119, 33, 17);
        this.ctx.strokeRect(x, y+119, 33, 17);
        this.ctx.fillStyle = this.palette.light;

        this.ctx.fillRect(x+0.5, y+127.5, 32, 1);    

        if (idx % 16 === 9) {
            this.ctx.putImageData(this.loader.getImage("nowave"), x, y+118);
            this.ctx.putImageData(this.loader.getImage("drum"), x+3, y+123);
        } else if (chan.wave !== null) {
            this.ctx.fillStyle = this.palette.light;
            for(var i = 0; i < this.song.channels.length; i++) {
                var val = Math.round(chan.wave(i / 32) * 7.5);
                if (val >= 0) { val++; }
                this.ctx.fillRect(x+i+0.5, y+128.5, 1, -val);
            }
        }

        // frequency
        this.ctx.strokeRect(x, y+138, 33, 9);
        
        // hold/soft
        this.ctx.fillStyle = this.palette.dark;
        this.ctx.strokeStyle = this.palette.foreground;
        this.ctx.strokeRect(x, y+149, 15, 9);
        this.ctx.fillRect(x+2, y+151, 11, 5);
        this.ctx.strokeRect(x+2, y+151, 11, 5);
        this.ctx.strokeRect(x+18, y+149, 15, 9);
        this.ctx.fillRect(x+20, y+151, 11, 5);
        this.ctx.strokeRect(x+20, y+151, 11, 5);

        //VU meters
        for(var i = 0; i < 15; i++) {
            // volume
            this.ctx.strokeStyle = chan.volume >= (15-i)/15 ? this.palette.light : this.palette.dark;
            this.ctx.strokeRect(x+4, y+(i*3+26), 1, 1);
            // expression
            this.ctx.strokeStyle = chan.expression >= (15-i)/15 ? this.palette.light : this.palette.dark;
            this.ctx.strokeRect(x+9, y+(i*3+26), 1, 1);
            // sw. envelope
            this.ctx.strokeStyle = chan.envelope >= (15-i)/15 ? this.palette.light : this.palette.dark;
            this.ctx.strokeRect(x+14, y+(i*3+26), 1, 1);
            // output
            this.ctx.strokeStyle = chan.output >= (15-i)/15 ? this.palette.light : this.palette.dark;
            this.ctx.strokeRect(x+19, y+(i*3+26), 10, 1);
        }

        // draw pitchbend, panpot
        this.drawPan(x+2, y+77, chan.pitchbend);
        this.drawPan(x+2, y+88, chan.panpot);    

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);    

        var small = this.loader.getFont("small");

        //percussion (pc)
        var pcStr = "" + chan.percussion;
        pcStr = "000".substring(pcStr.length) + pcStr;
        small.drawTextRTL(this.ctx, pcStr, x+32, y+99, "#FFF");

        // cc0
        small.drawTextRTL(this.ctx, "000", x+32, y+110, "#FFF");

        // frequency
        var freqStr = "" + chan.freq;
        freqStr = "00000".substring(freqStr.length) + freqStr;
        small.drawTextRTL(this.ctx, freqStr, x+32, y+140, "#FFF");

        // mute
        this.ctx.putImageData(this.loader.getImage(chan.mute ? "muted" : "unmuted"), x+3, y+3);
        
        // labels for vu meters
        this.ctx.putImageData(this.loader.getImage("vulabels"), x+3, y+18);
    }

    public redraw() : void {
        this.drawLogos();
        this.drawBuffer();
        this.drawPositionSlider();
        this.drawSongInfo();
        this.drawLabels();
        for (var idx = 0; idx < this.song.channels.length; idx++) {
            this.drawChannel(idx);
        }
    }
}

class FontTest extends CanvasRenderer {
    constructor(manifest: string = "assets/manifest.json") {
        super(manifest);
    }

    public redraw() : void {
        this.testFont("small", 10, 10);
        this.testFont("medium", 10, 20);
        this.testFont("large", 10, 30);
        this.testFont("small", 10, 45, this.palette.foreground);
        this.testFont("medium", 10, 55, this.palette.foreground);
        this.testFont("large", 10, 65, this.palette.foreground);
    }

    public testFont(name: string, x: number, y: number, background?: string, rtl: boolean = false) : void {
        var font = this.loader.getFont(name);
        if (rtl) {
            font.drawTextRTL(this.ctx, font.charMap, x, y, background);
        } else {
            font.drawText(this.ctx, font.charMap, x, y, background);
        }
    }
}

var ui = new CanvasRenderer();