'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

// Suppress legacy lifecycle warnings từ swagger-ui-react (ModelCollapse)
const SUPPRESSED = ['UNSAFE_componentWillReceiveProps'];
if (typeof window !== 'undefined') {
    const _error = console.error.bind(console);
    console.error = (...args: any[]) => {
        if (typeof args[0] === 'string' && SUPPRESSED.some((w) => args[0].includes(w))) return;
        _error(...args);
    };
}

// Bỏ SSR hoàn toàn để tránh warning UNSAFE_componentWillReceiveProps
// từ class component cũ (ModelCollapse) bên trong swagger-ui-react
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
    ssr: false,
    loading: () => (
        <div className="text-muted-foreground flex items-center justify-center p-12">Đang tải Swagger UI…</div>
    ),
});

type Props = {
    specUrl?: string;
    spec?: Record<string, any>;
};

function ReactSwagger({ specUrl, spec }: Props) {
    if (specUrl) {
        return <SwaggerUI url={specUrl} />;
    }
    return <SwaggerUI spec={spec} />;
}

export default ReactSwagger;
