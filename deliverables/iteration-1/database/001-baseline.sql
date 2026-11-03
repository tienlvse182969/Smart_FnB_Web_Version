-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BranchStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "RestaurantChainStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "BranchAreaType" AS ENUM ('DINING', 'KITCHEN', 'BAR', 'CASHIER', 'PICKUP');

-- CreateEnum
CREATE TYPE "BranchAreaStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "TableSessionStatus" AS ENUM ('OPEN', 'SERVING', 'PAID', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('DINE_IN', 'TAKEAWAY', 'DELIVERY', 'COUNTER_PICKUP');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('CASH', 'PAYOS', 'MANUAL');

-- CreateEnum
CREATE TYPE "WebhookProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "PrintDocumentType" AS ENUM ('RECEIPT', 'QUEUE_TICKET');

-- CreateEnum
CREATE TYPE "PosStationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PrinterConnectionType" AS ENUM ('NONE', 'WIFI', 'BLUETOOTH');

-- CreateEnum
CREATE TYPE "DisplayDeviceType" AS ENUM ('CUSTOMER_DISPLAY', 'CALLING_DISPLAY');

-- CreateEnum
CREATE TYPE "PrintJobStatus" AS ENUM ('PENDING', 'PRINTED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReceiptDocumentStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RefundMethod" AS ENUM ('CASH', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "RefundSource" AS ENUM ('MANAGER_CANCELLATION', 'LATE_PAYMENT');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'SUBMITTED', 'CONFIRMED', 'REQUIRES_ATTENTION', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderPaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "OrderItemStatus" AS ENUM ('PENDING', 'QUEUED', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'DELIVERED', 'OUT_OF_STOCK', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ServingTaskStatus" AS ENUM ('WAITING', 'CLAIMED', 'SERVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkSessionStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShiftAssignmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('ISSUED', 'CANCELLED', 'REPLACED');

-- CreateEnum
CREATE TYPE "ReservationSource" AS ENUM ('PHONE', 'WALK_IN', 'WEB');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'E_WALLET', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'EXPIRED', 'REQUIRES_ATTENTION', 'AMOUNT_MISMATCH', 'SUCCESS', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('FIXED_AMOUNT', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "RegistrationApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BusinessSubscriptionStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PayosChannelStatus" AS ENUM ('LINKED', 'ERROR');

-- CreateEnum
CREATE TYPE "SubscriptionEventType" AS ENUM ('CREATED', 'RENEWED', 'UPGRADED', 'DOWNGRADED', 'SUSPENDED', 'REACTIVATED');

-- CreateEnum
CREATE TYPE "EmailOutboxStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "SubscriptionCheckoutStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'NEEDS_REVIEW');

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "password_hash" VARCHAR(255) NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "email_verified_at" TIMESTAMPTZ(6),
    "last_login_at" TIMESTAMPTZ(6),
    "staff_invitation_state" VARCHAR(20),
    "role_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_hash" VARCHAR(64) NOT NULL,
    "user_agent" VARCHAR(500),
    "ip_address" VARCHAR(64),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "last_used_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_chains" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "logo_url" VARCHAR(500),
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "website" VARCHAR(500),
    "tax_code" VARCHAR(50),
    "headquarters_address" VARCHAR(500),
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'VND',
    "status" "RestaurantChainStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "restaurant_chains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "display_posters" (
    "id" UUID NOT NULL,
    "chain_id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "duration_seconds" INTEGER NOT NULL DEFAULT 8,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "display_posters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payos_channels" (
    "id" UUID NOT NULL,
    "chain_id" UUID NOT NULL,
    "client_id_cipher" TEXT NOT NULL,
    "api_key_cipher" TEXT NOT NULL,
    "checksum_key_cipher" TEXT NOT NULL,
    "client_id_last4" VARCHAR(4),
    "api_key_last4" VARCHAR(4),
    "status" "PayosChannelStatus" NOT NULL DEFAULT 'LINKED',
    "last_error" VARCHAR(1000),
    "last_verified_at" TIMESTAMPTZ(6),
    "webhook_code" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payos_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payos_channel_audit_logs" (
    "id" UUID NOT NULL,
    "chain_id" UUID NOT NULL,
    "channel_id" UUID,
    "actor_user_id" UUID NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "error" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payos_channel_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL,
    "chain_id" UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001'::uuid,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "address_line_1" VARCHAR(255) NOT NULL,
    "address_line_2" VARCHAR(255),
    "ward" VARCHAR(100),
    "district" VARCHAR(100),
    "city" VARCHAR(100) NOT NULL,
    "country" VARCHAR(100) NOT NULL DEFAULT 'Vietnam',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "status" "BranchStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_operating_hours" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "open_time" VARCHAR(5),
    "close_time" VARCHAR(5),
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "branch_operating_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_special_hours" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "open_time" VARCHAR(5),
    "close_time" VARCHAR(5),
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "note" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "branch_special_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_areas" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" "BranchAreaType" NOT NULL,
    "floor" INTEGER NOT NULL DEFAULT 1,
    "status" "BranchAreaStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "branch_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "employee_code" VARCHAR(50) NOT NULL,
    "user_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "date_of_birth" DATE,
    "job_title" VARCHAR(100),
    "hire_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owners" (
    "id" UUID NOT NULL,
    "owner_code" VARCHAR(50) NOT NULL,
    "user_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "date_of_birth" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_chain_assignments" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "chain_id" UUID NOT NULL,
    "assigned_by_id" UUID,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "owner_chain_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_applications" (
    "id" UUID NOT NULL,
    "application_code" VARCHAR(50) NOT NULL,
    "business_name" VARCHAR(150) NOT NULL,
    "tax_code" VARCHAR(50),
    "representative_name" VARCHAR(150) NOT NULL,
    "representative_email" VARCHAR(255) NOT NULL,
    "representative_phone" VARCHAR(20) NOT NULL,
    "headquarters_address" VARCHAR(500),
    "requested_plan_id" UUID,
    "status" "RegistrationApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" VARCHAR(1000),
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "approved_chain_id" UUID,
    "owner_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "registration_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_plans" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "monthly_price" DECIMAL(14,2) NOT NULL,
    "max_branches" INTEGER NOT NULL,
    "max_accounts" INTEGER NOT NULL,
    "max_tables" INTEGER NOT NULL,
    "branding_enabled" BOOLEAN NOT NULL DEFAULT false,
    "multi_branch_comparison_enabled" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "service_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_subscriptions" (
    "id" UUID NOT NULL,
    "chain_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "BusinessSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "monthly_price" DECIMAL(14,2) NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "suspended_at" TIMESTAMPTZ(6),
    "trial_started_at" TIMESTAMPTZ(6),
    "trial_ends_at" TIMESTAMPTZ(6),
    "trial_converted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "business_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_checkouts" (
    "id" UUID NOT NULL,
    "chain_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "provider_order_code" VARCHAR(30) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "SubscriptionCheckoutStatus" NOT NULL DEFAULT 'PENDING',
    "checkout_url" TEXT,
    "payment_link_id" VARCHAR(100),
    "paid_at" TIMESTAMPTZ(6),
    "review_reason" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscription_checkouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_subscription_events" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "type" "SubscriptionEventType" NOT NULL,
    "from_plan_id" UUID,
    "to_plan_id" UUID,
    "changed_by_id" UUID,
    "effective_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" VARCHAR(1000),

    CONSTRAINT "business_subscription_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_branding" (
    "id" UUID NOT NULL,
    "chain_id" UUID NOT NULL,
    "display_name" VARCHAR(150) NOT NULL,
    "logo_url" VARCHAR(500),
    "primary_color" VARCHAR(7) NOT NULL DEFAULT '#0F172A',
    "secondary_color" VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
    "accent_color" VARCHAR(7) NOT NULL DEFAULT '#22C55E',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "business_branding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_setup_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_setup_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_setup_attempts" (
    "subject_hash" VARCHAR(64) NOT NULL,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "last_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "password_setup_attempts_pkey" PRIMARY KEY ("subject_hash")
);

-- CreateTable
CREATE TABLE "email_outbox" (
    "id" UUID NOT NULL,
    "dedupe_key" VARCHAR(150),
    "recipient" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "template" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "EmailOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" VARCHAR(1000),
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "email_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_tables" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100),
    "area" VARCHAR(100),
    "floor" INTEGER NOT NULL DEFAULT 1,
    "capacity" INTEGER NOT NULL,
    "position_x" DECIMAL(10,2),
    "position_y" DECIMAL(10,2),
    "width" DECIMAL(10,2),
    "height" DECIMAL(10,2),
    "status" "TableStatus" NOT NULL DEFAULT 'AVAILABLE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "restaurant_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_adjacencies" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "adjacent_table_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "table_adjacencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_sessions" (
    "id" UUID NOT NULL,
    "session_code" VARCHAR(50) NOT NULL,
    "branch_id" UUID NOT NULL,
    "reservation_id" UUID,
    "opened_by_waiter_id" UUID NOT NULL,
    "closed_by_waiter_id" UUID,
    "guest_count" INTEGER NOT NULL,
    "status" "TableSessionStatus" NOT NULL DEFAULT 'OPEN',
    "payment_status" "OrderPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "guest_name" VARCHAR(150),
    "guest_phone" VARCHAR(20),
    "note" VARCHAR(500),
    "opened_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "cancellation_reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "table_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_session_tables" (
    "table_session_id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMPTZ(6),

    CONSTRAINT "table_session_tables_pkey" PRIMARY KEY ("table_session_id","table_id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" UUID NOT NULL,
    "reservation_code" VARCHAR(50) NOT NULL,
    "branch_id" UUID NOT NULL,
    "table_id" UUID,
    "confirmed_by_id" UUID,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "guest_name" VARCHAR(150) NOT NULL,
    "guest_phone" VARCHAR(20) NOT NULL,
    "guest_email" VARCHAR(255),
    "party_size" INTEGER NOT NULL,
    "reservation_at" TIMESTAMPTZ(6) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 120,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "source" "ReservationSource" NOT NULL DEFAULT 'PHONE',
    "note" TEXT,
    "confirmed_at" TIMESTAMPTZ(6),
    "checked_in_at" TIMESTAMPTZ(6),
    "no_show_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "cancellation_reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_tables" (
    "reservation_id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "allocated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMPTZ(6),

    CONSTRAINT "reservation_tables_pkey" PRIMARY KEY ("reservation_id","table_id")
);

-- CreateTable
CREATE TABLE "menu_categories" (
    "id" UUID NOT NULL,
    "chain_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(500),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "sku" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(14,2) NOT NULL,
    "cost_price" DECIMAL(14,2),
    "image_url" VARCHAR(500),
    "preparation_minutes" INTEGER,
    "allow_batching" BOOLEAN NOT NULL DEFAULT true,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_option_groups" (
    "id" UUID NOT NULL,
    "chain_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "min_selections" INTEGER NOT NULL DEFAULT 0,
    "max_selections" INTEGER NOT NULL DEFAULT 1,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "menu_option_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_options" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "price_delta" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "menu_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_option_groups" (
    "menu_item_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "menu_item_option_groups_pkey" PRIMARY KEY ("menu_item_id","group_id")
);

-- CreateTable
CREATE TABLE "branch_menu_options" (
    "branch_id" UUID NOT NULL,
    "option_id" UUID NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "updated_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "branch_menu_options_pkey" PRIMARY KEY ("branch_id","option_id")
);

-- CreateTable
CREATE TABLE "branch_menu_items" (
    "branch_id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "remaining_portions" INTEGER,
    "updated_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "branch_menu_items_pkey" PRIMARY KEY ("branch_id","menu_item_id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "order_code" VARCHAR(50) NOT NULL,
    "branch_id" UUID NOT NULL,
    "table_id" UUID,
    "reservation_id" UUID,
    "waiter_id" UUID,
    "table_session_id" UUID,
    "created_by_waiter_id" UUID,
    "created_by_cashier_id" UUID,
    "delivered_by_id" UUID,
    "cancelled_by_id" UUID,
    "voucher_id" UUID,
    "type" "OrderType" NOT NULL DEFAULT 'DINE_IN',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "payment_status" "OrderPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "service_charge" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "placed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "paid_at" TIMESTAMPTZ(6),
    "ready_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "business_date" DATE,
    "call_number" INTEGER,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancellation_reason" VARCHAR(500),
    "attention_at" TIMESTAMPTZ(6),
    "attention_reason" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_daily_sequences" (
    "branch_id" UUID NOT NULL,
    "business_date" DATE NOT NULL,
    "next_number" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "branch_daily_sequences_pkey" PRIMARY KEY ("branch_id","business_date")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "item_name" VARCHAR(150) NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_price" DECIMAL(14,2) NOT NULL,
    "special_instructions" VARCHAR(500),
    "selected_options" JSONB,
    "status" "OrderItemStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "queued_at" TIMESTAMPTZ(6),
    "ready_at" TIMESTAMPTZ(6),
    "served_at" TIMESTAMPTZ(6),
    "served_by_waiter_id" UUID,
    "unavailable_at" TIMESTAMPTZ(6),
    "unavailable_by_id" UUID,
    "started_by_kitchen_id" UUID,
    "completed_by_kitchen_id" UUID,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancelled_by_id" UUID,
    "cancellation_reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_units" (
    "id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "OrderItemStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "started_by_id" UUID,
    "completed_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "order_item_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "payment_code" VARCHAR(50) NOT NULL,
    "order_id" UUID,
    "table_session_id" UUID,
    "processed_by_id" UUID,
    "station_id" UUID,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(14,2) NOT NULL,
    "tendered_amount" DECIMAL(14,2),
    "change_amount" DECIMAL(14,2),
    "transaction_ref" VARCHAR(255),
    "provider" "PaymentProvider" NOT NULL DEFAULT 'MANUAL',
    "provider_order_code" VARCHAR(100),
    "provider_transaction_id" VARCHAR(255),
    "checkout_url" VARCHAR(1000),
    "qr_code" TEXT,
    "expires_at" TIMESTAMPTZ(6),
    "confirmed_at" TIMESTAMPTZ(6),
    "paid_at" TIMESTAMPTZ(6),
    "failure_reason" VARCHAR(500),
    "confirmation_reason" VARCHAR(500),
    "received_amount" DECIMAL(14,2),
    "note" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "method" "RefundMethod" NOT NULL,
    "source" "RefundSource" NOT NULL DEFAULT 'MANAGER_CANCELLATION',
    "source_reference" VARCHAR(255),
    "reason" VARCHAR(500) NOT NULL,
    "requested_by_user_id" UUID,
    "requested_by_employee_id" UUID,
    "requested_by_role" VARCHAR(50) NOT NULL,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_by_user_id" UUID,
    "completed_by_employee_id" UUID,
    "completed_by_role" VARCHAR(50),
    "completed_at" TIMESTAMPTZ(6),
    "cancellation_date" DATE NOT NULL,
    "note" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_items" (
    "id" UUID NOT NULL,
    "refund_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "refund_amount" DECIMAL(14,2) NOT NULL,
    "is_wastage" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "refund_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_audit_logs" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "actor_employee_id" UUID,
    "actor_role" VARCHAR(50) NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "reason" VARCHAR(500),
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branch_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_webhook_events" (
    "id" UUID NOT NULL,
    "payment_id" UUID,
    "provider" "PaymentProvider" NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "provider_order_code" VARCHAR(100),
    "signature_valid" BOOLEAN NOT NULL DEFAULT false,
    "status" "WebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB NOT NULL,
    "error_message" VARCHAR(1000),
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "chain_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "table_session_id" UUID,
    "order_id" UUID,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'VND',
    "subtotal" DECIMAL(14,2) NOT NULL,
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "service_charge" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "paid_amount" DECIMAL(14,2) NOT NULL,
    "seller_name" VARCHAR(150) NOT NULL,
    "seller_tax_code" VARCHAR(50),
    "seller_address" VARCHAR(500) NOT NULL,
    "seller_phone" VARCHAR(20),
    "seller_logo_url" VARCHAR(500),
    "customer_name" VARCHAR(150),
    "customer_phone" VARCHAR(20),
    "customer_email" VARCHAR(255),
    "customer_tax_code" VARCHAR(50),
    "customer_address" VARCHAR(500),
    "issued_by_id" UUID NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_by_id" UUID,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancellation_reason" VARCHAR(500),
    "replacement_invoice_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_jobs" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "type" "PrintDocumentType" NOT NULL,
    "printed_by_id" UUID NOT NULL,
    "is_reprint" BOOLEAN NOT NULL DEFAULT false,
    "reason" VARCHAR(500),
    "printed_at" TIMESTAMPTZ(6),
    "station_id" UUID,
    "status" "PrintJobStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" VARCHAR(500),

    CONSTRAINT "print_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_documents" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ReceiptDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "storage_key" VARCHAR(1000),
    "file_name" VARCHAR(255),
    "mime_type" VARCHAR(100),
    "file_size" INTEGER,
    "checksum" VARCHAR(64),
    "generated_at" TIMESTAMPTZ(6),
    "error_message" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "receipt_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_stations" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "status" "PosStationStatus" NOT NULL DEFAULT 'ACTIVE',
    "printer_connection" "PrinterConnectionType" NOT NULL DEFAULT 'NONE',
    "printer_address" VARCHAR(255),
    "cart_version" INTEGER NOT NULL DEFAULT 0,
    "cart_snapshot" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pos_stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_tracking_tokens" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "token_salt" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "terminal_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "last_accessed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "order_tracking_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pairing_codes" (
    "id" UUID NOT NULL,
    "code_hash" VARCHAR(64) NOT NULL,
    "device_token_hash" VARCHAR(64),
    "device_type" "DisplayDeviceType" NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pairing_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "display_devices" (
    "id" UUID NOT NULL,
    "type" "DisplayDeviceType" NOT NULL,
    "branch_id" UUID NOT NULL,
    "station_id" UUID,
    "token_hash" VARCHAR(64) NOT NULL,
    "name" VARCHAR(150),
    "paired_by_id" UUID NOT NULL,
    "paired_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6),
    "token_expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "display_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_display_sessions" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "active_order_id" UUID,
    "device_name" VARCHAR(150),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customer_display_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "order_item_id" UUID,
    "item_name" VARCHAR(150) NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(14,2) NOT NULL,
    "selected_options" JSONB,
    "special_instructions" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_payments" (
    "invoice_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "allocated_amount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "invoice_payments_pkey" PRIMARY KEY ("invoice_id","payment_id")
);

-- CreateTable
CREATE TABLE "vouchers" (
    "id" UUID NOT NULL,
    "branch_id" UUID,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(500),
    "type" "VoucherType" NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "min_order_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "max_discount_amount" DECIMAL(14,2),
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "usage_limit" INTEGER,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "work_date" DATE NOT NULL,
    "check_in_at" TIMESTAMPTZ(6),
    "check_out_at" TIMESTAMPTZ(6),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "minutes_late" INTEGER NOT NULL DEFAULT 0,
    "total_minutes" INTEGER,
    "note" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_sessions" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "status" "WorkSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_start" TIMESTAMPTZ(6),
    "scheduled_end" TIMESTAMPTZ(6),
    "checked_in_at" TIMESTAMPTZ(6),
    "checked_out_at" TIMESTAMPTZ(6),
    "is_unscheduled" BOOLEAN NOT NULL DEFAULT false,
    "auto_closed" BOOLEAN NOT NULL DEFAULT false,
    "note" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "shift_assignment_id" UUID,

    CONSTRAINT "work_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_templates" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shift_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_assignments" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "shift_template_id" UUID NOT NULL,
    "work_date" DATE NOT NULL,
    "scheduled_start" TIMESTAMPTZ(6) NOT NULL,
    "scheduled_end" TIMESTAMPTZ(6) NOT NULL,
    "status" "ShiftAssignmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shift_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serving_tasks" (
    "id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "status" "ServingTaskStatus" NOT NULL DEFAULT 'WAITING',
    "claimed_by_waiter_id" UUID,
    "served_by_waiter_id" UUID,
    "available_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimed_at" TIMESTAMPTZ(6),
    "served_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "serving_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_revoked_at_idx" ON "auth_sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_chains_code_key" ON "restaurant_chains"("code");

-- CreateIndex
CREATE INDEX "restaurant_chains_status_idx" ON "restaurant_chains"("status");

-- CreateIndex
CREATE INDEX "display_posters_chain_id_deleted_at_enabled_sort_order_idx" ON "display_posters"("chain_id", "deleted_at", "enabled", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "payos_channels_chain_id_key" ON "payos_channels"("chain_id");

-- CreateIndex
CREATE UNIQUE INDEX "payos_channels_webhook_code_key" ON "payos_channels"("webhook_code");

-- CreateIndex
CREATE INDEX "payos_channel_audit_logs_chain_id_created_at_idx" ON "payos_channel_audit_logs"("chain_id", "created_at");

-- CreateIndex
CREATE INDEX "payos_channel_audit_logs_channel_id_idx" ON "payos_channel_audit_logs"("channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "branches_code_key" ON "branches"("code");

-- CreateIndex
CREATE INDEX "branches_chain_id_status_idx" ON "branches"("chain_id", "status");

-- CreateIndex
CREATE INDEX "branches_status_idx" ON "branches"("status");

-- CreateIndex
CREATE INDEX "branches_city_idx" ON "branches"("city");

-- CreateIndex
CREATE INDEX "branch_operating_hours_branch_id_idx" ON "branch_operating_hours"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "branch_operating_hours_branch_id_day_of_week_key" ON "branch_operating_hours"("branch_id", "day_of_week");

-- CreateIndex
CREATE INDEX "branch_special_hours_branch_id_date_idx" ON "branch_special_hours"("branch_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "branch_special_hours_branch_id_date_key" ON "branch_special_hours"("branch_id", "date");

-- CreateIndex
CREATE INDEX "branch_areas_branch_id_type_status_idx" ON "branch_areas"("branch_id", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "branch_areas_branch_id_code_key" ON "branch_areas"("branch_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employee_code_key" ON "employees"("employee_code");

-- CreateIndex
CREATE UNIQUE INDEX "employees_user_id_key" ON "employees"("user_id");

-- CreateIndex
CREATE INDEX "employees_branch_id_idx" ON "employees"("branch_id");

-- CreateIndex
CREATE INDEX "employees_status_idx" ON "employees"("status");

-- CreateIndex
CREATE UNIQUE INDEX "owners_owner_code_key" ON "owners"("owner_code");

-- CreateIndex
CREATE UNIQUE INDEX "owners_user_id_key" ON "owners"("user_id");

-- CreateIndex
CREATE INDEX "owner_chain_assignments_chain_id_idx" ON "owner_chain_assignments"("chain_id");

-- CreateIndex
CREATE INDEX "owner_chain_assignments_assigned_by_id_idx" ON "owner_chain_assignments"("assigned_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "owner_chain_assignments_owner_id_chain_id_key" ON "owner_chain_assignments"("owner_id", "chain_id");

-- CreateIndex
CREATE UNIQUE INDEX "registration_applications_application_code_key" ON "registration_applications"("application_code");

-- CreateIndex
CREATE UNIQUE INDEX "registration_applications_approved_chain_id_key" ON "registration_applications"("approved_chain_id");

-- CreateIndex
CREATE UNIQUE INDEX "registration_applications_owner_user_id_key" ON "registration_applications"("owner_user_id");

-- CreateIndex
CREATE INDEX "registration_applications_status_created_at_idx" ON "registration_applications"("status", "created_at");

-- CreateIndex
CREATE INDEX "registration_applications_business_name_idx" ON "registration_applications"("business_name");

-- CreateIndex
CREATE INDEX "registration_applications_representative_email_idx" ON "registration_applications"("representative_email");

-- CreateIndex
CREATE UNIQUE INDEX "service_plans_code_key" ON "service_plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "business_subscriptions_chain_id_key" ON "business_subscriptions"("chain_id");

-- CreateIndex
CREATE INDEX "business_subscriptions_status_expires_at_idx" ON "business_subscriptions"("status", "expires_at");

-- CreateIndex
CREATE INDEX "business_subscriptions_plan_id_idx" ON "business_subscriptions"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_checkouts_provider_order_code_key" ON "subscription_checkouts"("provider_order_code");

-- CreateIndex
CREATE INDEX "subscription_checkouts_chain_id_status_created_at_idx" ON "subscription_checkouts"("chain_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "business_subscription_events_subscription_id_effective_at_idx" ON "business_subscription_events"("subscription_id", "effective_at");

-- CreateIndex
CREATE INDEX "business_subscription_events_changed_by_id_idx" ON "business_subscription_events"("changed_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_branding_chain_id_key" ON "business_branding"("chain_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_setup_tokens_token_hash_key" ON "password_setup_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_setup_tokens_user_id_used_at_idx" ON "password_setup_tokens"("user_id", "used_at");

-- CreateIndex
CREATE INDEX "password_setup_tokens_expires_at_idx" ON "password_setup_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "password_setup_attempts_locked_until_idx" ON "password_setup_attempts"("locked_until");

-- CreateIndex
CREATE UNIQUE INDEX "email_outbox_dedupe_key_key" ON "email_outbox"("dedupe_key");

-- CreateIndex
CREATE INDEX "email_outbox_status_created_at_idx" ON "email_outbox"("status", "created_at");

-- CreateIndex
CREATE INDEX "restaurant_tables_branch_id_status_idx" ON "restaurant_tables"("branch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_tables_branch_id_code_key" ON "restaurant_tables"("branch_id", "code");

-- CreateIndex
CREATE INDEX "table_adjacencies_branch_id_idx" ON "table_adjacencies"("branch_id");

-- CreateIndex
CREATE INDEX "table_adjacencies_adjacent_table_id_idx" ON "table_adjacencies"("adjacent_table_id");

-- CreateIndex
CREATE UNIQUE INDEX "table_adjacencies_table_id_adjacent_table_id_key" ON "table_adjacencies"("table_id", "adjacent_table_id");

-- CreateIndex
CREATE UNIQUE INDEX "table_sessions_session_code_key" ON "table_sessions"("session_code");

-- CreateIndex
CREATE UNIQUE INDEX "table_sessions_reservation_id_key" ON "table_sessions"("reservation_id");

-- CreateIndex
CREATE INDEX "table_sessions_branch_id_status_idx" ON "table_sessions"("branch_id", "status");

-- CreateIndex
CREATE INDEX "table_sessions_opened_by_waiter_id_opened_at_idx" ON "table_sessions"("opened_by_waiter_id", "opened_at");

-- CreateIndex
CREATE INDEX "table_session_tables_table_id_released_at_idx" ON "table_session_tables"("table_id", "released_at");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_reservation_code_key" ON "reservations"("reservation_code");

-- CreateIndex
CREATE INDEX "reservations_branch_id_reservation_at_idx" ON "reservations"("branch_id", "reservation_at");

-- CreateIndex
CREATE INDEX "reservations_table_id_reservation_at_idx" ON "reservations"("table_id", "reservation_at");

-- CreateIndex
CREATE INDEX "reservations_status_idx" ON "reservations"("status");

-- CreateIndex
CREATE INDEX "reservation_tables_table_id_released_at_idx" ON "reservation_tables"("table_id", "released_at");

-- CreateIndex
CREATE INDEX "menu_categories_chain_id_is_active_display_order_idx" ON "menu_categories"("chain_id", "is_active", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "menu_categories_chain_id_name_key" ON "menu_categories"("chain_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "menu_items_sku_key" ON "menu_items"("sku");

-- CreateIndex
CREATE INDEX "menu_items_category_id_is_active_is_available_idx" ON "menu_items"("category_id", "is_active", "is_available");

-- CreateIndex
CREATE INDEX "menu_items_name_idx" ON "menu_items"("name");

-- CreateIndex
CREATE INDEX "menu_option_groups_chain_id_is_active_display_order_idx" ON "menu_option_groups"("chain_id", "is_active", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "menu_option_groups_chain_id_code_key" ON "menu_option_groups"("chain_id", "code");

-- CreateIndex
CREATE INDEX "menu_options_group_id_is_active_display_order_idx" ON "menu_options"("group_id", "is_active", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "menu_options_group_id_code_key" ON "menu_options"("group_id", "code");

-- CreateIndex
CREATE INDEX "menu_item_option_groups_group_id_idx" ON "menu_item_option_groups"("group_id");

-- CreateIndex
CREATE INDEX "branch_menu_options_branch_id_is_available_idx" ON "branch_menu_options"("branch_id", "is_available");

-- CreateIndex
CREATE INDEX "branch_menu_options_updated_by_id_idx" ON "branch_menu_options"("updated_by_id");

-- CreateIndex
CREATE INDEX "branch_menu_items_branch_id_is_enabled_is_available_idx" ON "branch_menu_items"("branch_id", "is_enabled", "is_available");

-- CreateIndex
CREATE INDEX "branch_menu_items_updated_by_id_idx" ON "branch_menu_items"("updated_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_code_key" ON "orders"("order_code");

-- CreateIndex
CREATE UNIQUE INDEX "orders_reservation_id_key" ON "orders"("reservation_id");

-- CreateIndex
CREATE INDEX "orders_branch_id_placed_at_idx" ON "orders"("branch_id", "placed_at");

-- CreateIndex
CREATE INDEX "orders_table_id_idx" ON "orders"("table_id");

-- CreateIndex
CREATE INDEX "orders_waiter_id_idx" ON "orders"("waiter_id");

-- CreateIndex
CREATE INDEX "orders_table_session_id_placed_at_idx" ON "orders"("table_session_id", "placed_at");

-- CreateIndex
CREATE INDEX "orders_created_by_waiter_id_idx" ON "orders"("created_by_waiter_id");

-- CreateIndex
CREATE INDEX "orders_created_by_cashier_id_idx" ON "orders"("created_by_cashier_id");

-- CreateIndex
CREATE INDEX "orders_cancelled_by_id_idx" ON "orders"("cancelled_by_id");

-- CreateIndex
CREATE INDEX "orders_status_payment_status_idx" ON "orders"("status", "payment_status");

-- CreateIndex
CREATE INDEX "orders_attention_at_idx" ON "orders"("attention_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_branch_id_business_date_call_number_key" ON "orders"("branch_id", "business_date", "call_number");

-- CreateIndex
CREATE INDEX "order_items_order_id_status_idx" ON "order_items"("order_id", "status");

-- CreateIndex
CREATE INDEX "order_items_menu_item_id_idx" ON "order_items"("menu_item_id");

-- CreateIndex
CREATE INDEX "order_items_status_queued_at_idx" ON "order_items"("status", "queued_at");

-- CreateIndex
CREATE INDEX "order_items_served_by_waiter_id_idx" ON "order_items"("served_by_waiter_id");

-- CreateIndex
CREATE INDEX "order_items_started_by_kitchen_id_idx" ON "order_items"("started_by_kitchen_id");

-- CreateIndex
CREATE INDEX "order_items_completed_by_kitchen_id_idx" ON "order_items"("completed_by_kitchen_id");

-- CreateIndex
CREATE INDEX "order_item_units_status_created_at_idx" ON "order_item_units"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "order_item_units_order_item_id_sequence_key" ON "order_item_units"("order_item_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_code_key" ON "payments"("payment_code");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_order_code_key" ON "payments"("provider_order_code");

-- CreateIndex
CREATE INDEX "payments_order_id_status_idx" ON "payments"("order_id", "status");

-- CreateIndex
CREATE INDEX "payments_table_session_id_status_idx" ON "payments"("table_session_id", "status");

-- CreateIndex
CREATE INDEX "payments_processed_by_id_idx" ON "payments"("processed_by_id");

-- CreateIndex
CREATE INDEX "payments_station_id_idx" ON "payments"("station_id");

-- CreateIndex
CREATE INDEX "payments_transaction_ref_idx" ON "payments"("transaction_ref");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_source_reference_key" ON "refunds"("source_reference");

-- CreateIndex
CREATE INDEX "refunds_order_id_status_idx" ON "refunds"("order_id", "status");

-- CreateIndex
CREATE INDEX "refunds_payment_id_status_idx" ON "refunds"("payment_id", "status");

-- CreateIndex
CREATE INDEX "refunds_cancellation_date_status_idx" ON "refunds"("cancellation_date", "status");

-- CreateIndex
CREATE INDEX "refund_items_refund_id_idx" ON "refund_items"("refund_id");

-- CreateIndex
CREATE UNIQUE INDEX "refund_items_order_item_id_key" ON "refund_items"("order_item_id");

-- CreateIndex
CREATE INDEX "branch_audit_logs_branch_id_created_at_idx" ON "branch_audit_logs"("branch_id", "created_at");

-- CreateIndex
CREATE INDEX "branch_audit_logs_entity_type_entity_id_idx" ON "branch_audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "payment_webhook_events_provider_order_code_idx" ON "payment_webhook_events"("provider_order_code");

-- CreateIndex
CREATE INDEX "payment_webhook_events_status_received_at_idx" ON "payment_webhook_events"("status", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_webhook_events_provider_idempotency_key_key" ON "payment_webhook_events"("provider", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_order_id_key" ON "invoices"("order_id");

-- CreateIndex
CREATE INDEX "invoices_branch_id_issued_at_idx" ON "invoices"("branch_id", "issued_at");

-- CreateIndex
CREATE INDEX "invoices_chain_id_issued_at_idx" ON "invoices"("chain_id", "issued_at");

-- CreateIndex
CREATE INDEX "invoices_table_session_id_status_idx" ON "invoices"("table_session_id", "status");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "print_jobs_order_id_printed_at_idx" ON "print_jobs"("order_id", "printed_at");

-- CreateIndex
CREATE INDEX "print_jobs_branch_id_printed_at_idx" ON "print_jobs"("branch_id", "printed_at");

-- CreateIndex
CREATE INDEX "receipt_documents_branch_id_created_at_idx" ON "receipt_documents"("branch_id", "created_at");

-- CreateIndex
CREATE INDEX "receipt_documents_status_updated_at_idx" ON "receipt_documents"("status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_documents_order_id_version_key" ON "receipt_documents"("order_id", "version");

-- CreateIndex
CREATE INDEX "pos_stations_branch_id_status_idx" ON "pos_stations"("branch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pos_stations_branch_id_name_key" ON "pos_stations"("branch_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "order_tracking_tokens_order_id_key" ON "order_tracking_tokens"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_tracking_tokens_token_hash_key" ON "order_tracking_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "order_tracking_tokens_expires_at_revoked_at_idx" ON "order_tracking_tokens"("expires_at", "revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "pairing_codes_code_hash_key" ON "pairing_codes"("code_hash");

-- CreateIndex
CREATE INDEX "pairing_codes_expires_at_consumed_at_idx" ON "pairing_codes"("expires_at", "consumed_at");

-- CreateIndex
CREATE UNIQUE INDEX "display_devices_token_hash_key" ON "display_devices"("token_hash");

-- CreateIndex
CREATE INDEX "display_devices_branch_id_type_revoked_at_idx" ON "display_devices"("branch_id", "type", "revoked_at");

-- CreateIndex
CREATE INDEX "display_devices_station_id_revoked_at_idx" ON "display_devices"("station_id", "revoked_at");

-- CreateIndex
CREATE INDEX "display_devices_token_expires_at_revoked_at_idx" ON "display_devices"("token_expires_at", "revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_display_sessions_token_hash_key" ON "customer_display_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "customer_display_sessions_branch_id_revoked_at_expires_at_idx" ON "customer_display_sessions"("branch_id", "revoked_at", "expires_at");

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_items_order_item_id_idx" ON "invoice_items"("order_item_id");

-- CreateIndex
CREATE INDEX "invoice_payments_payment_id_idx" ON "invoice_payments"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_code_key" ON "vouchers"("code");

-- CreateIndex
CREATE INDEX "vouchers_branch_id_is_active_idx" ON "vouchers"("branch_id", "is_active");

-- CreateIndex
CREATE INDEX "vouchers_starts_at_ends_at_idx" ON "vouchers"("starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "attendances_branch_id_work_date_idx" ON "attendances"("branch_id", "work_date");

-- CreateIndex
CREATE INDEX "attendances_status_idx" ON "attendances"("status");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_employee_id_work_date_key" ON "attendances"("employee_id", "work_date");

-- CreateIndex
CREATE INDEX "work_sessions_employee_id_status_idx" ON "work_sessions"("employee_id", "status");

-- CreateIndex
CREATE INDEX "work_sessions_branch_id_status_checked_in_at_idx" ON "work_sessions"("branch_id", "status", "checked_in_at");

-- CreateIndex
CREATE INDEX "shift_templates_branch_id_is_active_idx" ON "shift_templates"("branch_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "shift_templates_branch_id_name_key" ON "shift_templates"("branch_id", "name");

-- CreateIndex
CREATE INDEX "shift_assignments_branch_id_work_date_idx" ON "shift_assignments"("branch_id", "work_date");

-- CreateIndex
CREATE INDEX "shift_assignments_shift_template_id_idx" ON "shift_assignments"("shift_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "shift_assignments_employee_id_work_date_key" ON "shift_assignments"("employee_id", "work_date");

-- CreateIndex
CREATE UNIQUE INDEX "serving_tasks_order_item_id_key" ON "serving_tasks"("order_item_id");

-- CreateIndex
CREATE INDEX "serving_tasks_branch_id_status_available_at_idx" ON "serving_tasks"("branch_id", "status", "available_at");

-- CreateIndex
CREATE INDEX "serving_tasks_claimed_by_waiter_id_status_idx" ON "serving_tasks"("claimed_by_waiter_id", "status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "display_posters" ADD CONSTRAINT "display_posters_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "restaurant_chains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payos_channels" ADD CONSTRAINT "payos_channels_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "restaurant_chains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payos_channel_audit_logs" ADD CONSTRAINT "payos_channel_audit_logs_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "restaurant_chains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "restaurant_chains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_operating_hours" ADD CONSTRAINT "branch_operating_hours_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_special_hours" ADD CONSTRAINT "branch_special_hours_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_areas" ADD CONSTRAINT "branch_areas_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owners" ADD CONSTRAINT "owners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_chain_assignments" ADD CONSTRAINT "owner_chain_assignments_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_chain_assignments" ADD CONSTRAINT "owner_chain_assignments_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "restaurant_chains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_chain_assignments" ADD CONSTRAINT "owner_chain_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_applications" ADD CONSTRAINT "registration_applications_requested_plan_id_fkey" FOREIGN KEY ("requested_plan_id") REFERENCES "service_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_applications" ADD CONSTRAINT "registration_applications_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_applications" ADD CONSTRAINT "registration_applications_approved_chain_id_fkey" FOREIGN KEY ("approved_chain_id") REFERENCES "restaurant_chains"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_applications" ADD CONSTRAINT "registration_applications_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_subscriptions" ADD CONSTRAINT "business_subscriptions_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "restaurant_chains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_subscriptions" ADD CONSTRAINT "business_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "service_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_checkouts" ADD CONSTRAINT "subscription_checkouts_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "restaurant_chains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_checkouts" ADD CONSTRAINT "subscription_checkouts_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "service_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_subscription_events" ADD CONSTRAINT "business_subscription_events_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "business_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_subscription_events" ADD CONSTRAINT "business_subscription_events_from_plan_id_fkey" FOREIGN KEY ("from_plan_id") REFERENCES "service_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_subscription_events" ADD CONSTRAINT "business_subscription_events_to_plan_id_fkey" FOREIGN KEY ("to_plan_id") REFERENCES "service_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_subscription_events" ADD CONSTRAINT "business_subscription_events_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_branding" ADD CONSTRAINT "business_branding_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "restaurant_chains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_setup_tokens" ADD CONSTRAINT "password_setup_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_adjacencies" ADD CONSTRAINT "table_adjacencies_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_adjacencies" ADD CONSTRAINT "table_adjacencies_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "restaurant_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_adjacencies" ADD CONSTRAINT "table_adjacencies_adjacent_table_id_fkey" FOREIGN KEY ("adjacent_table_id") REFERENCES "restaurant_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_opened_by_waiter_id_fkey" FOREIGN KEY ("opened_by_waiter_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_closed_by_waiter_id_fkey" FOREIGN KEY ("closed_by_waiter_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_session_tables" ADD CONSTRAINT "table_session_tables_table_session_id_fkey" FOREIGN KEY ("table_session_id") REFERENCES "table_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_session_tables" ADD CONSTRAINT "table_session_tables_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "restaurant_tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "restaurant_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_tables" ADD CONSTRAINT "reservation_tables_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_tables" ADD CONSTRAINT "reservation_tables_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "restaurant_tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "restaurant_chains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "menu_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_option_groups" ADD CONSTRAINT "menu_option_groups_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "restaurant_chains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_options" ADD CONSTRAINT "menu_options_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "menu_option_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_option_groups" ADD CONSTRAINT "menu_item_option_groups_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_option_groups" ADD CONSTRAINT "menu_item_option_groups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "menu_option_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_menu_options" ADD CONSTRAINT "branch_menu_options_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_menu_options" ADD CONSTRAINT "branch_menu_options_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "menu_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_menu_options" ADD CONSTRAINT "branch_menu_options_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_menu_items" ADD CONSTRAINT "branch_menu_items_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_menu_items" ADD CONSTRAINT "branch_menu_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_menu_items" ADD CONSTRAINT "branch_menu_items_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "restaurant_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_waiter_id_fkey" FOREIGN KEY ("waiter_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_session_id_fkey" FOREIGN KEY ("table_session_id") REFERENCES "table_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_waiter_id_fkey" FOREIGN KEY ("created_by_waiter_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_cashier_id_fkey" FOREIGN KEY ("created_by_cashier_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivered_by_id_fkey" FOREIGN KEY ("delivered_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_daily_sequences" ADD CONSTRAINT "branch_daily_sequences_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_served_by_waiter_id_fkey" FOREIGN KEY ("served_by_waiter_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_unavailable_by_id_fkey" FOREIGN KEY ("unavailable_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_started_by_kitchen_id_fkey" FOREIGN KEY ("started_by_kitchen_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_completed_by_kitchen_id_fkey" FOREIGN KEY ("completed_by_kitchen_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_units" ADD CONSTRAINT "order_item_units_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_units" ADD CONSTRAINT "order_item_units_started_by_id_fkey" FOREIGN KEY ("started_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_units" ADD CONSTRAINT "order_item_units_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_table_session_id_fkey" FOREIGN KEY ("table_session_id") REFERENCES "table_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_processed_by_id_fkey" FOREIGN KEY ("processed_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "pos_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "refunds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_webhook_events" ADD CONSTRAINT "payment_webhook_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "restaurant_chains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_table_session_id_fkey" FOREIGN KEY ("table_session_id") REFERENCES "table_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_replacement_invoice_id_fkey" FOREIGN KEY ("replacement_invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_printed_by_id_fkey" FOREIGN KEY ("printed_by_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "pos_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_documents" ADD CONSTRAINT "receipt_documents_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_documents" ADD CONSTRAINT "receipt_documents_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_stations" ADD CONSTRAINT "pos_stations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_tracking_tokens" ADD CONSTRAINT "order_tracking_tokens_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "display_devices" ADD CONSTRAINT "display_devices_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "display_devices" ADD CONSTRAINT "display_devices_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "pos_stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "display_devices" ADD CONSTRAINT "display_devices_paired_by_id_fkey" FOREIGN KEY ("paired_by_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_display_sessions" ADD CONSTRAINT "customer_display_sessions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_display_sessions" ADD CONSTRAINT "customer_display_sessions_active_order_id_fkey" FOREIGN KEY ("active_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_shift_assignment_id_fkey" FOREIGN KEY ("shift_assignment_id") REFERENCES "shift_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_shift_template_id_fkey" FOREIGN KEY ("shift_template_id") REFERENCES "shift_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serving_tasks" ADD CONSTRAINT "serving_tasks_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serving_tasks" ADD CONSTRAINT "serving_tasks_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serving_tasks" ADD CONSTRAINT "serving_tasks_claimed_by_waiter_id_fkey" FOREIGN KEY ("claimed_by_waiter_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serving_tasks" ADD CONSTRAINT "serving_tasks_served_by_waiter_id_fkey" FOREIGN KEY ("served_by_waiter_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
