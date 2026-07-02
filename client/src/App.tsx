import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import Home from "@/pages/home";
import ResortDetail from "@/pages/resort-detail";
import SearchResults from "@/pages/search-results";
import Auth from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import Admin from "@/pages/admin";
import AdminUsers from "@/pages/admin-users";
import AdminResorts from "@/pages/admin-resorts";
import AdminSettings from "@/pages/admin-settings";
import AdminInventory from "@/pages/admin-inventory";
import CreateListing from "@/pages/create-listing";
import Forums from "@/pages/forums";
import Contact from "@/pages/contact";
import EscrowDashboard from "@/pages/escrow/EscrowDashboard";
import EscrowTransactions from "@/pages/escrow/EscrowTransactions";
import EscrowTransactionDetail from "@/pages/escrow/EscrowTransactionDetail";
import EscrowSeedData from "@/pages/escrow/EscrowSeedData";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/resort/:id" component={ResortDetail} />
      <Route path="/search" component={SearchResults} />
      <Route path="/auth" component={Auth} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/resorts" component={AdminResorts} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/inventory" component={AdminInventory} />
      <Route path="/escrow/dashboard" component={EscrowDashboard} />
      <Route path="/escrow/transactions" component={EscrowTransactions} />
      <Route path="/escrow/transactions/:id" component={EscrowTransactionDetail} />
      <Route path="/escrow/seed" component={EscrowSeedData} />
      <Route path="/create-listing" component={CreateListing} />
      <Route path="/forums" component={Forums} />
      <Route path="/contact" component={Contact} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
