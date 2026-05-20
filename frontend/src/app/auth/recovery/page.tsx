"use client";
import AuthSplitView from "@/components/AuthSplitView";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    getApiAuthPublicKey,
    postApiAuthRecovery,
    postApiAuthResetPassword,
} from "@/service/api";
import {
    postApiAuthRecoveryBody,
    postApiAuthResetPasswordBody,
} from "@/service/api/zod";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import forge from "node-forge";
import { useEffect, useRef, useState } from "react";

export default function Recovery() {
    const turnstileRef = useRef<any>(null);

    // View state
    const [viewMode, setViewMode] = useState<"request" | "reset">("request");
    const [token, setToken] = useState("");

    // Request state
    const [email, setEmail] = useState("");

    // Reset state
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Common state
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [hCaptchaToken, setHcaptchaToken] = useState("");
    const [hcaptchaError, setHcaptchaError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const configuredSiteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;
    const DEV_HCAPTCHA_SITE_KEY = "10000000-ffff-ffff-ffff-000000000001";
    const HCAPTCHA_SITE_KEY =
        configuredSiteKey ||
        (process.env.NODE_ENV === "production" ? "" : DEV_HCAPTCHA_SITE_KEY);

    const encryptPayload = async (payload: string) => {
        const keyData: any = await getApiAuthPublicKey();
        const forgeKey = forge.pki.publicKeyFromPem(keyData.publicKey);
        const encrypted = forgeKey.encrypt(payload, "RSA-OAEP", {
            md: forge.md.sha256.create(),
        });
        return forge.util.encode64(encrypted);
    };

    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const urlToken = params.get("token");
            if (urlToken) {
                setToken(urlToken);
                setViewMode("reset");
            }
        }
    }, []);

    const handleRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!email.includes("@")) {
            setError(
                "Please enter a valid email address containing an @ symbol.",
            );
            return;
        }

        // if (!cfToken) {
        //     setError("Please wait for Cloudflare verification.");
        //     return;
        // }

        // if (!CF_SITE_KEY) {
        //     setError(
        //         "Turnstile is not configured. Set NEXT_PUBLIC_CF_SITE_KEY.",
        //     );
        //     return;
        // }

        setIsLoading(true);

        try {
            const encryptedEmail = await encryptPayload(email);
            const payload = postApiAuthRecoveryBody.parse({
                encryptedEmail,
                hCaptchaToken,
            });
            const data: any = await postApiAuthRecovery(payload);

            setSuccess(
                data.message ||
                    "If that email is registered, a recovery link has been sent.",
            );
            setEmail("");
        } catch (err: any) {
            setError(err.data?.error || err.message);
        } finally {
            setIsLoading(false);
            setHcaptchaToken("");
            if (turnstileRef.current) {
                turnstileRef.current.resetCaptcha();
            }
        }
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        // if (!cfToken) {
        //     setError("Please wait for Cloudflare verification.");
        //     return;
        // }

        setIsLoading(true);
        try {
            const encryptedPassword = await encryptPayload(password);
            const payload = postApiAuthResetPasswordBody.parse({
                token,
                encryptedPassword,
                hCaptchaToken,
            });
            await postApiAuthResetPassword(payload);

            window.location.href = "/auth/login?reset=true";
        } catch (err: any) {
            setError(err.data?.error || err.message);
        } finally {
            setIsLoading(false);
            setHcaptchaToken("");
            if (turnstileRef.current) {
                turnstileRef.current.resetCaptcha();
            }
        }
    };

    return (
        <AuthSplitView>
            <Card className="dark:border-white/10 border-black/10 dark:bg-card/60 bg-card/90 backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 opacity-50"></div>
                <CardHeader className="text-center relative z-10 pb-8">
                    <CardTitle className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-foreground to-muted-foreground drop-shadow-sm mb-3">
                        Account Recovery
                    </CardTitle>
                    <CardDescription className="text-sm font-semibold tracking-widest text-muted-foreground/80 uppercase flex items-center justify-center gap-2">
                        <span className="h-px w-8 bg-gradient-to-r from-transparent to-purple-500/50"></span>
                        {viewMode === "request"
                            ? "Recover Access"
                            : "Set New Password"}
                        <span className="h-px w-8 bg-gradient-to-l from-transparent to-blue-500/50"></span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="relative z-10">
                    {error && (
                        <Alert
                            variant="destructive"
                            className="mb-4 text-center"
                        >
                            <AlertDescription className="font-semibold">
                                {error}
                            </AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert className="mb-4 border-emerald-500/50 bg-emerald-500/10 text-center">
                            <AlertDescription className="font-semibold text-emerald-600 dark:text-emerald-400">
                                {success}
                            </AlertDescription>
                        </Alert>
                    )}

                    {viewMode === "request" ? (
                        <form onSubmit={handleRequest} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Registered Email Address</Label>
                                <div className="relative group/input">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg blur opacity-0 group-focus-within/input:opacity-20 transition duration-500"></div>
                                    <Input
                                        type="email"
                                        required
                                        placeholder="e.g. user@silverbullet.to"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="relative dark:bg-background/50 bg-background/80 backdrop-blur-sm dark:border-white/10 border-black/10 focus:border-purple-500/50 transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-center">
                                {HCAPTCHA_SITE_KEY && (
                                    <HCaptcha
                                        ref={turnstileRef}
                                        sitekey={HCAPTCHA_SITE_KEY}
                                        onVerify={(t) => {
                                            setHcaptchaToken(t);
                                            setHcaptchaError("");
                                        }}
                                        onError={() => {
                                            setHcaptchaError(
                                                "Captcha verification failed. Please try again.",
                                            );
                                            setHcaptchaToken("");
                                        }}
                                        onExpire={() => {
                                            setHcaptchaToken("");
                                        }}
                                        theme="dark"
                                    />
                                )}
                            </div>

                            {hcaptchaError && (
                                <div className="text-center text-sm text-destructive">
                                    {hcaptchaError}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full relative overflow-hidden bg-foreground text-background hover:bg-foreground/90 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                                disabled={isLoading || !hCaptchaToken}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 opacity-0 hover:opacity-100 transition-opacity"></div>
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    {isLoading ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-background" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Processing...
                                        </>
                                    ) : (
                                        "Send Recovery Link"
                                    )}
                                </span>
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleReset} className="space-y-4">
                            <div className="space-y-2">
                                <Label>New Password</Label>
                                <div className="relative group/input">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-pink-500 rounded-lg blur opacity-0 group-focus-within/input:opacity-20 transition duration-500"></div>
                                    <Input
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        required
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        className="pr-10 relative dark:bg-background/50 bg-background/80 backdrop-blur-sm dark:border-white/10 border-black/10 focus:border-blue-500/50 transition-colors"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                        className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground"
                                    >
                                        {showPassword ? (
                                            <EyeOff size={18} />
                                        ) : (
                                            <Eye size={18} />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Confirm New Password</Label>
                                <div className="relative group/input">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg blur opacity-0 group-focus-within/input:opacity-20 transition duration-500"></div>
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) =>
                                            setConfirmPassword(e.target.value)
                                        }
                                        className="relative dark:bg-background/50 bg-background/80 backdrop-blur-sm dark:border-white/10 border-black/10 focus:border-pink-500/50 transition-colors"
                                    />
                                </div>
                            </div>

                            <p className="text-center text-xs text-muted-foreground">
                                <strong>Rule:</strong> 8-15 chars, 1 Uppercase,
                                1 Number, 1 Special Char.
                            </p>

                            <div className="flex justify-center">
                                {HCAPTCHA_SITE_KEY && (
                                    <HCaptcha
                                        ref={turnstileRef}
                                        sitekey={HCAPTCHA_SITE_KEY}
                                        onVerify={(t) => {
                                            setHcaptchaToken(t);
                                            setHcaptchaError("");
                                        }}
                                        onError={() => {
                                            setHcaptchaError(
                                                "Captcha verification failed. Please try again.",
                                            );
                                            setHcaptchaToken("");
                                        }}
                                        onExpire={() => {
                                            setHcaptchaToken("");
                                        }}
                                        theme="dark"
                                    />
                                )}
                            </div>

                            {hcaptchaError && (
                                <div className="text-center text-sm text-destructive">
                                    {hcaptchaError}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full relative overflow-hidden bg-foreground text-background hover:bg-foreground/90 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                                disabled={isLoading || !hCaptchaToken}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 hover:opacity-100 transition-opacity"></div>
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    {isLoading ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-background" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Processing...
                                        </>
                                    ) : (
                                        "Securely Reset Password"
                                    )}
                                </span>
                            </Button>
                        </form>
                    )}

                    <div className="mt-6 text-center text-sm text-muted-foreground">
                        Remembered your password?{" "}
                        <Link
                            href="/auth/login"
                            className="underline hover:text-foreground"
                        >
                            Log In Here
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </AuthSplitView>
    );
}
