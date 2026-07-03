import { useState } from "react";
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
import { DollarSign, FileText, Clock, CheckCircle, Circle, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";

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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const activeTxs = transactions?.filter((t: any) => t.status !== 'completed') ?? [];
  const completedTxs = transactions?.filter((t: any) => t.status === 'completed') ?? [];
  const totalValue = transactions?.reduce((sum: number, t: any) => sum + (t.salePrice || 0), 0) ?? 0;
  const totalFees = transactions?.reduce((sum: number, t: any) => sum + (t.escrowFee || 0), 0) ?? 0;
  const activeValue = activeTxs.reduce((sum: number, t: any) => sum + (t.salePrice || 0), 0);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">My Escrow Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            All your timeshare escrow transactions, balances, and documents in one place
          </p>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Escrow Value</CardTitle>
              <DollarSign className="h-4 w-4 text-brand-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{isLoading ? '-' : formatCurrency(totalValue)}</div>
              <p className="text-xs text-muted-foreground mt-1">Combined sale prices</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Funds in Escrow</CardTitle>
              <ShieldCheck className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{isLoading ? '-' : formatCurrency(activeValue)}</div>
              <p className="text-xs text-muted-foreground mt-1">{activeTxs.length} active transaction{activeTxs.length !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Escrow Fees</CardTitle>
              <FileText className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{isLoading ? '-' : formatCurrency(totalFees)}</div>
              <p className="text-xs text-muted-foreground mt-1">Total service fees</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{isLoading ? '-' : completedTxs.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Closed transactions</p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions with expandable detail */}
        <Card>
          <CardHeader>
            <CardTitle>Your Transactions</CardTitle>
            <CardDescription>
              Click a row to see full details, progress timeline, and documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
            ) : transactions && transactions.length > 0 ? (
              <div className="space-y-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30px]"></TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Counterparty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx: any) => {
                      const userFullName = `${user.firstName} ${user.lastName}`.toLowerCase();
                      const isBuyer = tx.buyerName.toLowerCase() === userFullName;
                      const isExpanded = expandedId === tx.id;

                      return (
                        <>
                          <TableRow
                            key={tx.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => toggleExpand(tx.id)}
                          >
                            <TableCell>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TableCell>
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
                          </TableRow>

                          {/* Expanded detail panel */}
                          {isExpanded && (
                            <TableRow key={`${tx.id}-detail`}>
                              <TableCell colSpan={7} className="bg-muted/30 p-0">
                                <div className="p-6 space-y-6">
                                  {/* Transaction info grid */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Card>
                                      <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">Transaction Details</CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-1 text-sm">
                                        <div className="flex justify-between gap-3 py-2 border-b last:border-b-0 text-sm">
                                          <strong className="text-muted-foreground">Sale Price</strong>
                                          <span className="font-semibold">{formatCurrency(tx.salePrice)}</span>
                                        </div>
                                        <div className="flex justify-between gap-3 py-2 border-b last:border-b-0 text-sm">
                                          <strong className="text-muted-foreground">Escrow Fee</strong>
                                          <span className="font-semibold">{formatCurrency(tx.escrowFee)}</span>
                                        </div>
                                        <div className="flex justify-between gap-3 py-2 border-b last:border-b-0 text-sm">
                                          <strong className="text-muted-foreground">Created</strong>
                                          <span>{new Date(tx.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        {tx.closedAt && (
                                          <div className="flex justify-between gap-3 py-2 border-b last:border-b-0 text-sm">
                                            <strong className="text-muted-foreground">Closed</strong>
                                            <span>{new Date(tx.closedAt).toLocaleDateString()}</span>
                                          </div>
                                        )}
                                      </CardContent>
                                    </Card>

                                    <Card>
                                      <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">{isBuyer ? "Seller" : "Buyer"} Info</CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-1 text-sm">
                                        <div className="flex justify-between gap-3 py-2 border-b last:border-b-0 text-sm">
                                          <strong className="text-muted-foreground">Name</strong>
                                          <span className="font-semibold">{isBuyer ? tx.sellerName : tx.buyerName}</span>
                                        </div>
                                        {(isBuyer ? tx.sellerEmail : tx.buyerEmail) && (
                                          <div className="flex justify-between gap-3 py-2 border-b last:border-b-0 text-sm">
                                            <strong className="text-muted-foreground">Email</strong>
                                            <span>{isBuyer ? tx.sellerEmail : tx.buyerEmail}</span>
                                          </div>
                                        )}
                                      </CardContent>
                                    </Card>

                                    <Card>
                                      <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">Your Role</CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-1 text-sm">
                                        <div className="flex justify-between gap-3 py-2 border-b last:border-b-0 text-sm">
                                          <strong className="text-muted-foreground">Role</strong>
                                          <Badge variant="outline" className={isBuyer ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}>
                                            {isBuyer ? "Buyer" : "Seller"}
                                          </Badge>
                                        </div>
                                        {isBuyer && (
                                          <div className="flex justify-between gap-3 py-2 border-b last:border-b-0 text-sm">
                                            <strong className="text-muted-foreground">Listing ID</strong>
                                            <span className="text-xs font-mono">{tx.listingId}</span>
                                          </div>
                                        )}
                                      </CardContent>
                                    </Card>
                                  </div>

                                  {/* Milestone Timeline */}
                                  <div>
                                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                      <Clock className="h-4 w-4 text-muted-foreground" />
                                      Transaction Progress
                                    </h4>
                                    <div className="space-y-0">
                                      {tx.milestones.map((milestone: any, idx: number) => {
                                        const done = !!milestone.completedAt;
                                        const last = idx === tx.milestones.length - 1;
                                        return (
                                          <div key={idx} className="flex">
                                            <div className="flex flex-col items-center mr-4">
                                              {done ? (
                                                <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                                              ) : (
                                                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                              )}
                                              {!last && (
                                                <div className={`w-0.5 h-full min-h-[20px] mt-1 ${done ? 'bg-emerald-200' : 'bg-muted'}`} />
                                              )}
                                            </div>
                                            <div className="pb-4">
                                              <p className={`text-sm font-medium ${done ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                {milestone.label}
                                              </p>
                                              {done && milestone.completedAt && (
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                  Completed {new Date(milestone.completedAt).toLocaleDateString()}
                                                </p>
                                              )}
                                              {milestone.notes && (
                                                <p className="text-xs text-muted-foreground mt-1 italic">{milestone.notes}</p>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Documents */}
                                  <div>
                                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-muted-foreground" />
                                      Documents &amp; Paperwork
                                    </h4>
                                    {tx.documents && tx.documents.length > 0 ? (
                                      <div className="space-y-2">
                                        {tx.documents.map((doc: any, idx: number) => (
                                          <div key={idx} className="flex items-center gap-3 p-3 bg-background border rounded-md">
                                            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                              <p className="font-medium text-sm truncate">{doc.name}</p>
                                              <p className="text-xs text-muted-foreground">
                                                Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                                              </p>
                                            </div>
                                            <Button variant="outline" size="sm" asChild>
                                              <a href={doc.url} target="_blank" rel="noopener noreferrer">Download</a>
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-center py-6 text-muted-foreground text-sm border rounded-md bg-background">
                                        <FileText className="h-6 w-6 mx-auto mb-1 opacity-40" />
                                        <p>No documents uploaded yet</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg mb-2">No escrow transactions yet</p>
                <p className="text-sm max-w-md mx-auto mb-4">
                  When you buy or sell a timeshare through our escrow service, your transactions will appear here for tracking.
                </p>
                <Button variant="outline" onClick={() => setLocation("/search?type=buy")}>
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