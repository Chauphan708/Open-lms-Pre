# 📱 HƯỚNG DẪN CÀI ĐẶT & BIÊN DỊCH NATIVE MOBILE APP (CAPACITOR) - OPEN LMS

Tài liệu này hướng dẫn chi tiết từng bước cách cài đặt môi trường, biên dịch và chạy ứng dụng **Open LMS** dạng ứng dụng native trên cả hai hệ điều hành **Android** và **iOS** sử dụng **Capacitor**.

---

## 🛠️ PHẦN 1: ĐIỀU KIỆN TIÊN QUYẾT CHUNG
Trước khi đi vào cấu hình riêng cho từng nền tảng, hãy đảm bảo máy tính của bạn đã được cài đặt:
1. **Node.js** (Phiên bản v18 trở lên).
2. **npm** (Đi kèm Node.js).
3. Bản dựng web static mới nhất:
   ```bash
   npm run build
   ```
4. Đồng bộ hóa sang các nền tảng di động:
   ```bash
   npx cap sync
   ```

---

## 🤖 PHẦN 2: HƯỚNG DẪN DÀNH CHO NỀN TẢNG ANDROID

Thư mục dự án Android nằm tại: `C:\Users\PC\.gemini\antigravity\scratch\open-lms-aistudio\android`

