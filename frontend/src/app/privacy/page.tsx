import { Shield } from "lucide-react";

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen flex flex-col">
            <header
                className="border-b bg-transparent px-8 py-16 text-center pt-24 pb-16"
                
            >
                <div className="container">
                    <Shield
                        color="#fafafa"
                        size={64}
                        className="mt-0 mx-auto mb-6 filter-[drop-shadow(0_0_20px_rgba(250,250,250,0.4))]" 
                    />
                    <h1
                        className="glow-text font-mono text-5xl font-extrabold tracking-tight text-[3.5rem] mb-6 uppercase tracking-[2px]"
                        
                    >
                        Privacy Policy
                    </h1>
                    <p
                        className="mx-auto max-w-3xl text-muted-foreground max-w-200 text-[1.2rem] leading-[1.8]"
                        
                    >
                        Operational Security (OpSec) is our highest priority.
                        Read how we protect your absolute anonymity.
                    </p>
                </div>
            </header>

            <main
                className="container pt-8 px-0 pb-24 max-w-225"
                
            >
                <div
                    className="glass-panel p-16 rounded-xl bg-[linear-gradient(145deg,_#09090b_0%,_#18181b_100%)] border border-(--border-color)"
                    
                >
                    <h2
                        className="text-(--text-primary) text-[1.8rem] mb-6 border-b border-b-[rgba(255,255,255,0.1)] pb-[0.8rem]" 
                    >
                        1. Zero Log Policy
                    </h2>
                    <p
                        className="text-(--text-muted) leading-[1.8] text-[1.1rem] mb-10" 
                    >
                        Silverbullet does not collect, track, or persist
                        identifying data. We do not log IP addresses, browser
                        agents, or session footprints beyond what is strictly
                        required to maintain active authentication tokens. Once
                        an encrypted session is terminated, all transient data
                        is annihilated.
                    </p>

                    <h2
                        className="text-(--text-primary) text-[1.8rem] mb-6 border-b border-b-[rgba(255,255,255,0.1)] pb-[0.8rem]" 
                    >
                        2. Data Encryption
                    </h2>
                    <p
                        className="text-(--text-muted) leading-[1.8] text-[1.1rem] mb-10" 
                    >
                        All internal communications, platform interactions,
                        support tickets, and escrow vault transfers are heavily
                        encrypted. We utilize industry-standard cryptographic
                        hashes for credential storage. We cannot—and will
                        not—read or extract your master passwords.
                    </p>

                    <h2
                        className="text-(--text-primary) text-[1.8rem] mb-6 border-b border-b-[rgba(255,255,255,0.1)] pb-[0.8rem]" 
                    >
                        3. Third-Party Sharing
                    </h2>
                    <p
                        className="text-(--text-muted) leading-[1.8] text-[1.1rem] mb-10" 
                    >
                        Silverbullet is a completely isolated, Zero-Trust
                        environment. We employ absolutely zero third-party
                        tracking scripts, analytics engines (like Google
                        Analytics), or external advertisement modules. Your
                        usage data is strictly confined within our encrypted
                        infrastructure and is never sold, shared, or exposed to
                        outside entities.
                    </p>

                    <h2
                        className="text-(--text-primary) text-[1.8rem] mb-6 border-b border-b-[rgba(255,255,255,0.1)] pb-[0.8rem]" 
                    >
                        4. Financial Anonymity
                    </h2>
                    <p
                        className="text-(--text-muted) leading-[1.8] text-[1.1rem] mb-10" 
                    >
                        To preserve absolute financial autonomy, we operate
                        strictly using decentralized cryptocurrencies. Your
                        wallet addresses are uniquely generated per transaction
                        and immediately abstracted from your user profile to
                        prevent blockchain tracing.
                    </p>

                    <h2
                        className="text-(--text-primary) text-[1.8rem] mb-6 border-b border-b-[rgba(255,255,255,0.1)] pb-[0.8rem]" 
                    >
                        5. Account Termination & Eradication
                    </h2>
                    <p
                        className="text-(--text-muted) leading-[1.8] text-[1.1rem]" 
                    >
                        Should you choose to leave the Silverbullet ecosystem,
                        you may request full account eradication via the support
                        portal. Activating this protocol will unconditionally
                        wipe your username, cryptographic hashes, active
                        listings, and message history from all active clusters.
                    </p>
                </div>
            </main>
        </div>
    );
}
