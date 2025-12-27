// 프리미엄 구독 관리 모듈 (앱스토어 출시용)
class PremiumManager {
  constructor() {
    this.FREE_DAILY_LIMIT = 3;
    this.SUBSCRIPTION_DURATION_DAYS = 365; // 1년
    this.RENEWAL_WARNING_DAYS = 30; // 갱신 30일 전 알림
    this.GRACE_PERIOD_DAYS = 7; // 결제 실패 후 유예 기간
    this.initUserStatus();
  }

  // 사용자 상태 초기화
  initUserStatus() {
    const saved = localStorage.getItem('userStatus');
    if (saved) {
      this.userStatus = JSON.parse(saved);
      this.checkDateReset();
      this.checkSubscriptionStatus(); // 구독 상태 확인
    } else {
      this.userStatus = {
        isPremium: false,
        subscriptionType: 'free', // 'free', 'premium_yearly'
        purchaseDate: null,
        expiryDate: null, // 구독 만료일
        autoRenew: false, // 자동 갱신 상태
        lastCheckedDate: null, // 마지막 확인 날짜
        gracePeriodUntil: null, // 결제 실패 시 유예 기간
        receiptToken: null, // 영수증 토큰 (앱스토어)
        dailyUsage: {
          date: this.getToday(),
          count: 0
        }
      };
      this.saveStatus();
    }
  }

  // 구독 상태 확인 (앱 시작 시, 매일 자정)
  checkSubscriptionStatus() {
    const today = new Date();
    const lastChecked = this.userStatus.lastCheckedDate 
      ? new Date(this.userStatus.lastCheckedDate) 
      : null;
    
    // 하루에 한 번만 체크
    if (lastChecked && this.isSameDay(today, lastChecked)) {
      return;
    }
    
    this.userStatus.lastCheckedDate = today.toISOString();
    
    // 1. 구독 만료 확인
    if (this.userStatus.isPremium && this.userStatus.expiryDate) {
      const expiryDate = new Date(this.userStatus.expiryDate);
      
      // 유예 기간 확인
      if (this.userStatus.gracePeriodUntil) {
        const graceEnd = new Date(this.userStatus.gracePeriodUntil);
        if (today > graceEnd) {
          // 유예 기간 종료 → 무료 전환
          this.downgradeToPremium('grace_period_expired');
          return;
        }
      }
      
      // 구독 만료 확인
      if (today > expiryDate) {
        if (this.userStatus.autoRenew) {
          // 자동 갱신 시도 필요 (앱스토어 API 호출)
          this.attemptAutoRenewal();
        } else {
          // 자동 갱신 없음 → 무료 전환
          this.downgradeToPremium('subscription_expired');
        }
      }
    }
    
    // 2. 갱신 알림 확인
    if (this.userStatus.isPremium) {
      this.checkRenewalWarning();
    }
    
    this.saveStatus();
  }

  // 같은 날짜인지 확인
  isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  // 자동 갱신 시도
  async attemptAutoRenewal() {
    console.log('Attempting auto-renewal...');
    
    try {
      // ⚠️ 실제 구현: 앱스토어 API 호출
      // Android: Google Play Billing API
      // iOS: StoreKit 2 API
      
      // 예시 코드 (실제로는 네이티브 브릿지 사용)
      if (typeof window.NativeBridge !== 'undefined') {
        const result = await window.NativeBridge.renewSubscription();
        
        if (result.success) {
          // 갱신 성공
          this.handleRenewalSuccess(result.newExpiryDate, result.receiptToken);
        } else {
          // 갱신 실패
          this.handleRenewalFailure(result.error);
        }
      } else {
        // 웹 테스트 환경: 자동 갱신 시뮬레이션
        console.warn('Native bridge not available. Testing mode.');
        this.simulateAutoRenewal();
      }
      
    } catch (error) {
      console.error('Auto-renewal failed:', error);
      this.handleRenewalFailure(error.message);
    }
  }

