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
  Loader2, // Thêm Loader2 cho trạng thái loading
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
import Image from "next/image";
import { useUser } from "@clerk/nextjs";

import toast from "react-hot-toast";
import type { IUser } from "@repo/types";
import DarkVeil from "@/components/DarkVeil";

const AvatarFallback = ({
  name,
  size,
}: {
  name: string;
  size: "large" | "small";
}) => {
  const initial = name ? name.charAt(0).toUpperCase() : "U";

  const w = size === "large" ? "w-32 h-32 text-4xl" : "w-24 h-24 text-3xl";
  const border =
    size === "large" ? "border-4 border-white" : "border-2 border-gray-300";
  const bg = size === "large" ? "bg-gray-700" : "bg-gray-600";

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold shadow-md ${w} ${border} ${bg} text-white`}
    >
      {initial}
    </div>
  );
};

const ProfileUserPage = () => {
  // 1. Hook và State
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();

  // State quản lý Avatar
  const [selectedImg, setSelectedImg] = useState<string | null>(null); // Preview ảnh
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // File để upload
  const [isAvatarUpdating, setIsAvatarUpdating] = useState(false); // Trạng thái riêng cho Avatar

  // State quản lý Form và UI
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<IUser | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  // Dữ liệu hiển thị
  const fullName = profile?.name || clerkUser?.fullName || "";
  const email =
    profile?.email || clerkUser?.emailAddresses[0]?.emailAddress || "";

  // 2. Logic Đồng bộ Profile (Giữ nguyên)
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

  // 3. Logic Lấy Ảnh (Cập nhật để ưu tiên selectedImg/clerkUser.imageUrl)
  const getImageSrc = useCallback(() => {
    if (selectedImg) return selectedImg;

    // Ưu tiên Ảnh từ Clerk (là nguồn chân lý)
    if (clerkUser?.imageUrl) {
      return clerkUser.imageUrl;
    }

    // Nếu Clerk không có, dùng ảnh từ backend (nếu có)
    if (authUser?.avatar) {
      // Đảm bảo URL là đầy đủ nếu bạn dùng relative path
      return `http://localhost:8000${authUser.avatar}`;
    }

    return "/avatar.png";
  }, [selectedImg, authUser, clerkUser]);

  // 4. Handle File Change (Làm mới preview ngay trên trang chính)
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

  // 5. Handle Text Input Change (Giữ nguyên)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile) return;
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  // Cập nhật Ảnh Đại diện Độc Lập
  const handleAvatarSubmit = async () => {
    if (!clerkUser || !selectedFile || isAvatarUpdating) return;

    setIsAvatarUpdating(true);

    try {
      console.log("Bước 1: Đang tải ảnh lên Clerk...");

      // 1. Cập nhật lên Clerk
      await clerkUser.setProfileImage({
        file: selectedFile,
      });

      // 2. Lấy URL ảnh mới nhất từ đối tượng clerkUser đã được cập nhật
      const newImageUrl = clerkUser.imageUrl;

      // 3. Cập nhật Tên trên Clerk (Nếu tên trong form thay đổi và cần đồng bộ)
      let updatedName = profile?.name || clerkUser.fullName || "";
      if (profile?.name && profile.name !== clerkUser.fullName) {
        const nameUpdate = await clerkUser.update({
          firstName: profile.name,
        });
        updatedName = nameUpdate.fullName || profile.name;
      }

      // 4. Đồng bộ URL ảnh mới và tên (nếu đổi) vào Backend/DB của bạn
      console.log("Bước 2: Đồng bộ URL ảnh và Tên vào database...");
      await updateProfile({
        avatar: newImageUrl,
        name: updatedName,
      });

      // Hoàn tất
      setSelectedFile(null);
      setSelectedImg(null);
      toast.success("Ảnh đại diện đã được cập nhật thành công!");
    } catch (error) {
      console.error("Avatar Update failed:", error);
      toast.error("Cập nhật ảnh đại diện thất bại.");
    } finally {
      setIsAvatarUpdating(false);
    }
  };

  // Cập nhật Thông tin Cá nhân (Chỉ Text Fields)

  const handleSubmit = async () => {
    if (!profile || isUpdatingProfile) return;

    try {
      // Cập nhật tên trên Clerk trước
      if (profile.name && profile.name !== clerkUser?.fullName) {
        await clerkUser?.update({
          firstName: profile.name,
        });
      }

      const updateData = {
        name: profile.name,
        nickname: profile?.nickname,
        email: profile.email,
        dob: profile.dob,
        phone: profile.phone,
        address: profile.address,
        gender: profile.gender,
        // Luôn đồng bộ URL ảnh mới nhất từ Clerk
        avatar: clerkUser?.imageUrl || authUser?.avatar,
      };

      await updateProfile(updateData);

      setOpen(false);

      alert("Thông tin cá nhân đã được lưu!");
    } catch (error) {
      console.error("Profile Update failed:", error);
      alert("Cập nhật thông tin thất bại.");
    }
  };

  // 6. Render Logic Avatar (Bao gồm input upload)
  const renderAvatarWithInput = () => {
    const currentSrc = getImageSrc();
    const isLoading = isAvatarUpdating;

    // Base Avatar (Image hoặc Fallback)
    const BaseAvatar = (
      <div className="w-32 h-32 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full z-10">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}

        {currentSrc === "/avatar.png" || showFallback ? (
          <AvatarFallback name={fullName} size="large" />
        ) : (
          <Image
            src={currentSrc}
            alt="Profile"
            width={128}
            height={128}
            className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md"
            onError={() => setShowFallback(true)}
          />
        )}

        {/* Nút Upload Avatar */}
        <label
          htmlFor="avatar-upload-main"
          className={`absolute bottom-0 right-0 flex items-center justify-center w-10 h-10 rounded-full bg-green-600 text-white cursor-pointer transition hover:scale-110 shadow-md ${
            isLoading ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <Camera className="w-5 h-5" />
          <input
            type="file"
            id="avatar-upload-main"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isLoading}
            key={clerkUser?.imageUrl} // Key để reset input sau khi upload thành công
          />
        </label>
      </div>
    );

    // Hiển thị Avatar và các nút điều khiển
    return (
      <div className="flex flex-col items-center gap-4">
        {BaseAvatar}

        {/* Nút Tải lên (Chỉ hiển thị khi có file được chọn và chưa tải) */}
        {selectedFile && !isLoading && (
          <>
            <p className="text-sm text-yellow-500">Ảnh mới đã được chọn</p>
            <div className="flex items-center gap-4">
              <Button
                onClick={handleAvatarSubmit}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Tải ảnh đại diện
              </Button>
              <Button
                onClick={() => {
                  setSelectedFile(null);
                  setSelectedImg(null);
                }}
                variant="secondary"
                className="text-sm text-gray-400 hover:text-red-600 hover:bg-gray-100"
                disabled={isLoading}
              >
                Hủy
              </Button>
            </div>
          </>
        )}

        {isLoading && (
          <p className="text-sm text-gray-500">Đang tải ảnh lên...</p>
        )}
      </div>
    );
  };

  // ... (Xử lý Loading và Not Logged In - Giữ nguyên)
  if (!clerkLoaded) {
    /* ... */ return null;
  }
  if (!clerkUser) {
    /* ... */ return null;
  }

  // 7. Render JSX
  return (
    <div className="relative min-h-screen w-full">
      <div className="absolute inset-0 z-0">
        <DarkVeil
          hueShift={0}
          noiseIntensity={0.02}
          scanlineIntensity={0.1}
          speed={0.3}
          resolutionScale={1}
        />
      </div>
      <div className="relative z-10">
        <div className="max-w-2xl mx-auto p-4 min-h-screen mt-14">
          <div
            className="bg-black/40 backdrop-blur-lg rounded-xl shadow-xl p-6 space-y-8 border border-white/10  border border-cyan-500/30 
  shadow-[0_0_15px_2px_rgba(0,255,255,0.4)] 
  hover:shadow-[0_0_20px_3px_rgba(0,255,255,0.6)] 
  transition-shadow duration-300 "
          >
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <h1 className="text-2xl font-semibold text-white">
                  Thông tin cá nhân
                </h1>
                <p className="mt-2 text-sm text-gray-300">Tài khoản của bạn</p>
              </div>

              {/* Nút Edit (Chỉ còn Edit Text) */}
              <Dialog open={open} onOpenChange={setOpen}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                        <button className="p-2 rounded-full bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition">
                          <Edit className="w-5 h-5" />
                        </button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="bg-green-600 text-white text-xs py-1 px-2 rounded"
                    >
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
                      {/* Các input thông tin cá nhân (Đã dọn dẹp phần Avatar) */}
                      <div className="space-y-3">
                        {/* Name */}
                        <div>
                          <Label htmlFor="name">Họ tên</Label>
                          <Input
                            name="name"
                            value={profile.name || ""}
                            onChange={handleChange}
                          />
                        </div>
                        {/* Nickname */}
                        <div>
                          <Label htmlFor="nickname">Nickname</Label>
                          <Input
                            name="nickname"
                            value={profile.nickname || ""}
                            onChange={handleChange}
                          />
                        </div>
                        {/* DOB */}
                        <div>
                          <Label htmlFor="dob">Ngày sinh</Label>
                          <Input
                            name="dob"
                            value={profile.dob || ""}
                            onChange={handleChange}
                            type="date"
                          />
                        </div>
                        {/* Email (Readonly) */}
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            name="email"
                            value={profile.email || ""}
                            onChange={handleChange}
                            readOnly
                            className="opacity-70 cursor-not-allowed"
                          />
                        </div>
                        {/* Phone */}
                        <div>
                          <Label htmlFor="phone">Số điện thoại</Label>
                          <Input
                            name="phone"
                            value={profile.phone || ""}
                            onChange={handleChange}
                          />
                        </div>
                        {/* Gender */}
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
                              setProfile({
                                ...profile,
                                gender: value,
                              })
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
                        {/* Address */}
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
                      className="w-full bg-green-700 text-white"
                      disabled={isUpdatingProfile || isAvatarUpdating}
                    >
                      {isUpdatingProfile
                        ? "Đang lưu..."
                        : "Lưu thông tin cá nhân"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* VỊ TRÍ MỚI CHO AVATAR VÀ UPLOAD */}
            <div className="flex flex-col items-center gap-4">
              {renderAvatarWithInput()}
            </div>

            {/* Hiển thị thông tin */}
            <div className="space-y-4">
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
                  className="grid grid-cols-[auto_1fr] items-center gap-4"
                >
                  <span className="flex items-center gap-2 text-md text-gray-400">
                    {item.icon} {item.label}
                  </span>
                  <div className="p-3 rounded-lg text-lg text-white bg-gray-800">
                    <span className="ml-2">{item.value || "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileUserPage;
