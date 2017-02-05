# JSSCC

JSSCC is a JavaScript reimplementation of the popular [GXSCC](https://meme.institute/gxscc/) synthesizer. It simulates popular 8-bit & 16-bit sound chips to turn any MIDI into an "8-bit" ([sort of](#its-not-8-bit)) version.

## Supported sound chips

- ~~[Konami SCC](https://en.wikipedia.org/wiki/Konami_SCC) (MSX)~~
- ~~[Ricoh 2A03/2A07](https://en.wikipedia.org/wiki/Ricoh_2A03) (NES/Famicom)~~
- ~~Generic [FM Synth](https://en.wikipedia.org/wiki/Frequency_modulation_synthesis)~~
- ~~Generic [Additive Synth](https://en.wikipedia.org/wiki/Additive_synthesis)~~
- ~~Generic [Subtractive Synth](https://en.wikipedia.org/wiki/Subtractive_synthesis)~~
- ~~Generic [Wavetable Synth](https://en.wikipedia.org/wiki/Wavetable_synthesis)~~

*(Note: For an open-source [sample-based synth](https://en.wikipedia.org/wiki/Sample-based_synthesis), see my other project, [swood](https://github.com/milkey-mouse/swood).)*

### "It's not 8-bit!"
[Inverse Phase](http://inversephase.tumblr.com/post/45483500857/slightly-more-accurate-msx-audio-thread) (and [others](https://youtu.be/vMVXTuMupw8)) have made the (valid) point that GXSCC only *sounds* like it's 8-bit. When it's "emulating" an SCC or 2A03 (the NES sound chip) it simply plays a MIDI with SCC-like or NES-like sounds. Even when the sounds are accurate, the large number of supported channels means you'd need at least seven NESes to play it like GXSCC! This takes the same approach as GXSCC; however, there will be a "strict mode" that will impose the same limitations as the real hardware on the MIDI. Of course, music specifically written for what you're trying to emulate (e.g. an [NSF](https://en.wikipedia.org/wiki/NES_Sound_Format)) will almost always sound better than the results of JSSCC or GXSCC because it has been composed or arranged with the hardware's idiosyncracies in mind. That being said, it's still fun being able to create "fake-bit" versions of songs in half a minute!
