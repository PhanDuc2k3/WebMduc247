import React from "react";
import Banner from "../../components/Home/Banner/Banner";
import Categories from "../../components/Home/Categories/Categories";
import FeaturedProducts from "../../components/Home/FeaturedProducts/FeaturedProducts";
import FeaturedStores from "../../components/Home/FeaturedStores/FeaturedStores";
import SellerBox from "../../components/Home/SellerBox/SellerBox";

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
