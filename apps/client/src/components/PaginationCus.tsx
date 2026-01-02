import {
  Pagination as ShadPagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Ellipsis } from "lucide-react";

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

  // Component Dropdown ẩn
  const HiddenPagesDropdown = ({ pages }: { pages: number[] }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-[36px] h-[36px] flex items-center justify-center hover:bg-neutral-100 rounded-md">
          <Ellipsis className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        className="max-h-[200px] overflow-y-auto"
      >
        <ScrollArea className="h-full w-full">
          {pages.map((p) => (
            <DropdownMenuItem
              key={p}
              onClick={() => onPageChange(p)}
              className="cursor-pointer justify-center"
            >
              {p}
            </DropdownMenuItem>
          ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Render Trang đầu
  if (start > 1) {
    pages.push(
      <PaginationItem key={1}>
        <PaginationLink
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onPageChange(1);
          }}
          isActive={currentPage === 1}
        >
          1
        </PaginationLink>
      </PaginationItem>
    );

    if (start > 2) {
      const hiddenPages = Array.from({ length: start - 2 }, (_, i) => i + 2);
      pages.push(
        <PaginationItem key="ellipsis-start">
          <HiddenPagesDropdown pages={hiddenPages} />
        </PaginationItem>
      );
    }
  }

  // Render Các trang giữa
  for (let i = start; i <= end; i++) {
    pages.push(
      <PaginationItem key={i}>
        <PaginationLink
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onPageChange(i);
          }}
          isActive={currentPage === i}
        >
          {i}
        </PaginationLink>
      </PaginationItem>
    );
  }

  // Render Trang cuối
  if (end < totalPages) {
    if (end < totalPages - 1) {
      const hiddenPages = Array.from(
        { length: totalPages - end - 1 },
        (_, i) => end + i + 1
      );
      pages.push(
        <PaginationItem key="ellipsis-end">
          <HiddenPagesDropdown pages={hiddenPages} />
        </PaginationItem>
      );
    }

    pages.push(
      <PaginationItem key={totalPages}>
        <PaginationLink
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onPageChange(totalPages);
          }}
          isActive={currentPage === totalPages}
        >
          {totalPages}
        </PaginationLink>
      </PaginationItem>
    );
  }

  return (
    <ShadPagination>
      <PaginationContent>
        {/* Nút Previous */}
        {/* QUAN TRỌNG: Class pointer-events-none nằm ở đây */}
        <PaginationItem
          className={
            currentPage === 1
              ? "pointer-events-none opacity-50"
              : "cursor-pointer"
          }
        >
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (currentPage > 1) onPageChange(currentPage - 1);
            }}
          />
        </PaginationItem>

        {pages}

        {/* Nút Next */}
        {/* QUAN TRỌNG: Class pointer-events-none nằm ở đây */}
        <PaginationItem
          className={
            currentPage === totalPages
              ? "pointer-events-none opacity-50"
              : "cursor-pointer"
          }
        >
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (currentPage < totalPages) onPageChange(currentPage + 1);
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </ShadPagination>
  );
}
