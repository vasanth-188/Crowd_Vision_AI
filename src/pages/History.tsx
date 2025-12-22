import { useEffect, useState } from 'react';
import { Clock, Image, Users, Download, Trash2, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAnalytics } from '@/hooks/useAnalytics';

// Mock history data
const historyItems = [
  {
    id: '1',
    date: '2024-01-15 14:32',
    filename: 'concert_hall.jpg',
    peopleCount: 342,
    processingTime: 2.4,
    alerts: 2,
  },
  {
    id: '2',
    date: '2024-01-15 11:15',
    filename: 'shopping_mall.png',
    peopleCount: 156,
    processingTime: 1.8,
    alerts: 0,
  },
  {
    id: '3',
    date: '2024-01-14 16:45',
    filename: 'stadium_entrance.jpg',
    peopleCount: 891,
    processingTime: 3.2,
    alerts: 5,
  },
  {
    id: '4',
    date: '2024-01-14 09:20',
    filename: 'train_station.jpg',
    peopleCount: 234,
    processingTime: 2.1,
    alerts: 1,
  },
  {
    id: '5',
    date: '2024-01-13 18:00',
    filename: 'festival_crowd.png',
    peopleCount: 567,
    processingTime: 2.8,
    alerts: 3,
  },
];

export default function History() {
  const { recentEntries, clearAnalytics } = useAnalytics();
  const [items, setItems] = useState(historyItems);
  const [selectedItem, setSelectedItem] = useState<typeof historyItems[0] | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<typeof historyItems[0] | null>(null);

  // Map analytics to history items when available
  useEffect(() => {
    if (recentEntries && recentEntries.length > 0) {
      const mapped = recentEntries.slice(-20).map((entry, idx) => ({
        id: `${entry.timestamp.getTime()}_${idx}`,
        date: entry.timestamp.toLocaleString(),
        filename: `analysis_${entry.timestamp.toISOString().split('T')[0]}.json`,
        peopleCount: entry.peopleCount,
        processingTime: Number(entry.processingTime?.toFixed?.(1) ?? entry.processingTime ?? 0),
        alerts: entry.alertsTriggered ? 1 : 0,
      }));
      setItems(mapped);
    } else {
      setItems(historyItems);
    }
  }, [recentEntries]);

  const handleView = (item: typeof historyItems[0]) => {
    setSelectedItem(item);
    setIsViewOpen(true);
  };

  const handleDownload = (item: typeof historyItems[0]) => {
    const blob = new Blob([JSON.stringify(item, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.filename.replace(/\.[^/.]+$/, '')}-analysis.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Analysis JSON downloaded');
  };

  const requestDelete = (item: typeof historyItems[0]) => {
    setDeleteTarget(item);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
    toast.success('Analysis deleted');
    setDeleteTarget(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold font-display mb-2">Analysis History</h1>
        <p className="text-muted-foreground">
          View and manage your past crowd analyses
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Image className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{items.length}</p>
                <p className="text-sm text-muted-foreground">Total Analyses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {items.reduce((sum, item) => sum + item.peopleCount, 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">People Detected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {(items.reduce((sum, item) => sum + item.processingTime, 0) / Math.max(1, items.length)).toFixed(1)}s
                </p>
                <p className="text-sm text-muted-foreground">Avg Processing</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History List */}
      <Card className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Analyses</CardTitle>
            <CardDescription>Your crowd detection history</CardDescription>
          </div>
          <Button variant="outline" onClick={() => { clearAnalytics(); setItems([]); toast.success('All analysis history cleared'); }}>
            Clear All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors animate-fade-in"
                style={{ animationDelay: `${0.1 * (index + 1)}s` }}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-muted">
                    <Image className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{item.filename}</p>
                    <p className="text-sm text-muted-foreground">{item.date}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center hidden sm:block">
                    <p className="text-lg font-bold text-primary">{item.peopleCount}</p>
                    <p className="text-xs text-muted-foreground">People</p>
                  </div>

                  <div className="text-center hidden md:block">
                    <p className="text-lg font-bold">{item.processingTime}s</p>
                    <p className="text-xs text-muted-foreground">Time</p>
                  </div>

                  <div className="hidden lg:block">
                    {item.alerts > 0 ? (
                      <Badge variant="destructive">{item.alerts} alerts</Badge>
                    ) : (
                      <Badge variant="secondary">No alerts</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button aria-label="View details" onClick={() => handleView(item)} variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button aria-label="Download analysis" onClick={() => handleDownload(item)} variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button aria-label="Delete analysis" onClick={() => requestDelete(item)} variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Analysis Details</DialogTitle>
            <DialogDescription>Summary for {selectedItem?.filename}</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Filename</p>
                <p className="font-medium">{selectedItem.filename}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">{selectedItem.date}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">People</p>
                <p className="font-medium">{selectedItem.peopleCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Processing Time</p>
                <p className="font-medium">{selectedItem.processingTime}s</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                <p className="text-sm text-muted-foreground">Alerts</p>
                {selectedItem.alerts > 0 ? (
                  <Badge variant="destructive">{selectedItem.alerts} alerts</Badge>
                ) : (
                  <Badge variant="secondary">No alerts</Badge>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete analysis?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove
              the analysis entry for <span className="font-medium">{deleteTarget?.filename}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
