import React from "react";

function Button({
  children,
  variant = "default",
  size = "md",
  asChild = false,
  onClick,
  className = "",
  disabled = false,
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl font-semibold shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";

  const variants = {
    default:
      "bg-green-700 text-white hover:bg-green-800 focus:ring-green-500 shadow-green hover:shadow-xl",
    secondary:
      "bg-white text-green-700 border-2 border-green-700 hover:bg-green-50 hover:border-green-800 focus:ring-green-500 hover:shadow-green",
    mint: "bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-500 shadow-emerald hover:shadow-xl",
    hero: "bg-gradient-to-r from-green-600 to-emerald-500 text-white hover:from-green-700 hover:to-emerald-600 focus:ring-green-500 shadow-xl hover:shadow-2xl",
    outline:
      "border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white focus:ring-green-500",
    ghost: "text-green-700 hover:bg-green-100 focus:ring-green-500",
  };

  const sizes = {
    sm: "text-sm px-4 py-2",
    md: "text-base px-6 py-3",
    lg: "text-lg px-7 py-3.5",
    xl: "text-lg px-8 py-4",
  };

  const combinedClassName = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

  if (asChild) {
    return React.cloneElement(children, {
      className: combinedClassName,
      onClick,
      disabled,
    });
  }

  return (
    <button className={combinedClassName} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export default Button;
