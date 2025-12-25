// Dashboard.tsx - Unified with role-based content
import { Package, Truck, MapPin, TrendingUp, Clock, CheckCircle, AlertCircle, Users, BarChart, Navigation, User, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockShipments, mockVehicles, mockDrivers } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { vehicleService, shipmentService, bookingService } from "@/lib/firebase-utils";
import { Vehicle, Shipment, Booking } from "@/types";

// GPS Status Component
function GpsStatusIndicator() {
  const [gpsStatus, setGpsStatus] = useState<'searching' | 'acquired' | 'timeout' | 'denied' | 'unavailable'>('searching');
  const [lastLocation, setLastLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    // Simulate GPS status check - in real app, get from DriverLocationUpdater
    const checkGPS = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setGpsStatus('acquired');
            setLastLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          (err) => {
            if (err.code === 1) setGpsStatus('denied');
            else if (err.code === 2) setGpsStatus('unavailable');
            else setGpsStatus('timeout');
          },
          { timeout: 5000 }
        );
      } else {
        setGpsStatus('unavailable');
      }
    };

    checkGPS();
    const interval = setInterval(checkGPS, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    searching: { icon: <Clock className="w-4 h-4" />, text: 'Searching GPS', variant: 'secondary' as const, color: 'text-amber-600' },
    acquired: { icon: <CheckCircle className="w-4 h-4" />, text: 'GPS Active', variant: 'success' as const, color: 'text-green-600' },
    timeout: { icon: <Clock className="w-4 h-4" />, text: 'GPS Timeout', variant: 'outline' as const, color: 'text-amber-600' },
    denied: { icon: <AlertCircle className="w-4 h-4" />, text: 'Location Denied', variant: 'destructive' as const, color: 'text-red-600' },
    unavailable: { icon: <Navigation className="w-4 h-4" />, text: 'No GPS', variant: 'outline' as const, color: 'text-gray-600' },
  };

  const config = statusConfig[gpsStatus];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant={config.variant} className="gap-1">
          {config.icon}
          <span className={config.color}>{config.text}</span>
        </Badge>
        {lastLocation && (
          <span className="text-xs text-muted-foreground">
            {lastLocation.lat.toFixed(4)}, {lastLocation.lng.toFixed(4)}
          </span>
        )}
      </div>
      {gpsStatus === 'timeout' && (
        <p className="text-xs text-amber-600">Using IP-based location. Move outdoors for better accuracy.</p>
      )}
    </div>
  );
}

