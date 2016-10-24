fonts = {
    space_width: 2,
    letter_spacing: 1,
    unloaded: 0,
    onLoaded: function() {}
};

maps = {
    large: "!\"#$%\&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~",
    medium: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,'()+/:-",
    small: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ./':"
};

//escapes the double quote & leading space. stupid hack
row_escapes = {
    large: [0, 4, 5],
    medium: [0,],
    small: [0,]
};

palette = {
    background: "#df825f",
    foreground: "#5c1f09",
    dark: "#b2593f",
    light: "#ffd2a2"
};

images = {
    unloaded: 0,
    onLoaded: function() {}
};

elements = [];
channels = [];
midiFile = null;

filePath = "Drag and drop a MIDI file into this window to play";

for (var i = 0; i < 32; i++) {
    channels.push({
        mute: false,
        volume: null,
        expression: null,
        envelope: null,
        output: null,
        pitchbend: null,
        panpot: null,
        percussion: 0,
        cc0: 0,
        freq: 0,
        wave: function(x) { return Math.sin((x+1)*Math.PI); }
    });
}

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

function replaceColors(outdata, imgdata, bgdata, color) {
    var f = hexToRgb(color);
    for (var i = 0; i < imgdata.length; i+=4) {
        if(imgdata[i] === 0) {
            outdata[i] = f.r;
            outdata[i+1] = f.g;
            outdata[i+2] = f.b;
            outdata[i+3] = 255;
        } else {
            outdata[i] = bgdata[i];
            outdata[i+1] = bgdata[i+1];
            outdata[i+2] = bgdata[i+2];
            outdata[i+3] = bgdata[i+3];
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
            console.warn("could not print character '" + text[i] + "'");
            x += fonts.space_width + fonts.letter_spacing;
        } else {
            var charImg = fonts[font][charIdx];
            var composited = ctx.createImageData(charImg.width, charImg.height);
            replaceColors(composited.data, charImg.data, ctx.getImageData(x, y, charImg.width, charImg.height).data, color);
            ctx.putImageData(composited, x, y);
            x += charImg.width + fonts.letter_spacing;
        }
    }
}

function drawTextRTL(font, text, x, y, color) {
    for(var i = text.length-1; i >= 0; i--) {
        if (text[i] === " ") {
            x -= fonts.space_width + fonts.letter_spacing;
            continue;
        }
        var charIdx = maps[font].indexOf(text[i]);
        if (charIdx === -1 || charIdx >= fonts[font].length) {
            console.warn("could not print character '" + text[i] + "'");
            x -= fonts.space_width + fonts.letter_spacing;
        } else {
            var charImg = fonts[font][charIdx];
            var composited = ctx.createImageData(charImg.width, charImg.height);
            replaceColors(composited.data, charImg.data, ctx.getImageData(x-charImg.width, y, charImg.width, charImg.height).data, color);
            ctx.putImageData(composited, x-charImg.width, y);
            x -= charImg.width + fonts.letter_spacing;
        }
    }
}

function polyToColor(poly) {
    return palette.foreground; // TODO
}

function drawPan(x, y, val) {
    for(var i = -8; i <= 8; i++) {
        if (i === 0) {
            continue;
        } else if (val === null) {
            ctx.strokeStyle = palette.dark; 
        } else if (Math.abs(i) === 1) {
            ctx.strokeStyle = "#ff9f00";
        } else if(val > 0 === i > 0 && Math.abs(val) >= Math.abs(i/8)) {
            ctx.strokeStyle = palette.light;
        } else {
            ctx.strokeStyle = palette.dark;
        }
        var height = Math.floor(Math.abs(i) / 2 + 1.5);
        ctx.strokeRect(x+(i*2)+(i > 0 ? 13 : 16), y+5-height, 0, height);
    }
}

