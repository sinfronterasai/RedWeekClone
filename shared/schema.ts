import { z } from "zod";

// User Schema
export const insertUserSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.string().default("user"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

export type User = InsertUser & {
  id: string;
  createdAt: Date;
};

// Resort Schema
export const insertResortSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  description: z.string().min(1),
  imageUrl: z.string().min(1),
  amenities: z.array(z.string()),
  rating: z.string(),
  availableRentals: z.number().default(0),
  priceMin: z.number(),
  priceMax: z.number(),
  isNewAvailability: z.boolean().default(false),
  destination: z.string().min(1),
});

export type InsertResort = z.infer<typeof insertResortSchema>;

export type Resort = InsertResort & {
  id: string;
  reviewCount: number;
  createdAt: Date;
};

// Review Schema
export const insertReviewSchema = z.object({
  resortId: z.string().min(1),
  userId: z.string().min(1),
  rating: z.number().min(1).max(5),
  title: z.string().min(1),
  content: z.string().min(1),
});

export type InsertReview = z.infer<typeof insertReviewSchema>;

export type Review = InsertReview & {
  id: string;
  createdAt: Date;
};

// Booking Schema
export const insertBookingSchema = z.object({
  resortId: z.string().min(1),
  userId: z.string().min(1),
  checkIn: z.date(),
  checkOut: z.date(),
  guests: z.number().min(1),
  totalPrice: z.number().min(0),
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type Booking = InsertBooking & {
  id: string;
  status: string;
  createdAt: Date;
};

// Listing Schema
export const insertListingSchema = z.object({
  resortId: z.string().min(1),
  ownerId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  pricePerNight: z.number().min(0),
  availableFrom: z.date(),
  availableTo: z.date(),
  maxGuests: z.number().min(1),
  contractDocumentUrl: z.string().optional(),
  salePrice: z.number().optional(),
  isForSale: z.boolean().default(false),
});

export type InsertListing = z.infer<typeof insertListingSchema>;

export type Listing = InsertListing & {
  id: string;
  isActive: boolean;
  contractVerificationStatus: string;
  escrowStatus: string;
  ownershipVerified: boolean;
  escrowAccountId: string | null;
  createdAt: Date;
};

// Site Setting Schema
export const insertSiteSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
  category: z.string().default("general"),
  description: z.string().optional(),
  isEncrypted: z.boolean().default(false),
});

export type InsertSiteSetting = z.infer<typeof insertSiteSettingSchema>;

export type SiteSetting = InsertSiteSetting & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

// Property Inquiry Schema
export const insertPropertyInquirySchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  propertyName: z.string().min(1),
  location: z.string().min(1),
  ownershipType: z.string().min(1),
  weekNumbers: z.string().optional(),
  askingPrice: z.number().optional(),
  motivation: z.string().min(1),
  additionalInfo: z.string().optional(),
});

export type InsertPropertyInquiry = z.infer<typeof insertPropertyInquirySchema>;

export type PropertyInquiry = InsertPropertyInquiry & {
  id: string;
  status: string;
  createdAt: Date;
};

// Escrow Transaction Schema
export const insertEscrowTransactionSchema = z.object({
  listingId: z.string().min(1, "Listing ID is required"),
  propertyName: z.string().min(1, "Property name is required"),
  buyerName: z.string().min(1, "Buyer name is required"),
  buyerEmail: z.string().email().optional(),
  sellerName: z.string().min(1, "Seller name is required"),
  sellerEmail: z.string().email().optional(),
  salePrice: z.number().positive("Sale price must be positive"),
  escrowFee: z.number().positive("Escrow fee must be positive"),
  status: z.enum(["initiated", "documents_review", "funds_received", "closing", "completed"]).default("initiated"),
  milestones: z.array(z.object({
    label: z.string(),
    completedAt: z.string().nullable(),
    notes: z.string().optional(),
  })).default([]),
  documents: z.array(z.object({
    name: z.string(),
    url: z.string(),
    uploadedAt: z.string(),
  })).default([]),
});

export type EscrowTransaction = z.infer<typeof insertEscrowTransactionSchema> & {
  id: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

export type InsertEscrowTransaction = z.infer<typeof insertEscrowTransactionSchema>;

// Escrow Dashboard Stats
export type EscrowDashboardStats = {
  activeTransactions: number;
  totalFundsInEscrow: number;
  completedThisMonth: number;
  averageCloseTimeDays: number;
  monthlyVolume: { month: string; count: number; volume: number }[];
  recentTransactions: EscrowTransaction[];
};
