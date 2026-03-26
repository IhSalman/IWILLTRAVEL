'use client';

import { useEffect } from 'react';
import Clarity from '@microsoft/clarity';

export function ClarityAnalytics() {
    useEffect(() => {
        // Initialize with your specific project ID
        Clarity.init('w1vtjmei45');
    }, []);

    return null;
}
