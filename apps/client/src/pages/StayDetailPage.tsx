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
import { toast } from "sonner";
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
import { trackInteraction } from "@/lib/utils/analytics";
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

  // checking
  const [isChecking, setIsChecking] = useState(false); // Loading khi đang check
  const [isAvailable, setIsAvailable] = useState(true); // Mặc định là true để hiện nút
  const [availabilityMsg, setAvailabilityMsg] = useState("");
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
              `${API_URL}/users/${hotelData.authorId}`,
            );
            const userData = userRes.data.data;
            console.log("userData:", userData);
            const fullName = userData.name ?? userData.nickname ?? "Unknown";
            console.log("fullname", fullName);
            // Mapping dữ liệu từ Backend IUser -> Frontend AuthorType
            const mappedAuthor: AuthorType = {
              id: userData.id,
              // Tách tên nếu cần, hoặc dùng tạm name cho firstName
              firstName: fullName.split(" ")[0] || fullName,
              lastName: fullName.split(" ").slice(1).join(" ") || "",
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
  // --- 2. LOGIC THEO DÕI VIEW HOTEL ---
  useEffect(() => {
    // Chỉ track khi đã có dữ liệu hotel (có ID)
    if (!stayData?.id) return;

    const startTime = Date.now();
    // console.log(`👁️ Bắt đầu theo dõi: ${stayData.title}`);

    // Hàm cleanup chạy khi user rời trang hoặc đóng tab
    return () => {
      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000); // Tính giây

      // Chỉ gửi nếu xem > 5 giây (để loại bỏ click nhầm/bounce)
      if (duration > 5) {
        trackInteraction("VIEW", stayData.id, { duration });
        // console.log(`📡 Đã gửi VIEW event: ${duration}s`);
      }
    };
  }, [stayData?.id]);

  const BOOKING_API_URL =
    process.env.NEXT_PUBLIC_BOOKING_SERVICE_URL || "http://localhost:8001";

  useEffect(() => {
    const checkAvailability = async () => {
      // 1. Chỉ check khi đã chọn đủ ngày và có dữ liệu hotel
      if (!checkInDate || !checkOutDate || !stayData?.id) {
        return;
      }

      setIsChecking(true);
      setAvailabilityMsg("");

      try {
        // Gọi API kiểm tra (bạn cần tạo endpoint này ở Backend Booking Service như bài trước)
        // GET /api/check-availability?hotelId=1&checkIn=...&checkOut=...
        const res = await axios.get(`${BOOKING_API_URL}/check-availability`, {
          params: {
            hotelId: stayData.id,
            checkIn: checkInDate.toISOString(), // Chuyển về string ISO
            checkOut: checkOutDate.toISOString(),
          },
          withCredentials: true,
        });

        // Backend trả về { available: true/false, message: "..." }
        if (res.data.available) {
          setIsAvailable(true);
        } else {
          setIsAvailable(false);
          setAvailabilityMsg(
            res.data.message || "Phòng đã kín lịch trong ngày này.",
          );
        }
      } catch (error: any) {
        console.error("Check availability error:", error);
        // Nếu lỗi 409 (Conflict) nghĩa là trùng lịch
        if (error.response?.status === 409) {
          setIsAvailable(false);
          setAvailabilityMsg("Ngày bạn chọn đã có người đặt.");
        } else {
          // Lỗi khác thì tạm thời cho phép hoặc hiện lỗi connection
          // setIsAvailable(true);
        }
      } finally {
        setIsChecking(false);
      }
    };

    // Debounce nhẹ để tránh gọi API liên tục khi user đang click chọn ngày nhanh
    const timer = setTimeout(() => {
      checkAvailability();
    }, 500);

    return () => clearTimeout(timer);
  }, [checkInDate, checkOutDate, stayData?.id]);

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
    if (!isAvailable) {
      toast.error("Phòng này đã có người đặt trong khoảng thời gian bạn chọn!");
      return;
    }
    trackInteraction("CLICK_BOOK_NOW", stayData.id);
    // Tính toán lại giá
    const pricePerNight = Number(stayData.price) || 0;
    const { nights } = calculatorPrice({ pricePerNight, date });
    const categoryObj = stayData.category as any;
    const categoryName = categoryObj?.name || categoryObj || "";

    // Logic kiểm tra
    const isWholeHouse = ["Biệt thự", "Homestay", "Căn hộ", "Nhà gỗ"].includes(
      categoryName,
    );
    const roomName = isWholeHouse ? "Nguyên căn" : "Standard Room";
    addItem({
      ...stayData,
      hotelId: stayData.id,
      id: stayData.id, // Room ID (Dùng để làm key xóa trong giỏ hàng)

      // 2. 🔥 MAP TÊN KHÁCH SẠN (Quan trọng nhất để fix lỗi Unknown Hotel)
      title: stayData.title, // Bắt buộc phải có trường này

      // 3. MAP TÊN PHÒNG
      // Nếu stayData không có field tên phòng, hãy đặt mặc định
      name: roomName || "Standard Room",

      // 4. Các trường khác
      price: Number(stayData.price) || 0,
      reviewStar: stayData.reviewStar ?? 0,
      nights,
      totalGuests: guests.adults + guests.children + guests.infants,

      // Map thêm ảnh để chắc chắn có hình
      featuredImage: stayData.featuredImage || stayData.featuredImage,
      address: stayData.address,
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
    reviewStar,
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
    // 1. Chuẩn bị danh sách ảnh: Ảnh chính + 4 ảnh phụ
    const mainImage = featuredImage || "/placeholder.jpg";

    // Đảm bảo luôn lấy đủ 4 ảnh cho khung bên phải (nếu thiếu thì mảng sẽ ít hơn, layout sẽ tự xử lý ở dưới)
    const subImages = galleryImgs?.slice(1, 5) || [];

    // Nếu không có đủ 4 ảnh phụ, ta cần logic để lấp đầy hoặc ẩn bớt (để đơn giản ta hiển thị những gì có)
    // Để layout đẹp nhất, chiều cao nên responsive: Mobile thấp, Desktop cao vừa phải (khoảng 500-600px)

    return (
      <header className="rounded-md sm:rounded-xl overflow-hidden relative mt-4">
        {/* SỬ DỤNG GRID CHUẨN: 4 cột x 2 dòng */}
        <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-2 h-[400px] md:h-[500px] lg:h-[600px]">
          {/* ẢNH CHÍNH (BÊN TRÁI): Chiếm 2 cột, 2 dòng (full chiều cao bên trái) */}
          <div
            className="md:col-span-2 md:row-span-2 relative cursor-pointer group"
            onClick={() => handleOpenModalImageGallery(0)}
          >
            <img
              src={mainImage}
              alt={title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-15 transition-opacity duration-300" />
          </div>

          {/* CÁC ẢNH PHỤ (BÊN PHẢI): Tự động lấp vào các ô còn lại */}
          {/* Logic: Nếu có ảnh thì hiện, nếu thiếu thì ô đó sẽ trống hoặc ta có thể render placeholder */}
          {subImages.length > 0
            ? subImages.map((img, index) => (
                <div
                  key={index}
                  className="relative cursor-pointer group overflow-hidden"
                  onClick={() => handleOpenModalImageGallery(index + 1)}
                >
                  <img
                    src={img || "/placeholder.jpg"}
                    alt={`Gallery ${index}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-15 transition-opacity duration-300" />
                </div>
              ))
            : // Nếu không có ảnh phụ nào, hiển thị placeholder để giữ khung không bị vỡ (tuỳ chọn)
              [1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-neutral-100 w-full h-full flex items-center justify-center text-neutral-400"
                >
                  <span className="text-xs">No Image</span>
                </div>
              ))}
        </div>

        {/* Nút xem tất cả ảnh */}
        <button
          className="absolute right-3 bottom-3 z-10 hidden md:flex items-center px-4 py-2 rounded-lg bg-white/90 text-neutral-800 hover:bg-white shadow-sm transition-colors text-sm font-medium"
          onClick={() => handleOpenModalImageGallery(0)}
        >
          <GalleryVerticalEnd className="w-4 h-4 mr-2" />
          Xem tất cả ảnh
        </button>
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
          <StartRating point={reviewStar} reviewCount={reviewCount} />
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
            Được{" "}
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
                point={stayData.reviewStar}
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
            {!isAvailable && !isChecking && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm">
                <span className="font-medium">⚠️ {availabilityMsg}</span>
              </div>
            )}
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="w-full inline-block">
                  <Button
                    className={`w-full ${!isAvailable ? "bg-neutral-400 hover:bg-neutral-400 cursor-not-allowed" : ""}`}
                    onClick={handleAddToCart}
                    // Disable nút khi:
                    // 1. Chưa chọn ngày (isDisabled)
                    // 2. Đang kiểm tra server (isChecking)
                    // 3. Phòng không trống (!isAvailable)
                    disabled={isDisabled || isChecking || !isAvailable}
                  >
                    {isChecking ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Đang kiểm tra...
                      </span>
                    ) : !isAvailable ? (
                      "Hết phòng ngày này"
                    ) : (
                      "Đặt phòng ngay"
                    )}
                  </Button>
                </span>
              </TooltipTrigger>

              {/* Tooltip giải thích */}
              {(isDisabled || !isAvailable) && (
                <TooltipContent
                  side="top"
                  className="bg-neutral-800 text-white"
                >
                  <p>
                    {isDisabled
                      ? "Vui lòng chọn ngày nhận/trả phòng"
                      : !isAvailable
                        ? "Vui lòng chọn ngày khác"
                        : ""}
                  </p>
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
