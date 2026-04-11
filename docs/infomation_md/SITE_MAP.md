# SITE MAP - STAZY Platform

## CLIENT APPLICATION SITEMAP (PlantUML WBS)

```plantuml
@startwbs
' --- CẤU HÌNH GIAO DIỆN PHẲNG (FLAT DESIGN) ---
skinparam shadowing false
skinparam defaultFontName "Segoe UI"
skinparam defaultFontSize 14
skinparam RoundCorner 10
skinparam ArrowColor #555555
skinparam BackgroundColor white

' Cấu hình màu sắc cho từng Node (Level)
<style>
wbsDiagram {
  ' Gốc (Root)
  .root {
      BackgroundColor #2E7D32
      FontColor White
      FontStyle Bold
      FontSize 16
      Padding 15
  }

  ' Nhánh cấp 1 (Màu Vàng - Discovery)
  .discovery {
      BackgroundColor #FDD835
      FontColor Black
  }

  ' Nhánh cấp 1 (Màu Cam - Host)
  .host {
      BackgroundColor #FB8C00
      FontColor White
  }

  ' Nhánh cấp 1 (Màu Đỏ - Transaction)
  .transaction {
      BackgroundColor #E53935
      FontColor White
  }

  ' Nhánh cấp 1 (Màu Xanh - User)
  .user {
      BackgroundColor #1E88E5
      FontColor White
  }

  ' Các nút con (Màu trắng, viền mảnh)
  node {
      BackgroundColor White
      BorderColor #999999
      FontColor Black
  }
}
</style>

' --- NỘI DUNG SITEMAP CLIENT ---

* **TRANG CHỦ STAZY** <<root>>
**/

' NHÁNH 1: KHÁM PHÁ (Discovery)
** Khám Phá & Công Khai <<discovery>>
*** Tìm Kiếm
****/search-service
*** Danh Sách Khách Sạn
****/hotels
*** Chi Tiết Khách Sạn
****/hotels/[slug]
*** Giới Thiệu
****/about
*** Trang Test & Debug
**** Trang Test
*****/test
**** Debug Role
*****/debug-role
**** Debug Simple
*****/debug-role-simple

' NHÁNH 2: NGƯỜI DÙNG (User & Auth)
** Người Dùng & Xác Thực <<user>>
*** Xác Thực
**** Đăng Nhập
*****/sign-in
**** Đăng Ký
*****/sign-up
*** Thông Tin Cá Nhân
**** Hồ Sơ Của Tôi
*****/profile/[id]
**** Đặt Phòng Của Tôi
*****/my-bookings

' NHÁNH 3: GIAO DỊCH (Transaction)
** Giao Dịch <<transaction>>
*** Giỏ Hàng
****/cart
*** Thanh Toán
****/checkout
*** Hoàn Trả
****/return

' NHÁNH 4: QUẢN LÝ CHỦ NHÀ (Host)
** Quản Lý Chủ Nhà <<host>>
*** Bảng Điều Khiển
****/host
*** Chi Tiết Host
****/host/[id]
*** Khách Sạn Của Tôi
****/my-hotels
*** Tạo Khách Sạn
****/create-hotel

@endwbs
```

---

## ADMIN APPLICATION SITEMAP (PlantUML WBS)

```plantuml
@startwbs
' --- CẤU HÌNH GIAO DIỆN PHẲNG (FLAT DESIGN) ---
skinparam shadowing false
skinparam defaultFontName "Segoe UI"
skinparam defaultFontSize 14
skinparam RoundCorner 10
skinparam ArrowColor #555555
skinparam BackgroundColor white

<style>
wbsDiagram {
  .root {
      BackgroundColor #1565C0
      FontColor White
      FontStyle Bold
      FontSize 16
      Padding 15
  }

  .auth {
      BackgroundColor #43A047
      FontColor White
  }

  .dashboard {
      BackgroundColor #5E35B1
      FontColor White
  }

  .management {
      BackgroundColor #FB8C00
      FontColor White
  }

  .approval {
      BackgroundColor #E53935
      FontColor White
  }

  node {
      BackgroundColor White
      BorderColor #999999
      FontColor Black
  }
}
</style>

' --- NỘI DUNG SITEMAP ADMIN ---

* **BẢNG ĐIỀU KHIỂN ADMIN** <<root>>
**/

' NHÁNH 1: XÁC THỰC
** Xác Thực <<auth>>
*** Đăng Nhập
***/sign-in
*** Không Có Quyền
***/unauthorized

' NHÁNH 2: DASHBOARD & PHÂN TÍCH
** Dashboard & Giám Sát <<dashboard>>
*** Trang Dashboard
***/
*** Phân Tích
***/analytics
*** Thông Báo
***/notifications
*** Tin Nhắn
***/message

' NHÁNH 3: QUẢN LÝ PHẪ DUYỆT
** Quản Lý Phê Duyệt <<approval>>
*** Phê Duyệt Khách Sạn
***/hotel-approvals
*** Yêu Cầu Tác Giả
***/author-requests

' NHÁNH 4: QUẢN LÝ TÀI NGUYÊN
** Quản Lý Tài Nguyên <<management>>
*** Quản Lý Sản Phẩm
**** Danh Sách Sản Phẩm
*****/products
**** Chi Tiết Sản Phẩm
*****/products/[id]
*** Quản Lý Người Dùng
**** Danh Sách Người Dùng
*****/users
**** Chi Tiết Người Dùng
*****/users/[id]
*** Quản Lý Đặt Phòng
**** Danh Sách Đặt Phòng
*****/bookings

@endwbs
```

