-- CreateTable
CREATE TABLE "RoomEvent" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "handId" TEXT,
    "version" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomSnapshot" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "phase" TEXT NOT NULL,
    "stateJson" JSONB NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedAction" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "clientActionId" TEXT NOT NULL,
    "handId" TEXT,
    "resultJson" JSONB,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandHistory" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "handId" TEXT NOT NULL,
    "button" INTEGER NOT NULL,
    "community" JSONB NOT NULL,
    "payouts" JSONB NOT NULL,
    "winners" JSONB NOT NULL,
    "players" JSONB NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HandHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomEvent_roomId_version_key" ON "RoomEvent"("roomId", "version");
CREATE INDEX "RoomEvent_roomId_ts_idx" ON "RoomEvent"("roomId", "ts");
CREATE INDEX "RoomEvent_handId_idx" ON "RoomEvent"("handId");
CREATE INDEX "RoomSnapshot_roomId_version_idx" ON "RoomSnapshot"("roomId", "version");
CREATE UNIQUE INDEX "ProcessedAction_roomId_clientActionId_key" ON "ProcessedAction"("roomId", "clientActionId");
CREATE INDEX "ProcessedAction_roomId_idx" ON "ProcessedAction"("roomId");
CREATE UNIQUE INDEX "HandHistory_roomId_handId_key" ON "HandHistory"("roomId", "handId");
CREATE INDEX "HandHistory_roomId_closedAt_idx" ON "HandHistory"("roomId", "closedAt");

-- AddForeignKey
ALTER TABLE "RoomEvent" ADD CONSTRAINT "RoomEvent_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomSnapshot" ADD CONSTRAINT "RoomSnapshot_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
