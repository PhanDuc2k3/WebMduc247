import { identityAuthorizedRequest } from "./identityApi";

export type Profile = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  email: string;
  emailVerified: boolean;
  phoneMasked: string | null;
  phoneVerified: boolean;
  phoneEmailConfirmed: boolean;
  status: string;
  roles: Array<"buyer" | "seller" | "platform_admin">;
  marketingOptIn: boolean;
};

export type Address = {
  id: string;
  receiverName: string;
  receiverPhoneMasked?: string;
  receiverPhone?: string;
  provinceCode: string;
  districtCode: string;
  wardCode: string;
  addressLine: string;
  note: string | null;
  isDefault: boolean;
};

export type AddressInput = Omit<Address, "id" | "receiverPhoneMasked" | "isDefault" | "districtCode"> & { receiverPhone: string; districtCode?: string; isDefault?: boolean };
export type DeletionRequest = { id: string; status: "PENDING" | "CANCELLED" | "COMPLETED" | "REJECTED"; createdAt: string; updatedAt: string; resolvedAt: string | null; resolutionNote: string | null };

const base = "/users/me";
export const profileApi = {
  me: () => identityAuthorizedRequest<Profile>(base),
  exportPersonalData: () => identityAuthorizedRequest<unknown>(`${base}/data-export`),
  deletionRequest: () => identityAuthorizedRequest<{ request: DeletionRequest | null }>(`${base}/deletion-request`),
  requestDeletion: (password: string) => identityAuthorizedRequest<{ request: DeletionRequest; message: string }>(`${base}/deletion-request`, { method: "POST", body: { password } }),
  cancelDeletionRequest: () => identityAuthorizedRequest<{ request: DeletionRequest; message: string }>(`${base}/deletion-request`, { method: "DELETE" }),
  update: (displayName: string) => identityAuthorizedRequest<Profile>(base, { method: "PATCH", body: { displayName } }),
  uploadAvatar: (file: File) => identityAuthorizedRequest<Profile>(`${base}/avatar`, { method: "POST", body: file, contentType: file.type }),
  requestPhoneCode: (phone: string) => identityAuthorizedRequest<{ message: string; deliveryChannel: "email" | "sms" }>(`${base}/phone/challenge`, { method: "POST", body: { phone } }),
  verifyPhoneCode: (code: string) => identityAuthorizedRequest<Profile>(`${base}/phone/verify`, { method: "POST", body: { code } }),
  setMarketing: (marketingOptIn: boolean) => identityAuthorizedRequest<Profile>(`${base}/preferences`, { method: "PATCH", body: { marketingOptIn } }),
  addresses: () => identityAuthorizedRequest<{ addresses: Address[] }>(`${base}/addresses`),
  address: (id: string) => identityAuthorizedRequest<{ address: Address }>(`${base}/addresses/${id}`),
  createAddress: (body: AddressInput) => identityAuthorizedRequest<{ address: Address }>(`${base}/addresses`, { method: "POST", body }),
  updateAddress: (id: string, body: Partial<AddressInput>) => identityAuthorizedRequest<{ address: Address }>(`${base}/addresses/${id}`, { method: "PATCH", body }),
  deleteAddress: (id: string) => identityAuthorizedRequest<{ message: string }>(`${base}/addresses/${id}`, { method: "DELETE" }),
  setDefaultAddress: (id: string) => identityAuthorizedRequest<{ address: Address }>(`${base}/addresses/${id}/default`, { method: "PUT", body: {} }),
};
