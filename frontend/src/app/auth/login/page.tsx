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
import { Checkbox } from "@/components/ui/checkbox";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n/TranslationContext";
import { getApiAuthPublicKey, postApiAuthLogin } from "@/service/api";
import { postApiAuthLoginBody } from "@/service/api/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import forge from "node-forge";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const loginSchema = postApiAuthLoginBody
    .pick({ encryptedEmail: true, encryptedPassword: true })
    .extend({
        encryptedEmail: z.string().email("Please enter a valid email address."),
        encryptedPassword: z.string().min(1, "Password is required."),
    });

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
    const turnstileRef = useRef<any>(null);
    const { t } = useTranslation();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [requires2FA, setRequires2FA] = useState(false);
    const [tempToken, setTempToken] = useState("");
    const [twoFactorCode, setTwoFactorCode] = useState("");
    const [trustDevice, setTrustDevice] = useState(false);

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { encryptedEmail: "", encryptedPassword: "" },
    });

    const [hCaptchaToken, setHcaptchaToken] = useState("");
    const [hcaptchaError, setHcaptchaError] = useState("");
    const configuredSiteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;
    const DEV_HCAPTCHA_SITE_KEY = "10000000-ffff-ffff-ffff-000000000001";
    const HCAPTCHA_SITE_KEY =
        configuredSiteKey ||
        (process.env.NODE_ENV === "production" ? "" : DEV_HCAPTCHA_SITE_KEY);

    useEffect(() => {
        if (typeof window !== "undefined") {
            // Redirect if already logged in
            const token = document.cookie.replace(
                /(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/,
                "$1",
            );
            if (token) {
                window.location.href = "/";
                return;
            }

            const params = new URLSearchParams(window.location.search);
            if (params.get("verified") === "true") {
                setSuccess("Email verified successfully! You may now log in.");
            }
            if (params.get("error") === "already_verified") {
                setSuccess("Your email is already verified. You may log in.");
            }
        }
    }, []);

    const encryptPayload = async (payload: string) => {
        const keyData: any = await getApiAuthPublicKey();
        const forgeKey = forge.pki.publicKeyFromPem(keyData.publicKey);
        const encrypted = forgeKey.encrypt(payload, "RSA-OAEP", {
            md: forge.md.sha256.create(),
        });
        return forge.util.encode64(encrypted);
    };

    const onSubmit = async (values: LoginFormValues) => {
        setError("");

        if (!hCaptchaToken) {
            setError("Please wait for hCaptcha verification.");
            return;
        }

        if (!HCAPTCHA_SITE_KEY) {
            setError(
                "hCaptcha is not configured. Set NEXT_PUBLIC_HCAPTCHA_SITE_KEY.",
            );
            return;
        }

        setIsLoading(true);

        try {
            const encryptedEmail = await encryptPayload(values.encryptedEmail);
            const encryptedPassword = await encryptPayload(
                values.encryptedPassword,
            );
            const trustedDeviceToken = localStorage.getItem("trustedDeviceToken") || undefined;

            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(trustedDeviceToken && { "x-trusted-device-token": trustedDeviceToken })
                },
                body: JSON.stringify({
                    encryptedEmail,
                    encryptedPassword,
                    hCaptchaToken,
                    trustedDeviceToken
                })
            });
            const data = await res.json();

            if (!res.ok) {
                throw { data, message: data.error || "Authentication failed" };
            }

            if (data?.requires2FA) {
                setRequires2FA(true);
                setTempToken(data.tempToken);
                return;
            }

            if (!data?.token) {
                throw new Error(data?.error || "Authentication failed.");
            }

            document.cookie = `sb_token=${data.token}; path=/; max-age=604800; Secure; SameSite=Strict`;

            localStorage.setItem("sb_user", JSON.stringify(data.user));

            window.location.href = "/";
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

    const onVerify2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/login/verify-2fa", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tempToken, code: twoFactorCode, trustDevice }),
            });
            const data = await res.json();

            if (!res.ok || !data?.token) {
                throw new Error(data?.error || "2FA Verification failed.");
            }

            if (data.trustedDeviceToken) {
                localStorage.setItem("trustedDeviceToken", data.trustedDeviceToken);
            }

            document.cookie = `sb_token=${data.token}; path=/; max-age=604800; Secure; SameSite=Strict`;
            localStorage.setItem("sb_user", JSON.stringify(data.user));
            window.location.href = "/";
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthSplitView>
            <Card className="dark:border-white/10 border-black/10 dark:bg-card/60 bg-card/90 backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 opacity-50"></div>
                <CardHeader className="text-center relative z-10 pb-8">
                    <CardTitle className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-foreground to-muted-foreground drop-shadow-sm mb-3">
                        Welcome Back
                    </CardTitle>
                    <CardDescription className="text-sm font-semibold tracking-widest text-muted-foreground/80 uppercase flex items-center justify-center gap-2">
                        <span className="h-px w-8 bg-gradient-to-r from-transparent to-purple-500/50"></span>
                        {t("auth.login.subtitle")}
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

                    {requires2FA ? (
                        <form onSubmit={onVerify2FA} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Authenticator Code</Label>
                                <Input
                                    type="text"
                                    placeholder="Enter 6-digit code"
                                    value={twoFactorCode}
                                    onChange={(e) => setTwoFactorCode(e.target.value)}
                                    maxLength={6}
                                    className="text-center tracking-widest text-lg font-mono"
                                    required
                                />
                            </div>
                            <div className="flex items-center space-x-2 py-2">
                                <Checkbox
                                    id="trust-device"
                                    checked={trustDevice}
                                    onCheckedChange={(checked) => setTrustDevice(checked === true)}
                                />
                                <Label htmlFor="trust-device" className="text-sm font-medium leading-none cursor-pointer">
                                    Trust this device for 30 days
                                </Label>
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading || twoFactorCode.length !== 6}>
                                {isLoading ? "Verifying..." : "Verify"}
                            </Button>
                            <div className="text-center mt-4">
                                <Button variant="link" onClick={() => setRequires2FA(false)}>
                                    Back to login
                                </Button>
                            </div>
                        </form>
                    ) : (

                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-4"
                            >
                                <FormField
                                    control={form.control}
                                    name="encryptedEmail"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {t("auth.login.email")}
                                            </FormLabel>
                                            <FormControl>
                                                <div className="relative group/input">
                                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg blur opacity-0 group-focus-within/input:opacity-20 transition duration-500"></div>
                                                    <Input
                                                        type="email"
                                                        placeholder="e.g. vendor@silverbullet.to"
                                                        className="relative dark:bg-background/50 bg-background/80 backdrop-blur-sm dark:border-white/10 border-black/10 focus:border-purple-500/50 transition-colors"
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="encryptedPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {t("auth.login.password")}
                                            </FormLabel>
                                            <FormControl>
                                                <div className="relative group/input">
                                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-pink-500 rounded-lg blur opacity-0 group-focus-within/input:opacity-20 transition duration-500"></div>
                                                    <Input
                                                        type={
                                                            showPassword
                                                                ? "text"
                                                                : "password"
                                                        }
                                                        placeholder="••••••••"
                                                        className="pr-10 relative dark:bg-background/50 bg-background/80 backdrop-blur-sm dark:border-white/10 border-black/10 focus:border-blue-500/50 transition-colors"
                                                        {...field}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            setShowPassword(
                                                                !showPassword,
                                                            )
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
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <Checkbox id="remember" />
                                        <Label
                                            htmlFor="remember"
                                            className="text-muted-foreground font-normal cursor-pointer"
                                        >
                                            {t("auth.login.remember")}
                                        </Label>
                                    </div>
                                    <Link
                                        href="/auth/recovery"
                                        className="underline text-muted-foreground hover:text-foreground"
                                    >
                                        {t("auth.login.forgot")}
                                    </Link>
                                </div>

                                <div className="flex justify-center">
                                    {HCAPTCHA_SITE_KEY && (
                                        <HCaptcha
                                            ref={turnstileRef}
                                            sitekey={HCAPTCHA_SITE_KEY}
                                            onVerify={(token) => {
                                                setHcaptchaToken(token);
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
                                                {t("auth.login.verifying")}
                                            </>
                                        ) : (
                                            t("auth.login.button")
                                        )}
                                    </span>
                                </Button>
                            </form>
                        </Form>
                    )}

                    <div className="mt-6 text-center text-sm text-muted-foreground">
                        {t("auth.login.noAccount")}{" "}
                        <Link
                            href="/auth/register"
                            className="underline hover:text-foreground"
                        >
                            {t("auth.login.registerLink")}
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </AuthSplitView>
    );
}