  // 갱신 성공 처리
  handleRenewalSuccess(newExpiryDate, receiptToken) {
    console.log('Subscription renewed successfully!');
    
    this.userStatus.expiryDate = newExpiryDate;
    this.userStatus.receiptToken = receiptToken;
    this.userStatus.gracePeriodUntil = null; // 유예 기간 제거
    this.userStatus.isPremium = true;
    
    this.saveStatus();
    
    // 사용자에게 알림
    this.showNotification('구독이 갱신되었습니다!', 'success');
  }

  // 갱신 실패 처리
  handleRenewalFailure(errorMessage) {
    console.warn('Subscription renewal failed:', errorMessage);
    
    // 유예 기간 설정 (7일)
    const graceEnd = new Date();
    graceEnd.setDate(graceEnd.getDate() + this.GRACE_PERIOD_DAYS);
    this.userStatus.gracePeriodUntil = graceEnd.toISOString();
    
    this.saveStatus();
    
    // 사용자에게 알림
    this.showNotification(
      `결제 실패: ${this.GRACE_PERIOD_DAYS}일 내에 결제 수단을 업데이트하세요.`,
      'warning'
    );
    
    // 결제 수단 업데이트 페이지로 이동 유도
    if (typeof window.NativeBridge !== 'undefined') {
      window.NativeBridge.openPaymentSettings();
    }
  }

  // 무료 버전으로 다운그레이드
  downgradeToPremium(reason) {
    console.log('Downgrading to free:', reason);
    
    this.userStatus.isPremium = false;
    this.userStatus.subscriptionType = 'free';
    this.userStatus.expiryDate = null;
    this.userStatus.autoRenew = false;
    this.userStatus.gracePeriodUntil = null;
    
    this.saveStatus();
    
    // 사용자에게 알림
    const messages = {
      subscription_expired: '구독이 만료되었습니다. 무료 버전으로 전환되었습니다.',
      grace_period_expired: '결제 실패 유예 기간이 종료되었습니다. 무료 버전으로 전환되었습니다.',
      payment_failed: '결제 실패로 인해 무료 버전으로 전환되었습니다.'
    };
    
    this.showNotification(messages[reason] || '무료 버전으로 전환되었습니다.', 'info');
  }

