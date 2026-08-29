import React, { createContext, useContext, useEffect, useState } from 'react';

const RestaurantContext = createContext(null);

export const useRestaurant = () => {
  const ctx = useContext(RestaurantContext);
  if (!ctx) throw new Error('useRestaurant must be used within a RestaurantProvider');
  return ctx;
};

export function RestaurantProvider({ children }) {
  const [restaurant, setRestaurant] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('restaurantToken');
    const r = localStorage.getItem('restaurant');
    const role = localStorage.getItem('role');
    if (t && r && role === 'restaurant') {
      setRestaurant(JSON.parse(r));
      setIsLoggedIn(true);
    }
    setLoading(false);
  }, []);

  const login = (restaurantData, token) => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.setItem('restaurantToken', token);
    localStorage.setItem('restaurant', JSON.stringify(restaurantData));
    localStorage.setItem('role', 'restaurant');
    setRestaurant(restaurantData);
    setIsLoggedIn(true);
  };

  const logout = () => {
    localStorage.removeItem('restaurantToken');
    localStorage.removeItem('restaurant');
    if (localStorage.getItem('role') === 'restaurant') {
      localStorage.removeItem('role');
    }
    setRestaurant(null);
    setIsLoggedIn(false);
  };

  const updateRestaurant = (data) => {
    const updated = { ...restaurant, ...data };
    localStorage.setItem('restaurant', JSON.stringify(updated));
    setRestaurant(updated);
  };

  return (
    <RestaurantContext.Provider value={{
      restaurant,
      isLoggedIn,
      isRestaurantLoggedIn: isLoggedIn,
      login,
      logout,
      updateRestaurant,
      updateRestaurantData: updateRestaurant,
      restaurantLogout: logout,
      loading,
    }}>
      {!loading && children}
    </RestaurantContext.Provider>
  );
}
