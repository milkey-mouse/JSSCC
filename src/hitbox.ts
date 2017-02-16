class HitRegion {
    x: number;
    y: number;
    w: number;
    h: number;

    over: boolean;
    cursor: string | null;

    onmousedown: ((x: number, y: number) => void)[];
    onmouseup: ((x: number, y: number) => void)[];
    onenter: (() => void)[];
    onexit: (() => void)[];

    constructor(x: number, y: number, width: number, height: number) {
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
}

class HitDetector {
    // there are some experimental canvas features for doing something
    // similar with addHitRegion and friends, but this works fine
    private ctx: CanvasRenderingContext2D;

    public scale: number;
    public mouseDown: boolean;

    private namespace: string;
    private regions: { [name: string]: { [name: string]: HitRegion } };

    constructor(ctx: CanvasRenderingContext2D) {
        this.mouseDown = false;
        this.ctx = ctx;
        this.scale = 1;

        this.namespace = "default";
        this.regions = {};
        this.regions[this.namespace] = {};

        // use lambdas to have the right context for 'this'
        this.ctx.canvas.addEventListener("mousedown", (e: MouseEvent) => { this.onMouseDown(e); }, false);
        this.ctx.canvas.addEventListener("mousemove", (e: MouseEvent) => { this.onMouseMove(e); }, false);
        this.ctx.canvas.addEventListener("mouseup", (e: MouseEvent) => { this.onMouseUp(e); }, false);
    }

    public onMouseDown(event: MouseEvent): void {
        if (event.button !== 0) { return; }
        var mouseX: number = event.offsetX / this.scale;
        var mouseY: number = event.offsetY / this.scale;
        this.mouseDown = true;
        for (var regionName in this.regions[this.namespace]) {
            let r = this.regions[this.namespace][regionName];
            if (r !== undefined && r.onmousedown.length > 0 &&
                mouseY >= r.y && mouseY <= r.y + r.h &&
                mouseX >= r.x && mouseX <= r.x + r.w) {
                for (var i = 0; i < r.onmousedown.length; i++) {
                    r.onmousedown[i](mouseX, mouseY);
                }
            }
        }
    }

    public onMouseUp(event: MouseEvent): void {
        if (event.button !== 0) { return; }
        var mouseX: number = event.offsetX / this.scale;
        var mouseY: number = event.offsetY / this.scale;
        this.mouseDown = false;
        for (var regionName in this.regions[this.namespace]) {
            let r = this.regions[this.namespace][regionName];
            if (r !== undefined && r.onmouseup.length > 0 &&
                mouseY >= r.y && mouseY <= r.y + r.h &&
                mouseX >= r.x && mouseX <= r.x + r.w) {
                for (var i = 0; i < r.onmouseup.length; i++) {
                    r.onmouseup[i](mouseX, mouseY);
                }
            }
        }
    }

    public onMouseMove(event: MouseEvent): void {
        var mouseX: number = event.offsetX / this.scale;
        var mouseY: number = event.offsetY / this.scale;
        this.ctx.canvas.style.cursor = "auto";
        for (var regionName in this.regions[this.namespace]) {
            let r = this.regions[this.namespace][regionName];
            if (r === undefined) { continue; }
            let over = mouseY >= r.y && mouseY <= r.y + r.h &&
                mouseX >= r.x && mouseX <= r.x + r.w;
            if (over && r.cursor !== null) {
                this.ctx.canvas.style.cursor = r.cursor;
            }
            if (over === true && r.over === false) {
                r.over = true;
                for (var i = 0; i < r.onenter.length; i++) {
                    r.onenter[i]();
                }
            } else if (over === false && r.over === true) {
                r.over = false;
                for (var i = 0; i < r.onexit.length; i++) {
                    r.onexit[i]();
                }
            }
        }
    }

    public switchNamespace(ns: string) {
        // i wish JavaScript had defaultdicts
        if (this.regions[ns] === undefined) {
            this.regions[ns] = {};
        }
        this.namespace = ns;
    }

    public isOver(name: string) {
        return this.regions[this.namespace][name] !== undefined && this.regions[this.namespace][name].over;
    }

    public isDown(name: string) {
        return this.mouseDown && this.isOver(name);
    }

    public addHitRegion(r: HitRegion, key: string = "region"): string {
        if (this.regions[this.namespace][key] !== undefined) {
            var i = 2;
            while (this.regions[this.namespace][key + i] !== undefined) { i++; }
            key = key + i;
        }
        this.regions[this.namespace][key] = r;
        return key;
    }

    public removeHitRegion(key: string): void {
        delete this.regions[this.namespace][key];
    }

    public clearHitRegions(): void {
        this.regions[this.namespace] = {};
    }
}