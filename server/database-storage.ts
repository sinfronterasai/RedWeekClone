import { ObjectId } from 'mongodb';
import { getDb } from "./db";
import {
  type User,
  type InsertUser,
  type Resort,
  type InsertResort,
  type Review,
  type InsertReview,
  type Booking,
  type InsertBooking,
  type Listing,
  type InsertListing,
  type SiteSetting,
  type InsertSiteSetting,
  type PropertyInquiry,
  type InsertPropertyInquiry,
  type EscrowTransaction,
  type InsertEscrowTransaction,
  type EscrowDashboardStats
} from "@shared/schema";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const db = await getDb();
    // Try ObjectId first, then fall back to string _id or id field
    let user = null;
    try {
      user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    } catch (error) {
      // Not a valid ObjectId, try as string
    }
    if (!user) {
      user = await db.collection('users').findOne({ 
        $or: [
          { _id: id },
          { id: id }
        ]
      });
    }
    if (!user) return undefined;
    return this.mapUserFromDb(user);
  }

  async getUsers(): Promise<User[]> {
    const db = await getDb();
    const users = await db.collection('users').find({}).toArray();
    return users.map(u => this.mapUserFromDb(u as any));
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const db = await getDb();
    const user = await db.collection('users').findOne({ username: username.toLowerCase() });
    if (!user) return undefined;
    return this.mapUserFromDb(user as any);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const db = await getDb();
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (!user) return undefined;
    return this.mapUserFromDb(user as any);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const db = await getDb();
    const userData = {
      ...insertUser,
      email: insertUser.email.toLowerCase().trim(),
      username: insertUser.username.toLowerCase().trim(),
      role: insertUser.role || 'user',
      createdAt: new Date(),
    };

    const result = await db.collection('users').insertOne(userData);
    return {
      ...userData,
      id: result.insertedId.toString(),
    };
  }

  async updateUser(id: string, updateData: Partial<Omit<User, 'id' | 'createdAt' | 'password'>>): Promise<User | undefined> {
    const db = await getDb();
    const update: any = { ...updateData };
    
    if (updateData.email) {
      update.email = updateData.email.toLowerCase().trim();
    }
    if (updateData.username) {
      update.username = updateData.username.toLowerCase().trim();
    }

    const result = await db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: 'after' }
    );

    if (!result) return undefined;
    return this.mapUserFromDb(result as any);
  }

  async deleteUser(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  // Resort methods
  async getResorts(): Promise<Resort[]> {
    const db = await getDb();
    const resorts = await db.collection('resorts').find({}).sort({ createdAt: -1 }).toArray();
    return resorts.map(r => this.mapResortFromDb(r as any));
  }

  async getResort(id: string): Promise<Resort | undefined> {
    const db = await getDb();
    const resort = await db.collection('resorts').findOne({ _id: new ObjectId(id) });
    if (!resort) return undefined;
    return this.mapResortFromDb(resort as any);
  }

  async getResortsByDestination(destination: string): Promise<Resort[]> {
    const db = await getDb();
    const resorts = await db.collection('resorts').find({
      destination: { $regex: destination, $options: 'i' }
    }).sort({ rating: -1 }).toArray();
    return resorts.map(r => this.mapResortFromDb(r as any));
  }

  async getNewAvailabilityResorts(): Promise<Resort[]> {
    const db = await getDb();
    const resorts = await db.collection('resorts').find({
      isNewAvailability: true
    }).sort({ createdAt: -1 }).toArray();
    return resorts.map(r => this.mapResortFromDb(r as any));
  }

  async getTopResorts(): Promise<Resort[]> {
    const db = await getDb();
    const resorts = await db.collection('resorts').find({})
      .sort({ rating: -1 })
      .limit(12)
      .toArray();
    return resorts.map(r => this.mapResortFromDb(r as any));
  }

  async searchResorts(query: string): Promise<Resort[]> {
    const db = await getDb();
    const searchRegex = { $regex: query, $options: 'i' };
    const resorts = await db.collection('resorts').find({
      $or: [
        { name: searchRegex },
        { location: searchRegex },
        { destination: searchRegex }
      ]
    }).sort({ rating: -1 }).toArray();
    return resorts.map(r => this.mapResortFromDb(r as any));
  }

  async createResort(insertResort: InsertResort): Promise<Resort> {
    const db = await getDb();
    const resortData = {
      ...insertResort,
      reviewCount: 0,
      availableRentals: insertResort.availableRentals || 0,
      isNewAvailability: insertResort.isNewAvailability || false,
      createdAt: new Date(),
    };

    const result = await db.collection('resorts').insertOne(resortData);
    return {
      ...resortData,
      id: result.insertedId.toString(),
    };
  }

  async createResortsInBulk(insertResorts: InsertResort[]): Promise<Resort[]> {
    const db = await getDb();
    const resortsData = insertResorts.map(insertResort => ({
      ...insertResort,
      reviewCount: 0,
      availableRentals: insertResort.availableRentals || 0,
      isNewAvailability: insertResort.isNewAvailability || false,
      createdAt: new Date(),
    }));

    const result = await db.collection('resorts').insertMany(resortsData);
    const insertedIds = Object.values(result.insertedIds);
    
    return resortsData.map((resort, index) => ({
      ...resort,
      id: insertedIds[index].toString(),
    }));
  }

  async updateResort(id: string, updateData: Partial<Omit<Resort, 'id'>>): Promise<Resort | undefined> {
    const db = await getDb();
    const result = await db.collection('resorts').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) return undefined;
    return this.mapResortFromDb(result as any);
  }

  async deleteResort(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.collection('resorts').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  // Review methods
  async getReviewsByResort(resortId: string): Promise<Review[]> {
    const db = await getDb();
    // Reviews store resortId as string, so we can query directly
    // But we also need to handle cases where it might be stored as ObjectId
    let query: any = { resortId: resortId };
    
    // Try to add ObjectId query if resortId is a valid ObjectId string
    try {
      const objectId = new ObjectId(resortId);
      query = {
        $or: [
          { resortId: resortId },
          { resortId: objectId }
        ]
      };
    } catch {
      // Not a valid ObjectId, just use string query
      query = { resortId: resortId };
    }
    
    const reviews = await db.collection('reviews').find(query).sort({ createdAt: -1 }).toArray();
    return reviews.map(r => this.mapReviewFromDb(r as any));
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const db = await getDb();
    const reviewData = {
      ...insertReview,
      createdAt: new Date(),
    };

    const result = await db.collection('reviews').insertOne(reviewData);
    
    // Update resort review count - try ObjectId first, then string
    let resortQuery: any;
    try {
      // Try as ObjectId if it's a valid ObjectId string
      resortQuery = { _id: new ObjectId(insertReview.resortId) };
    } catch {
      // If not a valid ObjectId, find the resort by its string ID field
      const resort = await db.collection('resorts').findOne({ 
        $or: [
          { _id: insertReview.resortId as any },
          { id: insertReview.resortId }
        ]
      });
      if (resort) {
        resortQuery = { _id: resort._id };
      } else {
        // If still not found, use the string directly (might be a custom ID)
        resortQuery = { _id: insertReview.resortId as any };
      }
    }
    
    await db.collection('resorts').updateOne(
      resortQuery,
      { $inc: { reviewCount: 1 } }
    );

    return {
      ...reviewData,
      id: result.insertedId.toString(),
    };
  }

  // Booking methods
  async getBookingsByUser(userId: string): Promise<Booking[]> {
    const db = await getDb();
    const bookings = await db.collection('bookings').find({
      userId: userId
    }).sort({ createdAt: -1 }).toArray();
    return bookings.map(b => this.mapBookingFromDb(b as any));
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const db = await getDb();
    const bookingData = {
      ...insertBooking,
      status: "pending",
      createdAt: new Date(),
    };

    const result = await db.collection('bookings').insertOne(bookingData);
    return {
      ...bookingData,
      id: result.insertedId.toString(),
    };
  }

  // Listing methods
  async getListingsByOwner(ownerId: string): Promise<Listing[]> {
    const db = await getDb();
    const listings = await db.collection('listings').find({
      ownerId: ownerId
    }).sort({ createdAt: -1 }).toArray();
    return listings.map(l => this.mapListingFromDb(l as any));
  }

  async getListing(id: string): Promise<Listing | undefined> {
    const db = await getDb();
    const listing = await db.collection('listings').findOne({ _id: new ObjectId(id) });
    if (!listing) return undefined;
    return this.mapListingFromDb(listing as any);
  }

  async createListing(insertListing: InsertListing): Promise<Listing> {
    const db = await getDb();
    const listingData = {
      ...insertListing,
      isActive: true,
      contractVerificationStatus: "pending",
      escrowStatus: "none",
      ownershipVerified: false,
      escrowAccountId: null,
      createdAt: new Date(),
    };

    const result = await db.collection('listings').insertOne(listingData);
    return {
      ...listingData,
      id: result.insertedId.toString(),
      escrowAccountId: null,
    };
  }

  async updateListing(id: string, updateData: Partial<Omit<Listing, 'id' | 'createdAt'>>): Promise<Listing | undefined> {
    const db = await getDb();
    const result = await db.collection('listings').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) return undefined;
    return this.mapListingFromDb(result as any);
  }

  // Site Settings methods
  async getSiteSetting(key: string): Promise<SiteSetting | undefined> {
    const db = await getDb();
    const setting = await db.collection('siteSettings').findOne({ key });
    if (!setting) return undefined;
    return this.mapSiteSettingFromDb(setting as any);
  }

  async getSiteSettingsByCategory(category: string): Promise<SiteSetting[]> {
    const db = await getDb();
    const settings = await db.collection('siteSettings').find({
      category
    }).sort({ key: 1 }).toArray();
    return settings.map(s => this.mapSiteSettingFromDb(s as any));
  }

  async getAllSiteSettings(): Promise<SiteSetting[]> {
    const db = await getDb();
    const settings = await db.collection('siteSettings').find({})
      .sort({ category: 1, key: 1 })
      .toArray();
    return settings.map(s => this.mapSiteSettingFromDb(s as any));
  }

  async setSiteSetting(insertSetting: InsertSiteSetting): Promise<SiteSetting> {
    const db = await getDb();
    const settingData = {
      ...insertSetting,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('siteSettings').findOneAndUpdate(
      { key: insertSetting.key },
      {
        $set: {
          value: insertSetting.value,
          category: insertSetting.category,
          description: insertSetting.description,
          isEncrypted: insertSetting.isEncrypted,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        }
      },
      { upsert: true, returnDocument: 'after' }
    );

    return this.mapSiteSettingFromDb(result as any);
  }

  async deleteSiteSetting(key: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.collection('siteSettings').deleteOne({ key });
    return result.deletedCount > 0;
  }

  // Property Inquiry methods
  async getPropertyInquiries(): Promise<PropertyInquiry[]> {
    const db = await getDb();
    const inquiries = await db.collection('propertyInquiries').find({})
      .sort({ createdAt: -1 })
      .toArray();
    return inquiries.map(i => this.mapPropertyInquiryFromDb(i as any));
  }

  async getPropertyInquiry(id: string): Promise<PropertyInquiry | undefined> {
    const db = await getDb();
    const inquiry = await db.collection('propertyInquiries').findOne({ _id: new ObjectId(id) });
    if (!inquiry) return undefined;
    return this.mapPropertyInquiryFromDb(inquiry as any);
  }

  async createPropertyInquiry(insertInquiry: InsertPropertyInquiry): Promise<PropertyInquiry> {
    const db = await getDb();
    const inquiryData = {
      ...insertInquiry,
      status: "new",
      createdAt: new Date(),
    };

    const result = await db.collection('propertyInquiries').insertOne(inquiryData);
    return {
      ...inquiryData,
      id: result.insertedId.toString(),
    };
  }

  async updatePropertyInquiry(id: string, updateData: Partial<Omit<PropertyInquiry, 'id' | 'createdAt'>>): Promise<PropertyInquiry | undefined> {
    const db = await getDb();
    const result = await db.collection('propertyInquiries').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) return undefined;
    return this.mapPropertyInquiryFromDb(result as any);
  }

  // Escrow Transaction methods
  private mapEscrowFromDb(doc: any): EscrowTransaction {
    return {
      id: doc._id?.toString() || doc.id,
      listingId: doc.listingId,
      propertyName: doc.propertyName,
      buyerName: doc.buyerName,
      buyerEmail: doc.buyerEmail,
      sellerName: doc.sellerName,
      sellerEmail: doc.sellerEmail,
      salePrice: doc.salePrice,
      escrowFee: doc.escrowFee,
      status: doc.status,
      milestones: doc.milestones || [],
      documents: doc.documents || [],
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
      closedAt: doc.closedAt instanceof Date ? doc.closedAt.toISOString() : doc.closedAt || null,
    };
  }

  async getEscrowTransactions(status?: string): Promise<EscrowTransaction[]> {
    const db = await getDb();
    const filter: any = {};
    if (status) filter.status = status;
    const docs = await db.collection('escrow_transactions')
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(d => this.mapEscrowFromDb(d));
  }

  async getEscrowTransaction(id: string): Promise<EscrowTransaction | undefined> {
    const db = await getDb();
    let doc = null;
    try {
      doc = await db.collection('escrow_transactions').findOne({ _id: new ObjectId(id) });
    } catch (e) { /* not a valid ObjectId */ }
    if (!doc) {
      doc = await db.collection('escrow_transactions').findOne({
        $or: [{ _id: id }, { id: id }]
      });
    }
    if (!doc) return undefined;
    return this.mapEscrowFromDb(doc);
  }

  async createEscrowTransaction(tx: InsertEscrowTransaction): Promise<EscrowTransaction> {
    const db = await getDb();
    const defaultMilestones = [
      { label: "Escrow Initiated", completedAt: new Date().toISOString(), notes: "" },
      { label: "Documents Review", completedAt: null, notes: "" },
      { label: "Funds Received", completedAt: null, notes: "" },
      { label: "Closing Process", completedAt: null, notes: "" },
      { label: "Transaction Completed", completedAt: null, notes: "" },
    ];
    const doc = {
      ...tx,
      milestones: tx.milestones?.length ? tx.milestones : defaultMilestones,
      documents: tx.documents || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      closedAt: null,
    };
    const result = await db.collection('escrow_transactions').insertOne(doc);
    return {
      ...tx,
      id: result.insertedId.toString(),
      milestones: doc.milestones,
      documents: doc.documents,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      closedAt: null,
    };
  }

  async updateEscrowTransaction(id: string, updateData: Partial<EscrowTransaction>): Promise<EscrowTransaction | undefined> {
    const db = await getDb();
    const setFields: any = { ...updateData, updatedAt: new Date() };
    if (updateData.status === 'completed') {
      setFields.closedAt = new Date();
    }
    // Remove id from updateData if present
    delete setFields.id;
    delete setFields.createdAt;

    let result = null;
    try {
      result = await db.collection('escrow_transactions').findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: setFields },
        { returnDocument: 'after' }
      );
    } catch (e) {
      result = await db.collection('escrow_transactions').findOneAndUpdate(
        { $or: [{ _id: id }, { id: id }] },
        { $set: setFields },
        { returnDocument: 'after' }
      );
    }
    if (!result) return undefined;
    return this.mapEscrowFromDb(result);
  }

  async getEscrowTransactionsByListing(listingId: string): Promise<EscrowTransaction[]> {
    const db = await getDb();
    const docs = await db.collection('escrow_transactions')
      .find({ listingId })
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(d => this.mapEscrowFromDb(d));
  }

  async getEscrowDashboardStats(): Promise<EscrowDashboardStats> {
    const db = await getDb();
    const all = await db.collection('escrow_transactions').find({}).toArray();
    const active = all.filter(t => t.status !== 'completed');
    const completed = all.filter(t => t.status === 'completed');
    const now = new Date();
    const thisMonth = completed.filter(t => {
      if (!t.closedAt) return false;
      const d = t.closedAt instanceof Date ? t.closedAt : new Date(t.closedAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const avgCloseDays = completed.length > 0
      ? completed.reduce((sum, t) => {
          const start = t.createdAt instanceof Date ? t.createdAt.getTime() : new Date(t.createdAt).getTime();
          const end = t.closedAt instanceof Date ? t.closedAt.getTime() : new Date(t.closedAt || t.updatedAt).getTime();
          return sum + (end - start) / (1000 * 60 * 60 * 24);
        }, 0) / completed.length
      : 0;

    const months: { month: string; count: number; volume: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthTxs = all.filter(t => {
        const td = t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt);
        return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
      });
      months.push({ month: key, count: monthTxs.length, volume: monthTxs.reduce((s: number, t: any) => s + t.salePrice, 0) });
    }

    const sorted = all.sort((a, b) => {
      const da = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
      const db_ = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
      return db_ - da;
    });

    return {
      activeTransactions: active.length,
      totalFundsInEscrow: active.reduce((s, t) => s + t.salePrice, 0),
      completedThisMonth: thisMonth.length,
      averageCloseTimeDays: Math.round(avgCloseDays * 10) / 10,
      monthlyVolume: months,
      recentTransactions: sorted.slice(0, 5).map(d => this.mapEscrowFromDb(d)),
    };
  }

  // Seed data for initial setup
  async seedData(): Promise<void> {
    const db = await getDb();
    
    // Check if data already exists
    const existingResorts = await db.collection('resorts').countDocuments();
    if (existingResorts > 0) {
      console.log("Database already seeded, skipping seed data");
      return;
    }

    console.log("Seeding database with initial data...");

    // Seed resort data
    const seedResorts: InsertResort[] = [
      {
        name: "Marriott's Aruba Surf Club",
        location: "Palm Beach, Aruba",
        description: "Luxurious beachfront resort with world-class amenities",
        imageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&w=800&h=600",
        amenities: ["Beach Access", "Pool", "Spa", "Restaurant", "Fitness Center"],
        rating: "4.8",
        availableRentals: 1442,
        priceMin: 136,
        priceMax: 7143,
        isNewAvailability: false,
        destination: "Aruba"
      },
      {
        name: "Marriott's Ko Olina Beach Club",
        location: "Kapolei, Hawaii",
        description: "Tropical paradise with oceanfront villas",
        imageUrl: "https://images.unsplash.com/photo-1571770095004-6b61b1cf308a?ixlib=rb-4.0.3&w=800&h=600",
        amenities: ["Beach Access", "Pool", "Tennis", "Golf", "Kids Club"],
        rating: "4.7",
        availableRentals: 1052,
        priceMin: 257,
        priceMax: 1921,
        isNewAvailability: false,
        destination: "Hawaii"
      },
      {
        name: "Westin Princeville Ocean Resort Villas",
        location: "Princeville, Hawaii",
        description: "Luxury beachfront resort with ocean views",
        imageUrl: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?ixlib=rb-4.0.3&w=800&h=600",
        amenities: ["Ocean View", "Pool", "Spa", "Restaurant"],
        rating: "4.6",
        availableRentals: 324,
        priceMin: 200,
        priceMax: 1200,
        isNewAvailability: true,
        destination: "Hawaii"
      },
      {
        name: "Club Wyndham Austin",
        location: "Austin, Texas", 
        description: "Modern downtown hotel with city skyline views",
        imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&w=800&h=600",
        amenities: ["City View", "Pool", "Fitness Center", "Restaurant"],
        rating: "4.3",
        availableRentals: 234,
        priceMin: 125,
        priceMax: 400,
        isNewAvailability: true,
        destination: "Texas"
      },
      {
        name: "Club Wyndham Bonnet Creek Resort",
        location: "Lake Buena Vista, Florida",
        description: "Family-friendly resort near Disney World",
        imageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&w=800&h=600",
        amenities: ["Disney Shuttle", "Pool", "Kids Club", "Restaurant"],
        rating: "4.2",
        availableRentals: 2158,
        priceMin: 47,
        priceMax: 800,
        isNewAvailability: false,
        destination: "Florida"
      },
      {
        name: "Marriott's Crystal Shores",
        location: "Marco Island, Florida",
        description: "Beachfront luxury with pristine white sand beaches",
        imageUrl: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?ixlib=rb-4.0.3&w=800&h=600",
        amenities: ["Beach Access", "Pool", "Spa", "Golf"],
        rating: "4.7",
        availableRentals: 691,
        priceMin: 171,
        priceMax: 2050,
        isNewAvailability: true,
        destination: "Florida"
      }
    ];

    const createdResorts = await this.createResortsInBulk(seedResorts);
    console.log(`Created ${createdResorts.length} resorts`);

    // Create test users if in development
    if (process.env.NODE_ENV === 'development') {
      try {
        await this.createUser({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          role: 'user'
        });
        console.log('Created test user: testuser / test@example.com');

        await this.createUser({
          username: 'admin',
          email: 'admin@tailoredtimeshare.com',
          password: 'admin123',
          firstName: 'Site',
          lastName: 'Administrator',
          role: 'admin'
        });
        console.log('Created admin user: admin / admin@tailoredtimeshare.com');

        await this.createUser({
          username: 'concord.title',
          email: 'escrow@concordtitle.net',
          password: 'Escrow2026!',
          firstName: 'Concord',
          lastName: 'Title',
          role: 'escrow_vendor'
        });
        console.log('Created escrow vendor: concord.title / escrow@concordtitle.net');

        await this.createUser({
          username: 'firstam.escrow',
          email: 'escrow@firstam.com',
          password: 'Escrow2026!',
          firstName: 'First American',
          lastName: 'Title',
          role: 'escrow_vendor'
        });
        console.log('Created escrow vendor: firstam.escrow / escrow@firstam.com');
      } catch (error) {
        console.log('Test users may already exist, skipping creation');
      }
    }

    // Seed some sample reviews
    if (createdResorts.length > 0) {
      const sampleReviews: InsertReview[] = [
        {
          resortId: createdResorts[0].id,
          userId: "sample-user-1",
          rating: 5,
          title: "Amazing vacation experience",
          content: "LOVE Tailored Timeshare Solutions. We have rented units and also placed our units for rent. Each time every sale went through smoothly."
        },
        {
          resortId: createdResorts[1].id,
          userId: "sample-user-2",
          rating: 5,
          title: "Excellent service",
          content: "Efficient and effective customer service. Highly recommend. Tailored Timeshare Solutions handled every aspect of the rental."
        }
      ];

      for (const review of sampleReviews) {
        try {
          await this.createReview(review);
        } catch (error) {
          console.log('Sample reviews may have issues, continuing...');
        }
      }
    }

    // Seed site settings (SMTP configuration)
    await this.seedSiteSettings();

    console.log("Database seeding completed!");
  }

  private async seedSiteSettings(): Promise<void> {
    const db = await getDb();
    
    // Check if SMTP settings already exist
    const existingSmtpSettings = await db.collection('siteSettings').countDocuments({
      category: 'smtp'
    });
    
    if (existingSmtpSettings > 0) {
      console.log("SMTP settings already exist, skipping site settings seed");
      return;
    }

    console.log("Seeding SMTP site settings...");

    const smtpSettings = [
      {
        key: 'smtp_host',
        value: 'mail.tailoredtimesharesolutions.com',
        category: 'smtp',
        description: 'SMTP Server Host (e.g., smtp.gmail.com)',
        isEncrypted: false
      },
      {
        key: 'smtp_port',
        value: '465',
        category: 'smtp', 
        description: 'SMTP Server Port',
        isEncrypted: false
      },
      {
        key: 'smtp_username',
        value: 'sales@tailoredtimesharesolutions.com',
        category: 'smtp',
        description: 'SMTP Username/Email', 
        isEncrypted: false
      },
      {
        key: 'smtp_password',
        value: 'v8@Gn15AeQZ6mWsG',
        category: 'smtp',
        description: 'SMTP Password',
        isEncrypted: true
      },
      {
        key: 'smtp_from_email',
        value: 'sales@tailoredtimesharesolutions.com',
        category: 'smtp',
        description: 'From Email Address',
        isEncrypted: false
      },
      {
        key: 'smtp_from_name', 
        value: 'Tailored Timeshare Solutions',
        category: 'smtp',
        description: 'From Name for emails',
        isEncrypted: false
      }
    ];

    await db.collection('siteSettings').insertMany(smtpSettings.map(s => ({
      ...s,
      createdAt: new Date(),
      updatedAt: new Date(),
    })));
    console.log(`Seeded ${smtpSettings.length} SMTP settings`);
  }

  // Helper methods to map MongoDB documents to our types
  private mapUserFromDb(doc: any): User {
    // Handle both ObjectId and string _id values
    // Also check for id field as fallback (for imported data)
    const id = doc._id ? (typeof doc._id === 'string' ? doc._id : doc._id.toString()) : (doc.id || '');
    
    return {
      id,
      username: doc.username,
      email: doc.email,
      password: doc.password,
      firstName: doc.firstName,
      lastName: doc.lastName,
      role: doc.role,
      createdAt: doc.createdAt,
    };
  }

  private mapResortFromDb(doc: any): Resort {
    return {
      id: doc._id.toString(),
      name: doc.name,
      location: doc.location,
      description: doc.description,
      imageUrl: doc.imageUrl,
      amenities: doc.amenities,
      rating: doc.rating,
      reviewCount: doc.reviewCount || 0,
      availableRentals: doc.availableRentals,
      priceMin: doc.priceMin,
      priceMax: doc.priceMax,
      isNewAvailability: doc.isNewAvailability,
      destination: doc.destination,
      createdAt: doc.createdAt,
    };
  }

  private mapReviewFromDb(doc: any): Review {
    return {
      id: doc._id.toString(),
      resortId: doc.resortId,
      userId: doc.userId,
      rating: doc.rating,
      title: doc.title,
      content: doc.content,
      createdAt: doc.createdAt,
    };
  }

  private mapBookingFromDb(doc: any): Booking {
    return {
      id: doc._id.toString(),
      resortId: doc.resortId,
      userId: doc.userId,
      checkIn: doc.checkIn,
      checkOut: doc.checkOut,
      guests: doc.guests,
      totalPrice: doc.totalPrice,
      status: doc.status,
      createdAt: doc.createdAt,
    };
  }

  private mapListingFromDb(doc: any): Listing {
    return {
      id: doc._id.toString(),
      resortId: doc.resortId,
      ownerId: doc.ownerId,
      title: doc.title,
      description: doc.description,
      pricePerNight: doc.pricePerNight,
      availableFrom: doc.availableFrom,
      availableTo: doc.availableTo,
      maxGuests: doc.maxGuests,
      isActive: doc.isActive,
      contractDocumentUrl: doc.contractDocumentUrl ?? undefined,
      contractVerificationStatus: doc.contractVerificationStatus,
      escrowStatus: doc.escrowStatus,
      ownershipVerified: doc.ownershipVerified,
      escrowAccountId: doc.escrowAccountId || null,
      salePrice: doc.salePrice,
      isForSale: doc.isForSale,
      createdAt: doc.createdAt,
    };
  }

  private mapSiteSettingFromDb(doc: any): SiteSetting {
    return {
      id: doc._id.toString(),
      key: doc.key,
      value: doc.value,
      category: doc.category,
      description: doc.description,
      isEncrypted: doc.isEncrypted,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private mapPropertyInquiryFromDb(doc: any): PropertyInquiry {
    return {
      id: doc._id.toString(),
      firstName: doc.firstName,
      lastName: doc.lastName,
      email: doc.email,
      phone: doc.phone,
      propertyName: doc.propertyName,
      location: doc.location,
      ownershipType: doc.ownershipType,
      weekNumbers: doc.weekNumbers,
      askingPrice: doc.askingPrice,
      motivation: doc.motivation,
      additionalInfo: doc.additionalInfo,
      status: doc.status,
      createdAt: doc.createdAt,
    };
  }
}
