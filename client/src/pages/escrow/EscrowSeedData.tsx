import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import Footer from "@/components/footer";
import EscrowProtectedRoute from "@/components/EscrowProtectedRoute";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Database } from "lucide-react";

interface MockTx {
  propertyName: string;
  listingId: string;
  buyerName: string;
  sellerName: string;
  salePrice: number;
  escrowFee: number;
}

const emptyTx = (): MockTx => ({
  propertyName: "",
  listingId: "listing_" + Date.now(),
  buyerName: "",
  sellerName: "",
  salePrice: 0,
  escrowFee: 250,
});

const quickSeedData: MockTx[] = [
  { listingId: "listing_demo_1", propertyName: "Marriott's Aruba Surf Club", buyerName: "James Wilson", sellerName: "Patricia Thompson", salePrice: 12500, escrowFee: 450 },
  { listingId: "listing_demo_2", propertyName: "Westin Princeville Ocean Resort", buyerName: "Robert Martinez", sellerName: "Linda Garcia", salePrice: 8900, escrowFee: 320 },
  { listingId: "listing_demo_3", propertyName: "Club Wyndham Bonnet Creek", buyerName: "Michael Brown", sellerName: "Sarah Davis", salePrice: 5200, escrowFee: 195 },
  { listingId: "listing_demo_4", propertyName: "Marriott's Crystal Shores", buyerName: "David Anderson", sellerName: "Jennifer White", salePrice: 15750, escrowFee: 575 },
];

export default function EscrowSeedData() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<MockTx[]>([emptyTx()]);

  const seedMutation = useMutation({
    mutationFn: async (transactions: MockTx[]) => {
      const res = await apiRequest("POST", "/api/escrow/transactions/seed", { transactions });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Transactions Seeded!", description: "Successfully created " + data.created + " escrow transactions." });
      setEntries([emptyTx()]);
    },
    onError: (error: any) => {
      toast({ title: "Seed failed", description: error.message || "Failed to create transactions", variant: "destructive" });
    },
  });

  const updateEntry = (index: number, field: keyof MockTx, value: string | number) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: field === "salePrice" || field === "escrowFee" ? Number(value) || 0 : value };
    setEntries(updated);
  };

  const addEntry = () => setEntries([...entries, emptyTx()]);
  const removeEntry = (index: number) => {
    if (entries.length === 1) return;
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleSeed = () => {
    const valid = entries.filter(e => e.propertyName && e.buyerName && e.sellerName && e.salePrice > 0);
    if (valid.length === 0) {
      toast({ title: "No valid entries", description: "Fill in property, buyer, seller, and price.", variant: "destructive" });
      return;
    }
    seedMutation.mutate(valid);
  };

  const handleQuickSeed = () => seedMutation.mutate(quickSeedData);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <EscrowProtectedRoute>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Seed Escrow Data</h1>
            <p className="text-muted-foreground mt-2">Load mock transactions for the board demo.</p>
          </div>

          <Card className="mb-8 border-emerald-200 bg-emerald-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-emerald-600" /> Quick Seed</CardTitle>
              <CardDescription>Instantly load 4 realistic demo transactions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                {quickSeedData.map((tx, i) => (
                  <div key={i} className="text-sm flex justify-between bg-white p-2 rounded border">
                    <span className="font-medium">{tx.propertyName}</span>
                    <span className="text-muted-foreground">{tx.buyerName} → {tx.sellerName} · ${tx.salePrice.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <Button onClick={handleQuickSeed} disabled={seedMutation.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                {seedMutation.isPending ? "Seeding..." : "Quick Seed 4 Demo Transactions"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Manual Entry</CardTitle>
              <CardDescription>Build custom escrow transactions one at a time.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {entries.map((entry, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold">Entry {index + 1}</span>
                      {entries.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeEntry(index)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Property Name *</Label>
                        <Input value={entry.propertyName} onChange={e => updateEntry(index, "propertyName", e.target.value)} placeholder="Marriott's Aruba Surf Club" />
                      </div>
                      <div>
                        <Label className="text-xs">Buyer Name *</Label>
                        <Input value={entry.buyerName} onChange={e => updateEntry(index, "buyerName", e.target.value)} placeholder="James Wilson" />
                      </div>
                      <div>
                        <Label className="text-xs">Seller Name *</Label>
                        <Input value={entry.sellerName} onChange={e => updateEntry(index, "sellerName", e.target.value)} placeholder="Patricia Thompson" />
                      </div>
                      <div>
                        <Label className="text-xs">Sale Price ($) *</Label>
                        <Input type="number" value={entry.salePrice || ""} onChange={e => updateEntry(index, "salePrice", e.target.value)} placeholder="12500" />
                      </div>
                      <div>
                        <Label className="text-xs">Escrow Fee ($)</Label>
                        <Input type="number" value={entry.escrowFee || ""} onChange={e => updateEntry(index, "escrowFee", e.target.value)} placeholder="250" />
                      </div>
                      <div>
                        <Label className="text-xs">Listing ID</Label>
                        <Input value={entry.listingId} onChange={e => updateEntry(index, "listingId", e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={addEntry}><Plus className="h-4 w-4 mr-1" /> Add Entry</Button>
                  <Button onClick={handleSeed} disabled={seedMutation.isPending} className="flex-1">
                    {seedMutation.isPending ? "Seeding..." : "Seed " + entries.filter(e => e.propertyName && e.buyerName && e.sellerName && e.salePrice > 0).length + " Transactions"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </EscrowProtectedRoute>
      <Footer />
    </div>
  );
}
