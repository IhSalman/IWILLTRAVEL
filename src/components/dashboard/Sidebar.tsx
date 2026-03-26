import Link from 'next/link'
import {
    Compass,
    Map,
    History,
    Settings,
    LogOut,
    LayoutDashboard,
    Languages,
    Mic,
    ShieldCheck
} from 'lucide-react'

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
    return (
        <div className="w-64 bg-white border-r h-screen sticky top-0 flex flex-col">
            <div className="p-6 border-b">
                <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-primary">
                    <Compass className="w-6 h-6" />
                    <span>iWillTravel</span>
                </Link>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">Main</p>
                <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <LayoutDashboard className="w-5 h-5 text-gray-400" />
                    <span>Dashboard</span>
                </Link>
                <Link href="/itineraries" className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <Map className="w-5 h-5 text-gray-400" />
                    <span>My Trips</span>
                </Link>

                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 pt-4">Tools</p>
                <Link href="/tools/translate" className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <Languages className="w-5 h-5 text-gray-400" />
                    <span>Translate</span>
                </Link>
                <Link href="/tools/tts" className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <Mic className="w-5 h-5 text-gray-400" />
                    <span>Voice</span>
                </Link>

                {isAdmin && (
                    <>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 pt-4">Admin</p>
                        <Link href="/admin" className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                            <ShieldCheck className="w-5 h-5 text-red-400" />
                            <span>Admin Panel</span>
                        </Link>
                    </>
                )}
            </nav>

            <div className="p-4 border-t mt-auto">
                <Link href="/settings" className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <Settings className="w-5 h-5 text-gray-400" />
                    <span>Settings</span>
                </Link>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-2">
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    )
}
