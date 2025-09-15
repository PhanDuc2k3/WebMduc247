import React from "react";
import Banner from "../../components/Banner/Banner";
import Categories from "../../components/Categories/Categories";
import FeaturedProducts from "../../components/FeaturedProducts/FeaturedProducts";
import FeaturedStores from "../../components/FeaturedStores/FeaturedStores";
import SellerBox from "../../components/SellerBox/SellerBox";

const Home: React.FC = () => {
  return (
    <>
      <Banner />
      <Categories />
      <FeaturedProducts />
      <FeaturedStores />
      <SellerBox />
    </>
  );
};

export default Home;
