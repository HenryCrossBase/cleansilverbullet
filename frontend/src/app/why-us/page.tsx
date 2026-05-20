import { EyeOff, Lock, Scale, Shield } from "lucide-react";
import Link from "next/link";

export default function WhyUs() {
    return (
        <div className="min-h-screen flex flex-col">
            <header
                className="border-b bg-transparent px-8 py-16 text-center pt-24 pb-16"
                
            >
                <div className="container">
                    <h1
                        className="glow-text font-mono text-6xl font-extrabold tracking-tight text-7xl mb-6 uppercase tracking-[3px]"
                        
                    >
                        Why Choose Silverbullet?
                    </h1>
                    <p
                        className="mx-auto max-w-3xl text-muted-foreground max-w-200 text-2xl leading-[1.8]"
                        
                    >
                        We built a safe place where you stay anonymous, your
                        data is locked and totally secure, and you never get
                        scammed when buying or selling.
                    </p>
                </div>
            </header>

            <main className="container pt-8 px-0 pb-24" >
                <div
                    className="grid gap-8 grid-cols-[repeat(auto-fit,_minmax(350px,_1fr))]" 
                >
                    <div
                        className="glass-panel p-10 rounded-xl bg-[linear-gradient(145deg,_#09090b_0%,_#18181b_100%)] border border-(--border-color) relative overflow-hidden"
                        
                    >
                        <div
                            className="absolute top-[-10px] right-[-10px] opacity-10" 
                        >
                            <EyeOff size={100} />
                        </div>
                        <EyeOff
                            color="#06b6d4"
                            size={36}
                            className="mb-6" 
                        />
                        <h3
                            className="text-(--text-primary) text-[1.8rem] mb-4 tracking-[1px]" 
                        >
                            Total Anonymity
                        </h3>
                        <p
                            className="text-(--text-muted) leading-[1.7] text-[1.2rem]" 
                        >
                            We don't track your real identity. We delete
                            tracking data and keep zero logs, so whether you are
                            a big seller or a casual buyer, your private life
                            stays 100% hidden.
                        </p>
                    </div>

                    <div
                        className="glass-panel p-10 rounded-xl bg-[linear-gradient(145deg,_#09090b_0%,_#18181b_100%)] border border-(--border-color) relative overflow-hidden"
                        
                    >
                        <div
                            className="absolute top-[-10px] right-[-10px] opacity-10" 
                        >
                            <Lock size={100} />
                        </div>
                        <Lock
                            color="#3b82f6"
                            size={36}
                            className="mb-6" 
                        />
                        <h3
                            className="text-(--text-primary) text-[1.8rem] mb-4 tracking-[1px]" 
                        >
                            Top Level Security
                        </h3>
                        <p
                            className="text-(--text-muted) leading-[1.7] text-[1.2rem]" 
                        >
                            We use strong encryption for everything. Private
                            messages, sales history, and files are fully
                            encrypted. We can't read your stuff, and neither can
                            anyone else.
                        </p>
                    </div>

                    <div
                        className="glass-panel p-10 rounded-xl bg-[linear-gradient(145deg,_#09090b_0%,_#18181b_100%)] border border-(--border-color) relative overflow-hidden"
                        
                    >
                        <div
                            className="absolute top-[-10px] right-[-10px] opacity-10" 
                        >
                            <Scale size={100} />
                        </div>
                        <Scale
                            color="#84cc16"
                            size={36}
                            className="mb-6" 
                        />
                        <h3
                            className="text-(--text-primary) text-[1.8rem] mb-4 tracking-[1px]" 
                        >
                            Safe Escrow Protection
                        </h3>
                        <p
                            className="text-(--text-muted) leading-[1.7] text-[1.2rem]" 
                        >
                            No more getting scammed. When you buy something, we
                            hold the money safely until you receive your
                            product. If something breaks, our support team steps
                            in to refund you.
                        </p>
                    </div>
                </div>

                <div
                    className="glass-panel mt-16 py-16 px-12 rounded-xl border border-(--border-color) bg-(--bg-secondary) text-center"
                    
                >
                    <Shield
                        color="#fafafa"
                        size={48}
                        className="mt-0 mx-auto mb-8 filter-[drop-shadow(0_0_15px_rgba(250,250,250,0.3))]" 
                    />
                    <h2
                        className="text-(--text-primary) text-[2.5rem] mb-6 uppercase tracking-[2px]" 
                    >
                        A Safe Place to Trade
                    </h2>
                    <p
                        className="text-(--text-muted) max-w-225 mx-auto text-[1.3rem] leading-[1.9]" 
                    >
                        The normal internet is tracked and unsafe. We built
                        Silverbullet specifically to give people a safe trading
                        floor where nobody is watching. We don't ask who you
                        are, we just make sure your money and your items are
                        exchanged nicely and effectively. Start enjoying the
                        platform safely!
                    </p>
                    <div className="mt-12" >
                        <Link href="/market">
                            <button
                                className="py-[1.2rem] px-14 bg-(--text-primary) text-(--bg-primary) border-0 rounded text-[1.3rem] font-extrabold tracking-[1px] uppercase cursor-pointer transition-all duration-200 shadow-[0_0_20px_rgba(250,250,250,0.3)]" 
                            >
                                Explore Marketplace
                            </button>
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
