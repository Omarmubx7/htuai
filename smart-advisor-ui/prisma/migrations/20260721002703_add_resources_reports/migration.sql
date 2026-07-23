-- CreateTable
CREATE TABLE "resources" (
    "id" SERIAL NOT NULL,
    "course_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "file_path" TEXT,
    "description" TEXT,
    "uploaded_by" TEXT,
    "semester" TEXT,
    "report_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" INTEGER,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" SERIAL NOT NULL,
    "resource_id" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "detail" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resources_course_code_idx" ON "resources"("course_code");

-- CreateIndex
CREATE INDEX "resources_created_at_idx" ON "resources"("created_at" DESC);

-- CreateIndex
CREATE INDEX "reports_resource_id_idx" ON "reports"("resource_id");

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
