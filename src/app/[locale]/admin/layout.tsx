import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    // Since we use server components for the pages, the layout can be a simple wrapper.
    return (
        <div className="flex min-h-screen flex-col space-y-6 md:space-y-0 md:flex-row">
            <aside className="w-full border-b md:w-64 md:border-r md:border-b-0 bg-muted/40 p-6 flex flex-col gap-4">
                <div className="font-bold text-xl mb-4">Admin Panel</div>
                <nav className="flex flex-col gap-2">
                    <Link href="/admin" className="text-sm font-medium hover:text-primary transition-colors">
                        Dashboard
                    </Link>
                    <Link href="/admin/settings" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                        AI Settings
                    </Link>
                    <Link href="/admin/usage" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                        Usage Analytics
                    </Link>
                    <Link href="/admin/workflows" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                        Workflows
                    </Link>
                    <Link href="/admin/users" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                        Manage Users
                    </Link>
                    <Link href="/admin/destinations" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                        Destinations
                    </Link>
                    <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors mt-8">
                        &larr; Back to App
                    </Link>
                </nav>
            </aside>
            <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
