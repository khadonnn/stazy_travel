-- Script approve tất cả hotels hiện có (CHỈ DÙNG CHO DEV)
UPDATE hotels 
SET 
  status = 'APPROVED',
  "approvedAt" = NOW(),
  "approvedBy" = 'system_auto'
WHERE status IS NULL OR status = 'DRAFT';

-- Kiểm tra kết quả
SELECT status, COUNT(*) FROM hotels GROUP BY status;
