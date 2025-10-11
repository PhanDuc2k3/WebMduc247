import React from "react";
import StoreCard from "../../components/Home/FeaturedStores/StoreCard";
import type { StoreType } from "../../types/store";

interface Props {
  stores: StoreType[];
}

const StoreGrid: React.FC<Props> = ({ stores }) => {
  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {stores.map((store) => (
        <StoreCard
          key={store._id}
          storeId={store._id}
          ownerId={store.owner._id}
          name={store.name}
          description={store.description}
          join={store.join}
          status={store.status}
          tags={store.tags}
          logoUrl={store.logoUrl}
          bannerUrl={store.bannerUrl}
        />
      ))}
    </div>
  );
};

export default StoreGrid;
