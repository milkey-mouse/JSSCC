class JSSCC {
    private renderer: CanvasRenderer;
    private configRenderer: CanvasRenderer;

    private song: Song;

    private configOpen: boolean;

    constructor() {
        this.song = new Song();
        var loader = new AssetLoader();

        this.configOpen = false;

        // load the base manifest & clone the loader for each renderer
        loader.onload.push(() => {
            var uiLoader = loader.clone();
            uiLoader.add("assets/ui.json");
            this.renderer = new CanvasRenderer(uiLoader, this.song);
            uiLoader.onload.push(() => { this.addUIHitRegions(); });

            var configLoader = loader.clone();
            configLoader.add("assets/config.json");
            this.configRenderer = new CanvasRenderer(configLoader, this.song, "config", false);
            configLoader.onload.push(() => { this.addConfigHitRegions(); });
        });
        loader.add("assets/base.json");
    }

    public addUIHitRegions() {
        // add channel regions
        for (var i = 0; i < this.song.channels.length; i++) {
            var x = ((i % 16) * 36) + 58;
            var y = (Math.floor(i / 16) * 168) + 49;
            let chanIdx = i;

            // add mute button
            var region = this.renderer.autoRegion("channelMute", false, undefined, x, y);
            region.onmousedown.unshift((x: number, y: number) => {
                this.song.channels[chanIdx].mute = !this.song.channels[chanIdx].mute;
                this.renderer.drawChannel(chanIdx, "channelMute");
            });
        }

        // add position slider (& mouse handling)
        var positionSliderDG = this.renderer.loader.drawGroups["positionSlider"];
        var bounds = <number[]>positionSliderDG[positionSliderDG.length-1];

        var slider = this.renderer.autoRegion("positionSlider");
        slider.cursor = "ew-resize";
        var slideEvent = (e: MouseEvent) => {
            this.renderer.canvas.removeEventListener("mousemove", moveSlider, false);
            window.removeEventListener("mouseup", slideEvent, false);
        };
        var moveSlider = <EventListener>(e: MouseEvent) => {
            var x = e.offsetX / this.renderer.scale;
            if (x < bounds[1]) {
                this.song.position = 0;
            } else if (x > (bounds[1] + bounds[3])) {
                this.song.position = 1;
            } else {
                this.song.position = (x - bounds[1]) / bounds[3];
            }
            this.renderer.drawDGroup("positionSlider");
        };
        slider.onmousedown.unshift((x: number, y: number) => {
            moveSlider(<MouseEvent>{ offsetX: x, offsetY: y });
            this.renderer.canvas.addEventListener("mousemove", moveSlider, false);
            window.addEventListener("mouseup", slideEvent, false);
        });

        // Repeat button
        this.renderer.autoRegion("repeat").onmouseup.push((x: number, y: number) => {
            this.song.repeat = !this.song.repeat;
            Cookies.write("loop", this.song.repeat.toString());
        });

        // Top buttons (play, pause, etc.)
        this.renderer.autoRegion("play").onmouseup.push((x: number, y: number) => {
            this.song.playState = PlayState.PLAYING;
        });
        this.renderer.autoRegion("fastForward").onmouseup.push((x: number, y: number) => {
            this.song.playState = PlayState.FASTFORWARD;
        });
        this.renderer.autoRegion("stop").onmouseup.push((x: number, y: number) => {
            this.song.playState = PlayState.STOPPED;
        });
        this.renderer.autoRegion("pause").onmouseup.push((x: number, y: number) => {
            this.song.playState = PlayState.PAUSED;
        });
        this.renderer.autoRegion("export");
        this.renderer.autoRegion("config", true, () => { this.openConfig(); });

        // GitHub link
        var link = this.renderer.autoRegion("githubLink", false);
        link.cursor = "pointer";
        link.onmousedown.push(() => {
            window.location.assign("https://github.com/milkey-mouse/JSSCC");
        });
        link.onenter.push(() => {
            this.renderer.drawDGroup("githubLink");
        });
        link.onexit.push(() => {
            this.renderer.drawDGroup("githubLink");
        });
    }

    public addConfigHitRegions() {
        var windowGroup = this.configRenderer.loader.drawGroups["preferencesWindow"];
        var windowBounds = <number[]>windowGroup[windowGroup.length - 1].slice(1);
        var width = windowBounds[2];
        var height = windowBounds[3];

        var windowX = (this.configRenderer.canvas.width - width) / 2;
        var windowY = (this.configRenderer.canvas.height - height) / 2;

        var close = new HitRegion((this.configRenderer.canvas.width + width) / 2 - 23, windowY + 5, 16, 15);
        close.onmousedown.push(() => { this.closeConfig(); });
        this.configRenderer.hitDetector.addHitRegion(close, "close");

        this.configRenderer.autoRegion("preferencesColorPalette", true, undefined, windowX, windowY);
    }

    public openConfig() {
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
        var windowBounds = <number[]>windowGroup[windowGroup.length - 1].slice(1);
        var windowX = (this.configRenderer.canvas.width - windowBounds[2]) / 2;
        var windowY = (this.configRenderer.canvas.height - windowBounds[3]) / 2;
        this.configRenderer.drawAllGroupsWithName("preferences", windowX, windowY);
    }

    public closeConfig() {
        this.configOpen = false;

        // hide the config window
        this.configRenderer.canvas.style.visibility = "hidden";

        // the next update for the mouseovers won't run until after this
        // stuff is drawn, so we have to set the mouseover state manually
        this.renderer.hitDetector.onMouseMove(<MouseEvent>{ offsetX: 0, offsetY: 0 });
        this.renderer.drawDGroup("config");

        // reset the background color and rerender the (now unpressed) config button
        document.body.style.backgroundColor = this.configRenderer.palette.background;
    }

    public switchPalette(name?: string) {
        this.renderer.switchPalette(name);
        this.configRenderer.switchPalette(name);
    }
}