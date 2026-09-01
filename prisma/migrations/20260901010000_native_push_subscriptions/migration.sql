CREATE TABLE "native_push_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "device_token" VARCHAR(512) NOT NULL,
    "platform" VARCHAR(20) NOT NULL DEFAULT 'ios',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "native_push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "native_push_subscriptions_device_token_key"
ON "native_push_subscriptions"("device_token");

CREATE INDEX "native_push_subscriptions_user_id_idx"
ON "native_push_subscriptions"("user_id");

ALTER TABLE "native_push_subscriptions"
ADD CONSTRAINT "native_push_subscriptions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
