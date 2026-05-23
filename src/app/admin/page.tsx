
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Film, Star, Activity, Loader2, Globe } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getAdminDashboardData, type AdminDashboardDataOutput } from '@/ai/flows/admin-data-flow';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export default function AdminDashboardPage() {
  const [dashboardData, setDashboardData] = useState<AdminDashboardDataOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!dashboardData) {
        setIsLoading(true);
      }
      setError(null);
      try {
        const data = await getAdminDashboardData();
        setDashboardData(data);
      } catch (e: any) {
        console.error("Failed to fetch admin dashboard data:", e);
        setError(e.message || "An unexpected error occurred.");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();

    const intervalId = setInterval(fetchData, 10000); 

    return () => clearInterval(intervalId);
  }, [dashboardData]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-6">
        <AlertTitle>Error Fetching Data</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!dashboardData) {
     return (
      <Alert className="mt-6">
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>No dashboard data is available at this moment.</AlertDescription>
      </Alert>
    );
  }

  const { counts, recentActivity, monthlySignups, dailyVisitors } = dashboardData;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Registered members</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
            <Globe className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.totalVisitors.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Anonymous visitors</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Movies</CardTitle>
            <Film className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.totalMovies.toLocaleString()}</div>
             <p className="text-xs text-muted-foreground">Movies & Series</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <Star className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.totalReviews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">User-submitted reviews</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline">Monthly User Signups</CardTitle>
             <CardDescription>New registered users over the last 12 months.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySignups}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)'}}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    cursor={{fill: 'hsl(var(--accent))', opacity: 0.2}}
                />
                <Legend />
                <Bar dataKey="users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline">Daily Visitors</CardTitle>
             <CardDescription>New anonymous visitors over the last 30 days.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyVisitors}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)'}}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    cursor={{fill: 'hsl(var(--accent))', opacity: 0.2}}
                />
                <Legend />
                <Bar dataKey="visitors" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center">
            <Activity className="mr-2 h-6 w-6 text-primary" /> Recent Activity
          </CardTitle>
          <CardDescription>Latest updates and actions in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <ul className="space-y-4">
              {recentActivity.map((activity) => (
                <li key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {activity.type === 'New User' && <Users className="h-5 w-5 text-green-500" />}
                    {activity.type === 'New Movie' && <Film className="h-5 w-5 text-blue-500" />}
                    {activity.type === 'New Review' && <Star className="h-5 w-5 text-yellow-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No recent activity.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
