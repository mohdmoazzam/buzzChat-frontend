import { createSlice } from "@reduxjs/toolkit";
import { getOrSaveFromLocalStorage } from "../../lib/features";

const initialState = {
    newMessagesAlert: getOrSaveFromLocalStorage({ key: "NEW_MESSAGE_ALERT", get: true }) || [{
        chatId: "",
        count: 0
    }],
};

const chatSlice = createSlice({
    name: "chat",
    initialState: initialState,
    reducers: {
        setNewMessagesAlert: (state, action) => {
            const index = state.newMessagesAlert.findIndex((item) => item.chatId === action.payload.chatId);
            if (index !== -1) {
                state.newMessagesAlert[index].count += 1;
            } else {
                state.newMessagesAlert.push({
                    chatId: action.payload.chatId,
                    count: 1
                });
            }
        },

        removeNewMessagesAlert: (state, action) => {
            state.newMessagesAlert = state.newMessagesAlert.filter((item) => item.chatId !== action.payload.chatId);
        }
    }
});

export default chatSlice.reducer;
export const { setNewMessagesAlert, removeNewMessagesAlert } = chatSlice.actions;