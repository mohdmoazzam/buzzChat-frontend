import { Box, Typography } from '@mui/material';
import React, { memo } from 'react';
import moment from 'moment';
import { lightBlue, orange } from '../../constants/color';
import { fileFormat } from '../../lib/features';
import RenderAttachment from './RenderAttachment';

const BIG = "18px";
const SMALL = "6px";

const MessageComponent = ({ message, user, showSender = false, isFirst = true, isLast = true }) => {
    const { sender, content, attachments = [], createdAt, system } = message;

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

    const mine = sender?._id === user?._id;
    const time = moment(createdAt).format("h:mm A");
    const onlyAttachments = attachments.length > 0 && !content;

    // Tight corners where bubbles in the same group touch
    const radius = mine
        ? { borderTopLeftRadius: BIG, borderBottomLeftRadius: BIG, borderTopRightRadius: isFirst ? BIG : SMALL, borderBottomRightRadius: isLast ? BIG : SMALL }
        : { borderTopRightRadius: BIG, borderBottomRightRadius: BIG, borderTopLeftRadius: isFirst ? BIG : SMALL, borderBottomLeftRadius: isLast ? BIG : SMALL };

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
                    {sender?.name}
                </Typography>
            )}

            <Box
                sx={{
                    ...radius,
                    // Attachment-only messages render bare, without a coloured bubble
                    bgcolor: onlyAttachments ? "transparent" : mine ? orange : "#fff",
                    color: mine && !onlyAttachments ? "#fff" : "text.primary",
                    border: mine || onlyAttachments ? "none" : "1px solid #ececf0",
                    px: onlyAttachments ? 0 : 1.5,
                    pt: onlyAttachments ? 0 : 0.75,
                    pb: onlyAttachments ? 0 : 0.6,
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                }}
            >
                {attachments.map((attachment, index) => {
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
                    {content && (
                        <Typography component="span" fontSize="0.95rem" lineHeight={1.4} sx={{ whiteSpace: "pre-wrap", flex: "1 1 auto" }}>
                            {content}
                        </Typography>
                    )}
                    <Typography
                        component="span"
                        sx={{
                            fontSize: "0.68rem",
                            lineHeight: 1.6,
                            opacity: mine && !onlyAttachments ? 0.8 : 0.5,
                            whiteSpace: "nowrap",
                            ml: "auto",
                            ...(onlyAttachments && { px: 0.5 }),
                        }}
                    >
                        {time}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default memo(MessageComponent);