### 1. Cài đặt các công cụ cần thiết
* **Tải và cài đặt Android Studio:** [Tải Android Studio tại đây](https://developer.android.com/studio).
* **Cài đặt SDK & Tools:**
  * Mở Android Studio -> Chọn **SDK Manager** (hoặc Settings > Appearance & Behavior > System Settings > Android SDK).
  * Trong tab **SDK Platforms**, cài đặt phiên bản Android SDK mới nhất (Khuyên dùng Android 13/14 - API Level 33/34).
  * Trong tab **SDK Tools**, cài đặt:
    * *Android SDK Build-Tools*
    * *Android SDK Command-line Tools (latest)*
    * *Android Emulator*
    * *Intel x86 Emulator Accelerator (HAXM installer)* (Nếu dùng CPU Intel).

### 2. Thiết lập Biến môi trường (Environment Variables)
* Trên Windows, mở **Edit the system environment variables** (Chỉnh sửa biến môi trường hệ thống).
* Thêm biến `ANDROID_HOME` trỏ tới đường dẫn SDK Android của bạn (Mặc định: `C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk`).
* Thêm vào biến `Path` các đường dẫn sau:
  * `%ANDROID_HOME%\platform-tools`
  * `%ANDROID_HOME%\emulator`

### 3. Mở và Biên dịch Dự án trên Android Studio
* Chạy lệnh sau để mở tự động dự án Android trong Android Studio:
  ```bash
  npx cap open android
  ```
  *(Hoặc mở Android Studio -> Chọn **Open** -> Trỏ tới thư mục `C:\Users\PC\.gemini\antigravity\scratch\open-lms-aistudio\android`).*
* Đợi Android Studio hoàn tất việc tải và đồng bộ Gradle (có thể mất 1-3 phút ở lần đầu tiên).

### 4. Chạy và Build ứng dụng
* **Chạy trên máy ảo (Emulator):**
  * Trong Android Studio, mở **Device Manager** -> Tạo một thiết bị ảo mới (Ví dụ: Pixel 6 với Android 13).
  * Nhấn nút **Play** màu xanh trên thanh công cụ để khởi chạy máy ảo và cài đặt app lên máy ảo.
* **Chạy trên thiết bị thật:**
  * Kích hoạt **Developer Options** (Tùy chọn nhà phát triển) trên điện thoại Android của bạn bằng cách nhấn 7 lần vào *Build Number* (Số hiệu bản dựng) trong phần giới thiệu điện thoại.
  * Bật chế độ **USB Debugging** (Gỡ lỗi USB).
  * Kết nối điện thoại với máy tính bằng cáp USB.
  * Trong Android Studio, chọn thiết bị của bạn từ danh sách thiết bị chạy và nhấn **Play**.
* **Xuất file cài đặt APK:**
  * Chọn **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
  * File `.apk` sau khi xuất ra sẽ nằm tại thư mục: `android/app/build/outputs/apk/debug/app-debug.apk` để bạn có thể cài trực tiếp lên bất kỳ điện thoại Android nào!

---

## 🍏 PHẦN 3: HƯỚNG DẪN DÀNH CHO NỀN TẢNG iOS

Thư mục dự án iOS nằm tại: `C:\Users\PC\.gemini\antigravity\scratch\open-lms-aistudio\ios`

*(Lưu ý: Để build ứng dụng iOS, bạn bắt buộc phải sử dụng máy tính chạy hệ điều hành macOS và có cài đặt Xcode).*

### 1. Cài đặt các công cụ cần thiết
* **Xcode:** Tải miễn phí trên Mac App Store.
* **CocoaPods:** Quản lý thư viện phụ thuộc cho iOS. Mở ứng dụng Terminal trên macOS và chạy lệnh:
  ```bash
  sudo gem install cocoapods
  ```
  *(Đối với chip Apple Silicon M1/M2/M3, bạn có thể cần chạy thêm lệnh: `arch -x86_64 sudo gem install cocoapods`).*

### 2. Cài đặt các Dependencies CocoaPods
* Di chuyển vào thư mục ứng dụng iOS và cài đặt các pod liên quan:
  ```bash
  cd ios/App
  pod install
  ```

### 3. Mở và Cấu hình Dự án trên Xcode
* Chạy lệnh sau để mở tự động Xcode project:
  ```bash
  npx cap open ios
  ```
  *(Hoặc mở Xcode -> Chọn **Open a project or file** -> Trỏ tới file `ios/App/App.xcworkspace`).*

### 4. Cấu hình Signing (Định danh nhà phát triển)
Trước khi cài đặt app lên iPhone thật hoặc Simulator, bạn cần ký ứng dụng (App Signing):
* Trong cột bên trái của Xcode, click vào dự án **App** (ở trên cùng).
* Chọn tab **Signing & Capabilities**.
* Đảm bảo đã tích chọn **Automatically manage signing**.
* Trong mục **Team**, chọn tài khoản Apple ID của bạn (Tài khoản miễn phí cá nhân vẫn hỗ trợ chạy thử nghiệm trên thiết bị thật).
* Cập nhật **Bundle Identifier** nếu cần (Ví dụ: `com.openlms.aistudio`).

### 5. Chạy và Build ứng dụng
* **Chạy trên máy ảo iOS Simulator:**
  * Ở thanh công cụ trên cùng Xcode, chọn một máy ảo iPhone (ví dụ: iPhone 15 Pro).
  * Nhấn nút **Play** (hoặc phím tắt `Cmd + R`) để bắt đầu biên dịch và chạy ứng dụng trên Simulator.
* **Chạy trên iPhone thật:**
  * Kết nối iPhone của bạn với máy Mac bằng cáp Lightning/USB-C.
  * Chọn thiết bị iPhone của bạn trên thanh công cụ Xcode làm thiết bị đích.
  * Nhấn nút **Play** để biên dịch.
  * *Lưu ý:* Khi chạy lần đầu trên iPhone thật, bạn cần vào điện thoại: **Cài đặt (Settings)** > **Cài đặt chung (General)** > **Quản lý thiết bị & VPN (VPN & Device Management)** > Chọn cấu hình Apple ID của bạn và chọn **Tin cậy (Trust)** để cấp quyền chạy app.

---

## ⚡ PHẦN 4: LỆNH ĐỒNG BỘ MÃ NGUỒN NHANH KHI CÓ THAY ĐỔI
Mỗi khi bạn thực hiện các thay đổi về mã nguồn Web (React/Vite) và muốn cập nhật ngay lên ứng dụng di động đang phát triển:
1. Chạy lệnh build web:
   ```bash
   npm run build
   ```
2. Đồng bộ mã nguồn sang App di động:
   ```bash
   npx cap sync
   ```
3. Chạy trực tiếp trên thiết bị (không cần mở Android Studio/Xcode):
   * Chạy Android: `npx cap run android`
   * Chạy iOS: `npx cap run ios`
