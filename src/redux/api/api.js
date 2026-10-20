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
            query: ({ page = 1, take = CHAT_PAGE_SIZE, orderBy = "updatedAt", order = "desc" } = {}) => ({
                url: "chat/my",
                params: { page, take, orderBy, order },
                credentials: "include"
            }),
            serializeQueryArgs: ({ endpointName }) => endpointName,
            merge: (current, incoming, { arg }) => {
                // Page 1 (initial load or refresh) replaces the list; later pages append
                if (!arg?.page || arg.page === 1) return incoming;
                const seen = new Set(current.chats.map((chat) => chat._id));
                current.chats.push(...incoming.chats.filter((chat) => !seen.has(chat._id)));
                current.pagination = incoming.pagination;
            },
            forceRefetch: ({ currentArg, previousArg }) =>
                currentArg?.page !== previousArg?.page ||
                currentArg?.orderBy !== previousArg?.orderBy ||
                currentArg?.order !== previousArg?.order,
            keepUnusedDataFor: 0,
            providesTags: ["Chat"],
        }),

        searchUser: builder.query({
            query: (name) => ({
                url: `user/search?name=${name}`, credentials: "include"
            }),
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
                if (chatId) url += `?chatId=${chatId}`;
                return {
                    url: url, credentials: "include"
                }
            },
            keepUnusedDataFor: 0,
        }),

        newGroup: builder.mutation({
            // FormData: name, description, members (repeated), avatar
            query: (formData) => ({
                url: "chat/new",
                method: "POST",
                credentials: "include",
                body: formData
            }),
            keepUnusedDataFor: 0,
            invalidatesTags: ["Chat"],
        }),

        renameGroup: builder.mutation({
            // Pass either { chatId, name } or { chatId, formData } (name, description, avatar)
            query: ({ chatId, name, formData }) => ({
                url: `chat/${chatId}`,
                method: "PUT",
                credentials: "include",
                body: formData ?? { name }
            }),
            invalidatesTags: ["Chat"]
        }),

        removeGroupMember: builder.mutation({
            query: ({ chatId, userId }) => ({
                url: "chat/removeMember",
                method: "PUT",
                credentials: "include",
                body: { chatId, userId }
            }),
            invalidatesTags: ["Chat"]
        }),

        addGroupMembers: builder.mutation({
            query: ({ members, chatId }) => ({
                url: "chat/addMembers",
                method: "PUT",
                credentials: "include",
                body: { members, chatId }
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