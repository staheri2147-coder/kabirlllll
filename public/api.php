<?php
/**
 * Alborz Pipe System - Full MySQL Host Central Database API
 * اتصال و مدیریت کامل دیتابیس مای‌اس‌کیوال (MySQL / MariaDB) روی هاست یا لوکال XAMPP
 * کاملاً منطبق بر ساختار پایگاه داده رسمی AlborzPipe_MySQL_FullDump_2026-10-03.sql
 */

// Disable HTML error output to prevent breaking JSON client parser
@ini_set('display_errors', '0');
@ini_set('log_errors', '1');
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-cache, no-store, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Enable GZIP compression to reduce 1.5MB payloads to ~70KB
if (!ob_start('ob_gzhandler')) {
    ob_start();
}

// Global fatal/exception handler to always output clean JSON
set_exception_handler(function ($e) {
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(500);
    }
    echo json_encode([
        'success' => false,
        'status' => 'error',
        'error' => $e->getMessage(),
        'message' => 'خطای سیستمی در سرور: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit;
});

@set_time_limit(300);
@ini_set('memory_limit', '512M');

// Preflight CORS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load config
$configFile = __DIR__ . '/db_config.php';
if (!file_exists($configFile)) {
    $defaultTemplate = "<?php\n"
        . "/**\n"
        . " * تنظیمات اتصال به دیتابیس MySQL\n"
        . " * Alborz Pipe System - MySQL Database Configuration\n"
        . " */\n\n"
        . "define('DB_HOST', 'localhost');\n"
        . "define('DB_NAME', 'alborz_pipe_db');\n"
        . "define('DB_USER', 'alborz_user');\n"
        . "define('DB_PASS', 'Your_Strong_Password');\n"
        . "define('DB_PORT', 3306);\n"
        . "define('DB_CHARSET', 'utf8mb4');\n";
    @file_put_contents($configFile, $defaultTemplate);
}
if (file_exists($configFile)) {
    require_once $configFile;
}
if (!defined('DB_HOST')) define('DB_HOST', 'localhost');
if (!defined('DB_NAME')) define('DB_NAME', 'alborz_pipe_db');
if (!defined('DB_USER')) define('DB_USER', 'alborz_user');
if (!defined('DB_PASS')) define('DB_PASS', 'Your_Strong_Password');
if (!defined('DB_PORT')) define('DB_PORT', 3306);
if (!defined('DB_CHARSET')) define('DB_CHARSET', 'utf8mb4');

// Connect to MySQL using PDO (supports on-the-fly test credentials)
function getDatabaseConnection($override = null) {
    static $pdo = null;
    if ($override === null && $pdo !== null) return $pdo;

    $host = !empty($override['host']) ? trim($override['host']) : DB_HOST;
    $port = !empty($override['port']) ? intval($override['port']) : (defined('DB_PORT') ? DB_PORT : 3306);
    $dbname = !empty($override['dbname']) ? trim($override['dbname']) : DB_NAME;
    $user = !empty($override['user']) ? trim($override['user']) : DB_USER;
    $pass = isset($override['pass']) ? (string)$override['pass'] : DB_PASS;
    $charset = defined('DB_CHARSET') ? DB_CHARSET : 'utf8mb4';

    // If using default config without override, check if placeholder is still unchanged
    if ($override === null) {
        if ($pass === 'Your_Strong_Password' && $dbname === 'alborz_pipe_db') {
            return [
                'error' => 'مشخصات دیتابیس در فایل db_config.php هنوز پیش‌فرض است. لطفاً مشخصات واقعی دیتابیس هاست خود را وارد فرمایید.',
                'is_default' => true
            ];
        }
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $host,
        $port,
        $dbname,
        $charset
    );

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
    ];

    try {
        $inst = new PDO($dsn, $user, $pass, $options);
        @$inst->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;");
        @$inst->exec("SET SESSION sql_mode = '';");
        if ($override === null) {
            $pdo = $inst;
        }
        return $inst;
    } catch (PDOException $e) {
        // Auto-fallback: If localhost failed (e.g. socket issue), try 127.0.0.1 TCP directly
        if ($host === 'localhost') {
            try {
                $dsnFallback = sprintf('mysql:host=127.0.0.1;port=%d;dbname=%s;charset=%s', $port, $dbname, $charset);
                $instFallback = new PDO($dsnFallback, $user, $pass, $options);
                @$instFallback->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;");
                @$instFallback->exec("SET SESSION sql_mode = '';");
                if ($override === null) {
                    $pdo = $instFallback;
                }
                return $instFallback;
            } catch (PDOException $e2) {}
        } elseif ($host === '127.0.0.1') {
            try {
                $dsnFallback = sprintf('mysql:host=localhost;port=%d;dbname=%s;charset=%s', $port, $dbname, $charset);
                $instFallback = new PDO($dsnFallback, $user, $pass, $options);
                @$instFallback->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;");
                @$instFallback->exec("SET SESSION sql_mode = '';");
                if ($override === null) {
                    $pdo = $instFallback;
                }
                return $instFallback;
            } catch (PDOException $e2) {}
        }

        return [
            'error' => $e->getMessage(),
            'code' => $e->getCode(),
            'is_default' => ($override === null && $pass === 'Your_Strong_Password')
        ];
    }
}

/**
 * Ensure all 26 application tables exist in MySQL with 100% exact columns
 * matching the official AlborzPipe_MySQL_FullDump_2026-10-03.sql backup dump.
 */
