fonts = {
    space_width: 1,
    letter_spacing: 1,
    unloaded: 0,
    onLoaded: function() {}
};

maps = {
    large: "!\"#$%\&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~",
    medium: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,'()+",
    small: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
};

row_escapes = {
    large: [3, 4] //escapes the double quote. stupid hack
};

palette = {
    background: "#df825f",
    foreground: "#5c1f09",
    light: "#B2593F"
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

function replaceColors(imgdata, bgdata, color) {
    var f = hexToRgb(color);
    for (var i = 0; i < imgdata.length; i+=4) {
        if(imgdata[i] === 0) {
            imgdata[i] = f.r;
            imgdata[i+1] = f.g;
            imgdata[i+2] = f.b;
            imgdata[i+3] = 255;
        } else {
            imgdata[i] = bgdata[i];
            imgdata[i+1] = bgdata[i+1];
            imgdata[i+2] = bgdata[i+2];
            imgdata[i+3] = bgdata[i+3];
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
            replaceColors(recolored, ctx.getImageData(x, y, charImg.width, charImg.height).data, color);
            ctx.putImageData(new ImageData(recolored, charImg.width, charImg.height), x, y);
            x += charImg.width + fonts.letter_spacing;
        }
    }
}

function drawChannel(x, y) {
    ctx.strokeStyle = palette.foreground;
    ctx.lineWidth = "1px";
    ctx.translate(0.5, 0.5);

    // mute/poly
    ctx.strokeRect(x, y, 33, 13);
    ctx.strokeRect(x+16, y+2, 15, 9);
    ctx.fillStyle = palette.foreground;
    ctx.fillRect(x+18, y+4, 11, 5);
    ctx.strokeStyle = palette.light;
    ctx.strokeRect(x+18, y+4, 11, 5);
    // image is done after translation is removed

    ctx.strokeStyle = palette.foreground

    // volume/expression/sw. envelope
    ctx.strokeRect(x, y+15, 33, 58);
    ctx.strokeRect(x+2, y+24, 5, 47);
    ctx.strokeRect(x+7, y+24, 5, 47);
    ctx.strokeRect(x+12, y+24, 5, 47);
    ctx.strokeRect(x+17, y+24, 14, 47);
    // image is done after translation is removed

    // pitchbend
    ctx.strokeRect(x, y+75, 33, 9);
    
    // panpot
    ctx.strokeRect(x, y+86, 33, 9);
    
    // pc
    ctx.strokeRect(x, y+97, 33, 9);
    
    // cc0
    ctx.strokeRect(x, y+108, 33, 9);

    // waveform
    ctx.strokeRect(x, y+119, 33, 17);
    
    // frequency
    ctx.strokeRect(x, y+138, 33, 9);
    
    // hold/soft
    ctx.fillStyle = "#B2593F";
    ctx.strokeStyle = palette.foreground;
    ctx.strokeRect(x, y+149, 15, 9);
    ctx.fillRect(x+2, y+151, 11, 5);
    ctx.strokeRect(x+2, y+151, 11, 5);
    ctx.strokeRect(x+18, y+149, 15, 9);
    ctx.fillRect(x+20, y+151, 11, 5);
    ctx.strokeRect(x+20, y+151, 11, 5);

    ctx.translate(-0.5, -0.5);

    ctx.drawImage(images["mute"], x+3, y+3);
    ctx.drawImage(images["vu-labels"], x+3, y+18);
}

function drawChannels() {
    for (var x = 58; x <= 598; x += 36) {
        drawChannel(x, 49);
    }
    for (var x = 58; x <= 598; x += 36) {
        drawChannel(x, 217);
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
    ctx.canvas.width = 634;
    ctx.canvas.height = 444;
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
    loadImage("vu-labels");
    loadImage("logo");
    loadImage("midi");
    loadImage("mute");
    loadImage("scc");
    loadImage("gs");
    loadImage("xg");
};

images.onLoaded = function() {
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(images["logo"], 15, 10);
    drawText("medium", "Alpha v. 0.0.1", 33, 39, "#FFF");
    drawText("medium", "(C) 2016 meme.institute + Milkey Mouse", 433, 4, palette.light);
    drawText("medium", "(C) 2016 meme.institute + Milkey Mouse", 432, 3, "#FFF");
    drawText("medium", "Inspired by Gashisoft's GXSCC", 472, 14, palette.light);
    drawChannels();
};