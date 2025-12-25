import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Key, Globe, Network, Shield } from 'lucide-react';

export default function TestMapplsPage() {
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [details, setDetails] = useState<any>({});
  const [tokenInfo, setTokenInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testMappls = async () => {
      setLoading(true);
      const token = import.meta.env.VITE_MAPPLS_TOKEN;
      
      const info = {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        tokenPrefix: token ? token.substring(0, 20) + '...' : 'none',
        isBearer: token?.startsWith('Bearer ') || false,
        isJWT: token?.includes('eyJ') || false,
        env: {
          mode: import.meta.env.MODE,
          baseUrl: import.meta.env.BASE_URL,
          hasEnv: !!import.meta.env
        }
      };
      
      setTokenInfo(info);
      
      if (!token) {
        setStatus('error');
        setDetails({ error: 'No token found in VITE_MAPPLS_TOKEN' });
        setLoading(false);
        return;
      }

      try {
        // Test 1: Try to load the SDK
        console.log('Testing Mappls SDK load...');
        
        const script = document.createElement('script');
        script.src = `https://apis.mappls.com/advancedmaps/api/${token}/map_sdk?v=3.8&layer=vector`;
        script.async = true;
        
        const loadPromise = new Promise((resolve, reject) => {
          script.onload = () => resolve(true);
          script.onerror = () => reject(new Error('Script load failed'));
          
          // Timeout after 10 seconds
          setTimeout(() => reject(new Error('Load timeout')), 10000);
        });
        
        document.head.appendChild(script);
        
        await loadPromise;
        
        // Test 2: Check if SDK is functional
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (window.mappls && window.mappls.Map) {
          setStatus('success');
          setDetails({
            sdkLoaded: true,
            sdkVersion: window.mappls.version || 'unknown',
            mapClass: !!window.mappls.Map,
            markerClass: !!window.mappls.Marker
          });
        } else {
          setStatus('error');
          setDetails({ error: 'SDK loaded but API not available' });
        }
        
        // Clean up
        script.remove();
        
      } catch (error: any) {
        setStatus('error');
        setDetails({ 
          error: error.message,
          tokenTested: token.substring(0, 30) + '...'
        });
      } finally {
        setLoading(false);
      }
    };

    testMappls();
  }, []);

  const runNetworkTest = async () => {
    const token = import.meta.env.VITE_MAPPLS_TOKEN;
    if (!token) return;
    
    console.log('Running network test...');
    
    const endpoints = [
      `https://apis.mappls.com/advancedmaps/api/${token}/map_sdk?v=3.8&layer=vector`,
      'https://apis.mappls.com/advancedmaps/api/health',
      'https://apis.mappls.com/'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { mode: 'no-cors' });
        console.log(`${endpoint}:`, response.type);
      } catch (error) {
        console.log(`${endpoint}:`, error.message);
      }
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Mappls SDK Test</h1>
        <p className="text-muted-foreground">Diagnose Mappls SDK loading issues</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Token Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Token Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Token Exists:</span>
                <span className={tokenInfo.hasToken ? 'text-green-600' : 'text-red-600'}>
                  {tokenInfo.hasToken ? '✅ Yes' : '❌ No'}
                </span>
              </div>
              {tokenInfo.hasToken && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Token Length:</span>
                    <span>{tokenInfo.tokenLength} characters</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Format:</span>
                    <span className={tokenInfo.isBearer || tokenInfo.isJWT ? 'text-green-600' : 'text-amber-600'}>
                      {tokenInfo.isBearer ? 'Bearer Token' : 
                       tokenInfo.isJWT ? 'JWT Token' : 'Unknown Format'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    First 20 chars: {tokenInfo.tokenPrefix}
                  </div>
                </>
              )}
            </div>
            
            {!tokenInfo.hasToken && (
              <Alert variant="destructive">
                <AlertDescription>
                  Add to your <code>.env</code> file:
                  <pre className="mt-2 p-2 bg-gray-900 text-white rounded">
VITE_MAPPLS_TOKEN=your_mappls_jwt_token_here
                  </pre>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* SDK Test Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              SDK Test Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p>Testing Mappls SDK...</p>
              </div>
            ) : status === 'success' ? (
              <div className="space-y-3">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    Mappls SDK loaded successfully!
                  </AlertDescription>
                </Alert>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SDK Version:</span>
                    <span>{details.sdkVersion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Map Class:</span>
                    <span className="text-green-600">✅ Available</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Marker Class:</span>
                    <span className="text-green-600">✅ Available</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to load Mappls SDK: {details.error}
                  </AlertDescription>
                </Alert>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Common Issues:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Token expired or invalid</li>
                    <li>Network/CORS issues</li>
                    <li>Incorrect token format</li>
                    <li>Mappls service downtime</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Environment Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Environment Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-muted-foreground">Environment:</span>
              <div className="font-medium">{tokenInfo.env?.mode || 'unknown'}</div>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">HTTPS:</span>
              <div className={`font-medium ${window.location.protocol === 'https:' ? 'text-green-600' : 'text-amber-600'}`}>
                {window.location.protocol === 'https:' ? '✅ Yes' : '⚠️ No'}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Host:</span>
              <div className="font-medium">{window.location.hostname}</div>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Browser:</span>
              <div className="font-medium">{navigator.userAgent.split(' ')[0]}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5" />
            Diagnostic Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
            <Button onClick={runNetworkTest} variant="outline">
              Test Network
            </Button>
            <Button onClick={() => {
              console.log('Environment:', import.meta.env);
              console.log('Token:', import.meta.env.VITE_MAPPLS_TOKEN);
              console.log('Window.mappls:', window.mappls);
            }} variant="outline">
              Log Debug Info
            </Button>
            <Button 
              onClick={() => window.open('https://mappls.com', '_blank')}
              variant="outline"
            >
              Mappls Website
            </Button>
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 border rounded-md">
            <p className="text-sm font-medium mb-2">Quick Console Commands:</p>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
{`// Check token
console.log('Token:', import.meta.env.VITE_MAPPLS_TOKEN)

// Check Mappls
console.log('Mappls:', window.mappls)

// Test load
const script = document.createElement('script')
script.src = \`https://apis.mappls.com/advancedmaps/api/\${import.meta.env.VITE_MAPPLS_TOKEN}/map_sdk?v=3.8\`
script.onload = () => console.log('Loaded!')
document.head.appendChild(script)`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}