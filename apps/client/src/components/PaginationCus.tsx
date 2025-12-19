import {
    Pagination as ShadPagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Ellipsis } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export default function PaginationCus({
    currentPage,
    totalPages,
    onPageChange,
}: PaginationProps) {
    const maxVisible = 3;

    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
    }

    const pages = [];

    // ---- Component Dropdown số trang ẩn ----
    const HiddenPagesDropdown = ({ pages }: { pages: number[] }) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className='w-[62px] h-[30px] flex items-center justify-center'>
                    <Ellipsis className='h-4 w-4' />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align='center'
                sideOffset={4}
                className='p-0 w-[62px] min-w-0'
            >
                <ScrollArea className='h-40 w-full'>
                    {pages.map((p) => (
                        <DropdownMenuItem
                            key={p}
                            onClick={() => onPageChange(p)}
                            className='cursor-pointer text-center flex items-center justify-center'
                        >
                            {p}
                        </DropdownMenuItem>
                    ))}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    // Trang đầu
    if (start > 1) {
        pages.push(
            <PaginationItem key={1}>
                <PaginationLink
                    href='#'
                    onClick={(e) => {
                        e.preventDefault();
                        onPageChange(1);
                    }}
                    isActive={currentPage === 1}
                >
                    1
                </PaginationLink>
            </PaginationItem>,
        );

        if (start > 2) {
            const hiddenPages = Array.from(
                { length: start - 2 },
                (_, i) => i + 2,
            );
            pages.push(
                <PaginationItem key='ellipsis-start'>
                    <HiddenPagesDropdown pages={hiddenPages} />
                </PaginationItem>,
            );
        }
    }

    // Các trang hiện tại
    for (let i = start; i <= end; i++) {
        pages.push(
            <PaginationItem key={i}>
                <PaginationLink
                    href='#'
                    onClick={(e) => {
                        e.preventDefault();
                        onPageChange(i);
                    }}
                    isActive={currentPage === i}
                >
                    {i}
                </PaginationLink>
            </PaginationItem>,
        );
    }

    // Trang cuối
    if (end < totalPages) {
        if (end < totalPages - 1) {
            const hiddenPages = Array.from(
                { length: totalPages - end - 1 },
                (_, i) => end + i + 1,
            );
            pages.push(
                <PaginationItem key='ellipsis-end'>
                    <HiddenPagesDropdown pages={hiddenPages} />
                </PaginationItem>,
            );
        }

        pages.push(
            <PaginationItem key={totalPages}>
                <PaginationLink
                    href='#'
                    onClick={(e) => {
                        e.preventDefault();
                        onPageChange(totalPages);
                    }}
                    isActive={currentPage === totalPages}
                >
                    {totalPages}
                </PaginationLink>
            </PaginationItem>,
        );
    }

    return (
        <ShadPagination>
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious
                        href='#'
                        onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) onPageChange(currentPage - 1);
                        }}
                        className={
                            currentPage === 1
                                ? 'pointer-events-none opacity-50'
                                : ''
                        }
                    />
                </PaginationItem>

                {pages}

                <PaginationItem>
                    <PaginationNext
                        href=''
                        onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages)
                                onPageChange(currentPage + 1);
                        }}
                        className={
                            currentPage === totalPages
                                ? 'pointer-events-none opacity-50'
                                : ''
                        }
                    />
                </PaginationItem>
            </PaginationContent>
        </ShadPagination>
    );
}
