import UserDetailClient from '@/components/UserDetailClient';

type PageProps = {
    params: Promise<{ id: string }>;
};

const SingleUserPage = async ({ params }: PageProps) => {
    const resolvedParams = await params;
    const userId = resolvedParams.id;

    return <UserDetailClient userId={userId} />;
};

export default SingleUserPage;
