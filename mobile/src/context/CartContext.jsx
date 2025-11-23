// context/CartContext.js
import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  const addToCart = (item) => {
    const exists = cart.find((i) => i.id === item.id);
    if (exists) {
      setCart(
        cart.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const removeFromCart = (id) => setCart(cart.filter((i) => i.id !== id));
  const increaseQuantity = (id) =>
    setCart(cart.map((i) => i.id === id ? { ...i, quantity: i.quantity + 1 } : i));
  const decreaseQuantity = (id) =>
    setCart(cart.map((i) => i.id === id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i));

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, increaseQuantity, decreaseQuantity }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
