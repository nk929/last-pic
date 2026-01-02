// 프리미엄 UI 관리 클래스
class PremiumUI {
  constructor(premiumManager) {
    this.pm = premiumManager;
  }

  // UI 초기화
  initUI() {
    this.createPremiumBadge();
    this.createUpgradePrompt();
    this.updateModeButtons();
    this.updateResolutionOptions();
    this.updateUsageDisplay();
  }

  // 프리미엄 배지 생성
  createPremiumBadge() {
    const header = document.querySelector('header h1');
    if (!header) return;

    // 기존 배지 제거
    const existingBadge = header.querySelector('.premium-badge');
    if (existingBadge) existingBadge.remove();

    if (this.pm.isPremium()) {
      const badge = document.createElement('span');
      badge.className = 'premium-badge';
      badge.innerHTML = '👑 프리미엄';
      header.appendChild(badge);
    }
  }

  // 사용 횟수 표시
  updateUsageDisplay() {
    let usageDiv = document.getElementById('usage-display');
    
    if (!usageDiv) {
      usageDiv = document.createElement('div');
      usageDiv.id = 'usage-display';
      usageDiv.className = 'usage-display';
      
      const captureSection = document.querySelector('.capture-mode-section');
      if (captureSection) {
        captureSection.insertAdjacentElement('beforebegin', usageDiv);
      }
    }

    if (this.pm.isPremium()) {
      usageDiv.innerHTML = `
        <div class="premium-status">
          <span class="status-icon">👑</span>
          <span class="status-text">프리미엄 - 무제한 사용</span>
        </div>
      `;
    } else {
      const remaining = this.pm.getRemainingFreeUses();
      usageDiv.innerHTML = `
        <div class="free-status">
          <span class="status-icon">📸</span>
          <span class="status-text">오늘 남은 캡처: <strong>${remaining}/3</strong></span>
          ${remaining === 0 ? '<span class="status-warning">⚠️ 한도 초과</span>' : ''}
        </div>
        <button class="upgrade-link" onclick="premiumUI.showUpgradeModal()">
          ✨ 무제한으로 업그레이드
        </button>
      `;
    }
  }

  // 모드 버튼 잠금 상태
  updateModeButtons() {
    const modeButtons = document.querySelectorAll('.mode-btn');
    
    modeButtons.forEach(btn => {
      const mode = btn.dataset.mode;
      const canUse = this.pm.canUseMode(mode);
      
      // 기존 잠금 아이콘 제거
      const existingLock = btn.querySelector('.lock-icon');
      if (existingLock) existingLock.remove();
      
      // 배지 업데이트 (프리미엄 사용자는 모든 모드 "무료"로 표시)
      const badge = btn.querySelector('.mode-badge');
      if (badge && this.pm.isPremium()) {
        badge.className = 'mode-badge free-badge-small';
        badge.textContent = '무료';
      }
      
      if (!canUse) {
        btn.classList.add('locked');
        
        // 잠금 아이콘 추가
        const lockIcon = document.createElement('span');
        lockIcon.className = 'lock-icon';
        lockIcon.textContent = '🔒';
        btn.insertBefore(lockIcon, btn.firstChild);
        
        // data 속성에 잠금 상태 표시 (main.js에서 체크)
        btn.dataset.locked = 'true';
      } else {
        btn.classList.remove('locked');
        btn.dataset.locked = 'false';
      }
    });
  }