  // 갱신 알림 확인 (30일 전)
  checkRenewalWarning() {
    if (!this.userStatus.expiryDate) return;
    
    const today = new Date();
    const expiryDate = new Date(this.userStatus.expiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    // 30일, 7일, 1일 전에 알림
    const warningDays = [30, 7, 1];
    
    for (const days of warningDays) {
      if (daysUntilExpiry === days) {
        const message = this.userStatus.autoRenew
          ? `${days}일 후 구독이 자동으로 갱신됩니다.`
          : `${days}일 후 구독이 만료됩니다. 지금 갱신하세요!`;
        
        this.showNotification(message, 'info');
        break;
      }
    }
  }

  // 날짜 변경 확인 (자정 넘어가면 리셋)
  checkDateReset() {
    const today = this.getToday();
    if (this.userStatus.dailyUsage.date !== today) {
      this.userStatus.dailyUsage = {
        date: today,
        count: 0
      };
      this.saveStatus();
    }
  }

  // 오늘 날짜 (YYYY-MM-DD)
  getToday() {
    return new Date().toISOString().split('T')[0];
  }

  // 프리미엄 여부 확인
  isPremium() {
    // 유예 기간 중에도 프리미엄 기능 사용 가능
    if (this.userStatus.gracePeriodUntil) {
      const graceEnd = new Date(this.userStatus.gracePeriodUntil);
      if (new Date() <= graceEnd) {
        return true;
      }
    }
    
    return this.userStatus.isPremium === true;
  }

  // 구독 정보 가져오기
  getSubscriptionInfo() {
    if (!this.isPremium()) {
      return {
        type: 'free',
        status: 'inactive',
        daysRemaining: 0,
        autoRenew: false
      };
    }
    
    const expiryDate = new Date(this.userStatus.expiryDate);
    const today = new Date();
    const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    let status = 'active';
    if (this.userStatus.gracePeriodUntil) {
      status = 'grace_period';
    } else if (daysRemaining < 0) {
      status = 'expired';
    } else if (daysRemaining <= 7) {
      status = 'expiring_soon';
    }
    
    return {
      type: this.userStatus.subscriptionType,
      status: status,
      expiryDate: this.userStatus.expiryDate,
      daysRemaining: Math.max(0, daysRemaining),
      autoRenew: this.userStatus.autoRenew,
      gracePeriodUntil: this.userStatus.gracePeriodUntil
    };
  }

  // 남은 무료 사용 횟수
  getRemainingFreeUses() {
    if (this.isPremium()) return Infinity;
    return Math.max(0, this.FREE_DAILY_LIMIT - this.userStatus.dailyUsage.count);
  }

  // 캡처 가능 여부 확인
  canCapture() {
    if (this.isPremium()) return true;
    return this.getRemainingFreeUses() > 0;
  }

  // 캡처 사용 증가
  incrementUsage() {
    if (!this.isPremium()) {
      this.userStatus.dailyUsage.count++;
      this.saveStatus();
    }
  }

  // 특정 모드 사용 가능 여부
  canUseMode(mode) {
    if (this.isPremium()) return true;
    // 무료 버전은 'end' 모드만 가능
    return mode === 'end';
  }

  // 프리미엄 구독 활성화 (앱스토어 구매 완료 후 호출)
  activatePremium(purchaseData) {
    const purchaseDate = new Date();
    const expiryDate = new Date(purchaseDate);
    expiryDate.setDate(expiryDate.getDate() + this.SUBSCRIPTION_DURATION_DAYS);
    
    this.userStatus.isPremium = true;
    this.userStatus.subscriptionType = 'premium_yearly';
    this.userStatus.purchaseDate = purchaseDate.toISOString();
    this.userStatus.expiryDate = expiryDate.toISOString();
    this.userStatus.autoRenew = purchaseData?.autoRenew ?? true;
    this.userStatus.receiptToken = purchaseData?.receiptToken || null;
    this.userStatus.gracePeriodUntil = null;
    
    this.saveStatus();
    
    console.log('Premium activated!', this.userStatus);
    this.showNotification('프리미엄 구독이 활성화되었습니다!', 'success');
    
    // UI 업데이트
    if (typeof premiumUI !== 'undefined') {
      premiumUI.updateUI();
    }
  }

  // 구독 복원 (앱 재설치 후)
  async restorePurchases() {
    console.log('Restoring purchases...');
    
    try {
      // ⚠️ 실제 구현: 앱스토어 영수증 검증
      if (typeof window.NativeBridge !== 'undefined') {
        const result = await window.NativeBridge.restorePurchases();
        
        if (result.success && result.subscriptions.length > 0) {
          const latestSubscription = result.subscriptions[0];
          this.activatePremium({
            autoRenew: latestSubscription.autoRenew,
            receiptToken: latestSubscription.receiptToken
          });
          return true;
        } else {
          this.showNotification('복원할 구독이 없습니다.', 'info');
          return false;
        }
      } else {
        // 웹 테스트 환경
        console.warn('Native bridge not available. Cannot restore purchases.');
        return this.isPremium();
      }
      
    } catch (error) {
      console.error('Restore purchases failed:', error);
      this.showNotification('구독 복원 실패: ' + error.message, 'error');
      return false;
    }
  }

  // 구독 취소 (자동 갱신 끄기)
  cancelSubscription() {
    console.log('Canceling auto-renewal...');
    
    this.userStatus.autoRenew = false;
    this.saveStatus();
    
    const info = this.getSubscriptionInfo();
    this.showNotification(
      `자동 갱신이 취소되었습니다. ${info.daysRemaining}일 후 구독이 만료됩니다.`,
      'info'
    );
    
    // 앱스토어에도 알림
    if (typeof window.NativeBridge !== 'undefined') {
      window.NativeBridge.cancelAutoRenewal();
    }
  }

  // 구독 재개 (자동 갱신 다시 켜기)
  resumeSubscription() {
    console.log('Resuming auto-renewal...');
    
    this.userStatus.autoRenew = true;
    this.saveStatus();
    
    this.showNotification('자동 갱신이 다시 활성화되었습니다.', 'success');
    
    if (typeof window.NativeBridge !== 'undefined') {
      window.NativeBridge.resumeAutoRenewal();
    }
  }

  // 알림 표시
  showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // UI에 토스트 메시지 표시
    if (typeof premiumUI !== 'undefined' && premiumUI.showToast) {
      premiumUI.showToast(message, type);
    }
    
    // 네이티브 푸시 알림 (중요한 경우)
    if (['warning', 'error'].includes(type)) {
      if (typeof window.NativeBridge !== 'undefined') {
        window.NativeBridge.showNotification({
          title: 'Last Pic',
          body: message,
          type: type
        });
      }
    }
  }

