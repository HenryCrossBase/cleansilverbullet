import {
    AlertTriangle,
    Gavel,
    Scale,
    Shield,
    TerminalSquare,
} from "lucide-react";

export default function TermsOfService() {
    return (
        <div className="min-h-screen flex flex-col">
            <header className="border-b border-border/10 bg-transparent px-8 py-16 text-center pt-16 pb-8">
                <div className="container">
                    <Gavel
                        size={64}
                        className="mt-0 mx-auto mb-6 text-red-500 filter drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]" 
                    />
                    <h1 className="glow-text font-mono text-6xl font-extrabold tracking-tight mb-4 uppercase tracking-[2px]">
                        Terms of Service
                    </h1>
                    <p className="mx-auto max-w-3xl text-muted-foreground text-xl">
                        Strict governance protocols regulating the Silverbullet
                        Infrastructure. <br/><span className="text-red-500/90 font-medium">Violation of these directives results in immediate systemic termination.</span>
                    </p>
                </div>
            </header>

            <main className="container pt-12 px-4 pb-24 max-w-[1000px] mx-auto">
                <div className="bg-card border border-border/30 rounded-2xl p-8 md:p-16 shadow-sm">
                    <div className="mb-14">
                        <div className="flex items-center gap-4 border-b border-border/30 pb-4 mb-6">
                            <Scale size={32} className="text-cyan-500" />
                            <h2 className="text-2xl md:text-[1.8rem] text-foreground uppercase tracking-[1px] m-0 font-bold">
                                SECTION I: Liability Sanctuary
                            </h2>
                        </div>
                        <p className="text-muted-foreground md:text-xl text-lg leading-[1.8]">
                            The architects, host providers, and administrators
                            of the Silverbullet platform operate strictly as a
                            cryptographic communications and escrow relay.
                            <br />
                            <br />
                            <strong className="text-foreground">
                                1.1 Independence of Trade:
                            </strong>{" "}
                            We explicitly hold zero responsibility or liability
                            for any illegal, inappropriate, or unauthorized
                            deployment of the products, software, or
                            intelligence procured from independent vendors
                            hosted on this matrix.
                            <br />
                            <br />
                            <strong className="text-foreground">
                                1.2 Sole Responsibility:
                            </strong>{" "}
                            By establishing a connection to our servers, you
                            acknowledge that you are singularly liable for
                            integrating these assets in compliance with all
                            applicable local and international statutes. We do
                            not endorse, analyze, or verify the operational
                            intent of any items exchanged.
                        </p>
                    </div>

                    <div className="mb-14">
                        <div className="flex items-center gap-4 border-b border-border/30 pb-4 mb-6">
                            <Shield size={32} className="text-lime-500" />
                            <h2 className="text-2xl md:text-[1.8rem] text-foreground uppercase tracking-[1px] m-0 font-bold">
                                SECTION II: Arbitration & Escrow
                            </h2>
                        </div>
                        <p className="text-muted-foreground md:text-xl text-lg leading-[1.8]">
                            Silverbullet mitigates counter-party risk via a
                            highly regulated escrow framework.
                            <br />
                            <br />
                            <strong className="text-foreground">
                                2.1 Dispute Limitations:
                            </strong>{" "}
                            Refunds and localized order disputes are processed{" "}
                            <span className="text-red-500 font-bold">strictly</span>{" "}
                            through the automated Reports/Disputes pipeline. Any
                            attempts to circumvent the official escrow relay
                            through auxiliary support tickets, Direct Messages,
                            or third-party extortion will result in a permanent
                            account lockdown.
                            <br />
                            <br />
                            <strong className="text-foreground">
                                2.2 Immutable Verdicts:
                            </strong>{" "}
                            When the Arbitration Team steps in to review a
                            dispute, the succeeding verdict is absolute and
                            final. Code logs, conversation telemetry, and
                            product delivery mechanisms will be audited to reach
                            this conclusion.
                        </p>
                    </div>

                    <div className="mb-14">
                        <div className="flex items-center gap-4 border-b border-border/30 pb-4 mb-6">
                            <AlertTriangle size={32} className="text-yellow-500" />
                            <h2 className="text-2xl md:text-[1.8rem] text-foreground uppercase tracking-[1px] m-0 font-bold">
                                SECTION III: Asset Integrity
                            </h2>
                        </div>
                        <p className="text-muted-foreground md:text-xl text-lg leading-[1.8]">
                            Transacting within a cryptographic ecosystem
                            requires fundamental precision.
                            <br />
                            <br />
                            <strong className="text-foreground">
                                3.1 Precision Deposits:
                            </strong>{" "}
                            If you input an incorrect crypto deposit amount,
                            append incorrect blockchain parameters, or transfer
                            assets on an unsupported network layer, Silverbullet
                            cannot and will not issue a refund. Ensure absolute
                            terminal accuracy when copy-pasting the exact
                            blockchain ledger amounts generated.
                            <br />
                            <br />
                            <strong className="text-foreground">
                                3.2 Wallet Disassociations:
                            </strong>{" "}
                            Your internal BLT balance is securely mapped to your
                            localized authentication token. Account sharing,
                            credential leaking, or losing access to your primary
                            authentication keys means permanent forfeiture of
                            your balance.
                        </p>
                    </div>

                    <div>
                        <div className="flex items-center gap-4 border-b border-border/30 pb-4 mb-6">
                            <TerminalSquare size={32} className="text-purple-500" />
                            <h2 className="text-2xl md:text-[1.8rem] text-foreground uppercase tracking-[1px] m-0 font-bold">
                                SECTION IV: System Enforcement
                            </h2>
                        </div>
                        <p className="text-muted-foreground md:text-xl text-lg leading-[1.8]">
                            Registration within the Silverbullet ecosystem
                            strictly validates your absolute subjection to these
                            rules. The Administration reserves the right to
                            autonomously execute account terminations, balance
                            seizures, and total IP sanitization should any user
                            compromise the integrity, security, or stability of
                            the network.
                            <br />
                            <br />
                            If you identify a conflicting parameter within these
                            terms, disconnect from the relay immediately or file
                            a diagnostic query via our{" "}
                            <a
                                href="/contact"
                                className="text-cyan-500 hover:text-cyan-400 transition-colors font-bold no-underline" 
                            >
                                Secure Dispatch Form
                            </a>
                            .
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
