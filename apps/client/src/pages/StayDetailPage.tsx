"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  MapPin,
  User,
  Bed,
  Bath,
  DoorOpen,
  Clock,
  CheckCircle2,
  Calendar,
  GalleryVerticalEnd,
} from "lucide-react";

import Link from "next/link";
import { Amenities_demos } from "@/constants/amenities";
import FiveStar from "@/shared/FiveStar";
import CommentListing from "@/components/Comments";
import StartRating from "@/components/StarRating";
import LikeSaveBtns from "@/shared/LikeSaveBtn";
import StayDatesRangeInput from "@/components/StayDatesRangeInput";
import SectionDateRange from "@/components/SectionDaterange";
import GuestsInput from "@/components/GuestsInput";
import type { StayDataType } from "@/types/stay";
import LocationMap from "@/components/LocationMap";
import { useBookingStore } from "@/store/useBookingStore";
import { calculatorPrice } from "@/lib/utils/calculatorPrice";
import { getRandomDescription } from "@/lib/utils/stayDes";
import ModalDetail from "@/components/ModelDetail";
import CategoryBadge from "@/shared/CategoryBadge";
import { useCartStore } from "@/store/useCartStore";
import { formatPrice } from "@/lib/utils/formatPrice";
import { useUser } from "@clerk/nextjs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AuthorType } from "@repo/types";
interface StayDetailPageClientProps {
  params: {
    slug: string;
  };
}

const API_URL =
  process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL || "http://localhost:8000";

