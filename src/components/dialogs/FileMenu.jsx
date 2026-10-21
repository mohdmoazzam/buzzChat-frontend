import {
  AudiotrackRounded as AudioIcon,
  DescriptionRounded as FileIcon,
  ImageRounded as ImageIcon,
  VideocamRounded as VideoIcon,
} from '@mui/icons-material';
import { Box, Popover, Stack, Typography } from '@mui/material';
import React, { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { useSendAttachmentsMutation, useUploadAssetsMutation } from '../../redux/api/api';
import { setIsFileMenu, setUploadingLoader } from '../../redux/reducers/misc';

const MAX_FILES = 5;
const MAX_FILE_MB = 5;

const OPTIONS = [
  { key: "photo", label: "Photos", noun: ["photo", "photos"], accept: "image/png, image/jpeg, image/gif, image/webp", Icon: ImageIcon, color: "#7c5cff" },
  { key: "video", label: "Videos", noun: ["video", "videos"], accept: "video/mp4, video/webm, video/ogg", Icon: VideoIcon, color: "#ef5b6b" },
  { key: "audio", label: "Audio", noun: ["audio file", "audio files"], accept: "audio/mpeg, audio/wav, audio/ogg", Icon: AudioIcon, color: "#f59e0b" },
  { key: "file", label: "Document", noun: ["file", "files"], accept: "*", Icon: FileIcon, color: "#3b82f6" },
];

// replyToId: the message these files reply to (from the composer's reply bar); onSent clears it
const FileMenu = ({ anchorE1, chatId, replyToId, onSent }) => {
  const dispatch = useDispatch();
  const { isFileMenu } = useSelector((state) => state.misc);
  const inputRefs = useRef({});

  const [uploadAssets] = useUploadAssetsMutation();
  const [sendAttachments] = useSendAttachmentsMutation();

  const closeFileMenu = () => dispatch(setIsFileMenu(false));

  // Focus stays in the message box, so handle Esc here
  useEffect(() => {
    if (!isFileMenu) return;
    const onKey = (e) => { if (e.key === "Escape") closeFileMenu(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isFileMenu]);

  const fileChangeHandler = async (e, option) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    if (files.length > MAX_FILES) {
      return toast.error(`You can send up to ${MAX_FILES} files at a time`);
    }
    const tooBig = files.filter((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooBig.length) {
      return toast.error(`${tooBig.length === 1 ? `"${tooBig[0].name}" is` : `${tooBig.length} files are`} over ${MAX_FILE_MB} MB`);
    }

    closeFileMenu();
    // The attach button shows the progress spinner; the message itself confirms success
    dispatch(setUploadingLoader(true));
    const noun = option.noun[files.length === 1 ? 0 : 1];

    try {
      const uploaded = await uploadAssets(files);
      if (!uploaded.data) {
        toast.error(uploaded.error?.data?.message || `Couldn't upload ${noun}`);
        return;
      }
      const response = await sendAttachments({
        chat_id: chatId,
        attachment_ids: uploaded.data.assets.map((asset) => asset.id),
        reply_to_id: replyToId,
      });
      if (response.data) onSent?.();
      if (!response.data) {
        toast.error(response.error?.data?.message || `Couldn't send ${noun}`);
      }
    } catch {
      toast.error(`Couldn't send ${noun}`);
    } finally {
      dispatch(setUploadingLoader(false));
    }
  };

  return (
    <Popover
      open={isFileMenu}
      anchorEl={anchorE1}
      onClose={closeFileMenu}
      // Avoid layout jumps: no body scroll lock, and don't pull focus from the message box
      disableScrollLock
      disableAutoFocus
      disableRestoreFocus
      anchorOrigin={{ vertical: "top", horizontal: "left" }}
      transformOrigin={{ vertical: "bottom", horizontal: "left" }}
      slotProps={{
        paper: {
          sx: {
            mt: -1.5,
            p: 1.5,
            borderRadius: "18px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
            border: "1px solid",
            borderColor: "divider",
          },
        },
      }}
    >
      <Stack direction="row" spacing={0.5}>
        {OPTIONS.map((option) => {
          const { key, label, accept, Icon, color } = option;
          return (
            <Box
              key={key}
              component="button"
              type="button"
              onClick={() => inputRefs.current[key]?.click()}
              sx={{
                all: "unset",
                cursor: "pointer",
                width: 76,
                py: 1,
                borderRadius: "14px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.75,
                transition: "background-color 0.15s",
                "&:hover": { bgcolor: "#f6f6f8" },
                "&:hover .tile": { transform: "translateY(-2px)" },
                "&:focus-visible": { outline: `2px solid ${color}`, outlineOffset: -2 },
              }}
            >
              <Box
                className="tile"
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  bgcolor: color,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 6px 14px ${color}40`,
                  transition: "transform 0.15s",
                }}
              >
                <Icon />
              </Box>
              <Typography variant="caption" fontWeight={600} color="text.primary">{label}</Typography>
              <input
                type="file"
                multiple
                accept={accept}
                hidden
                ref={(el) => { inputRefs.current[key] = el; }}
                onChange={(e) => fileChangeHandler(e, option)}
              />
            </Box>
          );
        })}
      </Stack>
      <Typography variant="caption" color="text.disabled" display="block" textAlign="center" mt={1}>
        Up to {MAX_FILES} files · {MAX_FILE_MB} MB each
      </Typography>
    </Popover>
  );
};

export default FileMenu;
