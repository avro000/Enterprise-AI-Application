import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/logo.svg";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  RotateCw,
  Shield,
  ShieldCheck,
  User,
  UserCheck,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const {
    isLoading: authLoading,
    isAuthenticated,
    signIn,
    signUp,
    verifyRegistrationOtp,
    resendRegistrationOtp,
    forgotPassword,
    verifyResetOtp,
    resetPassword,
  } = useAuth();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"signin" | "register" | "forgot">(
    tabParam === "register" || tabParam === "signup" ? "register" : "signin"
  );
  const [selectedRole, setSelectedRole] = useState<"operator" | "manager" | "admin">("operator");
  const [otpStep, setOtpStep] = useState<{
    email: string;
    purpose: "registration" | "reset";
    resetToken?: string;
  } | null>(null);

  // Password visibility toggles
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Timer for 5-minute OTP countdown (300 seconds)
  const [secondsLeft, setSecondsLeft] = useState(300);
  // Cooldown for resending OTP (60 seconds)
  const [resendCooldown, setResendCooldown] = useState(60);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  useEffect(() => {
    if (!otpStep) return;
    setSecondsLeft(300);
    setResendCooldown(60);
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpStep]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  /* ------------------------------------------------------------------ */
  /* Sign In Handlers                                                   */
  /* ------------------------------------------------------------------ */

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string)?.trim();
    const password = formData.get("password") as string;

    if (!email || !password) {
      toast.error("Please enter both email and password.");
      setIsLoading(false);
      return;
    }

    try {
      await signIn("credentials", { email, password });
      toast.success("Signed in successfully!");
      navigate(redirect);
    } catch (err: any) {
      console.error("Sign-in error:", err);
      const detail = err.response?.data?.detail || err.message || "Failed to sign in";
      
      // If unverified account (HTTP 403)
      if (err.response?.status === 403 || detail.toLowerCase().includes("not been verified")) {
        setOtpStep({ email, purpose: "registration" });
        toast.info("Account not verified yet. Please enter the 6-digit OTP sent to your email.");
      } else {
        toast.error(detail);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Register Handlers                                                  */
  /* ------------------------------------------------------------------ */

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = (formData.get("name") as string)?.trim();
    const email = (formData.get("email") as string)?.trim();
    const password = formData.get("password") as string;

    if (!name) {
      toast.error("Please enter your full name.");
      setIsLoading(false);
      return;
    }

    if (!email) {
      toast.error("Please enter a valid corporate email address.");
      setIsLoading(false);
      return;
    }

    if (!password) {
      toast.error("Please enter a password.");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      setIsLoading(false);
      return;
    }

    try {
      await signUp(email, name, password, selectedRole);
      toast.success("Account created! A 6-digit verification code has been sent to your email.");
      setOtpStep({ email, purpose: "registration" });
    } catch (err: any) {
      console.error("Registration error:", err);
      const detail = err.response?.data?.detail || err.message || "Registration failed";
      toast.error(detail);
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* OTP Verification Handlers                                          */
  /* ------------------------------------------------------------------ */

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otpStep || otp.length !== 6) {
      toast.error("Please enter all 6 digits of your verification code.");
      return;
    }

    setIsLoading(true);

    try {
      if (otpStep.purpose === "registration") {
        await verifyRegistrationOtp(otpStep.email, otp);
        toast.success("Account successfully verified! Please sign in with your password.");
        setOtpStep(null);
        setOtp("");
        setActiveTab("signin");
      } else {
        // Password reset flow step 1
        const res = await verifyResetOtp(otpStep.email, otp);
        setOtpStep({
          ...otpStep,
          resetToken: res.reset_token,
        });
        toast.success("Verification code confirmed. Set your new password below.");
      }
    } catch (err: any) {
      console.error("OTP verification error:", err);
      const detail = err.response?.data?.detail || "Invalid or expired verification code.";
      toast.error(detail);
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!otpStep || resendCooldown > 0) return;
    setIsLoading(true);
    try {
      if (otpStep.purpose === "registration") {
        await resendRegistrationOtp(otpStep.email);
      } else {
        await forgotPassword(otpStep.email);
      }
      setSecondsLeft(300);
      setResendCooldown(60);
      toast.success("A fresh verification code has been sent!");
    } catch (err: any) {
      console.error("Resend OTP error:", err);
      const detail = err.response?.data?.detail || "Failed to resend verification code.";
      toast.error(detail);
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Password Reset Flow                                                */
  /* ------------------------------------------------------------------ */

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string)?.trim();

    if (!email) {
      toast.error("Please enter your corporate email.");
      setIsLoading(false);
      return;
    }

    try {
      await forgotPassword(email);
      toast.success("Password recovery code sent to your email.");
      setOtpStep({ email, purpose: "reset" });
    } catch (err: any) {
      console.error("Forgot password error:", err);
      const detail = err.response?.data?.detail || "Failed to send reset code.";
      toast.error(detail);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewPasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!otpStep?.resetToken) return;

    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get("newPassword") as string;

    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(otpStep.email, otpStep.resetToken, newPassword);
      toast.success("Password reset successfully! Please sign in with your new password.");
      setOtpStep(null);
      setOtp("");
      setActiveTab("signin");
    } catch (err: any) {
      console.error("Password reset error:", err);
      const detail = err.response?.data?.detail || "Failed to reset password.";
      toast.error(detail);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-background selection:bg-primary/20 selection:text-primary">
      {/* Top navigation anchor */}
      <div className="w-full max-w-[460px] mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-3.5" /> Back to OpsPilot
        </button>
        <span className="text-[11px] font-medium text-muted-foreground">
          Enterprise Access
        </span>
      </div>

      <div className="w-full max-w-[460px]">
        {/* Seamless Unified Claymorphic Card */}
        <div className="clay-lg rounded-[32px] p-6 sm:p-8 bg-card border border-border/40 shadow-xl transition-all">
          {/* Header with Official OpsPilot AI Logo */}
          <div className="text-center pb-5">
            <div className="flex justify-center">
              <div
                onClick={() => navigate("/")}
                className="clay-sm size-14 rounded-2xl p-1.5 mb-3 cursor-pointer bg-card border border-border/50 shadow-sm transition-transform hover:scale-105 flex items-center justify-center"
                title="OpsPilot AI Home"
              >
                <img
                  src={logo}
                  alt="OpsPilot AI Logo"
                  width={42}
                  height={42}
                  className="rounded-xl"
                />
              </div>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              OpsPilot AI
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Enterprise Operations Intelligence & Autonomous Action
            </p>
          </div>

          {/* OTP Verification Flow */}
          {otpStep ? (
            <div className="pt-2">
              {otpStep.resetToken ? (
                // Step 2 of password reset: enter new password
                <form onSubmit={handleNewPasswordSubmit} noValidate className="flex flex-col gap-4">
                  <div className="text-center mb-1">
                    <p className="text-sm font-bold text-foreground">Set New Password</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Enter credentials for <span className="text-foreground font-semibold">{otpStep.email}</span>
                    </p>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      name="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="New password (min 8 chars)"
                      className="pl-10 pr-10 h-10 text-xs rounded-xl"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded cursor-pointer"
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <Button type="submit" className="clay-btn h-10 w-full text-xs font-bold" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save New Password"}
                  </Button>
                </form>
              ) : (
                // Step 1: Enter 6-digit OTP
                <div className="flex flex-col gap-4">
                  <div className="text-center">
                    <p className="text-sm font-bold text-foreground">
                      {otpStep.purpose === "registration"
                        ? "Verify Corporate Email"
                        : "Security Verification"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      A 6-digit verification code was sent to{" "}
                      <span className="font-semibold text-foreground">{otpStep.email}</span>
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/70 border border-border/40 text-[11px] font-medium text-muted-foreground">
                      <span>Code valid for:</span>
                      <span
                        className={`font-mono font-bold ${secondsLeft < 60 ? "text-destructive" : "text-primary"}`}
                      >
                        {formatTimer(secondsLeft)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-center my-2">
                    <InputOTP
                      value={otp}
                      onChange={setOtp}
                      maxLength={6}
                      disabled={isLoading}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                          void handleVerifyOtp();
                        }
                      }}
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <Button
                    type="button"
                    onClick={() => void handleVerifyOtp()}
                    className="clay-btn h-10 w-full text-xs font-bold"
                    disabled={isLoading || otp.length !== 6 || secondsLeft === 0}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying Code...
                      </>
                    ) : (
                      <>
                        Confirm & Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1 mt-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isLoading || resendCooldown > 0}
                        className={`inline-flex items-center gap-1 font-medium transition-colors ${
                          resendCooldown > 0
                            ? "opacity-50 cursor-not-allowed text-muted-foreground"
                            : "hover:text-foreground underline cursor-pointer text-foreground"
                        }`}
                      >
                        <RotateCw className={`size-3 ${isLoading ? "animate-spin" : ""}`} />
                        <span>Resend code</span>
                      </button>
                      {resendCooldown > 0 && (
                        <span className="font-mono text-[11px] font-semibold text-primary tabular-nums">
                          ({resendCooldown}s)
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpStep(null);
                        setOtp("");
                      }}
                      className="hover:text-foreground transition-colors underline font-medium cursor-pointer"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === "forgot" ? (
            /* ============================================================== */
            /* RECOVER PASSWORD VIEW (NO SIGN IN / REGISTER TABS HEADER)       */
            /* ============================================================== */
            <div className="flex flex-col gap-4 pt-1">
              <div className="text-center mb-1">
                <p className="text-sm font-bold text-foreground">Recover Account Access</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter your corporate email to receive a 5-minute recovery code.
                </p>
              </div>

              <form onSubmit={handleForgotPassword} noValidate className="flex flex-col gap-3">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    className="pl-10 h-10 text-xs rounded-xl"
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="clay-btn h-10 w-full text-xs font-bold mt-1" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Send Recovery Code"
                  )}
                </Button>
                <div className="text-center mt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("signin")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline font-medium cursor-pointer"
                  >
                    Back to sign in
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* ============================================================== */
            /* SIGN IN & REGISTER TABS                                         */
            /* ============================================================== */
            <div>
              <Tabs
                value={activeTab}
                onValueChange={(v) => {
                  setActiveTab(v as any);
                }}
              >
                <TabsList className="clay-press grid grid-cols-2 mb-4 p-1 rounded-2xl">
                  <TabsTrigger value="signin" className="rounded-xl text-xs font-semibold py-1.5 cursor-pointer">
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger value="register" className="rounded-xl text-xs font-semibold py-1.5 cursor-pointer">
                    Create Account
                  </TabsTrigger>
                </TabsList>

                {/* SIGN IN TAB */}
                <TabsContent value="signin" className="flex flex-col gap-4 mt-0">
                  <form onSubmit={handleSignIn} noValidate className="flex flex-col gap-3">
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        name="email"
                        type="email"
                        placeholder="corporate.email@company.com"
                        className="pl-10 h-10 text-xs rounded-xl"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        name="password"
                        type={showSignInPassword ? "text" : "password"}
                        placeholder="Password"
                        className="pl-10 pr-10 h-10 text-xs rounded-xl"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPassword((prev) => !prev)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded cursor-pointer"
                        aria-label={showSignInPassword ? "Hide password" : "Show password"}
                        tabIndex={-1}
                      >
                        {showSignInPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setActiveTab("forgot")}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <Button type="submit" className="clay-btn h-10 w-full text-xs font-bold" disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Sign In to Console
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                {/* REGISTER TAB */}
                <TabsContent value="register" className="flex flex-col gap-3 mt-0">
                  <form onSubmit={handleRegister} noValidate className="flex flex-col gap-3">
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        name="name"
                        type="text"
                        placeholder="Full Name"
                        className="pl-10 h-10 text-xs rounded-xl"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        name="email"
                        type="email"
                        placeholder="work.email@company.com"
                        className="pl-10 h-10 text-xs rounded-xl"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        name="password"
                        type={showRegisterPassword ? "text" : "password"}
                        placeholder="Password (min 8 characters)"
                        className="pl-10 pr-10 h-10 text-xs rounded-xl"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword((prev) => !prev)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded cursor-pointer"
                        aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                        tabIndex={-1}
                      >
                        {showRegisterPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>

                    {/* Styled Role Selector */}
                    <div className="mt-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Operational Role:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "operator" as const, label: "Operator", icon: User },
                          { id: "manager" as const, label: "Manager", icon: UserCheck },
                          { id: "admin" as const, label: "Admin", icon: Shield },
                        ].map((r) => {
                          const Icon = r.icon;
                          const isSelected = selectedRole === r.id;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => setSelectedRole(r.id)}
                              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                  : "bg-secondary/40 border-border/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                              }`}
                            >
                              <Icon className="size-3.5" />
                              <span>{r.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <Button type="submit" className="clay-btn h-10 w-full mt-2 text-xs font-bold" disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Send 5-Min Verification Code
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        {/* Clean Enterprise Trust Signals (outside the card) */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-primary" /> Role-Based Access
          </span>
          <span className="flex items-center gap-1.5">
            <Lock className="size-3.5 text-emerald-600" /> End-to-End TLS
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-sky-600" /> SOC-2 Compliant
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
