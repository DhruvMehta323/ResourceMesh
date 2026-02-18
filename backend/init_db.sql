-- ResourceMesh Database Schema
-- Run this file to initialize the database

CREATE DATABASE IF NOT EXISTS resourcemesh;
USE resourcemesh;

-- Asset Categories
CREATE TABLE IF NOT EXISTS asset_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50) DEFAULT 'box',
    color VARCHAR(20) DEFAULT '#6366f1',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teams / Departments
CREATE TABLE IF NOT EXISTS teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    lead_name VARCHAR(255),
    lead_email VARCHAR(255),
    headcount INT DEFAULT 0,
    budget DECIMAL(15,2) DEFAULT 0.00,
    location VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Assets (GPUs, Lab Equipment, Licenses, Meeting Rooms, Test Environments)
CREATE TABLE IF NOT EXISTS assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    asset_tag VARCHAR(100) UNIQUE,
    category_id INT,
    status ENUM('available', 'in_use', 'maintenance', 'retired') DEFAULT 'available',
    location VARCHAR(255),
    description TEXT,
    specifications JSON,
    cost_per_hour DECIMAL(10,4) DEFAULT 0.0000,
    cost_per_day DECIMAL(10,2) DEFAULT 0.00,
    purchase_date DATE,
    purchase_cost DECIMAL(15,2),
    current_team_id INT,
    utilization_rate DECIMAL(5,2) DEFAULT 0.00,
    total_hours_used INT DEFAULT 0,
    last_used_at TIMESTAMP NULL,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES asset_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (current_team_id) REFERENCES teams(id) ON DELETE SET NULL
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    team_id INT,
    status ENUM('planning', 'active', 'on_hold', 'completed', 'cancelled') DEFAULT 'planning',
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

-- Project Requirements (which asset categories/capabilities a project needs)
CREATE TABLE IF NOT EXISTS project_requirements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    category_id INT NOT NULL,
    quantity_needed INT DEFAULT 1,
    min_spec JSON,
    priority ENUM('required', 'preferred', 'optional') DEFAULT 'required',
    notes TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES asset_categories(id) ON DELETE CASCADE
);

-- Asset Allocations (which team/project is using which asset)
CREATE TABLE IF NOT EXISTS asset_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id INT NOT NULL,
    team_id INT,
    project_id INT,
    allocated_by VARCHAR(255),
    allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP NULL,
    planned_release TIMESTAMP NULL,
    allocation_reason TEXT,
    actual_hours_used INT DEFAULT 0,
    status ENUM('active', 'released', 'overdue') DEFAULT 'active',
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- Usage Logs (for analytics / sliding window)
CREATE TABLE IF NOT EXISTS usage_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id INT NOT NULL,
    team_id INT,
    project_id INT,
    action ENUM('allocated', 'released', 'maintenance_start', 'maintenance_end', 'status_change') NOT NULL,
    hours_used DECIMAL(6,2) DEFAULT 0,
    notes TEXT,
    performed_by VARCHAR(255),
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- Asset Capability Tags (for matching engine)
CREATE TABLE IF NOT EXISTS asset_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id INT NOT NULL,
    tag VARCHAR(100) NOT NULL,
    value VARCHAR(255),
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    UNIQUE KEY unique_asset_tag (asset_id, tag)
);

-- Maintenance Schedules
CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id INT NOT NULL,
    scheduled_at TIMESTAMP NOT NULL,
    duration_hours INT DEFAULT 1,
    maintenance_type VARCHAR(100),
    description TEXT,
    status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_category ON assets(category_id);
CREATE INDEX idx_assets_team ON assets(current_team_id);
CREATE INDEX idx_allocations_asset ON asset_allocations(asset_id);
CREATE INDEX idx_allocations_status ON asset_allocations(status);
CREATE INDEX idx_usage_logs_asset ON usage_logs(asset_id);
CREATE INDEX idx_usage_logs_logged_at ON usage_logs(logged_at);

-- -----------------------------------------------
-- SEED DATA
-- -----------------------------------------------

-- Categories
INSERT INTO asset_categories (name, icon, color, description) VALUES
('GPU Cluster', 'cpu', '#8b5cf6', 'High-performance GPU units for ML/AI workloads'),
('Lab Equipment', 'flask', '#f59e0b', 'Scientific and testing lab instruments'),
('Software License', 'key', '#10b981', 'Enterprise software licenses and subscriptions'),
('Meeting Room', 'users', '#3b82f6', 'Conference and collaboration spaces'),
('Test Environment', 'server', '#ef4444', 'QA and staging server environments'),
('Storage Array', 'database', '#06b6d4', 'High-capacity storage systems'),
('Network Equipment', 'wifi', '#f97316', 'Switches, routers, and network infrastructure');

