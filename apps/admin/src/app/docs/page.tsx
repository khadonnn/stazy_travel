import ReactSwagger from './react-swagger';

export default function DocsPage() {
    return (
        <main className="p-4">
            <ReactSwagger specUrl="/api/doc" />
        </main>
    );
}
