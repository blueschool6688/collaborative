import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { signToken } from "../auth/jwt.js";
import { requireAuth, AuthenticatedRequest } from "../auth/auth.middleware.js";
import { config } from "../config.js";

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

// GET /api/auth/providers - Status of configured OAuth providers
router.get("/providers", (_req, res) => {
  res.json({
    google: Boolean(config.googleClientId && config.googleClientSecret),
    github: Boolean(config.githubClientId && config.githubClientSecret),
  });
});

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

// ==========================================
// REAL OAUTH 2.0 (GOOGLE & GITHUB FLOWS)
// ==========================================

// GET /api/auth/google - Initiate Google OAuth Redirect
router.get("/google", (_req, res): void => {
  if (!config.googleClientId) {
    res.redirect(`${config.clientUrl}?oauth_fallback=google&error=${encodeURIComponent("Google Client ID not configured in server .env")}`);
    return;
  }
  const redirectUri = `${config.serverUrl}/api/auth/google/callback`;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    config.googleClientId
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(
    "openid email profile"
  )}&access_type=offline&prompt=select_account`;
  res.redirect(url);
});

// GET /api/auth/google/callback - Handle Google OAuth Callback
router.get("/google/callback", async (req, res): Promise<void> => {
  try {
    const code = req.query.code as string;
    if (!code) {
      res.redirect(`${config.clientUrl}?auth_error=No+code+provided+from+Google`);
      return;
    }

    const redirectUri = `${config.serverUrl}/api/auth/google/callback`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Google token exchange error:", tokenData);
      res.redirect(
        `${config.clientUrl}?auth_error=${encodeURIComponent(tokenData.error_description || "Google token exchange failed")}`
      );
      return;
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await userRes.json();

    if (!profile.email) {
      res.redirect(`${config.clientUrl}?auth_error=No+email+returned+from+Google`);
      return;
    }

    const normalizedEmail = profile.email.toLowerCase().trim();
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: profile.name || profile.email.split("@")[0],
          avatar: profile.picture || null,
          color: getRandomColor(),
          provider: "google",
          providerId: profile.sub || `google_${Date.now()}`,
          systemRole: "USER",
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: user.name || profile.name,
          avatar: user.avatar || profile.picture,
          provider: user.provider || "google",
          providerId: user.providerId || profile.sub,
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

    res.redirect(`${config.clientUrl}?token=${encodeURIComponent(token)}`);
  } catch (error: any) {
    console.error("Google OAuth error:", error);
    res.redirect(`${config.clientUrl}?auth_error=${encodeURIComponent(error.message || "Google authentication failed")}`);
  }
});

// GET /api/auth/github - Initiate GitHub OAuth Redirect
router.get("/github", (_req, res): void => {
  if (!config.githubClientId) {
    res.redirect(`${config.clientUrl}?oauth_fallback=github&error=${encodeURIComponent("GitHub Client ID not configured in server .env")}`);
    return;
  }
  const redirectUri = `${config.serverUrl}/api/auth/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
    config.githubClientId
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent("user:email")}`;
  res.redirect(url);
});

// GET /api/auth/github/callback - Handle GitHub OAuth Callback
router.get("/github/callback", async (req, res): Promise<void> => {
  try {
    const code = req.query.code as string;
    if (!code) {
      res.redirect(`${config.clientUrl}?auth_error=No+code+provided+from+GitHub`);
      return;
    }

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: config.githubClientId,
        client_secret: config.githubClientSecret,
        code,
        redirect_uri: `${config.serverUrl}/api/auth/github/callback`,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("GitHub token exchange error:", tokenData);
      res.redirect(
        `${config.clientUrl}?auth_error=${encodeURIComponent(tokenData.error_description || "GitHub token exchange failed")}`
      );
      return;
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "User-Agent": "SyncCraft-Collaborative-App",
      },
    });
    const profile = await userRes.json();

    let email = profile.email;
    if (!email) {
      const emailRes = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "User-Agent": "SyncCraft-Collaborative-App",
        },
      });
      if (emailRes.ok) {
        const emails = await emailRes.json();
        const primary = emails.find((e: any) => e.primary && e.verified) || emails[0];
        if (primary) email = primary.email;
      }
    }

    if (!email) {
      email = `${profile.login || "user"}@users.noreply.github.com`;
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: profile.name || profile.login || "GitHub User",
          avatar: profile.avatar_url || null,
          color: getRandomColor(),
          provider: "github",
          providerId: String(profile.id || `github_${Date.now()}`),
          systemRole: "USER",
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: user.name || profile.name || profile.login,
          avatar: user.avatar || profile.avatar_url,
          provider: user.provider || "github",
          providerId: user.providerId || String(profile.id),
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

    res.redirect(`${config.clientUrl}?token=${encodeURIComponent(token)}`);
  } catch (error: any) {
    console.error("GitHub OAuth error:", error);
    res.redirect(`${config.clientUrl}?auth_error=${encodeURIComponent(error.message || "GitHub authentication failed")}`);
  }
});

// POST /api/auth/oauth - Direct/Mock Social Login (For Testing & Fallback)
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
