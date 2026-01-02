# Last Pic - Android WebView App

## 📱 프로젝트 개요

**Last Pic**은 Capacitor 기반의 Android WebView 앱으로, 웹 기반 이미지 편집 및 다운로드 기능을 제공합니다.

---

## ✅ 현재 완료된 기능

### 1. **WebView 구성**
- `activity_main.xml` 생성 완료 (FrameLayout + WebView)
- WebView ID: `webview`
- 전체 화면 레이아웃

### 2. **MainActivity.java 수정**
- AppCompatActivity 기반
- JavaScript Interface 추가: `Android.downloadImage(base64Data)`
- WebView 설정:
  - JavaScript 활성화
  - DOM Storage 활성화
  - File Access 허용
  - 콘솔 로그 출력 (chromium 태그)
- 다운로드 기능:
  - Canvas → Base64 변환
  - MediaStore를 통한 갤러리 저장
  - Pictures/LastPic 폴더에 저장
  - 파일명: `LastPic_YYYYMMDD_HHMMSS.png`
- 저장소 권한 처리 (Android 9 이하)
- 백 버튼 처리: OnBackPressedDispatcher

### 3. **AndroidManifest.xml**
- 권한 추가:
  - `WRITE_EXTERNAL_STORAGE` (Android 9 이하)
  - `READ_EXTERNAL_STORAGE` (Android 12 이하)
  - `INTERNET`
- **현재 테마 설정**: `Theme.AppCompat.Light.NoActionBar` 적용 필요

### 4. **index.html JavaScript**
- Canvas 이미지를 Base64로 변환
- Android Interface 감지 및 호출
- 웹/앱 환경 자동 감지
- 다운로드 버튼 이벤트 가로채기

### 5. **빌드 버전**
- **Play Console 업로드 버전**: versionCode 13, versionName "1.0.8"
- **다음 빌드 버전**: versionCode 14, versionName "1.0.9" (예정)

---

## 🐛 현재 발생 중인 문제

### ⚠️ **크래시 문제** (최우선 해결 필요)

#### 증상:
- 앱 설치 성공
- 앱 실행 시 즉시 크래시 (열리지 않고 튕겨짐)

#### 오류 로그:
```
FATAL EXCEPTION: main
Process: com.lastpic.app, PID: 22597
java.lang.RuntimeException: Unable to start activity ComponentInfo{com.lastpic.app/com.lastpic.app.MainActivity}: 
java.lang.IllegalStateException: You need to use a Theme.AppCompat theme (or descendant) with this activity.
    at com.lastpic.app.MainActivity.onCreate(MainActivity.java:44)
    at androidx.appcompat.app.AppCompatDelegateImpl.setContentView(...)
```

#### 원인:
- MainActivity는 `AppCompatActivity`를 상속
- AndroidManifest.xml에서 AppCompat 테마가 적용되지 않음
- `android:theme="@style/Theme.AppCompat.Light.NoActionBar"` 설정이 APK에 반영되지 않음

#### 시도한 해결 방법:
1. ✅ AndroidManifest.xml에 테마 설정 수정
2. ✅ Gradle Sync 실행
3. ✅ Clean Project
4. ✅ Rebuild Project
5. ❌ **APK에 수정사항이 반영되지 않음** (Gradle 캐시 문제 의심)

---

## 🚧 해결 대기 중인 문제

### 1. **Gradle 빌드 캐시 문제**
- 파일 잠금: `D:\projects\last-pic\android\app\build\intermediates\dex\release\mergeDexRelease\classes.dex`
- 다른 프로세스가 파일을 사용 중이어서 삭제 불가
- PC 재부팅 후에도 동일한 문제 발생

### 2. **Android Studio IDE 오류**
- IDE 팝업 오류 발생
- 정확한 오류 메시지 미확인

