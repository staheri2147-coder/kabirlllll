<?php
/**
 * Direct file downloader for Alborz Pipe host deployment package
 */
$zipPath = __DIR__ . '/alborz_pipe_latest_package.zip';

if (!file_exists($zipPath)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo "خطا: فایل پکیج alborz_pipe_latest_package.zip در سرور یافت نشد.";
    exit;
}

$fileSize = filesize($zipPath);

header('Content-Description: File Transfer');
header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="alborz_pipe_latest_package.zip"');
header('Expires: 0');
header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
header('Pragma: public');
header('Content-Length: ' . $fileSize);

// Flush buffer and readfile directly
if (ob_get_level()) {
    ob_end_clean();
}
readfile($zipPath);
exit;
