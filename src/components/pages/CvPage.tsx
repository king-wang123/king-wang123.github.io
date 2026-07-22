'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowTopRightOnSquareIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { CvPageConfig } from '@/types/page';
import { useMessages } from '@/lib/i18n/useMessages';

export default function CvPage({ config }: { config: CvPageConfig }) {
    const messages = useMessages();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [height, setHeight] = useState(1200);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        let observer: ResizeObserver | undefined;

        const syncHeight = () => {
            const document = iframe.contentDocument;
            if (!document) return;

            const nextHeight = Math.max(
                document.documentElement.scrollHeight,
                document.body?.scrollHeight || 0,
            );
            if (nextHeight > 0) setHeight(nextHeight);
        };

        const handleLoad = () => {
            syncHeight();
            observer?.disconnect();
            const body = iframe.contentDocument?.body;
            if (body) {
                observer = new ResizeObserver(syncHeight);
                observer.observe(body);
            }
        };

        iframe.addEventListener('load', handleLoad);
        return () => {
            iframe.removeEventListener('load', handleLoad);
            observer?.disconnect();
        };
    }, [config.source]);

    return (
        <section>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-4xl font-serif font-bold text-primary">{config.title}</h1>
                <div className="flex flex-wrap gap-2">
                    <a
                        href={config.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-accent hover:text-accent dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                    >
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                        {messages.cv.openHtml}
                    </a>
                    <a
                        href={config.download}
                        download
                        className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-dark"
                    >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        {messages.cv.downloadPdf}
                    </a>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800">
                <iframe
                    ref={iframeRef}
                    key={config.source}
                    src={config.source}
                    title={config.title}
                    className="block w-full border-0 bg-white"
                    style={{ height }}
                />
            </div>
        </section>
    );
}
