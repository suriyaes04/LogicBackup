import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, database } from '@/lib/firebase';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  signup: (email: string, password: string, name: string, role: 'admin' | 'driver' | 'customer') => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user data from Realtime Database
  const fetchUserData = async (uid: string, email: string): Promise<User | null> => {
    try {
      const userRef = ref(database, `users/${uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const userData = snapshot.val();
        return {
          id: uid,
          email: email,
          name: userData.name || '',
          role: userData.role || 'customer',
          phone: userData.phone,
          avatar: userData.avatar,
          assignedVehicleId: userData.assignedVehicleId,
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        const userData = await fetchUserData(firebaseUser.uid, firebaseUser.email || '');
        setUser(userData);
      } else {
        setUser(null);
    }
      
    setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signup = async (
    email: string, 
    password: string, 
    name: string, 
    role: 'admin' | 'driver' | 'customer'
  ): Promise<boolean> => {
    try {
    setIsLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
    
      // Store user data in Realtime Database
      await set(ref(database, `users/${uid}`), {
        name,
        email,
        role,
        createdAt: Date.now(),
      });

      // Fetch and set user data
      const userData = await fetchUserData(uid);
      if (userData) {
        setUser(userData);
      }

      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error('Signup error:', error);
      setIsLoading(false);
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      // User data will be fetched in onAuthStateChanged
      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error('Login error:', error);
    setIsLoading(false);
    return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
    setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, signup, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
