class HitRegion {
    x: number;
    y: number;
    w: number;
    h: number;

    over: boolean;
    cursor: string | null;

    onmousedown: ((x: number, y: number) => void) | null;
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
        this.onenter = null;
        this.onexit = null;
    }
}

class HitDetector {
    // there are some experimental canvas features for doing something
    // similar with addHitRegion and friends, but this works fine
    private unnamedRegionsCount: number;
    private ctx: CanvasRenderingContext2D;
    public regions: { [name: string]: HitRegion };

    constructor(ctx: CanvasRenderingContext2D) {
        this.unnamedRegionsCount = 0;
        this.regions = {};
        this.ctx = ctx;

        // use lambdas to have the right context for 'this'
        ctx.canvas.addEventListener("mousedown", (e: MouseEvent) => { this.onMouseDown(e); }, false);
        ctx.canvas.addEventListener("mousemove", (e: MouseEvent) => { this.onMouseMove(e); }, false);
    }

    public onMouseDown(event: MouseEvent) {
        for (var regionName in this.regions) {
            let r = this.regions[regionName];
            if (r.onmousedown !== null &&
                event.offsetY >= r.y && event.offsetY <= r.y + r.h &&
                event.offsetX >= r.x && event.offsetX <= r.x + r.w) {
                r.onmousedown(event.offsetX, event.offsetY);
            }
        }
    }

    public onMouseMove(event: MouseEvent) {
        this.ctx.canvas.style.cursor = "auto";
        for (var regionName in this.regions) {
            let r = this.regions[regionName];
            let over = event.offsetY >= r.y && event.offsetY <= r.y + r.h &&
                event.offsetX >= r.x && event.offsetX <= r.x + r.w;
            if (over && r.cursor !== null) {
                this.ctx.canvas.style.cursor = r.cursor;
            }
            if (over === true && r.over === false) {
                if (r.onenter !== null) { r.onenter(); }
                r.over = true;
            } else if (over === false && r.over === true) {
                if (r.onexit !== null) { r.onexit(); }
                r.over = false;
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