---

## IMPLEMENTATION GUIDE

### 📱 Integrated Sitemap Features

#### 1. **UserSetting Dropdown** (Already Implemented)

- Click vào avatar → Chọn "Sitemap"
- Mở Sheet sidebar bên phải với sitemap tree interactive

#### 2. **Navbar Quick Access** (Already Implemented)

- Icon Map trên thanh navigation
- Hover hiển thị tooltip "Sitemap"
- Click mở Sheet giống UserSetting

### 🎨 Component Structure

```
components/
└── sitemap/
    ├── index.ts              # Export file
    ├── SitemapSheet.tsx      # Sheet wrapper component
    └── SitemapTree.tsx       # Interactive tree component
```

### 🔧 Features

✅ **Interactive Tree Navigation**

- Click để expand/collapse các nhánh
- Highlight route hiện tại
- Show path khi hover
- Icons cho từng route
- Color-coded theo category

✅ **Responsive Design**

- Mobile-friendly sheet
- Smooth animations
- Auto-expand 2 levels đầu

✅ **Integration Points**

- UserSetting dropdown menu
- Navbar icon button
- ChatWidget có thể thêm

### 🎯 Usage Examples

```tsx
// Basic usage in dropdown
<SitemapSheet trigger="custom">
  <DropdownMenuItem>
    <Map className="h-4 w-4" /> Sitemap
  </DropdownMenuItem>
</SitemapSheet>

// Button trigger in navbar
<SitemapSheet trigger="custom">
  <button>
    <Map className="w-5 h-5" />
  </button>
</SitemapSheet>

// Default button trigger
<SitemapSheet />
```

---

## ROUTE STRUCTURE SUMMARY

### CLIENT ROUTES (19 routes)

```
PUBLIC (7 routes)
/                          - Homepage
/search-service            - Search results
/hotels                    - Hotel list
/hotels/[slug]             - Hotel details
/about                     - About page
/test                      - Test page
/debug-role                - Debug tools
/debug-role-simple         - Debug simple

AUTHENTICATION (2 routes)
/sign-in                   - Sign in
/sign-up                   - Sign up

USER PROFILE (2 routes)
/profile/[id]              - User profile
/my-bookings               - User bookings

TRANSACTION (3 routes)
/cart                      - Shopping cart
/checkout                  - Checkout
/return                    - Payment return

HOST MANAGER (5 routes)
/host                      - Host dashboard
/host/[id]                 - Host details
/my-hotels                 - Host hotels list
/create-hotel              - Create hotel
```

### ADMIN ROUTES (12 routes)

```
AUTHENTICATION (2 routes)
/sign-in                   - Admin login
/unauthorized              - Access denied

DASHBOARD (4 routes)
/                          - Dashboard home
/analytics                 - Analytics
/notifications             - Notifications
/message                   - Messages

APPROVALS (2 routes)
/hotel-approvals           - Hotel approvals
/author-requests           - Author requests

MANAGEMENT (4 routes)
/products                  - Products list
/products/[id]             - Product details
/users                     - Users list
/users/[id]                - User details
/bookings                  - Bookings list
```

---

## HOW TO USE PLANTUML IN DRAW.IO

### Method 1: Direct Import

1. Copy PlantUML code (từ `@startwbs` đến `@endwbs`)
2. Vào Draw.io → **Arrange** → **Insert** → **Advanced** → **PlantUML**
3. Paste code vào
4. Click **Insert**

### Method 2: Online Viewer

1. Visit: http://www.plantuml.com/plantuml/uml/
2. Paste PlantUML code
3. Export as PNG/SVG
4. Import vào Draw.io

### Method 3: VS Code Extension

1. Install "PlantUML" extension
2. Create `.puml` file với nội dung PlantUML
3. Preview với `Alt+D`
4. Export diagram

---

## DESIGN NOTES

### Color Scheme

- **Root (Green)**: Main homepage - `#2E7D32`
- **Discovery (Yellow)**: Public pages - `#FDD835`
- **User (Blue)**: Auth & profile - `#1E88E5`
- **Transaction (Red)**: Shopping flow - `#E53935`
- **Host (Orange)**: Host management - `#FB8C00`

### Benefits

- ✅ Visual overview toàn bộ website structure
- ✅ Easy navigation cho users
- ✅ Developer reference
- ✅ Client presentation
- ✅ Documentation purposes
