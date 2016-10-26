var CanvasUI = (function () {
    function CanvasUI() {
    }
    CanvasUI.prototype.init = function () {
        this.canvas = document.getElementById("content");
        this.canvas.width = 634;
        this.canvas.height = 444;
        this.ctx = this.canvas.getContext("2d");
        this.ctx.fillStyle = palette.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.textBaseline = "middle";
        this.ctx.textAlign = "center";
        this.ctx.font = "25px monospace";
        this.ctx.fillStyle = palette.foreground;
        this.ctx.fillText("Loading fonts...", this.canvas.width / 2, this.canvas.height / 2);
        this.rescale();
    };
    CanvasUI.prototype.rescale = function () {
        if (this.ctx == null) {
            return;
        }
        var width = window.innerWidth / this.canvas.width;
        var height = window.innerHeight / this.canvas.height;
    };
    return CanvasUI;
}());
var ui = new CanvasUI();
window.addEventListener("load", ui.init, false);
window.addEventListener("resize", ui.rescale, false);
