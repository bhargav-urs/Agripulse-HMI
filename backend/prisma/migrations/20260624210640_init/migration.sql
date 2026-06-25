-- CreateEnum
CREATE TYPE "IrrigationMode" AS ENUM ('MANUAL', 'AUTO');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "PumpAction" AS ENUM ('START', 'STOP', 'EMERGENCY_STOP', 'EMERGENCY_RESET');

-- CreateEnum
CREATE TYPE "CommandSource" AS ENUM ('MANUAL', 'AUTO', 'SAFETY', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('LOW_SOIL_MOISTURE', 'LOW_TANK_LEVEL', 'PUMP_OVERRUN', 'DEVICE_DISCONNECTED', 'EMERGENCY_STOP', 'WEATHER_UNAVAILABLE');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AutomationDecisionType" AS ENUM ('IRRIGATE', 'SKIP');

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'OFFLINE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_settings" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "moisture_min_threshold" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "moisture_target_threshold" DOUBLE PRECISION NOT NULL DEFAULT 55,
    "rain_probability_threshold" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "tank_min_threshold" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "max_pump_runtime_seconds" INTEGER NOT NULL DEFAULT 300,
    "mode" "IrrigationMode" NOT NULL DEFAULT 'MANUAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemetry" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "soil_moisture" DOUBLE PRECISION NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "humidity" DOUBLE PRECISION NOT NULL,
    "tank_level" DOUBLE PRECISION NOT NULL,
    "pump_status" BOOLEAN NOT NULL,
    "valve_status" BOOLEAN NOT NULL,
    "emergency_stop" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pump_events" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "action" "PumpAction" NOT NULL,
    "source" "CommandSource" NOT NULL,
    "duration_seconds" INTEGER,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pump_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather_snapshots" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "humidity" DOUBLE PRECISION NOT NULL,
    "rain_probability" DOUBLE PRECISION NOT NULL,
    "forecast_summary" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weather_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_decisions" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "decision" "AutomationDecisionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "soil_moisture" DOUBLE PRECISION NOT NULL,
    "tank_level" DOUBLE PRECISION NOT NULL,
    "rain_probability" DOUBLE PRECISION,
    "pump_started" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "device_settings_device_id_key" ON "device_settings"("device_id");

-- CreateIndex
CREATE INDEX "telemetry_device_id_created_at_idx" ON "telemetry"("device_id", "created_at");

-- CreateIndex
CREATE INDEX "pump_events_device_id_created_at_idx" ON "pump_events"("device_id", "created_at");

-- CreateIndex
CREATE INDEX "alerts_device_id_created_at_idx" ON "alerts"("device_id", "created_at");

-- CreateIndex
CREATE INDEX "alerts_device_id_acknowledged_idx" ON "alerts"("device_id", "acknowledged");

-- CreateIndex
CREATE INDEX "weather_snapshots_device_id_created_at_idx" ON "weather_snapshots"("device_id", "created_at");

-- CreateIndex
CREATE INDEX "automation_decisions_device_id_created_at_idx" ON "automation_decisions"("device_id", "created_at");

-- AddForeignKey
ALTER TABLE "device_settings" ADD CONSTRAINT "device_settings_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemetry" ADD CONSTRAINT "telemetry_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pump_events" ADD CONSTRAINT "pump_events_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weather_snapshots" ADD CONSTRAINT "weather_snapshots_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_decisions" ADD CONSTRAINT "automation_decisions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
