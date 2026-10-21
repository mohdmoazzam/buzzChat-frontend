import { TimerOutlined as TimerIcon } from "@mui/icons-material";
import { Box, Button, Dialog, FormControlLabel, Radio, RadioGroup, Stack, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSetDisappearingMutation } from "../../redux/api/api";
import { ButtonLoader } from "../layout/Loaders";

// Same choices as the server (DISAPPEARING_OPTIONS); "off" is null
export const DISAPPEARING_CHOICES = [
  { value: 24 * 60 * 60, label: "24 hours" },
  { value: 7 * 24 * 60 * 60, label: "7 days" },
  { value: 90 * 24 * 60 * 60, label: "90 days" },
];
export const disappearingLabel = (seconds) => DISAPPEARING_CHOICES.find((choice) => choice.value === seconds)?.label ?? "";

/** Choose how long new messages in this chat last (or turn it off). */
const DisappearingDialog = ({ open, onClose, chatId, current = null, isGroup }) => {
  const [choice, setChoice] = useState(String(current ?? "off"));
  const [setDisappearing, { isLoading }] = useSetDisappearingMutation();

  useEffect(() => {
    if (open) setChoice(String(current ?? "off"));
  }, [open, current]);

  const save = async () => {
    const seconds = choice === "off" ? null : Number(choice);
    if (seconds === (current ?? null)) return onClose();
    const res = await setDisappearing({ chatId, seconds });
    if (res.error) return toast.error(res.error.data?.message || "Something went wrong");
    toast.success(res.data.message);
    onClose();
  };

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} PaperProps={{ sx: { borderRadius: "20px", width: "100%", maxWidth: 400, m: 2 } }}>
      <Stack spacing={1} sx={{ p: 3, pb: 1 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: "12px", display: "grid", placeItems: "center", bgcolor: "rgba(38,148,171,0.12)", color: "#2694ab" }}>
          <TimerIcon />
        </Box>
        <Typography variant="h6" fontWeight={700}>Disappearing messages</Typography>
        <Typography variant="body2" color="text.secondary">
          New messages in this {isGroup ? "group" : "chat"} will disappear for everyone after the time you choose. Messages already sent aren't affected.
        </Typography>
      </Stack>
      <RadioGroup value={choice} onChange={(e) => setChoice(e.target.value)} sx={{ px: 3, py: 1 }}>
        {DISAPPEARING_CHOICES.map(({ value, label }) => (
          <FormControlLabel key={value} value={String(value)} control={<Radio />} label={label} />
        ))}
        <FormControlLabel value="off" control={<Radio />} label="Off" />
      </RadioGroup>
      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button onClick={onClose} disabled={isLoading} sx={{ borderRadius: "999px", color: "text.secondary" }}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={isLoading} sx={{ borderRadius: "999px", px: 2.5, minWidth: 96 }}>
          {isLoading ? <ButtonLoader label="Saving" /> : "Save"}
        </Button>
      </Stack>
    </Dialog>
  );
};

export default DisappearingDialog;
