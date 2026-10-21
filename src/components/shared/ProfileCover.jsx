import { Box } from "@mui/material";
import React from "react";
import { transformImage } from "../../lib/features";

/** The band behind a profile photo when there's no cover image. */
export const COVER_GRADIENT = "linear-gradient(120deg, #fde7e4 0%, #fbe3ee 55%, #efe8fb 100%)";
// Wide enough for a desktop column without loading the original upload
const COVER_WIDTH = 1200;

/** A profile's cover image (or the gradient), as a full-width band. `onOpen` makes it tappable. */
const ProfileCover = ({ src, preview, height, onOpen, children, sx }) => {
  const image = preview || (src ? transformImage(src, COVER_WIDTH) : "");
  return (
    <Box
      role={onOpen && image ? "button" : undefined}
      aria-label={onOpen && image ? "View cover photo" : undefined}
      tabIndex={onOpen && image ? 0 : undefined}
      onClick={onOpen && image ? onOpen : undefined}
      onKeyDown={onOpen && image ? (e) => (e.key === "Enter" || e.key === " ") && onOpen() : undefined}
      sx={{
        height,
        position: "relative",
        background: image ? `center / cover no-repeat url("${image}")` : COVER_GRADIENT,
        cursor: onOpen && image ? "zoom-in" : "default",
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

export default ProfileCover;
