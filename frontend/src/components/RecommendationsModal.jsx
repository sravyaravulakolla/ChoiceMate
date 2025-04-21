import React from "react";
import "./RecommendationsModal.css";

const RecommendationsModal = ({ products, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>
          &times;
        </button>
        <h3>Recommended Products</h3>
        <div className="products-grid">
          {products.map((product, index) => (
            <div key={index} className="product-card">
              <h4>{product.title}</h4>
              <p className="price">₹{product.price}</p>
              <p className="rating">⭐ {product.rating}</p>
              {product.reason && <p className="reason">{product.reason}</p>}
              <ul className="features-list">
                {product.description.split("||").map((feature, i) => (
                  <li key={i}>{feature.trim()}</li>
                ))}
              </ul>
              <a
                href={product.link}
                target="_blank"
                rel="noopener noreferrer"
                className="view-product-button"
              >
                View Product
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecommendationsModal;
