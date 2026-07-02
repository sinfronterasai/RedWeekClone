import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { ReactNode } from "react";

interface Props { children: ReactNode; }

export default function EscrowProtectedRoute({ children }: Props) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
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

  if (user.role !== 'escrow_vendor' && user.role !== 'admin') {
    setLocation("/dashboard");
    return null;
  }

  return <>{children}</>;
}