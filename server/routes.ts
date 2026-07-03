import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertReviewSchema,
  insertBookingSchema,
  insertListingSchema,
  insertResortSchema,
  insertSiteSettingSchema,
  insertPropertyInquirySchema,
  insertEscrowTransactionSchema,
  type EscrowTransaction
} from "@shared/schema";
import { inventoryService } from "./inventory-service";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { authenticateUser, requireAdmin, requireAuth, requireEscrowVendor } from "./middleware";
import { z } from "zod";
import nodemailer from "nodemailer";

export async function registerRoutes(app: Express): Promise<Server> {
  // Resort routes
  app.get("/api/resorts", async (req, res) => {
    try {
      const resorts = await storage.getResorts();
      res.json(resorts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch resorts" });
    }
  });

  // Inventory sync routes
  app.get("/api/inventory/providers", async (req, res) => {
    try {
      const providers = inventoryService.getProviders();
      res.json({ providers });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch providers" });
    }
  });

  app.post("/api/inventory/sync/:provider", async (req, res) => {
    try {
      const { provider } = req.params;
      const { filters } = req.body;
      
      const result = await inventoryService.syncInventory(
        provider,
        filters,
        async (resorts) => await storage.createResortsInBulk(resorts)
      );
      
      res.json(result);
    } catch (error) {
      console.error("Inventory sync error:", error);
      res.status(500).json({ 
        message: "Inventory sync failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/inventory/history", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const history = inventoryService.getSyncHistory(limit);
      res.json({ history });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sync history" });
    }
  });

  app.post("/api/inventory/preview/:provider", async (req, res) => {
    try {
      const { provider } = req.params;
      const { filters } = req.body;
      
      const result = await inventoryService.syncInventory(provider, filters);
      
      res.json({
        ...result,
        preview: true,
        message: "Preview only - no data was saved"
      });
    } catch (error) {
      console.error("Inventory preview error:", error);
      res.status(500).json({ 
        message: "Inventory preview failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/resorts/new-availability", async (req, res) => {
    try {
      const resorts = await storage.getNewAvailabilityResorts();
      res.json(resorts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch new availability resorts" });
    }
  });

  app.get("/api/resorts/top", async (req, res) => {
    try {
      const resorts = await storage.getTopResorts();
      res.json(resorts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch top resorts" });
    }
  });

  app.get("/api/resorts/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Search query is required" });
      }
      const resorts = await storage.searchResorts(q);
      res.json(resorts);
    } catch (error) {
      res.status(500).json({ message: "Failed to search resorts" });
    }
  });

  app.get("/api/resorts/destination/:destination", async (req, res) => {
    try {
      const { destination } = req.params;
      const resorts = await storage.getResortsByDestination(destination);
      res.json(resorts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch resorts by destination" });
    }
  });

  app.get("/api/resorts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const resort = await storage.getResort(id);
      if (!resort) {
        return res.status(404).json({ message: "Resort not found" });
      }
      res.json(resort);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch resort" });
    }
  });

  // Review routes
  app.get("/api/resorts/:id/reviews", async (req, res) => {
    try {
      const { id } = req.params;
      const reviews = await storage.getReviewsByResort(id);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.post("/api/reviews", async (req, res) => {
    try {
      const validatedData = insertReviewSchema.parse(req.body);
      const review = await storage.createReview(validatedData);
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid review data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  // Get current user endpoint
  app.get("/api/users/me", authenticateUser, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      res.json(req.user);
    } catch (error) {
      res.status(500).json({ message: "Failed to get current user" });
    }
  });

  // Logout endpoint
  app.post("/api/users/logout", async (req, res) => {
    try {
      // Clear session
      if ((req as any).session) {
        (req as any).session.userId = null;
      }
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to logout" });
    }
  });

  // Update user profile (authenticated users can update their own profile)
  app.patch("/api/users/:id", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Only allow users to update their own profile
      if (req.user?.id !== id) {
        return res.status(403).json({ message: "Forbidden: You can only update your own profile" });
      }

      // Validate the update data
      const allowedFields = ['firstName', 'lastName', 'username', 'email'];
      const updateData = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key];
          return obj;
        }, {} as any);

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      // Check if username or email already exists (if being updated)
      if (updateData.username) {
        const existingUser = await storage.getUserByUsername(updateData.username);
        if (existingUser && existingUser.id !== id) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }

      if (updateData.email) {
        const existingUser = await storage.getUserByEmail(updateData.email);
        if (existingUser && existingUser.id !== id) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }

      // Update the user
      const updatedUser = await storage.updateUser(id, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return updated user (without password)
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  // Admin routes - now protected with authentication
  app.get("/api/admin/users", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      // Remove passwords from response
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  // Update user (admin only)
  app.patch("/api/admin/users/:id", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Validate the update data
      const validatedData = insertUserSchema.omit({ password: true }).parse(updateData);
      
      const updatedUser = await storage.updateUser(id, validatedData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user (admin only)
  app.delete("/api/admin/users/:id", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Resort admin routes
  app.post("/api/admin/resorts", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const resortData = insertResortSchema.parse(req.body);
      const newResort = await storage.createResort(resortData);
      res.json(newResort);
    } catch (error) {
      console.error("Create resort error:", error);
      res.status(500).json({ message: "Failed to create resort" });
    }
  });

  app.patch("/api/admin/resorts/:id", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const validatedData = insertResortSchema.parse(updateData);
      const updatedResort = await storage.updateResort(id, validatedData);
      
      if (!updatedResort) {
        return res.status(404).json({ message: "Resort not found" });
      }
      
      res.json(updatedResort);
    } catch (error) {
      console.error("Update resort error:", error);
      res.status(500).json({ message: "Failed to update resort" });
    }
  });

  app.delete("/api/admin/resorts/:id", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const success = await storage.deleteResort(id);
      if (!success) {
        return res.status(404).json({ message: "Resort not found" });
      }
      
      res.json({ message: "Resort deleted successfully" });
    } catch (error) {
      console.error("Delete resort error:", error);
      res.status(500).json({ message: "Failed to delete resort" });
    }
  });

  // User routes
  app.post("/api/users/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists by email or username
      const existingUserByEmail = await storage.getUserByEmail(validatedData.email);
      if (existingUserByEmail) {
        return res.status(409).json({ message: "User with this email already exists" });
      }
      
      const existingUserByUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUserByUsername) {
        return res.status(409).json({ message: "User with this username already exists" });
      }

      const user = await storage.createUser(validatedData);
      // Don't return password
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.post("/api/users/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email/Username and password are required" });
      }

      // Trim whitespace from email/username and password
      const trimmedIdentifier = email.trim().toLowerCase();
      const trimmedPassword = password.trim();

      // Try to find user by email first, then by username
      let user = await storage.getUserByEmail(trimmedIdentifier);
      if (!user) {
        user = await storage.getUserByUsername(trimmedIdentifier);
      }

      if (!user) {
        console.log(`Login failed: User not found for identifier: ${trimmedIdentifier}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (user.password !== trimmedPassword) {
        console.log(`Login failed: Password mismatch for user: ${user.email}`);
        console.log(`Expected: "${user.password}", Received: "${trimmedPassword}"`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log(`Login successful for: ${user.email} (username: ${user.username})`);
      
      // Store user ID in session
      (req as any).session = (req as any).session || {};
      (req as any).session.userId = user.id;
      
      // Don't return password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Booking routes
  app.post("/api/bookings", async (req, res) => {
    try {
      const validatedData = insertBookingSchema.parse(req.body);
      const booking = await storage.createBooking(validatedData);
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.get("/api/users/:id/bookings", async (req, res) => {
    try {
      const { id } = req.params;
      const bookings = await storage.getBookingsByUser(id);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Listing routes
  app.post("/api/listings", async (req, res) => {
    try {
      const validatedData = insertListingSchema.parse(req.body);
      const listing = await storage.createListing(validatedData);
      res.status(201).json(listing);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid listing data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create listing" });
    }
  });

  app.get("/api/users/:id/listings", async (req, res) => {
    try {
      const { id } = req.params;
      const listings = await storage.getListingsByOwner(id);
      res.json(listings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch listings" });
    }
  });

  // Contract upload routes
  app.post("/api/contracts/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ message: "Failed to generate upload URL" });
    }
  });

  app.get("/contracts/:contractPath(*)", async (req, res) => {
    try {
      const contractPath = req.params.contractPath;
      const objectStorageService = new ObjectStorageService();
      const fileUrl = await objectStorageService.getObjectEntityFile(`/contracts/${contractPath}`);
      await objectStorageService.downloadObject(fileUrl, res);
    } catch (error) {
      console.error("Error downloading contract:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ message: "Contract not found" });
      }
      res.status(500).json({ message: "Failed to download contract" });
    }
  });

  app.post("/api/listings/:id/contract", async (req, res) => {
    try {
      const { id } = req.params;
      const { contractDocumentUrl } = req.body;
      
      if (!contractDocumentUrl) {
        return res.status(400).json({ message: "Contract document URL is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(contractDocumentUrl);
      
      // Update listing with contract information
      const updatedListing = await storage.updateListing(id, {
        contractDocumentUrl: normalizedPath,
        contractVerificationStatus: "under_review"
      });
      
      res.json({ 
        contractPath: normalizedPath,
        message: "Contract uploaded successfully" 
      });
    } catch (error) {
      console.error("Error processing contract upload:", error);
      res.status(500).json({ message: "Failed to process contract upload" });
    }
  });

  // Site Settings Admin Routes
  app.get("/api/admin/settings", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const { category } = req.query;
      let settings;
      
      if (category && typeof category === 'string') {
        settings = await storage.getSiteSettingsByCategory(category);
      } else {
        settings = await storage.getAllSiteSettings();
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Failed to fetch site settings:", error);
      res.status(500).json({ message: "Failed to fetch site settings" });
    }
  });

  app.get("/api/admin/settings/:key", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await storage.getSiteSetting(key);
      
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      res.json(setting);
    } catch (error) {
      console.error("Failed to fetch site setting:", error);
      res.status(500).json({ message: "Failed to fetch site setting" });
    }
  });

  app.post("/api/admin/settings", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertSiteSettingSchema.parse(req.body);
      const setting = await storage.setSiteSetting(validatedData);
      res.status(201).json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid setting data", errors: error.errors });
      }
      console.error("Failed to create site setting:", error);
      res.status(500).json({ message: "Failed to create site setting" });
    }
  });

  app.put("/api/admin/settings/:key", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const { key } = req.params;
      const { value, category, description, isEncrypted } = req.body;
      
      const settingData = insertSiteSettingSchema.parse({
        key,
        value,
        category: category || 'general',
        description,
        isEncrypted: isEncrypted || false
      });
      
      const setting = await storage.setSiteSetting(settingData);
      res.json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid setting data", errors: error.errors });
      }
      console.error("Failed to update site setting:", error);
      res.status(500).json({ message: "Failed to update site setting" });
    }
  });

  app.delete("/api/admin/settings/:key", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const { key } = req.params;
      const success = await storage.deleteSiteSetting(key);
      
      if (!success) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      res.json({ message: "Setting deleted successfully" });
    } catch (error) {
      console.error("Failed to delete site setting:", error);
      res.status(500).json({ message: "Failed to delete site setting" });
    }
  });

  // SMTP Test endpoint
  app.post("/api/admin/smtp/test", authenticateUser, requireAdmin, async (req, res) => {
    try {
      // Get SMTP settings from database
      const settings = await storage.getAllSiteSettings();
      const smtpSettings = settings.filter((s: any) => s.category === 'smtp');
      
      if (smtpSettings.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: "No SMTP settings found. Please configure SMTP settings first." 
        });
      }

      // Create configuration object from settings
      const secureType = smtpSettings.find((s: any) => s.key === 'smtp_secure')?.value || 'tls';
      const port = parseInt(smtpSettings.find((s: any) => s.key === 'smtp_port')?.value || '587');
      
      const config = {
        host: smtpSettings.find((s: any) => s.key === 'smtp_host')?.value,
        port: port,
        secure: secureType === 'ssl' || (secureType === 'tls' && port === 465), // true for SSL or port 465
        requireTLS: secureType === 'tls',
        ignoreTLS: secureType === 'none',
        auth: {
          user: smtpSettings.find((s: any) => s.key === 'smtp_username')?.value,
          pass: smtpSettings.find((s: any) => s.key === 'smtp_password')?.value,
        },
      };

      // Validate required settings
      if (!config.host || !config.auth.user || !config.auth.pass) {
        return res.status(400).json({
          success: false,
          message: "Missing required SMTP settings (host, username, or password)."
        });
      }

      // Create transporter and test connection
      const transporter = nodemailer.createTransport(config);
      
      // Verify connection
      await transporter.verify();

      // Send test email to sales@tailoredtimesharesolutions.com
      const fromEmail = smtpSettings.find((s: any) => s.key === 'smtp_from_email')?.value || config.auth.user;
      const fromName = smtpSettings.find((s: any) => s.key === 'smtp_from_name')?.value || 'Tailored Timeshare Solutions';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: 'sales@tailoredtimesharesolutions.com',
        subject: 'SMTP Configuration Test - SUCCESS',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">SMTP Settings Successful!</h2>
            <p>Your SMTP configuration has been successfully tested and is working correctly.</p>
            
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin-top: 0;">Configuration Details:</h3>
              <ul style="color: #374151;">
                <li><strong>SMTP Host:</strong> ${config.host}</li>
                <li><strong>SMTP Port:</strong> ${config.port}</li>
                <li><strong>Security:</strong> ${secureType.toUpperCase()} ${config.secure ? '(SSL)' : config.requireTLS ? '(TLS)' : config.ignoreTLS ? '(None)' : ''}</li>
                <li><strong>Username:</strong> ${config.auth.user}</li>
                <li><strong>From Name:</strong> ${fromName}</li>
                <li><strong>From Email:</strong> ${fromEmail}</li>
              </ul>
            </div>

            <p style="color: #6b7280;">
              This email was automatically sent to confirm your SMTP settings are working properly.
              You can now send emails from your Tailored Timeshare Solutions application.
            </p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px;">
              Sent from Tailored Timeshare Solutions Admin Panel<br>
              Test performed on ${new Date().toLocaleString()}
            </p>
          </div>
        `,
        text: `
SMTP Settings Successful!

Your SMTP configuration has been successfully tested and is working correctly.

Configuration Details:
- SMTP Host: ${config.host}
- SMTP Port: ${config.port}
- Security: ${secureType.toUpperCase()} ${config.secure ? '(SSL)' : config.requireTLS ? '(TLS)' : config.ignoreTLS ? '(None)' : ''}
- Username: ${config.auth.user}
- From Name: ${fromName}
- From Email: ${fromEmail}

This email was automatically sent to confirm your SMTP settings are working properly.
You can now send emails from your Tailored Timeshare Solutions application.

Sent from Tailored Timeshare Solutions Admin Panel
Test performed on ${new Date().toLocaleString()}
        `
      };

      // Send the email
      const info = await transporter.sendMail(mailOptions);
      
      console.log('SMTP test email sent successfully:', info.messageId);
      
      res.json({ 
        success: true, 
        message: "SMTP connection successful! Test email sent to sales@tailoredtimesharesolutions.com",
        messageId: info.messageId,
        config: {
          host: config.host,
          port: config.port,
          secure: secureType,
          username: config.auth.user,
          fromEmail,
          fromName
        }
      });
      
    } catch (error: any) {
      console.error("SMTP test failed:", error);
      
      let errorMessage = "Unknown SMTP error occurred";
      if (error.code) {
        switch (error.code) {
          case 'EAUTH':
            errorMessage = "Authentication failed. Please check your username and password.";
            break;
          case 'ECONNECTION':
            errorMessage = "Could not connect to SMTP server. Please check your host and port.";
            break;
          case 'ETIMEDOUT':
            errorMessage = "Connection timed out. Please check your host and port settings.";
            break;
          case 'ENOTFOUND':
            errorMessage = "SMTP server not found. Please check your host setting.";
            break;
          default:
            errorMessage = error.message || errorMessage;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      res.status(400).json({ 
        success: false, 
        message: errorMessage,
        code: error.code || 'UNKNOWN_ERROR'
      });
    }
  });

  // Property Submission endpoint - for sell form
  app.post("/api/property-submissions", authenticateUser, async (req, res) => {
    try {
      // Get user info
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Validate property submission data
      const propertySubmissionSchema = z.object({
        propertyName: z.string().min(1, "Property name is required"),
        resortName: z.string().min(1, "Resort name is required"),
        location: z.string().min(1, "Location is required"),
        unit: z.string().min(1, "Unit details are required"),
        ownership: z.string().min(1, "Ownership details are required"),
        weekDetails: z.string().min(1, "Week/season details are required"),
        askingPrice: z.string().min(1, "Asking price is required"),
        contactPhone: z.string().min(1, "Phone number is required"),
        additionalDetails: z.string().optional(),
      });

      const validatedData = propertySubmissionSchema.parse(req.body);

      // Get SMTP settings from database
      const settings = await storage.getAllSiteSettings();
      const smtpSettings = settings.filter((s: any) => s.category === 'smtp');
      
      if (smtpSettings.length === 0) {
        return res.status(500).json({ 
          message: "Email configuration not available. Please contact support." 
        });
      }

      // Create configuration object from settings
      const secureType = smtpSettings.find((s: any) => s.key === 'smtp_secure')?.value || 'tls';
      const port = parseInt(smtpSettings.find((s: any) => s.key === 'smtp_port')?.value || '587');
      
      const config = {
        host: smtpSettings.find((s: any) => s.key === 'smtp_host')?.value,
        port: port,
        secure: secureType === 'ssl' || (secureType === 'tls' && port === 465),
        requireTLS: secureType === 'tls',
        ignoreTLS: secureType === 'none',
        auth: {
          user: smtpSettings.find((s: any) => s.key === 'smtp_username')?.value,
          pass: smtpSettings.find((s: any) => s.key === 'smtp_password')?.value,
        },
      };

      // Validate required settings
      if (!config.host || !config.auth.user || !config.auth.pass) {
        return res.status(500).json({
          message: "Email configuration incomplete. Please contact support."
        });
      }

      // Create transporter
      const transporter = nodemailer.createTransport(config);
      
      const fromEmail = smtpSettings.find((s: any) => s.key === 'smtp_from_email')?.value || config.auth.user;
      const fromName = smtpSettings.find((s: any) => s.key === 'smtp_from_name')?.value || 'Tailored Timeshare Solutions';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: 'sales@tailoredtimesharesolutions.com',
        subject: `New Property Submission - ${validatedData.propertyName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">New Property Submission for Sale</h2>
            <p>A property owner has submitted their timeshare for evaluation and potential sale assistance.</p>
            
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin-top: 0;">Property Details:</h3>
              <div style="color: #374151;">
                <p><strong>Property Name:</strong> ${validatedData.propertyName}</p>
                <p><strong>Resort Name:</strong> ${validatedData.resortName}</p>
                <p><strong>Location:</strong> ${validatedData.location}</p>
                <p><strong>Unit Details:</strong> ${validatedData.unit}</p>
                <p><strong>Ownership Type:</strong> ${validatedData.ownership}</p>
                <p><strong>Week/Season Details:</strong> ${validatedData.weekDetails}</p>
                <p><strong>Asking Price:</strong> ${validatedData.askingPrice}</p>
              </div>
            </div>

            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #374151; margin-top: 0;">Owner Contact Information:</h3>
              <div style="color: #374151;">
                <p><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Phone:</strong> ${validatedData.contactPhone}</p>
              </div>
            </div>

            ${validatedData.additionalDetails ? `
            <div style="background-color: #fefce8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #8b5a2b; margin-top: 0;">Additional Details:</h3>
              <p style="color: #374151;">${validatedData.additionalDetails}</p>
            </div>
            ` : ''}

            <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #065f46; margin-top: 0;">Next Steps:</h3>
              <ul style="color: #374151;">
                <li>Contact the property owner within 24 hours</li>
                <li>Evaluate the property details and market value</li>
                <li>Discuss selling options and our services</li>
                <li>Schedule a consultation if appropriate</li>
              </ul>
            </div>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px;">
              Submitted from TailoredTimeshareSolutions.com<br>
              Submission time: ${new Date().toLocaleString()}<br>
              User ID: ${user.id}
            </p>
          </div>
        `,
        text: `
New Property Submission for Sale

Property Details:
- Property Name: ${validatedData.propertyName}
- Resort Name: ${validatedData.resortName}
- Location: ${validatedData.location}
- Unit Details: ${validatedData.unit}
- Ownership Type: ${validatedData.ownership}
- Week/Season Details: ${validatedData.weekDetails}
- Asking Price: ${validatedData.askingPrice}

Owner Contact Information:
- Name: ${user.firstName} ${user.lastName}
- Email: ${user.email}
- Phone: ${validatedData.contactPhone}

${validatedData.additionalDetails ? `Additional Details: ${validatedData.additionalDetails}` : ''}

Next Steps:
- Contact the property owner within 24 hours
- Evaluate the property details and market value
- Discuss selling options and our services
- Schedule a consultation if appropriate

Submitted from TailoredTimeshareSolutions.com
Submission time: ${new Date().toLocaleString()}
User ID: ${user.id}
        `
      };

      // Send the email
      const info = await transporter.sendMail(mailOptions);
      
      console.log('Property submission email sent successfully:', info.messageId);
      
      res.json({ 
        success: true, 
        message: "Property submission sent successfully. Our team will contact you within 24 hours.",
        messageId: info.messageId
      });
      
    } catch (error: any) {
      console.error("Property submission failed:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid property information provided",
          errors: error.errors
        });
      }
      
      res.status(500).json({ 
        message: "Failed to submit property information. Please try again later." 
      });
    }
  });

  // Property Inquiry Routes
  app.get("/api/admin/property-inquiries", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const inquiries = await storage.getPropertyInquiries();
      res.json(inquiries);
    } catch (error) {
      console.error("Failed to fetch property inquiries:", error);
      res.status(500).json({ message: "Failed to fetch property inquiries" });
    }
  });

  app.post("/api/property-inquiries", async (req, res) => {
    try {
      const validatedData = insertPropertyInquirySchema.parse(req.body);
      const inquiry = await storage.createPropertyInquiry(validatedData);
      res.status(201).json(inquiry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid inquiry data", errors: error.errors });
      }
      console.error("Failed to create property inquiry:", error);
      res.status(500).json({ message: "Failed to create property inquiry" });
    }
  });

  app.patch("/api/admin/property-inquiries/:id", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const updatedInquiry = await storage.updatePropertyInquiry(id, updateData);
      
      if (!updatedInquiry) {
        return res.status(404).json({ message: "Property inquiry not found" });
      }
      
      res.json(updatedInquiry);
    } catch (error) {
      console.error("Failed to update property inquiry:", error);
      res.status(500).json({ message: "Failed to update property inquiry" });
    }
  });

  // Escrow integration routes
  app.post("/api/listings/:id/escrow", async (req, res) => {
    try {
      const { id } = req.params;
      const { action, salePrice } = req.body;
      
      if (action === "initiate") {
        // TODO: Integrate with concordtitle.net API
        const escrowAccountId = `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Mock escrow initiation for now
        const escrowData = {
          escrowAccountId,
          status: "initiated",
          salePrice,
          escrowService: "concordtitle.net",
          instructions: "Please complete ownership verification before proceeding with escrow."
        };
        
        res.json(escrowData);
      } else {
        res.status(400).json({ message: "Invalid escrow action" });
      }
    } catch (error) {
      console.error("Error managing escrow:", error);
      res.status(500).json({ message: "Failed to manage escrow" });
    }
  });

  // Escrow vendor portal routes
  app.get("/api/escrow/dashboard", authenticateUser, requireEscrowVendor, async (req, res) => {
    try {
      const stats = await storage.getEscrowDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching escrow dashboard:", error);
      res.status(500).json({ message: "Failed to fetch escrow dashboard stats" });
    }
  });

  app.get("/api/escrow/transactions", authenticateUser, requireEscrowVendor, async (req, res) => {
    try {
      const { status } = req.query;
      const transactions = await storage.getEscrowTransactions(typeof status === 'string' ? status : undefined);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching escrow transactions:", error);
      res.status(500).json({ message: "Failed to fetch escrow transactions" });
    }
  });

  app.get("/api/escrow/transactions/:id", authenticateUser, requireEscrowVendor, async (req, res) => {
    try {
      const { id } = req.params;
      const transaction = await storage.getEscrowTransaction(id);
      if (!transaction) {
        return res.status(404).json({ message: "Escrow transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      console.error("Error fetching escrow transaction:", error);
      res.status(500).json({ message: "Failed to fetch escrow transaction" });
    }
  });

  app.post("/api/escrow/transactions", authenticateUser, requireEscrowVendor, async (req, res) => {
    try {
      const validatedData = insertEscrowTransactionSchema.parse(req.body);
      const transaction = await storage.createEscrowTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid escrow transaction data", errors: error.errors });
      }
      console.error("Error creating escrow transaction:", error);
      res.status(500).json({ message: "Failed to create escrow transaction" });
    }
  });

  app.post("/api/escrow/transactions/seed", authenticateUser, async (req, res) => {
    try {
      const { transactions } = req.body;
      if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json({ message: "transactions array is required" });
      }
      const created: EscrowTransaction[] = [];
      for (const tx of transactions) {
        const validated = insertEscrowTransactionSchema.parse(tx);
        const result = await storage.createEscrowTransaction(validated);
        created.push(result);
      }
      res.status(201).json({ created: created.length, transactions: created });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid escrow transaction data", errors: error.errors });
      }
      console.error("Error seeding escrow transactions:", error);
      res.status(500).json({ message: "Failed to seed escrow transactions" });
    }
  });

  app.patch("/api/escrow/transactions/:id", authenticateUser, requireEscrowVendor, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updated = await storage.updateEscrowTransaction(id, updateData);
      if (!updated) {
        return res.status(404).json({ message: "Escrow transaction not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating escrow transaction:", error);
      res.status(500).json({ message: "Failed to update escrow transaction" });
    }
  });

  // Customer-facing escrow routes
  app.get("/api/escrow/my-transactions", authenticateUser, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Not authenticated" });
      const all = await storage.getEscrowTransactions();
      const userEmail = req.user.email?.toLowerCase();
      const userFullName = `${req.user.firstName} ${req.user.lastName}`.toLowerCase();
      const mine = all.filter(tx =>
        (userEmail && (tx.buyerEmail?.toLowerCase() === userEmail || tx.sellerEmail?.toLowerCase() === userEmail)) ||
        tx.buyerName.toLowerCase() === userFullName ||
        tx.sellerName.toLowerCase() === userFullName
      );
      res.json(mine);
    } catch (error) {
      console.error("Error fetching customer escrow transactions:", error);
      res.status(500).json({ message: "Failed to fetch your escrow transactions" });
    }
  });

  app.get("/api/escrow/my-transactions/:id", authenticateUser, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Not authenticated" });
      const tx = await storage.getEscrowTransaction(req.params.id);
      if (!tx) return res.status(404).json({ message: "Transaction not found" });
      const userEmail = req.user.email?.toLowerCase();
      const userFullName = `${req.user.firstName} ${req.user.lastName}`.toLowerCase();
      const isOwner = (userEmail && (tx.buyerEmail?.toLowerCase() === userEmail || tx.sellerEmail?.toLowerCase() === userEmail)) ||
        tx.buyerName.toLowerCase() === userFullName ||
        tx.sellerName.toLowerCase() === userFullName;
      if (!isOwner) return res.status(403).json({ message: "This is not your transaction" });
      res.json(tx);
    } catch (error) {
      console.error("Error fetching customer escrow detail:", error);
      res.status(500).json({ message: "Failed to fetch transaction" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
