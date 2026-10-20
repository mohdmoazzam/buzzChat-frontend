import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import authReducer from "./reducers/auth";
import miscReducer from "./reducers/misc";
import chatReducer from "./reducers/chat";
import api from "./api/api";

const store = configureStore({
    reducer: {
        "auth": authReducer,
        "misc": miscReducer,
        "chat": chatReducer,
        [api.reducerPath]: api.reducer,
    },
    middleware: (defaultMiddleware) => [...defaultMiddleware(), api.middleware],
});

// Enables refetchOnFocus / refetchOnReconnect for the API
setupListeners(store.dispatch);

export default store;