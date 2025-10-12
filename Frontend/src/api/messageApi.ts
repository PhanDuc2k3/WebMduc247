import axiosClient from "./axiosClient";

export interface Conversation {
  _id: string;
  members: string[];
  createdAt?: string;
  updatedAt?: string;
}

const messageApi = {
  createOrGetConversation: (senderId: string, receiverId: string) =>
    axiosClient.post<Conversation>("/api/messages/conversation", { senderId, receiverId }),
};

export default messageApi;
