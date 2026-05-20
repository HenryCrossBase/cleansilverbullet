'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdBanner from '@/components/AdBanner';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { FileCode2, PlusCircle, Trash2, CalendarDays, FileDown, ShieldCheck } from 'lucide-react';

export default function ConfigsBoard() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newConfig, setNewConfig] = useState({ title: '', description: '' });
  const [configFile, setConfigFile] = useState<File | null>(null);

  useEffect(() => {
    // Check if user is admin
    try {
      const userStr = localStorage.getItem('sb_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.rank === 'ADMIN') setIsAdmin(true);
      }
    } catch (e) {}

    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/configs', {
        headers: {
          'Authorization': `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}`
        }
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('sb_user');
        document.cookie = "sb_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = '/auth/login';
        return;
      }
      if (!res.ok) throw new Error("Blocked");
      const data = await res.json();
      setConfigs(data.configs);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load configs");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConfig.title || !newConfig.description || !configFile) {
      toast.error("Please fill all fields and select a file");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("title", newConfig.title);
      formData.append("description", newConfig.description);
      formData.append("configFile", configFile);

      const res = await fetch('/api/configs/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}`
        },
        body: formData
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      
      toast.success("Config uploaded successfully!");
      setIsModalOpen(false);
      setNewConfig({ title: '', description: '' });
      setConfigFile(null);
      fetchConfigs();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    }
  };

  const handleDeleteConfig = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (!confirm("Are you sure you want to delete this config?")) return;

    try {
      const res = await fetch(`/api/configs/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}`
        }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("Config deleted successfully");
      fetchConfigs();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete config");
    }
  };

  if (loading) return <div className="text-foreground text-center p-20 animate-pulse font-semibold" >Decrypting Config Index...</div>;

  return (
    <div className="max-w-[1200px] min-h-[calc(100vh-var(--navbar-height))] pt-24 pb-16 px-6 sm:px-10 mx-auto" >
      <AdBanner />
      
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6" >
        <div>
          <h1 className="text-4xl font-extrabold text-foreground mb-3 tracking-tight flex items-center gap-3" >
            <ShieldCheck className="w-10 h-10 text-emerald-500" />
            SILVERBULLET INDEX
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl" >Official curated list of unpatched configurations. Operated strictly by Silverbullet core administrators.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="rounded-xl border border-border bg-card/60 shadow-lg px-6 py-3 flex items-center gap-3 backdrop-blur-sm" >
            <span className="text-3xl font-black text-emerald-500" >{configs.length}</span> 
            <span className="font-bold text-sm tracking-widest uppercase text-muted-foreground">Active ESPKS</span>
          </div>

          {isAdmin && (
            <Button onClick={() => setIsModalOpen(true)} className="py-7 px-6 font-bold shadow-xl shadow-emerald-500/20" variant="default">
              <PlusCircle className="w-5 h-5 mr-2" />
              Post Config
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" >
        {configs.length === 0 ? (
           <div className="col-span-full py-20 text-center text-muted-foreground bg-card/30 rounded-2xl border border-dashed border-border">
              <FileCode2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No configs have been posted yet.</p>
           </div>
        ) : (
          configs.map(config => (
            <Link key={config.id} href={`/configs/${config.id}`} className="block group" >
              <Card className="h-full border-border/50 bg-card/40 hover:bg-card/80 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(16,185,129,0.1)] hover:border-emerald-500/30 overflow-hidden relative">
                {/* Accent line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="bg-red-500/10 text-red-500 w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-red-500/20 group-hover:scale-110 transition-transform duration-300" >
                      <FileCode2 className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-foreground leading-tight mb-1 group-hover:text-emerald-400 transition-colors line-clamp-2" >{config.title}</h3>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5" >
                        Posted by <span className="font-bold text-red-500 px-1.5 py-0.5 rounded bg-red-500/10">{config.adminName}</span>
                      </div>
                    </div>
                    {isAdmin && (
                      <button 
                        onClick={(e) => handleDeleteConfig(e, config.id)}
                        className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-md transition-colors"
                        title="Delete Config"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-border/50" >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground" >
                      <CalendarDays className="w-3.5 h-3.5" />
                      {new Date(config.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-xs text-foreground/60 mb-0.5 truncate max-w-[100px]" title={config.fileName}>{config.fileName}</div>
                      <div className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full" >{(config.fileSize / 1024).toFixed(1)} KB</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      {/* Admin Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-lg shadow-2xl border-emerald-500/30">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <FileDown className="w-6 h-6 text-emerald-500" />
                Post New Config
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleCreateConfig} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground/80">Config Title</label>
                  <Input 
                    placeholder="e.g. Netflix Premium API Config" 
                    value={newConfig.title}
                    onChange={e => setNewConfig({...newConfig, title: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground/80">Thread Description (HTML/Text)</label>
                  <Textarea 
                    placeholder="Describe the config, captures, and requirements..." 
                    className="min-h-[120px] resize-y"
                    value={newConfig.description}
                    onChange={e => setNewConfig({...newConfig, description: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground/80">Config File (.espk or .svb)</label>
                  <Input 
                    type="file"
                    accept=".espk,.svb"
                    onChange={e => setConfigFile(e.target.files?.[0] || null)}
                    required
                    className="cursor-pointer file:text-emerald-500 file:font-semibold file:bg-emerald-500/10 file:border-0 file:mr-4 file:px-4 file:py-1 file:rounded-full hover:file:bg-emerald-500/20"
                  />
                  {configFile && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Selected: {configFile.name} ({(configFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 mt-6 border-t border-border/50">
                  <Button type="button" variant="outline" className="w-full" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="w-full font-bold bg-emerald-600 hover:bg-emerald-500 text-white">
                    Publish Config
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
