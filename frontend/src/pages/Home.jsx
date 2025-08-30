
import Navbar from "../Components/Navbar";
import { Card, CardHeader, CardContent, CardTitle } from "../Components/Card";
import { Badge } from "../Components/Badge";

import Button from "../Components/Button";


// ✅ Icons (minimal emoji fallback)
const FileText = () => <span>📄</span>;
const TrendingUp = () => <span>📈</span>;
const MapPin = () => <span>📍</span>;
const Clock = () => <span>⏰</span>;
const Users = () => <span>👥</span>;
const Star = () => <span>⭐</span>;
const TreePine = () => <span>🌲</span>;

// ✅ Home Page
const Home = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="pt-20 pb-8">
        {/* Hero Section */}
        <section className="bg-green-700 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Welcome to MangroveWatch
            </h1>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Your hub for community-driven mangrove conservation. Together, we're making a real difference.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="secondary" size="xl">
                <a href="/report" className="flex items-center space-x-2">
                  <FileText />
                  <span>Report an Issue</span>
                </a>
              </Button>
              <Button variant="mint" size="xl">
                <a href="/leaderboard" className="flex items-center space-x-2">
                  <TrendingUp />
                  <span>View Leaderboard</span>
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 bg-green-50">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="text-center shadow-md">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-green-700 mb-2">1,247</div>
                  <div className="text-gray-500">Total Reports</div>
                </CardContent>
              </Card>
              <Card className="text-center shadow-md">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-emerald-600 mb-2">892</div>
                  <div className="text-gray-500">Resolved Cases</div>
                </CardContent>
              </Card>
              <Card className="text-center shadow-md">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-blue-500 mb-2">3,456</div>
                  <div className="text-gray-500">Active Users</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-green-700 mb-8">Recent Community Activity</h2>
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Reports */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText />
                    <span>Latest Reports</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { title: "Illegal Dumping Detected", location: "Sundarbans, Bangladesh", status: "Under Review", time: "2h ago" },
                    { title: "New Mangrove Planting", location: "Everglades, Florida", status: "Verified", time: "4h ago" },
                    { title: "Coastal Erosion Alert", location: "Kakadu, Australia", status: "In Progress", time: "6h ago" },
                  ].map((report, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-gray-200">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{report.title}</h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                          <MapPin />
                          <span>{report.location}</span>
                          <Clock />
                          <span>{report.time}</span>
                        </div>
                      </div>
                      <Badge variant={report.status === "Verified" ? "default" : "secondary"}>
                        {report.status}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Heroes */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users />
                    <span>Community Heroes</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { name: "Maya Patel", achievement: "Top Reporter", points: "1,250 pts", avatar: "🌱" },
                    { name: "Carlos Rivera", achievement: "Conservation Leader", points: "980 pts", avatar: "🌊" },
                    { name: "Aisha Johnson", achievement: "Community Builder", points: "875 pts", avatar: "🌿" },
                  ].map((user, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-green-50 border border-gray-200">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg">
                        {user.avatar}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{user.name}</h4>
                        <p className="text-sm text-gray-600">{user.achievement}</p>
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-green-700 font-medium">
                        <Star />
                        <span>{user.points}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 bg-gradient-to-r from-green-600 to-emerald-500 text-white">
          <div className="container mx-auto px-4 text-center">
            <TreePine className="h-16 w-16 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">
              Join the Movement - Protect Mangroves Together
            </h2>
            <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
              Every report makes a difference. Every action counts. Be part of the global effort to protect our coastal guardians.
            </p>
            <Button variant="hero" size="xl">
              <a href="/report">Submit Your First Report</a>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;
