import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, MapPin } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDestinationsPage() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
            },
        }
    );

    // Fetch destinations
    const { data: destinations } = await supabase
        .from('destinations')
        .select('id, name, country, slug, cost, created_at')
        .order('name', { ascending: true });

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manage Destinations</h1>
                    <p className="text-muted-foreground mt-2">
                        View, add, and edit SEO-optimized city pages.
                    </p>
                </div>
                <Link href="/admin/destinations/new">
                    <Button className="flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add Destination
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-muted-foreground" /> All Destinations
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                                <tr>
                                    <th className="px-4 py-3 rounded-tl-md">Destination</th>
                                    <th className="px-4 py-3">Slug</th>
                                    <th className="px-4 py-3">Est. Cost</th>
                                    <th className="px-4 py-3">Added</th>
                                    <th className="px-4 py-3 text-right rounded-tr-md">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {destinations?.map((dest) => (
                                    <tr key={dest.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="font-medium">{dest.name}</div>
                                            <div className="text-muted-foreground">{dest.country}</div>
                                        </td>
                                        <td className="px-4 py-4 text-muted-foreground font-mono text-xs">
                                            {dest.slug}
                                        </td>
                                        <td className="px-4 py-4 text-muted-foreground">
                                            ${dest.cost}
                                        </td>
                                        <td className="px-4 py-4 text-muted-foreground">
                                            {new Date(dest.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex justify-end gap-3">
                                                <Link href={`/admin/destinations/${dest.id}/edit`} className="text-blue-500 hover:text-blue-600 transition-colors" title="Edit Destination">
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                                <form action={`/api/admin/destinations/${dest.id}/delete`} method="POST">
                                                    <button type="submit" className="text-destructive hover:text-destructive/80 transition-colors" title="Delete Destination">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </form>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {(!destinations || destinations.length === 0) && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                            No destinations found. Click "Add Destination" to create one.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
