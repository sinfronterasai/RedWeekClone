import { type User, type InsertUser, type Resort, type InsertResort, type Review, type InsertReview, type Booking, type InsertBooking, type Listing, type InsertListing } from "@shared/schema";
import { randomUUID } from "crypto";

import type {
  SiteSetting,
  InsertSiteSetting,
  PropertyInquiry,
  InsertPropertyInquiry,
  EscrowTransaction,
  InsertEscrowTransaction,
  EscrowDashboardStats
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Resort methods
  getResorts(): Promise<Resort[]>;
  getResort(id: string): Promise<Resort | undefined>;
  getResortsByDestination(destination: string): Promise<Resort[]>;
  getNewAvailabilityResorts(): Promise<Resort[]>;
  getTopResorts(): Promise<Resort[]>;
  searchResorts(query: string): Promise<Resort[]>;
  createResort(resort: InsertResort): Promise<Resort>;
  createResortsInBulk(insertResorts: InsertResort[]): Promise<Resort[]>;

  // Review methods
  getReviewsByResort(resortId: string): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;

  // Booking methods
  getBookingsByUser(userId: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;

  // Listing methods
  getListingsByOwner(ownerId: string): Promise<Listing[]>;
  getListing(id: string): Promise<Listing | undefined>;
  createListing(listing: InsertListing): Promise<Listing>;
  updateListing(id: string, updateData: Partial<Omit<Listing, 'id' | 'createdAt'>>): Promise<Listing | undefined>;

  // Site Settings methods
  getSiteSetting(key: string): Promise<SiteSetting | undefined>;
  getSiteSettingsByCategory(category: string): Promise<SiteSetting[]>;
  getAllSiteSettings(): Promise<SiteSetting[]>;
  setSiteSetting(setting: InsertSiteSetting): Promise<SiteSetting>;
  deleteSiteSetting(key: string): Promise<boolean>;

  // Property Inquiry methods
  getPropertyInquiries(): Promise<PropertyInquiry[]>;
  getPropertyInquiry(id: string): Promise<PropertyInquiry | undefined>;
  createPropertyInquiry(inquiry: InsertPropertyInquiry): Promise<PropertyInquiry>;
  updatePropertyInquiry(id: string, updateData: Partial<Omit<PropertyInquiry, 'id' | 'createdAt'>>): Promise<PropertyInquiry | undefined>;

  // Escrow Transaction methods
  getEscrowTransactions(status?: string): Promise<EscrowTransaction[]>;
  getEscrowTransaction(id: string): Promise<EscrowTransaction | undefined>;
  createEscrowTransaction(tx: InsertEscrowTransaction): Promise<EscrowTransaction>;
  updateEscrowTransaction(id: string, updateData: Partial<EscrowTransaction>): Promise<EscrowTransaction | undefined>;
  getEscrowTransactionsByListing(listingId: string): Promise<EscrowTransaction[]>;
  getEscrowDashboardStats(): Promise<EscrowDashboardStats>;

  // Database seeding
  seedData?(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private resorts: Map<string, Resort>;
  private reviews: Map<string, Review>;
  private bookings: Map<string, Booking>;
  private listings: Map<string, Listing>;
  private escrowTransactions: Map<string, EscrowTransaction>;

  constructor() {
    this.users = new Map();
    this.resorts = new Map();
    this.reviews = new Map();
    this.bookings = new Map();
    this.listings = new Map();
    this.escrowTransactions = new Map();
    this.seedData().then(() => this.migrateUserData());
  }

  async seedData() {
    // Seed resort data
    const seedResorts: Resort[] = [
      {
        id: "1",
        name: "Marriott's Aruba Surf Club",
        location: "Palm Beach, Aruba",
        description: "Luxurious beachfront resort with world-class amenities",
        imageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&w=800&h=600",
        amenities: ["Beach Access", "Pool", "Spa", "Restaurant", "Fitness Center"],
        rating: "4.8",
        reviewCount: 1780,
        availableRentals: 1442,
        priceMin: 136,
        priceMax: 7143,
        isNewAvailability: false,
        destination: "Aruba",
        createdAt: new Date()
      },
      {
        id: "2", 
        name: "Marriott's Ko Olina Beach Club",
        location: "Kapolei, Hawaii",
        description: "Tropical paradise with oceanfront villas",
        imageUrl: "https://images.unsplash.com/photo-1571770095004-6b61b1cf308a?ixlib=rb-4.0.3&w=800&h=600",
        amenities: ["Beach Access", "Pool", "Tennis", "Golf", "Kids Club"],
        rating: "4.7",
        reviewCount: 1225,
        availableRentals: 1052,
        priceMin: 257,
        priceMax: 1921,
        isNewAvailability: false,
        destination: "Hawaii",
        createdAt: new Date()
      },
      {
        id: "3",
        name: "Westin Princeville Ocean Resort Villas",
        location: "Princeville, Hawaii",
        description: "Luxury beachfront resort with ocean views",
        imageUrl: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?ixlib=rb-4.0.3&w=800&h=600",
        amenities: ["Ocean View", "Pool", "Spa", "Restaurant"],
        rating: "4.6",
        reviewCount: 892,
        availableRentals: 324,
        priceMin: 200,
        priceMax: 1200,
        isNewAvailability: true,
        destination: "Hawaii",
        createdAt: new Date()
      },
      {
        id: "4",
        name: "Club Wyndham Austin",
        location: "Austin, Texas",
        description: "Modern downtown hotel with city skyline views",
        imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&w=800&h=600",
        amenities: ["City View", "Pool", "Fitness Center", "Restaurant"],
        rating: "4.3",
        reviewCount: 456,
        availableRentals: 234,
        priceMin: 125,
        priceMax: 400,
        isNewAvailability: true,
        destination: "Texas",
        createdAt: new Date()
      },
      {
        id: "5",
        name: "Club Wyndham Bonnet Creek Resort",
        location: "Lake Buena Vista, Florida",
        description: "Family-friendly resort near Disney World",
        imageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&w=800&h=600",
        amenities: ["Disney Shuttle", "Pool", "Kids Club", "Restaurant"],
        rating: "4.2",
        reviewCount: 187,
        availableRentals: 2158,
        priceMin: 47,
        priceMax: 800,
        isNewAvailability: false,
        destination: "Florida",
        createdAt: new Date()
      },
      {
        id: "6",
        name: "Marriott's Crystal Shores",
        location: "Marco Island, Florida",
        description: "Beachfront luxury with pristine white sand beaches",
        imageUrl: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?ixlib=rb-4.0.3&w=800&h=600",
        amenities: ["Beach Access", "Pool", "Spa", "Golf"],
        rating: "4.7",
        reviewCount: 763,
        availableRentals: 691,
        priceMin: 171,
        priceMax: 2050,
        isNewAvailability: true,
        destination: "Florida",
        createdAt: new Date()
      }
    ];

    seedResorts.forEach(resort => this.resorts.set(resort.id, resort));

    // Seed review data
    const seedReviews: Review[] = [
      {
        id: "1",
        resortId: "1",
        userId: "user1",
        rating: 5,
        title: "Amazing vacation experience",
        content: "LOVE Tailored Timeshare Solutions. We have rented units and also placed our units for rent. Each time every sale went through smoothly. Tailored Timeshare Solutions has helped improve our vacation experiences tremendously.",
        createdAt: new Date()
      },
      {
        id: "2",
        resortId: "2",
        userId: "user2",
        rating: 5,
        title: "Excellent service",
        content: "Efficient and effective customer service. Highly recommend. Tailored Timeshare Solutions handled every aspect of the rental, they made me very comfortable.",
        createdAt: new Date()
      },
      {
        id: "3",
        resortId: "3",
        userId: "user3",
        rating: 5,
        title: "Very easy to set up",
        content: "Very easy to set up! Everyone was very helpful and answered my questions in a timely manner. Great communication from Tailored Timeshare Solutions!",
        createdAt: new Date()
      }
    ];

    seedReviews.forEach(review => this.reviews.set(review.id, review));
  }

  private migrateUserData() {
    // Normalize existing user data to ensure case-insensitive lookups work
    const users = Array.from(this.users.values());
    users.forEach(user => {
      const normalizedUser = {
        ...user,
        email: user.email.toLowerCase().trim(),
        username: user.username.toLowerCase().trim()
      };
      this.users.set(user.id, normalizedUser);
    });
    console.log(`Migrated ${users.length} users to normalized format`);

    // Create test user for development
    if (process.env.NODE_ENV === 'development') {
      const testUser = {
        id: 'test-user-1',
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        createdAt: new Date()
      };
      this.users.set(testUser.id, testUser);
      console.log('Created test user: testuser / test@example.com');

      // Create admin user
      const adminUser = {
        id: 'admin-user-1',
        username: 'admin',
        email: 'admin@tailoredtimeshare.com',
        password: 'admin123',
        firstName: 'Site',
        lastName: 'Administrator',
        role: 'admin',
        createdAt: new Date()
      };
      this.users.set(adminUser.id, adminUser);
      console.log('Created admin user: admin / admin@tailoredtimeshare.com');

      // Create escrow vendor demo users
      const concordUser = {
        id: 'escrow-vendor-1',
        username: 'concord.title',
        email: 'escrow@concordtitle.net',
        password: 'Escrow2026!',
        firstName: 'Concord',
        lastName: 'Title',
        role: 'escrow_vendor',
        createdAt: new Date()
      };
      this.users.set(concordUser.id, concordUser);
      console.log('Created escrow vendor: concord.title / escrow@concordtitle.net');

      const firstAmUser = {
        id: 'escrow-vendor-2',
        username: 'firstam.escrow',
        email: 'escrow@firstam.com',
        password: 'Escrow2026!',
        firstName: 'First American',
        lastName: 'Title',
        role: 'escrow_vendor',
        createdAt: new Date()
      };
      this.users.set(firstAmUser.id, firstAmUser);
      console.log('Created escrow vendor: firstam.escrow / escrow@firstam.com');
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username.toLowerCase() === username.toLowerCase());
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email.toLowerCase() === email.toLowerCase());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      email: insertUser.email.toLowerCase().trim(),
      username: insertUser.username.toLowerCase().trim(),
      role: insertUser.role || 'user',
      id, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updateData: Partial<Omit<User, 'id' | 'createdAt' | 'password'>>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      return undefined;
    }

    const updatedUser: User = {
      ...existingUser,
      ...updateData,
      email: updateData.email ? updateData.email.toLowerCase().trim() : existingUser.email,
      username: updateData.username ? updateData.username.toLowerCase().trim() : existingUser.username,
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async getResorts(): Promise<Resort[]> {
    return Array.from(this.resorts.values());
  }

  async getResort(id: string): Promise<Resort | undefined> {
    return this.resorts.get(id);
  }

  async getResortsByDestination(destination: string): Promise<Resort[]> {
    return Array.from(this.resorts.values()).filter(resort => 
      resort.destination.toLowerCase().includes(destination.toLowerCase())
    );
  }

  async getNewAvailabilityResorts(): Promise<Resort[]> {
    return Array.from(this.resorts.values()).filter(resort => resort.isNewAvailability);
  }

  async getTopResorts(): Promise<Resort[]> {
    return Array.from(this.resorts.values())
      .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
      .slice(0, 12);
  }

  async createResort(insertResort: InsertResort): Promise<Resort> {
    const id = randomUUID();
    const resort: Resort = { 
      ...insertResort, 
      id, 
      reviewCount: 0, 
      availableRentals: insertResort.availableRentals || 0,
      isNewAvailability: insertResort.isNewAvailability || false,
      createdAt: new Date() 
    };
    this.resorts.set(id, resort);
    return resort;
  }

  async createResortsInBulk(insertResorts: InsertResort[]): Promise<Resort[]> {
    const createdResorts: Resort[] = [];
    for (const insertResort of insertResorts) {
      const resort = await this.createResort(insertResort);
      createdResorts.push(resort);
    }
    return createdResorts;
  }

  async updateResort(id: string, updateData: Partial<Omit<Resort, 'id'>>): Promise<Resort | undefined> {
    const existingResort = this.resorts.get(id);
    if (!existingResort) {
      return undefined;
    }

    const updatedResort: Resort = {
      ...existingResort,
      ...updateData,
    };

    this.resorts.set(id, updatedResort);
    return updatedResort;
  }

  async deleteResort(id: string): Promise<boolean> {
    return this.resorts.delete(id);
  }

  async searchResorts(query: string): Promise<Resort[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.resorts.values()).filter(resort =>
      resort.name.toLowerCase().includes(lowercaseQuery) ||
      resort.location.toLowerCase().includes(lowercaseQuery) ||
      resort.destination.toLowerCase().includes(lowercaseQuery)
    );
  }

  async getReviewsByResort(resortId: string): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter(review => review.resortId === resortId);
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const id = randomUUID();
    const review: Review = { ...insertReview, id, createdAt: new Date() };
    this.reviews.set(id, review);
    return review;
  }

  async getBookingsByUser(userId: string): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(booking => booking.userId === userId);
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = randomUUID();
    const booking: Booking = { ...insertBooking, id, status: "pending", createdAt: new Date() };
    this.bookings.set(id, booking);
    return booking;
  }

  async getListingsByOwner(ownerId: string): Promise<Listing[]> {
    return Array.from(this.listings.values()).filter(listing => listing.ownerId === ownerId);
  }

  async getListing(id: string): Promise<Listing | undefined> {
    return this.listings.get(id);
  }

  async createListing(insertListing: InsertListing): Promise<Listing> {
    const id = randomUUID();
    const listing: Listing = { 
      ...insertListing, 
      id, 
      isActive: true, 
      contractVerificationStatus: "pending",
      escrowStatus: "none",
      ownershipVerified: false,
      escrowAccountId: null,
      contractDocumentUrl: insertListing.contractDocumentUrl,
      createdAt: new Date() 
    };
    this.listings.set(id, listing);
    return listing;
  }

  async updateListing(id: string, updateData: Partial<Omit<Listing, 'id' | 'createdAt'>>): Promise<Listing | undefined> {
    const existingListing = this.listings.get(id);
    if (!existingListing) {
      return undefined;
    }

    const updatedListing: Listing = {
      ...existingListing,
      ...updateData,
    };

    this.listings.set(id, updatedListing);
    return updatedListing;
  }

  // Site Settings methods (stub implementations for MemStorage)
  async getSiteSetting(key: string): Promise<SiteSetting | undefined> {
    return undefined;
  }

  async getSiteSettingsByCategory(category: string): Promise<SiteSetting[]> {
    return [];
  }

  async getAllSiteSettings(): Promise<SiteSetting[]> {
    return [];
  }

  async setSiteSetting(setting: InsertSiteSetting): Promise<SiteSetting> {
    throw new Error("Site settings not supported in MemStorage");
  }

  async deleteSiteSetting(key: string): Promise<boolean> {
    return false;
  }

  // Escrow Transaction methods (stub implementations for MemStorage)
  async getEscrowTransactions(status?: string): Promise<EscrowTransaction[]> {
    const all = Array.from(this.escrowTransactions.values());
    const filtered = status ? all.filter(t => t.status === status) : all;
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getEscrowTransaction(id: string): Promise<EscrowTransaction | undefined> {
    return this.escrowTransactions.get(id);
  }

  async createEscrowTransaction(tx: InsertEscrowTransaction): Promise<EscrowTransaction> {
    const id = randomUUID();
    const defaultMilestones = [
      { label: "Escrow Initiated", completedAt: new Date().toISOString(), notes: "" },
      { label: "Documents Review", completedAt: null, notes: "" },
      { label: "Funds Received", completedAt: null, notes: "" },
      { label: "Closing Process", completedAt: null, notes: "" },
      { label: "Transaction Completed", completedAt: null, notes: "" },
    ];
    const escrowTx: EscrowTransaction = {
      ...tx,
      id,
      milestones: tx.milestones?.length ? tx.milestones : defaultMilestones,
      documents: tx.documents || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      closedAt: null,
    };
    this.escrowTransactions.set(id, escrowTx);
    return escrowTx;
  }

  async updateEscrowTransaction(id: string, updateData: Partial<EscrowTransaction>): Promise<EscrowTransaction | undefined> {
    const existing = this.escrowTransactions.get(id);
    if (!existing) return undefined;
    const updated: EscrowTransaction = {
      ...existing,
      ...updateData,
      updatedAt: new Date().toISOString(),
      closedAt: updateData.status === 'completed' ? new Date().toISOString() : existing.closedAt,
    };
    this.escrowTransactions.set(id, updated);
    return updated;
  }

  async getEscrowTransactionsByListing(listingId: string): Promise<EscrowTransaction[]> {
    return Array.from(this.escrowTransactions.values())
      .filter(t => t.listingId === listingId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getEscrowDashboardStats(): Promise<EscrowDashboardStats> {
    const all = Array.from(this.escrowTransactions.values());
    const active = all.filter(t => t.status !== 'completed');
    const completed = all.filter(t => t.status === 'completed');
    const now = new Date();
    const thisMonth = completed.filter(t => {
      if (!t.closedAt) return false;
      const d = new Date(t.closedAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const avgCloseDays = completed.length > 0
      ? completed.reduce((sum, t) => {
          const start = new Date(t.createdAt).getTime();
          const end = new Date(t.closedAt || t.updatedAt).getTime();
          return sum + (end - start) / (1000 * 60 * 60 * 24);
        }, 0) / completed.length
      : 0;

    const months: { month: string; count: number; volume: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthTxs = all.filter(t => {
        const td = new Date(t.createdAt);
        return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
      });
      months.push({ month: key, count: monthTxs.length, volume: monthTxs.reduce((s, t) => s + t.salePrice, 0) });
    }

    return {
      activeTransactions: active.length,
      totalFundsInEscrow: active.reduce((s, t) => s + t.salePrice, 0),
      completedThisMonth: thisMonth.length,
      averageCloseTimeDays: Math.round(avgCloseDays * 10) / 10,
      monthlyVolume: months,
      recentTransactions: all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    };
  }

  // Property Inquiry methods (stub implementations for MemStorage)
  async getPropertyInquiries(): Promise<PropertyInquiry[]> {
    return [];
  }

  async getPropertyInquiry(id: string): Promise<PropertyInquiry | undefined> {
    return undefined;
  }

  async createPropertyInquiry(inquiry: InsertPropertyInquiry): Promise<PropertyInquiry> {
    throw new Error("Property inquiries not supported in MemStorage");
  }

  async updatePropertyInquiry(id: string, updateData: Partial<Omit<PropertyInquiry, 'id' | 'createdAt'>>): Promise<PropertyInquiry | undefined> {
    return undefined;
  }
}

import { DatabaseStorage } from "./database-storage";

export const storage = new DatabaseStorage();

// Initialize database with seed data
(async () => {
  try {
    await storage.seedData?.();
  } catch (error) {
    console.error("Failed to seed database:", error);
  }
})();
