import { MigrationInterface, QueryRunner } from 'typeorm';

export class UsersAuthRatingsSaved1730000000007 implements MigrationInterface {
  name = 'UsersAuthRatingsSaved1730000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" varchar(255) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "role" varchar(20) NOT NULL DEFAULT 'user',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "token" varchar(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_sessions_token" UNIQUE ("token"),
        CONSTRAINT "FK_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_sessions_user_id" ON "sessions" ("user_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_sessions_token" ON "sessions" ("token")',
    );
    await queryRunner.query(`
      CREATE TABLE "work_ratings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "work_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "score" smallint NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_work_ratings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_work_ratings_work_user" UNIQUE ("work_id", "user_id"),
        CONSTRAINT "FK_work_ratings_work" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_work_ratings_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_work_ratings_work_id" ON "work_ratings" ("work_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_work_ratings_user_id" ON "work_ratings" ("user_id")',
    );
    await queryRunner.query(`
      CREATE TABLE "saved_works" (
        "user_id" uuid NOT NULL,
        "work_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_saved_works" PRIMARY KEY ("user_id", "work_id"),
        CONSTRAINT "FK_saved_works_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_saved_works_work" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_saved_works_user_id" ON "saved_works" ("user_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_saved_works_work_id" ON "saved_works" ("work_id")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "saved_works"');
    await queryRunner.query('DROP TABLE "work_ratings"');
    await queryRunner.query('DROP TABLE "sessions"');
    await queryRunner.query('DROP TABLE "users"');
  }
}
