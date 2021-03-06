enum PlayState {
    STOPPED = 0,
    PAUSED = 1,
    PLAYING = 2,
    FASTFORWARD = 3
}

class Song {
    channels: Channel[];
    repeat: boolean;

    playState: PlayState;
    position: number;
    buffer: number;

    fileName: string | null;

    constructor(channelCount: number = 32) {
        //initialize with default channels
        this.channels = [];
        for (var i = 0; i < channelCount; i++) {
            this.channels.push(new Channel());
            this.channels[i].wave = Waveform.triangle;
        }
        this.channels[9].drum = true;
        this.channels[25].drum = true;

        this.position = 0;
        this.buffer = 1;
        this.playState = PlayState.STOPPED;

        this.repeat = Cookies.get("loop", "true") === "true";

        this.fileName = null;
    }
}

class Channel {
    mute: boolean;
    poly: number;

    volume: number;
    expression: number;
    envelope: number;
    output: number;

    pitchbend: number | null;
    panpot: number | null;

    percussion: number;
    cc0: number;
    freq: number;
    drum: boolean;

    wave: ((x: number) => number) | null;

    constructor() {
        this.mute = false;
        this.poly = 0;

        this.volume = 0;
        this.expression = 0;
        this.envelope = 0;
        this.output = 0;

        this.pitchbend = null;
        this.panpot = null;

        this.percussion = 0;
        this.cc0 = 0;
        this.freq = 0;
        this.drum = false;

        this.wave = null;
    }
}

class Waveform {
    public static sine(x: number): number {
        return Math.sin(x * 2 * Math.PI);
    }

    public static pulse125(x: number): number {
        return x % 1 > 0.125 ? -0.8 : 0.8;
    }

    public static pulse25(x: number): number {
        return x % 1 > 0.25 ? -0.8 : 0.8;
    }

    public static square(x: number): number {
        return x % 1 > 0.5 ? -0.8 : 0.8;
    }

    public static pulsedSquare(x: number): number {
        return x % 1 > 0.5 ? 0 : 0.8;
    }

    public static triangle(x: number): number {
        var clamped = (x + 0.25) % 1;
        if (clamped > 0.5) {
            return 3 - clamped * 4;
        } else {
            return (clamped - 0.25) * 4;
        }
    }
}