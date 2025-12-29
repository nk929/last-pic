// 영상 프레임 캡처 앱 - 3가지 모드 지원
(function() {
  'use strict';
  
  // DOM 요소 참조
  const $ = (id) => document.getElementById(id);
  
  const fileInput = $('file');
  const video = $('video');
  const canvas = $('canvas');
  const captureBtn = $('captureBtn');
  const captureButtonText = $('captureButtonText');
  const downloadLink = $('download');
  const status = $('status');
  const errorMsg = $('err');
  const canvasInfo = $('canvasInfo');
  
  // 새로운 UI 요소들
  const modeBtns = document.querySelectorAll('.mode-btn');
  const timeSelector = $('time-selector');
  const timeSlider = $('timeSlider');
  const currentTimeDisplay = $('currentTimeDisplay');
  const totalTimeDisplay = $('totalTimeDisplay');
  const playPreviewBtn = $('playPreviewBtn');
  const pausePreviewBtn = $('pausePreviewBtn');
  
  // 새로운 UI 요소들
  const videoPreviewSection = $('video-preview-section');
  const videoPlaceholder = $('video-placeholder');
  const resolutionRadios = document.querySelectorAll('input[name="resolution"]');
  
  // 상태 관리 변수
  let currentVideoUrl = null;
  let currentDownloadUrl = null;
  let currentMode = 'end'; // start, end, custom (기본값: 마지막)
  let currentResolution = 'original'; // original, fhd, ultra
  let isPreviewPlaying = false;
  let sliderUpdateTimeout = null;

  // 시간 포맷팅 함수
  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // 초기 상태로 리셋
  function resetState() {
    captureBtn.disabled = true;
    errorMsg.style.display = 'none';
    errorMsg.textContent = '';
    status.textContent = '파일을 선택하세요.';
    status.className = 'hint';
    downloadLink.style.display = 'none';
    if (canvasInfo) canvasInfo.style.display = 'none';
    
    // 비디오 미리보기 섹션 숨기기
    if (videoPreviewSection) {
      videoPreviewSection.style.display = 'none';
    }
    
    // 시간 선택기 숨기기
    timeSelector.classList.add('hidden');
    
    // 미리보기 정지
    if (isPreviewPlaying) {
      video.pause();
      isPreviewPlaying = false;
      updatePreviewButtons();
    }
    
    // 캔버스 클리어
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 0;
    canvas.height = 0;
    
    // URL 정리
    if (currentVideoUrl) {
      URL.revokeObjectURL(currentVideoUrl);
      currentVideoUrl = null;
    }
    if (currentDownloadUrl) {
      URL.revokeObjectURL(currentDownloadUrl);
      currentDownloadUrl = null;
    }
    
    // 버튼 텍스트 초기화
    updateCaptureButtonText();
  }

  // 캡처 버튼 텍스트 업데이트
  function updateCaptureButtonText() {
    const modeTexts = {
      start: '시작 프레임 캡처',
      end: '마지막 프레임 캡처',
      custom: '선택한 프레임 캡처'
    };
    if (captureButtonText) {
      captureButtonText.textContent = modeTexts[currentMode];
    }
  }
  
  // 비디오 미리보기 섹션 표시/숨김
  function toggleVideoPreview(show, hasVideo = false) {
    if (videoPreviewSection) {
      videoPreviewSection.style.display = show ? 'block' : 'none';
    }
    
    // 비디오 유무에 따라 플레이스홀더 또는 비디오 표시
    if (show) {
      if (hasVideo) {
        if (videoPlaceholder) videoPlaceholder.style.display = 'none';
        video.style.display = 'block';
      } else {
        if (videoPlaceholder) videoPlaceholder.style.display = 'flex';
        video.style.display = 'none';
      }
    }
  }

  // 모드 버튼 이벤트 처리
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetMode = btn.dataset.mode;
      
      // 잠금 상태 체크 (ui-premium.js에서 설정)
      if (btn.dataset.locked === 'true') {
        // 업그레이드 모달 표시
        if (typeof premiumUI !== 'undefined') {
          const modeLabel = btn.querySelector('.mode-label').textContent;
          premiumUI.showUpgradeModal(`"${modeLabel}" 기능을 사용하려면 프리미엄으로 업그레이드하세요!`);
        }
        return;
      }
      
      // 프리미엄 기능 이중 체크
      if (typeof premiumManager !== 'undefined') {
        if (!premiumManager.canUseMode(targetMode)) {
          if (typeof premiumUI !== 'undefined') {
            const modeLabel = btn.querySelector('.mode-label').textContent;
            premiumUI.showUpgradeModal(`"${modeLabel}" 기능을 사용하려면 프리미엄으로 업그레이드하세요!`);
          }
          return;
        }
      }
      
      // 모든 버튼 비활성화
      modeBtns.forEach(b => b.classList.remove('active'));
      
      // 선택된 버튼 활성화
      btn.classList.add('active');
      
      // 모드 설정
      currentMode = targetMode;
      
      // UI 업데이트
      if (currentMode === 'custom') {
        // 원하는 구간 모드 선택 시 비디오 미리보기 섹션도 표시
        const hasVideo = video.src && video.duration;
        toggleVideoPreview(true, hasVideo);
        timeSelector.classList.remove('hidden');
      } else {
        timeSelector.classList.add('hidden');
        video.pause();
        isPreviewPlaying = false;
        updatePreviewButtons();
        
        // 모드에 맞는 시간으로 이동
        if (video.duration) {
          let targetTime = 0;
          switch (currentMode) {
            case 'start':
              targetTime = 0.1;
              break;
            case 'end':
              targetTime = Math.max(0, video.duration - 0.5);
              break;
          }
          
          seekToTime(targetTime).catch(error => {
            console.warn('Could not seek to mode-specific time:', error);
            video.currentTime = targetTime;
          });
        }
      }
      
      updateCaptureButtonText();
      
      console.log('Capture mode changed to:', currentMode);
    });
  });

  // 해상도 옵션 이벤트
  resolutionRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const selectedResolution = e.target.value;
      
      // 프리미엄 체크 (fhd, ultra 옵션은 프리미엄 전용)
      if (selectedResolution === 'fhd' || selectedResolution === 'ultra') {
        if (typeof premiumManager !== 'undefined' && !premiumManager.isPremium()) {
          // 프리미엄이 아니면 original로 되돌리기
          document.querySelector('input[name="resolution"][value="original"]').checked = true;
          currentResolution = 'original';
          
          const featureName = selectedResolution === 'fhd' ? 'Full HD (1080p)' : '원본 최대 (4K+)';
          if (premiumUI) {
            premiumUI.showUpgradeModal(`${featureName} 기능은 프리미엄 전용입니다!`);
          }
          return;
        }
      }
      
      currentResolution = selectedResolution;
      console.log('Resolution option changed to:', currentResolution);
    });
  });

  // 시간 슬라이더 이벤트
  if (timeSlider) {
    timeSlider.addEventListener('input', (e) => {
      if (!video.duration) return;
      
      const percentage = e.target.value;
      const targetTime = (video.duration * percentage) / 100;
      
      // 즉시 시간 표시 업데이트
      currentTimeDisplay.textContent = formatTime(targetTime);
      
      // 디바운싱으로 부드러운 비디오 탐색
      if (sliderUpdateTimeout) {
        clearTimeout(sliderUpdateTimeout);
      }
      
      sliderUpdateTimeout = setTimeout(async () => {
        try {
          await seekToTime(targetTime);
          console.log('Slider moved to:', formatTime(targetTime));
        } catch (error) {
          console.warn('Seek error during slider input:', error);
          video.currentTime = targetTime;
        }
      }, 100); // 100ms 디바운싱
    });
    
    // 슬라이더 클릭으로 즉시 이동
    timeSlider.addEventListener('change', async (e) => {
      if (!video.duration) return;
      
      const percentage = e.target.value;
      const targetTime = (video.duration * percentage) / 100;
      
      // 비디오를 해당 시점으로 확실히 이동
      try {
        await seekToTime(targetTime);
      } catch (error) {
        console.warn('Seek error during slider change:', error);
        video.currentTime = targetTime;
      }
    });
  }

  // 미리보기 재생 버튼들
  if (playPreviewBtn) {
    playPreviewBtn.addEventListener('click', () => {
      video.play();
      isPreviewPlaying = true;
      updatePreviewButtons();
    });
  }

  if (pausePreviewBtn) {
    pausePreviewBtn.addEventListener('click', () => {
      video.pause();
      isPreviewPlaying = false;
      updatePreviewButtons();
    });
  }

  // 미리보기 버튼 상태 업데이트
  function updatePreviewButtons() {
    if (playPreviewBtn && pausePreviewBtn) {
      if (isPreviewPlaying) {
        playPreviewBtn.style.display = 'none';
        pausePreviewBtn.style.display = 'inline-block';
      } else {
        playPreviewBtn.style.display = 'inline-block';
        pausePreviewBtn.style.display = 'none';
      }
    }
  }

  // 비디오 시간 업데이트 감지
  if (video) {
    video.addEventListener('timeupdate', () => {
      if (currentMode === 'custom' && currentTimeDisplay) {
        currentTimeDisplay.textContent = formatTime(video.currentTime);
        
        // 슬라이더 위치도 업데이트
        if (video.duration > 0) {
          const percentage = (video.currentTime / video.duration) * 100;
          timeSlider.value = percentage;
        }
      }
    });
    
    video.addEventListener('pause', () => {
      isPreviewPlaying = false;
      updatePreviewButtons();
    });
    
    video.addEventListener('play', () => {
      isPreviewPlaying = true;
      updatePreviewButtons();
    });
  }

  // 에러 표시
  function showError(message) {
    errorMsg.style.display = 'block';
    errorMsg.textContent = message;
    status.textContent = '오류 발생';
    status.className = 'hint error';
    console.error('Error:', message);
  }

  // 상태 메시지 업데이트
  function updateStatus(message, className = 'hint') {
    status.textContent = message;
    status.className = className;
  }

  // 비디오가 완전히 준비될 때까지 대기
  function waitForVideoReady() {
    return new Promise((resolve, reject) => {
      console.log('Waiting for video to be ready...');
      
      const checkReady = () => {
        if (video.readyState >= 1 && video.videoWidth > 0 && video.videoHeight > 0) {
          console.log('Video is ready for capture');
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      
      checkReady();
      
      setTimeout(() => {
        reject(new Error('비디오 준비 시간이 초과되었습니다.'));
      }, 5000);
    });
  }

  // 특정 시간으로 비디오 이동
  function seekToTime(targetTime) {
    return new Promise((resolve, reject) => {
      console.log('Seeking to time:', targetTime);
      
      // 이미 해당 시간에 있으면 바로 resolve
      if (Math.abs(video.currentTime - targetTime) < 0.1) {
        console.log('Already at target time');
        resolve();
        return;
      }
      
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        console.log('Seeked to:', video.currentTime);
        resolve();
      };
      
      video.addEventListener('seeked', onSeeked, { once: true });
      
      try {
        video.currentTime = targetTime;
      } catch (error) {
        video.removeEventListener('seeked', onSeeked);
        reject(error);
      }
      
      // 타임아웃
      setTimeout(() => {
        video.removeEventListener('seeked', onSeeked);
        reject(new Error('시간 탐색이 시간 초과되었습니다.'));
      }, 3000);
    });
  }

  // 캔버스에 비디오 프레임 그리기
  async function drawVideoFrame() {
    console.log('Drawing video frame...');
    
    await waitForVideoReady();
    
    const originalWidth = video.videoWidth;
    const originalHeight = video.videoHeight;
    
    if (!originalWidth || !originalHeight) {
      throw new Error('비디오 크기를 읽을 수 없습니다.');
    }
    
    // 해상도 계산 (프리미엄 여부에 따라)
    let MAX_WIDTH = 1920;  // Full HD
    let MAX_HEIGHT = 1080;
    
    // 무료 사용자는 720p로 제한
    if (typeof premiumManager !== 'undefined' && !premiumManager.isPremium()) {
      MAX_WIDTH = 1280;
      MAX_HEIGHT = 720;
      console.log('Resolution limited to 720p (free user)');
    }
    
    const aspectRatio = originalWidth / originalHeight;
    
    let targetWidth, targetHeight;
    
    // 해상도 옵션에 따른 처리
    if (currentResolution === 'ultra') {
      // 원본 최대 옵션: 원본 파일의 최대 해상도 그대로 출력 (4K, 8K 등)
      targetWidth = originalWidth;
      targetHeight = originalHeight;
      console.log(`Ultra quality: Using original resolution ${originalWidth}×${originalHeight}`);
      
    } else if (currentResolution === 'fhd') {
      // Full HD 옵션: 항상 Full HD (1080p)로 출력 (업스케일링 포함)
      if (aspectRatio > (MAX_WIDTH / MAX_HEIGHT)) {
        targetWidth = MAX_WIDTH;
        targetHeight = Math.round(MAX_WIDTH / aspectRatio);
      } else {
        targetHeight = MAX_HEIGHT;
        targetWidth = Math.round(MAX_HEIGHT * aspectRatio);
      }
      
      if (originalWidth < targetWidth || originalHeight < targetHeight) {
        console.log(`Upscaling to Full HD: ${originalWidth}×${originalHeight} → ${targetWidth}×${targetHeight}`);
      } else {
        console.log(`Downscaling to Full HD: ${originalWidth}×${originalHeight} → ${targetWidth}×${targetHeight}`);
      }
      
    } else {
      // 원본 유지 옵션: 업스케일링 하지 않음 (다운스케일링만)
      if (originalWidth <= MAX_WIDTH && originalHeight <= MAX_HEIGHT) {
        targetWidth = originalWidth;
        targetHeight = originalHeight;
        console.log(`Original size: ${originalWidth}×${originalHeight}`);
      } else {
        // 다운스케일링만 수행
        if (aspectRatio > (MAX_WIDTH / MAX_HEIGHT)) {
          targetWidth = MAX_WIDTH;
          targetHeight = Math.round(MAX_WIDTH / aspectRatio);
        } else {
          targetHeight = MAX_HEIGHT;
          targetWidth = Math.round(MAX_HEIGHT * aspectRatio);
        }
        console.log(`Downscaling: ${originalWidth}×${originalHeight} → ${targetWidth}×${targetHeight}`);
      }
    }
    
    // 캔버스 설정
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    const ctx = canvas.getContext('2d');
    
    // 비디오 프레임 그리기
    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    
    // 워터마크 추가 (무료 사용자만)
    if (typeof premiumManager !== 'undefined' && !premiumManager.isPremium()) {
      const watermarkText = 'Last Pic 무료버전';
      const fontSize = Math.max(12, Math.floor(targetHeight / 40));
      
      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 1;
      
      // 우측 하단에 워터마크 배치
      const padding = 10;
      const textMetrics = ctx.measureText(watermarkText);
      const x = targetWidth - textMetrics.width - padding;
      const y = targetHeight - padding;
      
      ctx.strokeText(watermarkText, x, y);
      ctx.fillText(watermarkText, x, y);
      
      console.log('Watermark added (free user)');
    }
    
    console.log(`Frame drawn: ${originalWidth}×${originalHeight} → ${targetWidth}×${targetHeight} at ${formatTime(video.currentTime)}`);
  }
// 다운로드 링크 생성 및 저장 (Capacitor Filesystem 사용)
  async function createDownloadLink() {
    console.log('Creating download link...');
    
    if (canvas.width === 0 || canvas.height === 0) {
      showError('캔버스가 비어있습니다.');
      return;
    }
    
    try {
      // Canvas를 Blob으로 변환
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('이미지 생성 실패'));
        }, 'image/jpeg', 0.95);
      });
      
      console.log('Blob created:', blob.size, 'bytes');
      
      // Blob을 Base64로 변환
      const base64Data = await blobToBase64(blob);
      
      // 파일명 생성 (모드별로 다르게)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const modePrefix = {
        start: 'start-frame',
        end: 'end-frame', 
        custom: 'custom-frame'
      };
      const timeString = currentMode === 'custom' ? `-${formatTime(video.currentTime).replace(':', 'm')}s` : '';
      const filename = `${modePrefix[currentMode]}${timeString}-${timestamp}.jpg`;
      
      // Capacitor가 있는지 확인 (네이티브 앱)
      if (typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
        console.log('Native platform detected, using Filesystem API');
        
        try {
          // Capacitor 플러그인 및 Directory 가져오기
          const { Filesystem, Directory } = window.Capacitor.Plugins;
          
          console.log('Capacitor.Plugins:', window.Capacitor.Plugins);
          console.log('Filesystem:', Filesystem);
          console.log('Directory:', Directory);
          
          // 네이티브 앱: Filesystem API로 저장
          const result = await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true
          });
          
          console.log('File saved to:', result.uri);
          
          alert(`이미지가 저장되었습니다!\n\n파일: ${filename}\n위치: Documents 폴더\n\n[파일 관리자] → [Documents] → [${filename}]`);
          
        } catch (capacitorError) {
          console.error('Capacitor save failed:', capacitorError);
          // Capacitor 실패 시 웹 방식으로 폴백
          throw capacitorError;
        }
        
      } else {
        console.log('Web platform detected, using standard download');
        // 웹 브라우저: 기존 방식
        if (currentDownloadUrl) {
          URL.revokeObjectURL(currentDownloadUrl);
        }
        
        currentDownloadUrl = URL.createObjectURL(blob);
        downloadLink.href = currentDownloadUrl;
        downloadLink.download = filename;
        downloadLink.style.display = 'inline-block';
        
        // 자동 다운로드 트리거
        downloadLink.click();
        
        alert(`이미지 다운로드 시작!\n\n파일명: ${filename}\n\n다운로드 폴더를 확인하세요.`);
      }
      
      if (canvasInfo) {
        canvasInfo.style.display = 'block';
      }
      
      console.log('Download/Save complete');
      
    } catch (error) {
      console.error('Save error:', error);
      showError('저장 실패: ' + error.message);
    }
  }
  
  // Blob을 Base64로 변환하는 헬퍼 함수
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // 사용량 추적 함수
  async function trackUsage() {
    if (!fileInput.files[0]) return;
    
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('fileName', file.name);
    formData.append('fileSize', file.size);
    formData.append('resolution', `${canvas.width}×${canvas.height}`);
    formData.append('captureMode', currentMode);
    formData.append('captureTime', formatTime(video.currentTime));
    
    try {
      const response = await fetch('./track_usage.php', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Usage tracked:', result);
        updateUsageDisplay(result.remaining);
      }
    } catch (error) {
      console.log('Usage tracking failed:', error);
    }
  }

  // 사용량 표시 업데이트
  function updateUsageDisplay(remaining) {
    const usageElements = document.querySelectorAll('.usage-info strong');
    if (usageElements.length > 0) {
      usageElements[0].textContent = remaining >= 0 ? `${remaining}회` : '무제한';
    }
  }

  // 파일 선택 이벤트
  fileInput.addEventListener('change', async (e) => {
    console.log('File selected');
    resetState();
    
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('video/')) {
      showError('동영상 파일을 선택하세요.');
      return;
    }
    
    try {
      if (currentVideoUrl) {
        URL.revokeObjectURL(currentVideoUrl);
      }
      
      currentVideoUrl = URL.createObjectURL(file);
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      video.src = currentVideoUrl;
      video.load();
      
      updateStatus('동영상을 로딩하는 중...', 'hint loading');
      
      // 메타데이터 로드 대기
      await new Promise((resolve, reject) => {
        const onLoad = () => {
          video.removeEventListener('loadedmetadata', onLoad);
          resolve();
        };
        
        const onError = (e) => {
          video.removeEventListener('error', onError);
          reject(e);
        };
        
        if (video.readyState >= 1) {
          resolve();
        } else {
          video.addEventListener('loadedmetadata', onLoad);
          video.addEventListener('error', onError);
        }
        
        setTimeout(() => reject(new Error('로딩 시간 초과')), 10000);
      });
      
      // 비디오 정보 설정
      const duration = video.duration;
      const width = video.videoWidth;
      const height = video.videoHeight;
      
      if (!isFinite(duration) || width === 0 || height === 0) {
        throw new Error('올바르지 않은 동영상 파일입니다.');
      }
      
      // 시간 표시 업데이트
      if (totalTimeDisplay) {
        totalTimeDisplay.textContent = formatTime(duration);
      }
      if (currentTimeDisplay) {
        currentTimeDisplay.textContent = '00:00';
      }
      
      // 슬라이더 설정
      if (timeSlider) {
        timeSlider.min = 0;
        timeSlider.max = 100;
        timeSlider.value = 0;
      }
      
      // 비디오 미리보기 섹션 표시 (비디오 있음)
      toggleVideoPreview(true, true);
      
      // 기본 모드에 따른 초기 시간 설정
      let initialTime = 0;
      switch (currentMode) {
        case 'start':
          initialTime = 0.1;
          break;
        case 'end':
          initialTime = Math.max(0, duration - 0.5); // 마지막에서 0.5초 전
          break;
        case 'custom':
          initialTime = 0;
          break;
      }
      
      // 초기 시간으로 이동
      try {
        await seekToTime(initialTime);
        console.log('Set initial time to:', formatTime(initialTime));
      } catch (error) {
        console.warn('Could not set initial time:', error);
        video.currentTime = initialTime;
      }
      
      updateStatus(`동영상 로드 완료 (길이: ${formatTime(duration)}, 해상도: ${width}×${height})`, 'hint success');
      captureBtn.disabled = false;
      
    } catch (error) {
      console.error('Video load error:', error);
      showError('동영상을 로드할 수 없습니다.');
    }
  });

  // 캡처 버튼 이벤트
  captureBtn.addEventListener('click', async () => {
    console.log('Capture started, mode:', currentMode);
    
    // 프리미엄 기능 체크
    if (typeof premiumManager !== 'undefined') {
      // 1. 모드 사용 가능 여부 확인
      if (!premiumManager.canUseMode(currentMode)) {
        if (premiumUI) {
          const modeNames = {start: '시작 프레임', end: '마지막 프레임', custom: '원하는 구간'};
          premiumUI.showUpgradeModal(`"${modeNames[currentMode]}" 기능은 프리미엄 전용입니다!`);
        }
        return;
      }
      
      // 2. 캡처 가능 여부 확인 (일일 제한)
      if (!premiumManager.canCapture()) {
        if (premiumUI) {
          premiumUI.showLimitReachedModal();
        }
        return;
      }
    }
    
    try {
      captureBtn.disabled = true;
      
      let targetTime;
      
      // 모드별 타겟 시간 계산
      switch (currentMode) {
        case 'start':
          targetTime = 0.1; // 시작 직후
          updateStatus('시작 프레임으로 이동 중...', 'hint loading');
          break;
          
        case 'end':
          targetTime = Math.max(0, video.duration - 0.1); // 마지막 직전
          updateStatus('마지막 프레임으로 이동 중...', 'hint loading');
          break;
          
        case 'custom':
          targetTime = video.currentTime; // 현재 선택된 시간
          updateStatus('선택한 시간의 프레임을 캡처하는 중...', 'hint loading');
          break;
      }
      
      console.log('Target time:', formatTime(targetTime));
      
      // 해당 시간으로 이동 (custom 모드가 아닌 경우만)
      if (currentMode !== 'custom') {
        await seekToTime(targetTime);
      }
      
      // 프레임 그리기
      await drawVideoFrame();
      
      // 다운로드 링크 생성
      createDownloadLink();
      
      // 사용량 추적
      await trackUsage();
      
      // 프리미엄 사용 횟수 증가
      if (typeof premiumManager !== 'undefined') {
        premiumManager.incrementUsage();
        
        // UI 업데이트
        if (premiumUI) {
          premiumUI.updateUsageDisplay();
        }
      }
      
      updateStatus(`${currentMode === 'start' ? '시작' : currentMode === 'end' ? '마지막' : '선택한'} 프레임 캡처 완료!`, 'hint success');
      
    } catch (error) {
      console.error('Capture error:', error);
      showError(error.message || '캡처에 실패했습니다.');
    } finally {
      captureBtn.disabled = false;
    }
  });

  // 리소스 정리
  window.addEventListener('beforeunload', () => {
    if (currentVideoUrl) URL.revokeObjectURL(currentVideoUrl);
    if (currentDownloadUrl) URL.revokeObjectURL(currentDownloadUrl);
  });

  // 초기 버튼 텍스트 설정
  updateCaptureButtonText();

  console.log('Video Frame Capturer initialized (3-mode version)');

})();
