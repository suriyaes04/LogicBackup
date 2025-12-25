import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Truck, Package, TrendingUp } from "lucide-react";
import ManageDrivers from "./ManageDrivers";
import ManageVehicles from "./ManageVehicles";
import { bookingService, userService, vehicleService } from "@/lib/firebase-utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalDrivers: 0,
    availableDrivers: 0,
    totalVehicles: 0,
    availableVehicles: 0,
    activeBookings: 0,
    totalBookings: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [drivers, vehicles, bookings] = await Promise.all([
          userService.getDrivers(),
          vehicleService.getAllVehicles(),
          bookingService.getAllBookings(),
        ]);

        setStats({
          totalDrivers: drivers.length,
          availableDrivers: drivers.filter(d => !d.assignedVehicleId).length,
          totalVehicles: vehicles.length,
          availableVehicles: vehicles.filter(v => v.available).length,
          activeBookings: bookings.filter(b => b.status === 'in_progress').length,
          totalBookings: bookings.length,
        });
      } catch (error) {
        console.error(error);
        toast({
          title: "Error",
          description: "Unable to load admin stats",
          variant: "destructive",
        });
      }
    };
    
    if (user?.role === 'admin') {
      loadStats();
    }
  }, [toast, user]);

  if (user && user.role !== 'admin') {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage drivers, vehicles, and system settings</p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDrivers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.availableDrivers} available for assignment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVehicles}</div>
            <p className="text-xs text-muted-foreground">
              {stats.availableVehicles} available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeBookings}</div>
            <p className="text-xs text-muted-foreground">
              In progress now
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="drivers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
        </TabsList>

        <TabsContent value="drivers" className="space-y-4">
          <ManageDrivers />
        </TabsContent>

        <TabsContent value="vehicles" className="space-y-4">
          <ManageVehicles />
        </TabsContent>
      </Tabs>
    </div>
  );
}