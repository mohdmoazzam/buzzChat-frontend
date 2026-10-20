import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { server } from "../../constants/config";


export const CHAT_PAGE_SIZE = 20;

const api = createApi({
    reducerPath: "api",
    baseQuery: fetchBaseQuery({
        baseUrl: `${server}/api/v1/`,
        prepareHeaders: (headers, { getState }) => {
            const token = getState().auth.token;
            if (token) {
                headers.set("Authorization", `Bearer ${token}`);
            }
        }
    }),
    tagTypes: ["Chat", "Notifications"],
    // Refresh data when the tab regains focus or the network comes back
    refetchOnFocus: true,
    refetchOnReconnect: true,
    endpoints: (builder) => ({
        // Paginated; every page is merged into one cached list for infinite scroll
        myChats: builder.query({
            query: ({ page = 1, take = CHAT_PAGE_SIZE, orderBy = "updated_at", order = "desc", search = "" } = {}) => ({
                url: "chat/my",
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
                url: "user/sendRequest",
                method: "POST",
                credentials: "include",
                body: data
            }),
            keepUnusedDataFor: 0,
        }),

        acceptFriendRequest: builder.mutation({
            query: (data) => ({
                url: "user/acceptRequest",
                method: "PUT",
                credentials: "include",
                body: data
            }),
            keepUnusedDataFor: 0,
            // Show the new friend right away, even if the socket event is missed
            invalidatesTags: ["Chat", "Notifications"],
        }),

        getNotifications: builder.query({
            query: () => ({
                url: `user/myNotifications`, credentials: "include"
            }),
            keepUnusedDataFor: 0,
            providesTags: ["Notifications"],
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
                url: `chat/message/${chatId}?page=${page}`,
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
            query: (data) => ({
                url: "chat/message",
                method: "POST",
                credentials: "include",
                body: data
            }),
            keepUnusedDataFor: 0,
        }),

        myGroups: builder.query({
            query: () => ({
                url: "chat/my/groups",
                credentials: "include"
            }),
            keepUnusedDataFor: 0,
            providesTags: ["Chat"],
        }),

        availableFriends: builder.query({
            query: (chatId) => {
                let url = `user/myFriends`;
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
                url: "chat/new",
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
                url: "chat/removeMember",
                method: "PUT",
                credentials: "include",
                body: { chat_id: chatId, user_id: userId }
            }),
            invalidatesTags: ["Chat"]
        }),

        addGroupMembers: builder.mutation({
            query: ({ members, chatId }) => ({
                url: "chat/addMembers",
                method: "PUT",
                credentials: "include",
                body: { members, chat_id: chatId }
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
                url: `chat/leave/${chatId}`,
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
    })
});

export default api;

export const {
    useMyChatsQuery,
    useLazySearchUserQuery,
    useSendFriendRequestMutation,
    useGetNotificationsQuery,
    useAcceptFriendRequestMutation,
    useGetChatDetailsQuery,
    useGetChatMessagesQuery,
    useSendAttachmentsMutation,
    useUploadAssetsMutation,
    useMyGroupsQuery,
    useAvailableFriendsQuery,
    useNewGroupMutation,
    useRenameGroupMutation,
    useRemoveGroupMemberMutation,
    useAddGroupMembersMutation,
    useDeleteChatMutation,
    useLeaveGroupMutation,
    useUpdateProfileMutation,
    useLazyCheckUsernameQuery
} = api;