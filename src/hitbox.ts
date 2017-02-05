class HitRegion {
    x: number;
    y: number;
    w: number;
    h: number;

    over: boolean;
    cursor: string | null;

    onmousedown: ((x: number, y: number) => void) | null;
    onmouseup: ((x: number, y: number) => void) | null;
    onenter: (() => void) | null;
    onexit: (() => void) | null;

    constructor(x: number, y: number, width: number, height: number) {
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
}

class HitDetector {
    // there are some experimental canvas features for doing something
    // similar with addHitRegion and friends, but this works fine
    private unnamedRegionsCount: number;
    private ctx: CanvasRenderingContext2D;

    public scale: number;
    public mouseDown: boolean;
    public regions: { [name: string]: HitRegion };

    constructor(ctx: CanvasRenderingContext2D) {
        this.unnamedRegionsCount = 0;
        this.mouseDown = false;
        this.regions = {};
        this.ctx = ctx;
        this.scale = 1;

        // use lambdas to have the right context for 'this'
        ctx.canvas.addEventListener("mousedown", (e: MouseEvent) => { this.onMouseDown(e); }, false);
        ctx.canvas.addEventListener("mousemove", (e: MouseEvent) => { this.onMouseMove(e); }, false);
        ctx.canvas.addEventListener("mouseup", (e: MouseEvent) => { this.onMouseUp(e); }, false);
    }

    public onMouseDown(event: MouseEvent): void {
        if (event.button !== 0) { return; }
        var mouseX: number = event.offsetX / this.scale;
        var mouseY: number = event.offsetY / this.scale;
        this.mouseDown = true;
        for (var regionName in this.regions) {
            let r = this.regions[regionName];
            if (r != null && r.onmousedown !== null &&
                mouseY >= r.y && mouseY <= r.y + r.h &&
                mouseX >= r.x && mouseX <= r.x + r.w) {
                r.onmousedown(mouseX, mouseY);
            }
        }
    }

    public onMouseUp(event: MouseEvent): void {
        if (event.button !== 0) { return; }
        var mouseX: number = event.offsetX / this.scale;
        var mouseY: number = event.offsetY / this.scale;
        this.mouseDown = false;
        for (var regionName in this.regions) {
            let r = this.regions[regionName];
            if (r != null && r.onmouseup !== null &&
                mouseY >= r.y && mouseY <= r.y + r.h &&
                mouseX >= r.x && mouseX <= r.x + r.w) {
                r.onmouseup(mouseX, mouseY);
            }
        }
    }

    public onMouseMove(event: MouseEvent): void {
        if (event.button !== 0) { return; }
        var mouseX: number = event.offsetX / this.scale;
        var mouseY: number = event.offsetY / this.scale;
        this.ctx.canvas.style.cursor = "auto";
        for (var regionName in this.regions) {
            let r = this.regions[regionName];
            if (r == null) { break; }
            let over = mouseY >= r.y && mouseY <= r.y + r.h &&
                mouseX >= r.x && mouseX <= r.x + r.w;
            if (over && r.cursor !== null) {
                this.ctx.canvas.style.cursor = r.cursor;
            }
            if (over === true && r.over === false) {
                r.over = true;
                if (r.onenter !== null) { r.onenter(); }
            } else if (over === false && r.over === true) {
                r.over = false;
                if (r.onexit !== null) { r.onexit(); }
            }
        }
    }

    public addHitRegion(r: HitRegion, key?: string): string {
        if (key == null) {
            key = "region" + this.unnamedRegionsCount;
            this.unnamedRegionsCount++;
        }
        this.regions[key] = r;
        return key;
    }

    public removeHitRegion(key: string): void {
        delete this.regions[key];
    }

    public clearHitRegions(): void {
        this.regions = {};
    }
}