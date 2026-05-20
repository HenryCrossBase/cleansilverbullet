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
import { useTranslation } from "@/i18n/TranslationContext";
import { getApiAuthPublicKey, postApiAuthRegister } from "@/service/api";
import { postApiAuthRegisterBody } from "@/service/api/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import forge from "node-forge";
import { useRef, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

const registerSchema = z
    .object({
        username: z.string().min(3, "Username must be at least 3 characters."),
        email: z.string().email("Please enter a valid email address."),
        password: z
            .string()
            .regex(
                passwordRegex,
                "Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character.",
            ),
        confirmPassword: z.string().min(1, "Please confirm your password."),
        tosAccepted: z
            .boolean()
            .refine(
                (v) => v === true,
                "You must agree to the Terms of Service.",
            ),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match.",
        path: ["confirmPassword"],
    });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
    const turnstileRef = useRef<any>(null);
    const { t } = useTranslation();
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [hCaptchaToken, setHcaptchaToken] = useState("");
    const [hcaptchaError, setHcaptchaError] = useState("");

    useEffect(() => {
        if (typeof window !== "undefined") {
            const token = document.cookie.replace(
                /(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/,
                "$1",
            );
            if (token) {
                window.location.href = "/";
            }
        }
    }, []);

    const configuredSiteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;
    const DEV_HCAPTCHA_SITE_KEY = "10000000-ffff-ffff-ffff-000000000001";
    const HCAPTCHA_SITE_KEY =
        configuredSiteKey ||
        (process.env.NODE_ENV === "production" ? "" : DEV_HCAPTCHA_SITE_KEY);

    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            username: "",
            email: "",
            password: "",
            confirmPassword: "",
            tosAccepted: false,
        },
    });

    const encryptPayload = async (payload: string) => {
        const keyData: any = await getApiAuthPublicKey();
        const forgeKey = forge.pki.publicKeyFromPem(keyData.publicKey);
        const encrypted = forgeKey.encrypt(payload, "RSA-OAEP", {
            md: forge.md.sha256.create(),
        });
        return forge.util.encode64(encrypted);
    };

    const generatePassword = () => {
        const chars =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
        let pass = "A" + "o" + "7" + "!";
        for (let i = 0; i < 12; i++)
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        pass = pass
            .split("")
            .sort(() => 0.5 - Math.random())
            .join("");
        form.setValue("password", pass, { shouldValidate: true });
        form.setValue("confirmPassword", pass, { shouldValidate: true });
    };

    const onSubmit = async (values: RegisterFormValues) => {
        setError("");
        const { username, email, password } = values;

        if (!hCaptchaToken) {
            setHcaptchaError("Please complete the security check.");
            return;
        }
        if (!HCAPTCHA_SITE_KEY) {
            setError(
                "hCaptcha is not configured. Set NEXT_PUBLIC_HCAPTCHA_SITE_KEY.",
            );
            return;
        }

        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
        if (!passwordRegex.test(password)) {
            setError(
                "Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character.",
            );
            return;
        }

        setIsLoading(true);

        try {
            const encryptedUsername = await encryptPayload(username);
            const encryptedEmail = await encryptPayload(email);
            const encryptedPassword = await encryptPayload(password);
            const payload = postApiAuthRegisterBody.parse({
                encryptedUsername,
                encryptedEmail,
                encryptedPassword,
                hCaptchaToken,
            });

            const data: any = await postApiAuthRegister(payload);

            if (data.success && data.message) {
                setSuccessMessage(data.message);
                return;
            }

            if (!data?.token) {
                throw new Error(data.error || "Registration failed.");
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

    return (
        <AuthSplitView>
            <Card className="max-w-125 dark:border-white/10 border-black/10 dark:bg-card/60 bg-card/90 backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 opacity-50"></div>
                <CardHeader className="text-center relative z-10 pb-8">
                    <CardTitle className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-foreground to-muted-foreground drop-shadow-sm mb-3">
                        Create Account
                    </CardTitle>
                    <CardDescription className="text-sm font-semibold tracking-widest text-muted-foreground/80 uppercase flex items-center justify-center gap-2">
                        <span className="h-px w-8 bg-gradient-to-r from-transparent to-purple-500/50"></span>
                        {t("auth.register.subtitle")}
                        <span className="h-px w-8 bg-gradient-to-l from-transparent to-pink-500/50"></span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="relative z-10">
                    {successMessage ? (
                        <Alert className="border-emerald-500/50 bg-emerald-500/10">
                            <AlertDescription>
                                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 leading-relaxed">
                                    {successMessage}
                                </p>
                                <div className="mt-4">
                                    <Button asChild>
                                        <Link href="/auth/login">
                                            Go to Login
                                        </Link>
                                    </Button>
                                </div>
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <>
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

                            <Form {...form}>
                                <form
                                    onSubmit={form.handleSubmit(onSubmit)}
                                    className="space-y-4"
                                >
                                    <FormField
                                        control={form.control}
                                        name="username"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    {t(
                                                        "auth.register.username",
                                                    )}
                                                </FormLabel>
                                                <FormControl>
                                                    <div className="relative group/input">
                                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg blur opacity-0 group-focus-within/input:opacity-20 transition duration-500"></div>
                                                        <Input
                                                            type="text"
                                                            placeholder="e.g. GhostProtocol"
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
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    {t("auth.register.email")}
                                                </FormLabel>
                                                <FormControl>
                                                    <div className="relative group/input">
                                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-pink-500 rounded-lg blur opacity-0 group-focus-within/input:opacity-20 transition duration-500"></div>
                                                        <Input
                                                            type="email"
                                                            placeholder="Secure email"
                                                            className="relative dark:bg-background/50 bg-background/80 backdrop-blur-sm dark:border-white/10 border-black/10 focus:border-blue-500/50 transition-colors"
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
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex items-center justify-between">
                                                    <FormLabel>
                                                        {t(
                                                            "auth.register.masterPassword",
                                                        )}
                                                    </FormLabel>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={
                                                            generatePassword
                                                        }
                                                    >
                                                        {t(
                                                            "auth.register.autoGenerate",
                                                        )}
                                                    </Button>
                                                </div>
                                                <FormControl>
                                                    <div className="relative group/input">
                                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg blur opacity-0 group-focus-within/input:opacity-20 transition duration-500"></div>
                                                        <Input
                                                            type={
                                                                showPassword
                                                                    ? "text"
                                                                    : "password"
                                                            }
                                                            placeholder="••••••••"
                                                            onPaste={(e) =>
                                                                e.preventDefault()
                                                            }
                                                            className="pr-10 relative dark:bg-background/50 bg-background/80 backdrop-blur-sm dark:border-white/10 border-black/10 focus:border-pink-500/50 transition-colors"
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
                                                                <EyeOff
                                                                    size={18}
                                                                />
                                                            ) : (
                                                                <Eye
                                                                    size={18}
                                                                />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="confirmPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    {t(
                                                        "auth.register.confirmPassword",
                                                    )}
                                                </FormLabel>
                                                <FormControl>
                                                    <div className="relative group/input">
                                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg blur opacity-0 group-focus-within/input:opacity-20 transition duration-500"></div>
                                                        <Input
                                                            type={
                                                                showPassword
                                                                    ? "text"
                                                                    : "password"
                                                            }
                                                            placeholder="••••••••"
                                                            onPaste={(e) =>
                                                                e.preventDefault()
                                                            }
                                                            className="pr-10 relative dark:bg-background/50 bg-background/80 backdrop-blur-sm dark:border-white/10 border-black/10 focus:border-orange-500/50 transition-colors"
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
                                                                <EyeOff
                                                                    size={18}
                                                                />
                                                            ) : (
                                                                <Eye
                                                                    size={18}
                                                                />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="tosAccepted"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                                                    <FormControl>
                                                        <Checkbox
                                                            className="mt-1"
                                                            checked={
                                                                field.value
                                                            }
                                                            onCheckedChange={(
                                                                checked,
                                                            ) =>
                                                                field.onChange(
                                                                    checked ===
                                                                        true,
                                                                )
                                                            }
                                                        />
                                                    </FormControl>
                                                    <FormLabel className="m-0 cursor-pointer text-sm font-normal text-muted-foreground">
                                                        {t("auth.register.tos")}
                                                    </FormLabel>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

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
                                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 hover:opacity-100 transition-opacity"></div>
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                            {isLoading ? (
                                                <>
                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-background" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                    {t("auth.register.connecting")}
                                                </>
                                            ) : (
                                                t("auth.register.button")
                                            )}
                                        </span>
                                    </Button>
                                </form>
                            </Form>

                            <div className="mt-6 text-center text-sm text-muted-foreground">
                                {t("auth.register.hasAccount")}{" "}
                                <Link
                                    href="/auth/login"
                                    className="underline hover:text-foreground"
                                >
                                    {t("auth.register.loginLink")}
                                </Link>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </AuthSplitView>
    );
}
