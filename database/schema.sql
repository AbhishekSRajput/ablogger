-- Table 1: admin_users
CREATE TABLE admin_users (
    admin_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,

    INDEX idx_username (username)
);

-- Table 2: clients
CREATE TABLE clients (
    client_id INT PRIMARY KEY AUTO_INCREMENT,
    client_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    email VARCHAR(255),
    contact_person VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,

    INDEX idx_client_name (client_name),
    INDEX idx_is_active (is_active)
);

-- Table 3: monitored_urls
CREATE TABLE monitored_urls (
    url_id INT PRIMARY KEY AUTO_INCREMENT,
    client_id INT NOT NULL,
    url VARCHAR(500) NOT NULL,
    url_label VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    has_active_test BOOLEAN DEFAULT TRUE,
    last_checked_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,

    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE,
    INDEX idx_client_id (client_id),
    INDEX idx_is_active (is_active),
    INDEX idx_has_active_test (has_active_test),
    UNIQUE KEY unique_client_url (client_id, url)
);

-- Table 4: browser_configurations
CREATE TABLE browser_configurations (
    config_id INT PRIMARY KEY AUTO_INCREMENT,
    browser_name VARCHAR(100) NOT NULL,
    browser_version VARCHAR(50),
    device_type ENUM('desktop', 'mobile', 'tablet') NOT NULL,
    operating_system VARCHAR(100),
    viewport_width INT,
    viewport_height INT,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,

    INDEX idx_is_active (is_active)
);

-- Table 5: monitoring_runs
CREATE TABLE monitoring_runs (
    run_id INT PRIMARY KEY AUTO_INCREMENT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    total_urls_checked INT DEFAULT 0,
    total_errors_found INT DEFAULT 0,
    total_checks_expected INT DEFAULT 0,
    current_url VARCHAR(500) NULL,
    current_browser VARCHAR(100) NULL,
    status ENUM('running', 'completed', 'failed') DEFAULT 'running',
    triggered_by ENUM('cron', 'manual') DEFAULT 'cron',

    INDEX idx_started_at (started_at),
    INDEX idx_status (status)
);

-- Table 6: url_checks
CREATE TABLE url_checks (
    check_id INT PRIMARY KEY AUTO_INCREMENT,
    run_id INT NOT NULL,
    url_id INT NOT NULL,
    config_id INT NOT NULL,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    page_load_time_ms INT,
    cookie_found BOOLEAN DEFAULT FALSE,
    error_detected BOOLEAN DEFAULT FALSE,
    check_status ENUM('success', 'timeout', 'error', 'unreachable') DEFAULT 'success',
    error_message TEXT,

    FOREIGN KEY (run_id) REFERENCES monitoring_runs(run_id) ON DELETE CASCADE,
    FOREIGN KEY (url_id) REFERENCES monitored_urls(url_id) ON DELETE CASCADE,
    FOREIGN KEY (config_id) REFERENCES browser_configurations(config_id),

    INDEX idx_run_id (run_id),
    INDEX idx_url_id (url_id),
    INDEX idx_checked_at (checked_at),
    INDEX idx_error_detected (error_detected)
);

-- Table 7: detected_failures
CREATE TABLE detected_failures (
    failure_id INT PRIMARY KEY AUTO_INCREMENT,
    check_id INT NOT NULL,
    url_id INT NOT NULL,
    client_id INT NOT NULL,
    test_id VARCHAR(255) NOT NULL,
    variant VARCHAR(255) NOT NULL,
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    browser_from_cookie VARCHAR(100),
    timestamp_from_cookie TIMESTAMP,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolution_status ENUM('new', 'acknowledged', 'investigating', 'resolved', 'ignored') DEFAULT 'new',
    resolved_at TIMESTAMP NULL,
    resolved_by INT NULL,
    resolution_notes TEXT,

    FOREIGN KEY (check_id) REFERENCES url_checks(check_id) ON DELETE CASCADE,
    FOREIGN KEY (url_id) REFERENCES monitored_urls(url_id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES admin_users(admin_id),

    INDEX idx_client_id (client_id),
    INDEX idx_test_id (test_id),
    INDEX idx_error_type (error_type),
    INDEX idx_resolution_status (resolution_status),
    INDEX idx_detected_at (detected_at),
    INDEX idx_composite (client_id, resolution_status, detected_at)
);

-- Table 8: failure_screenshots
CREATE TABLE failure_screenshots (
    screenshot_id INT PRIMARY KEY AUTO_INCREMENT,
    failure_id INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (failure_id) REFERENCES detected_failures(failure_id) ON DELETE CASCADE,
    INDEX idx_failure_id (failure_id)
);
