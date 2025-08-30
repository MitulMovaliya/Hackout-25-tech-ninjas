const Card = ({
  children,
  className = "",
  hover = false,
  padding = "default",
}) => {
  const baseStyles = "bg-white rounded-xl transition-all duration-300";
  const hoverStyles = hover ? "hover:shadow-xl hover:-translate-y-1" : "";
  const paddingStyles = {
    none: "",
    sm: "p-3",
    default: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={`${baseStyles} ${hoverStyles} ${paddingStyles[padding]} ${className}`}
    >
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = "" }) => (
  <div className={`mb-4 ${className}`}>{children}</div>
);

const CardContent = ({ children, className = "" }) => (
  <div className={className}>{children}</div>
);

const CardTitle = ({ children, className = "", size = "lg" }) => {
  const sizeStyles = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
    xl: "text-2xl",
  };

  return (
    <h3
      className={`${sizeStyles[size]} font-semibold text-gray-900 ${className}`}
    >
      {children}
    </h3>
  );
};

const CardDescription = ({ children, className = "" }) => (
  <p className={`text-gray-600 text-sm mt-1 ${className}`}>{children}</p>
);

const CardFooter = ({ children, className = "" }) => (
  <div className={`mt-6 pt-4 border-t border-gray-100 ${className}`}>
    {children}
  </div>
);

export {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  CardFooter,
};
