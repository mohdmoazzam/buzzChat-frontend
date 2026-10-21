import { Box } from "@mui/material";
import React, { useState } from "react";

// Twemoji (the open-source set Twitter/X and Discord use) as SVG: sharp at any size and the same on
// every device. System emoji differ per platform, and Windows 11's are soft gradients that look blurry small.
const TWEMOJI_BASE = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/";
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

/** Twemoji's file name for an emoji: its code points in hex, joined by "-" (FE0F dropped unless it's a ZWJ sequence). */
const twemojiFile = (emoji) => {
  const points = [...emoji].map((char) => char.codePointAt(0));
  const zwj = points.includes(0x200d);
  return points.filter((point) => zwj || point !== 0xfe0f).map((point) => point.toString(16)).join("-");
};

/** One emoji drawn as a crisp image, falling back to the text character if the image can't load. */
const Emoji = ({ emoji, size = 20, sx }) => {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <Box component="span" role="img" aria-label={emoji} sx={{ fontFamily: EMOJI_FONT, fontSize: `${size}px`, lineHeight: 1, ...sx }}>
        {emoji}
      </Box>
    );
  }
  return (
    <Box
      component="img"
      src={`${TWEMOJI_BASE}${twemojiFile(emoji)}.svg`}
      alt={emoji}
      draggable={false}
      loading="lazy"
      onError={() => setFailed(true)}
      sx={{ width: size, height: size, display: "inline-block", verticalAlign: "middle", userSelect: "none", ...sx }}
    />
  );
};

export default Emoji;
