import {
    BlockRounded as BlockIcon,
    DoneAllRounded as SeenIcon,
    DoneRounded as SentIcon,
    MoreVertRounded as MenuIcon,
    ShortcutRounded as ForwardIcon,
} from '@mui/icons-material';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import React, { memo, useRef, useState } from 'react';
import moment from 'moment';
import { lightBlue, myBubble } from '../../constants/color';
import { fileFormat, fullName } from '../../lib/features';
import RenderAttachment from './RenderAttachment';

const BIG = "18px";
const SMALL = "6px";
// The bubble's tail (px)
const TAIL_WIDTH = 8;
const TAIL_HEIGHT = 13;

// ✓ sent, ✓✓ seen (in a group, once everyone who was there has seen it)
const ReadTicks = ({ seenBy = 0, seenTotal = 0, isGroup }) => {
    const seen = seenTotal > 0 && seenBy >= seenTotal;
    const Icon = seen ? SeenIcon : SentIcon;
    const label = isGroup && seenTotal > 0 ? `Seen by ${seenBy} of ${seenTotal}` : seen ? "Seen" : "Sent";
    return (
        <Tooltip title={label} placement="top" disableInteractive>
            <Icon
                aria-label={label}
                sx={{
                    fontSize: 15,
                    ml: 0.4,
                    verticalAlign: "-3px",
                    color: seen ? lightBlue : "inherit",
                }}
            />
        </Tooltip>
    );
};

const ATTACHMENT_LABELS = { image: "📷 Photo", video: "🎥 Video", audio: "🎵 Audio", file: "📎 File" };

/** One line describing a message, for a reply's quote and the composer's reply bar. */
export const replySnippet = ({ content, attachment, deleted }) => {
    if (deleted) return "Deleted message";
    if (content) return content;
    return attachment?.url ? ATTACHMENT_LABELS[fileFormat(attachment.url)] : "Message";
};

// The quoted message at the top of a reply; tapping it scrolls to the original
const ReplyQuote = ({ reply, mine, myId, onJump }) => {
    const name = reply.sender?.id === myId ? "You" : fullName(reply.sender);
    return (
        <Box
            component="button"
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onJump?.(reply.id);
            }}
            sx={{
                display: "block",
                width: "100%",
                textAlign: "left",
                font: "inherit",
                color: "inherit",
                border: "none",
                cursor: onJump ? "pointer" : "default",
                mb: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: "8px",
                borderLeft: `3px solid ${lightBlue}`,
                bgcolor: mine ? "rgba(0,0,0,0.05)" : "#f4f4f6",
                minWidth: 0,
            }}
        >
            <Typography variant="caption" fontWeight={700} sx={{ display: "block", color: lightBlue, lineHeight: 1.3 }} noWrap>
                {name}
            </Typography>
            <Typography
                variant="body2"
                sx={{
                    fontSize: "0.82rem",
                    lineHeight: 1.35,
                    opacity: 0.75,
                    fontStyle: reply.deleted ? "italic" : "normal",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    wordBreak: "break-word",
                }}
            >
                {replySnippet(reply)}
            </Typography>
        </Box>
    );
};

