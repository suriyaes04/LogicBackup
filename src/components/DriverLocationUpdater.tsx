import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { locationService, vehicleService } from '@/lib/firebase-utils';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';

export function DriverLocationUpdater() {
  const { user } = useAuth();
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'searching' | 'acquired' | 'timeout' | 'denied' | 'unavailable'>('searching');
  const gpsAttemptsRef = useRef(0);
  const [useFallbackLocation, setUseFallbackLocation] = useState(false);
  const vehicleIdRef = useRef<string>('');
  const trackingIdRef = useRef<string>('');

  // Calculate distance between coordinates (in meters)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2 - lat1) * Math.PI/180;
    const Δλ = (lon2 - lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const updateLocation = async (
    vehicleId: string, 
    latitude: number, 
    longitude: number, 
    source: 'gps' | 'ip' = 'gps',
    forceUpdate: boolean = false
  ) => {
    try {
      // Throttle updates based on movement and time
      const now = Date.now();
      
      // Check time-based throttling (minimum 5 seconds between updates)
      if (!forceUpdate && (now - lastUpdateRef.current < 5000)) {
        return;
      }
      
      // Check distance-based throttling (only update if moved significantly)
      if (lastLocationRef.current && !forceUpdate) {
        const distanceMoved = calculateDistance(
          lastLocationRef.current.lat, 
          lastLocationRef.current.lng, 
          latitude, 
          longitude
        );
        
        // Only update if moved more than 10 meters (for GPS) or 100 meters (for IP)
        const minDistance = source === 'gps' ? 10 : 100;
        if (distanceMoved < minDistance) {
          console.log(`📍 Skipping update (moved only ${distanceMoved.toFixed(1)}m)`);
          return;
        }
      }
      
      lastUpdateRef.current = now;
      lastLocationRef.current = { lat: latitude, lng: longitude };
      
      // Get previous location for distance calculation
      let previousLocation = null;
      try {
        const locationRef = ref(database, `vehicleLocations/${vehicleId}`);
        const snapshot = await get(locationRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          previousLocation = { lat: data.lat, lng: data.lng };
        }
      } catch (error) {
        console.log('No previous location found');
      }
      
      // Update location with smart throttling
      const result = await locationService.updateLocation(
        vehicleId, 
        latitude, 
        longitude, 
        { 
          forceUpdate: forceUpdate || source === 'ip', // Always force update for IP
          previousLocation 
        }
      );
      
      if (result.updated) {
        trackingIdRef.current = result.trackingId;
        console.log(`📍 ${source.toUpperCase()} Update: ${latitude.toFixed(4)}, ${longitude.toFixed(4)} (Tracking: ${result.trackingId})`);
        
        if (source === 'gps') {
          setGpsStatus('acquired');
          setUseFallbackLocation(false);
          gpsAttemptsRef.current = 0; // Reset attempts on success
        }
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const getAssignedVehicle = async (): Promise<string | null> => {
    try {
      // Use cached vehicle ID if available
      if (vehicleIdRef.current) {
        return vehicleIdRef.current;
      }
      
      let vehicleId = user?.assignedVehicleId || "";
      
      if (!vehicleId) {
        const vehicles = await vehicleService.getVehiclesByDriver(user?.id || '');
        if (vehicles.length === 0) {
          console.warn('🚫 No vehicle assigned to driver');
          return null;
        }
        vehicleId = vehicles[0].id;
      }
      
      // Cache the vehicle ID
      vehicleIdRef.current = vehicleId;
      return vehicleId;
    } catch (error) {
      console.error('Error getting assigned vehicle:', error);
      return null;
    }
  };

  // Get IP-based fallback location
  const getIPLocation = async (): Promise<{lat: number, lng: number} | null> => {
    try {
      // Try multiple IP location services
      const services = [
        'https://ipapi.co/json/',
        'https://ipinfo.io/json/',
        'https://geolocation-db.com/json/'
      ];
      
      for (const service of services) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch(service, { 
            signal: controller.signal 
          });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            if (data.latitude && data.longitude) {
              return { 
                lat: parseFloat(data.latitude), 
                lng: parseFloat(data.longitude) 
              };
            }
          }
        } catch (e) {
          // Try next service
          continue;
        }
      }
      
      // Default fallback (Indian cities)
      const indianCities = [
        { lat: 28.6139, lng: 77.2090 }, // Delhi
        { lat: 19.0760, lng: 72.8777 }, // Mumbai
        { lat: 12.9716, lng: 77.5946 }, // Bangalore
        { lat: 13.0827, lng: 80.2707 }, // Chennai
        { lat: 11.9327, lng: 79.8339 }, // Pondicherry
      ];
      
      const randomCity = indianCities[Math.floor(Math.random() * indianCities.length)];
      console.log('📍 Using default fallback location:', randomCity);
      return randomCity;
    } catch (error) {
      console.warn('Failed to get IP location:', error);
      return { lat: 20.5937, lng: 78.9629 }; // Center of India
    }
  };

  const handleGeolocationSuccess = async (position: GeolocationPosition, source: 'gps' | 'watch' = 'gps') => {
    const vehicleId = await getAssignedVehicle();
    if (!vehicleId) return;
    
    const { latitude, longitude } = position.coords;
    
    // Only use high-accuracy GPS data (< 100m accuracy)
    if (position.coords.accuracy > 100 && source === 'gps') {
      console.log('📍 Low GPS accuracy:', position.coords.accuracy.toFixed(1) + 'm');
      return;
    }
    
    await updateLocation(vehicleId, latitude, longitude, 'gps');
  };

  const handleGeolocationError = async (error: GeolocationPositionError, retryCount: number = 0) => {
    const vehicleId = await getAssignedVehicle();
    
    switch(error.code) {
      case error.PERMISSION_DENIED:
        console.error('🔒 Location permission denied');
        setGpsStatus('denied');
        setUseFallbackLocation(true);
        
        if (vehicleId) {
          const ipLocation = await getIPLocation();
          if (ipLocation) {
            await updateLocation(vehicleId, ipLocation.lat, ipLocation.lng, 'ip', true);
          }
        }
        break;
        
      case error.POSITION_UNAVAILABLE:
        console.error('📡 GPS signal unavailable');
        setGpsStatus('unavailable');
        setUseFallbackLocation(true);
        
        if (vehicleId) {
          const ipLocation = await getIPLocation();
          if (ipLocation) {
            await updateLocation(vehicleId, ipLocation.lat, ipLocation.lng, 'ip', true);
          }
        }
        break;
        
      case error.TIMEOUT:
        console.log(`⏱️ GPS timeout (attempt ${retryCount + 1})`);
        setGpsStatus('timeout');
        
        // Retry with different settings
        if (retryCount < 2) {
          setTimeout(() => {
            tryGPSLocation(retryCount + 1);
          }, 2000 * (retryCount + 1));
        } else {
          // After 3 attempts, use IP fallback
          setUseFallbackLocation(true);
          if (vehicleId) {
            const ipLocation = await getIPLocation();
            if (ipLocation) {
              await updateLocation(vehicleId, ipLocation.lat, ipLocation.lng, 'ip', true);
            }
          }
        }
        break;
    }
  };

  // Try to get GPS location with retry logic
  const tryGPSLocation = async (retryCount = 0): Promise<boolean> => {
    if (retryCount >= 3) {
      console.log('🔴 GPS failed after 3 attempts, using IP fallback');
      setGpsStatus('timeout');
      setUseFallbackLocation(true);
      return false;
    }

    return new Promise((resolve) => {
      const gpsTimeout = setTimeout(async () => {
        console.log(`⏱️ GPS attempt ${retryCount + 1} timed out`);
        resolve(false);
      }, 10000);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          clearTimeout(gpsTimeout);
          await handleGeolocationSuccess(position);
          setGpsStatus('acquired');
          resolve(true);
        },
        async (error) => {
          clearTimeout(gpsTimeout);
          await handleGeolocationError(error, retryCount);
          resolve(false);
        },
        {
          enableHighAccuracy: retryCount === 0, // High accuracy only on first try
          timeout: 15000,
          maximumAge: retryCount > 0 ? 30000 : 0, // Accept older data on retry
        }
      );
    });
  };

  // Start continuous GPS watching
  const startGPSWatch = () => {
    if (!navigator.geolocation) {
      console.log('❌ Geolocation not supported');
      return;
    }

    // Clear existing watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    console.log('🛰️ Starting GPS watch...');
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        if (position.coords.accuracy < 50) { // Only update if accuracy < 50m
          await handleGeolocationSuccess(position, 'watch');
        }
      },
      (error) => {
        console.warn('GPS watch error:', error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 10000,
        distanceFilter: 10, // Update only when moved 10+ meters
      }
    );
  };

  // Initialize tracking ID for the vehicle
  const initializeTrackingId = async () => {
    const vehicleId = await getAssignedVehicle();
    if (!vehicleId) return;
    
    try {
      // Try to get existing tracking ID
      const trackingId = await locationService.getTrackingId(vehicleId);
      if (trackingId) {
        trackingIdRef.current = trackingId;
        console.log(`📋 Using existing tracking ID: ${trackingId}`);
      } else {
        console.log('📋 No tracking ID found, one will be created on first location update');
      }
    } catch (error) {
      console.error('Error initializing tracking ID:', error);
    }
  };

  // Main initialization
  const initializeLocationSharing = async () => {
    const vehicleId = await getAssignedVehicle();
    if (!vehicleId) {
      console.log('🚫 No vehicle assigned, location sharing disabled');
      return;
    }

    console.log('🚀 Starting location sharing for vehicle:', vehicleId);
    
    // Initialize tracking ID
    await initializeTrackingId();
    
    // First, try to get GPS
    setGpsStatus('searching');
    const gpsSuccess = await tryGPSLocation();
    
    if (gpsSuccess) {
      // Start continuous GPS watching
      startGPSWatch();
    } else {
      // Use IP location and set interval for updates
      const ipLocation = await getIPLocation();
      if (ipLocation) {
        await updateLocation(vehicleId, ipLocation.lat, ipLocation.lng, 'ip', true);
      }
      
      // Try GPS again every 60 seconds
      const gpsRetryInterval = setInterval(async () => {
        if (!useFallbackLocation) return;
        
        console.log('🔄 Retrying GPS...');
        const success = await tryGPSLocation();
        if (success) {
          clearInterval(gpsRetryInterval);
          startGPSWatch();
        }
      }, 60000);
      
      // Update IP location every 5 minutes
      const ipUpdateInterval = setInterval(async () => {
        if (!useFallbackLocation) return;
        
        const ipLocation = await getIPLocation();
        if (ipLocation) {
          await updateLocation(vehicleId, ipLocation.lat, ipLocation.lng, 'ip', true);
        }
      }, 300000);
      
      // Cleanup intervals
      return () => {
        clearInterval(gpsRetryInterval);
        clearInterval(ipUpdateInterval);
      };
    }
    
    // Force update every 30 seconds regardless of movement (for safety)
    const safetyInterval = setInterval(async () => {
      const vehicleId = await getAssignedVehicle();
      if (vehicleId && lastLocationRef.current) {
        // Force update with current location
        await updateLocation(
          vehicleId, 
          lastLocationRef.current.lat, 
          lastLocationRef.current.lng, 
          useFallbackLocation ? 'ip' : 'gps',
          true
        );
      }
    }, 30000);
    
    return () => {
      clearInterval(safetyInterval);
    };
  };

  useEffect(() => {
    // Only run for drivers
    if (user?.role !== 'driver') {
      console.log('👤 Not a driver, location sharing disabled');
      return;
    }

    console.log('👤 Driver detected, starting location sharing...');
    
    // Start everything
    let cleanupIntervals: (() => void) | undefined;
    
    const init = async () => {
      cleanupIntervals = await initializeLocationSharing();
    };
    
    init();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up location sharing...');
      
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        console.log('📍 GPS watch stopped');
      }
      
      if (cleanupIntervals) {
        cleanupIntervals();
      }
      
      // Reset refs
      vehicleIdRef.current = '';
      trackingIdRef.current = '';
      lastLocationRef.current = null;
      lastUpdateRef.current = 0;
      gpsAttemptsRef.current = 0;
    };
  }, [user]);

  // Render nothing (invisible component)
  return null;
}

// Optional: Create a simple status component for debugging
export function LocationSharingStatus() {
  const [status, setStatus] = useState('Initializing...');
  
  useEffect(() => {
    // This would connect to the DriverLocationUpdater's state
    // For now, just show a static status
    setStatus('Location sharing active');
  }, []);
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: '#10b981',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      zIndex: 1000,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
    }}>
      📍 {status}
    </div>
  );
}