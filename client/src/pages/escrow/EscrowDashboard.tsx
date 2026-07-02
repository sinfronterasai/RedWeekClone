import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import Footer from "@/components/footer";
import EscrowProtectedRoute from "@/components/EscrowProtectedRoute";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Briefcase, CheckCircle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const statusColor: Record<string, string> = {
  initiated: "bg-blue-100 text-blue-800",
  documents_review: "bg-amber-100 text-amber-800",
  funds_received: "bg-purple-100 text-purple-800",
  closing: "bg-orange-100 text-orange-800",
  completed: "bg-emerald-100 text-emerald-800",
};

export default function EscrowDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/escrow/dashboard'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/escrow/dashboard');
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <EscrowProtectedRoute>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Escrow Management</h1>
            <p className="text-muted-foreground mt-2">
              Welcome back, {user?.firstName}! Monitor and manage escrow transactions.
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground">Loading dashboard...</div>
          ) : stats ? (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Active Transactions</CardTitle>
                    <Briefcase className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.activeTransactions}</div>
                    <p className="text-xs text-muted-foreground mt-1">Currently in progress</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Funds in Escrow</CardTitle>
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{formatCurrency(stats.totalFundsInEscrow)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total held across all accounts</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Completed (This Month)</CardTitle>
                    <CheckCircle className="h-4 w-4 text-amber-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.completedThisMonth}</div>
                    <p className="text-xs text-muted-foreground mt-1">Successfully closed</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Avg Close Time</CardTitle>
                    <Clock className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.averageCloseTimeDays}</div>
                    <p className="text-xs text-muted-foreground mt-1">Days from open to close</p>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Volume Chart */}
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Monthly Volume</CardTitle>
                  <CardDescription>Transaction count and total value over the last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.monthlyVolume}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                      <YAxis yAxisId="right" orientation="right" label={{ value: 'Volume ($)', angle: 90, position: 'insideRight' }} />
                      <Tooltip formatter={(value: number, name: string) => name === 'volume' ? formatCurrency(value) : value} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="Transactions" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="volume" fill="#10b981" name="Volume ($)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest escrow transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Buyer</TableHead>
                        <TableHead>Seller</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.recentTransactions.map((tx: any) => (
                        <TableRow
                          key={tx.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setLocation(`/escrow/transactions/${tx.id}`)}
                        >
                          <TableCell className="font-medium">{tx.propertyName}</TableCell>
                          <TableCell>{tx.buyerName}</TableCell>
                          <TableCell>{tx.sellerName}</TableCell>
                          <TableCell>{formatCurrency(tx.salePrice)}</TableCell>
                          <TableCell>
                            <Badge className={statusColor[tx.status] || ""}>
                              {tx.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      {stats.recentTransactions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No transactions yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-16 text-muted-foreground">Failed to load dashboard</div>
          )}
        </div>
      </EscrowProtectedRoute>
      <Footer />
    </div>
  );
}