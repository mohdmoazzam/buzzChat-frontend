import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { server } from "../../constants/config";
import { userNotExists } from "../reducers/auth";


// How many rows each list asks for per page (sent as ?take=; the server caps it)
export const PAGE_SIZE = {
    chats: 20,
    messages: 20,
    people: 20,
    notifications: 20,
    members: 20,
    forwardTargets: 30,
};
export const CHAT_PAGE_SIZE = PAGE_SIZE.chats;

// Provided by the chat and group lists (alongside "Chat"), so a mutation can refresh just those
const CHAT_LISTS = { type: "Chat", id: "LIST" };

// List APIs are cursor-paginated: no cursor = first page, then pass back pagination.next_cursor
const cursorParam = (cursor) => (cursor ? { cursor } : {});

// For lists cached as one merged entry: the first page (initial load or refresh) replaces it,
// later pages append without duplicates (a re-sorted list can repeat rows across pages)
const mergeCursorPage = (listKey) => (current, incoming, { arg }) => {
    if (!arg?.cursor) return incoming;
    const seen = new Set(current[listKey].map((item) => item.id));
    current[listKey].push(...incoming[listKey].filter((item) => !seen.has(item.id)));
    current.pagination = incoming.pagination;
};

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
        // Cursor-paginated; every page is merged into one cached list for infinite scroll
        myChats: builder.query({
            query: ({ cursor, take = CHAT_PAGE_SIZE, orderBy = "updated_at", order = "desc", search = "" } = {}) => ({
                url: "chat",
                params: { take, order_by: orderBy, order, ...cursorParam(cursor), ...(search ? { search } : {}) },
                credentials: "include"
            }),
            serializeQueryArgs: ({ endpointName }) => endpointName,
            merge: mergeCursorPage("chats"),
            forceRefetch: ({ currentArg, previousArg }) =>
                currentArg?.cursor !== previousArg?.cursor ||
                currentArg?.orderBy !== previousArg?.orderBy ||
                currentArg?.order !== previousArg?.order ||
                currentArg?.search !== previousArg?.search,
            keepUnusedDataFor: 0,
            providesTags: ["Chat", CHAT_LISTS],
        }),

        // Unread messages across all chats (tab title); refreshed on NEW_MESSAGE_ALERT / MESSAGES_READ
        unreadTotal: builder.query({
            query: () => ({ url: "chat/unread-count", credentials: "include" }),
            providesTags: ["Unread"],
        }),

        // Cursor-paginated people search (Find People)
        searchUser: builder.query({
            query: ({ search = "", cursor, take = PAGE_SIZE.people } = {}) => ({
                url: "user/search",
                params: { take, ...cursorParam(cursor), ...(search ? { search } : {}) },
                credentials: "include"
            }),
            keepUnusedDataFor: 0,
        }),

        // Someone's public profile with how they relate to you and the groups you share
        getUserProfile: builder.query({
            query: (userId) => ({ url: `user/profile/${userId}`, credentials: "include" }),
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

        // In-app notifications (friend accepted, added to a group, ...) with the unread count.
        // No cursor = the newest page (shared with the header bell); a cursor = an older page
        getActivity: builder.query({
            query: ({ take = PAGE_SIZE.notifications, cursor } = {}) => ({
                url: "notifications",
                params: { take, ...cursorParam(cursor) },
                credentials: "include"
            }),
            providesTags: ["Activity"],
        }),

        // Disappearing messages: { chatId, seconds } (null = off); the chat's details carry the timer
        setDisappearing: builder.mutation({
            query: ({ chatId, seconds }) => ({ url: `chat/${chatId}/disappearing`, method: "PUT", credentials: "include", body: { seconds } }),
        }),

        // Delete my account: email the confirmation code, then delete with { otp }
        sendDeleteAccountCode: builder.mutation({
            query: () => ({ url: "user/delete-account/code", method: "POST", credentials: "include" }),
        }),
        deleteAccount: builder.mutation({
            query: (body) => ({ url: "user/delete-account", method: "POST", credentials: "include", body }),
        }),

        // { current_password, new_password }; logs out the user's other devices
        changePassword: builder.mutation({
            query: (body) => ({
                url: "user/password",
                method: "PUT",
                credentials: "include",
                body
            }),
            invalidatesTags: ["Sessions"],
        }),

        // Removed from the newest page at once (undone if the request fails); the page drops it from older ones
        deleteNotification: builder.mutation({
            query: (id) => ({
                url: `notifications/${id}`,
                method: "DELETE",
                credentials: "include"
            }),
            async onQueryStarted(id, { dispatch, queryFulfilled }) {
                const patch = dispatch(
                    api.util.updateQueryData("getActivity", undefined, (draft) => {
                        const removed = draft.data.find((item) => item.id === id);
                        draft.data = draft.data.filter((item) => item.id !== id);
                        if (removed && !removed.read) draft.unread_count = Math.max(0, draft.unread_count - 1);
                    })
                );
                try {
                    await queryFulfilled;
                } catch {
                    patch.undo();
                }
            },
        }),

        clearNotifications: builder.mutation({
            query: () => ({
                url: "notifications",
                method: "DELETE",
                credentials: "include"
            }),
            invalidatesTags: ["Activity"],
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

        // Cursor-paginated members (join order); pages for a chat merge into one list for "Show more"
        groupMembers: builder.query({
            query: ({ chatId, cursor, take = PAGE_SIZE.members }) => ({
                url: `chat/${chatId}/members`,
                params: { take, ...cursorParam(cursor) },
                credentials: "include"
            }),
            serializeQueryArgs: ({ queryArgs }) => queryArgs.chatId,
            merge: mergeCursorPage("members"),
            forceRefetch: ({ currentArg, previousArg }) => currentArg?.cursor !== previousArg?.cursor,
            keepUnusedDataFor: 0,
            providesTags: ["Chat"],
        }),

        // One page of history: no cursor = the newest messages, then the cursor of the oldest one loaded
        getChatMessages: builder.query({
            query: ({ chatId, cursor, take = PAGE_SIZE.messages }) => ({
                url: `chat/${chatId}/messages`,
                params: { take, ...cursorParam(cursor) },
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
            query: ({ chat_id, attachment_ids, reply_to_id }) => ({
                url: `chat/${chat_id}/messages`,
                method: "POST",
                credentials: "include",
                body: { attachment_ids, ...(reply_to_id ? { reply_to_id } : {}) }
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
                params: { take: PAGE_SIZE.forwardTargets, order_by: "updated_at", order: "desc", ...(search ? { search } : {}) },
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
            providesTags: ["Chat", CHAT_LISTS],
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
            // Only the lists: refetching the deleted chat would fail and toast "not found"
            invalidatesTags: [CHAT_LISTS]
        }),

        leaveGroup: builder.mutation({
            query: (chatId ) => ({
                url: `chat/${chatId}/members/me`,
                method: "DELETE",
                credentials: "include"
            }),
            // Only the lists: refetching the group just left would fail and toast "not found"
            invalidatesTags: [CHAT_LISTS]
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
    useGetUserProfileQuery,
    useSendFriendRequestMutation,
    useGetNotificationsQuery,
    useAcceptFriendRequestMutation,
    useGetActivityQuery,
    useLazyGetActivityQuery,
    useMarkAllActivityReadMutation,
    useDeleteNotificationMutation,
    useChangePasswordMutation,
    useSetDisappearingMutation,
    useSendDeleteAccountCodeMutation,
    useDeleteAccountMutation,
    useClearNotificationsMutation,
    useGetChatDetailsQuery,
    useGetChatMessagesQuery,
    useGroupMembersQuery,
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