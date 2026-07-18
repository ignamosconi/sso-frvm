import { MigrationInterface, QueryRunner } from "typeorm";

export class CredentialTokensClientData1783921000000 implements MigrationInterface {
  name = 'CredentialTokensClientData1783921000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "credential_tokens" ADD "clientName" character varying NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "credential_tokens" ADD "redirectUris" text NOT NULL DEFAULT ''`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "credential_tokens" DROP COLUMN "redirectUris"`);
    await queryRunner.query(`ALTER TABLE "credential_tokens" DROP COLUMN "clientName"`);
  }
}