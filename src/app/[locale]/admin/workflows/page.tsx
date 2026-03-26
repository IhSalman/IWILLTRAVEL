'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wand2, Globe, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface WorkflowResult {
    workflow: string;
    status: 'idle' | 'running' | 'success' | 'error';
    message?: string;
    result?: any;
}

const workflows = [
    {
        id: 'blog-generation',
        name: 'AI Blog Generation',
        description: 'Generate a travel blog post using AI. Optionally specify a topic, or let AI suggest a trending one.',
        icon: Wand2,
        hasParams: true,
    },
    {
        id: 'travel-intelligence',
        name: 'Travel Intelligence Refresh',
        description: 'Regenerate the global travel intelligence dashboard with fresh trending data, flight deals, and insights.',
        icon: Globe,
        hasParams: false,
    },
];

export default function AdminWorkflowsPage() {
    const [results, setResults] = useState<Record<string, WorkflowResult>>({});
    const [blogTopic, setBlogTopic] = useState('');
    const [blogCategory, setBlogCategory] = useState<string>('city');

    const triggerWorkflow = async (workflowId: string) => {
        setResults(prev => ({
            ...prev,
            [workflowId]: { workflow: workflowId, status: 'running' },
        }));

        try {
            const body: any = { workflow: workflowId };
            if (workflowId === 'blog-generation' && blogTopic) {
                body.topic = blogTopic;
                body.category = blogCategory;
            }

            const res = await fetch('/api/admin/workflows/trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (res.ok) {
                setResults(prev => ({
                    ...prev,
                    [workflowId]: {
                        workflow: workflowId,
                        status: 'success',
                        message: `Successfully completed!`,
                        result: data.result,
                    },
                }));
            } else {
                setResults(prev => ({
                    ...prev,
                    [workflowId]: {
                        workflow: workflowId,
                        status: 'error',
                        message: data.error || 'Failed',
                    },
                }));
            }
        } catch (err: any) {
            setResults(prev => ({
                ...prev,
                [workflowId]: {
                    workflow: workflowId,
                    status: 'error',
                    message: err.message || 'Network error',
                },
            }));
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Workflow Control</h1>
                <p className="text-muted-foreground mt-2">
                    Manually trigger AI workflows and content generation pipelines.
                </p>
            </div>

            <div className="grid gap-6">
                {workflows.map((wf) => {
                    const result = results[wf.id];
                    const isRunning = result?.status === 'running';
                    const Icon = wf.icon;

                    return (
                        <Card key={wf.id}>
                            <CardHeader className="flex flex-row items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <Icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">{wf.name}</CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">{wf.description}</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Parameters for blog generation */}
                                {wf.id === 'blog-generation' && (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div>
                                            <label className="text-sm font-medium mb-1 block">Topic (optional)</label>
                                            <input
                                                type="text"
                                                value={blogTopic}
                                                onChange={(e) => setBlogTopic(e.target.value)}
                                                placeholder="e.g., Hidden Gems of Bali"
                                                className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium mb-1 block">Category</label>
                                            <select
                                                value={blogCategory}
                                                onChange={(e) => setBlogCategory(e.target.value)}
                                                className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            >
                                                <option value="city">City</option>
                                                <option value="country">Country</option>
                                                <option value="wonder">Wonder</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => triggerWorkflow(wf.id)}
                                        disabled={isRunning}
                                        className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isRunning ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Running...
                                            </>
                                        ) : (
                                            <>Trigger {wf.name}</>
                                        )}
                                    </button>

                                    {result?.status === 'success' && (
                                        <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                                            <CheckCircle className="h-4 w-4" />
                                            {result.message}
                                        </span>
                                    )}
                                    {result?.status === 'error' && (
                                        <span className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                                            <XCircle className="h-4 w-4" />
                                            {result.message}
                                        </span>
                                    )}
                                </div>

                                {/* Show result details */}
                                {result?.result && (
                                    <div className="p-3 bg-muted/50 rounded-lg">
                                        <pre className="text-xs whitespace-pre-wrap font-mono overflow-x-auto max-h-40">
                                            {JSON.stringify(result.result, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
