import { Avatar, AvatarGroup, Box } from '@mui/material'
import React from 'react'
import { transformImage } from '../../lib/features'

// Single avatar, or a small overlapping cluster for group chats
const AvatarCard = ({ avatar = [], max = 3, size = 44 }) => {
    // Wide row of avatars (used in admin tables)
    if (max > 3) {
        return (
            <AvatarGroup max={4} sx={{ "& .MuiAvatar-root": { width: 32, height: 32, fontSize: "0.8rem" } }}>
                {avatar.map((src, index) => <Avatar key={`${src}-${index}`} src={transformImage(src)} />)}
            </AvatarGroup>
        );
    }

    const shown = avatar.slice(0, max);

    if (shown.length <= 1) {
        return <Avatar src={transformImage(shown[0])} sx={{ width: size, height: size }} />;
    }

    const small = Math.round(size * 0.68);
    return (
        <Box sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
            {shown.slice(0, 2).map((src, index) => (
                <Avatar
                    key={`${src}-${index}`}
                    src={transformImage(src)}
                    alt=""
                    sx={{
                        width: small,
                        height: small,
                        position: "absolute",
                        border: "2px solid #fff",
                        ...(index === 0 ? { top: 0, left: 0 } : { bottom: 0, right: 0 }),
                    }}
                />
            ))}
        </Box>
    );
}

export default AvatarCard
