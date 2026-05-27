import Link from 'next/link';
import { Plane, Facebook, Twitter, Instagram, Linkedin, Youtube } from 'lucide-react';

export function Footer() {
    return (
        <footer className="w-full border-t bg-background pt-16 pb-8">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                    <div className="md:col-span-1">
                        <Link href="/" className="flex items-center space-x-2 mb-4">
                            <div className="bg-primary/10 p-2 rounded-xl">
                                <Plane className="h-6 w-6 text-primary" strokeWidth={2.5} />
                            </div>
                            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                                iWillTravel
                            </span>
                        </Link>
                        <p className="text-sm text-muted-foreground mb-6">
                            Agentic AI travel planning and discovery platform. Find your perfect destination and let AI build your itinerary.
                        </p>
                        <div className="flex space-x-4">
                            <a href="https://facebook.com/iwilltravel" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                                <Facebook className="h-5 w-5" />
                                <span className="sr-only">Facebook</span>
                            </a>
                            <a href="https://twitter.com/iwilltravel" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                                <Twitter className="h-5 w-5" />
                                <span className="sr-only">X (Twitter)</span>
                            </a>
                            <a href="https://instagram.com/iwilltravel" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                                <Instagram className="h-5 w-5" />
                                <span className="sr-only">Instagram</span>
                            </a>
                            <a href="https://linkedin.com/company/iwilltravel" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                                <Linkedin className="h-5 w-5" />
                                <span className="sr-only">LinkedIn</span>
                            </a>
                            <a href="https://youtube.com/@iwilltravel" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                                <Youtube className="h-5 w-5" />
                                <span className="sr-only">YouTube</span>
                            </a>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground mb-4">Features</h3>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li><Link href="/plan-trip" className="hover:text-primary transition-colors">AI Itinerary Planner</Link></li>
                            <li><Link href="/discover" className="hover:text-primary transition-colors">Destination Discovery</Link></li>
                            <li><Link href="/visa-hub" className="hover:text-primary transition-colors">Visa Intelligence</Link></li>
                            <li><Link href="/translate" className="hover:text-primary transition-colors">Translation Tools</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground mb-4">Resources</h3>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li><Link href="/blogs" className="hover:text-primary transition-colors">Travel Blog</Link></li>
                            <li><Link href="/community" className="hover:text-primary transition-colors">Travel Community</Link></li>
                            <li><Link href="/travel-research" className="hover:text-primary transition-colors">Travel Research</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground mb-4">Legal</h3>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                        &copy; {new Date().getFullYear()} iWillTravel. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
