import React, { useEffect, useRef } from "react";
import Banner from "../../components/Home/Banner/Banner";
import Categories from "../../components/Home/Categories/Categories";
import FeaturedProducts from "../../components/Home/FeaturedProducts/FeaturedProducts";
import FeaturedStores from "../../components/Home/FeaturedStores/FeaturedStores";
import SellerBox from "../../components/Home/SellerBox/SellerBox";

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
    <div className="w-full py-4 sm:py-6 md:py-12 lg:py-16">
      <div className="space-y-8 sm:space-y-12 md:space-y-20 lg:space-y-24">
        <div ref={(el) => { sectionsRef.current[0] = el; }} className="reveal">
          <Banner />
        </div>

        <div ref={(el) => { sectionsRef.current[1] = el; }} className="reveal">
          <Categories />
        </div>

        <div ref={(el) => { sectionsRef.current[2] = el; }} className="reveal">
          <FeaturedProducts />
        </div>

        <div ref={(el) => { sectionsRef.current[3] = el; }} className="reveal">
          <FeaturedStores />
        </div>

        <div ref={(el) => { sectionsRef.current[4] = el; }} className="reveal">
          <SellerBox />
        </div>
      </div>
    </div>
  );
};

export default Home;