-- Teams
INSERT INTO teams (name, department, lead_name, lead_email, headcount, budget, location) VALUES
('AI Research Lab', 'R&D', 'Dr. Sarah Chen', 'sarah.chen@company.com', 12, 500000.00, 'Building A, Floor 3'),
('Platform Engineering', 'Engineering', 'Marcus Williams', 'marcus.w@company.com', 18, 800000.00, 'Building B, Floor 2'),
('Data Science', 'Analytics', 'Priya Patel', 'priya.p@company.com', 8, 350000.00, 'Building A, Floor 1'),
('QA & Testing', 'Engineering', 'James Okafor', 'james.o@company.com', 10, 250000.00, 'Building C, Floor 1'),
('DevOps', 'Infrastructure', 'Elena Rodriguez', 'elena.r@company.com', 6, 400000.00, 'Building B, Floor 3'),
('Product Analytics', 'Product', 'Noah Kim', 'noah.k@company.com', 5, 200000.00, 'Building A, Floor 2');

-- Assets - GPUs
INSERT INTO assets (name, asset_tag, category_id, status, location, description, specifications, cost_per_hour, cost_per_day, purchase_cost, current_team_id, utilization_rate, total_hours_used) VALUES
('NVIDIA A100 Cluster #1', 'GPU-001', 1, 'in_use', 'Data Center - Rack A3', '8x NVIDIA A100 80GB SXM cluster', '{"gpus": 8, "vram_per_gpu": "80GB", "cuda_cores": 54272, "memory_bandwidth": "2TB/s", "interconnect": "NVLink"}', 12.50, 300.00, 850000.00, 1, 87.5, 2100),
('NVIDIA A100 Cluster #2', 'GPU-002', 1, 'available', 'Data Center - Rack A4', '8x NVIDIA A100 80GB SXM cluster', '{"gpus": 8, "vram_per_gpu": "80GB", "cuda_cores": 54272, "memory_bandwidth": "2TB/s", "interconnect": "NVLink"}', 12.50, 300.00, 850000.00, NULL, 12.0, 450),
('NVIDIA V100 Node', 'GPU-003', 1, 'maintenance', 'Data Center - Rack B1', '4x NVIDIA V100 32GB', '{"gpus": 4, "vram_per_gpu": "32GB", "cuda_cores": 20480}', 6.00, 144.00, 320000.00, NULL, 0.0, 1800),
('RTX 4090 Workstation', 'GPU-004', 1, 'available', 'Lab 2B', 'Single RTX 4090 workstation for prototyping', '{"gpus": 1, "vram_per_gpu": "24GB", "cuda_cores": 16384}', 1.50, 36.00, 8500.00, NULL, 22.0, 320),
('RTX 4090 Workstation #2', 'GPU-005', 1, 'in_use', 'Lab 2B', 'Single RTX 4090 workstation for prototyping', '{"gpus": 1, "vram_per_gpu": "24GB", "cuda_cores": 16384}', 1.50, 36.00, 8500.00, 3, 65.0, 580);

-- Assets - Lab Equipment
INSERT INTO assets (name, asset_tag, category_id, status, location, description, specifications, cost_per_hour, cost_per_day, purchase_cost, current_team_id, utilization_rate, total_hours_used) VALUES
('Oscilloscope Pro 4CH', 'LAB-001', 2, 'available', 'Lab 1A - Bench 3', '4-Channel 1GHz Oscilloscope', '{"channels": 4, "bandwidth": "1GHz", "sample_rate": "5GSa/s", "memory": "500Mpts"}', 0.50, 12.00, 15000.00, NULL, 18.0, 240),
('Spectrum Analyzer', 'LAB-002', 2, 'in_use', 'Lab 1A - Bench 5', 'RF Spectrum Analyzer 9kHz-6GHz', '{"freq_range": "9kHz-6GHz", "dynamic_range": "165dB", "noise_floor": "-165dBm/Hz"}', 0.75, 18.00, 28000.00, 4, 72.0, 960),
('3D Printer (Industrial)', 'LAB-003', 2, 'available', 'Lab 3C', 'Industrial FDM 3D Printer', '{"build_volume": "300x300x400mm", "resolution": "50-400 microns", "materials": ["PLA","ABS","PETG","Nylon"]}', 2.00, 48.00, 22000.00, NULL, 31.0, 415),
('Thermal Camera', 'LAB-004', 2, 'in_use', 'Lab 1B', 'FLIR Thermal Imaging Camera', '{"resolution": "640x480", "temp_range": "-40 to 2000C", "accuracy": "2C"}', 0.25, 6.00, 8500.00, 4, 55.0, 730);

