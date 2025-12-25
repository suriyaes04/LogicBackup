# Setup Guide

This guide will help you set up the LogiTech Logistics Management System with all the required services.

## Prerequisites

- Node.js 18+ and npm
- Firebase project with Authentication and Realtime Database enabled
- Cloudinary account
- Razorpay account (for Indian payments)
- Mappls account (for Indian maps)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Cloudinary Configuration
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_SECRET=your_cloudinary_secret

# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id

# Mappls Configuration
VITE_MAPPLS_TOKEN=your_mappls_token

# API URL (Backend Server)
VITE_API_URL=http://localhost:3001

# Server Port (Backend)
PORT=3001
```

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable **Authentication** → Email/Password provider
4. Enable **Realtime Database** → Create database in test mode (or set up rules)
5. Copy your Firebase config values to `.env`

### 3. Cloudinary Setup

1. Sign up at [Cloudinary](https://cloudinary.com/)
2. Go to Dashboard → Settings
3. Copy your Cloud Name, API Key, and API Secret to `.env`

### 4. Razorpay Setup

1. Sign up at [Razorpay](https://razorpay.com/)
2. Go to Settings → API Keys
3. Generate Test/Live keys
4. Copy Key ID and Key Secret to `.env`

### 5. Mappls Setup

1. Sign up at [Mappls](https://mappls.com/)
2. Get your API token
3. Copy to `.env` as `VITE_MAPPLS_TOKEN`

## Running the Application

### Development Mode

Run both frontend and backend:

```bash
npm run dev:full
```

Or run separately:

**Terminal 1 (Frontend):**
```bash
npm run dev
```

**Terminal 2 (Backend):**
```bash
npm run server
```

### Production Build

```bash
npm run build
```

## Database Structure

The Firebase Realtime Database structure:

```
/users/{uid}
  - name
  - email
  - role (admin | driver | customer)
  - phone (optional)
  - avatar (optional)

/vehicles/{vehicleId}
  - name
  - model
  - type
  - capacity
  - pricePerKm
  - available
  - driverId (optional)
  - imageUrl (optional)
  - specifications
    - fuelType
    - maxWeight
    - dimensions

/vehicleLocations/{vehicleId}
  - lat
  - lng
  - timestamp

/payments/{userId}/{paymentId}
  - orderId
  - paymentId
  - amount
  - status
  - timestamp
```

## Testing

### 1. Sign Up Users

- Create accounts with different roles (admin, driver, customer)
- Each role has different access levels

### 2. Vehicle Management

- **Admin**: Can view and manage all vehicles
- **Driver**: Can view only assigned vehicles
- **Customer**: Can view all available vehicles

### 3. Live Tracking

- Drivers automatically update their location every 5 seconds
- Location is stored in `/vehicleLocations/{vehicleId}`
- Customers and admins can view live tracking

### 4. Payment Testing

- Use Razorpay test mode
- Test cards: https://razorpay.com/docs/payments/test-cards/

### 5. Image Upload

- Upload vehicle images via Cloudinary
- Images are stored securely and return a URL

## Firebase Realtime Database Rules

For development, use these rules:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "vehicles": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'"
    },
    "vehicleLocations": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "payments": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

## Troubleshooting

### Firebase Connection Issues
- Check your Firebase config values
- Ensure Realtime Database is enabled
- Check database rules

### Cloudinary Upload Fails
- Verify API credentials
- Check image size (max 5MB)
- Ensure backend server is running

### Razorpay Payment Issues
- Use test mode keys for development
- Check backend server logs
- Verify key IDs match

### Mappls Map Not Loading
- Verify token is correct
- Check browser console for errors
- Ensure token has map access permissions

## Features Implemented

✅ Firebase Authentication with role-based access
✅ Signup and Login pages
✅ Cloudinary image upload
✅ Vehicle management (CRUD operations)
✅ Real-time vehicle location tracking
✅ Mappls integration for live maps
✅ Razorpay payment gateway
✅ Role-based route protection
✅ Real-time Firebase listeners

## Next Steps

1. Set up production environment variables
2. Configure Firebase security rules for production
3. Set up SSL for backend server
4. Deploy frontend and backend separately
5. Add error monitoring (Sentry, etc.)
6. Set up CI/CD pipeline

