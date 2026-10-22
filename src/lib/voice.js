// Voice messages: recording with the browser's MediaRecorder, and the waveform drawn from mic levels

/** Longest voice message (the server's limit too). */
export const VOICE_MAX_MS = 5 * 60 * 1000;
/** Shorter recordings are treated as an accidental tap. */
export const VOICE_MIN_MS = 1000;
/** Bars in a sent message's waveform (the server allows up to 48). */
export const WAVEFORM_BARS = 48;

// First one the browser supports: Chrome/Firefox record WebM/Opus, Safari MP4/AAC
const MIME_TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"];
const EXTENSIONS = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg" };
// Voice doesn't need more; keeps 5 minutes around 1.2 MB
const BITS_PER_SECOND = 32000;
const SAMPLE_MS = 50;

// Speech RMS sits around 0.02-0.2; the square root spreads quiet and loud parts apart
const toLevel = (rms) => Math.min(1, Math.sqrt(rms) * 2);

/** Squeezes level samples (0-1) into bar heights 0-100, the loudest bar at 100. */
export const toWaveform = (samples, bars = WAVEFORM_BARS) => {
    const count = Math.max(1, Math.min(bars, samples.length));
    const heights = Array.from({ length: count }, (_, i) => {
        const from = Math.floor((i * samples.length) / count);
        const to = Math.max(from + 1, Math.floor(((i + 1) * samples.length) / count));
        return Math.max(0, ...samples.slice(from, to));
    });
    const peak = Math.max(...heights) || 1;
    return heights.map((height) => Math.round((height / peak) * 100));
};

/** "0:07", "2:15" */
export const formatDuration = (ms = 0) => {
    const seconds = Math.max(0, Math.round(ms / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

/** Only voice messages have a duration (works on full assets and the chat list / reply previews). */
export const isVoice = (attachment) => attachment?.duration_ms != null;

/** Played as MP3, which Cloudinary converts on delivery: every browser plays it, with a real duration to seek in. */
export const voicePlaybackUrl = (url = "") => url.replace(/\.\w+$/, ".mp3");

export const micErrorMessage = (error) => {
    if (error?.name === "NotAllowedError") return "Allow microphone access to record voice messages";
    if (error?.name === "NotFoundError") return "No microphone found";
    if (error?.message === "unsupported") return "This browser can't record audio";
    return "Couldn't start recording";
};

/**
 * Starts recording from the microphone. `onTick(elapsedMs, level)` runs every 50 ms with the
 * current level (0-1). Resolves to { stop, release }: stop() ends it and resolves to
 * { file, durationMs, waveform }; release() throws the recording away.
 */
export const startRecording = async (onTick) => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("unsupported");
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });

    let recorder;
    let context;
    try {
        const mimeType = MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
        recorder = new MediaRecorder(stream, { ...(mimeType && { mimeType }), audioBitsPerSecond: BITS_PER_SECOND });
        context = new AudioContext();
    } catch (error) {
        stream.getTracks().forEach((track) => track.stop());
        throw error;
    }

    const chunks = [];
    recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
    };

    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    context.createMediaStreamSource(stream).connect(analyser);
    context.resume().catch(() => undefined);
    const buffer = new Float32Array(analyser.fftSize);
    const samples = [];

    recorder.start();
    const startedAt = performance.now();
    const timer = setInterval(() => {
        analyser.getFloatTimeDomainData(buffer);
        let sum = 0;
        for (const value of buffer) sum += value * value;
        const level = toLevel(Math.sqrt(sum / buffer.length));
        samples.push(level);
        onTick?.(performance.now() - startedAt, level);
    }, SAMPLE_MS);

    let released = false;
    const release = () => {
        if (released) return;
        released = true;
        clearInterval(timer);
        if (recorder.state !== "inactive") recorder.stop();
        stream.getTracks().forEach((track) => track.stop());
        context.close().catch(() => undefined);
    };

    const stop = () =>
        new Promise((resolve) => {
            const durationMs = Math.round(performance.now() - startedAt);
            recorder.onstop = () => {
                const type = recorder.mimeType || chunks[0]?.type || "audio/webm";
                const extension = EXTENSIONS[type.split(";")[0]] ?? "webm";
                resolve({
                    file: new File(chunks, `voice-message.${extension}`, { type }),
                    durationMs,
                    waveform: toWaveform(samples),
                });
            };
            release();
        });

    return { stop, release };
};
