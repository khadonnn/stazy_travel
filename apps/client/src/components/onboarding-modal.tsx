"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plane,
  Home,
  Palmtree,
  Castle,
  Building,
  Tent,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Shadcn Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  checkUserOnboarding,
  saveUserInterests,
} from "@/actions/user-preference";

// Danh sách các Category (Khớp với Database của bạn)
const CATEGORIES = [
  { id: "khach-san", label: "Khách sạn", icon: Plane },
  { id: "homestay", label: "Homestay", icon: Home },
  { id: "resort", label: "Resort", icon: Palmtree },
  { id: "biet-thu", label: "Biệt thự", icon: Castle },
  { id: "can-ho", label: "Căn hộ", icon: Building },
  { id: "nha-go", label: "Nhà gỗ", icon: Tent },
  { id: "khac", label: "Khám phá", icon: Globe },
];

export function OnboardingModal() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // 1. Kiểm tra trạng thái ngay khi load trang
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      console.log("Checking onboarding status...");
      checkStatus();
    }
  }, [isLoaded, isSignedIn]);

  const checkStatus = async () => {
    try {
      const { isOnboarded } = await checkUserOnboarding();
      if (!isOnboarded) {
        setOpen(true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setChecking(false);
    }
  };

  // 2. Xử lý chọn/bỏ chọn
  const toggleSelection = (id: string) => {
    console.log("🎯 Category clicked:", id);
    setSelected((prev) => {
      const newSelection = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      console.log("✅ New selection:", newSelection);
      return newSelection;
    });
  };

  // 3. Xử lý lưu
  const handleSubmit = async () => {
    console.log("💾 Submitting with selection:", selected);
    if (selected.length === 0) {
      return toast.warning("Hãy chọn ít nhất 1 sở thích nhé!");
    }

    setLoading(true);
    try {
      await saveUserInterests(selected);
      toast.success("Đã cập nhật sở thích của bạn!");
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("❌ Save error:", error);
      toast.error("Có lỗi xảy ra, thử lại sau!");
    } finally {
      setLoading(false);
    }
  };

  // Không render gì nếu chưa login hoặc đang check
  if (!isLoaded || !isSignedIn || checking) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* preventDefault ở đây để cấm user đóng modal bằng cách click ra ngoài */}
      <DialogContent
        className="sm:max-w-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Chào bạn mới! 👋
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Hãy chọn vài chủ đề bạn quan tâm để Stazy gợi ý địa điểm chuẩn gu
            nhất nhé.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selected.includes(cat.id);
            return (
              <div
                key={cat.id}
                onClick={() => toggleSelection(cat.id)}
                className={cn(
                  "cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-3 transition-all duration-200 hover:scale-105",
                  isSelected
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-muted hover:border-primary/50 text-muted-foreground",
                )}
              >
                <Icon
                  className={cn("w-8 h-8", isSelected ? "fill-current" : "")}
                />
                <span className="font-medium text-sm">{cat.label}</span>
              </div>
            );
          })}
        </div>

        <DialogFooter className="sm:justify-center">
          <Button
            size="lg"
            className="w-full sm:w-1/2"
            onClick={handleSubmit}
            disabled={loading || selected.length === 0}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Bắt đầu khám phá
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
