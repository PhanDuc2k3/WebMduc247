import React from "react";
import Banner from "../../components/Home/Banner/Banner";
import Categories from "../../components/Home/Categories/Categories";
import FeaturedProduct from "../../components/Store/FeaturedProduct/FeaturedProduct";
import FeaturedStores from "../../components/Home/FeaturedStores/FeaturedStores";
import SellerBox from "../../components/Home/SellerBox/SellerBox";

const Home: React.FC = () => {
  const storeId = "default_store_id"; // 👈 luôn truyền storeId

  return (
    <>
      <Banner />
      <Categories />
      <FeaturedProduct storeId={storeId} />
      <FeaturedStores />
      <SellerBox />
    </>
  );
};

export default Home;
