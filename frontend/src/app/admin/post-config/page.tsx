"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { postApiAdminUploadConfigBody } from "@/service/api/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle, Info, Upload } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const configSchema = postApiAdminUploadConfigBody
    .pick({ title: true, description: true })
    .extend({
        title: z.string().min(1, "Title is required."),
        description: z.string().min(1, "Description is required."),
    });

type ConfigFormValues = z.infer<typeof configSchema>;

export default function PostConfig() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState({ type: "", message: "" });

    const form = useForm<ConfigFormValues>({
        resolver: zodResolver(configSchema),
        defaultValues: { title: "", description: "" },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selected = e.target.files[0];
            if (!selected.name.toLowerCase().endsWith(".espk")) {
                setStatus({
                    type: "error",
                    message:
                        "CRITICAL ERROR: Only Silverbullet .espk formats allowed.",
                });
                setFile(null);
                e.target.value = "";
                return;
            }
            setFile(selected);
            setStatus({ type: "", message: "" });
        }
    };

    const handleSubmit = async (values: ConfigFormValues) => {
        if (!file) {
            setStatus({
                type: "error",
                message: "All fields including the .espk file are mandatory.",
            });
            return;
        }

        const formData = new FormData();
        formData.append("title", values.title);
        formData.append("description", values.description);
        formData.append("configFile", file);

        try {
            setStatus({
                type: "info",
                message: "Encrypting and transmitting config...",
            });
            const res = await fetch("/api/admin/upload-config", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Server rejected payload.");
            }

            setStatus({
                type: "success",
                message:
                    "Config successfully posted to the Silverbullet Index.",
            });
            form.reset();
            setFile(null);
        } catch (err: any) {
            setStatus({ type: "error", message: err.message });
        }
    };

    return (
        <div className="container py-16 px-0 max-w-200">
            <Card className="overflow-hidden">
                <CardHeader className="flex flex-row items-center gap-3.75">
                    <Badge
                        variant="outline"
                        className="bg-red-500 text-(--text-primary)"
                    >
                        ADMIN MODULE
                    </Badge>
                    <CardTitle>Publish New Free Config</CardTitle>
                </CardHeader>

                <CardContent className="sb-card-content">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit)}>
                            {status.message && (
                                <Alert
                                    variant={
                                        status.type === "error"
                                            ? "destructive"
                                            : "default"
                                    }
                                    className="mb-6"
                                >
                                    {status.type === "error" && (
                                        <AlertCircle className="h-4 w-4" />
                                    )}
                                    {status.type === "success" && (
                                        <CheckCircle className="h-4 w-4" />
                                    )}
                                    {status.type === "info" && (
                                        <Info className="h-4 w-4" />
                                    )}
                                    <AlertDescription>
                                        {status.message}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="mb-6">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="sb-label block mb-2 text-(--text-secondary)">
                                                Config Title:
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    className="sb-input h-auto"
                                                    placeholder="e.g. Netflix Premium API Checker"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="mb-6">
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="sb-label block mb-2 text-(--text-secondary)">
                                                Description &amp; Features:
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    className="sb-input h-auto resize-y"
                                                    placeholder="List the features, proxy requirements, and capture format..."
                                                    rows={6}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="mb-8 p-8 border-2 border-dashed rounded-lg text-center bg-slate-900 border-slate-700">
                                <Upload className="h-10 w-10 mx-auto mb-4 text-slate-400" />
                                <h3 className="text-(--text-primary) mb-2 font-semibold">
                                    Upload Config File
                                </h3>
                                <p className="text-slate-400 text-sm mb-4">
                                    Strict format constraints applied. MUST be a
                                    verified .espk file.
                                </p>
                                <input
                                    type="file"
                                    accept=".espk"
                                    onChange={handleFileChange}
                                    className="text-(--text-primary)"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700"
                            >
                                Broadcast to Index
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
