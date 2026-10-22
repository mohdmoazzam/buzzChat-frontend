import { PauseRounded as PauseIcon, PlayArrowRounded as PlayIcon } from '@mui/icons-material';
import { Box, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { lightBlue, orange } from '../../constants/color';
import { formatDuration, voicePlaybackUrl } from '../../lib/voice';

// Only one voice message plays at a time
let nowPlaying = null;

const SEEK_STEP_MS = 5000;

/** Bar heights (0-100) side by side; bars before `progress` (0-1) take `playedColor`. */
export const WaveformBars = ({ heights, progress = 0, playedColor, restColor = "rgba(0,0,0,0.22)", height = 28 }) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: "2px", height, flex: 1, minWidth: 0 }}>
        {heights.map((value, index) => (
            <Box
                key={index}
                sx={{
                    flex: 1,
                    maxWidth: 4,
                    minWidth: 2,
                    // A floor so silence still shows as a line of dots
                    height: `${Math.max(10, value)}%`,
                    borderRadius: 2,
                    bgcolor: (index + 0.5) / heights.length <= progress ? playedColor : restColor,
                    transition: "height 0.08s linear",
                }}
            />
        ))}
    </Box>
);

/** A sent voice message: play/pause, a waveform to tap or drag through, and the time. */
const VoiceMessage = ({ asset, mine }) => {
    const audioRef = useRef(null);
    const waveRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [loading, setLoading] = useState(false);
    const [positionMs, setPositionMs] = useState(0);
    const duration = asset.duration_ms || 1;
    const accent = mine ? orange : lightBlue;

    // Smooth progress while playing (timeupdate only fires a few times a second)
    useEffect(() => {
        if (!playing) return undefined;
        let frame;
        const tick = () => {
            setPositionMs((audioRef.current?.currentTime ?? 0) * 1000);
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [playing]);

    useEffect(() => () => {
        audioRef.current?.pause();
        if (nowPlaying === audioRef.current) nowPlaying = null;
    }, []);

    const toggle = (e) => {
        e.stopPropagation();
        const audio = audioRef.current;
        if (!audio) return;
        if (!audio.paused) return audio.pause();
        if (nowPlaying && nowPlaying !== audio) nowPlaying.pause();
        nowPlaying = audio;
        setLoading(true);
        audio.play().catch(() => {
            setLoading(false);
            toast.error("Couldn't play this voice message");
        });
    };

    const seekTo = (ms) => {
        const clamped = Math.min(Math.max(ms, 0), duration);
        if (audioRef.current) audioRef.current.currentTime = clamped / 1000;
        setPositionMs(clamped);
    };

    const seekToPointer = (e) => {
        const rect = waveRef.current?.getBoundingClientRect();
        if (!rect?.width) return;
        seekTo(((e.clientX - rect.left) / rect.width) * duration);
    };

    const heights = asset.waveform?.length ? asset.waveform : [0];
    const started = playing || positionMs > 0;

    return (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ width: { xs: 220, sm: 260 }, maxWidth: "100%", py: 0.25 }}>
            <audio
                ref={audioRef}
                src={voicePlaybackUrl(asset.url)}
                preload="none"
                onPlaying={() => {
                    setLoading(false);
                    setPlaying(true);
                }}
                onPause={() => setPlaying(false)}
                onWaiting={() => setLoading(true)}
                onEnded={() => {
                    setPlaying(false);
                    seekTo(0);
                }}
                onError={() => {
                    setLoading(false);
                    setPlaying(false);
                }}
            />
            <IconButton
                onClick={toggle}
                aria-label={playing ? "Pause voice message" : "Play voice message"}
                sx={{
                    width: 38,
                    height: 38,
                    flexShrink: 0,
                    bgcolor: accent,
                    color: "#fff",
                    "&:hover": { bgcolor: accent, filter: "brightness(0.92)" },
                }}
            >
                {loading ? (
                    <CircularProgress size={18} sx={{ color: "#fff" }} />
                ) : playing ? (
                    <PauseIcon />
                ) : (
                    <PlayIcon />
                )}
            </IconButton>
            <Stack sx={{ flex: 1, minWidth: 0 }}>
                <Box
                    ref={waveRef}
                    role="slider"
                    tabIndex={0}
                    aria-label="Voice message position"
                    aria-valuemin={0}
                    aria-valuemax={Math.round(duration / 1000)}
                    aria-valuenow={Math.round(positionMs / 1000)}
                    aria-valuetext={`${formatDuration(positionMs)} of ${formatDuration(duration)}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        seekToPointer(e);
                    }}
                    onPointerMove={(e) => {
                        if (e.buttons === 1) seekToPointer(e);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "ArrowRight") seekTo(positionMs + SEEK_STEP_MS);
                        else if (e.key === "ArrowLeft") seekTo(positionMs - SEEK_STEP_MS);
                        else return;
                        e.preventDefault();
                    }}
                    sx={{ display: "flex", cursor: "pointer", touchAction: "none", borderRadius: "4px", "&:focus-visible": { outline: `2px solid ${accent}`, outlineOffset: 2 } }}
                >
                    <WaveformBars heights={heights} progress={positionMs / duration} playedColor={accent} />
                </Box>
                <Typography variant="caption" sx={{ fontSize: "0.7rem", lineHeight: 1.2, opacity: 0.6, fontVariantNumeric: "tabular-nums" }}>
                    {formatDuration(started ? positionMs : duration)}
                </Typography>
            </Stack>
        </Stack>
    );
};

export default VoiceMessage;