### 3. **APK 빌드 시간 불일치**
- 최신 빌드가 반영되지 않음
- APK 수정 시간이 이전 시간으로 표시됨 (예: 현재 2:02, APK 1:22)

---

## 📋 다음 단계 (권장)

### **Step 1: Gradle 명령으로 강제 빌드**

#### 명령 프롬프트:
```cmd
cd D:\projects\last-pic\android
gradlew clean
gradlew assembleDebug
```

#### 예상 결과:
```
BUILD SUCCESSFUL in 2m 15s
```

#### APK 경로:
```
D:\projects\last-pic\android\app\build\outputs\apk\debug\app-debug.apk
```

---

### **Step 2: APK 확인 및 설치**

#### APK 파일 존재 확인:
```cmd
dir D:\projects\last-pic\android\app\build\outputs\apk\debug\app-debug.apk
```

#### 기존 앱 제거:
```cmd
C:\Users\admin\AppData\Local\Android\Sdk\platform-tools\adb uninstall com.lastpic.app
```

#### 새 APK 설치:
```cmd
C:\Users\admin\AppData\Local\Android\Sdk\platform-tools\adb install D:\projects\last-pic\android\app\build\outputs\apk\debug\app-debug.apk
```

---

### **Step 3: 로그 모니터링**

#### 로그 초기화 및 모니터링:
```cmd
C:\Users\admin\AppData\Local\Android\Sdk\platform-tools\adb logcat -c
C:\Users\admin\AppData\Local\Android\Sdk\platform-tools\adb logcat -s LastPicApp:D AndroidRuntime:E
```

#### 모바일에서 앱 실행:
- Last Pic 앱 아이콘 클릭
- 로그 확인

#### 예상 성공 로그:
```
[LastPicApp] MainActivity onCreate - v1.0.9
[LastPicApp] WebView initialized
[LastPicApp] Loading file:///android_asset/public/index.html
```

---

## 🔧 핵심 파일 경로

### Android 프로젝트:
- **프로젝트 루트**: `D:\projects\last-pic\android`
- **MainActivity.java**: `D:\projects\last-pic\android\app\src\main\java\com\lastpic\app\MainActivity.java`
- **AndroidManifest.xml**: `D:\projects\last-pic\android\app\src\main\AndroidManifest.xml`
- **activity_main.xml**: `D:\projects\last-pic\android\app\src\main\res\layout\activity_main.xml`
- **build.gradle**: `D:\projects\last-pic\android\app\build.gradle`
- **index.html**: `D:\projects\last-pic\android\app\src\main\assets\public\index.html`

### APK 출력:
- **Debug APK**: `D:\projects\last-pic\android\app\build\outputs\apk\debug\app-debug.apk`
- **Release APK**: `D:\projects\last-pic\android\app\build\outputs\apk\release\app-release.apk`
- **Release AAB**: `D:\projects\last-pic\android\app\release\app-release.aab`

### ADB:
- **ADB 경로**: `C:\Users\admin\AppData\Local\Android\Sdk\platform-tools\adb`

---

## 📊 버전 히스토리

| 버전 | versionCode | versionName | 주요 변경사항 | 상태 |
|------|-------------|-------------|--------------|------|
| v1.0.5 | 7 | 1.0.5 | 초기 버전 | Active (모바일) |
| v1.0.6 | 8 | 1.0.6 | DownloadManager 추가 | 실패 |
| v1.0.7 | 9 | 1.0.7 | DownloadManager 개선 | 실패 |
| **v1.0.8** | **13** | **1.0.8** | **JavaScript Bridge 추가** | **Play Console 업로드 (크래시)** |
| **v1.0.9** | **14** | **1.0.9** | **테마 수정 + 캐시 해결** | **다음 목표** |

---

## 🎯 테스트 체크리스트

