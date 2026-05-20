'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [newUsername, setNewUsername] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [isLoading, setIsLoading] = useState(false);
  
  const [twoFactorSetup, setTwoFactorSetup] = useState<{ secret: string, qrCodeUrl: string } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [passwordFor2FA, setPasswordFor2FA] = useState('');

  useEffect(() => {

    const fetchUser = async () => {
      try {
        const res = await fetch('/api/user/me', {
          headers: {
            'Authorization': `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          router.push('/auth/login');
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchUser();
  }, [router]);

  const handleChangeUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: '', msg: '' });
    if (!newUsername) return;

    if (user.credits < 200) {
      setStatus({ type: 'error', msg: 'Insufficient Bullets. 200 USD required.' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/user/change-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}`
        },
        body: JSON.stringify({ newUsername })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatus({ type: 'success', msg: 'Phantom Protocol engaged. Username altered.' });
      setUser({ ...user, username: newUsername, credits: user.credits - 200 });
      setNewUsername('');
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    if (file.size > 2 * 1024 * 1024) {
      setStatus({ type: 'error', msg: 'Upload Error: Avatar must be under 2MB.' });
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatus({ type: 'success', msg: 'Avatar updated securely on the Silverbullet drive.' });
      setUser({ ...user, avatarUrl: data.avatarUrl });
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    }
  };

  const handleGenerate2FA = async () => {
    try {
      const res = await fetch('/api/user/2fa/generate', {
        headers: { 'Authorization': `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTwoFactorSetup(data);
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    }
  };

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/user/2fa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}`
        },
        body: JSON.stringify({ code: twoFactorCode, secret: twoFactorSetup?.secret })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setStatus({ type: 'success', msg: '2FA Enabled Successfully.' });
      setUser({ ...user, twoFactorEnabled: true });
      setTwoFactorSetup(null);
      setTwoFactorCode('');
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/user/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}`
        },
        body: JSON.stringify({ password: passwordFor2FA, code: twoFactorCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setStatus({ type: 'success', msg: '2FA Disabled.' });
      setUser({ ...user, twoFactorEnabled: false });
      setPasswordFor2FA('');
      setTwoFactorCode('');
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    }
  };

  if (!user) return <div className="text-center p-20 text-(--text-primary)" >Decyphering Auth Sequence...</div>;

  return (
    <div className="mobile-stack py-8 px-12 gap-8 grid grid-cols-[minmax(300px,_1fr)_2fr]" >
      
      {/* Left Column - Generic Info */}
      <div className="bg-(--bg-secondary) border border-(--border-color) rounded-lg p-8 text-center h-fit" >
        <div className="w-30 h-30 rounded-full bg-(--bg-secondary) mt-0 mx-auto mb-6 border-[3px] border-(--border-color) overflow-hidden" >
          {user.avatarUrl ? (
            <Image src={`/${user.avatarUrl}`} width={120} height={120} className="w-full h-full object-cover"  alt="Avatar" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-(--text-muted) text-[2.5rem] font-semibold" >?</div>
          )}
        </div>
        
        <h1 className="text-(--text-primary) text-[1.8rem] mb-2" >{user.username}</h1>
        
        {/* Simple Text Rank Map */}
        <div className="inline-block py-1 px-4 text-[0.8rem] font-semibold tracking-[2px] rounded mb-8 bg-(--text-primary) text-(--bg-primary) text-shadow-none" >
          {user.rank}
        </div>

        <div className="text-left bg-[rgba(0,0,0,0.5)] p-4 rounded-md text-[0.9rem] text-(--text-secondary)" >
          <div className="flex justify-between mb-2" >
            <span>Digital Bullets:</span> <strong className="text-(--text-primary)" >{user.credits}</strong>
          </div>
          <div className="flex justify-between mb-2" >
            <span>Total Posts:</span> <strong className="text-(--text-primary)" >0</strong>
          </div>
          <div className="flex justify-between" >
            <span>Last Traced:</span> <strong className="text-(--text-primary)" >{new Date(user.lastOnline).toLocaleDateString()}</strong>
          </div>
        </div>

        <div className="mt-8" >
          <label className="block bg-(--text-primary) text-(--bg-primary) p-[0.8rem] rounded cursor-pointer text-[0.9rem] font-semibold" >
            Upload Avatar (Max 2MB)
            <input type="file" accept="image/png, image/jpeg, image/webp" onChange={handleAvatarUpload} className="hidden"  />
          </label>
        </div>
      </div>
      <div className="flex flex-col gap-8" >
        
        {/* Ledger and Deposit Box */}
        <div className="bg-(--bg-secondary) border border-(--border-color) rounded-lg overflow-hidden" >
          <div className="bg-(--bg-secondary) p-6 border-b border-b-(--border-color)" >
            <h2 className="text-[1.2rem] text-(--text-primary) m-0" >Financial Terminal & Ledger</h2>
          </div>
          <div className="p-8" >
            <div className="flex justify-between items-center bg-(--bg-secondary) border border-(--border-color) p-8 rounded-lg" >
              <div>
                <span className="text-(--text-muted) text-[0.9rem] uppercase tracking-[1px]" >Available Balance</span>
                <div className="text-5xl text-(--text-primary) font-semibold font-mono" >{user.credits} <span className="text-[1.2rem] text-(--text-primary)" >Bullets</span></div>
                <div className="text-(--text-muted) text-[0.8rem]" >Value: ${user.credits} USD</div>
              </div>
              <div>
                <button className="bg-(--text-primary) text-(--bg-primary) border-0 py-4 px-8 font-semibold text-[1.1rem] rounded cursor-pointer" >DEPOSIT CRYPTO</button>
              </div>
            </div>
          </div>
        </div>

        {status.msg && (
          <div className="bg-(--bg-tertiary) border border-(--border-color) text-(--text-primary) p-4 rounded font-semibold" >
            {status.msg}
          </div>
        )}

        {/* Action Panel */}
        <div className="bg-(--bg-secondary) border border-(--border-color) rounded-lg overflow-hidden" >
          <div className="bg-(--bg-secondary) p-6 border-b border-b-(--border-color)" >
            <h2 className="text-[1.2rem] text-(--text-primary) m-0" >Identity Management</h2>
          </div>
          <div className="p-8" >
            <form onSubmit={handleChangeUsername} className="flex gap-4 items-center" >
              <div className="flex-1" >
                <label className="block text-(--text-secondary) mb-2 text-[0.85rem]" >New Desired Identity (-200 Bullets)</label>
                <input 
                  type="text" 
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. Neo"
                  className="w-full p-[0.8rem] bg-(--bg-secondary) border border-(--border-color) text-(--text-primary) rounded outline-none" 
                />
              </div>
              <div className="mt-[1.7rem]" >
                <button type="submit" disabled={isLoading} className="bg-(--text-primary) text-(--bg-primary) border-0 py-[0.9rem] px-8 font-semibold rounded cursor-pointer" >Execute Name Change</button>
              </div>
            </form>
            <p className="mt-4 text-[0.8rem] text-(--text-muted)" >* Your old identity will immediately become available in the Silverbullet Index for an intercept. Ensure your wallet has at least 200 Silverbullet Credits (USD) available.</p>
          </div>
        </div>


      </div>
    </div>
  );
}
