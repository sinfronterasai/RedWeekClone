import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import Footer from "@/components/footer";
import EscrowProtectedRoute from "@/components/EscrowProtectedRoute";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye } from "lucide-react";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const statusColor: Record<string, string> = {
  initiated: "bg-blue-100 text-blue-800",
  documents_review: "bg-amber-100 text-amber-800",
  funds_received: "bg-purple-100 text-purple-800",
  closing: "bg-orange-100 text-orange-800",
  completed: "bg-emerald-100 text-emerald-800",
};

const statuses = [
  { value: "all", label: "All" },
  { value: "initiated", label: "Initiated" },
  { value: "documents_review", label: "Documents Review" },
  { value: "funds_received", label: "Funds Received" },
  { value: "closing", label: "Closing" },
  { value: "completed", label: "Completed" },
];

export default function EscrowTransactions() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const queryParams = statusFilter !== "all" ? `?status=${statusFilter}` : "";
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['/api/escrow/transactions', statusFilter],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/escrow/transactions${queryParams}`);
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <EscrowProtectedRoute>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Escrow Transactions</h1>
            <p className="text-muted-foreground mt-2">
              View and manage all escrow transactions
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Transactions</CardTitle>
              <CardDescription>Filter by status to find specific transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-6">
                <TabsList className="flex flex-wrap">
                  {statuses.map(s => (
                    <TabsTrigger key={s.value} value={s.value}>{s.label}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
              ) : transactions && transactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Sale Price</TableHead>
                      <TableHead>Escrow Fee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium">{tx.propertyName}</TableCell>
                        <TableCell>{tx.buyerName}</TableCell>
                        <TableCell>{tx.sellerName}</TableCell>
                        <TableCell>{formatCurrency(tx.salePrice)}</TableCell>
                        <TableCell>{formatCurrency(tx.escrowFee)}</TableCell>
                        <TableCell>
                          <Badge className={statusColor[tx.status] || ""}>
                            {tx.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/escrow/transactions/${tx.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-lg mb-2">No escrow transactions found</p>
                  <p className="text-sm">Use the Seed Data tool to add transactions, or change the status filter.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </EscrowProtectedRoute>
      <Footer />
    </div>
  );
}