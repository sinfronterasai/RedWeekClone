import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Circle, FileText } from "lucide-react";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const statusColor: Record<string, string> = {
  initiated: "bg-blue-100 text-blue-800",
  documents_review: "bg-amber-100 text-amber-800",
  funds_received: "bg-purple-100 text-purple-800",
  closing: "bg-orange-100 text-orange-800",
  completed: "bg-emerald-100 text-emerald-800",
};

export default function EscrowCustomerDetail() {
  const [, setLocation] = useLocation();
  const { id } = useParams();

  const { data: tx, isLoading, error } = useQuery({
    queryKey: ['/api/escrow/my-transactions', id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/escrow/my-transactions/${id}`);
      if (!res.ok) throw new Error(res.status === 403 ? 'Not your transaction' : 'Failed to load');
      return res.json();
    },
    enabled: !!id,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => setLocation("/escrow/my")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Transactions
        </Button>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading transaction...</div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-lg text-destructive mb-2">Unable to load this transaction</p>
            <p className="text-muted-foreground text-sm mb-4">{(error as Error).message}</p>
            <Button variant="outline" onClick={() => setLocation("/escrow/my")}>
              Back to My Transactions
            </Button>
          </div>
        ) : tx ? (
          <>
            <div className="flex items-center gap-4 mb-8">
              <h1 className="text-2xl font-bold text-foreground">{tx.propertyName}</h1>
              <Badge className={statusColor[tx.status] || ""}>
                {tx.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
              </Badge>
            </div>

            {/* Transaction Info & Escrow Provider */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Transaction Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sale Price</span>
                    <span className="font-semibold">{formatCurrency(tx.salePrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Escrow Fee</span>
                    <span className="font-semibold">{formatCurrency(tx.escrowFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{new Date(tx.createdAt).toLocaleDateString()}</span>
                  </div>
                  {tx.closedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Closed</span>
                      <span>{new Date(tx.closedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Counterparty</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Buyer</p>
                    <p className="font-semibold">{tx.buyerName}</p>
                    {tx.buyerEmail && <p className="text-sm text-muted-foreground">{tx.buyerEmail}</p>}
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-1">Seller</p>
                    <p className="font-semibold">{tx.sellerName}</p>
                    {tx.sellerEmail && <p className="text-sm text-muted-foreground">{tx.sellerEmail}</p>}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Milestone Timeline */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg">Transaction Progress</CardTitle>
                <CardDescription>Track each step as your escrow moves toward closing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-0">
                  {tx.milestones.map((milestone: any, index: number) => {
                    const isCompleted = !!milestone.completedAt;
                    const isLast = index === tx.milestones.length - 1;
                    return (
                      <div key={index} className="flex">
                        <div className="flex flex-col items-center mr-4">
                          {isCompleted ? (
                            <CheckCircle className="h-6 w-6 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <Circle className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                          )}
                          {!isLast && (
                            <div className={`w-0.5 h-full min-h-[24px] mt-1 ${isCompleted ? 'bg-emerald-200' : 'bg-muted'}`} />
                          )}
                        </div>
                        <div className="pb-6">
                          <p className={`font-semibold ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {milestone.label}
                          </p>
                          {isCompleted && milestone.completedAt && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              Completed {new Date(milestone.completedAt).toLocaleDateString()}
                            </p>
                          )}
                          {milestone.notes && (
                            <p className="text-sm text-muted-foreground mt-1 italic">
                              {milestone.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Documents</CardTitle>
                <CardDescription>Files associated with this escrow</CardDescription>
              </CardHeader>
              <CardContent>
                {tx.documents && tx.documents.length > 0 ? (
                  <div className="space-y-3">
                    {tx.documents.map((doc: any, index: number) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{doc.name}</p>
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
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No documents uploaded yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">Transaction not found</p>
            <Button variant="outline" className="mt-4" onClick={() => setLocation("/escrow/my")}>
              Back to My Transactions
            </Button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}