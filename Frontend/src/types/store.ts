export interface StoreType {
  _id: string;
  owner: { _id: string };
  name: string;
  description: string;
  join: string;
  status: "Đang online" | "Offline";
  tags: string[];
  logoUrl?: string;
  bannerUrl?: string;
}
