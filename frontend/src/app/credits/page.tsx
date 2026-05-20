import {
    BarChart,
    CircleDollarSign,
    Diamond,
    Dices,
    Flag,
    Heart,
    Palette,
    PenTool,
    Pin,
    RefreshCw,
    ShoppingCart,
    Star,
    Trophy,
    User,
} from "lucide-react";

const styles = {
    creditsLayout: "mt-8 flex items-start gap-8",
    sidebar: "w-62.5 shrink-0 overflow-hidden rounded-lg border bg-card",
    menuHeader:
        "border-b bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-4 font-bold text-foreground",
    menuList: "flex flex-col",
    menuItem:
        "flex cursor-pointer items-center gap-2 border-b px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground",
    menuItemActive: "border-l-3 border-l-foreground bg-white/5 text-foreground",
    menuIcon: "text-muted-foreground",
    mainContent: "flex flex-1 flex-col gap-8",
    alertBanner:
        "rounded-md border border-yellow-700 bg-gradient-to-r from-amber-800 to-yellow-700 px-4 py-3 text-center font-semibold text-foreground",
    tablesGrid: "grid grid-cols-1 gap-6 lg:grid-cols-2",
    dataTable: "overflow-hidden rounded-lg border bg-card",
    tableHeader: "bg-blue-900 px-4 py-3 font-bold text-foreground",
    tableRow: "grid grid-cols-[2fr_1fr] border-b px-4 py-3 text-sm",
    tableRowDonation: "grid-cols-[1fr_1fr_1fr_1.5fr]",
    tableRowHeader: "bg-white/5 font-semibold text-muted-foreground",
    userRed: "font-bold text-red-500",
    userGreen: "font-bold text-emerald-500",
    userPurple: "font-bold text-violet-500",
    userSilver: "font-bold text-foreground",
    creditAmount: "text-right font-mono text-muted-foreground",
    dateText: "text-right text-xs text-muted-foreground",
};

