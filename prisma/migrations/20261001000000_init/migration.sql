CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

CREATE TABLE "roles" (
    "roleid" SERIAL NOT NULL,
    "rolename" VARCHAR(50) NOT NULL,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("roleid")
);

CREATE TABLE "memberships" (
    "mid" SERIAL NOT NULL,
    "mname" VARCHAR(50) NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "memberships_pkey" PRIMARY KEY ("mid"),
    CONSTRAINT "memberships_score_check" CHECK ("score" >= 0)
);

CREATE TABLE "users" (
    "uid" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "fullname" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "roleid" INTEGER NOT NULL,
    "mid" INTEGER NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("uid")
);

CREATE TABLE "products" (
    "pid" SERIAL NOT NULL,
    "pname" VARCHAR(100) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "products_pkey" PRIMARY KEY ("pid"),
    CONSTRAINT "products_price_check" CHECK ("price" > 0),
    CONSTRAINT "products_quantity_check" CHECK ("quantity" >= 0)
);

CREATE TABLE "orders" (
    "oid" SERIAL NOT NULL,
    "uid" INTEGER NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "orders_pkey" PRIMARY KEY ("oid")
);

CREATE TABLE "order_details" (
    "oid" INTEGER NOT NULL,
    "pid" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    CONSTRAINT "order_details_pkey" PRIMARY KEY ("oid","pid"),
    CONSTRAINT "order_details_qty_check" CHECK ("qty" > 0),
    CONSTRAINT "order_details_unit_price_check" CHECK ("unit_price" > 0)
);

CREATE TABLE "shipments" (
    "shipid" SERIAL NOT NULL,
    "oid" INTEGER NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    CONSTRAINT "shipments_pkey" PRIMARY KEY ("shipid")
);

CREATE UNIQUE INDEX "roles_rolename_key" ON "roles"("rolename");
CREATE UNIQUE INDEX "memberships_mname_key" ON "memberships"("mname");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE INDEX "users_roleid_idx" ON "users"("roleid");
CREATE INDEX "users_mid_idx" ON "users"("mid");
CREATE INDEX "orders_uid_idx" ON "orders"("uid");
CREATE INDEX "order_details_pid_idx" ON "order_details"("pid");
CREATE INDEX "shipments_oid_idx" ON "shipments"("oid");

ALTER TABLE "users" ADD CONSTRAINT "users_roleid_fkey" FOREIGN KEY ("roleid") REFERENCES "roles"("roleid") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_mid_fkey" FOREIGN KEY ("mid") REFERENCES "memberships"("mid") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_uid_fkey" FOREIGN KEY ("uid") REFERENCES "users"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_details" ADD CONSTRAINT "order_details_oid_fkey" FOREIGN KEY ("oid") REFERENCES "orders"("oid") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_details" ADD CONSTRAINT "order_details_pid_fkey" FOREIGN KEY ("pid") REFERENCES "products"("pid") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_oid_fkey" FOREIGN KEY ("oid") REFERENCES "orders"("oid") ON DELETE CASCADE ON UPDATE CASCADE;
