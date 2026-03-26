import DiscoverClient from './DiscoverClient';
import { destinations } from '@/data/destinations';

export default function DiscoverPage() {
    return <DiscoverClient destinations={destinations} />;
}