  // 업그레이드 모달 생성
  createUpgradePrompt() {
    // 기존 모달 제거
    const existingModal = document.getElementById('upgrade-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'upgrade-modal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-overlay" onclick="premiumUI.hideUpgradeModal()"></div>
      <div class="modal-content">
        <button class="modal-close" onclick="premiumUI.hideUpgradeModal()">✕</button>
        
        <div class="modal-header">
          <div class="premium-icon">👑</div>
          <h2>Last Pic 프리미엄</h2>
          <p class="modal-subtitle" id="upgrade-message">모든 기능을 무제한으로 사용하세요!</p>
        </div>

        <div class="premium-features">
          <div class="feature-item">
            <span class="feature-icon">✅</span>
            <div class="feature-text">
              <strong>3가지 모드 모두 사용</strong>
              <p>시작, 마지막, 원하는 구간 모두 가능</p>
            </div>
          </div>
          
          <div class="feature-item">
            <span class="feature-icon">✅</span>
            <div class="feature-text">
              <strong>무제한 캡처</strong>
              <p>일일 제한 없이 마음껏 사용</p>
            </div>
          </div>
          
          <div class="feature-item">
            <span class="feature-icon">✅</span>
            <div class="feature-text">
              <strong>Full HD 화질</strong>
              <p>1080p 고화질로 캡처</p>
            </div>
          </div>
          
          <div class="feature-item">
            <span class="feature-icon">✅</span>
            <div class="feature-text">
              <strong>광고 완전 제거</strong>
              <p>방해 요소 없는 깔끔한 경험</p>
            </div>
          </div>
          
          <div class="feature-item">
            <span class="feature-icon">✅</span>
            <div class="feature-text">
              <strong>워터마크 제거</strong>
              <p>깨끗한 이미지 저장</p>
            </div>
          </div>
          
          <div class="feature-item">
            <span class="feature-icon">✅</span>
            <div class="feature-text">
              <strong>배치 처리</strong>
              <p>여러 영상을 한 번에 처리</p>
            </div>
          </div>
        </div>

        <div class="pricing">
          <div class="price-tag">
            <span class="price-amount">$10.00</span>
            <span class="price-period">Per Year</span>
          </div>
          <p class="price-note">1년간 모든 기능 사용 (₩13,000 / 월 $0.83)</p>
        </div>

        <div class="modal-actions">
          <button class="btn btn-premium" onclick="premiumUI.purchasePremium()">
            👑 지금 업그레이드
          </button>
          <button class="btn btn-secondary" onclick="premiumUI.hideUpgradeModal()">
            나중에
          </button>
        </div>

        <p class="modal-footer">
          💳 안전한 앱스토어 결제 | 💯 환불 보장 30일
        </p>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // 모달 표시
  showUpgradeModal(message = null) {
    const modal = document.getElementById('upgrade-modal');
    if (!modal) {
      this.createUpgradePrompt();
      return this.showUpgradeModal(message);
    }
    
    if (message) {
      const messageEl = document.getElementById('upgrade-message');
      if (messageEl) messageEl.textContent = message;
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // 모달 숨김
  hideUpgradeModal() {
    const modal = document.getElementById('upgrade-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // 구매 처리 (나중에 실제 IAP로 교체)
  async purchasePremium() {
    console.log('Starting in-app purchase...');
    
    // 데모: 즉시 프리미엄 활성화
    if (confirm('데모 모드: 프리미엄을 활성화하시겠습니까?\n\n실제 앱에서는 여기서 인앱 결제가 진행됩니다.')) {
      this.pm.activatePremium();
      this.hideUpgradeModal();
      this.refreshUI();
      this.showSuccessMessage();
    }
  }

  // 해상도 옵션 업데이트
  updateResolutionOptions() {
    const fhdOption = document.querySelector('.resolution-option:has(input[value="fhd"])');
    const ultraOption = document.querySelector('.resolution-option:has(input[value="ultra"])');
    const fhdRadio = document.querySelector('input[name="resolution"][value="fhd"]');
    const ultraRadio = document.querySelector('input[name="resolution"][value="ultra"]');
    
    if (this.pm.isPremium()) {
      // 프리미엄 사용자: 배지를 "무료"로 변경
      [fhdOption, ultraOption].forEach(option => {
        if (option) {
          const badge = option.querySelector('.mode-badge');
          if (badge) {
            badge.className = 'mode-badge free-badge-small';
            badge.textContent = '무료';
          }
        }
      });
    } else {
      // 무료 사용자: 라디오 비활성화는 하지 않음 (클릭 시 모달 표시)
      // CSS로 스타일만 조정
    }
  }

  // UI 새로고침
  refreshUI() {
    this.createPremiumBadge();
    this.updateUsageDisplay();
    this.updateModeButtons();
    this.updateResolutionOptions();
  }

  // 성공 메시지
  showSuccessMessage() {
    const message = document.createElement('div');
    message.className = 'success-toast';
    message.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">🎉</span>
        <span class="toast-text">프리미엄 활성화 완료! 모든 기능을 마음껏 사용하세요.</span>
      </div>
    `;
    document.body.appendChild(message);
    
    setTimeout(() => {
      message.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      message.classList.remove('show');
      setTimeout(() => message.remove(), 300);
    }, 3000);
  }

  // 제한 도달 시 모달
  showLimitReachedModal() {
    this.showUpgradeModal(
      '오늘의 무료 캡처를 모두 사용했습니다. 프리미엄으로 업그레이드하고 무제한으로 사용하세요!'
    );
  }
}

// 전역 인스턴스 (DOMContentLoaded 후 생성)
let premiumUI;

document.addEventListener('DOMContentLoaded', () => {
  premiumUI = new PremiumUI(premiumManager);
  premiumUI.initUI();
  console.log('Premium UI initialized');
});
