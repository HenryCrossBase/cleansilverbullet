'use client';
import KineticText from '@/components/KineticText';
import { CheckCircle2, Star } from 'lucide-react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function VendorShop() {
  const { id } = useParams();
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ticketStatus, setTicketStatus] = useState('');
  const [quantities, setQuantities] = useState<{[key: string]: number}>({});
  const [purchaseSuccessTarget, setPurchaseSuccessTarget] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchShop = async () => {
      try {
        const res = await fetch(`/api/shops/${id}`, {
          headers: {
            'Authorization': `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}`
          }
        });
        if (!res.ok) throw new Error("Blocked");
        const data = await res.json();
        setShop(data.shop);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchShop();
  }, [id]);

  const getCountryCode = (name: string) => {
    if (!name) return null;
    if (name.length === 2) return name.toLowerCase();
    const map: Record<string, string> = { "afghanistan": "af", "albania": "al", "algeria": "dz", "andorra": "ad", "angola": "ao", "argentina": "ar", "armenia": "am", "australia": "au", "austria": "at", "azerbaijan": "az", "bahamas": "bs", "bahrain": "bh", "bangladesh": "bd", "barbados": "bb", "belarus": "by", "belgium": "be", "belize": "bz", "benin": "bj", "bhutan": "bt", "bolivia": "bo", "bosnia": "ba", "botswana": "bw", "brazil": "br", "brunei": "bn", "bulgaria": "bg", "burkina faso": "bf", "burundi": "bi", "cambodia": "kh", "cameroon": "cm", "canada": "ca", "chad": "td", "chile": "cl", "china": "cn", "colombia": "co", "congo": "cg", "costa rica": "cr", "croatia": "hr", "cuba": "cu", "cyprus": "cy", "czechia": "cz", "denmark": "dk", "djibouti": "dj", "dominica": "dm", "dominican republic": "do", "ecuador": "ec", "egypt": "eg", "el salvador": "sv", "estonia": "ee", "ethiopia": "et", "fiji": "fj", "finland": "fi", "france": "fr", "gabon": "ga", "gambia": "gm", "georgia": "ge", "germany": "de", "ghana": "gh", "greece": "gr", "guatemala": "gt", "guinea": "gn", "guyana": "gy", "haiti": "ht", "honduras": "hn", "hungary": "hu", "iceland": "is", "india": "in", "indonesia": "id", "iran": "ir", "iraq": "iq", "ireland": "ie", "israel": "il", "italy": "it", "jamaica": "jm", "japan": "jp", "jordan": "jo", "kazakhstan": "kz", "kenya": "ke", "korea": "kr", "kuwait": "kw", "kyrgyzstan": "kg", "laos": "la", "latvia": "lv", "lebanon": "lb", "liberia": "lr", "libya": "ly", "lithuania": "lt", "luxembourg": "lu", "madagascar": "mg", "malaysia": "my", "maldives": "mv", "mali": "ml", "malta": "mt", "mexico": "mx", "moldova": "md", "monaco": "mc", "mongolia": "mn", "morocco": "ma", "myanmar": "mm", "namibia": "na", "nepal": "np", "netherlands": "nl", "new zealand": "nz", "nicaragua": "ni", "niger": "ne", "nigeria": "ng", "norway": "no", "oman": "om", "pakistan": "pk", "panama": "pa", "paraguay": "py", "peru": "pe", "philippines": "ph", "poland": "pl", "portugal": "pt", "qatar": "qa", "romania": "ro", "russia": "ru", "rwanda": "rw", "saudi arabia": "sa", "senegal": "sn", "serbia": "rs", "singapore": "sg", "slovakia": "sk", "slovenia": "si", "somalia": "so", "south africa": "za", "spain": "es", "sri lanka": "lk", "sudan": "sd", "sweden": "se", "switzerland": "ch", "syria": "sy", "taiwan": "tw", "tajikistan": "tj", "tanzania": "tz", "thailand": "th", "tunisia": "tn", "turkey": "tr", "turkmenistan": "tm", "uganda": "ug", "ukraine": "ua", "united arab emirates": "ae", "united kingdom": "gb", "uk": "gb", "united states": "us", "usa": "us", "uruguay": "uy", "uzbekistan": "uz", "venezuela": "ve", "vietnam": "vn", "yemen": "ye", "zambia": "zm", "zimbabwe": "zw"};
    return map[name.toLowerCase()] || null;
  };

  const getCountry = (p: any) => {
    let raw = "Global";
    if (p.country && p.country !== "Global" && p.country !== "All") raw = p.country;
    else {
      const match = p.description?.match(/Country\s*=\s*([^,]+)/i);
      if (match) raw = match[1].trim();
    }
    return raw;
  };

  const handlePurchase = async (productId: string) => {
    try {
      const amount = quantities[productId] || 1;
      const res = await fetch(`/api/market/purchase/${productId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}` 
        },
        body: JSON.stringify({ amount })
      });
      const data = await res.json();
      if (res.ok) {
        setPurchaseSuccessTarget(productId);
      } else {
        toast.error('Something went wrong');
      }
    } catch (err) {
      toast.error('Something went wrong');
    }
  };

  if (loading) return <div className="text-(--text-primary) text-center p-20" >Establishing secure connection to Vendor...</div>;
  if (!shop) return <div className="text-(--text-primary) text-center p-20 font-semibold" >404 STOREFRONT NOT FOUND</div>;

  return (
    <div className="px-6 pb-12 pt-24 sm:px-12 md:px-16 md:pt-28 max-w-[1400px] mx-auto" >
      
      {}
      <div className="rounded-3xl border border-border bg-card/60 shadow-2xl backdrop-blur-xl overflow-hidden mb-12 relative" style={{ backgroundImage: shop.bannerUrl ? `url(${shop.bannerUrl})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        {shop.bannerUrl && <div className="absolute inset-0 bg-background/85 z-0" ></div>}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-primary to-blue-500 z-1" ></div>
        
        <div className="flex flex-col md:flex-row gap-8 items-start relative z-10 p-8 md:p-12" >
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-background border border-border/50 shadow-inner overflow-hidden shrink-0" >
             <Image src={shop.avatarUrl && shop.avatarUrl !== '/default-avatar.png' ? (shop.avatarUrl.startsWith('http') ? shop.avatarUrl : `/${shop.avatarUrl}`) : '/default-avatar.png'} width={120} height={120} unoptimized className="w-full h-full object-cover"  alt="Store Avatar" onError={(e) => { e.currentTarget.src='/default-avatar.png'; }} />
          </div>
          <div className="flex-1 w-full" >
            <div className="flex flex-col md:flex-row justify-between items-start gap-6" >
              <div>
                <div className="flex items-center gap-3 mb-2" >
                  <h1 className="m-0" >
                    <KineticText 
                      text={shop.shopName} 
                      effect={shop.storeEffect || 'none'} 
                      className={`${`${shop.storeEffect && shop.storeEffect !== 'none' && !shop.storeEffect.startsWith('Kinetic:') ? shop.storeEffect : ''} truncate`} text-3xl md:text-[2.5rem] font-bold tracking-tight`} 
                      style={{ color: (shop.storeColor === '#ffffff' || !shop.storeColor) ? 'var(--text-primary)' : shop.storeColor, textShadow: (!shop.storeEffect || shop.storeEffect === 'none') ? `0 0 10px ${(shop.storeColor === '#ffffff' || !shop.storeColor) ? 'var(--text-primary)' : shop.storeColor}40` : undefined }} 
                    />
                  </h1>
                  {shop.isTrusted && <span className="flex items-center filter-[drop-shadow(0_0_5px_rgba(59,_130,_246,_0.5))]"  title="Verified Store"><svg width="28" height="28" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#3b82f6" /><path fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8 12.5l3 3 5-6" /></svg></span>}
                </div>
                <p className="text-muted-foreground text-base md:text-lg mb-6 max-w-2xl leading-relaxed" >{shop.shopDescription}</p>
              </div>
              <div className="text-left md:text-right flex flex-col gap-3" >
                <div className="text-muted-foreground text-sm" >Store Visited <strong className="text-foreground text-base" >{shop.views}</strong> times</div>
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 py-1.5 px-3 rounded-full text-xs font-bold tracking-wide w-fit md:ml-auto" >
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" ></div>
                  ACTIVE VENDOR
                </div>
              </div>
            </div>
            
            {ticketStatus && (
              <div className="bg-(--bg-tertiary) text-(--text-primary) p-4 border border-(--border-color) rounded mb-4 font-semibold" >
                {ticketStatus}
              </div>
            )}
            
            <div className="flex flex-col md:flex-row gap-6 border-t border-border/50 pt-6 mt-4" >
              <div className="text-muted-foreground text-sm" >Vendor Alias: <strong className="text-foreground" ><a href={`/user/${shop.owner.username}`} className="text-primary hover:underline underline-offset-4" >{shop.owner.username}</a></strong></div>
              <div className="text-muted-foreground text-sm" >Clearance: <strong className="text-foreground" >{shop.owner.rank}</strong></div>
              <div className="text-muted-foreground text-sm" >Last Traced: <strong className="text-foreground" >{new Date(shop.owner.lastOnline).toLocaleDateString()}</strong></div>
            </div>
          </div>
        </div>
      </div>

      {}
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4" >
        <h2 className="text-2xl font-bold tracking-tight m-0" >AVAILABLE SECURE GOODS ({shop.products.length})</h2>
        <input 
          type="text" 
          placeholder="Search items or info..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="py-2.5 px-4 bg-background/50 border border-border/50 text-foreground rounded-lg w-full md:w-80 outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm" 
        />
      </div>
      
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3" >
        {shop.products.filter((p: any) => p.productName.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase())).map((product: any) => (
          <div key={product.id} className="rounded-xl border border-border/50 bg-card/40 shadow-md backdrop-blur-sm overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_8px_30px_rgba(var(--primary),0.15)]" >
            <div className="p-5 flex-1" >
              <div className="flex justify-between items-start gap-4 mb-3" >
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-bold leading-tight">{product.productName}</h3>
                  {(() => {
                    const countryName = getCountry(product);
                    const code = getCountryCode(countryName);
                    return (
                      <div className="flex items-center gap-1.5 w-fit bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded text-blue-400 text-[0.65rem] font-bold uppercase tracking-widest shadow-sm">
                        {code ? (
                          <img src={`https://flagcdn.com/w20/${code}.png`} alt={countryName} className="h-3 w-4 rounded-sm object-cover" />
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        )}
                        {countryName}
                      </div>
                    );
                  })()}
                </div>
                
                {}
                {parseFloat(product.averageScore) > 0 && (
                  <div className="flex items-center gap-1 bg-background/80 px-2 py-1 rounded-md border border-border/50 shadow-sm shrink-0" >
                    <span className="text-amber-500 flex items-center" ><Star fill="currentColor" size={14} /></span>
                    <strong className="text-foreground text-xs" >{product.averageScore}</strong>
                    <span className="text-muted-foreground text-[0.65rem]" >({product.totalReviews})</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed mb-4" >{product.description}</p>
            </div>

            {}
            <div className="bg-muted/30 border-t border-border/50 p-5 pt-4" >
              <div className="flex justify-between items-end gap-4 mb-4" >
                <div>
                  <div className="text-muted-foreground text-[0.65rem] uppercase tracking-widest font-semibold mb-1" >Lines</div>
                  <input 
                     type="number" 
                     min="1" 
                     max={product.stock}
                     value={quantities[product.id] || 1}
                     onChange={(e) => {
                       let val = parseInt(e.target.value, 10);
                       if (isNaN(val) || val < 1) val = 1;
                       if (val > product.stock) val = product.stock;
                       setQuantities(prev => ({ ...prev, [product.id]: val }));
                     }}
                     className="bg-background border border-border/50 text-foreground py-1.5 px-3 rounded-md w-20 font-mono outline-none focus:ring-1 focus:ring-primary shadow-sm text-sm" 
                  />
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground text-[0.65rem] uppercase tracking-widest font-semibold mb-1" >Total Price</div>
                  <div className="text-foreground text-2xl font-bold leading-none" >{product.price * (quantities[product.id] || 1)} <span className="text-xs text-muted-foreground font-normal" >BLT</span></div>
                </div>
              </div>
              <div className="flex gap-3 w-full" >
                <button 
                  className="w-full py-2 px-4 rounded-lg font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md active:scale-[0.98]"
                  onClick={() => handlePurchase(product.id)}
                >
                  Buy {quantities[product.id] || 1}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {}
      {purchaseSuccessTarget && (
        <div className="fixed top-0 left-0 w-full h-full bg-[rgba(0,0,0,0.8)] backdrop-filter-[blur(5px)] flex items-center justify-center z-100" >
          <div className="bg-(--bg-secondary) border border-(--border-color) w-112.5 rounded-lg p-10 text-center" >
            <div className="text-(--text-primary) mb-4 flex justify-center" ><CheckCircle2 size={48} /></div>
            <h2 className="text-(--text-primary) text-[1.8rem] mt-0 mr-0 mb-4 pl-0 font-mono" >Payment Successful</h2>
            <p className="text-slate-300 mb-8 leading-normal text-[0.95rem]" >
              Your order has been fully processed and the encrypted log is now waiting for you in your Purchased Logs section. 
            </p>
            <div className="flex gap-2.5" >
              <button onClick={() => setPurchaseSuccessTarget(null)} className="flex-1 bg-transparent border border-(--border-color) text-(--text-muted) p-[0.8rem] rounded-lg cursor-pointer font-semibold" >CLOSE</button>
              <button 
                onClick={() => router.push('/purchases')} 
                className="flex-[2] bg-(--text-primary) text-(--bg-primary) border-0 p-[0.8rem] rounded-lg cursor-pointer font-semibold uppercase tracking-[1px]" 
              >
                View Your Item
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
