import React from "react";

const Avatar = ({ src, alt, className = "", children }) => {
  return (
    <div
      className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-gray-200 ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={alt || "avatar"}
          className="w-full h-full object-cover"
        />
      ) : (
        children
      )}
    </div>
  );
};

const AvatarFallback = ({ children }) => {
  return <span className="text-gray-600 font-medium">{children}</span>;
};

export { Avatar, AvatarFallback };
