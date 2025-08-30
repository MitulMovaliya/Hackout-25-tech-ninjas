import { useState } from "react";
import Button from "../Components/Button";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "../Components/Card";
import { Badge } from "../Components/Badge";
import { Avatar, AvatarFallback } from "../Components/Avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../Components/Tabs";
import Navigation from "../Components/Navbar";
import {
  Trophy,
  Star,
  Medal,
  Crown,
  TrendingUp,
  MapPin,
  Calendar,
  Award,
} from "lucide-react";

const Leaderboard = () => {
  const topContributors = [
    {
      rank: 1,
      name: "Maya Patel",
      points: 1250,
      reportsSubmitted: 47,
      reportsResolved: 32,
      location: "Mumbai, India",
      avatar: "🌱",
      badges: ["Top Reporter", "Community Leader", "Conservation Hero"],
      recentActivity: "Submitted 3 reports this week",
    },
    {
      rank: 2,
      name: "Carlos Rivera",
      points: 980,
      reportsSubmitted: 38,
      reportsResolved: 28,
      location: "São Paulo, Brazil",
      avatar: "🌊",
      badges: ["Ocean Guardian", "Research Champion"],
      recentActivity: "Resolved 5 reports this month",
    },
    {
      rank: 3,
      name: "Aisha Johnson",
      points: 875,
      reportsSubmitted: 35,
      reportsResolved: 24,
      location: "Lagos, Nigeria",
      avatar: "🌿",
      badges: ["Community Builder", "Educator"],
      recentActivity: "Led 2 community workshops",
    },
  ];

  const allContributors = [
    ...topContributors,
    {
      rank: 4,
      name: "Dr. James Chen",
      points: 820,
      reportsSubmitted: 31,
      reportsResolved: 22,
      location: "Singapore",
      avatar: "🔬",
      badges: ["Research Expert"],
      recentActivity: "Published research findings",
    },
    {
      rank: 5,
      name: "Elena Kowalski",
      points: 765,
      reportsSubmitted: 29,
      reportsResolved: 19,
      location: "Gdansk, Poland",
      avatar: "📸",
      badges: ["Documentation Master"],
      recentActivity: "Uploaded 15 photos this week",
    },
    {
      rank: 6,
      name: "Ahmed Hassan",
      points: 720,
      reportsSubmitted: 26,
      reportsResolved: 18,
      location: "Alexandria, Egypt",
      avatar: "🏛️",
      badges: ["Heritage Protector"],
      recentActivity: "Monitoring historical sites",
    },
    {
      rank: 7,
      name: "Lisa Anderson",
      points: 685,
      reportsSubmitted: 24,
      reportsResolved: 16,
      location: "Florida, USA",
      avatar: "🦎",
      badges: ["Wildlife Spotter"],
      recentActivity: "Tracked endangered species",
    },
    {
      rank: 8,
      name: "Yuki Tanaka",
      points: 650,
      reportsSubmitted: 22,
      reportsResolved: 15,
      location: "Okinawa, Japan",
      avatar: "🏖️",
      badges: ["Coastal Guardian"],
      recentActivity: "Beach cleanup organization",
    },
  ];

  const monthlyAchievers = [
    {
      name: "Maya Patel",
      achievement: "Most Reports Submitted",
      value: "12 reports",
      period: "January 2024",
    },
    {
      name: "Carlos Rivera",
      achievement: "Fastest Resolution",
      value: "2.3 days avg",
      period: "January 2024",
    },
    {
      name: "Aisha Johnson",
      achievement: "Community Engagement",
      value: "45 interactions",
      period: "January 2024",
    },
    {
      name: "Dr. James Chen",
      achievement: "Quality Reports",
      value: "98% accuracy",
      period: "January 2024",
    },
  ];

  // Functions inside same file
  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return (
          <span className="text-lg font-bold text-muted-foreground">
            #{rank}
          </span>
        );
    }
  };

  const getRankCardStyle = (rank) => {
    switch (rank) {
      case 1:
        return "shadow-glow bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200";
      case 2:
        return "shadow-success bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200";
      case 3:
        return "shadow-card bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200";
      default:
        return "shadow-card bg-card border-border";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-20 pb-8">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="bg-gradient-hero rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <Trophy className="h-10 w-10 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold text-primary mb-4">
              Community Leaderboard
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Celebrating our environmental guardians who are making a real
              difference in mangrove conservation.
            </p>
          </div>

          {/* Podium - Top 3 */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-primary text-center mb-8">
              Top Contributors
            </h2>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {topContributors.map((contributor) => (
                <Card
                  key={contributor.rank}
                  className={`text-center relative overflow-hidden ${getRankCardStyle(
                    contributor.rank
                  )}`}
                >
                  {contributor.rank === 1 && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-hero h-1"></div>
                  )}

                  <CardContent className="pt-8 pb-6">
                    <div className="flex justify-center mb-4">
                      {getRankIcon(contributor.rank)}
                    </div>

                    <Avatar className="w-16 h-16 mx-auto mb-4">
                      <AvatarFallback className="text-2xl bg-gradient-hero text-primary-foreground">
                        {contributor.avatar}
                      </AvatarFallback>
                    </Avatar>

                    <h3 className="font-bold text-lg text-foreground mb-2">
                      {contributor.name}
                    </h3>
                    <div className="flex items-center justify-center space-x-1 mb-3">
                      <Star className="h-4 w-4 text-warning" />
                      <span className="font-semibold text-primary">
                        {contributor.points} points
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                      <div>
                        {contributor.reportsSubmitted} reports •{" "}
                        {contributor.reportsResolved} resolved
                      </div>
                      <div className="flex items-center justify-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>{contributor.location}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-1 mb-4">
                      {contributor.badges.slice(0, 2).map((badge, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {badge}
                        </Badge>
                      ))}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {contributor.recentActivity}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Detailed Leaderboard */}
          <Tabs defaultValue="all-time" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-8">
              <TabsTrigger value="all-time">All Time</TabsTrigger>
              <TabsTrigger value="monthly">This Month</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
            </TabsList>

            <TabsContent value="all-time" className="space-y-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <span>All-Time Leaders</span>
                  </CardTitle>
                  <CardDescription>
                    Top contributors across all conservation efforts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allContributors.map((contributor) => (
                      <div
                        key={contributor.rank}
                        className="flex items-center space-x-4 p-4 rounded-lg bg-secondary/10 border border-border/50 hover:bg-secondary/20 transition-colors"
                      >
                        <div className="flex items-center justify-center w-8 h-8">
                          {contributor.rank <= 3 ? (
                            getRankIcon(contributor.rank)
                          ) : (
                            <span className="font-bold text-muted-foreground">
                              #{contributor.rank}
                            </span>
                          )}
                        </div>

                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-gradient-hero text-primary-foreground">
                            {contributor.avatar}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">
                            {contributor.name}
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>{contributor.location}</span>
                            <span>{contributor.reportsSubmitted} reports</span>
                            <span>{contributor.reportsResolved} resolved</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center space-x-1 text-primary font-semibold">
                            <Star className="h-4 w-4" />
                            <span>{contributor.points}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {contributor.recentActivity}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="monthly" className="space-y-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span>January 2024 Highlights</span>
                  </CardTitle>
                  <CardDescription>
                    This month's top performers and achievements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {monthlyAchievers.map((achiever, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg bg-gradient-mint border border-primary/20"
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <Award className="h-5 w-5 text-primary" />
                          <h4 className="font-medium text-foreground">
                            {achiever.achievement}
                          </h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {achiever.name}
                        </p>
                        <p className="font-semibold text-primary">
                          {achiever.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements" className="space-y-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Award className="h-5 w-5 text-primary" />
                    <span>Community Achievements</span>
                  </CardTitle>
                  <CardDescription>
                    Recognition badges and milestones earned by our community
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    {[
                      {
                        badge: "Conservation Hero",
                        description: "Submit 100+ verified reports",
                        holders: 3,
                        icon: "🏆",
                        color: "bg-gradient-hero",
                      },
                      {
                        badge: "Community Leader",
                        description: "Help resolve 50+ community reports",
                        holders: 7,
                        icon: "👥",
                        color: "bg-gradient-success",
                      },
                      {
                        badge: "Research Champion",
                        description: "Contribute scientific data",
                        holders: 12,
                        icon: "🔬",
                        color: "bg-gradient-ocean",
                      },
                      {
                        badge: "Ocean Guardian",
                        description: "Focus on marine conservation",
                        holders: 18,
                        icon: "🌊",
                        color: "bg-ocean-blue/20",
                      },
                      {
                        badge: "Wildlife Spotter",
                        description: "Document endangered species",
                        holders: 25,
                        icon: "🦎",
                        color: "bg-growth/20",
                      },
                      {
                        badge: "Educator",
                        description: "Lead community workshops",
                        holders: 15,
                        icon: "📚",
                        color: "bg-warning/20",
                      },
                    ].map((achievement, index) => (
                      <div
                        key={index}
                        className="text-center p-6 rounded-lg border border-border bg-card"
                      >
                        <div
                          className={`${achievement.color} rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl`}
                        >
                          {achievement.icon}
                        </div>
                        <h4 className="font-semibold text-foreground mb-2">
                          {achievement.badge}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          {achievement.description}
                        </p>
                        <Badge variant="secondary">
                          {achievement.holders} holders
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Call to Action */}
          <div className="mt-12 text-center">
            <Card className="shadow-card bg-gradient-mint border-primary/20">
              <CardContent className="py-8">
                <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-primary mb-4">
                  Join the Leaderboard
                </h3>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Start contributing to mangrove conservation today and earn
                  your place among our community heroes.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="hero" size="lg" asChild>
                    <a href="/report">Submit Your First Report</a>
                  </Button>
                  <Button variant="mint" size="lg" asChild>
                    <a href="/profile">View Your Progress</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Leaderboard;
