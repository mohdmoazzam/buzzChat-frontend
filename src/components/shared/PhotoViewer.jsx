import { CloseRounded as CloseIcon } from "@mui/icons-material";
import { Box, Dialog, IconButton, Typography } from "@mui/material";
import React from "react";
import { transformImage } from "../../lib/features";

// Large enough for a phone screen at 3x, without loading the original upload
const VIEW_WIDTH = 1080;

/** A photo full screen on a dark backdrop (profile and group pictures). Tap outside, ✕ or Esc closes it. */
const PhotoViewer = ({ open, onClose, src, title }) => (
  <Dialog
    open={open && !!src}
    onClose={onClose}
    fullScreen
    PaperProps={{ sx: { bgcolor: "rgba(10,10,12,0.94)", backgroundImage: "none" } }}
  >
    <Box
      onClick={onClose}
      sx={{ position: "relative", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", p: { xs: 0, sm: 4 } }}
    >
      <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", gap: 1, px: 1, py: 1, color: "#fff" }}>
        <IconButton onClick={onClose} aria-label="Close photo" sx={{ color: "#fff" }}>
          <CloseIcon />
        </IconButton>
        {title && <Typography fontWeight={600} noWrap>{title}</Typography>}
      </Box>
      <Box
        component="img"
        src={transformImage(src, VIEW_WIDTH)}
        alt={title ? `${title}'s photo` : "Photo"}
        onClick={(e) => e.stopPropagation()}
        sx={{ maxWidth: "100%", maxHeight: "calc(100% - 64px)", objectFit: "contain", borderRadius: { xs: 0, sm: "12px" } }}
      />
    </Box>
  </Dialog>
);

export default PhotoViewer;
