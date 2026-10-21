import { BlockRounded as BlockIcon, KeyboardArrowDownRounded as MenuIcon, ShortcutRounded as ForwardIcon } from '@mui/icons-material';
import { Box, IconButton, Typography } from '@mui/material';
import React, { memo } from 'react';
import moment from 'moment';
import { lightBlue, orange } from '../../constants/color';
import { fileFormat, fullName } from '../../lib/features';
import RenderAttachment from './RenderAttachment';

const BIG = "18px";
const SMALL = "6px";

const MessageComponent = ({ message, user, showSender = false, isFirst = true, isLast = true, onOpenMenu }) => {
    const { sender, content, attachments = [], created_at, system, forwarded, edited_at, deleted_at } = message;

    if (system) {
        return (
            <Box sx={{ alignSelf: "center", my: 1.5, maxWidth: "80%" }}>
                <Typography
                    variant="caption"
                    textAlign="center"
                    sx={{ bgcolor: "#ececf0", color: "text.secondary", px: 1.5, py: 0.5, borderRadius: "12px", display: "inline-block" }}
                >
                    {content}
                </Typography>
            </Box>
        );
    }

    const mine = !!user?.id && sender?.id === user.id;
    const time = moment(created_at).format("h:mm A");
    const deleted = !!deleted_at;
    const onlyAttachments = !deleted && attachments.length > 0 && !content;
    const hasMenu = !deleted && !!onOpenMenu;
    // White text on the orange bubble
    const onColor = mine && !onlyAttachments && !deleted;

    // Tight corners where bubbles in the same group touch
    const radius = mine
        ? { borderTopLeftRadius: BIG, borderBottomLeftRadius: BIG, borderTopRightRadius: isFirst ? BIG : SMALL, borderBottomRightRadius: isLast ? BIG : SMALL }
        : { borderTopRightRadius: BIG, borderBottomRightRadius: BIG, borderTopLeftRadius: isFirst ? BIG : SMALL, borderBottomLeftRadius: isLast ? BIG : SMALL };

    // Right-click (desktop) or long-press (most mobile browsers) opens the same menu as the arrow
    const contextMenuHandler = hasMenu
        ? (e) => {
            e.preventDefault();
            onOpenMenu({ message, position: { top: e.clientY, left: e.clientX } });
        }
        : undefined;

    return (
        <Box
            sx={{
                alignSelf: mine ? "flex-end" : "flex-start",
                maxWidth: { xs: "85%", sm: "70%", lg: "60%" },
                mt: isFirst ? 1.25 : 0.25,
                animation: "msgIn 0.18s ease-out",
                "@keyframes msgIn": { from: { opacity: 0, transform: "translateY(4px)" }, to: { opacity: 1, transform: "none" } },
            }}
        >
            {showSender && !mine && (
                <Typography variant="caption" fontWeight={600} sx={{ color: lightBlue, display: "block", ml: 1.5, mb: 0.25 }}>
                    {fullName(sender)}
                </Typography>
            )}

            <Box
                onContextMenu={contextMenuHandler}
                sx={{
                    ...radius,
                    position: "relative",
                    // Attachment-only messages render bare, without a coloured bubble; deleted ones are muted
                    bgcolor: deleted ? "#f4f4f6" : onlyAttachments ? "transparent" : mine ? orange : "#fff",
                    color: onColor ? "#fff" : "text.primary",
                    border: deleted || (!mine && !onlyAttachments) ? "1px solid #ececf0" : "none",
                    px: onlyAttachments ? 0 : 1.5,
                    pt: onlyAttachments ? 0 : 0.75,
                    pb: onlyAttachments ? 0 : 0.6,
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                    "&:hover .msg-menu, & .msg-menu:focus-visible": { opacity: 1 },
                    // No hover on touch screens: keep the arrow visible
                    "@media (hover: none)": { "& .msg-menu": { opacity: 0.9 } },
                }}
            >
                {hasMenu && (
                    <IconButton
                        className="msg-menu"
                        size="small"
                        aria-label="Message options"
                        onClick={(e) => onOpenMenu({ message, anchorEl: e.currentTarget })}
                        sx={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            zIndex: 1,
                            width: 24,
                            height: 24,
                            opacity: 0,
                            transition: "opacity 0.15s",
                            color: onColor ? "#fff" : "text.secondary",
                            bgcolor: onColor ? orange : onlyAttachments ? "rgba(255,255,255,0.9)" : "#fff",
                            boxShadow: onlyAttachments ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
                            "&:hover": { bgcolor: onColor ? orange : "#f4f4f6" },
                        }}
                    >
                        <MenuIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                )}

                {forwarded && !deleted && (
                    <Box
                        sx={{
                            display: "flex", alignItems: "center", gap: 0.5, fontSize: "0.72rem", fontStyle: "italic",
                            opacity: onColor ? 0.85 : 0.6, mb: 0.25, ...(onlyAttachments && { px: 0.5 }),
                        }}
                    >
                        <ForwardIcon sx={{ fontSize: 14 }} /> Forwarded
                    </Box>
                )}

                {!deleted && attachments.map((attachment, index) => {
                    const url = attachment.url;
                    const file = fileFormat(url);
                    return (
                        <Box
                            key={index}
                            sx={{
                                mb: content ? 0.75 : 0.25,
                                "& img, & video": { borderRadius: "16px", display: "block", maxWidth: "100%", height: "auto", bgcolor: "#fff", boxShadow: onlyAttachments ? "0 1px 3px rgba(0,0,0,0.08)" : "none" },
                                "& audio": { display: "block", maxWidth: "100%", height: 40 },
                            }}
                        >
                            <a href={url} target='_blank' rel="noreferrer" download style={{ color: 'inherit' }}>
                                <RenderAttachment file={file} url={url} />
                            </a>
                        </Box>
                    );
                })}

                {/* Text with the time tucked into the last line */}
                <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "flex-end", columnGap: 1 }}>
                    {deleted ? (
                        <Typography
                            component="span"
                            fontSize="0.9rem"
                            lineHeight={1.4}
                            sx={{ fontStyle: "italic", color: "text.secondary", display: "inline-flex", alignItems: "center", gap: 0.5, flex: "1 1 auto" }}
                        >
                            <BlockIcon sx={{ fontSize: 16 }} />
                            {mine ? "You deleted this message" : "This message was deleted"}
                        </Typography>
                    ) : content && (
                        <Typography component="span" fontSize="0.95rem" lineHeight={1.4} sx={{ whiteSpace: "pre-wrap", flex: "1 1 auto" }}>
                            {content}
                        </Typography>
                    )}
                    <Typography
                        component="span"
                        sx={{
                            fontSize: "0.68rem",
                            lineHeight: 1.6,
                            opacity: onColor ? 0.8 : 0.5,
                            whiteSpace: "nowrap",
                            ml: "auto",
                            ...(onlyAttachments && { px: 0.5 }),
                        }}
                    >
                        {edited_at && !deleted ? `edited · ${time}` : time}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default memo(MessageComponent);
