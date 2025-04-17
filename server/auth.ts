import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as UserType, InsertUser } from "@shared/schema";

// Extend the Express namespace
declare global {
  namespace Express {
    interface User extends UserType {}
  }
}

const scryptAsync = promisify(scrypt);

// Password hashing functions
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Configure session middleware
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "noshorts-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      sameSite: 'lax'
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport to use local strategy for authentication
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  // Serialize user to session
  passport.serializeUser((user: Express.User, done) => done(null, user.id));

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err: any) {
      done(err);
    }
  });

  // Registration route
  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Create user with hashed password
      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      // Remove password from response
      const userResponse = {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt
      };

      // Log the user in
      req.login(user, (err: any) => {
        if (err) return next(err);
        res.status(201).json(userResponse);
      });
    } catch (err: any) {
      next(err);
    }
  });

  // Login route
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: UserType | false, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });
      
      req.login(user, (err: any) => {
        if (err) return next(err);
        
        // Return user without password
        const userResponse = {
          id: user.id,
          username: user.username,
          createdAt: user.createdAt
        };
        
        res.status(200).json(userResponse);
      });
    })(req, res, next);
  });

  // Logout route
  app.post("/api/logout", (req, res, next) => {
    req.logout((err: any) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get user route
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");
    
    // Return user without password
    const user = req.user as UserType;
    const userResponse = {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt
    };
    
    res.json(userResponse);
  });
}