import React from 'react'

function Button({ children, variant = "default", size = "md", asChild = false, onClick }) {
  const base =
    "rounded-2xl font-semibold shadow px-6 py-3 transition-all duration-300";
  const variants = {
    default: "bg-green-700 text-white hover:bg-green-800",
    secondary: "bg-white text-green-700 border border-green-700 hover:bg-green-50",
    mint: "bg-emerald-500 text-white hover:bg-emerald-600",
    hero: "bg-gradient-to-r from-green-600 to-emerald-500 text-white hover:opacity-90",
  };
  const sizes = {
    md: "text-base",
    xl: "text-lg px-8 py-4",
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default Button