-- Assets - Software Licenses
INSERT INTO assets (name, asset_tag, category_id, status, location, description, specifications, cost_per_hour, cost_per_day, purchase_cost, current_team_id, utilization_rate, total_hours_used) VALUES
('MATLAB Enterprise (50 seats)', 'LIC-001', 3, 'in_use', 'Cloud/Virtual', 'MATLAB + Simulink 50-seat enterprise license', '{"seats": 50, "seats_used": 38, "toolboxes": ["Signal Processing","Image Processing","Statistics","Deep Learning"], "expiry": "2025-12-31"}', 0.00, 450.00, 125000.00, 3, 76.0, 8500),
('Adobe Creative Suite (20 seats)', 'LIC-002', 3, 'available', 'Cloud/Virtual', 'Adobe CC All Apps 20-seat license', '{"seats": 20, "seats_used": 8, "apps": ["Photoshop","Illustrator","Premiere","After Effects"]}', 0.00, 120.00, 28000.00, NULL, 40.0, 2100),
('Ansys Simulation Suite', 'LIC-003', 3, 'available', 'Cloud/Virtual', 'Ansys Engineering Simulation Platform', '{"seats": 5, "seats_used": 1, "modules": ["Mechanical","Fluent","HFSS","Discovery"]}', 0.00, 800.00, 180000.00, NULL, 20.0, 890),
('GitHub Enterprise (500 seats)', 'LIC-004', 3, 'in_use', 'Cloud/Virtual', 'GitHub Enterprise Server', '{"seats": 500, "seats_used": 423, "features": ["Actions","Packages","Advanced Security"]}', 0.00, 2100.00, 420000.00, 2, 84.6, 0),
('Databricks Premium (10 clusters)', 'LIC-005', 3, 'in_use', 'Cloud/Virtual', 'Databricks Premium workspace', '{"clusters": 10, "clusters_used": 7, "dbu_per_hour": 2.5}', 8.00, 192.00, 95000.00, 3, 70.0, 3200);

-- Assets - Meeting Rooms
INSERT INTO assets (name, asset_tag, category_id, status, location, description, specifications, cost_per_hour, cost_per_day, purchase_cost, current_team_id, utilization_rate, total_hours_used) VALUES
('Innovation Hub (Board Room)', 'ROOM-001', 4, 'available', 'Building A, Floor 5', 'Executive boardroom with AV system', '{"capacity": 20, "av_system": true, "video_conf": "Cisco Webex", "whiteboard": "Smart Board 85inch", "catering": true}', 50.00, 400.00, 75000.00, NULL, 45.0, 600),
('Collaboration Pod A', 'ROOM-002', 4, 'in_use', 'Building B, Floor 1', 'Open collaboration space', '{"capacity": 8, "av_system": true, "video_conf": "Zoom Rooms", "whiteboard": true}', 15.00, 120.00, 25000.00, 2, 68.0, 910),
('War Room - Engineering', 'ROOM-003', 4, 'available', 'Building B, Floor 2', 'Dedicated engineering war room', '{"capacity": 12, "monitors": 6, "av_system": true, "standing_desks": 4}', 20.00, 160.00, 35000.00, NULL, 30.0, 400),
('Training Room 101', 'ROOM-004', 4, 'available', 'Building C, Floor 1', 'Large training and workshop room', '{"capacity": 40, "av_system": true, "projectors": 2, "lab_stations": 20}', 35.00, 280.00, 55000.00, NULL, 25.0, 330);

-- Assets - Test Environments
INSERT INTO assets (name, asset_tag, category_id, status, location, description, specifications, cost_per_hour, cost_per_day, purchase_cost, current_team_id, utilization_rate, total_hours_used) VALUES
('Staging Cluster Alpha', 'ENV-001', 5, 'in_use', 'AWS us-east-1', 'Kubernetes staging cluster mirroring production', '{"nodes": 10, "cpu_per_node": 32, "ram_per_node": "128GB", "storage": "10TB NVMe", "k8s_version": "1.29"}', 8.50, 204.00, 0.00, 4, 78.0, 2800),
('QA Environment Beta', 'ENV-002', 5, 'available', 'AWS us-east-1', 'Isolated QA testing environment', '{"nodes": 5, "cpu_per_node": 16, "ram_per_node": "64GB", "storage": "5TB SSD"}', 4.00, 96.00, 0.00, NULL, 40.0, 1200),
('Load Test Farm', 'ENV-003', 5, 'available', 'On-Premise + AWS', 'Distributed load testing infrastructure', '{"agents": 50, "max_concurrent_users": 100000, "tools": ["JMeter","Locust","k6"]}', 12.00, 288.00, 45000.00, NULL, 15.0, 420),
('Security Test Lab', 'ENV-004', 5, 'maintenance', 'Building C - Isolated', 'Air-gapped security testing environment', '{"nodes": 8, "isolated": true, "tools": ["Kali Linux","Metasploit","Burp Suite Pro"]}', 5.00, 120.00, 60000.00, NULL, 0.0, 980),
('Dev Integration Sandbox', 'ENV-005', 5, 'in_use', 'AWS us-west-2', 'Shared developer integration sandbox', '{"nodes": 3, "cpu_per_node": 8, "ram_per_node": "32GB", "max_teams": 5}', 2.00, 48.00, 0.00, 2, 88.0, 4200);