function drawChannel(idx) {
    var x = ((idx % 16) * 36) + 58;
    var y = (Math.floor(idx / 16) * 168) + 49;
    var chan = channels[idx];
    ctx.lineWidth = 1;
    ctx.setTransform(scale, 0, 0, scale, 0.5, 0.5);

    //ctx.fillStyle = palette.background;
    //ctx.fillRect(x, y, 33, 158);
    
    // mute/poly
    ctx.strokeStyle = palette.foreground;
    ctx.strokeRect(x, y, 33, 13);
    ctx.strokeRect(x+16, y+2, 15, 9);
    ctx.fillStyle = polyToColor(chan.poly);
    ctx.fillRect(x+18, y+4, 11, 5);
    ctx.strokeStyle = palette.dark;
    ctx.strokeRect(x+18, y+4, 11, 5);
    ctx.strokeStyle = palette.foreground;
    // image is done after translation is removed

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
    
    // percussion (pc)
    ctx.strokeRect(x, y+97, 33, 9);
    
    // cc0
    ctx.strokeRect(x, y+108, 33, 9);

    // waveform
    if (idx % 16 === 9) {
        ctx.drawImage(images.nowave, x-0.5, y+118.5);
        ctx.drawImage(images.drum, x+2.5, y+123.5);
    } else {
        ctx.fillStyle = palette.background;
        ctx.fillRect(x, y+119, 33, 17);
        ctx.strokeRect(x, y+119, 33, 17);

        ctx.fillStyle = palette.light;

        if (chan.wave !== null) {
            ctx.fillRect(x+0.5, y+127.5, 32, 1);
            for(var i = 0; i < 32; i++) {
                ctx.fillRect(x+i+0.5, y+127.5, 1, chan.wave(i/16)*8);
            }
        }
    }

    // frequency
    ctx.strokeRect(x, y+138, 33, 9);
    
    // hold/soft
    ctx.fillStyle = palette.dark;
    ctx.strokeStyle = palette.foreground;
    ctx.strokeRect(x, y+149, 15, 9);
    ctx.fillRect(x+2, y+151, 11, 5);
    ctx.strokeRect(x+2, y+151, 11, 5);
    ctx.strokeRect(x+18, y+149, 15, 9);
    ctx.fillRect(x+20, y+151, 11, 5);
    ctx.strokeRect(x+20, y+151, 11, 5);

    //VU meters
    for(var i = 0; i < 15; i++) {
        // volume
        ctx.strokeStyle = chan.volume >= (15-i)/15 ? palette.light : palette.dark;
        ctx.strokeRect(x+4, y+(i*3+26), 1, 1);
        // expression
        ctx.strokeStyle = chan.expression >= (15-i)/15 ? palette.light : palette.dark;
        ctx.strokeRect(x+9, y+(i*3+26), 1, 1);
        // sw. envelope
        ctx.strokeStyle = chan.envelope >= (15-i)/15 ? palette.light : palette.dark;
        ctx.strokeRect(x+14, y+(i*3+26), 1, 1);
        // output
        ctx.strokeStyle = chan.output >= (15-i)/15 ? palette.light : palette.dark;
        ctx.strokeRect(x+19, y+(i*3+26), 10, 1);
    }

    // draw pitchbend, panpot
    drawPan(x+2, y+77, chan.pitchbend);
    drawPan(x+2, y+88, chan.panpot);    

    ctx.setTransform(scale, 0, 0, scale, 0, 0);    

    var old_spacing = fonts.letter_spacing;
    fonts.letter_spacing = 0;

    //percussion (pc)
    var pcStr = "" + chan.percussion;
    pcStr = "000".substring(pcStr.length) + pcStr;
    drawTextRTL("small", pcStr, x+32, y+99, "#FFF");

    // cc0
    drawTextRTL("small", "000", x+32, y+110, "#FFF");

    // frequency
    var freqStr = "" + chan.freq;
    freqStr = "00000".substring(freqStr.length) + freqStr;
    drawTextRTL("small", freqStr, x+32, y+140, "#FFF");

    // mute
    ctx.drawImage(chan.mute ? images.muted : images.unmuted, x+3, y+3);
    
    // labels for vu meters
    ctx.drawImage(images.vulabels, x+3, y+18);

    fonts.letter_spacing = old_spacing;
}

