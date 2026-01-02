-- 사용량 로그 테이블에 캡처 모드 및 시간 정보 추가
ALTER TABLE g5_usage_log ADD COLUMN capture_mode VARCHAR(20) DEFAULT 'end' COMMENT '캡처 모드 (start, end, custom)';
ALTER TABLE g5_usage_log ADD COLUMN capture_time VARCHAR(10) NULL COMMENT '캡처된 시간 (MM:SS)';

-- 인덱스 추가
ALTER TABLE g5_usage_log ADD INDEX idx_capture_mode (capture_mode);