-- Storage Arrays
INSERT INTO assets (name, asset_tag, category_id, status, location, description, specifications, cost_per_hour, cost_per_day, purchase_cost, current_team_id, utilization_rate, total_hours_used) VALUES
('NetApp AFF A800', 'STO-001', 6, 'in_use', 'Data Center - Row 5', 'All-Flash NVMe storage array', '{"capacity": "2PB", "used": "1.4PB", "iops": "20M", "latency_us": 150, "ports": "32x 32Gb FC"}', 0.00, 1200.00, 980000.00, 2, 70.0, 0),
('Dell PowerStore 3200T', 'STO-002', 6, 'available', 'Data Center - Row 6', 'Hybrid flash storage', '{"capacity": "500TB", "used": "120TB", "iops": "4M"}', 0.00, 400.00, 320000.00, NULL, 24.0, 0);

-- Projects
INSERT INTO projects (name, description, team_id, status, priority, start_date, end_date, budget) VALUES
('LLM Fine-tuning Pipeline', 'Build automated pipeline for fine-tuning large language models on proprietary data', 1, 'active', 'critical', '2024-01-15', '2024-06-30', 250000.00),
('Platform Reliability Initiative', 'Improve platform uptime to 99.99% through infrastructure upgrades', 2, 'active', 'high', '2024-02-01', '2024-08-31', 180000.00),
('Customer Analytics Dashboard', 'Real-time analytics dashboard for customer behavior patterns', 3, 'active', 'medium', '2024-03-01', '2024-07-31', 120000.00),
('Security Compliance Audit', 'Annual security penetration testing and compliance validation', 4, 'planning', 'high', '2024-04-01', '2024-05-31', 75000.00),
('ML Model Validation Suite', 'Automated validation framework for ML model deployments', 3, 'active', 'medium', '2024-02-15', '2024-07-15', 95000.00);

-- Active Allocations
INSERT INTO asset_allocations (asset_id, team_id, project_id, allocated_by, allocation_reason, status) VALUES
(1, 1, 1, 'sarah.chen@company.com', 'LLM fine-tuning requires A100 cluster for distributed training', 'active'),
(12, 2, 2, 'marcus.w@company.com', 'GitHub Enterprise for platform team development', 'active'),
(13, 3, 3, 'priya.p@company.com', 'Databricks for customer analytics pipeline', 'active'),
(17, 4, NULL, 'james.o@company.com', 'QA team primary testing environment', 'active'),
(21, 2, NULL, 'elena.r@company.com', 'Dev sandbox for integration testing', 'active'),
(7, 4, NULL, 'james.o@company.com', 'Spectrum analyzer for RF testing', 'active'),
(9, 4, NULL, 'james.o@company.com', 'Thermal imaging for hardware diagnostics', 'active'),
(5, 3, 5, 'priya.p@company.com', 'ML prototyping workstation', 'active'),
(15, 2, 2, 'marcus.w@company.com', 'Collaboration space for platform team', 'active');

-- Usage logs
INSERT INTO usage_logs (asset_id, team_id, project_id, action, hours_used, notes, performed_by) VALUES
(1, 1, 1, 'allocated', 0, 'Initial allocation for LLM training', 'sarah.chen@company.com'),
(2, NULL, NULL, 'released', 168, 'Completed previous training run', 'system'),
(3, NULL, NULL, 'maintenance_start', 0, 'Scheduled quarterly maintenance', 'ops-team'),
(13, 3, 3, 'allocated', 0, 'Analytics pipeline development', 'priya.p@company.com'),
(17, 4, NULL, 'allocated', 0, 'QA environment setup', 'james.o@company.com');

-- Maintenance Schedules
INSERT INTO maintenance_schedules (asset_id, scheduled_at, duration_hours, maintenance_type, description, status) VALUES
(3, '2024-04-15 08:00:00', 8, 'Preventive', 'Quarterly GPU cleaning and thermal paste replacement', 'scheduled'),
(20, '2024-04-20 10:00:00', 4, 'Update', 'Security patch and OS update', 'scheduled');