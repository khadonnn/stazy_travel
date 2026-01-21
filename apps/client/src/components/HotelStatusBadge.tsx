/**
 * Component hiển thị badge trạng thái hotel
 */

import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, AlertTriangle, Ban } from "lucide-react";

type HotelStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

interface HotelStatusBadgeProps {
  status: HotelStatus;
  rejectionReason?: string;
}

const statusConfig = {
  DRAFT: {
    label: "Nháp",
    variant: "secondary" as const,
    icon: Clock,
    description: "Khách sạn đang trong trạng thái nháp",
  },
  PENDING: {
    label: "Chờ duyệt",
    variant: "outline" as const,
    icon: Clock,
    description: "Đang chờ admin phê duyệt",
  },
  APPROVED: {
    label: "Đã duyệt",
    variant: "default" as const,
    icon: CheckCircle2,
    description: "Khách sạn đã được duyệt và hiển thị công khai",
  },
  REJECTED: {
    label: "Bị từ chối",
    variant: "destructive" as const,
    icon: XCircle,
    description: "Khách sạn bị từ chối",
  },
  SUSPENDED: {
    label: "Tạm ngưng",
    variant: "destructive" as const,
    icon: Ban,
    description: "Khách sạn bị tạm ngưng do vi phạm",
  },
};

export function HotelStatusBadge({ status, rejectionReason }: HotelStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-1">
      <Badge variant={config.variant} className="gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
      
      {status === "PENDING" && (
        <p className="text-xs text-muted-foreground">
          ⏳ Khách sạn đang chờ admin xem xét
        </p>
      )}
      
      {status === "REJECTED" && rejectionReason && (
        <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm">
          <p className="font-medium text-destructive">Lý do từ chối:</p>
          <p className="text-muted-foreground mt-1">{rejectionReason}</p>
        </div>
      )}
      
      {status === "APPROVED" && (
        <p className="text-xs text-green-600">
          ✅ Khách sạn đang hiển thị công khai
        </p>
      )}
    </div>
  );
}
