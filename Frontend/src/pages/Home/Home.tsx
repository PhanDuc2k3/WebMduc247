import { useEffect, useMemo, useState } from "react";
import productApi from "../../api/productApi";
import storeApi from "../../api/storeApi";
import CanvaCategories from "../../components/Home/CanvaHome/CanvaCategories";
import CanvaHero from "../../components/Home/CanvaHome/CanvaHero";
import CanvaProductSection from "../../components/Home/CanvaHome/CanvaProductSection";
import CanvaStoreSection from "../../components/Home/CanvaHome/CanvaStoreSection";
import { demoProducts, demoStores, type HomeProduct, type HomeStore } from "../../components/Home/CanvaHome/homeData";
import type { ProductType } from "../../types/product";
import type { StoreType } from "../../types/store";
import "../../components/Home/CanvaHome/CanvaHome.css";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null ? value as Record<string, unknown> : null;

const extractArray = <T,>(payload: unknown, keys: string[]): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  const root = asRecord(payload);
  if (!root) return [];
  for (const key of keys) if (Array.isArray(root[key])) return root[key] as T[];
  const nested = asRecord(root.data);
  if (nested) for (const key of keys) if (Array.isArray(nested[key])) return nested[key] as T[];
  return Array.isArray(root.data) ? root.data as T[] : [];
};

const toHomeProduct = (product: ProductType): HomeProduct => ({
  _id: product._id,
  name: product.name,
  price: product.price,
  salePrice: product.salePrice,
  images: product.images ?? [],
  rating: product.rating,
  reviewsCount: product.reviewsCount,
  soldCount: product.soldCount,
  quantity: product.quantity,
  category: product.category,
  isFeatured: product.isFeatured,
  createdAt: product.createdAt,
});

const toHomeStore = (store: StoreType): HomeStore => ({
  _id: store._id,
  name: store.name,
  logoUrl: store.logoUrl,
  category: store.customCategory || store.category,
  rating: store.rating,
  products: store.products,
});

const Home = () => {
  const [products, setProducts] = useState<HomeProduct[]>(demoProducts);
  const [stores, setStores] = useState<HomeStore[]>(demoStores);

  useEffect(() => {
    let active = true;
    const loadHomeData = async () => {
      const [productResult, storeResult] = await Promise.allSettled([
        productApi.getProducts({ limit: 100 }),
        storeApi.getAllActiveStores(),
      ]);
      if (!active) return;
      if (productResult.status === "fulfilled") {
        const liveProducts = extractArray<ProductType>(productResult.value.data, ["products", "items"])
          .filter((product) => product.isActive !== false)
          .map(toHomeProduct);
        if (liveProducts.length) setProducts(liveProducts);
      }
      if (storeResult.status === "fulfilled") {
        const liveStores = extractArray<StoreType>(storeResult.value.data, ["stores", "items"])
          .filter((store) => store.isActive !== false)
          .map(toHomeStore);
        if (liveStores.length) setStores(liveStores);
      }
    };
    void loadHomeData();
    return () => { active = false; };
  }, []);

  const flashProducts = useMemo(
    () => products.filter((product) => product.salePrice && product.salePrice < product.price).slice(0, 5),
    [products],
  );
  const featuredProducts = useMemo(() => {
    const featured = products.filter((product) => product.isFeatured);
    return (featured.length ? featured : products).slice(0, 4);
  }, [products]);
  const suggestedProducts = useMemo(() => products.slice(5, 17), [products]);

  return (
    <div className="canva-home">
      <CanvaHero />
      <CanvaCategories products={products} />
      <CanvaProductSection id="flash-sale" title={flashProducts.length ? "Flash Sale" : "Sản phẩm được quan tâm"} products={flashProducts.length ? flashProducts : products.slice(0, 5)} flash={flashProducts.length > 0} />
      <CanvaProductSection title="Sản phẩm nổi bật" products={featuredProducts} compact />
      <CanvaStoreSection stores={stores.slice(0, 8)} />
      <CanvaProductSection id="suggestions" kicker="Dành cho bạn" title="Gợi ý hôm nay" products={suggestedProducts.length ? suggestedProducts : products.slice(0, 10)} />
    </div>
  );
};

export default Home;
