/**
 * Developer Tool: User Storage Viewer
 * Shows where and how user credentials are stored
 * Access via: http://localhost:8080/dev/storage
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, RefreshCw, Trash2, Eye, EyeOff } from 'lucide-react';

const USERS_STORAGE_KEY = 'crowdvision_users';
const AUTH_STORAGE_KEY = 'crowdvision_auth';

interface StoredUser {
  id: string;
  email: string;
  password: string; // SHA-256 hash
  createdAt: string;
}

export default function UserStorageViewer() {
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [currentAuth, setCurrentAuth] = useState<any>(null);
  const [showHashes, setShowHashes] = useState(false);
  const [storageSize, setStorageSize] = useState({ users: 0, auth: 0 });

  const loadData = () => {
    try {
      // Load users
      const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
      const parsedUsers = usersJson ? JSON.parse(usersJson) : [];
      setUsers(parsedUsers);

      // Load current auth
      const authJson = localStorage.getItem(AUTH_STORAGE_KEY);
      const parsedAuth = authJson ? JSON.parse(authJson) : null;
      setCurrentAuth(parsedAuth);

      // Calculate storage size
      setStorageSize({
        users: new Blob([usersJson || '']).size,
        auth: new Blob([authJson || '']).size,
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const clearAllUsers = () => {
    if (confirm('⚠️ This will delete all registered users. Continue?')) {
      localStorage.removeItem(USERS_STORAGE_KEY);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      loadData();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">User Storage Viewer</h1>
              <p className="text-muted-foreground">Developer tool for viewing stored credentials</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={clearAllUsers} variant="destructive" size="sm">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>

        {/* Storage Info */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Storage Location</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="font-mono flex-1">
                <div className="text-muted-foreground mb-1">Browser Storage:</div>
                <div className="font-semibold">localStorage (F12 → Application → Local Storage)</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-muted-foreground mb-1">Users Database Key:</div>
                <code className="text-xs bg-background px-2 py-1 rounded">{USERS_STORAGE_KEY}</code>
                <div className="text-xs text-muted-foreground mt-2">Size: {storageSize.users} bytes</div>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-muted-foreground mb-1">Current Session Key:</div>
                <code className="text-xs bg-background px-2 py-1 rounded">{AUTH_STORAGE_KEY}</code>
                <div className="text-xs text-muted-foreground mt-2">Size: {storageSize.auth} bytes</div>
              </div>
            </div>

            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="font-semibold text-primary mb-1">🔐 Password Security:</div>
              <div className="text-xs">Passwords are hashed using SHA-256 (256-bit) before storage. Plain text passwords are NEVER stored.</div>
            </div>
          </div>
        </Card>

        {/* Current Session */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Current Session</h2>
          {currentAuth ? (
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between p-2 bg-muted rounded">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-semibold">{currentAuth.email}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span className="text-muted-foreground">User ID:</span>
                <span className="text-xs">{currentAuth.id}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span className="text-muted-foreground">Logged in:</span>
                <span className="text-xs">{new Date(currentAuth.createdAt).toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-4">No active session</div>
          )}
        </Card>

        {/* Registered Users */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Registered Users ({users.length})</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHashes(!showHashes)}
            >
              {showHashes ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showHashes ? 'Hide' : 'Show'} Password Hashes
            </Button>
          </div>

          {users.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No users registered yet. Sign up to see stored data.
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user, index) => (
                <div key={user.id} className="border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-lg">#{index + 1}</span>
                    <span className="text-xs text-muted-foreground">{user.id}</span>
                  </div>
                  
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-semibold">{user.email}</span>
                    </div>
                    
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">Created:</span>
                      <span className="text-xs">{new Date(user.createdAt).toLocaleString()}</span>
                    </div>

                    {showHashes && (
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span className="text-muted-foreground text-xs">Password Hash (SHA-256):</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(user.password)}
                            className="h-6 text-xs"
                          >
                            Copy
                          </Button>
                        </div>
                        <code className="text-xs break-all font-mono bg-background p-2 rounded block">
                          {user.password}
                        </code>
                        <div className="text-xs text-muted-foreground mt-2">
                          Length: {user.password.length} characters (64 hex digits = 256 bits)
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Raw JSON View */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Raw JSON Data</h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold">{USERS_STORAGE_KEY}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(JSON.stringify(users, null, 2))}
                >
                  Copy JSON
                </Button>
              </div>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                {JSON.stringify(users, null, 2)}
              </pre>
            </div>
          </div>
        </Card>

        {/* Instructions */}
        <Card className="p-6 bg-muted/50">
          <h3 className="font-semibold mb-2">How to Access in Browser DevTools:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Press F12 or Right-click → Inspect</li>
            <li>Go to "Application" tab (Chrome) or "Storage" tab (Firefox)</li>
            <li>Expand "Local Storage" → Click on "http://localhost:8080"</li>
            <li>Look for keys: <code className="bg-background px-1 rounded">{USERS_STORAGE_KEY}</code> and <code className="bg-background px-1 rounded">{AUTH_STORAGE_KEY}</code></li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
