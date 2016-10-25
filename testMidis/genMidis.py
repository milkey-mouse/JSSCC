from mido import Message, MidiFile, MidiTrack

mid = MidiFile()
track = MidiTrack()
mid.tracks.append(track)

for i in range(128):
    track.append(Message("program_change", program=i, time=0))
    track.append(Message("note_on", note=i, velocity=64, time=1024))
    track.append(Message("note_off", note=i, velocity=127, time=1024))

mid.save("all_instruments.mid")