function ensureTablesExist(PDO $pdo, $force = false) {
    static $ensured = false;
    if ($ensured && !$force) return;
    $ensured = true;

    // Define table schemas matching the dump 1:1, all columns nullable to prevent any insert failure
    $tables = [
        'customers' => "
            CREATE TABLE IF NOT EXISTS `customers` (
                `id` VARCHAR(64) PRIMARY KEY,
                `code` VARCHAR(64) NULL,
                `name` VARCHAR(255) NULL,
                `national_id` VARCHAR(64) NULL,
                `phone` VARCHAR(64) NULL,
                `mobile` VARCHAR(64) NULL,
                `economic_code` VARCHAR(64) NULL,
                `address` TEXT NULL,
                `description` TEXT NULL,
                `is_active` TINYINT(1) DEFAULT 1,
                `created_at` VARCHAR(64) NULL,
                `updated_at` VARCHAR(64) NULL,
                INDEX (`code`),
                INDEX (`name`),
                INDEX (`national_id`),
                INDEX (`phone`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'invoices' => "
            CREATE TABLE IF NOT EXISTS `invoices` (
                `id` VARCHAR(64) PRIMARY KEY,
                `order_id` VARCHAR(64) NULL,
                `customer_id` VARCHAR(64) NULL,
                `customer_name` VARCHAR(255) NULL,
                `customer_code` VARCHAR(64) NULL,
                `invoice_number` VARCHAR(64) NULL,
                `invoice_date` VARCHAR(64) NULL,
                `status` VARCHAR(64) NULL,
                `items` LONGTEXT NULL,
                `subtotal` BIGINT NULL,
                `discount_enabled` TINYINT(1) DEFAULT 0,
                `discount` BIGINT DEFAULT 0,
                `tax_enabled` TINYINT(1) DEFAULT 0,
                `tax_percent` INT DEFAULT 0,
                `tax_amount` BIGINT DEFAULT 0,
                `final_total` BIGINT NULL,
                `total_amount` BIGINT NULL,
                `description` TEXT NULL,
                `stamp_signature_enabled` TINYINT(1) DEFAULT 1,
                `created_at` VARCHAR(64) NULL,
                `updated_at` VARCHAR(64) NULL,
                INDEX (`invoice_number`),
                INDEX (`order_id`),
                INDEX (`customer_id`),
                INDEX (`invoice_date`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'orders' => "
            CREATE TABLE IF NOT EXISTS `orders` (
                `id` VARCHAR(64) PRIMARY KEY,
                `customer_id` VARCHAR(64) NULL,
                `customer_name` VARCHAR(255) NULL,
                `customer_code` VARCHAR(64) NULL,
                `order_number` VARCHAR(64) NULL,
                `order_date` VARCHAR(64) NULL,
                `status` VARCHAR(64) NULL,
                `items` LONGTEXT NULL,
                `subtotal` BIGINT NULL,
                `discount_enabled` TINYINT(1) DEFAULT 0,
                `discount` BIGINT DEFAULT 0,
                `tax_enabled` TINYINT(1) DEFAULT 0,
                `tax_percent` INT DEFAULT 0,
                `tax_amount` BIGINT DEFAULT 0,
                `final_total` BIGINT NULL,
                `total_amount` BIGINT NULL,
                `description` TEXT NULL,
                `stamp_signature_enabled` TINYINT(1) DEFAULT 1,
                `created_at_fa` VARCHAR(64) NULL,
                `created_at` VARCHAR(64) NULL,
                `updated_at` VARCHAR(64) NULL,
                INDEX (`order_number`),
                INDEX (`customer_id`),
                INDEX (`status`),
                INDEX (`order_date`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'transactions' => "
            CREATE TABLE IF NOT EXISTS `transactions` (
                `id` VARCHAR(64) PRIMARY KEY,
                `customer_id` VARCHAR(64) NULL,
                `transaction_date` VARCHAR(64) NULL,
                `date` VARCHAR(64) NULL,
                `type` VARCHAR(64) NULL,
                `debit` BIGINT DEFAULT 0,
                `credit` BIGINT DEFAULT 0,
                `amount` BIGINT DEFAULT 0,
                `description` TEXT NULL,
                `reference_type` VARCHAR(64) NULL,
                `reference_id` VARCHAR(64) NULL,
                `reference_number` VARCHAR(64) NULL,
                `created_at` VARCHAR(64) NULL,
                `updated_at` VARCHAR(64) NULL,
                INDEX (`customer_id`),
                INDEX (`transaction_date`),
                INDEX (`type`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'payments' => "
            CREATE TABLE IF NOT EXISTS `payments` (
                `id` VARCHAR(64) PRIMARY KEY,
                `customer_id` VARCHAR(64) NULL,
                `customer_name` VARCHAR(255) NULL,
                `customer_code` VARCHAR(64) NULL,
                `payment_date` VARCHAR(64) NULL,
                `date` VARCHAR(64) NULL,
                `amount` BIGINT DEFAULT 0,
                `payment_method` VARCHAR(64) NULL,
                `description` TEXT NULL,
                `created_by` VARCHAR(64) NULL,
                `status` VARCHAR(64) NULL,
                `created_at` VARCHAR(64) NULL,
                `updated_at` VARCHAR(64) NULL,
                INDEX (`customer_id`),
                INDEX (`payment_date`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'cheques' => "
            CREATE TABLE IF NOT EXISTS `cheques` (
                `id` VARCHAR(64) PRIMARY KEY,
                `payment_id` VARCHAR(64) NULL,
                `customer_id` VARCHAR(64) NULL,
                `customer_name` VARCHAR(255) NULL,
                `customer_code` VARCHAR(64) NULL,
                `cheque_number` VARCHAR(64) NULL,
                `bank_name` VARCHAR(128) NULL,
                `branch` VARCHAR(128) NULL,
                `due_date` VARCHAR(64) NULL,
                `amount` BIGINT DEFAULT 0,
                `status` VARCHAR(64) NULL,
                `description` TEXT NULL,
                `created_by` VARCHAR(64) NULL,
                `created_at` VARCHAR(64) NULL,
                `updated_at` VARCHAR(64) NULL,
                INDEX (`cheque_number`),
                INDEX (`customer_id`),
                INDEX (`due_date`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'adjustments' => "
            CREATE TABLE IF NOT EXISTS `adjustments` (
                `id` VARCHAR(64) PRIMARY KEY,
                `customer_id` VARCHAR(64) NULL,
                `customer_name` VARCHAR(255) NULL,
                `adjustment_date` VARCHAR(64) NULL,
                `amount` BIGINT DEFAULT 0,
                `type` VARCHAR(64) NULL,
                `description` TEXT NULL,
                `created_by` VARCHAR(64) NULL,
                `status` VARCHAR(64) NULL,
                `created_at` VARCHAR(64) NULL,
                `updated_at` VARCHAR(64) NULL,
                INDEX (`customer_id`),
                INDEX (`adjustment_date`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'drivers' => "
            CREATE TABLE IF NOT EXISTS `drivers` (
                `id` VARCHAR(64) PRIMARY KEY,
                `name` VARCHAR(255) NULL,
                `phone` VARCHAR(64) NULL,
                `mobile` VARCHAR(64) NULL,
                `plate_number` VARCHAR(64) NULL,
                `vehicle_type` VARCHAR(64) NULL,
                `is_active` TINYINT(1) DEFAULT 1,
                `created_at` VARCHAR(64) NULL,
                `updated_at` VARCHAR(64) NULL,
                INDEX (`name`),
                INDEX (`phone`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'vehicles' => "
            CREATE TABLE IF NOT EXISTS `vehicles` (
                `id` VARCHAR(64) PRIMARY KEY,
                `plate_number` VARCHAR(64) NULL,
                `plate` VARCHAR(64) NULL,
                `vehicle_type` VARCHAR(64) NULL,
                `driver_id` VARCHAR(64) NULL,
                `driver_name` VARCHAR(255) NULL,
                `driver_phone` VARCHAR(64) NULL,
                `description` TEXT NULL,
                `is_active` TINYINT(1) DEFAULT 1,
                `created_at` VARCHAR(64) NULL,
                `updated_at` VARCHAR(64) NULL,
                INDEX (`plate_number`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'deliveries' => "
            CREATE TABLE IF NOT EXISTS `deliveries` (
                `id` VARCHAR(64) PRIMARY KEY,
                `customer_id` VARCHAR(64) NULL,
                `customer_name` VARCHAR(255) NULL,
                `customer_code` VARCHAR(64) NULL,
                `delivery_number` VARCHAR(64) NULL,
                `doc_number` VARCHAR(64) NULL,
                `order_id` VARCHAR(64) NULL,
                `delivery_date` VARCHAR(64) NULL,
                `date` VARCHAR(64) NULL,
                `driver_id` VARCHAR(64) NULL,
                `driver_name` VARCHAR(255) NULL,
                `driver_phone` VARCHAR(64) NULL,
                `vehicle_plate` VARCHAR(64) NULL,
                `vehicle_type` VARCHAR(64) NULL,
                `status` VARCHAR(64) NULL,
                `items` LONGTEXT NULL,
                `total_meters` DOUBLE DEFAULT 0,
                `description` TEXT NULL,
                `created_by` VARCHAR(64) NULL,
                `created_at` VARCHAR(64) NULL,
                `updated_at` VARCHAR(64) NULL,
                INDEX (`delivery_number`),
                INDEX (`customer_id`),
                INDEX (`delivery_date`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'returns' => "
            CREATE TABLE IF NOT EXISTS `returns` (
                `id` VARCHAR(64) PRIMARY KEY,
                `customer_id` VARCHAR(64) NULL,
                `customer_name` VARCHAR(255) NULL,
                `customer_code` VARCHAR(64) NULL,
                `return_number` VARCHAR(64) NULL,
                `doc_number` VARCHAR(64) NULL,
                `return_date` VARCHAR(64) NULL,
                `date` VARCHAR(64) NULL,
                `status` VARCHAR(64) NULL,
                `reason` TEXT NULL,
                `items` LONGTEXT NULL,
                `total_meters` DOUBLE DEFAULT 0,
                `total_amount` BIGINT DEFAULT 0,
                `description` TEXT NULL,
                `created_by` VARCHAR(64) NULL,
                `created_at` VARCHAR(64) NULL,
                `updated_at` VARCHAR(64) NULL,
                INDEX (`return_number`),
                INDEX (`customer_id`),
                INDEX (`return_date`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'materials' => "
            CREATE TABLE IF NOT EXISTS `materials` (
                `id` VARCHAR(64) PRIMARY KEY,
                `name` VARCHAR(255) NULL,
                `code` VARCHAR(64) NULL,
                `category` VARCHAR(64) NULL,
                `unit` VARCHAR(64) NULL,
                `current_stock` DOUBLE DEFAULT 0,
                `min_stock_alert` DOUBLE DEFAULT 0,
                `is_active` TINYINT(1) DEFAULT 1,
                `created_at` VARCHAR(64) NULL,
                `updated_at` VARCHAR(64) NULL,
                INDEX (`code`),
                INDEX (`name`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'warehouses' => "
            CREATE TABLE IF NOT EXISTS `warehouses` (
                `id` VARCHAR(64) PRIMARY KEY,
                `name` VARCHAR(255) NULL,
                `code` VARCHAR(64) NULL,
                `location` TEXT NULL,
                `manager_name` VARCHAR(255) NULL,
                `phone` VARCHAR(64) NULL,
                `description` TEXT NULL,
                `is_active` TINYINT(1) DEFAULT 1,
                `created_at` VARCHAR(64) NULL,
                `updated_at` VARCHAR(64) NULL,
                INDEX (`code`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'movements' => "
            CREATE TABLE IF NOT EXISTS `movements` (
                `id` VARCHAR(64) PRIMARY KEY,
                `code` VARCHAR(64) NULL,
                `material_id` VARCHAR(64) NULL,
                `material_name` VARCHAR(255) NULL,
                `material_code` VARCHAR(64) NULL,
                `warehouse_id` VARCHAR(64) NULL,
                `warehouse_name` VARCHAR(255) NULL,
                `type` VARCHAR(64) NULL,
                `quantity` DOUBLE DEFAULT 0,
                `bags_count` INT DEFAULT 0,
                `driver_name` VARCHAR(255) NULL,
                `driver_phone` VARCHAR(64) NULL,
                `reference_type` VARCHAR(64) NULL,
                `date` VARCHAR(64) NULL,
                `created_by` VARCHAR(64) NULL,
                `created_at` VARCHAR(64) NULL,
                `updated_at` VARCHAR(64) NULL,
                INDEX (`material_id`),
                INDEX (`type`),
                INDEX (`date`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'employees' => "
            CREATE TABLE IF NOT EXISTS `employees` (
                `id` VARCHAR(64) PRIMARY KEY,
                `code` VARCHAR(64) NULL,
                `name` VARCHAR(255) NULL,
                `full_name` VARCHAR(255) NULL,
                `national_id` VARCHAR(64) NULL,
                `phone1` VARCHAR(64) NULL,
                `phone2` VARCHAR(64) NULL,
                `address` TEXT NULL,
                `position` VARCHAR(128) NULL,
                `salary_base` BIGINT DEFAULT 0,
                `balance` BIGINT DEFAULT 0,
                `status` VARCHAR(64) NULL,
                `created_at` VARCHAR(64) NULL,
                `updated_at` VARCHAR(64) NULL,
                INDEX (`code`),
                INDEX (`name`),
                INDEX (`national_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'employee_txs' => "
            CREATE TABLE IF NOT EXISTS `employee_txs` (
                `id` VARCHAR(64) PRIMARY KEY,
                `employee_id` VARCHAR(64) NULL,
                `employee_name` VARCHAR(255) NULL,
                `employee_code` VARCHAR(64) NULL,
                `date` VARCHAR(64) NULL,
                `type` VARCHAR(64) NULL,
                `amount` BIGINT DEFAULT 0,
                `payment_method` VARCHAR(64) NULL,
                `reference_number` VARCHAR(64) NULL,
                `description` TEXT NULL,
                `created_by` VARCHAR(64) NULL,
                `created_at` VARCHAR(64) NULL,
                `updated_at` VARCHAR(64) NULL,
                INDEX (`employee_id`),
                INDEX (`date`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'employee_leaves' => "
            CREATE TABLE IF NOT EXISTS `employee_leaves` (
                `id` VARCHAR(64) PRIMARY KEY,
                `employee_id` VARCHAR(64) NULL,
                `employee_name` VARCHAR(255) NULL,
                `employee_code` VARCHAR(64) NULL,
                `type` VARCHAR(64) NULL,
                `category` VARCHAR(64) NULL,
                `from_date` VARCHAR(64) NULL,
                `to_date` VARCHAR(64) NULL,
                `days_count` INT DEFAULT 0,
                `status` VARCHAR(64) NULL,
                `created_at` VARCHAR(64) NULL,
                `updated_at` VARCHAR(64) NULL,
                INDEX (`employee_id`),
                INDEX (`from_date`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'employment_periods' => "
            CREATE TABLE IF NOT EXISTS `employment_periods` (
                `id` VARCHAR(64) PRIMARY KEY,
                `employee_id` VARCHAR(64) NULL,
                `employee_name` VARCHAR(255) NULL,
                `start_date` VARCHAR(64) NULL,
                `end_date` VARCHAR(64) NULL,
                `contract_type` VARCHAR(64) NULL,
                `position` VARCHAR(128) NULL,
                `reason_for_leaving` TEXT NULL,
                `notes` TEXT NULL,
                `status` VARCHAR(64) NULL,
                `created_at` VARCHAR(64) NULL,
                `updated_at` VARCHAR(64) NULL,
                INDEX (`employee_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'expenses' => "
            CREATE TABLE IF NOT EXISTS `expenses` (
                `id` VARCHAR(64) PRIMARY KEY,
                `code` VARCHAR(64) NULL,
                `doc_number` VARCHAR(64) NULL,
                `title` VARCHAR(255) NULL,
                `category` VARCHAR(64) NULL,
                `amount` BIGINT DEFAULT 0,
                `expense_date` VARCHAR(64) NULL,
                `date` VARCHAR(64) NULL,
                `beneficiary` VARCHAR(255) NULL,
                `payment_method` VARCHAR(64) NULL,
                `description` TEXT NULL,
                `created_by` VARCHAR(64) NULL,
                `created_at` VARCHAR(64) NULL,
                `updated_at` VARCHAR(64) NULL,
                INDEX (`code`),
                INDEX (`category`),
                INDEX (`expense_date`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'production_logs' => "
            CREATE TABLE IF NOT EXISTS `production_logs` (
                `id` VARCHAR(64) PRIMARY KEY,
                `code` VARCHAR(64) NULL,
                `log_number` VARCHAR(64) NULL,
                `line_name` VARCHAR(64) NULL,
                `production_date` VARCHAR(64) NULL,
                `date` VARCHAR(64) NULL,
                `size` VARCHAR(64) NULL,
                `pressure` VARCHAR(64) NULL,
                `type` VARCHAR(64) NULL,
                `diameter` VARCHAR(64) NULL,
                `thickness` VARCHAR(64) NULL,
                `motor_speed` VARCHAR(64) NULL,
                `traction_speed` VARCHAR(64) NULL,
                `die_mold` VARCHAR(64) NULL,
                `pin_needle` VARCHAR(64) NULL,
                `weight_unit` VARCHAR(64) NULL,
                `meters` DOUBLE DEFAULT 0,
                `total_weight` DOUBLE DEFAULT 0,
                `customer_name` VARCHAR(255) NULL,
                `notes` TEXT NULL,
                `pipe_size` VARCHAR(64) NULL,
                `meters_produced` DOUBLE DEFAULT 0,
                `weight_kg` DOUBLE DEFAULT 0,
                `material_type` VARCHAR(64) NULL,
                `created_at` VARCHAR(64) NULL,
                `updated_at` VARCHAR(64) NULL,
                INDEX (`code`),
                INDEX (`production_date`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'users' => "
            CREATE TABLE IF NOT EXISTS `users` (
                `id` VARCHAR(64) PRIMARY KEY,
                `user_code` VARCHAR(64) NULL,
                `name` VARCHAR(255) NULL,
                `username` VARCHAR(64) NULL,
                `password` VARCHAR(255) NULL,
                `role_id` VARCHAR(64) NULL,
                `role_name` VARCHAR(128) NULL,
                `is_admin` TINYINT(1) DEFAULT 0,
                `is_active` TINYINT(1) DEFAULT 1,
                `permissions` LONGTEXT NULL,
                `created_at` VARCHAR(64) NULL,
                `updated_at` VARCHAR(64) NULL,
                UNIQUE INDEX (`username`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'roles' => "
            CREATE TABLE IF NOT EXISTS `roles` (
                `id` VARCHAR(64) PRIMARY KEY,
                `name` VARCHAR(255) NULL,
                `description` TEXT NULL,
                `is_active` TINYINT(1) DEFAULT 1,
                `permissions` LONGTEXT NULL,
                `created_at` VARCHAR(64) NULL,
                `updated_at` VARCHAR(64) NULL,
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'permissions' => "
            CREATE TABLE IF NOT EXISTS `permissions` (
                `id` VARCHAR(64) PRIMARY KEY,
                `name` VARCHAR(255) NULL,
                `key` VARCHAR(128) NULL,
                `perm_key` VARCHAR(128) NULL,
                `category` VARCHAR(64) NULL,
                `description` TEXT NULL,
                `updated_at` VARCHAR(64) NULL,
                INDEX (`key`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'settings' => "
            CREATE TABLE IF NOT EXISTS `settings` (
                `id` INT PRIMARY KEY DEFAULT 1,
                `business_name` VARCHAR(255) NULL,
                `company_name` VARCHAR(255) NULL,
                `brand_subtitle` VARCHAR(255) NULL,
                `logo_url` LONGTEXT NULL,
                `stamp_signature_url` LONGTEXT NULL,
                `login_cover_url` LONGTEXT NULL,
                `login_background_url` LONGTEXT NULL,
                `phone` VARCHAR(64) NULL,
                `fax` VARCHAR(64) NULL,
                `email` VARCHAR(128) NULL,
                `economic_code` VARCHAR(64) NULL,
                `national_id` VARCHAR(64) NULL,
                `registration_number` VARCHAR(64) NULL,
                `postal_code` VARCHAR(64) NULL,
                `address` TEXT NULL,
                `default_tax_percent` INT DEFAULT 0,
                `default_tax_rate` DOUBLE DEFAULT 0,
                `default_order_notes_enabled` TINYINT(1) DEFAULT 0,
                `default_order_notes_text` TEXT NULL,
                `default_invoice_notes_enabled` TINYINT(1) DEFAULT 0,
                `default_invoice_notes_text` TEXT NULL,
                `default_delivery_notes_enabled` TINYINT(1) DEFAULT 0,
                `default_delivery_notes_text` TEXT NULL,
                `backup_reminder_enabled` TINYINT(1) DEFAULT 1,
                `backup_reminder_interval_days` INT DEFAULT 7,
                `last_backup_date` VARCHAR(64) NULL,
                `order_prefix` VARCHAR(32) NULL,
                `invoice_prefix` VARCHAR(32) NULL,
                `customer_prefix` VARCHAR(32) NULL,
                `product_prefix` VARCHAR(32) NULL,
                `delivery_prefix` VARCHAR(32) NULL,
                `return_prefix` VARCHAR(32) NULL,
                `material_prefix` VARCHAR(32) NULL,
                `currency_unit` VARCHAR(32) NULL,
                `print_invoice_header` TINYINT(1) DEFAULT 1,
                `print_invoice_footer_terms` TINYINT(1) DEFAULT 1,
                `default_invoice_notes` TEXT NULL,
                `print_invoice_signatures` TINYINT(1) DEFAULT 1,
                `timezone` VARCHAR(64) NULL,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'audit_logs' => "
            CREATE TABLE IF NOT EXISTS `audit_logs` (
                `id` VARCHAR(64) PRIMARY KEY,
                `user_id` VARCHAR(64) NULL,
                `user_code` VARCHAR(64) NULL,
                `user_name` VARCHAR(255) NULL,
                `user_role` VARCHAR(128) NULL,
                `action` VARCHAR(255) NULL,
                `action_type` VARCHAR(64) NULL,
                `entity_type` VARCHAR(64) NULL,
                `entity_id` VARCHAR(64) NULL,
                `document_number` VARCHAR(64) NULL,
                `entity_title` VARCHAR(255) NULL,
                `old_values` LONGTEXT NULL,
                `new_values` LONGTEXT NULL,
                `ip_address` VARCHAR(64) NULL,
                `user_agent` TEXT NULL,
                `timestamp` VARCHAR(64) NULL,
                `created_at` VARCHAR(64) NULL,
                `updated_at` VARCHAR(64) NULL,
                INDEX (`created_at`),
                INDEX (`user_id`),
                INDEX (`action`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'products' => "
            CREATE TABLE IF NOT EXISTS `products` (
                `id` VARCHAR(64) PRIMARY KEY,
                `code` VARCHAR(64) NULL,
                `name` VARCHAR(255) NULL,
                `size` VARCHAR(64) NULL,
                `size_mm` INT NULL,
                `pressure` VARCHAR(64) NULL,
                `type` VARCHAR(64) NULL,
                `pe_type` VARCHAR(64) NULL,
                `unit` VARCHAR(64) NULL,
                `unit_price` BIGINT DEFAULT 0,
                `weight_per_meter` DOUBLE DEFAULT 0,
                `stock_meters` DOUBLE DEFAULT 0,
                `description` TEXT NULL,
                `is_active` TINYINT(1) DEFAULT 1,
                `created_at` VARCHAR(64) NULL,
                `updated_at` VARCHAR(64) NULL,
                INDEX (`code`),
                INDEX (`name`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        "
    ];

    foreach ($tables as $sql) {
        try {
            $pdo->exec($sql);
        } catch (Exception $e) {}
    }

    // Auto-migration for legacy table aliases:
    // If old tables exist, migrate their data into canonical tables
    $aliasMigrations = [
        ['from' => 'customer_transactions', 'to' => 'transactions'],
        ['from' => 'material_movements', 'to' => 'movements'],
        ['from' => 'employee_transactions', 'to' => 'employee_txs'],
        ['from' => 'system_settings', 'to' => 'settings'],
    ];
    foreach ($aliasMigrations as $m) {
        try {
            $checkFrom = $pdo->query("SHOW TABLES LIKE '{$m['from']}'");
            if ($checkFrom && $checkFrom->fetch()) {
                // If canonical table is empty, copy rows from old table
                $toCnt = $pdo->query("SELECT COUNT(*) FROM `{$m['to']}`");
                if ($toCnt && (int)$toCnt->fetchColumn() === 0) {
                    $pdo->exec("INSERT IGNORE INTO `{$m['to']}` SELECT * FROM `{$m['from']}`");
                }
            }
        } catch (Exception $e) {}
    }

    // Auto-migration: check columns in every table and ensure missing columns are added seamlessly
    $requiredColumns = [
        'customers' => [
            'code' => 'VARCHAR(64) NULL', 'name' => 'VARCHAR(255) NULL', 'national_id' => 'VARCHAR(64) NULL',
            'phone' => 'VARCHAR(64) NULL', 'mobile' => 'VARCHAR(64) NULL', 'economic_code' => 'VARCHAR(64) NULL',
            'address' => 'TEXT NULL', 'description' => 'TEXT NULL', 'is_active' => 'TINYINT(1) DEFAULT 1',
            'created_at' => 'VARCHAR(64) NULL', 'updated_at' => 'VARCHAR(64) NULL',        ],
        'invoices' => [
            'order_id' => 'VARCHAR(64) NULL', 'customer_id' => 'VARCHAR(64) NULL', 'customer_name' => 'VARCHAR(255) NULL',
            'customer_code' => 'VARCHAR(64) NULL', 'invoice_number' => 'VARCHAR(64) NULL', 'invoice_date' => 'VARCHAR(64) NULL',
            'status' => 'VARCHAR(64) NULL', 'items' => 'LONGTEXT NULL', 'subtotal' => 'BIGINT NULL',
            'discount_enabled' => 'TINYINT(1) DEFAULT 0', 'discount' => 'BIGINT DEFAULT 0', 'tax_enabled' => 'TINYINT(1) DEFAULT 0',
            'tax_percent' => 'INT DEFAULT 0', 'tax_amount' => 'BIGINT DEFAULT 0', 'final_total' => 'BIGINT NULL',
            'total_amount' => 'BIGINT NULL', 'description' => 'TEXT NULL', 'stamp_signature_enabled' => 'TINYINT(1) DEFAULT 1',
            'created_at' => 'VARCHAR(64) NULL', 'updated_at' => 'VARCHAR(64) NULL',        ],
        'orders' => [
            'customer_id' => 'VARCHAR(64) NULL', 'customer_name' => 'VARCHAR(255) NULL', 'customer_code' => 'VARCHAR(64) NULL',
            'order_number' => 'VARCHAR(64) NULL', 'order_date' => 'VARCHAR(64) NULL', 'status' => 'VARCHAR(64) NULL',
            'items' => 'LONGTEXT NULL', 'subtotal' => 'BIGINT NULL', 'discount_enabled' => 'TINYINT(1) DEFAULT 0',
            'discount' => 'BIGINT DEFAULT 0', 'tax_enabled' => 'TINYINT(1) DEFAULT 0', 'tax_percent' => 'INT DEFAULT 0',
            'tax_amount' => 'BIGINT DEFAULT 0', 'final_total' => 'BIGINT NULL', 'total_amount' => 'BIGINT NULL',
            'description' => 'TEXT NULL', 'stamp_signature_enabled' => 'TINYINT(1) DEFAULT 1', 'created_at_fa' => 'VARCHAR(64) NULL',
            'created_at' => 'VARCHAR(64) NULL', 'updated_at' => 'VARCHAR(64) NULL',        ],
        'transactions' => [
            'customer_id' => 'VARCHAR(64) NULL', 'transaction_date' => 'VARCHAR(64) NULL', 'date' => 'VARCHAR(64) NULL',
            'type' => 'VARCHAR(64) NULL', 'debit' => 'BIGINT DEFAULT 0', 'credit' => 'BIGINT DEFAULT 0', 'amount' => 'BIGINT DEFAULT 0',
            'description' => 'TEXT NULL', 'reference_type' => 'VARCHAR(64) NULL', 'reference_id' => 'VARCHAR(64) NULL',
            'reference_number' => 'VARCHAR(64) NULL', 'created_at' => 'VARCHAR(64) NULL', 'updated_at' => 'VARCHAR(64) NULL',
        ],
        'payments' => [
            'customer_id' => 'VARCHAR(64) NULL', 'customer_name' => 'VARCHAR(255) NULL', 'customer_code' => 'VARCHAR(64) NULL',
            'payment_date' => 'VARCHAR(64) NULL', 'date' => 'VARCHAR(64) NULL', 'amount' => 'BIGINT DEFAULT 0',
            'payment_method' => 'VARCHAR(64) NULL', 'description' => 'TEXT NULL', 'created_by' => 'VARCHAR(64) NULL',
            'status' => 'VARCHAR(64) NULL', 'created_at' => 'VARCHAR(64) NULL', 'updated_at' => 'VARCHAR(64) NULL',
        ],
        'adjustments' => [
            'customer_id' => 'VARCHAR(64) NULL', 'customer_name' => 'VARCHAR(255) NULL', 'adjustment_date' => 'VARCHAR(64) NULL',
            'amount' => 'BIGINT DEFAULT 0', 'type' => 'VARCHAR(64) NULL', 'description' => 'TEXT NULL', 'created_by' => 'VARCHAR(64) NULL',
            'status' => 'VARCHAR(64) NULL', 'created_at' => 'VARCHAR(64) NULL', 'updated_at' => 'VARCHAR(64) NULL',
        ],
        'drivers' => [
            'name' => 'VARCHAR(255) NULL', 'phone' => 'VARCHAR(64) NULL', 'mobile' => 'VARCHAR(64) NULL',
            'plate_number' => 'VARCHAR(64) NULL', 'vehicle_type' => 'VARCHAR(64) NULL', 'is_active' => 'TINYINT(1) DEFAULT 1',
            'created_at' => 'VARCHAR(64) NULL', 'updated_at' => 'VARCHAR(64) NULL',        ],
        'deliveries' => [
            'customer_id' => 'VARCHAR(64) NULL', 'customer_name' => 'VARCHAR(255) NULL', 'customer_code' => 'VARCHAR(64) NULL',
            'delivery_number' => 'VARCHAR(64) NULL', 'doc_number' => 'VARCHAR(64) NULL', 'delivery_date' => 'VARCHAR(64) NULL',
            'date' => 'VARCHAR(64) NULL', 'order_id' => 'VARCHAR(64) NULL', 'driver_id' => 'VARCHAR(64) NULL',
            'driver_name' => 'VARCHAR(255) NULL', 'driver_phone' => 'VARCHAR(64) NULL', 'vehicle_plate' => 'VARCHAR(64) NULL',
            'vehicle_type' => 'VARCHAR(64) NULL', 'status' => 'VARCHAR(64) NULL', 'items' => 'LONGTEXT NULL',
            'total_meters' => 'DOUBLE DEFAULT 0', 'description' => 'TEXT NULL', 'created_by' => 'VARCHAR(64) NULL',
            'created_at' => 'VARCHAR(64) NULL', 'updated_at' => 'VARCHAR(64) NULL',        ],
        'movements' => [
            'code' => 'VARCHAR(64) NULL', 'material_id' => 'VARCHAR(64) NULL', 'material_name' => 'VARCHAR(255) NULL',
            'material_code' => 'VARCHAR(64) NULL', 'warehouse_id' => 'VARCHAR(64) NULL', 'warehouse_name' => 'VARCHAR(255) NULL',
            'type' => 'VARCHAR(64) NULL', 'quantity' => 'DOUBLE DEFAULT 0', 'bags_count' => 'INT DEFAULT 0',
            'driver_name' => 'VARCHAR(255) NULL', 'driver_phone' => 'VARCHAR(64) NULL', 'reference_type' => 'VARCHAR(64) NULL',
            'date' => 'VARCHAR(64) NULL', 'created_by' => 'VARCHAR(64) NULL', 'created_at' => 'VARCHAR(64) NULL',
            'updated_at' => 'VARCHAR(64) NULL',        ],
        'employees' => [
            'code' => 'VARCHAR(64) NULL', 'name' => 'VARCHAR(255) NULL', 'full_name' => 'VARCHAR(255) NULL',
            'national_id' => 'VARCHAR(64) NULL', 'phone1' => 'VARCHAR(64) NULL', 'phone2' => 'VARCHAR(64) NULL',
            'address' => 'TEXT NULL', 'position' => 'VARCHAR(128) NULL', 'salary_base' => 'BIGINT DEFAULT 0',
            'balance' => 'BIGINT DEFAULT 0', 'status' => 'VARCHAR(64) NULL', 'created_at' => 'VARCHAR(64) NULL',
            'updated_at' => 'VARCHAR(64) NULL',        ],
        'expenses' => [
            'code' => 'VARCHAR(64) NULL', 'doc_number' => 'VARCHAR(64) NULL', 'title' => 'VARCHAR(255) NULL',
            'category' => 'VARCHAR(64) NULL', 'amount' => 'BIGINT DEFAULT 0', 'expense_date' => 'VARCHAR(64) NULL',
            'date' => 'VARCHAR(64) NULL', 'beneficiary' => 'VARCHAR(255) NULL', 'payment_method' => 'VARCHAR(64) NULL',
            'description' => 'TEXT NULL', 'created_by' => 'VARCHAR(64) NULL', 'created_at' => 'VARCHAR(64) NULL',
            'updated_at' => 'VARCHAR(64) NULL',        ],
        'settings' => [
            'business_name' => 'VARCHAR(255) NULL', 'company_name' => 'VARCHAR(255) NULL', 'brand_subtitle' => 'VARCHAR(255) NULL',
            'logo_url' => 'LONGTEXT NULL', 'stamp_signature_url' => 'LONGTEXT NULL', 'login_cover_url' => 'LONGTEXT NULL',
            'login_background_url' => 'LONGTEXT NULL', 'phone' => 'VARCHAR(64) NULL', 'fax' => 'VARCHAR(64) NULL',
            'email' => 'VARCHAR(128) NULL', 'economic_code' => 'VARCHAR(64) NULL', 'national_id' => 'VARCHAR(64) NULL',
            'registration_number' => 'VARCHAR(64) NULL', 'postal_code' => 'VARCHAR(64) NULL', 'address' => 'TEXT NULL',
            'default_tax_percent' => 'INT DEFAULT 0', 'default_tax_rate' => 'DOUBLE DEFAULT 0',
            'order_prefix' => 'VARCHAR(32) NULL', 'invoice_prefix' => 'VARCHAR(32) NULL', 'customer_prefix' => 'VARCHAR(32) NULL',
            'currency_unit' => 'VARCHAR(32) NULL',        ]
    ];

    foreach ($requiredColumns as $t => $cols) {
        $existingCols = [];
        try {
            $colRes = $pdo->query("SHOW COLUMNS FROM `$t`");
            if ($colRes) {
                while ($c = $colRes->fetch()) {
                    $existingCols[strtolower($c['Field'])] = true;
                }
            }
        } catch (Exception $e) {
            continue;
        }

        // Auto-cleanup: Drop legacy bloated data_json column from MySQL tables
        if (isset($existingCols['data_json'])) {
            try {
                $pdo->exec("ALTER TABLE `$t` DROP COLUMN `data_json`");
            } catch (Exception $eDrop) {}
        }

        foreach ($cols as $colName => $colDef) {
            if (!isset($existingCols[strtolower($colName)])) {
                try {
                    $pdo->exec("ALTER TABLE `$t` ADD COLUMN `$colName` $colDef");
                } catch (Exception $e) {}
            }
        }
    }

    $ensured = true;
}

// Helper to extract Base64 data and save to uploads/ directory on host
function extractAndSaveBase64Image($dataUrl, $prefix = 'img') {
    if (empty($dataUrl) || !is_string($dataUrl)) return $dataUrl;
    if (strpos($dataUrl, 'data:image/') !== 0) return $dataUrl;
    
    $parts = explode(',', $dataUrl, 2);
    if (count($parts) < 2) return $dataUrl;
    
    $mimePart = $parts[0];
    $base64Data = $parts[1];
    
    $ext = 'png';
    if (strpos($mimePart, 'image/jpeg') !== false || strpos($mimePart, 'image/jpg') !== false) {
        $ext = 'jpg';
    } elseif (strpos($mimePart, 'image/webp') !== false) {
        $ext = 'webp';
    } elseif (strpos($mimePart, 'image/svg') !== false) {
        $ext = 'svg';
    }
    
    $binary = base64_decode($base64Data);
    if ($binary === false) return $dataUrl;
    
    $uploadsDir = __DIR__ . '/uploads';
    if (!is_dir($uploadsDir)) {
        @mkdir($uploadsDir, 0755, true);
    }
    
    $filename = $prefix . '_' . substr(md5($binary), 0, 10) . '.' . $ext;
    $filePath = $uploadsDir . '/' . $filename;
    @file_put_contents($filePath, $binary);
    
    return 'uploads/' . $filename;
}

// Fallback JSON File database path
$dataDir = __DIR__ . '/data';
$dbFile = $dataDir . '/database.json';
if (!is_dir($dataDir)) @mkdir($dataDir, 0755, true);

$action = isset($_GET['action']) ? trim($_GET['action']) : (isset($_POST['action']) ? trim($_POST['action']) : '');
if (empty($action)) {
    $rawInputTest = @file_get_contents('php://input');
    if (!empty($rawInputTest)) {
        $parsedTest = @json_decode($rawInputTest, true);
        if (!empty($parsedTest['action'])) $action = trim($parsedTest['action']);
    }
}

$conn = getDatabaseConnection();

// ----------------------------------------------------
// UPLOAD IMAGE / FILE (Stored directly on Host uploads/ directory)
// ----------------------------------------------------
if ($action === 'upload_image' || $action === 'upload_file') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed. Use POST.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $uploadsDir = __DIR__ . '/uploads';
    if (!is_dir($uploadsDir)) {
        @mkdir($uploadsDir, 0777, true);
        @chmod($uploadsDir, 0777);
    }

    $rawInput = @file_get_contents('php://input');
    $payload = @json_decode($rawInput, true);

    $type = !empty($payload['type']) ? trim($payload['type']) : (!empty($_POST['type']) ? trim($_POST['type']) : 'img');
    $base64Data = !empty($payload['base64']) ? $payload['base64'] : '';

    $targetName = '';
    $finalUrl = '';
    $saved = false;

    // A) If Base64 JSON payload
    if (!empty($base64Data)) {
        $ext = 'png';
        if (strpos($base64Data, 'image/jpeg') !== false || strpos($base64Data, 'image/jpg') !== false) {
            $ext = 'jpg';
        } elseif (strpos($base64Data, 'image/webp') !== false) {
            $ext = 'webp';
        } elseif (strpos($base64Data, 'image/svg') !== false) {
            $ext = 'svg';
        }

        if ($type === 'logo') {
            $targetName = 'logo.' . $ext;
        } elseif ($type === 'stamp') {
            $targetName = 'stamp_signature.png';
        } elseif ($type === 'bg' || $type === 'cover') {
            $targetName = 'login_bg.' . $ext;
        } else {
            $targetName = $type . '_' . time() . '.' . $ext;
        }

        $parts = explode(',', $base64Data, 2);
        $binary = (count($parts) === 2) ? base64_decode($parts[1]) : base64_decode($base64Data);

        if ($binary !== false) {
            $targetPath = $uploadsDir . '/' . $targetName;
            if (@file_put_contents($targetPath, $binary) !== false) {
                $saved = true;
                $finalUrl = 'uploads/' . $targetName . '?v=' . time();
            }
        }
    }
    // B) If Multipart $_FILES
    elseif (!empty($_FILES['file']['tmp_name'])) {
        $origName = $_FILES['file']['name'];
        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'])) {
            $ext = 'png';
        }

        if ($type === 'logo') {
            $targetName = 'logo.' . $ext;
        } elseif ($type === 'stamp') {
            $targetName = 'stamp_signature.png';
        } elseif ($type === 'bg' || $type === 'cover') {
            $targetName = 'login_bg.' . $ext;
        } else {
            $targetName = 'img_' . time() . '_' . substr(md5(uniqid()), 0, 6) . '.' . $ext;
        }

        $targetPath = $uploadsDir . '/' . $targetName;
        if (@move_uploaded_file($_FILES['file']['tmp_name'], $targetPath)) {
            $saved = true;
            $finalUrl = 'uploads/' . $targetName . '?v=' . time();
        }
    }

    if ($saved && !empty($finalUrl)) {
        // Automatically sync new image path into MySQL settings table
        if ($conn instanceof PDO) {
            try {
                if ($type === 'logo') {
                    $st = $conn->prepare("UPDATE `settings` SET `logo_url` = ?, `updated_at` = CURRENT_TIMESTAMP WHERE `id` = 'set-1' OR `id` = '1' OR 1=1 LIMIT 1");
                    $st->execute([$finalUrl]);
                } elseif ($type === 'stamp') {
                    $st = $conn->prepare("UPDATE `settings` SET `stamp_signature_url` = ?, `updated_at` = CURRENT_TIMESTAMP WHERE `id` = 'set-1' OR `id` = '1' OR 1=1 LIMIT 1");
                    $st->execute([$finalUrl]);
                } elseif ($type === 'bg' || $type === 'cover') {
                    $st = $conn->prepare("UPDATE `settings` SET `login_background_url` = ?, `updated_at` = CURRENT_TIMESTAMP WHERE `id` = 'set-1' OR `id` = '1' OR 1=1 LIMIT 1");
                    $st->execute([$finalUrl]);
                }
            } catch (Exception $e) {}
        }

        // Also update JSON file fallback if in file mode
        if (file_exists($dbFile)) {
            try {
                $fData = @json_decode(@file_get_contents($dbFile), true);
                if (is_array($fData) && isset($fData['settings'])) {
                    if ($type === 'logo') $fData['settings']['logo_url'] = $finalUrl;
                    if ($type === 'stamp') $fData['settings']['stamp_signature_url'] = $finalUrl;
                    if ($type === 'bg' || $type === 'cover') $fData['settings']['login_background_url'] = $finalUrl;
                    @file_put_contents($dbFile, json_encode($fData, JSON_UNESCAPED_UNICODE));
                }
            } catch (Exception $e) {}
        }

        echo json_encode([
            'success' => true,
            'url' => $finalUrl,
            'filename' => $targetName,
            'message' => 'تصویر با موفقیت در پوشه uploads هاست ذخیره گردید.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'خطا در دریافت و ذخیره فایل روی هاست. لطفاً دسترسی پوشه uploads را بررسی نمایید.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ----------------------------------------------------
// PING / VERSION / REALTIME POLLING
// ----------------------------------------------------
if ($action === 'version' || $action === 'poll' || $action === 'ping') {
    if ($conn instanceof PDO) {
        $totalRows = 0;
        try {
            $st = $conn->query("SELECT (SELECT COUNT(*) FROM `customers`) + (SELECT COUNT(*) FROM `orders`) + (SELECT COUNT(*) FROM `invoices`) + (SELECT COUNT(*) FROM `transactions`) as cnt");
            if ($st) $totalRows = (int)$st->fetchColumn();
        } catch (Exception $e) {}

        $rev = time();
        $resetEpoch = '0';
        try {
            $st = $conn->query("SELECT UNIX_TIMESTAMP(updated_at) as u FROM `settings` WHERE id = 1 LIMIT 1");
            if ($st) {
                $row = $st->fetch();
                if (!empty($row['u'])) $rev = (int)$row['u'];
            }
        } catch (Exception $e) {}

        echo json_encode([
            'success' => true,
            'engine' => 'mysql',
            'revision' => $rev,
            'reset_epoch' => $resetEpoch,
            'total_rows' => $totalRows,
            'timestamp' => date('c'),
            'server_time_ms' => round(microtime(true) * 1000)
        ], JSON_UNESCAPED_UNICODE);
        exit;
    } else {
        $mtime = file_exists($dbFile) ? filemtime($dbFile) : 1;
        echo json_encode([
            'success' => true,
            'engine' => 'file_fallback',
            'revision' => $mtime,
            'total_rows' => 0,
            'timestamp' => date('c'),
            'server_time_ms' => round(microtime(true) * 1000)
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ----------------------------------------------------
// TEST DATABASE CONNECTION
// ----------------------------------------------------
if ($action === 'test_db') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed. Use POST.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $rawInput = file_get_contents('php://input');
    $inputData = json_decode($rawInput, true) ?? [];

    $testHost = trim($inputData['host'] ?? 'localhost');
    $testDbName = trim($inputData['dbname'] ?? '');
    $testUser = trim($inputData['user'] ?? '');
    $testPass = (string)($inputData['pass'] ?? '');
    $testPort = intval($inputData['port'] ?? 3306);
    if ($testPort <= 0) $testPort = 3306;

    if (empty($testDbName) || empty($testUser)) {
        echo json_encode([
            'success' => false,
            'message' => 'لطفاً نام پایگاه‌داده و نام کاربر را وارد فرمایید.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $testRes = getDatabaseConnection([
        'host' => $testHost,
        'dbname' => $testDbName,
        'user' => $testUser,
        'pass' => $testPass,
        'port' => $testPort
    ]);

    if ($testRes instanceof PDO) {
        $ver = '';
        try {
            $vStmt = $testRes->query("SELECT VERSION() as v");
            $vRow = $vStmt->fetch();
            $ver = $vRow['v'] ?? '';
        } catch (Exception $e) {}

        echo json_encode([
            'success' => true,
            'message' => 'ارتباط با دیتابیس MySQL با موفقیت برقرار شد!',
            'version' => $ver
        ], JSON_UNESCAPED_UNICODE);
        exit;
    } else {
        $err = is_array($testRes) && isset($testRes['error']) ? $testRes['error'] : 'عدم برقراری ارتباط با دیتابیس';
        echo json_encode([
            'success' => false,
            'message' => 'خطا در اتصال به دیتابیس: ' . $err,
            'error' => $err
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ----------------------------------------------------
// SAVE DATABASE CONFIG TO db_config.php & INITIALIZE
// ----------------------------------------------------
if ($action === 'save_db_config') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed. Use POST.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $rawInput = file_get_contents('php://input');
    $inputData = json_decode($rawInput, true) ?? [];

    $testHost = trim($inputData['host'] ?? 'localhost');
    $testDbName = trim($inputData['dbname'] ?? '');
    $testUser = trim($inputData['user'] ?? '');
    $testPass = (string)($inputData['pass'] ?? '');
    $testPort = intval($inputData['port'] ?? 3306);
    if ($testPort <= 0) $testPort = 3306;

    if (empty($testDbName) || empty($testUser)) {
        echo json_encode([
            'success' => false,
            'message' => 'نام پایگاه‌داده و نام کاربر نمی‌تواند خالی باشد.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $testRes = getDatabaseConnection([
        'host' => $testHost,
        'dbname' => $testDbName,
        'user' => $testUser,
        'pass' => $testPass,
        'port' => $testPort
    ]);

    if (!($testRes instanceof PDO)) {
        $err = is_array($testRes) && isset($testRes['error']) ? $testRes['error'] : 'اطلاعات اتصال به دیتابیس اشتباه است.';
        echo json_encode([
            'success' => false,
            'message' => 'تنظیمات ذخیره نشد زیرا دیتابیس با این مشخصات متصل نشد: ' . $err,
            'error' => $err
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Write to db_config.php
    $escapedPass = addcslashes($testPass, "'\\");
    $content = "<?php\n"
        . "/**\n"
        . " * تنظیمات اتصال به دیتابیس MySQL\n"
        . " * Alborz Pipe System - MySQL Database Configuration\n"
        . " * ثبت شده در تاریخ: " . date('Y-m-d H:i:s') . "\n"
        . " */\n\n"
        . "define('DB_HOST', '{$testHost}');\n"
        . "define('DB_NAME', '{$testDbName}');\n"
        . "define('DB_USER', '{$testUser}');\n"
        . "define('DB_PASS', '{$escapedPass}');\n"
        . "define('DB_PORT', {$testPort});\n"
        . "define('DB_CHARSET', 'utf8mb4');\n";

    if (@file_put_contents($configFile, $content) === false) {
        echo json_encode([
            'success' => false,
            'message' => 'خطا در ذخیره فایل db_config.php. لطفاً دسترسی نوشتن (Permission 644 یا 755) را بررسی نمایید.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Auto-migrate tables on new connection
    ensureTablesExist($testRes);

    echo json_encode([
        'success' => true,
        'message' => 'تنظیمات اتصال به پایگاه‌داده با موفقیت ذخیره شد و جداول سامانه ایجاد گردیدند.',
        'config' => [
            'host' => $testHost,
            'dbname' => $testDbName,
            'user' => $testUser,
            'port' => $testPort
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ----------------------------------------------------
// STATUS / CHECK CONNECTION
// ----------------------------------------------------
if ($action === 'status' || $action === 'test' || empty($action)) {
    if (!($conn instanceof PDO)) {
        $errMsg = is_array($conn) && isset($conn['error']) ? $conn['error'] : 'اتصال برقرار نشد';
        $isDefaultPlaceholder = is_array($conn) && !empty($conn['is_default']);

        echo json_encode([
            'success' => false,
            'status' => 'connection_error',
            'engine' => file_exists($dbFile) ? 'file_json_fallback' : 'none',
            'configured' => !$isDefaultPlaceholder,
            'is_default_placeholder' => $isDefaultPlaceholder,
            'error' => $errMsg,
            'message' => 'خطا در اتصال به MySQL: ' . $errMsg,
            'config' => [
                'host' => DB_HOST,
                'dbname' => DB_NAME,
                'user' => DB_USER,
                'has_password' => (!empty(DB_PASS) && DB_PASS !== 'Your_Strong_Password'),
                'is_placeholder' => $isDefaultPlaceholder
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    ensureTablesExist($conn);

    $stats = [];
    $totalRecords = 0;
    $mainTables = ['orders', 'customers', 'invoices', 'transactions', 'payments', 'deliveries', 'materials', 'expenses', 'employees', 'audit_logs'];
    foreach ($mainTables as $table) {
        try {
            $stmt = $conn->query("SELECT COUNT(*) as cnt FROM `$table`");
            $row = $stmt ? $stmt->fetch() : null;
            $cnt = (int)($row['cnt'] ?? 0);
            $stats[$table] = $cnt;
            $totalRecords += $cnt;
        } catch (Exception $e) {
            $stats[$table] = 0;
        }
    }

    echo json_encode([
        'success' => true,
        'status' => 'online',
        'engine' => 'mysql',
        'configured' => true,
        'is_default_placeholder' => false,
        'database_name' => DB_NAME,
        'db_host' => DB_HOST,
        'config' => [
            'host' => DB_HOST,
            'dbname' => DB_NAME,
            'user' => DB_USER,
            'has_password' => true,
            'is_placeholder' => false
        ],
        'server_time' => date('c'),
        'total_records' => $totalRecords,
        'table_counts' => $stats,
        'mysql_version' => $conn->getAttribute(PDO::ATTR_SERVER_VERSION),
        'message' => 'دیتابیس قدرتمند MySQL متصل و فعال است.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ----------------------------------------------------
// DEDICATED ATOMIC SAVE SETTINGS
// ----------------------------------------------------
if ($action === 'save_settings') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed. Use POST.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    if (!is_array($data)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'فرمت تنظیمات نامعتبر است.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (isset($data['data']) && is_array($data['data'])) $data = $data['data'];
    if (isset($data['settings']) && is_array($data['settings'])) $data = $data['settings'];

    if ($conn instanceof PDO) {
        ensureTablesExist($conn);
        try {
            foreach (['logo_url', 'stamp_signature_url', 'login_cover_url', 'login_background_url'] as $imgKey) {
                if (!empty($data[$imgKey])) {
                    $data[$imgKey] = extractAndSaveBase64Image($data[$imgKey], str_replace('_url', '', $imgKey));
                }
            }
            $jsonStr = json_encode($data, JSON_UNESCAPED_UNICODE);
            $bizName = $data['business_name'] ?? $data['company_name'] ?? null;
            $compName = $data['company_name'] ?? $data['business_name'] ?? null;
            $phone = $data['phone'] ?? null;
            $address = $data['address'] ?? null;

            $stmt = $conn->prepare("INSERT INTO `settings` 
                (`id`, `business_name`, `company_name`, `brand_subtitle`, `logo_url`, `stamp_signature_url`, `login_cover_url`, `login_background_url`, `phone`, `fax`, `email`, `economic_code`, `national_id`, `registration_number`, `postal_code`, `address`) 
                VALUES (1, :bn, :cn, :bs, :lu, :su, :lc, :lb, :ph, :fx, :em, :ec, :ni, :rn, :pc, :ad) 
                ON DUPLICATE KEY UPDATE 
                    `business_name` = VALUES(`business_name`),
                    `company_name` = VALUES(`company_name`),
                    `brand_subtitle` = VALUES(`brand_subtitle`),
                    `logo_url` = VALUES(`logo_url`),
                    `stamp_signature_url` = VALUES(`stamp_signature_url`),
                    `login_cover_url` = VALUES(`login_cover_url`),
                    `login_background_url` = VALUES(`login_background_url`),
                    `phone` = VALUES(`phone`),
                    `fax` = VALUES(`fax`),
                    `email` = VALUES(`email`),
                    `economic_code` = VALUES(`economic_code`),
                    `national_id` = VALUES(`national_id`),
                    `registration_number` = VALUES(`registration_number`),
                    `postal_code` = VALUES(`postal_code`),
                    `address` = VALUES(`address`),
                    `updated_at` = CURRENT_TIMESTAMP");
            $stmt->execute([
                ':bn' => $bizName,
                ':cn' => $compName,
                ':bs' => $data['brand_subtitle'] ?? 'تولیدکننده تخصصی انواع لوله و اتصالات پلی‌اتیلن استاندارد',
                ':lu' => $data['logo_url'] ?? '',
                ':su' => $data['stamp_signature_url'] ?? '',
                ':lc' => $data['login_cover_url'] ?? '',
                ':lb' => $data['login_background_url'] ?? '',
                ':ph' => $phone,
                ':fx' => $data['fax'] ?? '',
                ':em' => $data['email'] ?? '',
                ':ec' => $data['economic_code'] ?? '10300026420',
                ':ni' => $data['national_id'] ?? '10300026420',
                ':rn' => $data['registration_number'] ?? '276',
                ':pc' => $data['postal_code'] ?? '6961912345',
                ':ad' => $address
            ]);

            echo json_encode([
                'success' => true,
                'engine' => 'mysql',
                'message' => 'تنظیمات سامانه در دیتابیس MySQL (جدول settings) با موفقیت ثبت گردید.',
                'timestamp' => date('c')
            ], JSON_UNESCAPED_UNICODE);
            exit;
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'خطا در ثبت تنظیمات: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
}

// ----------------------------------------------------
// SQL BACKUP DUMP (.sql file direct download)
// ----------------------------------------------------
if ($action === 'backup_sql') {
    if ($conn instanceof PDO) {
        ensureTablesExist($conn);

        $dateStr = date('Y-m-d_His');
        $filename = "MySQL_AlborzPipe_Backup_{$dateStr}.sql";

        header('Content-Type: application/sql; charset=utf-8');
        header("Content-Disposition: attachment; filename=\"{$filename}\"");

        echo "-- ====================================================================\n";
        echo "-- پایگاه داده رسمی: {$compOfficialName}\n";
        echo "-- نوع پشتیبان: پشتیبان‌گیری جامع تمام سال‌ها\n";
        echo "-- زمان خروجی: " . date('c') . "\n";
        echo "-- سازگار با: MySQL 5.7+ / MySQL 8.0+ / MariaDB / phpMyAdmin\n";
        echo "-- ====================================================================\n\n";
        echo "SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n\n";

        $tableCanonicalCols = [
            'customers' => ['id', 'code', 'name', 'national_id', 'phone', 'address', 'is_active', 'created_at', 'updated_at'],
            'products' => ['id', 'code', 'name', 'size', 'pressure', 'type', 'unit', 'unit_price', 'weight_per_meter', 'stock_meters', 'description', 'is_active', 'created_at', 'updated_at'],
            'invoices' => ['id', 'order_id', 'customer_id', 'customer_name', 'customer_code', 'invoice_number', 'invoice_date', 'status', 'items', 'subtotal', 'discount_enabled', 'discount', 'tax_enabled', 'tax_percent', 'tax_amount', 'final_total', 'description', 'stamp_signature_enabled', 'created_at', 'updated_at'],
            'orders' => ['id', 'customer_id', 'customer_name', 'customer_code', 'order_number', 'order_date', 'status', 'items', 'subtotal', 'discount_enabled', 'discount', 'tax_enabled', 'tax_percent', 'tax_amount', 'final_total', 'description', 'stamp_signature_enabled', 'created_at', 'updated_at'],
            'transactions' => ['id', 'customer_id', 'transaction_date', 'type', 'debit', 'credit', 'description', 'reference_type', 'reference_id', 'reference_number', 'created_at', 'updated_at'],
            'payments' => ['id', 'customer_id', 'customer_name', 'customer_code', 'payment_date', 'amount', 'payment_method', 'description', 'created_by', 'status', 'created_at', 'updated_at'],
            'cheques' => ['id', 'customer_id', 'customer_name', 'customer_code', 'cheque_number', 'bank_name', 'branch', 'due_date', 'amount', 'status', 'description', 'created_by', 'created_at', 'updated_at'],
            'adjustments' => ['id', 'customer_id', 'customer_name', 'adjustment_date', 'amount', 'type', 'description', 'created_by', 'status', 'created_at', 'updated_at'],
            'drivers' => ['id', 'name', 'phone', 'plate_number', 'vehicle_type', 'is_active', 'created_at', 'updated_at'],
            'vehicles' => ['id', 'plate_number', 'vehicle_type', 'driver_id', 'driver_name', 'driver_phone', 'is_active', 'created_at', 'updated_at'],
            'deliveries' => ['id', 'customer_id', 'customer_name', 'customer_code', 'delivery_number', 'delivery_date', 'driver_id', 'driver_name', 'driver_phone', 'vehicle_plate', 'vehicle_type', 'status', 'items', 'total_meters', 'description', 'created_by', 'created_at', 'updated_at'],
            'returns' => ['id', 'customer_id', 'customer_name', 'customer_code', 'return_number', 'return_date', 'status', 'reason', 'description', 'items', 'total_meters', 'total_amount', 'created_by', 'created_at', 'updated_at'],
            'materials' => ['id', 'name', 'code', 'category', 'unit', 'current_stock', 'min_stock_alert', 'is_active', 'created_at', 'updated_at'],
            'warehouses' => ['id', 'name', 'code', 'location', 'manager_name', 'phone', 'description', 'is_active', 'created_at', 'updated_at'],
            'movements' => ['id', 'code', 'material_id', 'material_name', 'material_code', 'warehouse_id', 'warehouse_name', 'type', 'quantity', 'bags_count', 'driver_name', 'driver_phone', 'reference_type', 'created_by', 'created_at', 'updated_at'],
            'employees' => ['id', 'code', 'name', 'national_id', 'phone1', 'phone2', 'address', 'position', 'salary_base', 'balance', 'status', 'created_at', 'updated_at'],
            'employee_txs' => ['id', 'employee_id', 'employee_name', 'employee_code', 'date', 'type', 'amount', 'payment_method', 'reference_number', 'description', 'created_by', 'created_at', 'updated_at'],
            'employee_leaves' => ['id', 'employee_id', 'employee_name', 'employee_code', 'type', 'category', 'from_date', 'to_date', 'days_count', 'status', 'created_at', 'updated_at'],
            'employment_periods' => ['id', 'employee_id', 'employee_name', 'start_date', 'end_date', 'contract_type', 'position', 'reason_for_leaving', 'notes', 'status', 'created_at', 'updated_at'],
            'expenses' => ['id', 'code', 'title', 'category', 'amount', 'expense_date', 'beneficiary', 'payment_method', 'description', 'created_by', 'created_at', 'updated_at'],
            'production_logs' => ['id', 'code', 'production_date', 'size', 'pressure', 'type', 'diameter', 'thickness', 'motor_speed', 'traction_speed', 'die_mold', 'pin_needle', 'weight_unit', 'meters', 'total_weight', 'customer_name', 'notes', 'created_at', 'pipe_size', 'meters_produced', 'weight_kg', 'material_type'],
            'users' => ['id', 'user_code', 'name', 'username', 'password', 'role_id', 'role_name', 'is_admin', 'is_active', 'permissions', 'created_at', 'updated_at'],
            'roles' => ['id', 'name', 'description', 'is_active', 'permissions', 'created_at', 'updated_at'],
            'permissions' => ['id', 'name', 'key', 'category', 'description'],
            'settings' => ['id', 'business_name', 'company_name', 'brand_subtitle', 'logo_url', 'stamp_signature_url', 'login_cover_url', 'login_background_url', 'phone', 'fax', 'email', 'economic_code', 'national_id', 'registration_number', 'postal_code', 'address', 'default_tax_percent', 'default_tax_rate', 'default_order_notes_enabled', 'default_order_notes_text', 'default_invoice_notes_enabled', 'default_invoice_notes_text', 'default_delivery_notes_enabled', 'default_delivery_notes_text', 'backup_reminder_enabled', 'backup_reminder_interval_days', 'last_backup_date', 'order_prefix', 'invoice_prefix', 'customer_prefix', 'product_prefix', 'delivery_prefix', 'return_prefix', 'material_prefix', 'currency_unit', 'print_invoice_header', 'print_invoice_footer_terms', 'default_invoice_notes', 'print_invoice_signatures', 'timezone', 'updated_at'],
            'audit_logs' => ['id', 'user_id', 'user_code', 'user_name', 'user_role', 'action', 'action_type', 'entity_type', 'entity_id', 'document_number', 'entity_title', 'old_values', 'new_values', 'ip_address', 'user_agent', 'created_at']
        ];

        // Fetch company name dynamically from settings for official header
        $compOfficialName = 'شرکت کبیر لوله دره شهر';
        try {
            $cStmt = $conn->query("SELECT company_name, business_name FROM `settings` WHERE id = 1 LIMIT 1");
            if ($cStmt) {
                $cRow = $cStmt->fetch();
                if (!empty($cRow['company_name'])) $compOfficialName = $cRow['company_name'];
                elseif (!empty($cRow['business_name'])) $compOfficialName = $cRow['business_name'];
            }
        } catch (Exception $eComp) {}

        foreach ($tableCanonicalCols as $tbl => $canonicalCols) {
            try {
                // Discover existing columns in this table
                $existingCols = [];
                $colCheck = $conn->query("SHOW COLUMNS FROM `$tbl`");
                if ($colCheck) {
                    while ($c = $colCheck->fetch()) {
                        $existingCols[strtolower($c['Field'])] = true;
                    }
                }

                // Filter down to only canonical columns that actually exist (excluding data_json completely)
                $selectedCols = [];
                foreach ($canonicalCols as $colName) {
                    if (isset($existingCols[strtolower($colName)])) {
                        $selectedCols[] = $colName;
                    }
                }

                if (empty($selectedCols)) continue;

                $escapedCols = array_map(function($c) { return "`$c`"; }, $selectedCols);
                $colsHeader = implode(', ', $escapedCols);

                $rowsStmt = $conn->query("SELECT " . $colsHeader . " FROM `$tbl`");
                if (!$rowsStmt) continue;
                $rows = $rowsStmt->fetchAll();
                $count = count($rows);

                echo "-- -----------------------------------------------------\n";
                echo "-- پاک‌سازی و داده‌های جدول `{$tbl}` (تعداد رکورد: {$count})\n";
                echo "-- -----------------------------------------------------\n";
                echo "DELETE FROM `{$tbl}`;\n";

                if ($count > 0) {
                    foreach ($rows as $r) {
                        $escapedVals = [];
                        foreach ($selectedCols as $colName) {
                            $val = $r[$colName] ?? null;
                            if ($val === null) {
                                $escapedVals[] = 'NULL';
                            } else {
                                $escapedVals[] = $conn->quote($val);
                            }
                        }
                        echo "REPLACE INTO `{$tbl}` ({$colsHeader}) VALUES (" . implode(', ', $escapedVals) . ");\n";
                    }
                }
                echo "\n";
            } catch (Exception $e) {}
        }

        echo "SET FOREIGN_KEY_CHECKS = 1;\n";
        exit;
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'اتصال MySQL جهت تولید فایل SQL برقرار نیست.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ----------------------------------------------------
// RESTORE RAW SQL SCRIPT DIRECTLY INTO MYSQL
// ----------------------------------------------------
if ($action === 'restore_sql') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed. Use POST.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $rawSql = file_get_contents('php://input');
    if (empty($rawSql)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'محتوای فایل SQL ارسالی خالی است.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($conn instanceof PDO) {
        try {
            $allTables = [
                'customers', 'products', 'orders', 'invoices', 'transactions', 'customer_transactions',
                'payments', 'cheques', 'adjustments', 'drivers', 'vehicles',
                'deliveries', 'returns', 'materials', 'warehouses', 'movements', 'material_movements',
                'employees', 'employee_txs', 'employee_transactions', 'employee_leaves', 'employment_periods',
                'expenses', 'production_logs', 'users', 'roles', 'permissions', 'audit_logs', 'settings', 'system_settings'
            ];

            // 1. First zero out: Drop all existing tables so backup imports into a clean slate with zero residue
            $conn->exec("SET FOREIGN_KEY_CHECKS = 0;");
            foreach ($allTables as $t) {
                try { $conn->exec("DROP TABLE IF EXISTS `$t`;"); } catch (Exception $e) {}
            }
            // 2. Re-create canonical tables with full schema
            ensureTablesExist($conn, true);
            $conn->exec("SET NAMES utf8mb4;");

            // Split SQL by statements safely
            $queries = [];
            $currentQuery = '';
            $inString = false;
            $stringChar = '';
            $inLineComment = false;
            $inBlockComment = false;
            $isEscaped = false;
            $len = strlen($rawSql);

            for ($i = 0; $i < $len; $i++) {
                $char = $rawSql[$i];
                $nextChar = ($i + 1 < $len) ? $rawSql[$i + 1] : '';

                if ($inLineComment) {
                    if ($char === "\n" || $char === "\r") $inLineComment = false;
                    $currentQuery .= $char;
                    continue;
                }
                if ($inBlockComment) {
                    if ($char === '*' && $nextChar === '/') {
                        $inBlockComment = false;
                        $currentQuery .= '*/';
                        $i++;
                        continue;
                    }
                    $currentQuery .= $char;
                    continue;
                }
                if ($isEscaped) {
                    $currentQuery .= $char;
                    $isEscaped = false;
                    continue;
                }
                if ($char === '\\') {
                    $isEscaped = true;
                    $currentQuery .= $char;
                    continue;
                }
                if ($inString) {
                    if ($char === $stringChar) $inString = false;
                    $currentQuery .= $char;
                    continue;
                }
                if ($char === '-' && $nextChar === '-') {
                    $inLineComment = true;
                    $currentQuery .= $char;
                    continue;
                }
                if ($char === '#') {
                    $inLineComment = true;
                    $currentQuery .= $char;
                    continue;
                }
                if ($char === '/' && $nextChar === '*') {
                    $inBlockComment = true;
                    $currentQuery .= '/*';
                    $i++;
                    continue;
                }

                if ($char === "'" || $char === '"') {
                    $inString = true;
                    $stringChar = $char;
                    $currentQuery .= $char;
                } elseif ($char === ';') {
                    $trimmed = trim($currentQuery);
                    if (!empty($trimmed)) $queries[] = $trimmed;
                    $currentQuery = '';
                } else {
                    $currentQuery .= $char;
                }
            }
            if (!empty(trim($currentQuery))) $queries[] = trim($currentQuery);

            $executedCount = 0;
            $dataStatementsCount = 0;
            $errors = [];

            foreach ($queries as $q) {
                $cleanQ = preg_replace('/^\s*(--[^\r\n]*|#[^\r\n]*|\/\*[\s\S]*?\*\/)\s*/', '', $q);
                $cleanQ = trim($cleanQ);
                if (empty($cleanQ) || substr($cleanQ, 0, 2) === '--' || substr($cleanQ, 0, 2) === '/*' || substr($cleanQ, 0, 1) === '#') {
                    continue;
                }

                try {
                    $conn->exec($cleanQ);
                    $executedCount++;
                    if (preg_match('/^(INSERT|REPLACE|UPDATE|DELETE|CREATE)\b/i', $cleanQ)) {
                        $dataStatementsCount++;
                    }
                } catch (Exception $stmtErr) {
                    $errText = $stmtErr->getMessage();

                    // Auto-heal 1: Missing column (#1054) - dynamically alter table and retry
                    if (strpos($errText, "Unknown column") !== false || strpos($errText, "1054") !== false) {
                        if (preg_match('/Unknown column [\'`]([^\'`]+)[\'`]/i', $errText, $colMatch)) {
                            $missingCol = $colMatch[1];
                            if (preg_match('/(?:INSERT|REPLACE)\s+INTO\s+[`"]?([a-zA-Z0-9_]+)[`"]?/i', $cleanQ, $tblMatch)) {
                                $targetTable = $tblMatch[1];
                                try {
                                    $conn->exec("ALTER TABLE `$targetTable` ADD COLUMN `$missingCol` TEXT NULL;");
                                    $conn->exec($cleanQ);
                                    $executedCount++;
                                    if (preg_match('/^(INSERT|REPLACE|UPDATE|DELETE|CREATE)\b/i', $cleanQ)) {
                                        $dataStatementsCount++;
                                    }
                                    continue;
                                } catch (Exception $colRetryErr) {}
                            }
                        }
                    }
                    $errors[] = $errText;
                }
            }

            $conn->exec("SET FOREIGN_KEY_CHECKS = 1;");
            $newRevision = time();
            $epoch = (string)round(microtime(true) * 1000);

            // Summary of restored rows
            $tableStats = [];
            $totalFoundRows = 0;
            foreach ($allTables as $ct) {
                try {
                    $st = $conn->query("SELECT COUNT(*) as cnt FROM `$ct`");
                    $cVal = (int)($st ? $st->fetchColumn() : 0);
                    $tableStats[$ct] = $cVal;
                    $totalFoundRows += $cVal;
                } catch (Exception $e) {}
            }

            echo json_encode([
                'success' => true,
                'engine' => 'mysql',
                'executed_statements' => $executedCount,
                'data_statements' => $dataStatementsCount,
                'total_rows_in_db' => $totalFoundRows,
                'table_counts' => $tableStats,
                'revision' => $newRevision,
                'reset_epoch' => $epoch,
                'message' => "فایل پشتیبان SQL با موفقیت در پایگاه‌داده MySQL هاست بازیابی شد ({$executedCount} دستور اجرا گردید و {$totalFoundRows} رکورد در ۲۶ جدول تثبیت شد).",
                'errors' => $errors,
                'server_time_ms' => round(microtime(true) * 1000),
                'timestamp' => date('c')
            ], JSON_UNESCAPED_UNICODE);
            exit;
        } catch (Exception $e) {
            if ($conn instanceof PDO) @$conn->exec("SET FOREIGN_KEY_CHECKS = 1;");
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => $e->getMessage(),
                'message' => 'خطا در بازیابی SQL: ' . $e->getMessage()
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'دیتابیس MySQL متصل نیست.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ----------------------------------------------------
// RESTORE PRELOADED DUMP FILE FROM SERVER
// ----------------------------------------------------
if ($action === 'restore_server_file') {
    $candidateFiles = [
        __DIR__ . '/AlborzPipe_MySQL_FullDump_2026-10-03.sql',
        dirname(__DIR__) . '/AlborzPipe_MySQL_FullDump_2026-10-03.sql',
        __DIR__ . '/public/AlborzPipe_MySQL_FullDump_2026-10-03.sql'
    ];
    $foundPath = null;
    foreach ($candidateFiles as $f) {
        if (file_exists($f) && filesize($f) > 1000) {
            $foundPath = $f;
            break;
        }
    }

    if (!$foundPath) {
        echo json_encode(['success' => false, 'message' => 'فایل AlborzPipe_MySQL_FullDump_2026-10-03.sql روی سرور یافت نشد.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $sqlContent = file_get_contents($foundPath);
    if (!($conn instanceof PDO)) {
        echo json_encode(['success' => false, 'message' => 'دیتابیس MySQL متصل نیست.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $allTables = [
        'customers', 'products', 'orders', 'invoices', 'transactions', 'customer_transactions',
        'payments', 'cheques', 'adjustments', 'drivers', 'vehicles',
        'deliveries', 'returns', 'materials', 'warehouses', 'movements', 'material_movements',
        'employees', 'employee_txs', 'employee_transactions', 'employee_leaves', 'employment_periods',
        'expenses', 'production_logs', 'users', 'roles', 'permissions', 'audit_logs', 'settings', 'system_settings'
    ];
    $conn->exec("SET FOREIGN_KEY_CHECKS = 0;");
    foreach ($allTables as $t) {
        try { $conn->exec("DROP TABLE IF EXISTS `$t`;"); } catch (Exception $e) {}
    }
    ensureTablesExist($conn, true);
    $conn->exec("SET NAMES utf8mb4;");

    // Execute through transaction
    $lines = explode(";\n", $sqlContent);
    $execCount = 0;
    foreach ($lines as $line) {
        $clean = trim($line);
        if (empty($clean) || strpos($clean, '--') === 0) continue;
        try {
            $conn->exec($clean);
            $execCount++;
        } catch (Exception $e) {}
    }
    $conn->exec("SET FOREIGN_KEY_CHECKS = 1;");

    $custCount = (int)$conn->query("SELECT COUNT(*) FROM `customers`")->fetchColumn();
    $ordCount = (int)$conn->query("SELECT COUNT(*) FROM `orders`")->fetchColumn();
    $invCount = (int)$conn->query("SELECT COUNT(*) FROM `invoices`")->fetchColumn();
    $txCount = (int)$conn->query("SELECT COUNT(*) FROM `transactions`")->fetchColumn();

    echo json_encode([
        'success' => true,
        'message' => "بکاپ جامع سرور با موفقیت بازیابی شد! ({$custCount} مشتری، {$ordCount} سفارش، {$invCount} فاکتور، {$txCount} تراکنش در MySQL ثبت گردید)",
        'stats' => [
            'customers' => $custCount,
            'orders' => $ordCount,
            'invoices' => $invCount,
            'transactions' => $txCount
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ----------------------------------------------------
// FACTORY RESET (Clear MySQL tables to 0 records)
// ----------------------------------------------------
if ($action === 'factory_reset' || $action === 'reset_factory' || $action === 'clear' || $action === 'reset') {
    $newRevision = time();
    $epoch = (string)round(microtime(true) * 1000);

    if ($conn instanceof PDO) {
        try {
            $conn->exec("SET FOREIGN_KEY_CHECKS = 0;");

            $allTables = [
                'customers', 'products', 'orders', 'invoices', 'transactions', 'customer_transactions',
                'payments', 'cheques', 'adjustments', 'drivers', 'vehicles',
                'deliveries', 'returns', 'materials', 'warehouses', 'movements', 'material_movements',
                'employees', 'employee_txs', 'employee_transactions', 'employee_leaves', 'employment_periods',
                'expenses', 'production_logs', 'users', 'roles', 'permissions', 'audit_logs', 'settings', 'system_settings'
            ];
            // 1. Drop all tables completely from database so there is zero leftover schema corruption
            foreach ($allTables as $t) {
                try { 
                    $conn->exec("DROP TABLE IF EXISTS `$t`;"); 
                } catch (Exception $e) {}
            }

            // 2. Re-create all tables clean from standard canonical schema
            ensureTablesExist($conn, true);

            // 3. Always recreate clean superadmin user in users table
            $nowIso = date('c');
            try {
                $defaultAdminJson = json_encode([
                    'id' => 'usr-1',
                    'user_code' => 'USR-1001',
                    'name' => 'مدیر ارشد سیستم',
                    'username' => 'admin',
                    'password' => '123',
                    'role_id' => 'role-admin',
                    'role_name' => 'مدیر ارشد سیستم',
                    'is_admin' => true,
                    'is_active' => true,
                    'permissions' => ['all'],
                    'created_at' => $nowIso,
                    'updated_at' => $nowIso
                ], JSON_UNESCAPED_UNICODE);
                $permsJson = json_encode(['all'], JSON_UNESCAPED_UNICODE);
                $stmtAdmin = $conn->prepare("INSERT INTO `users` (`id`, `user_code`, `name`, `username`, `password`, `role_id`, `role_name`, `is_admin`, `is_active`, `permissions`, `created_at`, `updated_at`) VALUES ('usr-1', 'USR-1001', 'مدیر ارشد سیستم', 'admin', '123', 'role-admin', 'مدیر ارشد سیستم', 1, 1, :perms, :ca, :ua)");
                $stmtAdmin->execute([':perms' => $permsJson, ':ca' => $nowIso, ':ua' => $nowIso]);
            } catch (Exception $eAdmin) {}

            // 4. Clean settings record with reset epoch
            try {
                $cleanSettingsJson = json_encode([
                    'company_name' => '',
                    'reset_epoch' => $epoch,
                    'last_reset' => $nowIso,
                ], JSON_UNESCAPED_UNICODE);
                $stmtSett = $conn->prepare("INSERT INTO `settings` (`id`, `business_name`, `company_name`) VALUES (1, 'شرکت کبیر لوله دره شهر', 'شرکت کبیر لوله دره شهر') ON DUPLICATE KEY UPDATE `company_name` = VALUES(`company_name`)");
                $stmtSett->execute();
            } catch (Exception $eSett) {}

            $conn->exec("SET FOREIGN_KEY_CHECKS = 1;");
            @unlink($dbFile);

            echo json_encode([
                'success' => true,
                'engine' => 'mysql',
                'reset_at' => $nowIso,
                'reset_epoch' => $epoch,
                'system_revision' => $newRevision,
                'revision' => $newRevision,
                'total_rows' => 0,
                'message' => 'پایگاه‌داده MySQL هاست با موفقیت به نقطه صفر بازنشانی گردید و کلیه جداول از پایه بازسازی شدند.'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        } catch (Exception $resetErr) {
            if ($conn->inTransaction()) $conn->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'خطا در بازنشانی دیتابیس MySQL: ' . $resetErr->getMessage()], JSON_UNESCAPED_UNICODE);
            exit;
        }
    } else {
        @unlink($dbFile);
        echo json_encode([
            'success' => true,
            'engine' => 'file',
            'reset_at' => date('c'),
            'reset_epoch' => $epoch,
            'system_revision' => $newRevision,
            'revision' => $newRevision,
            'total_rows' => 0,
            'message' => 'اطلاعات با موفقیت به نقطه صفر بازنشانی گردید.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ----------------------------------------------------
// FAST SINGLE ENTITY UPSERT (Instant DB write for forms & actions)
// ----------------------------------------------------
if ($action === 'save_item' || $action === 'upsert_item') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed. Use POST.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $rawInput = file_get_contents('php://input');
    $payload = json_decode($rawInput, true);
    if (!is_array($payload) || empty($payload['table']) || empty($payload['item'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'پارامترهای جدول و داده الزامی است.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $rawTbl = strtolower(trim($payload['table']));
    $tableAliasMap = [
        'customer' => 'customers',
        'customer_transactions' => 'transactions',
        'transaction' => 'transactions',
        'order' => 'orders',
        'invoice' => 'invoices',
        'delivery' => 'deliveries',
        'return' => 'returns',
        'product' => 'products',
        'payment' => 'payments',
        'cheque' => 'cheques',
        'adjustment' => 'adjustments',
        'driver' => 'drivers',
        'vehicle' => 'vehicles',
        'material' => 'materials',
        'warehouse' => 'warehouses',
        'movement' => 'movements',
        'material_movement' => 'movements',
        'material_movements' => 'movements',
        'employee' => 'employees',
        'employee_transaction' => 'employee_txs',
        'employee_transactions' => 'employee_txs',
        'employee_leave' => 'employee_leaves',
        'expense' => 'expenses',
        'production_log' => 'production_logs',
        'user' => 'users',
        'role' => 'roles',
        'permission' => 'permissions',
        'audit_log' => 'audit_logs'
    ];
    $tbl = isset($tableAliasMap[$rawTbl]) ? $tableAliasMap[$rawTbl] : $rawTbl;
    $rowItem = $payload['item'];

    if ($conn instanceof PDO) {
        ensureTablesExist($conn);

        try {
            $existingCols = [];
            $colCheck = $conn->query("SHOW COLUMNS FROM `$tbl`");
            if ($colCheck) {
                while ($c = $colCheck->fetch()) {
                    $existingCols[strtolower($c['Field'])] = true;
                }
            }

            $id = isset($rowItem['id']) ? (string)$rowItem['id'] : (isset($rowItem['code']) ? (string)$rowItem['code'] : uniqid('rec_'));

            $colsToInsert = ['id' => $id];

            if (is_array($rowItem)) {
                foreach ($rowItem as $k => $v) {
                    $lowerK = strtolower($k);
                    if ($lowerK !== 'id' && $lowerK !== 'data_json' && isset($existingCols[$lowerK])) {
                        if (is_array($v) || is_object($v)) {
                            $colsToInsert[$lowerK] = json_encode($v, JSON_UNESCAPED_UNICODE);
                        } elseif (is_bool($v)) {
                            $colsToInsert[$lowerK] = $v ? 1 : 0;
                        } else {
                            $colsToInsert[$lowerK] = ($v !== null) ? (string)$v : null;
                        }
                    }
                }
            }

            $colNames = array_keys($colsToInsert);
            $escapedCols = array_map(function($c) { return "`$c`"; }, $colNames);
            $qMarks = array_fill(0, count($colNames), '?');
            $updatePairs = array_map(function($c) { return "`$c` = VALUES(`$c`)"; }, $colNames);

            $dynSql = "INSERT INTO `$tbl` (" . implode(', ', $escapedCols) . ") VALUES (" . implode(', ', $qMarks) . ") ON DUPLICATE KEY UPDATE " . implode(', ', $updatePairs);
            $s = $conn->prepare($dynSql);
            $s->execute(array_values($colsToInsert));

            // Touch settings updated_at so other devices' polling detects change immediately
            try {
                $conn->exec("UPDATE `settings` SET `updated_at` = CURRENT_TIMESTAMP WHERE `id` = 1");
            } catch (Exception $eRev) {}

            echo json_encode([
                'success' => true,
                'table' => $tbl,
                'id' => $id,
                'revision' => time(),
                'message' => 'رکورد با موفقیت و فوری در پایگاه‌داده MySQL ثبت گردید.'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => $e->getMessage(),
                'message' => 'خطا در ثبت رکورد در MySQL: ' . $e->getMessage()
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    } else {
        echo json_encode(['success' => true, 'engine' => 'file_cached', 'id' => $rowItem['id'] ?? null], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ----------------------------------------------------
// FAST SINGLE ENTITY DELETE
// ----------------------------------------------------
if ($action === 'delete_item') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed. Use POST.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $rawInput = file_get_contents('php://input');
    $payload = json_decode($rawInput, true);
    if (!is_array($payload) || empty($payload['table']) || empty($payload['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'پارامترهای جدول و شناسه الزامی است.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $rawTbl = strtolower(trim($payload['table']));
    $tbl = ($rawTbl === 'customer_transactions' || $rawTbl === 'transaction') ? 'transactions' : $rawTbl;
    $id = (string)$payload['id'];

    if ($conn instanceof PDO) {
        try {
            $delStmt = $conn->prepare("DELETE FROM `$tbl` WHERE `id` = ?");
            $delStmt->execute([$id]);

            // Touch settings updated_at so other devices' polling detects change immediately
            try {
                $conn->exec("UPDATE `settings` SET `updated_at` = CURRENT_TIMESTAMP WHERE `id` = 1");
            } catch (Exception $eRev) {}

            echo json_encode(['success' => true, 'table' => $tbl, 'id' => $id, 'revision' => time(), 'message' => 'رکورد از پایگاه‌داده حذف شد.'], JSON_UNESCAPED_UNICODE);
            exit;
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
            exit;
        }
    } else {
        echo json_encode(['success' => true, 'engine' => 'file_cached'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ----------------------------------------------------
// LOAD ALL DATA (from MySQL)
// ----------------------------------------------------
if ($action === 'load') {
    if ($conn instanceof PDO) {
        $collections = [
            'customers' => ['customers'],
            'products' => ['products'],
            'orders' => ['orders'],
            'invoices' => ['invoices'],
            'transactions' => ['transactions', 'customer_transactions'],
            'payments' => ['payments'],
            'cheques' => ['cheques'],
            'adjustments' => ['adjustments'],
            'drivers' => ['drivers'],
            'vehicles' => ['vehicles'],
            'deliveries' => ['deliveries'],
            'returns' => ['returns'],
            'materials' => ['materials'],
            'warehouses' => ['warehouses'],
            'movements' => ['movements', 'material_movements'],
            'employees' => ['employees'],
            'employee_txs' => ['employee_txs', 'employee_transactions'],
            'employee_leaves' => ['employee_leaves'],
            'employment_periods' => ['employment_periods'],
            'expenses' => ['expenses'],
            'production_logs' => ['production_logs'],
            'users' => ['users'],
            'roles' => ['roles'],
            'permissions' => ['permissions'],
            'audit_logs' => ['audit_logs'],
        ];

        $output = [];
        foreach ($collections as $key => $tableCandidates) {
            $output[$key] = [];
            foreach ($tableCandidates as $tableName) {
                try {
                    $stmt = $conn->query("SELECT * FROM `$tableName`");
                    if ($stmt) {
                        $items = [];
                        while ($row = $stmt->fetch()) {
                            unset($row['data_json']);
                            unset($row['updated_at']);
                            $decoded = array_filter($row, function($v) { return $v !== null; });

                            if (!empty($decoded) && is_array($decoded)) {
                                // Normalize 'items' array
                                if (isset($decoded['items'])) {
                                    if (is_string($decoded['items'])) {
                                        $parsedItems = json_decode($decoded['items'], true);
                                        $decoded['items'] = is_array($parsedItems) ? $parsedItems : [];
                                    } elseif (!is_array($decoded['items'])) {
                                        $decoded['items'] = [];
                                    }
                                } elseif (in_array($key, ['orders', 'invoices', 'deliveries', 'returns'])) {
                                    $decoded['items'] = [];
                                }

                                // Normalize 'permissions' array
                                if (isset($decoded['permissions'])) {
                                    if (is_string($decoded['permissions'])) {
                                        $parsedPerms = json_decode($decoded['permissions'], true);
                                        $decoded['permissions'] = is_array($parsedPerms) ? $parsedPerms : [];
                                    } elseif (!is_array($decoded['permissions'])) {
                                        $decoded['permissions'] = [];
                                    }
                                }

                                $items[] = $decoded;
                            }
                        }
                        if (count($items) > 0 || empty($output[$key])) {
                            $output[$key] = $items;
                        }
                        if (count($items) > 0) break;
                    }
                } catch (Exception $tblLoadErr) {}
            }
        }

        // Settings (Universal Multi-table & Format Fallback)
        try {
            $extractedSettings = null;
            foreach (['settings', 'system_settings'] as $tbl) {
                try {
                    $st = $conn->query("SELECT * FROM `$tbl` LIMIT 1");
                    if ($st) {
                        $row0 = $st->fetch();
                        if ($row0) {
                            unset($row0['data_json']);
                            unset($row0['updated_at']);
                            $cleanRow = array_filter($row0, function($v) { return $v !== null && $v !== ''; });
                            if (count($cleanRow) > 0) {
                                $extractedSettings = $cleanRow;
                                break;
                            }
                        }
                    }
                } catch (Exception $e) {}
            }
            if ($extractedSettings !== null) {
                $output['settings'] = $extractedSettings;
                $output['system_settings'] = $extractedSettings;
            }
        } catch (Exception $settErr) {}

        $loadResetEpoch = '0';
        if ($extractedSettings !== null && !empty($extractedSettings['reset_epoch'])) {
            $loadResetEpoch = (string)$extractedSettings['reset_epoch'];
        }

        echo json_encode([
            'success' => true,
            'data' => $output,
            'engine' => 'mysql',
            'reset_epoch' => $loadResetEpoch,
            'server_time_ms' => round(microtime(true) * 1000),
            'timestamp' => date('c')
        ], JSON_UNESCAPED_UNICODE);
        exit;
    } else {
        if (file_exists($dbFile)) {
            $rawTmp = @file_get_contents($dbFile);
            $parsed = @json_decode($rawTmp, true);
            $payload = isset($parsed['data']) && is_array($parsed['data']) ? $parsed['data'] : $parsed;
            echo json_encode([
                'success' => true,
                'data' => $payload,
                'engine' => 'file_fallback',
                'timestamp' => date('c')
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
        echo json_encode(['success' => true, 'data' => [], 'engine' => 'none'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ----------------------------------------------------
// SAVE / RESTORE FULL DATABASE (Transaction-Safe, Multi-Column)
// ----------------------------------------------------
if ($action === 'save' || $action === 'restore') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed. Use POST.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $rawInput = file_get_contents('php://input');
    if (empty($rawInput)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'بدنه درخواست خالی است.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $data = json_decode($rawInput, true);
    if (!is_array($data)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'فرمت داده نامعتبر است (JSON نیست).'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (isset($data['data']) && is_array($data['data'])) {
        $data = $data['data'];
    }

    if ($conn instanceof PDO) {
        ensureTablesExist($conn);

        try {
            $isForceReset = ($action === 'restore') || !empty($data['force_reset']) || !empty($data['reset_all']);

            // CRITICAL ANTI-DATA-LOSS GUARD:
            // If incoming save has 0 customers and 0 orders, but MySQL already contains customers:
            // NEVER let an uninitialized / cleared browser cache wipe the central MySQL database!
            $rawSett = null;
            if (isset($data['settings']) && (is_array($data['settings']) || is_object($data['settings']))) {
                $rawSett = $data['settings'];
            } elseif (isset($data['system_settings']) && (is_array($data['system_settings']) || is_object($data['system_settings']))) {
                $rawSett = $data['system_settings'];
            }
            if (is_array($rawSett) && isset($rawSett[0]) && (is_array($rawSett[0]) || is_object($rawSett[0]))) {
                $rawSett = $rawSett[0];
            }

            if (!$isForceReset) {
                $incomingCount = (isset($data['customers']) && is_array($data['customers'])) ? count($data['customers']) : 0;
                $incomingCount += (isset($data['orders']) && is_array($data['orders'])) ? count($data['orders']) : 0;
                if ($incomingCount === 0) {
                    $serverCount = 0;
                    try {
                        $st = $conn->query("SELECT COUNT(*) FROM `customers`");
                        if ($st) $serverCount = (int)$st->fetchColumn();
                    } catch (Exception $e) {}
                    if ($serverCount > 0) {
                        if ($rawSett !== null) {
                            try {
                                $sBiz = $rawSett['business_name'] ?? $rawSett['company_name'] ?? 'شرکت کبیر لوله دره شهر';
                                $sComp = $rawSett['company_name'] ?? $rawSett['business_name'] ?? 'شرکت کبیر لوله دره شهر';
                                $stmt2 = $conn->prepare("UPDATE `settings` SET `business_name` = :bn, `company_name` = :cn, `updated_at` = CURRENT_TIMESTAMP WHERE id = 1");
                                $stmt2->execute([':bn' => $sBiz, ':cn' => $sComp]);
                            } catch (Exception $e) {}
                        }
                        echo json_encode([
                            'success' => true,
                            'protected' => true,
                            'server_has_data' => true,
                            'message' => 'تنظیمات در جدول settings دیتابیس MySQL ذخیره گردید. جهت حفظ اطلاعات، داده‌های موجود سرور نگه داشته شد.'
                        ], JSON_UNESCAPED_UNICODE);
                        exit;
                    }
                }
            }

            $conn->beginTransaction();

            $mapping = [
                'customers' => ['tables' => ['customers']],
                'products' => ['tables' => ['products']],
                'orders' => ['tables' => ['orders']],
                'invoices' => ['tables' => ['invoices']],
                'transactions' => ['tables' => ['transactions']],
                'payments' => ['tables' => ['payments']],
                'cheques' => ['tables' => ['cheques']],
                'adjustments' => ['tables' => ['adjustments']],
                'drivers' => ['tables' => ['drivers']],
                'vehicles' => ['tables' => ['vehicles']],
                'deliveries' => ['tables' => ['deliveries']],
                'returns' => ['tables' => ['returns']],
                'materials' => ['tables' => ['materials']],
                'warehouses' => ['tables' => ['warehouses']],
                'movements' => ['tables' => ['movements']],
                'employees' => ['tables' => ['employees']],
                'employee_txs' => ['tables' => ['employee_txs'], 'alt' => 'employeeTxs'],
                'employee_leaves' => ['tables' => ['employee_leaves'], 'alt' => 'employeeLeaves'],
                'employment_periods' => ['tables' => ['employment_periods'], 'alt' => 'employmentPeriods'],
                'expenses' => ['tables' => ['expenses']],
                'production_logs' => ['tables' => ['production_logs'], 'alt' => 'productionLogs'],
                'users' => ['tables' => ['users']],
                'roles' => ['tables' => ['roles']],
                'permissions' => ['tables' => ['permissions']],
                'audit_logs' => ['tables' => ['audit_logs'], 'alt' => 'auditLogs'],
            ];

            foreach ($mapping as $dataKey => $info) {
                $rows = null;
                if (isset($data[$dataKey]) && is_array($data[$dataKey])) {
                    $rows = $data[$dataKey];
                } elseif (isset($info['alt']) && isset($data[$info['alt']]) && is_array($data[$info['alt']])) {
                    $rows = $data[$info['alt']];
                }

                if ($rows !== null) {
                    $targetTables = $info['tables'];

                    foreach ($targetTables as $tbl) {
                        if (empty($rows)) {
                            try { $conn->exec("DELETE FROM `$tbl`"); } catch (Exception $e) {}
                            continue;
                        }

                        // Collect valid IDs
                        $validIds = [];
                        foreach ($rows as $rowItem) {
                            if (isset($rowItem['id']) && (string)$rowItem['id'] !== '') {
                                $validIds[] = (string)$rowItem['id'];
                            } elseif (isset($rowItem['code']) && (string)$rowItem['code'] !== '') {
                                $validIds[] = (string)$rowItem['code'];
                            }
                        }

                        // Remove deleted records
                        if (!empty($validIds) && count($validIds) < 2000) {
                            try {
                                $inPlaceholders = implode(',', array_fill(0, count($validIds), '?'));
                                $delStmt = $conn->prepare("DELETE FROM `$tbl` WHERE `id` NOT IN ($inPlaceholders)");
                                $delStmt->execute($validIds);
                            } catch (Exception $delErr) {}
                        }

                        // Discover existing table columns
                        $existingCols = [];
                        try {
                            $colCheck = $conn->query("SHOW COLUMNS FROM `$tbl`");
                            if ($colCheck) {
                                while ($c = $colCheck->fetch()) {
                                    $existingCols[strtolower($c['Field'])] = true;
                                }
                            }
                        } catch (Exception $e) {}

                        // High-speed chunked batch insert (50 rows per SQL statement) - Pure relational columns
                        $chunks = array_chunk($rows, 50);
                        foreach ($chunks as $chunk) {
                            $colsMap = ['id' => true];
                            foreach ($chunk as $r) {
                                if (is_array($r)) {
                                    foreach ($r as $k => $v) {
                                        $lk = strtolower($k);
                                        if ($lk !== 'data_json' && isset($existingCols[$lk])) $colsMap[$lk] = true;
                                    }
                                }
                            }
                            $colNames = array_keys($colsMap);
                            $escapedCols = array_map(function($c) { return "`$c`"; }, $colNames);
                            $updatePairs = array_map(function($c) { return "`$c` = VALUES(`$c`)"; }, $colNames);

                            $rowPlaceholders = [];
                            $flatValues = [];
                            foreach ($chunk as $rowItem) {
                                $id = isset($rowItem['id']) ? (string)$rowItem['id'] : (isset($rowItem['code']) ? (string)$rowItem['code'] : uniqid('rec_'));
                                $itemQMarks = [];
                                foreach ($colNames as $col) {
                                    $itemQMarks[] = '?';
                                    if ($col === 'id') {
                                        $flatValues[] = $id;
                                    } else {
                                        $v = isset($rowItem[$col]) ? $rowItem[$col] : null;
                                        if (is_array($v) || is_object($v)) {
                                            $flatValues[] = json_encode($v, JSON_UNESCAPED_UNICODE);
                                        } elseif (is_bool($v)) {
                                            $flatValues[] = $v ? 1 : 0;
                                        } else {
                                            $flatValues[] = ($v !== null) ? (string)$v : null;
                                        }
                                    }
                                }
                                $rowPlaceholders[] = '(' . implode(',', $itemQMarks) . ')';
                            }

                            if (!empty($rowPlaceholders)) {
                                $batchSql = "INSERT INTO `$tbl` (" . implode(',', $escapedCols) . ") VALUES " . implode(',', $rowPlaceholders) . " ON DUPLICATE KEY UPDATE " . implode(',', $updatePairs);
                                try {
                                    $bStmt = $conn->prepare($batchSql);
                                    $bStmt->execute($flatValues);
                                } catch (Exception $bErr) {
                                    // Per-row fallback on error
                                    foreach ($chunk as $singleRow) {
                                        $sId = isset($singleRow['id']) ? (string)$singleRow['id'] : (isset($singleRow['code']) ? (string)$singleRow['code'] : uniqid('rec_'));
                                        try {
                                            $sCols = ['id'];
                                            $sVals = [$sId];
                                            foreach ($colNames as $c) {
                                                if ($c !== 'id' && isset($singleRow[$c])) {
                                                    $sCols[] = $c;
                                                    $valC = $singleRow[$c];
                                                    $sVals[] = (is_array($valC) || is_object($valC)) ? json_encode($valC, JSON_UNESCAPED_UNICODE) : (is_bool($valC) ? ($valC ? 1 : 0) : $valC);
                                                }
                                            }
                                            $fbSql = "INSERT INTO `$tbl` (" . implode(',', array_map(function($x) { return "`$x`"; }, $sCols)) . ") VALUES (" . implode(',', array_fill(0, count($sCols), '?')) . ") ON DUPLICATE KEY UPDATE `id` = VALUES(`id`)";
                                            $fb = $conn->prepare($fbSql);
                                            $fb->execute($sVals);
                                        } catch (Exception $e2) {}
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Save Settings in canonical settings table
            if ($rawSett !== null) {
                foreach (['logo_url', 'stamp_signature_url', 'login_cover_url', 'login_background_url'] as $imgKey) {
                    if (!empty($rawSett[$imgKey])) {
                        $rawSett[$imgKey] = extractAndSaveBase64Image($rawSett[$imgKey], str_replace('_url', '', $imgKey));
                    }
                }
                try {
                    $bizName = $rawSett['business_name'] ?? $rawSett['company_name'] ?? 'شرکت کبیر لوله دره شهر';
                    $compName = $rawSett['company_name'] ?? $rawSett['business_name'] ?? 'شرکت کبیر لوله دره شهر';
                    $stmt2 = $conn->prepare("REPLACE INTO `settings` 
                        (`id`, `business_name`, `company_name`, `brand_subtitle`, `logo_url`, `stamp_signature_url`, `login_cover_url`, `login_background_url`, `phone`, `fax`, `email`, `economic_code`, `national_id`, `registration_number`, `postal_code`, `address`)
                        VALUES (1, :bn, :cn, :bs, :lu, :su, :lc, :lb, :ph, :fx, :em, :ec, :ni, :rn, :pc, :ad)");
                    $stmt2->execute([
                        ':bn' => $bizName,
                        ':cn' => $compName,
                        ':bs' => $rawSett['brand_subtitle'] ?? 'تولیدکننده تخصصی انواع لوله و اتصالات پلی‌اتیلن استاندارد',
                        ':lu' => $rawSett['logo_url'] ?? '',
                        ':su' => $rawSett['stamp_signature_url'] ?? '',
                        ':lc' => $rawSett['login_cover_url'] ?? '',
                        ':lb' => $rawSett['login_background_url'] ?? '',
                        ':ph' => $rawSett['phone'] ?? '09188421867',
                        ':fx' => $rawSett['fax'] ?? '',
                        ':em' => $rawSett['email'] ?? '',
                        ':ec' => $rawSett['economic_code'] ?? '10300026420',
                        ':ni' => $rawSett['national_id'] ?? '10300026420',
                        ':rn' => $rawSett['registration_number'] ?? '276',
                        ':pc' => $rawSett['postal_code'] ?? '6961912345',
                        ':ad' => $rawSett['address'] ?? 'ایلام، دره شهر، شهرک صنعتی'
                    ]);
                } catch (Exception $e) {}
            }

            $conn->commit();
            @file_put_contents($dbFile, $rawInput);

            $newRevision = time();
            echo json_encode([
                'success' => true,
                'engine' => 'mysql',
                'revision' => $newRevision,
                'saved_at' => date('c'),
                'server_time_ms' => round(microtime(true) * 1000),
                'message' => 'کلیه اطلاعات با موفقیت در پایگاه‌داده MySQL هاست ذخیره گردید.'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        } catch (Exception $e) {
            if ($conn->inTransaction()) $conn->rollBack();
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => $e->getMessage(),
                'message' => 'خطا در ثبت اطلاعات در MySQL هاست: ' . $e->getMessage()
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    } else {
        @file_put_contents($dbFile, $rawInput);
        echo json_encode([
            'success' => true,
            'engine' => 'file_fallback',
            'revision' => time(),
            'message' => 'داده‌ها در فایل ذخیره شد (MySQL متصل نیست).'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}
