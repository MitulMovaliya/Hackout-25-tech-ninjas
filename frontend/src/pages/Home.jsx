import { motion } from "framer-motion";
import Navbar from "../Components/Navbar";
import { Card, CardHeader, CardContent, CardTitle } from "../Components/Card";
import { Badge } from "../Components/Badge";
import Footer from "../Components/footer.jsx";
import Button from "../Components/Button.jsx";
import {
  fadeInUp,
  fadeInDown,
  scaleIn,
  staggerContainer,
  slideInFromBottom,
  hoverScale,
  floatingAnimation,
} from "../utils/animations.js";
import {
  FileText,
  TrendingUp,
  MapPin,
  Clock,
  Users,
  Star,
  TreeDeciduous as Tree,
  Leaf,
  Waves,
  Sprout,
  Shield,
  Award,
  Eye,
  List,
  Trophy,
  User,
  Calendar,
  BarChart3,
  Plus,
  Medal,
} from "lucide-react";

// ✅ Home Page
const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      <Navbar />

      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-green-700 via-green-600 to-emerald-600 text-white py-20 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-20">
            <motion.div
              {...floatingAnimation}
              className="absolute top-10 left-10 text-green-300"
            >
              <Leaf className="w-16 h-16" />
            </motion.div>
            <motion.div
              {...floatingAnimation}
              style={{ animationDelay: "2s" }}
              className="absolute top-32 right-20 text-green-300"
            >
              <Waves className="w-12 h-12" />
            </motion.div>
            <motion.div
              {...floatingAnimation}
              style={{ animationDelay: "4s" }}
              className="absolute bottom-20 left-32 text-green-300"
            >
              <Sprout className="w-14 h-14" />
            </motion.div>
            <motion.div
              {...floatingAnimation}
              style={{ animationDelay: "1s" }}
              className="absolute bottom-10 right-10 text-green-300"
            >
              <Tree className="w-20 h-20" />
            </motion.div>
          </div>

          <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl text-center">
            <motion.div
              className="max-w-4xl mx-auto"
              {...staggerContainer}
              initial="initial"
              animate="animate"
            >
              <motion.h1
                {...fadeInDown}
                className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
              >
                Welcome to <span className="text-green-300">MangroveWatch</span>
              </motion.h1>
              <motion.p
                {...fadeInUp}
                className="text-lg md:text-xl lg:text-2xl mb-8 opacity-90 max-w-3xl mx-auto leading-relaxed"
              >
                Your hub for community-driven mangrove conservation. Together,
                we're making a real difference in protecting our coastal
                guardians.
              </motion.p>
              <motion.div
                {...slideInFromBottom}
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              >
                <motion.div {...hoverScale}>
                  <Button variant="secondary" size="xl">
                    <a href="/report" className="flex items-center space-x-2">
                      <FileText className="w-5 h-5" />
                      <span>Report an Issue</span>
                    </a>
                  </Button>
                </motion.div>
                <motion.div {...hoverScale}>
                  <Button variant="mint" size="xl">
                    <a
                      href="/leaderboard"
                      className="flex items-center space-x-2"
                    >
                      <TrendingUp className="w-5 h-5" />
                      <span>View Leaderboard</span>
                    </a>
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </section>
        <section className="py-16 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <motion.div
              className="text-center mb-12"
              {...fadeInUp}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-green-800 mb-4">
                Our Impact
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                See how our community is making a difference in mangrove
                conservation worldwide
              </p>
            </motion.div>
            <motion.div
              className="grid md:grid-cols-3 gap-8"
              {...staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              <motion.div {...scaleIn}>
                <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 bg-white hover-lift">
                  <CardContent className="pt-8 pb-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="text-4xl font-bold text-green-700 mb-2">
                      1,247
                    </div>
                    <div className="text-gray-600 font-medium">
                      Total Reports
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      +15% this month
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div {...scaleIn}>
                <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 bg-white hover-lift">
                  <CardContent className="pt-8 pb-6">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div className="text-4xl font-bold text-emerald-600 mb-2">
                      892
                    </div>
                    <div className="text-gray-600 font-medium">
                      Resolved Cases
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      71% success rate
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div {...scaleIn}>
                <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 bg-white hover-lift">
                  <CardContent className="pt-8 pb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="text-4xl font-bold text-blue-500 mb-2">
                      3,456
                    </div>
                    <div className="text-gray-600 font-medium">
                      Active Users
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Growing daily
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </section>
        {/* Features Section */}
        <section className="py-16 bg-gradient-to-br from-emerald-50 to-green-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="text-center mb-12 max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-green-800 mb-4">
                Why Choose MangroveWatch?
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Discover the features that make our platform the best choice for
                mangrove conservation
              </p>
            </div>
            <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
              <div className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Real-time Monitoring
                </h3>
                <p className="text-gray-600">
                  Track mangrove health and threats in real-time with our
                  advanced monitoring system.
                </p>
              </div>
              <div className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Community Driven
                </h3>
                <p className="text-gray-600">
                  Join a global community of conservation enthusiasts working
                  together for change.
                </p>
              </div>
              <div className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Impact Tracking
                </h3>
                <p className="text-gray-600">
                  See the real impact of your contributions with detailed
                  analytics and reports.
                </p>
              </div>
            </div>
          </div>
        </section>
        {/* CTA */}
        <section className="py-20 bg-gradient-to-r from-green-600 via-green-700 to-emerald-600 text-white relative overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-5 left-5 text-green-200">
              <Waves className="w-12 h-12" />
            </div>
            <div className="absolute top-20 right-20 text-green-200">
              <Tree className="w-20 h-20" />
            </div>
            <div className="absolute bottom-10 left-20 text-green-200">
              <Leaf className="w-16 h-16" />
            </div>
          </div>

          <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl text-center">
            <div className="max-w-5xl mx-auto">
              <div className="text-6xl mb-6 flex justify-center">
                <Tree className="w-16 h-16 text-green-100" />
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                Join the Movement - Protect Mangroves Together
              </h2>
              <p className="text-lg md:text-xl mb-8 opacity-90 max-w-3xl mx-auto leading-relaxed">
                Every report makes a difference. Every action counts. Be part of
                the global effort to protect our coastal guardians and create a
                sustainable future.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button variant="hero" size="xl">
                  <a href="/report" className="flex items-center space-x-2">
                    <Plus className="w-5 h-5" />
                    <span>Submit Your First Report</span>
                  </a>
                </Button>
                <Button variant="secondary" size="xl">
                  <a
                    href="/leaderboard"
                    className="flex items-center space-x-2"
                  >
                    <Trophy className="w-5 h-5" />
                    <span>Join Leaderboard</span>
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
