export default function Tools() {
    return (
        <div className="min-h-screen flex flex-col">
            <header
                className="border-b bg-transparent px-8 py-16 text-center pt-16 pb-8"
                
            >
                <div className="container">
                    <h1 className="text-5xl font-extrabold tracking-tight font-mono">
                        BlackHat <span className="text-silver">Tools</span>
                    </h1>
                    <p className="mx-auto mt-4 max-w-2xl text-muted-foreground text-lg">
                        Secure resources and utilities restricted for
                        Silverbullet members.
                    </p>
                </div>
            </header>

            <main className="container py-16 px-0" >
                <div
                    className="glass-panel p-12 text-center"
                    
                >
                    <h2
                        className="text-silver text-[2rem] mb-4"
                        
                    >
                        Access Denied
                    </h2>
                    <p
                        className="text-secondary mb-8"
                        
                    >
                        You must be logged in to view the proxy chains and combo
                        tools.
                    </p>
                    <button className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                        Authenticate
                    </button>
                </div>
            </main>
        </div>
    );
}
