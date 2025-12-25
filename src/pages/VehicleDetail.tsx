import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VehicleLiveMap } from '@/components/VehicleLiveMap';
import { vehicleService } from '@/lib/firebase-utils';
import { Vehicle } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      navigate('/vehicles');
      return;
    }

    const loadVehicle = async () => {
      try {
        const vehicleData = await vehicleService.getVehicleById(id);
        if (vehicleData) {
          setVehicle(vehicleData);
        } else {
          navigate('/vehicles');
        }
      } catch (error) {
        console.error('Error loading vehicle:', error);
        navigate('/vehicles');
      } finally {
        setLoading(false);
      }
    };

    loadVehicle();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!vehicle) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/vehicles')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{vehicle.name}</h1>
          <p className="text-muted-foreground">{vehicle.model}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Details</CardTitle>
            <CardDescription>Specifications and information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {vehicle.imageUrl && (
              <img
                src={vehicle.imageUrl}
                alt={vehicle.name}
                className="w-full h-48 object-cover rounded-lg"
              />
            )}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Type</span>
                <Badge className="capitalize">{vehicle.type}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Capacity</span>
                <span className="text-sm font-medium">{vehicle.capacity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Price per km</span>
                <span className="text-sm font-medium">₹{vehicle.pricePerKm}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={vehicle.available ? 'default' : 'secondary'}>
                  {vehicle.available ? 'Available' : 'In Use'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Fuel Type</span>
                <span className="text-sm font-medium">{vehicle.specifications.fuelType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Max Weight</span>
                <span className="text-sm font-medium">{vehicle.specifications.maxWeight}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Dimensions</span>
                <span className="text-sm font-medium">{vehicle.specifications.dimensions}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live Tracking</CardTitle>
            <CardDescription>Real-time vehicle location</CardDescription>
          </CardHeader>
          <CardContent>
            <VehicleLiveMap 
              vehicleId={vehicle.id} 
              vehicleName={vehicle.name}
              height="400px"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

