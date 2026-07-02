import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, ShieldCheck } from "lucide-react";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const statusColor: Record<string, string> = {
  initiated: "bg-blue-100 text-blue-800",
  documents_review: "bg-amber-100 text-amber-800",
  funds_received: "bg-purple-100 text-purple-800",
  closing: "bg-orange-100 text-orange-800",
  completed: "bg-emerald-100 text-emerald-800",
};

export default function EscrowCustomerDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['/api/escrow/my-transactions'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/escrow/my-transactions');
      return res.json();
    },
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    setLocation("/auth");
    return null;
  }

  const activeCount = transactions?.filter((t: any) => t.status !== 'completed').length ?? 0;
  const completedCount = transactions?.filter((t: any) => t.status === 'completed').length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">My Escrow Transactions</h1>
          <p className="text-muted-foreground mt-2">
            Track the status of your timeshare escrow transactions in one place
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
              <ShieldCheck className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{isLoading ? '-' : activeCount}</div>
              <p className="text-xs text-muted-foreground mt-1">In progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{isLoading ? '-' : completedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Successfully closed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
              <ShieldCheck className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{isLoading ? '-' : transactions?.length ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">All transactions</p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Transactions</CardTitle>
            <CardDescription>
              All escrow transactions where you are listed as buyer or seller
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
            ) : transactions && transactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Counterparty</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx: any) => {
                    const userFullName = `${user.firstName} ${user.lastName}`.toLowerCase();
                    const isBuyer = tx.buyerName.toLowerCase() === userFullName;
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium">{tx.propertyName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={isBuyer ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}>
                            {isBuyer ? "Buyer" : "Seller"}
                          </Badge>
                        </TableCell>
                        <TableCell>{isBuyer ? tx.sellerName : tx.buyerName}</TableCell>
                        <TableCell>{formatCurrency(tx.salePrice)}</TableCell>
                        <TableCell>
                          <Badge className={statusColor[tx.status] || ""}>
                            {tx.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => setLocation(`/escrow/my/${tx.id}`)}>
                            <Eye className="h-4 w-4 mr-1" /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg mb-2">No escrow transactions yet</p>
                <p className="text-sm max-w-md mx-auto">
                  When you buy or sell a timeshare through our escrow service, your transactions will appear here for tracking.
                </p>
                <Button variant="outline" className="mt-4" onClick={() => setLocation("/search?type=buy")}>
                  Browse Timeshares
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}