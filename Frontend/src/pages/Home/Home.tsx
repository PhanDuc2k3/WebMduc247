import React, { useEffect, useRef } from "react";
import BannerSlider from "../../components/Home/Banner/Banner";
import Categories from "../../components/Home/Categories/Categories";
import FlashSale from "../../components/Home/FlashSale/FlashSale";
import ForYou from "../../components/Home/ForYou/ForYou";
import BestSellingStores from "../../components/Home/BestSellingStores/BestSellingStores";
import MidBanner from "../../components/Home/MidBanner/MidBanner";
import SellerBox from "../../components/Home/SellerBox/SellerBox";
import HomeFooter from "../../components/Home/HomeFooter/HomeFooter";

const Home: React.FC = () => {
  const sectionsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    sectionsRef.current.forEach((section) => {
      if (section) {
        observer.observe(section);
      }
    });

    return () => {
      sectionsRef.current.forEach((section) => {
        if (section) {
          observer.unobserve(section);
        }
      });
    };
  }, []);

  return (
    <div className="w-full bg-[#E5E9EC] min-h-screen">
      <div className="max-w-[1600px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
        {/* Banner Section */}
        <div ref={(el) => { sectionsRef.current[0] = el; }} className="reveal">
          <BannerSlider />
        </div>

        {/* Categories Section */}
        <div ref={(el) => { sectionsRef.current[1] = el; }} className="reveal">
          <Categories />
        </div>

        {/* Flash Sale Section */}
        <div ref={(el) => { sectionsRef.current[2] = el; }} className="reveal">
          <FlashSale />
        </div>

        {/* Best Selling Stores Section */}
        <div ref={(el) => { sectionsRef.current[3] = el; }} className="reveal">
          <BestSellingStores />
        </div>

        {/* For You Section */}
        <div ref={(el) => { sectionsRef.current[4] = el; }} className="reveal">
          <ForYou />
        </div>

        {/* Mid Banner Section */}
        <div ref={(el) => { sectionsRef.current[5] = el; }} className="reveal">
          <MidBanner />
        </div>

        {/* Seller Box Section */}
        <div ref={(el) => { sectionsRef.current[6] = el; }} className="reveal pb-8">
          <SellerBox />
        </div>
      </div>

      {/* Footer */}
      <HomeFooter />
    </div>
  );
};

export default Home;