  // 상태 저장
  saveStatus() {
    localStorage.setItem('userStatus', JSON.stringify(this.userStatus));
  }

  // ========================================
  // 테스트 및 디버그 함수들
  // ========================================

  // 테스트: 자동 갱신 시뮬레이션
  simulateAutoRenewal() {
    console.log('[TEST] Simulating auto-renewal...');
    
    const newExpiryDate = new Date();
    newExpiryDate.setDate(newExpiryDate.getDate() + this.SUBSCRIPTION_DURATION_DAYS);
    
    this.handleRenewalSuccess(
      newExpiryDate.toISOString(),
      'test_receipt_' + Date.now()
    );
  }

  // 테스트: 구독 만료일 설정
  setExpiryDate(daysFromNow) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysFromNow);
    
    this.userStatus.expiryDate = expiryDate.toISOString();
    this.saveStatus();
    
    console.log(`[TEST] Expiry date set to ${daysFromNow} days from now:`, expiryDate);
  }

  // 테스트: 결제 실패 시뮬레이션
  simulatePaymentFailure() {
    console.log('[TEST] Simulating payment failure...');
    this.handleRenewalFailure('Test payment failure');
  }

  // 디버그: 프리미엄 해제 (테스트용)
  deactivatePremium() {
    this.userStatus.isPremium = false;
    this.userStatus.subscriptionType = 'free';
    this.userStatus.purchaseDate = null;
    this.userStatus.expiryDate = null;
    this.userStatus.autoRenew = false;
    this.userStatus.gracePeriodUntil = null;
    this.saveStatus();
    console.log('Premium deactivated for testing');
  }

  // 디버그: 사용 횟수 리셋 (테스트용)
  resetDailyUsage() {
    this.userStatus.dailyUsage = {
      date: this.getToday(),
      count: 0
    };
    this.saveStatus();
    console.log('Daily usage reset');
  }

  // 디버그: 구독 정보 출력
  printSubscriptionInfo() {
    const info = this.getSubscriptionInfo();
    console.log('=== Subscription Info ===');
    console.log('Type:', info.type);
    console.log('Status:', info.status);
    console.log('Days Remaining:', info.daysRemaining);
    console.log('Auto Renew:', info.autoRenew);
    console.log('Expiry Date:', info.expiryDate);
    if (info.gracePeriodUntil) {
      console.log('Grace Period Until:', info.gracePeriodUntil);
    }
    console.log('========================');
  }
}

// 전역 인스턴스 생성
const premiumManager = new PremiumManager();

// 앱 시작 시 구독 상태 확인
premiumManager.checkSubscriptionStatus();

// 디버그 콘솔 명령어
console.log('Premium Manager loaded. Debug commands:');
console.log('- premiumManager.activatePremium({autoRenew: true}) : 프리미엄 활성화');
console.log('- premiumManager.deactivatePremium() : 프리미엄 해제');
console.log('- premiumManager.resetDailyUsage() : 오늘 사용횟수 리셋');
console.log('- premiumManager.isPremium() : 프리미엄 상태 확인');
console.log('- premiumManager.getRemainingFreeUses() : 남은 무료 사용 횟수');
console.log('- premiumManager.getSubscriptionInfo() : 구독 정보 확인');
console.log('- premiumManager.printSubscriptionInfo() : 구독 정보 출력');
console.log('- premiumManager.setExpiryDate(30) : 만료일 30일 후로 설정');
console.log('- premiumManager.simulatePaymentFailure() : 결제 실패 시뮬레이션');
console.log('- premiumManager.restorePurchases() : 구독 복원');