// Stats based on user role
const getRoleStats = (role: string, realData: { vehicles?: Vehicle[], shipments?: Shipment[], bookings?: Booking[] }) => {
  const commonStats = [
    {
      title: "Total Shipments",
      value: realData.shipments?.length.toString() || mockShipments.length.toString(),
      change: "+12%",
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    }
  ];

  switch(role) {
    case 'admin':
      return [
        ...commonStats,
        {
          title: "Available Vehicles",
          value: realData.vehicles?.filter(v => v.available).length.toString() || 
                 mockVehicles.filter(v => v.available).length.toString(),
          change: "75%",
          icon: Truck,
          color: "text-green-600",
          bgColor: "bg-green-100"
        },
        {
          title: "Active Drivers",
          value: mockDrivers.filter(d => d.status === 'available').length.toString(),
          change: "+5%",
          icon: Users,
          color: "text-purple-600",
          bgColor: "bg-purple-100"
        },
        {
          title: "Revenue",
          value: "$45,890",
          change: "+18%",
          icon: TrendingUp,
          color: "text-yellow-600",
          bgColor: "bg-yellow-100"
        }
      ];

    case 'driver':
      return [
        {
          title: "My Deliveries",
          value: realData.shipments?.filter(s => s.driverId === 'current-driver-id').length.toString() || "0",
          change: "+2",
          icon: Package,
          color: "text-blue-600",
          bgColor: "bg-blue-100"
        },
        {
          title: "Vehicle Status",
          value: "Active",
          change: "100%",
          icon: Truck,
          color: "text-green-600",
          bgColor: "bg-green-100"
        },
        {
          title: "Rating",
          value: "4.8/5",
          change: "+0.2",
          icon: TrendingUp,
          color: "text-yellow-600",
          bgColor: "bg-yellow-100"
        },
        {
          title: "Hours Today",
          value: "6.5h",
          change: "-0.5h",
          icon: Clock,
          color: "text-purple-600",
          bgColor: "bg-purple-100"
        }
      ];

    case 'customer':
      return [
        ...commonStats,
        {
          title: "My Bookings",
          value: realData.bookings?.length.toString() || "0",
          change: "+1",
          icon: Package,
          color: "text-green-600",
          bgColor: "bg-green-100"
        },
        {
          title: "Active Shipments",
          value: realData.shipments?.filter(s => s.status === 'in-transit').length.toString() || "0",
          change: "1 new",
          icon: Truck,
          color: "text-purple-600",
          bgColor: "bg-purple-100"
        },
        {
          title: "Total Spent",
          value: "$1,240",
          change: "+$120",
          icon: TrendingUp,
          color: "text-yellow-600",
          bgColor: "bg-yellow-100"
        }
      ];

    default:
      return commonStats;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'delivered':
      return <Badge className="bg-success text-success-foreground">Delivered</Badge>;
    case 'in-transit':
      return <Badge className="bg-info text-info-foreground">In Transit</Badge>;
    case 'pending':
      return <Badge className="bg-warning text-warning-foreground">Pending</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export default function Dashboard() {
  const { user } = useAuth();
  const [realVehicles, setRealVehicles] = useState<Vehicle[]>([]);
  const [realShipments, setRealShipments] = useState<Shipment[]>([]);
  const [realBookings, setRealBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load real data based on user role
        if (user?.role === 'admin') {
          const [vehicles, shipments, bookings] = await Promise.all([
            vehicleService.getAllVehicles(),
            shipmentService.getAllShipments(),
            bookingService.getAllBookings()
          ]);
          setRealVehicles(vehicles);
          setRealShipments(shipments);
          setRealBookings(bookings);
        } else if (user?.role === 'customer' && user.id) {
          const [shipments, bookings] = await Promise.all([
            shipmentService.getShipmentsByUser(user.id),
            bookingService.getBookingsByUser(user.id)
          ]);
          setRealShipments(shipments);
          setRealBookings(bookings);
        } else if (user?.role === 'driver' && user.id) {
          const [bookings, shipments] = await Promise.all([
            bookingService.getBookingsByDriver(user.id),
            shipmentService.getAllShipments() // Filter later by driverId
          ]);
          setRealBookings(bookings);
          setRealShipments(shipments.filter(s => s.driverId === user.id));
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const stats = getRoleStats(user?.role || 'customer', {
    vehicles: realVehicles,
    shipments: realShipments,
    bookings: realBookings
  });

  const recentShipments = realShipments.length > 0 
    ? realShipments.slice(0, 5)
    : mockShipments.slice(0, 5);

  const displayVehicles = user?.role === 'admin' 
    ? (realVehicles.length > 0 ? realVehicles : mockVehicles)
    : mockVehicles.slice(0, 3);

  const RoleIcon = user?.role === 'admin' ? Shield : 
                   user?.role === 'driver' ? Navigation : User;

  return (
    <div className="space-y-6">
      {/* Header with Role Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back{user?.name ? `, ${user.name}` : ''}! Here's your {user?.role || 'user'} overview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1">
            <RoleIcon className="w-3 h-3" />
            {user?.role?.toUpperCase() || 'USER'}
          </Badge>
          {user?.role === 'driver' && <GpsStatusIndicator />}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className={stat.change.includes('+') ? 'text-green-600' : 'text-amber-600'}>
                  {stat.change}
                </span> from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Role-Specific Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Common: Recent Shipments/Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {user?.role === 'customer' ? 'My Recent Bookings' : 
               user?.role === 'driver' ? 'My Deliveries' : 'Recent Shipments'}
            </CardTitle>
            <CardDescription>
              {user?.role === 'customer' ? 'Your latest booking activities' : 
               user?.role === 'driver' ? 'Your assigned deliveries' : 'Latest shipment activities'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentShipments.map((shipment) => (
              <div key={shipment.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{shipment.trackingNumber}</span>
                    {getStatusBadge(shipment.status)}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {shipment.pickupLocation.address} → {shipment.destination.address}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {shipment.distance}km • ${shipment.totalCost}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {shipment.estimatedTime}
                  </div>
                  {user?.role === 'customer' && shipment.status === 'in-transit' && (
                    <Button size="sm" variant="ghost" className="mt-1 text-xs">
                      Track
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Role-Specific Second Card */}
        {user?.role === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Fleet Status
              </CardTitle>
              <CardDescription>Current vehicle availability</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {displayVehicles.map((vehicle) => (
                <div key={vehicle.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{vehicle.name}</span>
                      <Badge variant={vehicle.available ? "default" : "secondary"}>
                        {vehicle.available ? "Available" : "In Use"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">
                      {vehicle.type} • {vehicle.capacity} • ${vehicle.pricePerKm}/km
                    </p>
                  </div>
                  <div className="text-right">
                    {vehicle.available ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-warning" />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {user?.role === 'driver' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="w-5 h-5" />
                Driver Information
              </CardTitle>
              <CardDescription>Your current status and assignments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <GpsStatusIndicator />
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Assigned Vehicle:</span>
                  <Badge variant="outline">Truck-001</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Today's Deliveries:</span>
                  <span className="font-medium">{realBookings.filter(b => b.status === 'in_progress').length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Next Delivery:</span>
                  {realBookings.length > 0 ? (
                    <span className="text-sm text-muted-foreground">{realBookings[0].pickupAddress}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">No assignments</span>
                  )}
                </div>
                <div className="pt-3 border-t">
                  <Button variant="outline" className="w-full">
                    View All Deliveries
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {user?.role === 'customer' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="w-5 h-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common tasks for customers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button className="h-20 flex flex-col gap-2">
                  <Truck className="w-5 h-5" />
                  <span className="text-xs">New Shipment</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <MapPin className="w-5 h-5" />
                  <span className="text-xs">Track Package</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Package className="w-5 h-5" />
                  <span className="text-xs">View History</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-xs">Get Quote</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Performance Metrics (Admin only) */}
      {user?.role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
            <CardDescription>Key metrics for this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Delivery Success Rate</span>
                  <span className="text-sm text-muted-foreground">95%</span>
                </div>
                <Progress value={95} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Fleet Utilization</span>
                  <span className="text-sm text-muted-foreground">78%</span>
                </div>
                <Progress value={78} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Customer Satisfaction</span>
                  <span className="text-sm text-muted-foreground">92%</span>
                </div>
                <Progress value={92} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}