function drawChannels() {
    for (var idx = 0; idx < 32; idx++) {
        drawChannel(idx);
    }
}

function setScale() {
    var width = window.innerWidth / ctx.canvas.width;
    var height = window.innerHeight / ctx.canvas.height;
    scale = Math.max(1, Math.floor(Math.min(width, height)));
    ctx.canvas.style.width = ctx.canvas.width * scale + "px";
    ctx.canvas.style.height = ctx.canvas.height * scale + "px";
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

function loadImage(name) {
    images.unloaded++;
    var img = new Image(); //document.createElement("img");
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
        var imgCanvas = document.createElement("canvas");
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
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = palette.foreground;
    ctx.fillText("Loading images...", ctx.canvas.width/2, ctx.canvas.height/2);
    loadImage("sparkles");
    loadImage("vulabels");
    loadImage("pointer");
    loadImage("unmuted");
    loadImage("nowave");
    loadImage("muted");
    loadImage("drum");
    loadImage("logo");
    loadImage("midi");
    loadImage("scc");
    loadImage("gs");
    loadImage("xg");
};

function createMuteButtons() {
    for (var y = 49; y <= 217; y += 168) {
        elements.push({
            x: 58,
            y: y,
            width: 632,
            height: 14,
            over: false,
            onmousedown: function(x, y) {
                var x = (x - 58) / 36;
                var y = (y - 49) / 168;
                var idx = (Math.round(y)*16)+Math.floor(x);
                channels[idx].mute = !channels[idx].mute;
                drawChannel(idx);
            },
            onenter: function() { },
            onexit: function() { }
        });
    }
}

function  drawTextured(_x, _y, w, h) {
    ctx.fillStyle = palette.dark;
    var checkered = ctx.createImageData(1, h);
    var d = checkered.data;
    var f = hexToRgb(palette.dark);
    for(var y = 0; y < checkered.data.length; y+=8) {
        d[y] = 0;
        d[y+1] = 0;
        d[y+2] = 0;
        d[y+3] = 0;
        
        d[y+4] = f.r;
        d[y+5] = f.g;
        d[y+6] = f.b;
        d[y+7] = 255;
    }
    for(var x = 0; x+4 <= w; x+=4) {
        ctx.putImageData(checkered, _x+x, _y);
        ctx.fillRect(_x+x+1, _y, 2, h);
    }
}

function drawLogos() {
    ctx.drawImage(images.logo, 15, 10);
    ctx.drawImage(images.sparkles, 424, 4);
    drawTextured(358, 400, 64, 32);
    ctx.drawImage(images.midi, 436, 412);
    ctx.drawImage(images.gs, 482, 413);
    ctx.drawImage(images.xg, 525, 413);
    ctx.drawImage(images.scc, 575, 413);
    fonts.letter_spacing = 0;
    drawText("medium", "Alpha v. 0.0.1", 39, 39, "#FFF");
    drawText("medium", "(C) 2016 meme.institute + Milkey Mouse", 453, 4, palette.dark);
    drawText("medium", "(C) 2016 meme.institute + Milkey Mouse", 452, 3, "#FFF");
    drawText("medium", "Inspired by Gashisoft's GXSCC", 492, 14, palette.dark);
    drawText("medium", "This project is open source: https://github.com/milkey-mouse/JSSCC", 44, 435, palette.dark);
}

function drawLabels() {
    drawTextRTL("small", "BUFFER", 410, 35, palette.foreground);    
    ctx.drawImage(images.pointer, 412, 27);
    drawText("small", "OUT", 420, 25, palette.foreground);    
    ctx.drawImage(images.pointer, 446, 27);
    drawText("small", "DANGER", 454, 25, palette.foreground);    
    ctx.drawImage(images.pointer, 520, 27);
    drawText("small", "GOOD", 528, 25, palette.foreground);    
    ctx.drawImage(images.pointer, 595, 27);
    drawText("small", "GREAT", 603, 25, palette.foreground); 
    for (var y = 53; y <= 221; y += 168)
    {
            drawTextRTL("small", "MUTE/POLY", 54, y, palette.foreground);
            drawTextRTL("small", "VOLUME", 54, y+13, palette.foreground);
            drawTextRTL("small", "EXPRESSION", 54, y+21, palette.foreground);
            drawTextRTL("small", "SW.ENVELOPE", 54, y+29, palette.foreground);
            drawTextRTL("small", "OUTPUT", 54, y+45, palette.foreground);
            drawTextRTL("small", "PITCHBEND", 54, y+73, palette.foreground);
            drawTextRTL("small", "PANPOT", 54, y+84, palette.foreground);
            drawTextRTL("small", "PC", 54, y+96, palette.foreground);
            drawTextRTL("small", "CC0", 54, y+106, palette.foreground);
            drawTextRTL("small", "WAVE", 54, y+121, palette.foreground);
            drawTextRTL("small", "FREQUENCY", 54, y+136, palette.foreground);
            drawTextRTL("small", "HOLD/SOFT", 54, y+147, palette.foreground);
    }
    drawTextRTL("small", "SONG", 54, 388, palette.foreground);
    drawTextRTL("small", "POSITION", 54, 407, palette.foreground);                   
    drawTextRTL("small", "TICK", 54, 423, palette.foreground);
    drawText("small", "BPM", 138, 423, palette.foreground);
    drawText("small", "TB", 184, 423, palette.foreground);    
}

function drawBuffer(buffer) {
    ctx.setTransform(scale, 0, 0, scale, 0.5, 0.5);
    ctx.fillStyle = palette.background;
    ctx.fillRect(412, 32, 219, 9);
    ctx.fillStyle = palette.light;
    ctx.fillRect(412, 32, Math.round(219*buffer), 9);
    ctx.strokeStyle = palette.light;
    ctx.strokeRect(412+Math.round(219*buffer), 32, 1, 9);
    ctx.strokeStyle = palette.foreground;
    ctx.strokeRect(412, 32, 219, 9);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

function drawPositionSlider(position) {
    ctx.setTransform(scale, 0, 0, scale, 0.5, 0.5);
    ctx.fillStyle = palette.background;
    ctx.fillRect(58, 402, 236, 16);
    ctx.fillStyle = palette.dark;
    ctx.fillRect(58, 402, Math.round(236*position), 16);
    ctx.strokeStyle = palette.dark;
    ctx.strokeRect(58+Math.round(236*position), 402, 1, 16);
    ctx.strokeStyle = palette.foreground;
    ctx.strokeRect(58, 402, 236, 16);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

function drawSongInfo(position, buffer) {
    drawBuffer(buffer);
    drawPositionSlider(position);

    ctx.setTransform(scale, 0, 0, scale, 0.5, 0.5);

    // song name
    ctx.fillStyle = palette.dark;
    ctx.strokeStyle = palette.dark;
    ctx.fillRect(58, 383, 573, 14);
    ctx.strokeRect(58, 383, 573, 14);

    // tick, bpm, tb
    ctx.fillStyle = palette.background;
    ctx.strokeStyle = palette.foreground;
    ctx.fillRect(58, 421, 74, 9);
    ctx.strokeRect(58, 421, 74, 9);

    ctx.fillRect(159, 421, 20, 9);
    ctx.strokeRect(159, 421, 20, 9);

    ctx.fillRect(198, 421, 20, 9);
    ctx.strokeRect(198, 421, 20, 9);

    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    // song name
    drawText("large", filePath, 60, 385, "#FFD2A2");

    // tick, bpm, tb
    drawTextRTL("small", "00 : 00 : 00'000", 130, 423, "#FFF");
    drawTextRTL("small", "000", 178, 423, "#FFF");
    drawTextRTL("small", "000", 217, 423, "#FFF");
}

function redraw() {
    drawLogos();
    drawSongInfo(0.2, 0.75);
    drawLabels();
    drawChannels();
}

function roundRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
     ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.stroke();
}

function processFile(file) {
    filePath = file.name;
    drawSongInfo();

    var reader = new FileReader();
    reader.addEventListener("loadend", function (e) {
        if (reader.readyState === 2) {
            if (reader.error !== null) {
                console.error(reader.error);
                return;
            }
            midiFile = new MIDIFile(reader.result);
        }
    }, false);
    reader.readAsArrayBuffer(file);
}

images.onLoaded = function() {
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.canvas.addEventListener("mousedown", function(event) {
        var x = event.pageX - ctx.canvas.offsetLeft;
        var y = event.pageY - ctx.canvas.offsetTop;

        elements.forEach(function(e) {
            if (y > e.y && y < e.y + e.height && x > e.x && x < e.x + e.width) { 
                e.onmousedown(x, y);
            }
        });
    });
    ctx.canvas.addEventListener("mousemove", function(event) {
        var x = event.pageX - ctx.canvas.offsetLeft;
        var y = event.pageY - ctx.canvas.offsetTop;

        elements.forEach(function(e) {
            var over = y > e.y && y < e.y + e.height && x > e.x && x < e.x + e.width;
            if (over === true && e.over === false) { 
                e.onenter();
                e.over = true;
            } else if (over === false && e.over === true) {
                e.onexit();
                e.over = false;
            }
        });
    });
    ctx.canvas.addEventListener("dragenter", function(e) {
        if (window.tempCanvas === undefined || window.tempCanvas === null) { tempCanvas = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height); }
        ctx.fillStyle = palette.background;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = palette.foreground;
        ctx.fillText("Drop a MIDI here", ctx.canvas.width/2, ctx.canvas.height/2);
        ctx.strokeStyle = palette.foreground;
        ctx.lineWidth = 7.5;
        ctx.setLineDash([12.5, 12.5]);
        roundRect(25, 25, ctx.canvas.width - 50, ctx.canvas.height - 50, 40);
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        e.preventDefault();
    }, false);
    ctx.canvas.addEventListener("dragover", function(e) { e.preventDefault(); }, false);
    ctx.canvas.addEventListener("dragleave", function(e) {
        if (window.tempCanvas !== undefined && window.tempCanvas !== null) {
            ctx.putImageData(tempCanvas, 0, 0);
            tempCanvas = null;
        } else {
            redraw();
        }
        e.preventDefault();
    }, false);
    ctx.canvas.addEventListener("drop", function(e){
        if (tempCanvas !== undefined && tempCanvas !== null) {
            ctx.putImageData(tempCanvas, 0, 0);
            tempCanvas = null;
        } else {
            ctx.fillStyle = palette.background;
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            redraw();
        }
        if (e.dataTransfer !== null && e.dataTransfer.files[0] !== null && e.dataTransfer.files[0].type === "audio/mid") {
            processFile(e.dataTransfer.files[0]);
        }
        e.preventDefault();
    }, false);
    elements.push({
        x: 44,
        y: 435,
        width: 300,
        height: 10,
        over: false,
        onmousedown: function() {
            window.location = "https://github.com/milkey-mouse/JSSCC"
        },
        onenter: function() {
            ctx.strokeStyle = palette.dark;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(160.5, 442.5);
            ctx.lineTo(344.5, 442.5);
            ctx.stroke();
        },
        onexit: function() {
            fonts.letter_spacing = 0;
            ctx.fillStyle = palette.background;
            ctx.fillRect(44, 435, 310, 10);
            drawText("medium", "This project is open source: https://github.com/milkey-mouse/JSSCC", 44, 435, palette.dark);
        }
    });
    createMuteButtons();
    redraw();
};