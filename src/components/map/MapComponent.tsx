import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet-routing-machine';
import { MapPin, Navigation, Search, X, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Fix Leaflet default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationData {
  address: string;
  coordinates: { lat: number; lng: number };
}

interface MapComponentProps {
  onRouteCalculated: (distance: number, duration: string, pickup: LocationData, destination: LocationData) => void;
  selectedVehicle?: any;
}

export function MapComponent({ onRouteCalculated, selectedVehicle }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routingControlRef = useRef<any>(null);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [pickupMarker, setPickupMarker] = useState<L.Marker | null>(null);
  const [destinationMarker, setDestinationMarker] = useState<L.Marker | null>(null);
  const [pickupAddress, setPickupAddress] = useState<string>('');
  const [destinationAddress, setDestinationAddress] = useState<string>('');
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [isDraggingMarker, setIsDraggingMarker] = useState<'pickup' | 'destination' | null>(null);
  const [showInstructions, setShowInstructions] = useState<boolean>(true);
  const { toast } = useToast();

  // Sample coordinates for India
  const defaultCoords: [number, number] = [20.5937, 78.9629]; // Center of India

  // Create custom markers
  const createPickupMarker = (latlng: L.LatLng, address?: string): L.Marker => {
    const marker = L.marker(latlng, {
      draggable: true,
      icon: L.divIcon({
        className: 'pickup-marker',
        html: '<div style="background: hsl(var(--success)); width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3); cursor: move;">P</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })
    });

    marker.on('dragstart', () => {
      setIsDraggingMarker('pickup');
    });

    marker.on('dragend', (e) => {
      setIsDraggingMarker(null);
      const newLatLng = e.target.getLatLng();
      // Don't try to reverse geocode on drag - just update coordinates
      const addressText = pickupAddress || `Lat: ${newLatLng.lat.toFixed(6)}, Lng: ${newLatLng.lng.toFixed(6)}`;
      setPickupAddress(addressText);
      
      if (destinationMarker) {
        calculateRoute(newLatLng, destinationMarker.getLatLng());
      }
    });

    if (address) {
      marker.bindPopup(`<strong>Pickup Location</strong><br>${address}<br><small>Drag to adjust</small>`);
    } else {
      marker.bindPopup('<strong>Pickup Location</strong><br>Drag to adjust position');
    }

    marker.on('click', () => {
      marker.openPopup();
    });

    return marker;
  };

  const createDestinationMarker = (latlng: L.LatLng, address?: string): L.Marker => {
    const marker = L.marker(latlng, {
      draggable: true,
      icon: L.divIcon({
        className: 'destination-marker',
        html: '<div style="background: hsl(var(--destructive)); width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3); cursor: move;">D</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })
    });

    marker.on('dragstart', () => {
      setIsDraggingMarker('destination');
    });

    marker.on('dragend', (e) => {
      setIsDraggingMarker(null);
      const newLatLng = e.target.getLatLng();
      // Don't try to reverse geocode on drag - just update coordinates
      const addressText = destinationAddress || `Lat: ${newLatLng.lat.toFixed(6)}, Lng: ${newLatLng.lng.toFixed(6)}`;
      setDestinationAddress(addressText);
      
      if (pickupMarker) {
        calculateRoute(pickupMarker.getLatLng(), newLatLng);
      }
    });

    if (address) {
      marker.bindPopup(`<strong>Destination</strong><br>${address}<br><small>Drag to adjust</small>`);
    } else {
      marker.bindPopup('<strong>Destination</strong><br>Drag to adjust position');
    }

    marker.on('click', () => {
      marker.openPopup();
    });

    return marker;
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map with default coordinates (India)
    const map = L.map(mapRef.current).setView(defaultCoords, 5);
    mapInstanceRef.current = map;

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          setCurrentLocation(coords);
          map.setView(coords, 12);
          
          // Add current location marker
          const currentMarker = L.marker(coords, {
            icon: L.divIcon({
              className: 'current-location-marker',
              html: '<div style="background: hsl(var(--info)); width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })
          }).addTo(map);
          
          currentMarker.bindPopup('Your Current Location').openPopup();
          
          toast({
            title: "Location Found",
            description: "Your current location has been marked on the map",
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({
            title: "Location Access Denied",
            description: "Using default location. You can click on the map to set locations.",
            variant: "default"
          });
        }
      );
    }

    // Handle map clicks
    let clickCount = 0;
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      clickCount++;
      
      if (clickCount === 1) {
        // First click: Set pickup location
        const marker = createPickupMarker(e.latlng);
        marker.addTo(map);
        
        setPickupMarker(marker);
        const addressText = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
        setPickupAddress(addressText);
        marker.openPopup();
        
        toast({
          title: "Pickup Location Set",
          description: "Click again to set destination, or drag the marker to adjust",
        });
        
      } else if (clickCount === 2) {
        // Second click: Set destination location
        const marker = createDestinationMarker(e.latlng);
        marker.addTo(map);
        
        setDestinationMarker(marker);
        const addressText = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
        setDestinationAddress(addressText);
        marker.openPopup();
        
        // Calculate route
        if (pickupMarker) {
          calculateRoute(pickupMarker.getLatLng(), marker.getLatLng());
        }
        
        toast({
          title: "Destination Set",
          description: "Route calculated. You can drag markers to adjust.",
        });
        
        // Reset click count after both markers are placed
        clickCount = 0;
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Alternative geocoding using a simple approach - local coordinates
  const getAddressFromCoordinates = (lat: number, lng: number): string => {
    // Simple address format without external API
    return `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  // Manual address entry - use coordinates instead of geocoding
  const handleManualAddress = (address: string, isPickup: boolean) => {
    if (!address.trim()) {
      toast({
        title: "Address Required",
        description: "Please enter coordinates or a simple address",
        variant: "destructive"
      });
      return;
    }

    // Try to parse coordinates
    const coordMatch = address.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        toast({
          title: "Invalid Coordinates",
          description: "Please enter valid latitude and longitude (e.g., 9.9252, 78.1198)",
          variant: "destructive"
        });
        return;
      }
      
      const latLng = new L.LatLng(lat, lng);
      
      // Update the appropriate marker
      if (isPickup) {
        if (pickupMarker) {
          mapInstanceRef.current?.removeLayer(pickupMarker);
        }
        const marker = createPickupMarker(latLng, address);
        marker.addTo(mapInstanceRef.current!);
        setPickupMarker(marker);
        marker.openPopup();
        
        // Center map on the new marker
        mapInstanceRef.current?.setView(latLng, 12);
        
        // If destination exists, calculate route
        if (destinationMarker) {
          calculateRoute(marker.getLatLng(), destinationMarker.getLatLng());
        }
      } else {
        if (destinationMarker) {
          mapInstanceRef.current?.removeLayer(destinationMarker);
        }
        const marker = createDestinationMarker(latLng, address);
        marker.addTo(mapInstanceRef.current!);
        setDestinationMarker(marker);
        marker.openPopup();
        
        // If pickup exists, calculate route
        if (pickupMarker) {
          calculateRoute(pickupMarker.getLatLng(), marker.getLatLng());
        }
      }
      
      toast({
        title: "Location Set",
        description: "Marker placed on map. You can drag to adjust.",
      });
    } else {
      // If not coordinates, show instructions
      toast({
        title: "Enter Coordinates",
        description: "Please enter coordinates in format: latitude, longitude (e.g., 9.9252, 78.1198)",
        variant: "default"
      });
    }
  };

  const calculateRoute = (pickup: L.LatLng, destination: L.LatLng) => {
    if (!mapInstanceRef.current) return;

    // Remove existing routing control
    if (routingControlRef.current) {
      mapInstanceRef.current.removeControl(routingControlRef.current);
    }

    try {
      // Create new routing control
      const routingControl = (L as any).Routing.control({
        waypoints: [pickup, destination],
        routeWhileDragging: true,
        addWaypoints: false,
        createMarker: () => null,
        lineOptions: {
          styles: [{ color: 'hsl(var(--primary))', weight: 6, opacity: 0.8 }]
        },
        show: false,
      }).addTo(mapInstanceRef.current);

      routingControlRef.current = routingControl;

      routingControl.on('routesfound', (e: any) => {
        const routes = e.routes;
        const summary = routes[0].summary;
        const distance = (summary.totalDistance / 1000).toFixed(1);
        const duration = Math.round(summary.totalTime / 60);
        
        const pickupData: LocationData = {
          address: pickupAddress,
          coordinates: { lat: pickup.lat, lng: pickup.lng }
        };
        
        const destinationData: LocationData = {
          address: destinationAddress,
          coordinates: { lat: destination.lat, lng: destination.lng }
        };
        
        onRouteCalculated(parseFloat(distance), `${duration} mins`, pickupData, destinationData);
        
        toast({
          title: "Route Calculated",
          description: `Distance: ${distance} km, Time: ${duration} mins`,
        });
      });
      
      routingControl.on('routingerror', (error: any) => {
        console.error('Routing error:', error);
        // Fallback: calculate straight line distance
        const distance = pickup.distanceTo(destination) / 1000; // Convert to km
        const duration = Math.round((distance * 60) / 40); // Assume 40 km/h average speed
        
        const pickupData: LocationData = {
          address: pickupAddress,
          coordinates: { lat: pickup.lat, lng: pickup.lng }
        };
        
        const destinationData: LocationData = {
          address: destinationAddress,
          coordinates: { lat: destination.lat, lng: destination.lng }
        };
        
        onRouteCalculated(parseFloat(distance.toFixed(1)), `${duration} mins`, pickupData, destinationData);
        
        toast({
          title: "Route Estimated",
          description: `Using straight line distance: ${distance.toFixed(1)} km`,
          variant: "default"
        });
      });
    } catch (error) {
      console.error('Routing control error:', error);
      // Fallback calculation
      const distance = pickup.distanceTo(destination) / 1000;
      const duration = Math.round((distance * 60) / 40);
      
      const pickupData: LocationData = {
        address: pickupAddress,
        coordinates: { lat: pickup.lat, lng: pickup.lng }
      };
      
      const destinationData: LocationData = {
        address: destinationAddress,
        coordinates: { lat: destination.lat, lng: destination.lng }
      };
      
      onRouteCalculated(parseFloat(distance.toFixed(1)), `${duration} mins`, pickupData, destinationData);
    }
  };

  const handleAddressSearch = async (isPickup: boolean) => {
    const address = isPickup ? pickupAddress : destinationAddress;
    handleManualAddress(address, isPickup);
  };

  const resetMap = () => {
    if (!mapInstanceRef.current) return;

    // Remove markers
    if (pickupMarker) {
      mapInstanceRef.current.removeLayer(pickupMarker);
      setPickupMarker(null);
    }
    if (destinationMarker) {
      mapInstanceRef.current.removeLayer(destinationMarker);
      setDestinationMarker(null);
    }

    // Remove routing control
    if (routingControlRef.current) {
      mapInstanceRef.current.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }

    setPickupAddress('');
    setDestinationAddress('');
    
    const emptyLocation: LocationData = {
      address: '',
      coordinates: { lat: 0, lng: 0 }
    };
    onRouteCalculated(0, '', emptyLocation, emptyLocation);
    
    toast({
      title: "Map Reset",
      description: "All locations cleared. Click on map to set new locations."
    });
  };

  const centerOnCurrentLocation = () => {
    if (currentLocation && mapInstanceRef.current) {
      mapInstanceRef.current.setView(currentLocation, 12);
    } else {
      toast({
        title: "Location Unavailable",
        description: "Using default location. Click on map to set locations.",
        variant: "default"
      });
      mapInstanceRef.current?.setView(defaultCoords, 5);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Route Planning
            {isDraggingMarker && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                Dragging {isDraggingMarker} marker...
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {showInstructions && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Instructions:</strong> Click on the map to set pickup (first click) and destination (second click). 
                  You can also enter coordinates manually in format: latitude, longitude (e.g., 9.9252, 78.1198)
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                onClick={centerOnCurrentLocation}
                size="sm"
              >
                <Navigation className="w-4 h-4 mr-2" />
                My Location
              </Button>
              <Button variant="outline" onClick={resetMap} size="sm">
                <X className="w-4 h-4 mr-2" />
                Reset Map
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setShowInstructions(!showInstructions)} 
                size="sm"
              >
                {showInstructions ? 'Hide' : 'Show'} Instructions
              </Button>
            </div>

            {/* Address Input Fields */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pickup-address" className="text-sm font-medium">
                  Pickup Location
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="pickup-address"
                    placeholder="Enter coordinates: lat, lng (e.g., 9.9252, 78.1198)"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddressSearch(true)}
                    disabled={isGeocoding}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleAddressSearch(true)}
                    disabled={!pickupAddress.trim() || isGeocoding}
                  >
                    {isGeocoding ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {pickupMarker 
                    ? "Enter coordinates or drag the marker on map"
                    : "Click on map first to set pickup location"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination-address" className="text-sm font-medium">
                  Destination Location
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="destination-address"
                    placeholder="Enter coordinates: lat, lng (e.g., 9.9252, 78.1198)"
                    value={destinationAddress}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddressSearch(false)}
                    disabled={isGeocoding || !pickupMarker}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleAddressSearch(false)}
                    disabled={!destinationAddress.trim() || isGeocoding || !pickupMarker}
                  >
                    {isGeocoding ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {!pickupMarker 
                    ? "Set pickup location first"
                    : destinationMarker
                    ? "Enter coordinates or drag the marker on map"
                    : "Click on map to set destination"}
                </p>
              </div>
            </div>

            {isGeocoding && (
              <div className="text-sm text-muted-foreground text-center">
                <Loader2 className="w-4 h-4 inline mr-1 animate-spin" />
                Processing...
              </div>
            )}
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Quick Coordinates for Testing:</p>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setPickupAddress("9.9252, 78.1198");
                    handleManualAddress("9.9252, 78.1198", true);
                  }}
                >
                  Madurai Pickup
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setDestinationAddress("13.0827, 80.2707");
                    handleManualAddress("13.0827, 80.2707", false);
                  }}
                >
                  Chennai Destination
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setPickupAddress("12.9716, 77.5946");
                    setDestinationAddress("13.0827, 80.2707");
                    handleManualAddress("12.9716, 77.5946", true);
                    setTimeout(() => {
                      handleManualAddress("13.0827, 80.2707", false);
                    }, 100);
                  }}
                >
                  Bangalore to Chennai
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div 
        ref={mapRef} 
        className="w-full h-96 rounded-lg border shadow-md"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
}