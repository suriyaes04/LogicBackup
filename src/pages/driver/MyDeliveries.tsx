import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { bookingService, vehicleService } from "@/lib/firebase-utils";
import { Booking, Vehicle } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Package, MapPin, Truck, Calendar, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function MyDeliveries() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [statusUpdateDialog, setStatusUpdateDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<Booking['status'] | ''>('');
  const [updating, setUpdating] = useState(false);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [bookingList, vehicleList] = await Promise.all([
        bookingService.getBookingsByDriver(user.id),
        vehicleService.getAllVehicles(),
      ]);
      setBookings(bookingList);
      setVehicles(vehicleList);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load deliveries", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const getStatusBadge = (status: Booking['status']) => {
    const variants = {
      pending: <Badge variant="secondary">Pending</Badge>,
      pending_payment: <Badge className="bg-warning text-warning-foreground">Payment Pending</Badge>,
      in_progress: <Badge className="bg-info text-info-foreground">In Progress</Badge>,
      completed: <Badge className="bg-success text-success-foreground">Completed</Badge>,
      cancelled: <Badge className="bg-destructive text-destructive-foreground">Cancelled</Badge>,
    };
    return variants[status];
  };

  const getNextStatus = (currentStatus: Booking['status']): Booking['status'][] => {
    switch (currentStatus) {
      case 'pending':
        return ['in_progress', 'cancelled'];
      case 'in_progress':
        return ['completed', 'cancelled'];
      case 'pending_payment':
        return []; // Driver cannot modify payment pending bookings
      default:
        return [];
    }
  };

  const getStatusDisplayName = (status: Booking['status']) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'pending_payment': return 'Payment Pending';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const handleStatusUpdateClick = (booking: Booking) => {
    const availableStatuses = getNextStatus(booking.status);
    if (availableStatuses.length === 0) {
      toast({
        title: "Cannot Update",
        description: "This booking cannot be updated further",
        variant: "default"
      });
      return;
    }
    
    setSelectedBooking(booking);
    setNewStatus('');
    setStatusUpdateDialog(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedBooking || !newStatus) return;

    setUpdating(true);
    try {
      await bookingService.updateBooking(selectedBooking.id, { status: newStatus });
      
      toast({
        title: "Status Updated",
        description: `Booking status changed to ${getStatusDisplayName(newStatus)}`,
      });
      
      // Reload data
      loadData();
      setStatusUpdateDialog(false);
      setSelectedBooking(null);
      setNewStatus('');
      
    } catch (error) {
      console.error(error);
      toast({ 
        title: "Error", 
        description: "Unable to update status", 
        variant: "destructive" 
      });
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? vehicle.name : vehicleId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Deliveries</h1>
        <p className="text-muted-foreground">Manage your assigned deliveries</p>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Deliveries Assigned</h3>
            <p className="text-muted-foreground">You don't have any active deliveries at the moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {bookings.map((booking) => {
            const availableStatuses = getNextStatus(booking.status);
            const canUpdate = availableStatuses.length > 0;
            
            return (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Booking: {booking.id}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Truck className="w-4 h-4" />
                        Vehicle: {getVehicleName(booking.vehicleId)}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(booking.status)}
                      {booking.paymentStatus && (
                        <Badge variant={booking.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                          {booking.paymentStatus}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Route Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-success" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Pickup</p>
                          <p className="text-sm truncate">{booking.pickupAddress}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-destructive" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Destination</p>
                          <p className="text-sm truncate">{booking.destinationAddress}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Booking Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Distance</p>
                      <p>{booking.distance} km</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Est. Time</p>
                      <p>{booking.estimatedTime}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Amount</p>
                      <p>₹{booking.amount}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Created</p>
                      <p>{formatDate(booking.createdAt)}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      asChild
                    >
                      <Link to={`/track/${booking.vehicleId}`}>
                        <Truck className="w-4 h-4 mr-2" />
                        Track Vehicle
                      </Link>
                    </Button>
                    
                    {canUpdate && (
                      <Button 
                        onClick={() => handleStatusUpdateClick(booking)}
                        className="flex-1"
                      >
                        Update Status
                      </Button>
                    )}
                    
                    {!canUpdate && booking.status !== 'completed' && booking.status !== 'cancelled' && (
                      <Button 
                        variant="outline"
                        className="flex-1"
                        disabled
                      >
                        No Actions Available
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Status Update Dialog */}
      <AlertDialog open={statusUpdateDialog} onOpenChange={setStatusUpdateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Delivery Status</AlertDialogTitle>
            <AlertDialogDescription>
              Update the status for booking: {selectedBooking?.id}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Current Status</p>
              <div className="flex items-center gap-2">
                {selectedBooking && getStatusBadge(selectedBooking.status)}
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Update to</p>
              <Select 
                value={newStatus} 
                onValueChange={(value: Booking['status']) => setNewStatus(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {selectedBooking && getNextStatus(selectedBooking.status).map((status) => (
                    <SelectItem key={status} value={status}>
                      <div className="flex items-center gap-2">
                        {status === 'completed' && <CheckCircle className="w-4 h-4 text-success" />}
                        {status === 'cancelled' && <XCircle className="w-4 h-4 text-destructive" />}
                        {status === 'in_progress' && <Clock className="w-4 h-4 text-info" />}
                        {getStatusDisplayName(status)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {newStatus === 'completed' && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm font-medium text-green-800">Complete Delivery</p>
                <p className="text-xs text-green-600">
                  This will mark the delivery as completed. Ensure you have:
                </p>
                <ul className="text-xs text-green-600 mt-1 space-y-1 list-disc pl-4">
                  <li>Delivered the package to the destination</li>
                  <li>Received confirmation from the customer</li>
                  <li>Completed all necessary paperwork</li>
                </ul>
              </div>
            )}
            
            {newStatus === 'cancelled' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm font-medium text-red-800">Cancel Delivery</p>
                <p className="text-xs text-red-600">
                  This will cancel the delivery. Please ensure you have a valid reason:
                </p>
                <ul className="text-xs text-red-600 mt-1 space-y-1 list-disc pl-4">
                  <li>Vehicle breakdown</li>
                  <li>Customer requested cancellation</li>
                  <li>Unforeseen circumstances</li>
                </ul>
              </div>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleStatusUpdate}
              disabled={!newStatus || updating}
              className="bg-primary hover:bg-primary/90"
            >
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Status'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}