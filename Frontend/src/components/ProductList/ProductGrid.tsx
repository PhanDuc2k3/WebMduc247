import React from "react";
import type { ProductType } from "../../types/product";

interface Props {
  products: ProductType[];
}

const ProductGrid: React.FC<Props> = ({ products }) => {
  return (
    <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <div
          key={p._id}
          className="border rounded-xl p-4 bg-white hover:shadow-md transition"
        >
          <img
            src={p.images?.[0] || "/placeholder.jpg"}
            alt={p.name}
            className="h-40 w-full object-cover rounded-lg mb-3"
          />
          <h3 className="font-semibold text-lg truncate">{p.name}</h3>
          <p className="text-gray-500 text-sm mb-2">{p.brand}</p>
          <p className="font-bold text-gray-900">
            {p.salePrice ? (
              <>
                <span className="text-red-600 mr-2">
                  {p.salePrice.toLocaleString()}₫
                </span>
                <span className="text-gray-400 line-through text-sm">
                  {p.price.toLocaleString()}₫
                </span>
              </>
            ) : (
              `${p.price.toLocaleString()}₫`
            )}
          </p>
        </div>
      ))}
    </div>
  );
};

export default ProductGrid;