export default function CreditsDashboard() {
    return (
        <div className="min-h-screen flex flex-col">
            <header
                className="border-b bg-transparent px-8 py-8 text-center pt-8 pb-4"
                
            >
                <div className="container">
                    <h1
                        className="glow-text font-mono text-5xl font-extrabold tracking-tight text-[2.5rem]"
                        
                    >
                        <span className="text-silver">SILVERBULLET</span>{" "}
                        ECONOMY
                    </h1>
                </div>
            </header>

            <main className="container pt-4 px-0 pb-12" >
                <div className={styles.alertBanner}>
                    You are not upgraded. Click here to see what you get by
                    upgrading your account!
                </div>

                <div className={styles.creditsLayout}>
                    {}
                    <aside className={styles.sidebar}>
                        <div className={styles.menuHeader}>Menu</div>
                        <div className={styles.menuList}>
                            <div
                                className={`${styles.menuItem} ${styles.menuItemActive}`}
                            >
                                <span className={styles.menuIcon}>
                                    <BarChart size={16} />
                                </span>{" "}
                                Statistics
                            </div>
                            <div className={styles.menuItem}>
                                <span className={styles.menuIcon}>
                                    <Star size={16} />
                                </span>{" "}
                                Daily Credits Rewards
                            </div>
                            <div className={styles.menuItem}>
                                <span className={styles.menuIcon}>
                                    <Heart size={16} />
                                </span>{" "}
                                Donate
                            </div>
                            <div className={styles.menuItem}>
                                <span className={styles.menuIcon}>
                                    <Palette size={16} />
                                </span>{" "}
                                Style Thread
                            </div>
                            <div className={styles.menuItem}>
                                <span className={styles.menuIcon}>
                                    <Flag size={16} />
                                </span>{" "}
                                Purchase Ad Banner
                            </div>
                            <div className={styles.menuItem}>
                                <span className={styles.menuIcon}>
                                    <Pin size={16} />
                                </span>{" "}
                                Sticky Thread
                            </div>
                            <div className={styles.menuItem}>
                                <span className={styles.menuIcon}>
                                    <User size={16} />
                                </span>{" "}
                                Buy Username Items
                            </div>
                            <div className={styles.menuItem}>
                                <span className={styles.menuIcon}>
                                    <Trophy size={16} />
                                </span>{" "}
                                Buy Awards
                            </div>
                            <div className={styles.menuItem}>
                                <span className={styles.menuIcon}>
                                    <CircleDollarSign size={16} />
                                </span>{" "}
                                Buy Credits
                            </div>
                            <div className={styles.menuItem}>
                                <span className={styles.menuIcon}>
                                    <RefreshCw size={16} />
                                </span>{" "}
                                Autobumps shouts
                            </div>
                            <div className={styles.menuItem}>
                                <span className={styles.menuIcon}>
                                    <RefreshCw size={16} />
                                </span>{" "}
                                Autobump threads
                            </div>
                            <div className={styles.menuItem}>
                                <span className={styles.menuIcon}>
                                    <ShoppingCart size={16} />
                                </span>{" "}
                                Awards Marketplace
                            </div>
                            <div className={styles.menuItem}>
                                <span className={styles.menuIcon}>
                                    <PenTool size={16} />
                                </span>{" "}
                                Signature Services
                            </div>
                            <div className={styles.menuItem}>
                                <span className={styles.menuIcon}>
                                    <Dices size={16} />
                                </span>{" "}
                                Lottery
                            </div>
                            <div className={styles.menuItem}>
                                <span className={styles.menuIcon}>
                                    <Diamond size={16} />
                                </span>{" "}
                                Gambling
                            </div>
                        </div>
                    </aside>

                    {}
                    <section className={styles.mainContent}>
                        <div className={styles.tablesGrid}>
                            {}
                            <div className={styles.dataTable}>
                                <div className={styles.tableHeader}>
                                    Richest Users
                                </div>
                                <div
                                    className={`${styles.tableRow} ${styles.tableRowHeader}`}
                                >
                                    <span>User</span>
                                    <span className="text-right" >
                                        Amount
                                    </span>
                                </div>
                                <div className={styles.tableRow}>
                                    <span className={styles.userRed}>
                                        Misak_1
                                    </span>
                                    <span className={styles.creditAmount}>
                                        5,080,000
                                    </span>
                                </div>
                                <div className={styles.tableRow}>
                                    <span className={styles.userGreen}>
                                        Am1nol
                                    </span>
                                    <span className={styles.creditAmount}>
                                        975,000
                                    </span>
                                </div>
                                <div className={styles.tableRow}>
                                    <span className={styles.userSilver}>
                                        Queste
                                    </span>
                                    <span className={styles.creditAmount}>
                                        937,974
                                    </span>
                                </div>
                                <div className={styles.tableRow}>
                                    <span className={styles.userGreen}>
                                        buyacopremium
                                    </span>
                                    <span className={styles.creditAmount}>
                                        552,558
                                    </span>
                                </div>
                                <div className={styles.tableRow}>
                                    <span className={styles.userGreen}>
                                        HughLee
                                    </span>
                                    <span className={styles.creditAmount}>
                                        500,000
                                    </span>
                                </div>
                                <div className={styles.tableRow}>
                                    <span className={styles.userSilver}>
                                        sorrow
                                    </span>
                                    <span className={styles.creditAmount}>
                                        494,715
                                    </span>
                                </div>
                                <div className={styles.tableRow}>
                                    <span className={styles.userRed}>
                                        WaveProxies
                                    </span>
                                    <span className={styles.creditAmount}>
                                        389,589
                                    </span>
                                </div>
                            </div>

                            {}
                            <div className={styles.dataTable}>
                                <div className={styles.tableHeader}>
                                    Last Donations
                                </div>
                                <div
                                    className={`${styles.tableRow} ${styles.tableRowDonation} ${styles.tableRowHeader}`}
                                >
                                    <span>From</span>
                                    <span>To</span>
                                    <span className="text-right" >
                                        Amount
                                    </span>
                                    <span className="text-right" >
                                        Date
                                    </span>
                                </div>
                                <div
                                    className={`${styles.tableRow} ${styles.tableRowDonation}`}
                                >
                                    <span className={styles.userGreen}>
                                        Spiderman
                                    </span>
                                    <span className={styles.userRed}>
                                        Eminem
                                    </span>
                                    <span className={styles.creditAmount}>
                                        250
                                    </span>
                                    <span className={styles.dateText}>
                                        10 April, 2026
                                    </span>
                                </div>
                                <div
                                    className={`${styles.tableRow} ${styles.tableRowDonation}`}
                                >
                                    <span className={styles.userGreen}>
                                        Lunario
                                    </span>
                                    <span className={styles.userSilver}>
                                        Views
                                    </span>
                                    <span className={styles.creditAmount}>
                                        500
                                    </span>
                                    <span className={styles.dateText}>
                                        10 April, 2026
                                    </span>
                                </div>
                                <div
                                    className={`${styles.tableRow} ${styles.tableRowDonation}`}
                                >
                                    <span className={styles.userSilver}>
                                        FireBender
                                    </span>
                                    <span className={styles.userPurple}>
                                        pipin
                                    </span>
                                    <span className={styles.creditAmount}>
                                        20,000
                                    </span>
                                    <span className={styles.dateText}>
                                        09 April, 2026
                                    </span>
                                </div>
                                <div
                                    className={`${styles.tableRow} ${styles.tableRowDonation}`}
                                >
                                    <span className={styles.userPurple}>
                                        rehankhan
                                    </span>
                                    <span className={styles.userSilver}>
                                        lightboy
                                    </span>
                                    <span className={styles.creditAmount}>
                                        200
                                    </span>
                                    <span className={styles.dateText}>
                                        09 April, 2026
                                    </span>
                                </div>
                                <div
                                    className={`${styles.tableRow} ${styles.tableRowDonation}`}
                                >
                                    <span className={styles.userGreen}>
                                        Dream
                                    </span>
                                    <span className={styles.userRed}>
                                        Eminem
                                    </span>
                                    <span className={styles.creditAmount}>
                                        200
                                    </span>
                                    <span className={styles.dateText}>
                                        08 April, 2026
                                    </span>
                                </div>
                                <div
                                    className={`${styles.tableRow} ${styles.tableRowDonation}`}
                                >
                                    <span className={styles.userSilver}>
                                        telus
                                    </span>
                                    <span className={styles.userSilver}>
                                        XMR
                                    </span>
                                    <span className={styles.creditAmount}>
                                        150
                                    </span>
                                    <span className={styles.dateText}>
                                        08 April, 2026
                                    </span>
                                </div>
                                <div
                                    className={`${styles.tableRow} ${styles.tableRowDonation}`}
                                >
                                    <span className={styles.userSilver}>
                                        Lunario
                                    </span>
                                    <span className={styles.userGreen}>
                                        BeastShop
                                    </span>
                                    <span className={styles.creditAmount}>
                                        200
                                    </span>
                                    <span className={styles.dateText}>
                                        07 April, 2026
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
