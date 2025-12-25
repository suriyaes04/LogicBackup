import { useState } from "react";
import { Users, Plus, Search, Phone, Star, MapPin, Truck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { mockDrivers } from "@/data/mockData";

export default function Drivers() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredDrivers = mockDrivers.filter((driver) =>
    driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.phone.includes(searchTerm)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-success text-success-foreground">Available</Badge>;
      case 'busy':
        return <Badge className="bg-warning text-warning-foreground">Busy</Badge>;
      case 'offline':
        return <Badge variant="secondary">Offline</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating) 
            ? 'fill-yellow-400 text-yellow-400' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Drivers</h1>
          <p className="text-muted-foreground">Manage your delivery drivers and their assignments</p>
        </div>
        <Button className="bg-gradient-primary hover:bg-primary-dark">
          <Plus className="w-4 h-4 mr-2" />
          Add Driver
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{mockDrivers.length}</div>
            <p className="text-sm text-muted-foreground">Total Drivers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">
              {mockDrivers.filter(d => d.status === 'available').length}
            </div>
            <p className="text-sm text-muted-foreground">Available</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">
              {mockDrivers.filter(d => d.status === 'busy').length}
            </div>
            <p className="text-sm text-muted-foreground">On Duty</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">4.8</div>
            <p className="text-sm text-muted-foreground">Avg Rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search drivers by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Drivers Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredDrivers.map((driver) => (
          <Card key={driver.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(driver.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{driver.name}</CardTitle>
                    <CardDescription>{driver.email}</CardDescription>
                  </div>
                </div>
                {getStatusBadge(driver.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Contact Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{driver.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="w-4 h-4 text-muted-foreground" />
                  <span>License: {driver.licenseNumber}</span>
                </div>
                {driver.currentLocation && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>Live Location Available</span>
                  </div>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {renderStars(driver.rating)}
                </div>
                <span className="text-sm font-medium">{driver.rating}</span>
                <span className="text-sm text-muted-foreground">
                  ({driver.totalDeliveries} deliveries)
                </span>
              </div>

              {/* Vehicle Assignment */}
              {driver.vehicleId && (
                <div className="p-2 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Assigned Vehicle</p>
                  <p className="text-xs text-muted-foreground">Vehicle ID: {driver.vehicleId}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1">
                  View Details
                </Button>
                <Button 
                  className="flex-1 bg-gradient-primary hover:bg-primary-dark"
                  disabled={driver.status !== 'available'}
                >
                  Assign Task
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDrivers.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No drivers found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search criteria or add a new driver
            </p>
            <Button className="bg-gradient-primary hover:bg-primary-dark">
              <Plus className="w-4 h-4 mr-2" />
              Add New Driver
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}