const StayDetailPageClient = ({ params }: StayDetailPageClientProps) => {
  const { slug } = params;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const modal = searchParams?.get("modal");

  const { isSignedIn, isLoaded } = useUser();
  const { date, guests, checkInDate, checkOutDate } = useBookingStore();
  const isDisabled = !checkInDate || !checkOutDate;

  // --- STATE QUẢN LÝ DỮ LIỆU ---
  type ExtendedStayDataType = StayDataType & {
    joinDate?: string;
    responseRate?: string;
    checkInTime?: string;
    checkOutTime?: string;
    cancellationPolicy?: string;
    specialNotes?: string[];
    // Các trường display từ author sẽ được merge vào đây hoặc dùng state author riêng
  };

  const [stayData, setStayData] = useState<ExtendedStayDataType | null>(null);
  const [author, setAuthor] = useState<AuthorType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalImageState, setModalImageState] = useState<{
    images: string[];
    startIndex: number;
  } | null>(null);

  const [isOpenModalAmenities, setIsOpenModalAmenities] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  // --- 1. FETCH DỮ LIỆU TỪ BACKEND ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Bước A: Fetch thông tin khách sạn theo slug
        const hotelRes = await axios.get(`${API_URL}/hotels/${slug}`);
        const hotelData = hotelRes.data;

        if (!hotelData) {
          throw new Error("Không tìm thấy dữ liệu khách sạn");
        }
        setStayData(hotelData);

        // Bước B: Nếu có authorId, Fetch thông tin User (Author)
        if (hotelData.authorId) {
          try {
            // Gọi API lấy User: http://localhost:8000/users/:id
            const userRes = await axios.get<AuthorType>(
              `${API_URL}/users/${hotelData.authorId}`
            );
            const userData = userRes.data;

            // Mapping dữ liệu từ Backend IUser -> Frontend AuthorType
            const mappedAuthor: AuthorType = {
              id: userData.id,
              // Tách tên nếu cần, hoặc dùng tạm name cho firstName
              firstName: userData.name.split(" ")[0] || userData.name,
              lastName: userData.name.split(" ").slice(1).join(" ") || "",
              displayName: userData.nickname || userData.name,
              email: userData.email,
              avatar: userData.avatar || "/avatar.jpg",
              bgImage: userData.bgImage || "",
              // Tính toán số lượng bài viết
              countPosts: userData.posts ? userData.posts.length : 0,
              href: `/author/${userData.id}`, // Tạo link đến trang profile
              jobName: userData.jobName || "Chủ nhà",
              desc: userData.desc || "Chưa có giới thiệu.",
              // Giả lập rating vì User DB chưa có trường này
              starRating: 5,
              role: userData.role,
              name: userData.name,
              createdAt: userData.createdAt,
              updatedAt: userData.updatedAt,
            };
            setAuthor(mappedAuthor);
          } catch (err) {
            console.error("❌ Lỗi khi tải thông tin Author:", err);
            // Không throw error ở đây để vẫn hiện thông tin khách sạn dù lỗi author
          }
        }
      } catch (err: any) {
        console.error("❌ Error fetching details:", err);
        setError("Không tìm thấy khách sạn hoặc lỗi kết nối.");
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchData();
    }
  }, [slug]);

  // --- LOGIC MODAL ---
  const imagesForModal = useMemo(() => {
    if (!modalImageState) return [];
    return modalImageState.images;
  }, [modalImageState]);

  const handleOpenModalImageGallery = (startIndex: number) => {
    if (!stayData) return;
    const images = [
      stayData.featuredImage,
      ...(stayData.galleryImgs || []),
    ].filter(Boolean);
    setModalImageState({ images, startIndex });
    const newUrl = `${pathname}?modal=open`;
    router.push(newUrl, { scroll: false });
  };

  const handleCloseModal = () => {
    setModalImageState(null);
    router.push(pathname || "/", { scroll: false });
  };

  function openModalAmenities() {
    setIsOpenModalAmenities(true);
  }

  // --- LOGIC ADD TO CART ---
  const handleAddToCart = () => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      const redirectUrl = encodeURIComponent(pathname || "/");
      router.push(`/sign-in?redirect_url=${redirectUrl}`);
      return;
    }
    if (!stayData || isDisabled) return;

    // Tính toán lại giá
    const pricePerNight = Number(stayData.price) || 0;
    const { nights } = calculatorPrice({ pricePerNight, date });

    addItem({
      ...stayData,
      hotelId: stayData.id,
      name: stayData.title,
      reviewStart: stayData.reviewStart ?? 0,
      nights,
      totalGuests: guests.adults + guests.children + guests.infants,
    });
    router.push("/cart");
  };

  // --- RENDER LOADING / ERROR ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen space-x-2">
        <div className="w-4 h-4 rounded-full bg-blue-500 animate-bounce"></div>
        <div className="w-4 h-4 rounded-full bg-blue-500 animate-bounce delay-75"></div>
        <div className="w-4 h-4 rounded-full bg-blue-500 animate-bounce delay-150"></div>
      </div>
    );
  }

  if (error || !stayData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {error || "Không tìm thấy khách sạn"}
          </h3>
          <div className="mt-6 space-x-3">
            <Button variant="outline" onClick={() => router.back()}>
              Quay lại
            </Button>
            <Button variant="default" onClick={() => router.push("/")}>
              Về trang chủ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- DESTRUCTURE DATA (Kết hợp StayData và Author) ---
  const {
    featuredImage,
    galleryImgs,
    title,
    category,
    address,
    reviewStart,
    reviewCount,
    maxGuests,
    bedrooms,
    bathrooms,
    price,
    saleOff,
    map,
    amenities,
    description = getRandomDescription(),
    joinDate = author?.id ? new Date().getFullYear().toString() : "2023", // Lấy tạm nếu author api chưa trả về format đẹp
    responseRate = "100%",
    checkInTime = "14:00 - 23:00",
    checkOutTime = "08:00 - 12:00",
    cancellationPolicy = "Bạn có thể hủy miễn phí trong vòng 48 giờ sau khi đặt phòng.",
    specialNotes = ["Vui lòng giữ yên tĩnh sau 23h"],
  } = stayData;

  // Ưu tiên lấy thông tin hiển thị từ Author State đã fetch
  const displayName = author?.displayName || "Chủ nhà";
  const avatarUrl = author?.avatar || "/host-avatar.jpg";
  const authorDesc = author?.desc || "Chưa có mô tả về chủ nhà.";
  const authorJob = author?.jobName || "Chủ nhà";

  const pricePerNight = Number(price) || 0;
  const { nights, total } = calculatorPrice({ pricePerNight, date });
  const totalGuests = guests.adults + guests.children + guests.infants;

  const currentStayAmenities =
    amenities && Array.isArray(amenities)
      ? amenities
          .map((id) => Amenities_demos.find((item) => item.id === id))
          .filter((item): item is (typeof Amenities_demos)[0] => !!item)
      : [];

  const startIndexForModal = modalImageState?.startIndex || 0;

  // --- RENDER SUB-COMPONENTS ---
  const renderHeaderImages = () => {
    const mainImage = featuredImage || "/placeholder.jpg";
    const thumbs = galleryImgs?.slice(0, 4) || [];

    return (
      <header className="rounded-md sm:rounded-xl overflow-hidden relative mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-2 h-[636px]">
          <div
            className="relative rounded-md overflow-hidden cursor-pointer h-full"
            onClick={() => handleOpenModalImageGallery(0)}
          >
            <img
              src={mainImage}
              alt={title}
              className="w-full h-full object-cover rounded-md sm:rounded-xl hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black bg-opacity-20 opacity-0 hover:opacity-20 transition-opacity" />
          </div>

          <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full">
            {thumbs.map((img: string, index: number) => (
              <div
                key={index}
                className={`relative rounded-md overflow-hidden ${!img ? "bg-neutral-100" : ""}`}
                onClick={() => handleOpenModalImageGallery(index + 1)}
              >
                <img
                  src={img || "/placeholder.jpg"}
                  alt={`Gallery ${index}`}
                  className="w-full h-full object-cover rounded-md sm:rounded-xl hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black bg-opacity-20 opacity-0 hover:opacity-20 transition-opacity" />
              </div>
            ))}
          </div>

          <button
            className="absolute left-3 bottom-3 z-10 hidden md:flex items-center px-4 py-2 rounded-xl bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
            onClick={() => handleOpenModalImageGallery(0)}
          >
            <GalleryVerticalEnd className="w-5 h-5" />
            <span className="ml-2 text-neutral-800 text-sm font-medium">
              Xem tất cả ảnh
            </span>
          </button>
        </div>
      </header>
    );
  };

  const renderSection1 = () => {
    return (
      <div className="listingSection__wrap !space-y-6">
        <div className="flex justify-between items-center">
          <CategoryBadge category={category} />
          <LikeSaveBtns />
        </div>

        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold">
          {title}
        </h2>

        <div className="flex items-center space-x-4">
          <StartRating point={reviewStart} reviewCount={reviewCount} />
          <span>·</span>
          <div className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
            <MapPin className="w-4 h-4 mr-1" />
            {address}
          </div>
        </div>

        <div className="flex items-center">
          <Avatar className="h-10 w-10 ">
            <AvatarImage
              src={avatarUrl}
              alt={displayName}
              className="object-cover"
            />
            <AvatarFallback>{displayName?.charAt(0) || "H"}</AvatarFallback>
          </Avatar>
          <span className="ml-2.5 text-neutral-500 dark:text-neutral-400">
            Được chủ nhà{" "}
            <span className="text-neutral-900 dark:text-neutral-200 font-medium">
              {displayName}
            </span>{" "}
            cung cấp
          </span>
        </div>

        <Separator className="my-4" />

        <div className="flex items-center justify-between xl:justify-start space-x-8 xl:space-x-12 text-sm text-neutral-700 dark:text-neutral-300">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>
              {maxGuests || 0}{" "}
              <span className="hidden sm:inline-block">khách</span>
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Bed className="w-5 h-5" />
            <span>
              {bedrooms || 0}{" "}
              <span className="hidden sm:inline-block">giường</span>
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Bath className="w-5 h-5" />
            <span>
              {bathrooms || 0}{" "}
              <span className="hidden sm:inline-block">phòng tắm</span>
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <DoorOpen className="w-5 h-5" />
            <span>
              {bedrooms || 0}{" "}
              <span className="hidden sm:inline-block">phòng ngủ</span>
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderSection2 = () => {
    return (
      <div className="listingSection__wrap">
        <h2 className="text-2xl font-semibold">Thông tin chỗ ở</h2>
        <Separator className="my-4" />
        <div className="text-neutral-600 dark:text-neutral-300 space-y-4">
          <p>{description}</p>
        </div>
      </div>
    );
  };

  const renderSection3 = () => {
    return (
      <div className="listingSection__wrap">
        <div>
          <h2 className="text-2xl font-semibold">Tiện nghi</h2>
          <p className="mt-2 text-neutral-500 dark:text-neutral-400">
            Các tiện ích và dịch vụ được cung cấp tại chỗ ở này
          </p>
        </div>
        <Separator className="my-4" />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 text-sm text-neutral-700 dark:text-neutral-300">
          {currentStayAmenities.slice(0, 12).map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="flex items-center space-x-3">
                <Icon className="w-6 h-6 text-neutral-600" />
                <span>{item.name}</span>
              </div>
            );
          })}
        </div>

        {currentStayAmenities.length > 12 && (
          <>
            <Separator className="my-6" />
            <Button variant="outline" onClick={openModalAmenities}>
              Xem thêm {currentStayAmenities.length - 12} tiện nghi
            </Button>
          </>
        )}
        {renderModalAmenities()}
      </div>
    );
  };

  const renderModalAmenities = () => {
    return (
      <Dialog
        open={isOpenModalAmenities}
        onOpenChange={setIsOpenModalAmenities}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-4xl">
          <DialogHeader>
            <DialogTitle>Tiện nghi có sẵn</DialogTitle>
            <DialogDescription>
              Danh sách đầy đủ các tiện nghi tại {title}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentStayAmenities.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-center py-2.5 space-x-5 border-b border-neutral-100 dark:border-neutral-800"
                >
                  <Icon className="w-7 h-7 text-neutral-600" />
                  <span className="text-base">{item.name}</span>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const renderSection4 = () => {
    return (
      <div className="listingSection__wrap">
        <div>
          <h2 className="text-2xl font-semibold">Bảng giá</h2>
          <p className="mt-2 text-neutral-500 dark:text-neutral-400">
            Giá có thể tăng vào cuối tuần hoặc dịp lễ
          </p>
        </div>
        <Separator className="my-4" />
        <div className="flow-root">
          <div className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 -mb-4">
            {[
              {
                label: "Giá mỗi đêm",
                price: formatPrice(price),
              },
              { label: "Số đêm tối thiểu", price: "1 đêm" },
              { label: "Số đêm tối đa", price: "90 đêm" },
              {
                label: "Giảm giá ",
                price: saleOff ? saleOff.split(" ")[0] : "0%",
              },
            ].map((item, index) => (
              <div
                key={index}
                className={`p-4 flex justify-between items-center space-x-4 rounded-lg mb-2 ${
                  index % 2 === 0 ? "bg-neutral-100 dark:bg-neutral-800" : ""
                }`}
              >
                <span>{item.label}</span>
                <span className="font-medium">{item.price}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSection5 = () => {
    return (
      <div className="listingSection__wrap">
        <h2 className="text-2xl font-semibold">Thông tin chủ nhà</h2>
        <Separator className="my-4" />

        <div className="flex items-center space-x-4">
          <Avatar className="h-14 w-14">
            <AvatarImage
              src={avatarUrl}
              alt={displayName}
              className="object-cover"
            />
            <AvatarFallback>{displayName?.charAt(0) || "H"}</AvatarFallback>
          </Avatar>
          <div>
            <Link className="block text-xl font-medium" href="#">
              {displayName}
            </Link>
            <div className="mt-1.5 flex items-center text-sm text-neutral-500 dark:text-neutral-400">
              <StartRating point={5} reviewCount={author?.countPosts || 10} />
              <span className="mx-2">·</span>
              <span>{authorJob}</span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-neutral-600 dark:text-neutral-300">
          {authorDesc}
        </p>

        <div className="mt-6 space-y-3 text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>
              Tham gia từ{" "}
              {new Date(author?.id ? new Date() : joinDate).getFullYear()}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>Tỷ lệ phản hồi - {responseRate}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Phản hồi nhanh - trong vài giờ</span>
          </div>
        </div>

        <Separator className="my-6" />
        <Button variant="outline" asChild>
          <Link href="#">Xem hồ sơ chủ nhà</Link>
        </Button>
      </div>
    );
  };

  const renderSection6 = () => {
    return (
      <div className="listingSection__wrap">
        <h2 className="text-2xl font-semibold">
          Đánh giá ({reviewCount} đánh giá)
        </h2>
        <Separator className="my-4" />

        <div className="space-y-5">
          <FiveStar iconClass="w-6 h-6" className="space-x-0.5" />
          <div className="relative">
            <Input
              placeholder="Chia sẻ cảm nhận của bạn..."
              className="h-16 rounded-3xl"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-12 w-12"
              onClick={() => {}}
            >
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="divide-y divide-neutral-200 dark:divide-neutral-800 mt-6">
          <CommentListing />

          <div className="pt-8">
            <Button variant="outline" asChild>
              <Link href="#">Xem thêm đánh giá</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderSection7 = () => {
    return (
      <div className="listingSection__wrap h-">
        <div>
          <h2 className="text-2xl font-semibold">Vị trí</h2>
          <p className="mt-2 text-neutral-500 dark:text-neutral-400">
            {address}
          </p>
        </div>
        <Separator className="my-4" />
        <LocationMap address={address} lat={map?.lat} lng={map?.lng} />
      </div>
    );
  };

  const renderSection8 = () => {
    return (
      <div className="listingSection__wrap">
        <h2 className="text-2xl font-semibold">Thông tin cần biết</h2>
        <Separator className="my-4" />

        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold">Chính sách hủy</h4>
            <p className="mt-3 text-neutral-500 dark:text-neutral-400">
              {cancellationPolicy}
            </p>
          </div>

          <Separator />

          <div>
            <h4 className="text-lg font-semibold">Giờ nhận phòng</h4>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                <span>Nhận phòng</span>
                <span>{checkInTime}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg">
                <span>Trả phòng</span>
                <span>{checkOutTime}</span>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-lg font-semibold">Lưu ý đặc biệt</h4>
            <ul className="mt-3 text-neutral-500 dark:text-neutral-400 space-y-2 list-disc pl-5">
              {specialNotes?.map((note: string, idx: number) => (
                <li key={idx}>{note}</li>
              )) || <li>Không gây ồn sau 23h.</li>}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderSidebar = () => {
    if (!stayData) return null;

    return (
      <Card className="shadow-xl sticky top-28">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start ">
            <div>
              <span className="text-3xl font-semibold">
                {formatPrice(stayData.price)}
              </span>
              <span className="ml-1 text-base font-normal text-neutral-500 dark:text-neutral-400">
                /đêm
              </span>
            </div>
            <div className="mt-2">
              <StartRating
                point={stayData.reviewStart}
                reviewCount={stayData.reviewCount}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <form className="flex flex-col border border-neutral-200 dark:border-neutral-700 rounded-3xl">
            <StayDatesRangeInput className="flex-1 z-[11]" />
            <div className="w-full border-b border-neutral-200 dark:border-neutral-700"></div>
            <GuestsInput className="flex-1" />
          </form>

          <div className="space-y-3">
            <div className="flex justify-between text-neutral-600 dark:text-neutral-300">
              <span>
                {pricePerNight.toLocaleString("vi-VN")}đ x {nights} đêm
              </span>
              <span>{total.toLocaleString("vi-VN")}đ</span>
            </div>
            <div className="flex justify-between text-neutral-600 dark:text-neutral-300">
              <span>Phí dịch vụ</span>
              <span>0đ</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Tổng cộng</span>
              <span>{total.toLocaleString("vi-VN")} đ</span>
            </div>
            <div className="text-sm text-neutral-500">
              Tổng khách: <b>{totalGuests}</b>
            </div>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="w-full inline-block">
                  <Button
                    className="w-full"
                    onClick={handleAddToCart}
                    disabled={isDisabled}
                  >
                    Đặt phòng ngay
                  </Button>
                </span>
              </TooltipTrigger>

              {isDisabled && (
                <TooltipContent side="top" className="bg-yellow-500 text-white">
                  <p>Vui lòng chọn ngày đặt phòng</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container py-11 lg:py-16 px-8">
      {renderHeaderImages()}

      {modal === "open" && imagesForModal.length > 0 && (
        <ModalDetail
          images={imagesForModal}
          startIndex={startIndexForModal}
          onClose={handleCloseModal}
        />
      )}

      {/* MAIN CONTENT */}
      <main className="relative z-10 mt-11 flex flex-col lg:flex-row">
        {/* CONTENT */}
        <div className="w-full lg:w-3/5 xl:w-2/3 space-y-8 lg:space-y-10 lg:pr-10 ">
          {renderSection1()}
          {renderSection2()}
          {renderSection3()}
          {renderSection4()}
          <SectionDateRange />
          {renderSection5()}
          {renderSection6()}
          {renderSection7()}
          {renderSection8()}
        </div>

        {/* SIDEBAR */}
        <div className="hidden lg:block flex-grow mt-14 lg:mt-0">
          {renderSidebar()}
        </div>
      </main>
    </div>
  );
};

export default StayDetailPageClient;
