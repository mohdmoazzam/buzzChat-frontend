import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { server } from "../../constants/config";
import { userNotExists } from "../reducers/auth";


export const CHAT_PAGE_SIZE = 20;

const rawBaseQuery = fetchBaseQuery({
    baseUrl: `${server}/api/v1/`,
    prepareHeaders: (headers, { getState }) => {
        const token = getState().auth.token;
        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }
    }
});

// A 401 means this device's session was logged out or expired, so drop back to the login page
const baseQuery = async (args, queryApi, extraOptions) => {
    const result = await rawBaseQuery(args, queryApi, extraOptions);
    if (result.error?.status === 401 && queryApi.getState().auth.user) {
        queryApi.dispatch(userNotExists());
    }
    return result;
};

const api = createApi({
    reducerPath: "api",
    baseQuery,
    tagTypes: ["Chat", "Notifications", "Activity", "Unread", "Sessions"],
    // Refresh data when the tab regains focus or the network comes back
    refetchOnFocus: true,
    refetchOnReconnect: true,
    endpoints: (builder) => ({
        // Paginated; every page is merged into one cached list for infinite scroll
        myChats: builder.query({
            query: ({ page = 1, take = CHAT_PAGE_SIZE, orderBy = "updated_at", order = "desc", search = "" } = {}) => ({
                url: "chat",
                params: { page, take, order_by: orderBy, order, ...(search ? { search } : {}) },
                credentials: "include"
            }),
            serializeQueryArgs: ({ endpointName }) => endpointName,
            merge: (current, incoming, { arg }) => {
                // Page 1 (initial load or refresh) replaces the list; later pages append
                if (!arg?.page || arg.page === 1) return incoming;
                const seen = new Set(current.chats.map((chat) => chat.id));
                current.chats.push(...incoming.chats.filter((chat) => !seen.has(chat.id)));
                current.pagination = incoming.pagination;
            },
            forceRefetch: ({ currentArg, previousArg }) =>
                currentArg?.page !== previousArg?.page ||
                currentArg?.orderBy !== previousArg?.orderBy ||
                currentArg?.order !== previousArg?.order ||
                currentArg?.search !== previousArg?.search,
            keepUnusedDataFor: 0,
            providesTags: ["Chat"],
        }),

        // Unread messages across all chats (tab title); refreshed on NEW_MESSAGE_ALERT / MESSAGES_READ
        unreadTotal: builder.query({
            query: () => ({ url: "chat/unread-count", credentials: "include" }),
            providesTags: ["Unread"],
        }),

        // Paginated people search (Find People)
        searchUser: builder.query({
            query: ({ search = "", page = 1, take = 20 } = {}) => ({
                url: "user/search",
                params: { page, take, ...(search ? { search } : {}) },
                credentials: "include"
            }),
            keepUnusedDataFor: 0,
        }),

        sendFriendRequest: builder.mutation({
            query: (data) => ({
                url: "user/friend-requests",
                method: "POST",
                credentials: "include",
                body: data
            }),
            keepUnusedDataFor: 0,
        }),

        acceptFriendRequest: builder.mutation({
            // { request_id, accept }
            query: ({ request_id, accept }) => ({
                url: `user/friend-requests/${request_id}`,
                method: "PUT",
                credentials: "include",
                body: { accept }
            }),
            keepUnusedDataFor: 0,
            // Show the new friend right away, even if the socket event is missed
            invalidatesTags: ["Chat", "Notifications"],
        }),

        getNotifications: builder.query({
            query: () => ({
                url: "user/friend-requests", credentials: "include"
            }),
            keepUnusedDataFor: 0,
            providesTags: ["Notifications"],
        }),

        // In-app notifications (friend accepted, added to a group, ...) with the unread count
        getActivity: builder.query({
            query: ({ take = 20 } = {}) => ({
                url: "notifications",
                params: { take },
                credentials: "include"
            }),
            providesTags: ["Activity"],
        }),

        markAllActivityRead: builder.mutation({
            query: () => ({
                url: "notifications/read-all",
                method: "PATCH",
                credentials: "include"
            }),
            invalidatesTags: ["Activity"],
        }),

        getChatDetails: builder.query({
            query: ({ chatId, populate = false }) => {
                let url = `chat/${chatId}`;
                if (populate) url += "?populate=true";
                return {
                    url: url, credentials: "include"
                }
            },
           providesTags: ["Chat"]
        }),

        getChatMessages: builder.query({
            query: ({ chatId, page }) => ({
                url: `chat/${chatId}/messages?page=${page}`,
                credentials: "include"
            }),
            keepUnusedDataFor: 0,
        }),

        // Files go here first (multipart "files"); other endpoints take the returned asset ids
        uploadAssets: builder.mutation({
            query: (files) => {
                const body = new FormData();
                files.forEach((file) => body.append("files", file));
                return { url: "assets", method: "POST", credentials: "include", body };
            },
        }),

        // { chat_id, attachment_ids }
        sendAttachments: builder.mutation({
            query: ({ chat_id, attachment_ids }) => ({
                url: `chat/${chat_id}/messages`,
                method: "POST",
                credentials: "include",
                body: { attachment_ids }
            }),
            keepUnusedDataFor: 0,
        }),

        // { chatId, messageId, content }
        editMessage: builder.mutation({
            query: ({ chatId, messageId, content }) => ({
                url: `chat/${chatId}/messages/${messageId}`,
                method: "PATCH",
                credentials: "include",
                body: { content }
            }),
        }),

        // Deletes for everyone
        deleteMessage: builder.mutation({
            query: ({ chatId, messageId }) => ({
                url: `chat/${chatId}/messages/${messageId}`,
                method: "DELETE",
                credentials: "include"
            }),
        }),

        // { chatId, messageId, chat_ids }
        forwardMessage: builder.mutation({
            query: ({ chatId, messageId, chat_ids }) => ({
                url: `chat/${chatId}/messages/${messageId}/forward`,
                method: "POST",
                credentials: "include",
                body: { chat_ids }
            }),
        }),

        // Chats to forward to: its own cache, so it doesn't reset the merged chat list
        forwardTargets: builder.query({
            query: (search = "") => ({
                url: "chat",
                params: { page: 1, take: 30, order_by: "updated_at", order: "desc", ...(search ? { search } : {}) },
                credentials: "include"
            }),
            keepUnusedDataFor: 0,
        }),

        myGroups: builder.query({
            query: () => ({
                url: "chat/groups",
                credentials: "include"
            }),
            keepUnusedDataFor: 0,
            providesTags: ["Chat"],
        }),

        availableFriends: builder.query({
            query: (chatId) => {
                let url = "user/friends";
                if (chatId) url += `?chat_id=${chatId}`;
                return {
                    url: url, credentials: "include"
                }
            },
            keepUnusedDataFor: 0,
        }),

        newGroup: builder.mutation({
            // { name, description, members, avatar_id? }
            query: (body) => ({
                url: "chat/groups",
                method: "POST",
                credentials: "include",
                body
            }),
            keepUnusedDataFor: 0,
            invalidatesTags: ["Chat"],
        }),

        renameGroup: builder.mutation({
            // { chatId, ...fields } where fields are name, description and/or avatar_id
            query: ({ chatId, ...fields }) => ({
                url: `chat/${chatId}`,
                method: "PUT",
                credentials: "include",
                body: fields
            }),
            invalidatesTags: ["Chat"]
        }),

        removeGroupMember: builder.mutation({
            query: ({ chatId, userId }) => ({
                url: `chat/${chatId}/members/${userId}`,
                method: "DELETE",
                credentials: "include"
            }),
            invalidatesTags: ["Chat"]
        }),

        addGroupMembers: builder.mutation({
            query: ({ members, chatId }) => ({
                url: `chat/${chatId}/members`,
                method: "POST",
                credentials: "include",
                body: { members }
            }),
            invalidatesTags: ["Chat"]
        }),

        deleteChat: builder.mutation({
            query: (chatId ) => ({
                url: `chat/${chatId}`,
                method: "DELETE",
                credentials: "include"
            }),
            invalidatesTags: ["Chat"]
        }),

        leaveGroup: builder.mutation({
            query: (chatId ) => ({
                url: `chat/${chatId}/members/me`,
                method: "DELETE",
                credentials: "include"
            }),
            invalidatesTags: ["Chat"]
        }),

        checkUsername: builder.query({
            query: (username) => ({
                url: `user/check-username?username=${encodeURIComponent(username)}`,
                credentials: "include"
            }),
            keepUnusedDataFor: 0,
        }),

        updateProfile: builder.mutation({
            query: (data) => ({
                url: "user/me",
                method: "PUT",
                credentials: "include",
                body: data
            }),
        }),

        // Devices this account is logged in on; the caller's own is marked `current`
        getSessions: builder.query({
            query: () => ({ url: "user/sessions", credentials: "include" }),
            keepUnusedDataFor: 0,
            providesTags: ["Sessions"],
        }),

        revokeSession: builder.mutation({
            query: (sessionId) => ({
                url: `user/sessions/${sessionId}`,
                method: "DELETE",
                credentials: "include"
            }),
            invalidatesTags: ["Sessions"]
        }),

        // Every device except this one
        revokeOtherSessions: builder.mutation({
            query: () => ({
                url: "user/sessions/others",
                method: "DELETE",
                credentials: "include"
            }),
            invalidatesTags: ["Sessions"]
        }),

        // Every device, this one included
        revokeAllSessions: builder.mutation({
            query: () => ({
                url: "user/sessions",
                method: "DELETE",
                credentials: "include"
            }),
        }),
    })
});

export default api;

export const {
    useMyChatsQuery,
    useUnreadTotalQuery,
    useLazySearchUserQuery,
    useSendFriendRequestMutation,
    useGetNotificationsQuery,
    useAcceptFriendRequestMutation,
    useGetActivityQuery,
    useMarkAllActivityReadMutation,
    useGetChatDetailsQuery,
    useGetChatMessagesQuery,
    useSendAttachmentsMutation,
    useUploadAssetsMutation,
    useEditMessageMutation,
    useDeleteMessageMutation,
    useForwardMessageMutation,
    useForwardTargetsQuery,
    useMyGroupsQuery,
    useAvailableFriendsQuery,
    useNewGroupMutation,
    useRenameGroupMutation,
    useRemoveGroupMemberMutation,
    useAddGroupMembersMutation,
    useDeleteChatMutation,
    useLeaveGroupMutation,
    useUpdateProfileMutation,
    useLazyCheckUsernameQuery,
    useGetSessionsQuery,
    useRevokeSessionMutation,
    useRevokeOtherSessionsMutation,
    useRevokeAllSessionsMutation
} = api;