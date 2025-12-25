import { useEffect, useRef, useState } from 'react';
import { useRealtimeLocation } from '@/hooks/useRealtimeLocation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Navigation, AlertCircle, Map, Globe, WifiOff, Key } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface VehicleLiveMapProps {
  vehicleId: string;
  vehicleName?: string;
  autoCenter?: boolean;
  height?: string;
}

declare global {
  interface Window {
    mappls: any;
    mapplsLoaded: boolean;
    mapplsLoading: boolean;
  }
}

export function VehicleLiveMap({ 
  vehicleId, 
  vehicleName = 'Vehicle',
  autoCenter = true,
  height = '500px'
}: VehicleLiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const { location, loading, error } = useRealtimeLocation(vehicleId);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Load Mappls SDK with better error handling
  useEffect(() => {
    // Check if already loaded or loading
    if (window.mapplsLoaded) {
      setMapLoaded(true);
      return;
    }
    
    if (window.mapplsLoading) {
      console.log('🔄 Mappls SDK already loading...');
      return;
    }

    const token = import.meta.env.VITE_MAPPLS_TOKEN;
    
    // Debug: Log token info (safe - only shows in console)
    console.log('🔑 Mappls Token Check:', {
      hasToken: !!token,
      tokenLength: token?.length || 0,
      tokenPrefix: token?.substring(0, 20) + '...'
    });

    if (!token) {
      const errorMsg = "Mappls token is missing. Please check your environment variables.";
      console.error('❌', errorMsg);
      setMapError(errorMsg);
      
      setDebugInfo({
        error: 'Missing token',
        envCheck: {
          hasVite: !!import.meta.env,
          keys: Object.keys(import.meta.env).filter(k => k.includes('MAP'))
        }
      });
      return;
    }

    // Validate token format
    if (!token.startsWith('Bearer ') && !token.includes('eyJ')) {
      console.warn('⚠️ Token format may be incorrect. Should be JWT or Bearer token.');
    }

    window.mapplsLoading = true;
    console.log('🚀 Loading Mappls SDK...');

    const script = document.createElement('script');
    script.src = `https://apis.mappls.com/advancedmaps/api/${token}/map_sdk?v=3.8&layer=vector`;
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    
    // Add data attributes for debugging
    script.setAttribute('data-mappls', 'true');
    script.setAttribute('data-retry', retryCount.toString());
    
    let loadTimeout: NodeJS.Timeout;
    
    script.onload = () => {
      clearTimeout(loadTimeout);
      console.log('✅ Mappls SDK loaded successfully');
      window.mapplsLoaded = true;
      window.mapplsLoading = false;
      setMapLoaded(true);
      setMapError(null);
      
      // Verify the SDK is actually functional
      setTimeout(() => {
        if (typeof window.mappls === 'object' && window.mappls.Map) {
          console.log('✅ Mappls SDK verified functional');
        } else {
          console.error('❌ Mappls SDK loaded but not functional');
          setMapError('Mappls SDK loaded but API not available');
        }
      }, 100);
    };
    
    script.onerror = (error) => {
      clearTimeout(loadTimeout);
      console.error('❌ Failed to load Mappls SDK:', error);
      window.mapplsLoading = false;
      
      // Check for specific errors
      const src = script.src;
      let errorMessage = 'Failed to load Mappls SDK. ';
      
      if (src.includes('Unauthorized') || src.includes('403')) {
        errorMessage += 'Token may be invalid or expired.';
      } else if (src.includes('404')) {
        errorMessage += 'SDK URL not found. Check token format.';
      } else {
        errorMessage += 'Check your network connection and token.';
      }
      
      setMapError(errorMessage);
      setDebugInfo({
        scriptSrc: src,
        errorType: 'script_load_error',
        timestamp: new Date().toISOString()
      });
    };
    
    // Set timeout for script load
    loadTimeout = setTimeout(() => {
      if (!window.mapplsLoaded) {
        console.error('⏱️ Mappls SDK load timeout');
        window.mapplsLoading = false;
        setMapError('Mappls SDK loading timed out. Check network.');
      }
    }, 15000); // 15 second timeout
    
    document.head.appendChild(script);

    return () => {
      clearTimeout(loadTimeout);
      // Don't remove script to avoid reloading on every component mount
    };
  }, [retryCount]);

  // Initialize or update map and marker
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !location) return;

    const initializeMap = () => {
      try {
        if (!window.mappls || !window.mappls.Map) {
          console.error('❌ Mappls SDK not available');
          setMapError('Mappls SDK not properly loaded');
          return;
        }

        if (!mapInstanceRef.current) {
          console.log('🗺️ Initializing Mappls map...');
          
          // Initialize Mappls map
          mapInstanceRef.current = new window.mappls.Map({
            center: [location.lng, location.lat],
            zoom: 15,
            container: mapRef.current,
            zoomControl: true,
          });

          // Add custom vehicle icon
          const customVehicleIcon = `
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#3b82f6" stroke="white" stroke-width="2">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
            </svg>
          `;

          markerRef.current = new window.mappls.Marker({
            map: mapInstanceRef.current,
            position: { lat: location.lat, lng: location.lng },
            icon: {
              url: `data:image/svg+xml;base64,${btoa(customVehicleIcon)}`,
              scaledSize: new window.mappls.Size(40, 40),
            },
            fitbounds: autoCenter,
            popupOptions: true,
            popupHtml: `
              <div style="padding: 8px; font-family: sans-serif;">
                <strong>${vehicleName}</strong><br>
                <small>Live Tracking</small><br>
                <small>Lat: ${location.lat.toFixed(6)}</small><br>
                <small>Lng: ${location.lng.toFixed(6)}</small><br>
                <small>Updated: ${new Date(location.timestamp).toLocaleTimeString()}</small>
              </div>
            `,
          });

          if (autoCenter) {
            mapInstanceRef.current.setCenter([location.lng, location.lat]);
          }
          
          console.log('✅ Map initialized successfully');
        } else {
          // Update existing marker position
          if (markerRef.current) {
            markerRef.current.setPosition({ lat: location.lat, lng: location.lng });
            
            markerRef.current.setPopupHtml(`
              <div style="padding: 8px; font-family: sans-serif;">
                <strong>${vehicleName}</strong><br>
                <small>Live Tracking</small><br>
                <small>Lat: ${location.lat.toFixed(6)}</small><br>
                <small>Lng: ${location.lng.toFixed(6)}</small><br>
                <small>Updated: ${new Date(location.timestamp).toLocaleTimeString()}</small>
              </div>
            `);
          }

          if (autoCenter && mapInstanceRef.current) {
            mapInstanceRef.current.setCenter([location.lng, location.lat]);
          }
        }
      } catch (err: any) {
        console.error('❌ Mappls initialization error:', err);
        setMapError(`Failed to initialize map: ${err.message}`);
        setDebugInfo({
          error: err.message,
          stack: err.stack,
          location: location,
          mapplsAvailable: !!window.mappls
        });
      }
    };

    const timer = setTimeout(initializeMap, 100);
    return () => clearTimeout(timer);
  }, [mapLoaded, location, autoCenter, vehicleName]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setMapError(null);
    window.mapplsLoaded = false;
    window.mapplsLoading = false;
    
    // Remove any existing Mappls scripts
    const scripts = document.querySelectorAll('script[src*="mappls.com"]');
    scripts.forEach(script => script.remove());
  };

  const handleUseOpenStreetMap = () => {
    // Fallback to OpenStreetMap
    setMapError('Using OpenStreetMap as fallback');
    // You would implement OpenStreetMap integration here
  };

  // Loading state
  if (loading && !location) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4" style={{ height }}>
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading vehicle location...</p>
        </CardContent>
      </Card>
    );
  }

  // Error states
  if (error || mapError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Map Loading Error
          </CardTitle>
        </CardHeader>
        <CardContent style={{ height }}>
          <Alert variant="destructive" className="mb-4">
            <AlertDescription className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error || mapError || 'Failed to load map'}
            </AlertDescription>
          </Alert>
          
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Troubleshooting Steps:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Check browser console for detailed errors (F12)</li>
                <li>Verify Mappls token in <code>.env</code> file</li>
                <li>Ensure token starts with <code>Bearer</code> or is a valid JWT</li>
                <li>Check network connection</li>
                <li>Verify token is not expired</li>
                <li>Try in Incognito mode (clears cache)</li>
              </ul>
            </div>
            
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-sm font-medium text-amber-800 mb-1">Quick Fixes:</p>
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={handleRetry}
                  variant="outline"
                  size="sm"
                >
                  <Loader2 className="w-4 h-4 mr-2" />
                  Retry Loading SDK
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  size="sm"
                >
                  Refresh Page
                </Button>
                <Button 
                  onClick={handleUseOpenStreetMap}
                  variant="outline"
                  size="sm"
                >
                  <Map className="w-4 h-4 mr-2" />
                  Use OpenStreetMap
                </Button>
              </div>
            </div>
            
            {debugInfo && (
              <div className="p-3 bg-gray-50 border rounded-md">
                <p className="text-sm font-medium mb-1">Debug Information:</p>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // No location data
  if (!location) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4" style={{ height }}>
          <Navigation className="w-12 h-12 text-muted-foreground opacity-50" />
          <div className="text-center">
            <p className="font-medium">No location data available</p>
            <p className="text-sm text-muted-foreground mt-1">
              This vehicle may not have an active driver or location sharing may be disabled.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="w-5 h-5" />
          Live Tracking: {vehicleName}
          <span className="text-sm font-normal text-muted-foreground ml-2">
            • Last updated: {new Date(location.timestamp).toLocaleTimeString()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          ref={mapRef} 
          style={{ 
            width: '100%', 
            height, 
            minHeight: '400px',
            borderRadius: '0.5rem',
            border: '1px solid hsl(var(--border))'
          }} 
          className="relative"
        >
          {!mapLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 rounded-lg">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">Loading Mappls...</p>
              <p className="text-xs text-muted-foreground mt-1">Token: {import.meta.env.VITE_MAPPLS_TOKEN?.substring(0, 10)}...</p>
            </div>
          )}
        </div>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
            <p className="font-medium">Vehicle Information</p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">{vehicleName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Map Provider:</span>
              <span className="font-medium flex items-center gap-1">
                <Globe className="w-3 h-3" />
                Mappls
              </span>
            </div>
          </div>
          
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
            <p className="font-medium">Current Location</p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Coordinates:</span>
              <span className="font-mono">
                {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated:</span>
              <span>{new Date(location.timestamp).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}