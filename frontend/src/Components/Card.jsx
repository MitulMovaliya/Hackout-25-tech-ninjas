const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl p-4 ${className}`}>{children}</div>
);
const CardHeader = ({ children }) => <div className="mb-2">{children}</div>;
const CardContent = ({ children, className = "" }) => (
  <div className={className}>{children}</div>
);
const CardTitle = ({ children, className = "" }) => (
  <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>
);


export { Card, CardHeader, CardContent, CardTitle };