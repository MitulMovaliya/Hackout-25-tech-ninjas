const Badge = ({ children, variant = "default" }) => {
  const variants = {
    default: "bg-green-600 text-white",
    secondary: "bg-gray-200 text-gray-800",
  };
  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-lg ${variants[variant]}`}>
      {children}
    </span>
  );
};

export { Badge };