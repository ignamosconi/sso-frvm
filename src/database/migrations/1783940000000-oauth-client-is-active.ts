import { MigrationInterface, QueryRunner } from "typeorm";

export class OAuthClientIsActive1783940000000 implements MigrationInterface {
  name = 'OAuthClientIsActive1783940000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "oauth_clients" ADD "isActive" boolean NOT NULL DEFAULT true`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "oauth_clients" DROP COLUMN "isActive"`);
  }
}