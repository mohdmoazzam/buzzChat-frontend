import { Button, Dialog, Stack, Typography } from '@mui/material'
import React from 'react'
import { ButtonLoader } from '../layout/Loaders'

const ConfirmDeleteDialog = ({
    open,
    handleClose,
    deleteHandler,
    title = "Delete group?",
    message = "This deletes the group and all its messages for everyone. This can't be undone.",
    confirmLabel = "Delete",
    isLoading = false,
}) => {
    return (
        <Dialog
            open={open}
            onClose={isLoading ? undefined : handleClose}
            PaperProps={{ sx: { borderRadius: "20px", width: "100%", maxWidth: 400, m: 2 } }}
        >
            <Stack spacing={1} sx={{ p: 3, pb: 2 }}>
                <Typography variant="h6" fontWeight={700}>{title}</Typography>
                <Typography color="text.secondary">{message}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ px: 3, pb: 3 }}>
                <Button onClick={handleClose} disabled={isLoading} sx={{ borderRadius: "999px", color: "text.secondary" }}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={deleteHandler}
                    disabled={isLoading}
                    sx={{ borderRadius: "999px", px: 2.5, minWidth: 110, "&.Mui-disabled": { bgcolor: "error.main", color: "#fff", opacity: 0.8 } }}
                >
                    {isLoading ? <ButtonLoader label={confirmLabel} /> : confirmLabel}
                </Button>
            </Stack>
        </Dialog>
    )
}

export default ConfirmDeleteDialog;
