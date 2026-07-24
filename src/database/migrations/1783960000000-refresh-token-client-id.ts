import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefreshTokenClientId1783960000000 implements MigrationInterface {
  name = 'RefreshTokenClientId1783960000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // clientId identifica la app OAuth a través de la cual se autenticó el alumno.
    // NULL para tokens de tipo 'admin' (los admins no pasan por una app OAuth).
    // Siempre presente para tokens de tipo 'student'.
    await queryRunner.query(`
      ALTER TABLE "refresh_tokens"
      ADD COLUMN "clientId" INTEGER
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "refresh_tokens"
      DROP COLUMN "clientId"
    `);
  }
}