### 성공 조건:
- [ ] 앱 설치 성공
- [ ] 앱 실행 성공 (크래시 없음)
- [ ] 로그에 `MainActivity onCreate - v1.0.9` 표시
- [ ] WebView 정상 로딩
- [ ] 이미지 생성/편집 가능
- [ ] 다운로드 버튼 클릭
- [ ] Toast 메시지 표시: "이미지 저장 완료! 갤러리에서 확인하세요"
- [ ] 갤러리 LastPic 앨범에 이미지 저장 확인
- [ ] 이미지 열람 가능
- [ ] 크래시 없음

---

## 🚀 Play Console 배포 계획

### Internal Testing:
- AAB 파일: `D:\projects\last-pic\android\app\release\app-release.aab`
- Play Console: https://play.google.com/console
- Release notes (v1.0.9):
  ```
  v1.0.9 업데이트
  
  🔧 긴급 버그 수정
  • 앱 시작 크래시 문제 완전 해결
  • 테마 호환성 개선
  
  ✨ 기능 개선
  • JavaScript Bridge 안정화
  • 다운로드 기능 최적화
  • 갤러리 저장 기능 강화
  
  📱 호환성
  • Android 5.0 이상
  • 저장소 권한 자동 요청
  • MediaStore 완벽 지원
  ```

### 배포 순서:
1. USB 테스트 성공 확인
2. Release APK 빌드
3. Release AAB 생성
4. Internal Testing 업로드
5. 테스트 링크로 재확인
6. Closed Testing 확장
7. Production 배포

---

## 💡 알려진 문제 및 해결 방법

### 문제 1: Theme.AppCompat 오류
- **원인**: AppCompatActivity가 AppCompat 테마를 요구
- **해결**: AndroidManifest.xml에 `Theme.AppCompat.Light.NoActionBar` 적용
- **상태**: 적용 완료, APK 반영 대기

### 문제 2: Blob URL 다운로드 실패
- **원인**: DownloadManager가 Blob URL을 지원하지 않음
- **해결**: Canvas → Base64 → JavaScript Bridge 방식으로 전환
- **상태**: 구현 완료

### 문제 3: Gradle 빌드 캐시
- **원인**: 파일 잠금 및 캐시 문제
- **해결**: `gradlew clean` 및 `gradlew assembleDebug` 사용
- **상태**: 진행 중

---

## 📞 지원 정보

### 프로젝트 정보:
- **패키지명**: com.lastpic.app
- **앱 이름**: Last Pic
- **타겟 SDK**: 33 (Android 13)
- **최소 SDK**: 22 (Android 5.1)

### 개발 환경:
- Android Studio
- Gradle 8.x
- Capacitor
- Java 11+

---

## 📝 다음 작업 시 참고사항

1. **Gradle 명령 사용 권장**: Android Studio IDE 오류를 우회하려면 명령 프롬프트에서 직접 빌드
2. **APK 시간 확인 필수**: 새 빌드가 반영되었는지 APK 수정 시간으로 확인
3. **로그 모니터링**: 테스트 시 항상 adb logcat으로 로그 확인
4. **버전 관리**: 각 시도마다 versionCode와 versionName을 업데이트하여 구분

---

## 🎉 최종 목표

✅ **앱이 정상적으로 실행되고, 다운로드 기능이 작동하는 안정적인 v1.0.9 배포**

---

## 📢 **현재 상태**

### Play Console:
- **업로드된 버전**: v1.0.8 (versionCode 13)
- **상태**: 크래시 발생 (Theme.AppCompat 오류)
- **테스트 유형**: 비공개 테스트 (Closed Testing)

### 다음 작업:
1. **v1.0.9 빌드**: Gradle 명령으로 강제 빌드하여 테마 문제 해결
2. **USB 테스트**: 로컬에서 완벽하게 작동 확인
3. **Play Console 업로드**: v1.0.9 AAB 업로드
4. **배포**: Internal/Closed Testing으로 재배포

---

*마지막 업데이트: 2026-01-02 02:10 (KST)*
