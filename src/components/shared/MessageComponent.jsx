import { Box, Typography } from '@mui/material';
import React from 'react'
import { memo } from 'react'
import { lightBlue } from '../../constants/color';
import { brandGradient } from '../../constants/theme';
import moment from 'moment';
import { fileFormat } from '../../lib/features';
import RenderAttachment from './RenderAttachment';
import { motion } from "framer-motion";

const MessageComponent = ({ message, user, showSender = false }) => {

    const { sender, content, attachments = [], createdAt, system } = message;

    if (system) {
        return (
            <Box sx={{ alignSelf: "center", my: 1 }}>
                <Typography
                    variant="caption"
                    sx={{ bgcolor: "#ececf0", color: "text.secondary", px: 1.5, py: 0.5, borderRadius: "12px", display: "inline-block" }}
                >
                    {content}
                </Typography>
            </Box>
        );
    }

    const sameSender = sender?._id === user?._id;
    const time = moment(createdAt).format("h:mm A");

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            style={{
                alignSelf: sameSender ? "flex-end" : "flex-start",
                maxWidth: "min(75%, 520px)",
                marginTop: showSender ? "0.5rem" : 0,
            }}
        >
            <Box
                sx={{
                    background: sameSender ? brandGradient : "#fff",
                    color: sameSender ? "#fff" : "text.primary",
                    borderRadius: "18px",
                    borderBottomRightRadius: sameSender ? "6px" : "18px",
                    borderBottomLeftRadius: sameSender ? "18px" : "6px",
                    px: 1.75,
                    py: 1,
                    boxShadow: sameSender ? "none" : "0 1px 2px rgba(0,0,0,0.06)",
                    wordBreak: "break-word",
                }}
            >
                {showSender && !sameSender && (
                    <Typography color={lightBlue} fontWeight={600} variant="caption" display="block">
                        {sender?.name}
                    </Typography>
                )}
                {attachments.length > 0 && attachments.map((attachment, index) => {
                    const url = attachment.url;
                    const file = fileFormat(url);
                    return (
                        <Box key={index} sx={{ my: 0.5, "& img, & video": { borderRadius: "12px", display: "block", maxWidth: "100%" } }}>
                            <a href={url} target='_blank' rel="noreferrer" download style={{ color: 'inherit' }}>
                                <RenderAttachment file={file} url={url} />
                            </a>
                        </Box>
                    );
                })}
                {content && <Typography fontSize="0.95rem" lineHeight={1.45}>{content}</Typography>}
                <Typography
                    variant="caption"
                    display="block"
                    textAlign="right"
                    sx={{ opacity: sameSender ? 0.8 : 0.55, fontSize: "0.7rem", mt: 0.25 }}
                >
                    {time}
                </Typography>
            </Box>
        </motion.div>
    )
}

export default memo(MessageComponent);
