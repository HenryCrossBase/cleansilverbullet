-- DropIndex
DROP INDEX "audit_log_createdAt_idx";

-- CreateIndex
CREATE INDEX "Advertisement_vendorId_createdAt_idx" ON "Advertisement"("vendorId", "createdAt");

-- CreateIndex
CREATE INDEX "Advertisement_slotId_status_idx" ON "Advertisement"("slotId", "status");

-- CreateIndex
CREATE INDEX "Advertisement_expiresAt_idx" ON "Advertisement"("expiresAt");

-- CreateIndex
CREATE INDEX "CryptoDeposit_userId_createdAt_idx" ON "CryptoDeposit"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CryptoDeposit_status_createdAt_idx" ON "CryptoDeposit"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CustomRequest_userId_createdAt_idx" ON "CustomRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomRequest_status_createdAt_idx" ON "CustomRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Dispute_status_createdAt_idx" ON "Dispute"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Dispute_buyerId_createdAt_idx" ON "Dispute"("buyerId", "createdAt");

-- CreateIndex
CREATE INDEX "Dispute_vendorId_createdAt_idx" ON "Dispute"("vendorId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_productId_createdAt_idx" ON "Order"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "Product_shopId_idx" ON "Product"("shopId");

-- CreateIndex
CREATE INDEX "Product_category_country_idx" ON "Product"("category", "country");

-- CreateIndex
CREATE INDEX "Product_sales_createdAt_idx" ON "Product"("sales", "createdAt");

-- CreateIndex
CREATE INDEX "Shop_ownerId_idx" ON "Shop"("ownerId");

-- CreateIndex
CREATE INDEX "Shop_marketBid_views_idx" ON "Shop"("marketBid", "views");

-- CreateIndex
CREATE INDEX "Shop_bidExpiresAt_idx" ON "Shop"("bidExpiresAt");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_createdAt_idx" ON "SupportTicket"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");

-- CreateIndex
CREATE INDEX "User_rank_lastOnline_idx" ON "User"("rank", "lastOnline");

-- CreateIndex
CREATE INDEX "User_telegramChatId_idx" ON "User"("telegramChatId");

-- CreateIndex
CREATE INDEX "Withdrawal_userId_createdAt_idx" ON "Withdrawal"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Withdrawal_status_createdAt_idx" ON "Withdrawal"("status", "createdAt");
