import { DeleteOutlineRounded as DeleteIcon, SendRounded as SendIcon } from '@mui/icons-material';
import { Box, CircularProgress, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { orange } from '../../constants/color';
import { accentDark } from '../../constants/theme';
import { formatDuration, micErrorMessage, startRecording, VOICE_MAX_MS, VOICE_MIN_MS } from '../../lib/voice';
import { useSendAttachmentsMutation, useUploadVoiceMutation } from '../../redux/api/api';
import { WaveformBars } from '../shared/VoiceMessage';

// Bars shown while recording: the latest levels, scrolling in from the right
const LIVE_BARS = 40;

/**
 * Replaces the composer row while recording. Starts recording as soon as it mounts;
 * the bin throws the recording away, send uploads and sends it. Calls onClose when done either way.
 */
const VoiceRecorder = ({ chatId, replyToId, onSent, onClose }) => {
    const [elapsedMs, setElapsedMs] = useState(0);
    const [levels, setLevels] = useState(() => Array(LIVE_BARS).fill(0));
    const [sending, setSending] = useState(false);
    const recording = useRef(null);
    const finished = useRef(false);
    const sendRef = useRef(null);

    const [uploadVoice] = useUploadVoiceMutation();
    const [sendAttachments] = useSendAttachmentsMutation();

    useEffect(() => {
        let active = true;
        startRecording((elapsed, level) => {
            setElapsedMs(elapsed);
            setLevels((previous) => [...previous.slice(1 - LIVE_BARS), Math.round(level * 100)]);
            if (elapsed >= VOICE_MAX_MS) sendRef.current?.();
        })
            .then((session) => {
                // Closed (or unmounted) while the browser was still asking for the microphone
                if (!active) return session.release();
                recording.current = session;
            })
            .catch((error) => {
                if (!active) return;
                toast.error(micErrorMessage(error));
                onClose();
            });
        return () => {
            active = false;
            if (!finished.current) recording.current?.release();
        };
    }, []);

    const cancel = () => {
        if (finished.current) return;
        finished.current = true;
        recording.current?.release();
        onClose();
    };

    const send = async () => {
        if (finished.current || !recording.current) return;
        finished.current = true;
        setSending(true);
        try {
            const { file, durationMs, waveform } = await recording.current.stop();
            if (durationMs < VOICE_MIN_MS) {
                toast("Hold on a little longer to record a voice message");
                return;
            }
            const uploaded = await uploadVoice({ file, duration_ms: Math.min(durationMs, VOICE_MAX_MS), waveform });
            if (!uploaded.data) {
                toast.error(uploaded.error?.data?.message || "Couldn't upload voice message");
                return;
            }
            const response = await sendAttachments({ chat_id: chatId, attachment_ids: [uploaded.data.asset.id], reply_to_id: replyToId });
            if (response.data) onSent?.();
            else toast.error(response.error?.data?.message || "Couldn't send voice message");
        } catch {
            toast.error("Couldn't send voice message");
        } finally {
            onClose();
        }
    };
    sendRef.current = send;

    // Esc throws the recording away (focus may be anywhere on the page)
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") cancel();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    return (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minHeight: 42 }}>
            <Tooltip title="Delete recording" disableInteractive>
                <span>
                    <IconButton
                        onClick={cancel}
                        disabled={sending}
                        aria-label="Delete recording"
                        sx={{ bgcolor: "#f4f4f6", color: "text.secondary", width: 42, height: 42, flexShrink: 0, "&:hover": { bgcolor: "#ececf0", color: "error.main" } }}
                    >
                        <DeleteIcon />
                    </IconButton>
                </span>
            </Tooltip>

            <Stack
                direction="row"
                alignItems="center"
                spacing={1.25}
                role="status"
                aria-label={`Recording voice message, ${formatDuration(elapsedMs)}`}
                sx={{ flex: 1, minWidth: 0, bgcolor: "#f4f4f6", borderRadius: "21px", px: 2, height: 42 }}
            >
                <Box
                    sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        bgcolor: "error.main",
                        flexShrink: 0,
                        animation: sending ? "none" : "recPulse 1.2s ease-in-out infinite",
                        "@keyframes recPulse": { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.25 } },
                    }}
                />
                <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0, minWidth: 34 }}>
                    {formatDuration(elapsedMs)}
                </Typography>
                <WaveformBars heights={levels} progress={1} playedColor={orange} height={24} />
            </Stack>

            <IconButton
                onClick={send}
                disabled={sending}
                aria-label="Send voice message"
                sx={{
                    bgcolor: orange,
                    color: "#fff",
                    width: 42,
                    height: 42,
                    flexShrink: 0,
                    "&:hover": { bgcolor: accentDark },
                    "&.Mui-disabled": { bgcolor: orange, color: "#fff", opacity: 0.6 },
                    "&:not(.Mui-disabled):active": { transform: "scale(0.92)" },
                }}
            >
                {sending ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : <SendIcon sx={{ fontSize: 20, ml: "2px" }} />}
            </IconButton>
        </Stack>
    );
};

export default VoiceRecorder;
