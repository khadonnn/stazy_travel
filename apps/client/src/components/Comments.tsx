import AvatarCus from '@/shared/AvartarCus';
import { Star } from 'lucide-react';
import useAuthors from '@/data/jsons/__authors.json';
import Link from 'next/link';
import { AuthorType } from '@/types/stay';
import authorsData from '@/data/jsons/__authors.json';
interface CommentListingDataType {
    name: string;
    avatar?: string;
    date: string;
    comment: string;
    starPoint: number;
}

export interface CommentListingProps {
    className?: string;
    data: CommentListingDataType;
    hasListingTitle?: boolean;
}

const CommentListing = ({
    className = '',
    data,
    hasListingTitle,
}: CommentListingProps) => {
    return (
        <div className={`cus-CommentListing flex space-x-4 ${className}`}>
            <div className='pt-0.5'>
                <AvatarCus
                    sizeClass='h-10 w-10 text-lg'
                    radius='rounded-full'
                    userName={data.name}
                    imgUrl={data.avatar}
                />
            </div>
            <div className='flex-grow'>
                <div className='flex justify-between space-x-3'>
                    <div className='flex flex-col'>
                        <div className='text-sm font-semibold'>
                            <span>{data.name}</span>
                            {hasListingTitle && (
                                <>
                                    <span className='text-neutral-500 dark:text-neutral-400 font-normal'>
                                        {` đánh giá trong `}
                                    </span>
                                    <Link href='/'>Phòng chờ</Link>
                                </>
                            )}
                        </div>
                        <span className='text-sm text-neutral-500 dark:text-neutral-400 mt-0.5'>
                            {data.date}
                        </span>
                    </div>
                    <div className='flex text-yellow-500'>
                        {Array.from({ length: data.starPoint }).map((_, i) => (
                            <Star key={i} className='w-4 h-4 fill-current' />
                        ))}
                    </div>
                </div>
                <span className='block mt-3 text-neutral-6000 dark:text-neutral-300'>
                    {data.comment}
                </span>
            </div>
        </div>
    );
};

// Hàm random n phần tử không trùng lặp từ mảng
function getRandomElements<T>(arr: T[], n: number): T[] {
    if (arr.length <= n) return arr.slice(0, n);
    const result: T[] = [];
    const used = new Set<number>();
    while (result.length < n) {
        const idx = Math.floor(Math.random() * arr.length);
        if (!used.has(idx)) {
            used.add(idx);
            result.push(arr[idx]!);
        }
    }
    return result;
}

const COMMENT_DATA = [
    {
        date: 'May 20, 2025',
        comment:
            'Vị trí tuyệt vời và nhân viên rất thân thiện. Giường rất thoải mái và phòng rất sạch sẽ. Tôi chắc chắn sẽ quay lại đây.',
        starPoint: 5,
    },
    {
        date: 'June 10, 2025',
        comment:
            'Khách sạn nằm ngay trung tâm, tiện đi lại. Tuy nhiên phòng hơi nhỏ hơn so với hình ảnh.',
        starPoint: 4,
    },
    {
        date: 'July 5, 2025',
        comment:
            'Giá cả hợp lý, dịch vụ ổn. Mình đi công tác ở đây khá thoải mái. Nhân viên lễ tân hỗ trợ nhanh.',
        starPoint: 4,
    },
    {
        date: 'August 15, 2025',
        comment:
            'View đẹp, bữa sáng ngon miệng. Chỉ có điều wifi hơi chập chờn vào buổi tối.',
        starPoint: 3,
    },
];

const CommentList = () => {
    // const { authors, loading } = useAuthors();
    // // console.log("comment authors", authors);

    // if (loading) {
    //     return <div>Đang tải bình luận...</div>;
    // }

    // Random 4 author từ 0-29 nếu đủ, nếu không thì lấy bấy nhiêu có thể
    const AUTHORS: AuthorType[] = authorsData as AuthorType[];
    const randomAuthors = getRandomElements(AUTHORS, 4);

    const DEMO_COMMENTS: CommentListingDataType[] = COMMENT_DATA.map(
        (c, i) => ({
            name: randomAuthors[i]?.displayName || `Khách ${i + 1}`,
            avatar: randomAuthors[i]?.avatar,
            date: c.date,
            comment: c.comment,
            starPoint: c.starPoint,
        }),
    );

    return (
        <div className='space-y-6'>
            {DEMO_COMMENTS.map((item, idx) => (
                <CommentListing key={idx} data={item} />
            ))}
        </div>
    );
};

export default CommentList;
