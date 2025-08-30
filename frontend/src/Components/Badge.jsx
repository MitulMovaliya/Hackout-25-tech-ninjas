const Badge = ({
  children,
  variant = "default",
  size = "md",
  className = "",
}) => {
  const base =
    "inline-flex items-center font-medium rounded-full transition-all duration-200";

  const variants = {
    default: "bg-green-600 text-white shadow-sm hover:bg-green-700",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    success: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    warning: "bg-yellow-100 text-yellow-800 border border-yellow-200",
    danger: "bg-red-100 text-red-800 border border-red-200",
    info: "bg-blue-100 text-blue-800 border border-blue-200",
    outline:
      "bg-transparent border-2 border-green-600 text-green-600 hover:bg-green-50",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-xs",
    lg: "px-4 py-1.5 text-sm",
  };

  return (
    <span
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
};

export { Badge };
