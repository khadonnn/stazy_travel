"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Camera,
  Mail,
  User,
  Edit,
  Phone,
  MapPin,
  Calendar,
  UserCircle,
  Loader2,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  ShieldUser,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";

import toast from "react-hot-toast";
import type { IUser, IAuthorRequest, IAuthorRequestInput } from "@repo/types";
import DarkVeil from "@/components/DarkVeil";
import {
  submitAuthorRequest,
  getMyAuthorRequest,
} from "@/actions/authorActions";
import { Textarea } from "@/components/ui/textarea";

const AvatarFallback = ({
  name,
  size,
}: {
  name: string;
  size: "large" | "small";
}) => {
  const initial = name ? name.charAt(0).toUpperCase() : "U";
  const w = size === "large" ? "w-28 h-28 text-3xl" : "w-20 h-20 text-2xl";

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold bg-zinc-800 text-zinc-400 border border-white/10 ${w}`}
    >
      {initial}
    </div>
  );
};

const ProfileUserPage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();

  const [selectedImg, setSelectedImg] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAvatarUpdating, setIsAvatarUpdating] = useState(false);

  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<IUser | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  const [authorRequest, setAuthorRequest] = useState<IAuthorRequest | null>(
    null,
  );
  const [isAuthorDialogOpen, setIsAuthorDialogOpen] = useState(false);
  const [isSubmittingAuthorRequest, setIsSubmittingAuthorRequest] =
    useState(false);
  const [authorFormData, setAuthorFormData] = useState<IAuthorRequestInput>({
    businessName: "",
    businessType: "INDIVIDUAL",
    taxCode: "",
    phone: profile?.phone || "",
    email: profile?.email || "",
    address: profile?.address || "",
    identityCard: "",
    identityImages: [],
    reason: "",
  });

  const fullName = profile?.name || clerkUser?.fullName || "";
  const email =
    profile?.email || clerkUser?.emailAddresses[0]?.emailAddress || "";

  useEffect(() => {
    if (!clerkLoaded) return;
    if (authUser) {
      setProfile(authUser as IUser);
      return;
    }

    if (clerkUser) {
      const fallbackProfile: IUser = {
        id: clerkUser.id,
        name: clerkUser.fullName || clerkUser.firstName || "",
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        avatar: "",
        nickname: "",
        phone: "",
        address: "",
        dob: "",
        gender: "",
        role: "USER",
        createdAt: new Date(),
        updatedAt: new Date(),
        bgImage: "",
        jobName: "",
        desc: "",
      };
      setProfile(fallbackProfile);
    }
  }, [authUser, clerkUser, clerkLoaded]);

  useEffect(() => {
    const loadAuthorRequest = async () => {
      const request = await getMyAuthorRequest();
      setAuthorRequest(request);
    };

    if (clerkUser) {
      loadAuthorRequest();
    }
  }, [clerkUser]);

  const getImageSrc = useCallback(() => {
    if (selectedImg) return selectedImg;
    if (clerkUser?.imageUrl) return clerkUser.imageUrl;
    if (authUser?.avatar) return `http://localhost:8000${authUser.avatar}`;
    return "/avatar.png";
  }, [selectedImg, authUser, clerkUser]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setShowFallback(false);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setSelectedImg(reader.result as string);
    };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile) return;
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleAvatarSubmit = async () => {
    if (!clerkUser || !selectedFile || isAvatarUpdating) return;

    setIsAvatarUpdating(true);

    try {
      await clerkUser.setProfileImage({ file: selectedFile });
      const newImageUrl = clerkUser.imageUrl;

      let updatedName = profile?.name || clerkUser.fullName || "";
      if (profile?.name && profile.name !== clerkUser.fullName) {
        const nameUpdate = await clerkUser.update({
          firstName: profile.name,
        });
        updatedName = nameUpdate.fullName || profile.name;
      }

      await updateProfile({
        avatar: newImageUrl,
        name: updatedName,
      });

      setSelectedFile(null);
      setSelectedImg(null);
      toast.success("Ảnh đại diện đã được cập nhật!");
    } catch (error) {
      console.error("Avatar Update failed:", error);
      toast.error("Cập nhật ảnh đại diện thất bại.");
    } finally {
      setIsAvatarUpdating(false);
    }
  };

  const handleSubmit = async () => {
    if (!profile || isUpdatingProfile) return;

    try {
      if (profile.name && profile.name !== clerkUser?.fullName) {
        await clerkUser?.update({ firstName: profile.name });
      }

      const updateData = {
        name: profile.name,
        nickname: profile?.nickname,
        email: profile.email,
        dob: profile.dob,
        phone: profile.phone,
        address: profile.address,
        gender: profile.gender,
        avatar: clerkUser?.imageUrl || authUser?.avatar,
      };

      await updateProfile(updateData);
      setOpen(false);
      toast.success("Thông tin cá nhân đã được lưu!");
    } catch (error) {
      console.error("Profile Update failed:", error);
      toast.error("Cập nhật thông tin thất bại.");
    }
  };

  const handleAuthorRequestSubmit = async () => {
    setIsSubmittingAuthorRequest(true);

    try {
      const result = await submitAuthorRequest(authorFormData);

      if (result.success) {
        toast.success(result.message);
        setAuthorRequest(result.data || null);
        setIsAuthorDialogOpen(false);

        setAuthorFormData({
          businessName: "",
          businessType: "INDIVIDUAL",
          taxCode: "",
          phone: profile?.phone || "",
          email: profile?.email || "",
          address: profile?.address || "",
          identityCard: "",
          identityImages: [],
          reason: "",
        });
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Error submitting author request:", error);
      toast.error("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setIsSubmittingAuthorRequest(false);
    }
  };

  const renderAuthorStatus = () => {
    if (!authorRequest) return null;

    const statusConfig = {
      PENDING: {
        icon: <Clock className="w-3.5 h-3.5" />,
        text: "Đang chờ duyệt",
        variant: "secondary" as const,
      },
      APPROVED: {
        icon: <CheckCircle className="w-3.5 h-3.5" />,
        text: "Đã duyệt",
        variant: "default" as const,
      },
      REJECTED: {
        icon: <XCircle className="w-3.5 h-3.5" />,
        text: "Bị từ chối",
        variant: "destructive" as const,
      },
    };

    const status = statusConfig[authorRequest.status];

    return (
      <Badge variant={status.variant} className="gap-1.5 text-xs">
        {status.icon}
        {status.text}
      </Badge>
    );
  };

  const renderAvatarWithInput = () => {
    const currentSrc = getImageSrc();
    const isLoading = isAvatarUpdating;

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full z-10">
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            </div>
          )}

          {currentSrc === "/avatar.png" || showFallback ? (
            <AvatarFallback name={fullName} size="large" />
          ) : (
            <Image
              src={currentSrc}
              alt="Profile"
              width={112}
              height={112}
              className="w-28 h-28 rounded-full object-cover border"
              onError={() => setShowFallback(true)}
            />
          )}

          <label
            htmlFor="avatar-upload-main"
            className={`absolute bottom-0 right-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition shadow-sm ${
              isLoading ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <Camera className="w-4 h-4" />
            <input
              type="file"
              id="avatar-upload-main"
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isLoading}
              key={clerkUser?.imageUrl}
            />
          </label>
        </div>

        {selectedFile && !isLoading && (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleAvatarSubmit} disabled={isLoading}>
              Tải ảnh lên
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedFile(null);
                setSelectedImg(null);
              }}
              disabled={isLoading}
            >
              Hủy
            </Button>
          </div>
        )}
      </div>
    );
  };

  if (!clerkLoaded) return null;
  if (!clerkUser) return null;

  return (
    <div className="relative min-h-screen w-full">
      <div className="relative z-10">
        <div className="max-w-xl mx-auto px-4 py-8 mt-14">
          <Card className="border-white/10 bg-zinc-900/60 backdrop-blur-md shadow-2xl">
            {/* Header */}
            <CardHeader className="text-center pb-0">
              <div className="flex items-center justify-between">
                <div className="flex-1" />
                <div className="flex-1 text-center">
                  <h1 className="text-xl font-semibold text-white">
                    Thông tin cá nhân
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Quản lý tài khoản của bạn
                  </p>
                </div>
                <div className="flex-1 flex justify-end">
                  <Dialog open={open} onOpenChange={setOpen}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 bg-muted"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Chỉnh sửa thông tin
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Chỉnh sửa thông tin cá nhân</DialogTitle>
                      </DialogHeader>

                      {profile && (
                        <div className="space-y-4">
                          <div className="space-y-3">
                            <div>
                              <Label htmlFor="name">Họ tên</Label>
                              <Input
                                name="name"
                                value={profile.name || ""}
                                onChange={handleChange}
                              />
                            </div>
                            <div>
                              <Label htmlFor="nickname">Nickname</Label>
                              <Input
                                name="nickname"
                                value={profile.nickname || ""}
                                onChange={handleChange}
                              />
                            </div>
                            <div>
                              <Label htmlFor="dob">Ngày sinh</Label>
                              <Input
                                name="dob"
                                value={profile.dob || ""}
                                onChange={handleChange}
                                type="date"
                              />
                            </div>
                            <div>
                              <Label htmlFor="email">Email</Label>
                              <Input
                                name="email"
                                value={profile.email || ""}
                                onChange={handleChange}
                                readOnly
                                className="opacity-60"
                              />
                            </div>
                            <div>
                              <Label htmlFor="phone">Số điện thoại</Label>
                              <Input
                                name="phone"
                                value={profile.phone || ""}
                                onChange={handleChange}
                              />
                            </div>
                            <div>
                              <Label htmlFor="gender">Giới tính</Label>
                              <Select
                                value={
                                  profile.gender &&
                                  ["male", "female", "other"].includes(
                                    profile.gender,
                                  )
                                    ? profile.gender
                                    : ""
                                }
                                onValueChange={(value) =>
                                  setProfile({ ...profile, gender: value })
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Chọn giới tính" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="male">Nam</SelectItem>
                                  <SelectItem value="female">Nữ</SelectItem>
                                  <SelectItem value="other">Khác</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="address">Địa chỉ</Label>
                              <Input
                                name="address"
                                value={profile.address || ""}
                                onChange={handleChange}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <DialogFooter>
                        <Button
                          onClick={handleSubmit}
                          className="w-full"
                          disabled={isUpdatingProfile || isAvatarUpdating}
                        >
                          {isUpdatingProfile ? "Đang lưu..." : "Lưu thông tin"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {/* Avatar */}
              {renderAvatarWithInput()}

              <Separator />

              {/* Info Fields */}
              <div className="space-y-3">
                {[
                  {
                    icon: <User className="w-4 h-4" />,
                    label: "Họ tên",
                    value: fullName,
                  },
                  {
                    icon: <UserCircle className="w-4 h-4" />,
                    label: "Nickname",
                    value: profile?.nickname,
                  },
                  {
                    icon: <Mail className="w-4 h-4" />,
                    label: "Email",
                    value: email,
                  },
                  {
                    icon: <Phone className="w-4 h-4" />,
                    label: "Số điện thoại",
                    value: profile?.phone,
                  },
                  {
                    icon: <MapPin className="w-4 h-4" />,
                    label: "Địa chỉ",
                    value: profile?.address,
                  },
                  {
                    icon: <Calendar className="w-4 h-4" />,
                    label: "Ngày sinh",
                    value: profile?.dob,
                  },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-800/60 border border-white/5"
                  >
                    <span className="text-zinc-400">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-zinc-500">
                        {item.label}
                      </span>
                      <p className="text-sm truncate text-white">
                        {item.value || "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Author Request Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldUser className="w-4 h-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold text-white">
                      Trở thành Chủ khách sạn
                    </h2>
                  </div>
                  {renderAuthorStatus()}
                </div>

                {!authorRequest && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Đăng ký trở thành chủ khách sạn để đăng và quản lý khách
                      sạn của riêng bạn trên nền tảng.
                    </p>

                    <Dialog
                      open={isAuthorDialogOpen}
                      onOpenChange={setIsAuthorDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button className="w-full" size="sm">
                          Đăng ký ngay
                        </Button>
                      </DialogTrigger>

                      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Đăng ký trở thành Author</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div>
                            <Label>Loại hình kinh doanh *</Label>
                            <Select
                              value={authorFormData.businessType}
                              onValueChange={(
                                value: "INDIVIDUAL" | "COMPANY",
                              ) =>
                                setAuthorFormData({
                                  ...authorFormData,
                                  businessType: value,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="INDIVIDUAL">
                                  Cá nhân
                                </SelectItem>
                                <SelectItem value="COMPANY">Công ty</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Tên doanh nghiệp/cá nhân *</Label>
                            <Input
                              value={authorFormData.businessName}
                              onChange={(e) =>
                                setAuthorFormData({
                                  ...authorFormData,
                                  businessName: e.target.value,
                                })
                              }
                              placeholder="VD: Công ty TNHH ABC hoặc Nguyễn Văn A"
                            />
                          </div>

                          {authorFormData.businessType === "COMPANY" && (
                            <div>
                              <Label>Mã số thuế</Label>
                              <Input
                                value={authorFormData.taxCode || ""}
                                onChange={(e) =>
                                  setAuthorFormData({
                                    ...authorFormData,
                                    taxCode: e.target.value,
                                  })
                                }
                                placeholder="0123456789"
                              />
                            </div>
                          )}

                          <div>
                            <Label>Số điện thoại *</Label>
                            <Input
                              value={authorFormData.phone}
                              onChange={(e) =>
                                setAuthorFormData({
                                  ...authorFormData,
                                  phone: e.target.value,
                                })
                              }
                              placeholder="0901234567"
                            />
                          </div>

                          <div>
                            <Label>Email *</Label>
                            <Input
                              value={authorFormData.email}
                              onChange={(e) =>
                                setAuthorFormData({
                                  ...authorFormData,
                                  email: e.target.value,
                                })
                              }
                              placeholder="email@example.com"
                              type="email"
                            />
                          </div>

                          <div>
                            <Label>Địa chỉ *</Label>
                            <Input
                              value={authorFormData.address}
                              onChange={(e) =>
                                setAuthorFormData({
                                  ...authorFormData,
                                  address: e.target.value,
                                })
                              }
                              placeholder="123 Đường ABC, Quận XYZ, TP HCM"
                            />
                          </div>

                          <div>
                            <Label>Số CMND/CCCD *</Label>
                            <Input
                              value={authorFormData.identityCard}
                              onChange={(e) =>
                                setAuthorFormData({
                                  ...authorFormData,
                                  identityCard: e.target.value,
                                })
                              }
                              placeholder="001234567890"
                            />
                          </div>

                          <div>
                            <Label>Lý do đăng ký (Tùy chọn)</Label>
                            <Textarea
                              value={authorFormData.reason || ""}
                              onChange={(e) =>
                                setAuthorFormData({
                                  ...authorFormData,
                                  reason: e.target.value,
                                })
                              }
                              placeholder="Tôi muốn chia sẻ khách sạn của mình..."
                              rows={3}
                            />
                          </div>

                          <p className="text-xs text-muted-foreground">
                            * Các trường bắt buộc. Thông tin sẽ được bảo mật.
                          </p>
                        </div>

                        <DialogFooter>
                          <Button
                            onClick={handleAuthorRequestSubmit}
                            disabled={
                              isSubmittingAuthorRequest ||
                              !authorFormData.businessName ||
                              !authorFormData.phone ||
                              !authorFormData.email ||
                              !authorFormData.address ||
                              !authorFormData.identityCard
                            }
                            className="w-full"
                          >
                            {isSubmittingAuthorRequest
                              ? "Đang gửi..."
                              : "Gửi yêu cầu"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {authorRequest?.status === "PENDING" && (
                  <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Yêu cầu đang được xem xét. Kết quả sẽ được gửi qua email
                      trong 1-2 ngày.
                    </p>
                  </div>
                )}

                {authorRequest?.status === "APPROVED" && (
                  <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 space-y-3">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Bạn đã trở thành Author. Bắt đầu đăng khách sạn của mình.
                    </p>

                    <Button
                      className="w-full"
                      size="sm"
                      onClick={() => (window.location.href = "/create-hotel")}
                    >
                      Đăng khách sạn đầu tiên
                    </Button>
                  </div>
                )}

                {authorRequest?.status === "REJECTED" && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 space-y-3">
                    <p className="text-sm text-red-400">
                      Yêu cầu đã bị từ chối.
                    </p>
                    {authorRequest.rejectionReason && (
                      <p className="text-xs text-zinc-500">
                        Lý do: {authorRequest.rejectionReason}
                      </p>
                    )}
                    <Button
                      onClick={() => setIsAuthorDialogOpen(true)}
                      variant="outline"
                      className="w-full"
                      size="sm"
                    >
                      Gửi lại yêu cầu
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfileUserPage;
