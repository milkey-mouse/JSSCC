class CanvasUI {
    ctx: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
    
    public init(): void {
        this.canvas = <HTMLCanvasElement>document.getElementById("content");
        this.canvas.width = 634;
        this.canvas.height = 444;

        this.ctx = this.canvas.getContext("2d");
        this.ctx.fillStyle = palette.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.textBaseline = "middle";
        this.ctx.textAlign = "center";
        this.ctx.font = "25px monospace";
        this.ctx.fillStyle = palette.foreground;
        this.ctx.fillText("Loading fonts...", this.canvas.width/2, this.canvas.height/2);
        this.rescale();

    }

    public rescale() {
        if (this.ctx == null) { return; }
        var width : Number = window.innerWidth / this.canvas.width;
        var height : Number = window.innerHeight / this.canvas.height;
    }
}

var ui = new CanvasUI();
window.addEventListener("load", ui.init, false);
window.addEventListener("resize", ui.rescale, false);