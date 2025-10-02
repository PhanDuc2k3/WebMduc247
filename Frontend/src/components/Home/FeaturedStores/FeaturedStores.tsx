import React, { useEffect, useState } from "react";
import StoreCard from "./StoreCard";

interface StoreType {
  _id: string;
  name: string;
  desc: string;
  join: string;
  status: string;
  tags: string[];
  logoUrl: string;
  bannerUrl: string;
}

const FeaturedStores: React.FC = () => {
  const [stores, setStores] = useState<StoreType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/stores");
        const data = await res.json();
        const mappedStores: StoreType[] = data.stores.map((s: any) => ({
          _id: s._id,
          name: s.name,
          desc: s.description,
          join: `Tham gia từ ${new Date(s.createdAt).getFullYear()}`,
          status: s.isActive ? "Đang online" : "Offline",
          tags: s.category ? [s.category] : [],
          logoUrl: s.logoUrl,
          bannerUrl: s.bannerUrl,
        }));
        setStores(mappedStores);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStores();
  }, []);

  if (loading)
    return <div className="p-6 text-center text-gray-500">Đang tải danh sách cửa hàng...</div>;

  return (
    <section className="mt-12 px-4 max-w-[1400px] mx-auto">
      <h3 className="text-xl font-semibold mb-2 text-gray-900">Tất cả cửa hàng</h3>
      <p className="text-gray-500 mb-6 text-base">Xem danh sách tất cả các cửa hàng</p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {stores.map((store) => (
          <StoreCard
            key={store._id}
            id={store._id}
            name={store.name}
            description={store.desc}
            join={store.join}
            status={store.status as "Đang online" | "Offline"}
            tags={store.tags}
            logoUrl={store.logoUrl}
            bannerUrl={store.bannerUrl}
          />
        ))}
      </div>
    </section>
  );
};

export default FeaturedStores;
