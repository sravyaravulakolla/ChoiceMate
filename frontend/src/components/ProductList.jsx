import React from "react";

const ProductList = ({ products, isLoading }) => {
  // Ensure products is always an array
  const safeProducts = Array.isArray(products) ? products : [];

  return (
    <div className="product-list">
      {isLoading ? (
        <div className="loading">Loading products...</div>
      ) : safeProducts.length === 0 ? (
        <div className="no-products">
          No products found. Try adjusting your search!
        </div>
      ) : (
        safeProducts.map((product, index) => (
          <div key={index} className="product-card">
            {/* Your existing product card JSX */}
          </div>
        ))
      )}
    </div>
  );
};

export default ProductList;
