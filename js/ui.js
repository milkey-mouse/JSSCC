fonts = {
    space_width: 1,
    letter_spacing: 1,
    unloaded: 0,
    onLoaded: function() {}
};

maps = {
    large: "!\"#$%\&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~",
    medium: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,'",
    small: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
};

row_escapes = {
    large: [3, 4] //escapes the double quote. really hacky, i know
};

palette = {
    background: "#df825f",
    foreground: "#5c1f09"
};

images = {
    unloaded: 0,
    onLoaded: function() {}
};

function hexToRgb(hex) {
    // https://stackoverflow.com/a/5624139
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function replaceColors(imgdata, color) {
    var f = hexToRgb(color);
    for (var i = 0; i < imgdata.length; i+=4) {
        if(imgdata[i] === 0) {
            imgdata[i] = f.r;
            imgdata[i+1] = f.g;
            imgdata[i+2] = f.b;
            imgdata[i+3] = 255;
        } else {
            imgdata[i+3] = 0;
        }
    }
}

function drawText(font, text, x, y, color) {
    for(var i = 0; i < text.length; i++) {
        if (text[i] === " ") {
            x += fonts.space_width + fonts.letter_spacing;
            continue;
        }
        var charIdx = maps[font].indexOf(text[i]);
        if (charIdx === -1 || charIdx >= fonts[font].length) {
            console.log("warning: could not print character '" + text[i] + "'");
            x += fonts.space_width + fonts.letter_spacing;
        } else {
            var charImg = fonts[font][charIdx];
            var recolored = charImg.data.slice(0);
            replaceColors(recolored, color);
            ctx.putImageData(new ImageData(recolored, charImg.width, charImg.height), x, y);
            x += charImg.width + fonts.letter_spacing;
        }
    }
}

function setScale() {
    var width = window.innerWidth / ctx.canvas.width;
    var height = window.innerHeight / ctx.canvas.height;
    var scale = Math.max(1, Math.floor(Math.min(width, height)));
    ctx.canvas.style.width = ctx.canvas.width * scale + "px";
    ctx.canvas.style.height = ctx.canvas.height * scale + "px";
    ctx.scale(scale, scale);
}

function loadImage(name) {
    images.unloaded++;
    var img = new Image();
    img.onload = function() {
        images[name] = img;
        images.unloaded--;
        if (images.unloaded === 0) {
            images.onLoaded();
        }
    }
    img.src = "/assets/" + name + ".png";
}

function loadFont(name) {
    fonts.unloaded++;
    var img = new Image();
    img.onload = function() {
        fonts[name] = new Array();
        var imgCanvas = document.createElement('canvas');
        imgCanvas.width = img.width;
        imgCanvas.height = img.height;
        var imgCtx = imgCanvas.getContext("2d");
        imgCtx.fillStyle = "white";
        imgCtx.fillRect(0, 0, img.width, img.height);
        imgCtx.drawImage(img, 0, 0);
        var lastCut = 0;
        var charIdx = 0;
        for(var row = 0; row < img.width; row++) {
            if (name in row_escapes && row_escapes[name].indexOf(row) > -1) { continue; }
            var data = imgCtx.getImageData(row, 0, 1, img.height).data;
            for (var i = 0; i < data.length; i++) {
                if (data[i] != 255) {
                    break;
                }
            }
            if (i === data.length) {
                //this row is all white
                fonts[name][charIdx] = imgCtx.getImageData(lastCut, 0, row - lastCut, img.height);
                lastCut = row;
                charIdx++;
            }
        }
        fonts[name][charIdx] = imgCtx.getImageData(lastCut, 0, img.width - lastCut, img.height);
        imgCanvas.remove();
        fonts.unloaded--;
        if (fonts.unloaded === 0) {
            fonts.onLoaded();
        }
    }
    img.src = "/assets/fonts/" + name + ".png";
}

window.onresize = setScale;

window.onload = function() {
    document.body.style.backgroundColor = palette.background;
    ctx = document.getElementById("content").getContext("2d");
    ctx.canvas.width = 640;
    ctx.canvas.height = 445;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;
    setScale();
    ctx.fillStyle = palette.background;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.font = "25px monospace";
    ctx.fillStyle = palette.foreground;
    ctx.fillText("Loading fonts...", ctx.canvas.width/2, ctx.canvas.height/2);
    loadFont("small", fonts);
    loadFont("medium", fonts);
    loadFont("large", fonts);
};

fonts.onLoaded = function() {
    console.log("all fonts loaded");
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = palette.foreground;
    ctx.fillText("Loading images...", ctx.canvas.width/2, ctx.canvas.height/2);
    loadImage("logo");
    loadImage("midi");
    loadImage("scc");
    loadImage("gs");
    loadImage("xg");
};

images.onLoaded = function() {
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = palette.foreground;
    ctx.fillText("Finished loading", ctx.canvas.width/2, ctx.canvas.height/2);
    ctx.drawImage(images["logo"], 10, 10);
    drawText("small", "HELLO WORLD", 10, 100, palette.foreground);
    drawText("medium", "Hello, World", 10, 110, palette.foreground);
    drawText("large", maps["large"], 10, 120, palette.foreground);
};