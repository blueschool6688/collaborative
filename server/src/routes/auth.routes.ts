import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { signToken } from "../auth/jwt.js";
import { requireAuth, AuthenticatedRequest } from "../auth/auth.middleware.js";

const router = Router();

const USER_COLORS = [
  "#6366f1", // Indigo
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#3b82f6", // Blue
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#e11d48", // Rose
];

function getRandomColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

// POST /api/auth/register
router.post("/register", async (req, res): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: "Email, password, and name are required" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters long" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const color = getRandomColor();

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name.trim(),
        color,
        systemRole: "USER",
        provider: "local",
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        color: true,
        systemRole: true,
        provider: true,
        createdAt: true,
      },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      color: user.color,
      avatar: user.avatar,
      systemRole: user.systemRole,
    });

    res.status(201).json({
      message: "Account created successfully",
      token,
      user,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error during registration" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      color: user.color,
      avatar: user.avatar,
      systemRole: user.systemRole,
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        color: user.color,
        systemRole: user.systemRole,
        provider: user.provider,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error during login" });
  }
});

// POST /api/auth/oauth - Social Login with Google & GitHub
router.post("/oauth", async (req, res): Promise<void> => {
  try {
    const { provider, email, name, avatar, providerId } = req.body;

    if (!provider || !email || !name) {
      res.status(400).json({ error: "Provider, email, and name are required for social login" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Create new user via OAuth
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: name.trim(),
          avatar: avatar || null,
          color: getRandomColor(),
          provider: provider.toLowerCase(),
          providerId: providerId || `${provider}_${Date.now()}`,
          systemRole: "USER",
        },
      });
    } else {
      // Link or update avatar/provider if not already set
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: user.name || name.trim(),
          avatar: user.avatar || avatar,
          provider: user.provider || provider.toLowerCase(),
          providerId: user.providerId || providerId,
        },
      });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      color: user.color,
      avatar: user.avatar,
      systemRole: user.systemRole,
    });

    res.json({
      message: `Signed in with ${provider}`,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        color: user.color,
        systemRole: user.systemRole,
        provider: user.provider,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("OAuth login error:", error);
    res.status(500).json({ error: "Failed to authenticate with social provider" });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        color: true,
        systemRole: true,
        provider: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

export default router;
