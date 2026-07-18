import { MigrationInterface, QueryRunner } from "typeorm";

export class ClientSecretHash1783910000000 implements MigrationInterface {
  name = 'ClientSecretHash1783910000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ampliar la columna para que aguante hashes bcrypt (60 chars) y futuros algoritmos
    await queryRunner.query(`
      ALTER TABLE "oauth_clients"
      ALTER COLUMN "clientSecret" TYPE character varying(100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "oauth_clients"
      ALTER COLUMN "clientSecret" TYPE character varying
    `);
  }
}