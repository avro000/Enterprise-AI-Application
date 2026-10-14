import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi, type UserProfile } from "@/services/api";

export interface OpsUser extends UserProfile {
  _id: string; // for compatibility with legacy entity schemas
}

export interface AuthContextType {
  user: OpsUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (type: "credentials" | "demo" | "anonymous" | "email-otp", payload?: any) => Promise<any>;
  signOut: () => void;
  signUp: (email: string, name: string, password: string, role?: "admin" | "manager" | "operator") => Promise<any>;
  verifyRegistrationOtp: (email: string, otp: string) => Promise<any>;
  resendRegistrationOtp: (email: string) => Promise<any>;
  forgotPassword: (email: string) => Promise<any>;
  verifyResetOtp: (email: string, otp: string) => Promise<any>;
  resetPassword: (email: string, resetToken: string, newPass: string) => Promise<any>;
  switchDemoRole: (role: "admin" | "manager" | "operator") => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_CREDENTIALS: Record<"admin" | "manager" | "operator", { email: string; pass: string; name: string }> = {
  admin: { email: "admin@opspilot.com", pass: "Admin@123456", name: "Sarah Connor (Admin)" },
  manager: { email: "manager@opspilot.com", pass: "Manager@123456", name: "Alex Rivera (Manager)" },
  operator: { email: "operator@opspilot.com", pass: "Operator@123456", name: "James Vance (Operator)" },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<OpsUser | null>(() => {
    try {
      const stored = localStorage.getItem("opspilot_user");
      if (stored) {
        const u = JSON.parse(stored);
        return { ...u, _id: u.id || u._id };
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem("opspilot_token"));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate session on mount
  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      const savedToken = localStorage.getItem("opspilot_token");
      if (!savedToken) {
        if (mounted) setIsLoading(false);
        return;
      }

      try {
        const me = await authApi.me();
        if (mounted) {
          const opsUser: OpsUser = { ...me, _id: me.id };
          setUser(opsUser);
          localStorage.setItem("opspilot_user", JSON.stringify(opsUser));
        }
      } catch (err) {
        console.warn("Session expired or invalid, logging out:", err);
        localStorage.removeItem("opspilot_token");
        localStorage.removeItem("opspilot_user");
        if (mounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initAuth();
    return () => {
      mounted = false;
    };
  }, []);

  const saveAuthSession = (authToken: string, userProfile: UserProfile) => {
    const opsUser: OpsUser = { ...userProfile, _id: userProfile.id };
    setToken(authToken);
    setUser(opsUser);
    localStorage.setItem("opspilot_token", authToken);
    localStorage.setItem("opspilot_user", JSON.stringify(opsUser));
  };

  const signIn = async (
    type: "credentials" | "demo" | "anonymous" | "email-otp",
    payload?: any
  ) => {
    setIsLoading(true);
    try {
      if (type === "demo") {
        const role = (payload?.role || "manager") as "admin" | "manager" | "operator";
        const creds = DEMO_CREDENTIALS[role];
        const res = await authApi.login(creds.email, creds.pass);
        saveAuthSession(res.access_token, res.user);
        return res;
      }

      if (type === "anonymous") {
        // Sign in as operator demo user for guest access
        const creds = DEMO_CREDENTIALS.operator;
        const res = await authApi.login(creds.email, creds.pass);
        saveAuthSession(res.access_token, res.user);
        return res;
      }

      if (type === "email-otp") {
        // Standard OTP form handling
        const formData = payload instanceof FormData ? payload : new FormData();
        const email = (formData.get("email") as string) || payload?.email;
        const code = (formData.get("code") as string) || payload?.code || payload?.otp;

        if (!code) {
          // Trigger OTP request or resend
          return { email };
        } else {
          // Verify registration OTP then login
          await authApi.verifyRegistrationOtp(email, code);
          // If password was stored/provided, login
          const password = (formData.get("password") as string) || payload?.password || "password123";
          const res = await authApi.login(email, password);
          saveAuthSession(res.access_token, res.user);
          return res;
        }
      }

      // Default: credentials login
      const email = payload?.email || (payload instanceof FormData ? (payload.get("email") as string) : "");
      const password = payload?.password || (payload instanceof FormData ? (payload.get("password") as string) : "");

      const res = await authApi.login(email, password);
      saveAuthSession(res.access_token, res.user);
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem("opspilot_token");
    localStorage.removeItem("opspilot_user");
    setUser(null);
    setToken(null);
    window.location.href = "/auth";
  };

  const signUp = async (
    email: string,
    name: string,
    password: string,
    role: "admin" | "manager" | "operator" = "operator"
  ) => {
    return await authApi.register(email, name, password, role);
  };

  const verifyRegistrationOtp = async (email: string, otp: string) => {
    return await authApi.verifyRegistrationOtp(email, otp);
  };

  const resendRegistrationOtp = async (email: string) => {
    return await authApi.resendRegistrationOtp(email);
  };

  const forgotPassword = async (email: string) => {
    return await authApi.forgotPassword(email);
  };

  const verifyResetOtp = async (email: string, otp: string) => {
    return await authApi.verifyOtp(email, otp);
  };

  const resetPassword = async (email: string, resetToken: string, newPass: string) => {
    return await authApi.resetPassword(email, resetToken, newPass);
  };

  const switchDemoRole = async (_targetRole: "admin" | "manager" | "operator") => {
    throw new Error("Role switching without re-authentication is disabled.");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        signIn,
        signOut,
        signUp,
        verifyRegistrationOtp,
        resendRegistrationOtp,
        forgotPassword,
        verifyResetOtp,
        resetPassword,
        switchDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
