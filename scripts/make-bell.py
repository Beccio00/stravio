#!/usr/bin/env python3
"""Synthesize the rest-timer bell played when the countdown reaches zero.

Regenerate with:

    python3 scripts/make-bell.py apps/mobile/assets/bell.wav

The sound is a struck-bell model: a sum of inharmonic partials (the ratios are
the classic minor-third bell profile, so it reads as a chime rather than as a
pure tone), each with its own exponential decay — the high partials die first,
which is what makes a strike sound like metal instead of like a synth pad. A
short raised-cosine attack removes the click at the onset, and a linear fade
over the last 80 ms guarantees the file ends at exactly zero amplitude.

Output: 44100 Hz, mono, 16-bit PCM, ~1.5 s. Standard library only, so the asset
stays reproducible and replaceable from a clean checkout. Android resource
names under res/raw must be lowercase with no dashes, hence "bell.wav".
"""

import array
import math
import sys
import wave

SAMPLE_RATE = 44100
DURATION = 1.5  # seconds
FUNDAMENTAL = 660.0  # Hz — bright enough to cut through a gym, not shrill
ATTACK = 0.004  # seconds
FADE_OUT = 0.08  # seconds
PEAK = 0.82  # headroom below full scale

# (frequency ratio, relative amplitude, decay time constant in seconds).
# The ratios follow a minor-third bell: hum, prime, tierce, quint and nominal,
# plus three upper partials that colour the strike and vanish almost at once.
PARTIALS = [
    (0.50, 0.28, 1.30),
    (1.00, 1.00, 1.00),
    (1.19, 0.55, 0.62),
    (1.50, 0.38, 0.48),
    (2.00, 0.42, 0.36),
    (2.67, 0.22, 0.20),
    (3.55, 0.14, 0.12),
    (4.75, 0.08, 0.07),
]


def render() -> array.array:
    total = int(SAMPLE_RATE * DURATION)
    attack_samples = max(1, int(SAMPLE_RATE * ATTACK))
    fade_samples = max(1, int(SAMPLE_RATE * FADE_OUT))
    norm = sum(amp for _, amp, _ in PARTIALS)

    samples = array.array("h")
    for n in range(total):
        t = n / SAMPLE_RATE
        value = 0.0
        for ratio, amp, decay in PARTIALS:
            value += amp * math.exp(-t / decay) * math.sin(
                2.0 * math.pi * FUNDAMENTAL * ratio * t
            )
        value /= norm

        # Raised-cosine attack: no discontinuity at sample 0.
        if n < attack_samples:
            value *= 0.5 - 0.5 * math.cos(math.pi * n / attack_samples)

        # Linear fade so the tail reaches true silence before the file ends.
        remaining = total - n
        if remaining < fade_samples:
            value *= remaining / fade_samples

        clamped = max(-1.0, min(1.0, value * PEAK))
        samples.append(int(clamped * 32767))

    return samples


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: python3 scripts/make-bell.py <output.wav>", file=sys.stderr)
        return 2

    samples = render()
    with wave.open(sys.argv[1], "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(SAMPLE_RATE)
        out.writeframes(samples.tobytes())

    print(f"wrote {sys.argv[1]}: {len(samples)} frames, {DURATION:.2f}s @ {SAMPLE_RATE} Hz")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