// http(s) links in message text (the same rule the server uses for previews)
const URL_SPLIT = /(https?:\/\/[^\s<>"'`]+)/gi;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/;

/** Message text with its links clickable (opened in a new tab, without passing our page along). */
const LinkifiedText = ({ text }) =>
    text.split(URL_SPLIT).map((part, index) => {
        if (index % 2 === 0) return part;
        const url = part.replace(TRAILING_PUNCTUATION, "");
        const rest = part.slice(url.length);
        return (
            <React.Fragment key={index}>
                <Box
                    component="a"
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    onClick={(e) => e.stopPropagation()}
                    sx={{ color: lightBlue, textDecoration: "underline", textUnderlineOffset: "2px", wordBreak: "break-all" }}
                >
                    {url}
                </Box>
                {rest}
            </React.Fragment>
        );
    });

const hostOf = (url) => {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return "";
    }
};

// The card the server builds for the first link (image, site, title, description)
const LinkPreviewCard = ({ preview, mine }) => {
    const [imageFailed, setImageFailed] = useState(false);
    return (
        <Box
            component="a"
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={(e) => e.stopPropagation()}
            sx={{
                display: "block",
                mb: 0.75,
                borderRadius: "10px",
                overflow: "hidden",
                textDecoration: "none",
                color: "inherit",
                bgcolor: mine ? "rgba(0,0,0,0.05)" : "#f4f4f6",
                borderLeft: `3px solid ${lightBlue}`,
                "&:hover": { bgcolor: mine ? "rgba(0,0,0,0.08)" : "#ececf0" },
            }}
        >
            {preview.image && !imageFailed && (
                <Box
                    component="img"
                    src={preview.image}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => setImageFailed(true)}
                    sx={{ display: "block", width: "100%", maxHeight: 180, objectFit: "cover", bgcolor: "#ececf0" }}
                />
            )}
            <Box sx={{ px: 1.25, py: 0.85 }}>
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary", lineHeight: 1.4 }} noWrap>
                    {preview.site_name || hostOf(preview.url)}
                </Typography>
                <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{ lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word" }}
                >
                    {preview.title}
                </Typography>
                {preview.description && (
                    <Typography
                        variant="body2"
                        sx={{ fontSize: "0.8rem", lineHeight: 1.35, color: "text.secondary", mt: 0.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word" }}
                    >
                        {preview.description}
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

// Press and hold on touch screens: how long, and how far the finger may drift before it counts as a scroll
const LONG_PRESS_MS = 450;
const LONG_PRESS_SLOP_PX = 10;

/**
 * Press-and-hold for touch screens (iOS Safari has no long-press contextmenu). Calls `onLongPress`
 * with the finger's position; a scroll or a quick tap cancels it.
 */
const useLongPress = (onLongPress) => {
    const timer = useRef(null);
    const start = useRef(null);
    // Set once the menu opened, so the release doesn't also click a link and Android's own
    // contextmenu (which follows a long press) doesn't open it a second time
    const fired = useRef(false);
    const [pressing, setPressing] = useState(false);

    const cancel = () => {
        clearTimeout(timer.current);
        timer.current = null;
        setPressing(false);
    };

    if (!onLongPress) return { pressing: false, handlers: {}, fired };
    return {
        pressing,
        fired,
        handlers: {
            onTouchStart: (e) => {
                if (e.touches.length !== 1) return cancel();
                const { clientX, clientY } = e.touches[0];
                start.current = { x: clientX, y: clientY };
                fired.current = false;
                setPressing(true);
                timer.current = setTimeout(() => {
                    fired.current = true;
                    setPressing(false);
                    navigator.vibrate?.(10);
                    onLongPress({ top: clientY, left: clientX });
                }, LONG_PRESS_MS);
            },
            onTouchMove: (e) => {
                const touch = e.touches[0];
                if (!start.current || !touch) return;
                if (Math.hypot(touch.clientX - start.current.x, touch.clientY - start.current.y) > LONG_PRESS_SLOP_PX) cancel();
            },
            onTouchEnd: (e) => {
                cancel();
                if (fired.current) e.preventDefault();
            },
            onTouchCancel: cancel,
        },
    };
};

const MessageComponent = ({
    message, user, showSender = false, isFirst = true, isLast = true, onOpenMenu,
    isGroup = false, seenBy, seenTotal, onJumpToReply, onOpenProfile,
}) => {
    const { sender, content, attachments = [], created_at, system, forwarded, edited_at, deleted_at } = message;
    const hasMenu = !deleted_at && !!onOpenMenu && !system;
    const longPress = useLongPress(hasMenu ? (position) => onOpenMenu({ message, position }) : null);

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

    // Attachment-only messages render bare, without a coloured bubble; deleted ones are muted
    const bubbleColor = deleted ? "#f4f4f6" : onlyAttachments ? "transparent" : mine ? myBubble : "#fff";
    // WhatsApp-style tail on the first bubble of a run, at the top corner on the sender's side
    const hasTail = isFirst && !onlyAttachments;
    // The tail's corner is square (the tail continues it); tight corners where bubbles in a run touch
    const topOuter = hasTail ? 0 : isFirst ? BIG : SMALL;
    const radius = mine
        ? { borderTopLeftRadius: BIG, borderBottomLeftRadius: BIG, borderTopRightRadius: topOuter, borderBottomRightRadius: isLast ? BIG : SMALL }
        : { borderTopRightRadius: BIG, borderBottomRightRadius: BIG, borderTopLeftRadius: topOuter, borderBottomLeftRadius: isLast ? BIG : SMALL };
    const tail = hasTail
        ? {
            "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                [mine ? "right" : "left"]: -TAIL_WIDTH,
                width: TAIL_WIDTH,
                height: TAIL_HEIGHT,
                bgcolor: bubbleColor,
                // A triangle hanging off the top corner: flat along the top, slanting back into the bubble
                clipPath: mine ? "polygon(0 0, 100% 0, 0 100%)" : "polygon(0 0, 100% 0, 100% 100%)",
            },
        }
        : {};

    // Right-click on desktop opens the same menu as ⋮ (press and hold does it on touch screens)
    const contextMenuHandler = hasMenu
        ? (e) => {
            e.preventDefault();
            if (longPress.fired.current) return;
            onOpenMenu({ message, position: { top: e.clientY, left: e.clientX } });
        }
        : undefined;

    return (
        <Box
            data-message-id={message.id}
            sx={{
                borderRadius: "12px",
                alignSelf: mine ? "flex-end" : "flex-start",
                maxWidth: { xs: "85%", sm: "70%", lg: "60%" },
                mt: isFirst ? 1.25 : 0.25,
                animation: "msgIn 0.18s ease-out",
                "@keyframes msgIn": { from: { opacity: 0, transform: "translateY(4px)" }, to: { opacity: 1, transform: "none" } },
            }}
        >
            {showSender && !mine && (
                <Typography
                    variant="caption"
                    fontWeight={600}
                    component={onOpenProfile ? "button" : "span"}
                    type={onOpenProfile ? "button" : undefined}
                    onClick={onOpenProfile ? () => onOpenProfile(sender.id) : undefined}
                    sx={{ color: lightBlue, display: "block", ml: 1.5, mb: 0.25, border: "none", background: "none", p: 0, font: "inherit", fontWeight: 600, cursor: onOpenProfile ? "pointer" : "default", "&:hover": onOpenProfile ? { textDecoration: "underline" } : {} }}
                >
                    {fullName(sender)}
                </Typography>
            )}

            {/* The bubble with ⋮ beside it (desktop, on hover), never on top of the text, time or ticks */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    flexDirection: mine ? "row-reverse" : "row",
                    "&:hover .msg-menu, & .msg-menu:focus-visible, & .msg-menu[aria-expanded='true']": { opacity: 1 },
                }}
            >
            <Box
                onContextMenu={contextMenuHandler}
                {...longPress.handlers}
                sx={{
                    ...radius,
                    position: "relative",
                    minWidth: 0,
                    transition: "transform 0.15s ease-out",
                    // Holding a message dips it slightly, so the press is felt before the menu opens
                    transform: longPress.pressing ? "scale(0.97)" : "none",
                    // Touch screens: no text selection or iOS callout while pressing and holding (Copy is in the menu)
                    "@media (hover: none)": hasMenu ? { userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" } : {},
                    bgcolor: bubbleColor,
                    color: "text.primary",
                    // Light bubbles get a soft edge. A drop-shadow filter (unlike a border) follows the tail too
                    filter: onlyAttachments ? "none" : "drop-shadow(0 1px 0.5px rgba(0, 0, 0, 0.13))",
                    ...tail,
                    px: onlyAttachments ? 0 : 1.5,
                    pt: onlyAttachments ? 0 : 0.75,
                    pb: onlyAttachments ? 0 : 0.6,
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                }}
            >
                {message.reply_to && !deleted && (
                    <ReplyQuote reply={message.reply_to} mine={mine} myId={user?.id} onJump={onJumpToReply} />
                )}

                {forwarded && !deleted && (
                    <Box
                        sx={{
                            display: "flex", alignItems: "center", gap: 0.5, fontSize: "0.72rem", fontStyle: "italic",
                            opacity: 0.6, mb: 0.25, ...(onlyAttachments && { px: 0.5 }),
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

                {message.link_preview && !deleted && <LinkPreviewCard preview={message.link_preview} mine={mine} />}

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
                            <LinkifiedText text={content} />
                        </Typography>
                    )}
                    <Typography
                        component="span"
                        sx={{
                            fontSize: "0.68rem",
                            lineHeight: 1.6,
                            opacity: 0.55,
                            whiteSpace: "nowrap",
                            ml: "auto",
                            ...(onlyAttachments && { px: 0.5 }),
                        }}
                    >
                        {edited_at && !deleted ? `edited · ${time}` : time}
                        {mine && !deleted && seenTotal !== undefined && (
                            <ReadTicks seenBy={seenBy} seenTotal={seenTotal} isGroup={isGroup} />
                        )}
                    </Typography>
                </Box>
            </Box>

            {hasMenu && (
                <IconButton
                    className="msg-menu"
                    size="small"
                    aria-label="Message options"
                    aria-haspopup="menu"
                    onClick={(e) => onOpenMenu({ message, anchorEl: e.currentTarget })}
                    sx={{
                        flexShrink: 0,
                        width: 28,
                        height: 28,
                        opacity: 0,
                        transition: "opacity 0.15s",
                        color: "text.secondary",
                        "&:hover": { bgcolor: "#ececf0" },
                        // Touch screens use press and hold instead
                        "@media (hover: none)": { display: "none" },
                    }}
                >
                    <MenuIcon sx={{ fontSize: 18 }} />
                </IconButton>
            )}
            </Box>
        </Box>
    );
};

export default memo(MessageComponent);
