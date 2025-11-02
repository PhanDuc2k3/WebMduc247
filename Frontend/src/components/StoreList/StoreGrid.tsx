import React from "react";
import StoreCard from "../../components/Home/FeaturedStores/StoreCard";
import type { StoreType } from "../../types/store";

interface Props {
  stores: StoreType[];
  onlineStores?: string[];
}

const StoreGrid: React.FC<Props> = ({ stores, onlineStores = [] }) => {
  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {stores.map((store, index) => (
        <div
          key={store._id}
          className="animate-slide-up"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <StoreCard
            storeId={store._id}
            ownerId={typeof store.owner === "string" ? store.owner : store.owner._id}
            name={store.name}
            description={store.description}
            logoUrl={store.logoUrl}
            bannerUrl={store.bannerUrl}
            createdAt={store.createdAt}
            isActive={store.isActive}
            customCategory={store.customCategory}
            isOnline={onlineStores.includes(store._id)}
          />
        </div>
      ))}
    </div>
  );
};

export default StoreGrid;
